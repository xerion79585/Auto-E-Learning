import requests
from bs4 import BeautifulSoup
import json
import os
import re
import time
import sys
import hashlib
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

# ==========================================
# 設定與常數
# ==========================================
DB_FILE = "questions.json"
PENDING_FILE = "pending_urls.txt"
INDEX_URL = "https://roddayeye.pixnet.net/blog/posts/15325785090"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}
MAX_WORKERS = 10  # 同時 10 個線程

class QuestionBankManager:
    def __init__(self):
        self.questions_db = []
        self.known_urls = set()
        self.known_hashes = set()  # 用於內容去重 (防止不同網址但相同題目)
        self.pending_urls = set()
        self.lock = threading.Lock()  # 資料寫入鎖
        self.load_db()
        self.load_pending()

    def load_db(self):
        if os.path.exists(DB_FILE):
            try:
                with open(DB_FILE, 'r', encoding='utf-8') as f:
                    self.questions_db = json.load(f)
                    for q in self.questions_db:
                        if 'source_url' in q:
                            self.known_urls.add(q['source_url'])
                        if 'question' in q:
                            self.known_hashes.add(hash(q['question'].strip()))
                print(f"📚 已載入 {len(self.questions_db)} 筆題目資料")
            except Exception as e:
                print(f"⚠️ 讀取資料庫失敗: {e}")
        else:
            print("ℹ️ 尚未建立資料庫")

    def save_db(self):
        try:
            # 存檔時也要鎖，避免寫到一半被讀取
            with self.lock:
                with open(DB_FILE, 'w', encoding='utf-8') as f:
                    json.dump(self.questions_db, f, ensure_ascii=False, indent=2)
            # print(f"💾 資料庫已儲存 ({len(self.questions_db)} 筆)")
        except Exception as e:
            print(f"❌ 儲存失敗: {e}")

    def load_pending(self):
        if os.path.exists(PENDING_FILE):
            with open(PENDING_FILE, 'r', encoding='utf-8') as f:
                for line in f:
                    url = line.strip()
                    if url and url not in self.known_urls:
                        self.pending_urls.add(url)
            print(f"📋 待處理網址清單: {len(self.pending_urls)} 筆")

    def save_pending(self):
        with self.lock:
            with open(PENDING_FILE, 'w', encoding='utf-8') as f:
                for url in self.pending_urls:
                    f.write(f"{url}\n")
    
    # ==========================
    # Logic
    # ==========================
    def get_index_titles(self):
        """
        抓取首頁並建立 URL -> Title 的對照表
        這比從內頁抓標題準確
        """
        print("🔍 [TitleMap] 正在分析首頁以取得正確標題...")
        title_map = {}
        try:
            resp = requests.get(INDEX_URL, headers=HEADERS, timeout=30)
            soup = BeautifulSoup(resp.text, 'html.parser')
            links = soup.find_all('a', href=True)
            for a in links:
                href = a['href']
                text = a.get_text().strip()
                if "roddayeye.pixnet.net/blog/post/" in href and "解答" in text:
                    title_map[href] = text
            print(f"✅ [TitleMap] 取得 {len(title_map)} 筆標題")
        except Exception as e:
            print(f"⚠️ [TitleMap] 抓取失敗: {e}")
        return title_map

    def auto_update_workflow(self):
        """
        [一鍵更新] 整合流程：
        1. 抓取首頁連結 & 標題
        2. 比對資料庫，找出新網址
        3. 下載並解析新題目
        4. 自動上傳到 GitHub
        """
        print("\n🚀 [一鍵更新] 開始自動化流程...")
        
        # 1. 取得最新標題與連結
        title_map = self.get_index_titles()
        self.title_map = title_map
        
        # 2. 找出尚未收錄的網址 (去重核心邏輯)
        new_urls = []
        for href in title_map.keys():
            if href not in self.known_urls:
                new_urls.append(href)
                self.pending_urls.add(href)
        
        print(f"📊 分析結果: {len(title_map)} 總連結, {len(new_urls)} 個新連結待抓取")
        
        if not new_urls and not self.pending_urls:
            print("✨ 目前資料庫已是最新，無需更新。")
            return

        # 3. 執行下載 (Scrape All)
        self.scrape_all(auto_push=True)

    def add_manual_url(self):
        """手動輸入網址 (Debug 用)"""
        print("\n✏️  請輸入網址 (輸入空行結束):")
        cnt = 0
        while True:
            url = input("> ").strip()
            if not url: 
                break
            if url.startswith("http") and url not in self.known_urls:
                self.pending_urls.add(url)
                cnt += 1
            elif url in self.known_urls:
                print(f"   ⚠️ 此網址已存在資料庫中")
        if cnt > 0:
            self.save_pending()
            print(f"✅ 已新增 {cnt} 個網址")
        else:
            print("ℹ️ 沒有新增任何網址")

    def scrape_all(self, auto_push=False):
        if not self.pending_urls:
            print("⚠️ 沒有待處理的網址。")
            return

        # 若沒先跑過 auto_update_workflow，這邊也嘗試拿一下 title_map
        if not hasattr(self, 'title_map'):
             self.title_map = self.get_index_titles()

        total = len(self.pending_urls)
        print(f"\n🚀 [下載] 開始下載並解析 {total} 個頁面 (Workers={MAX_WORKERS})...")
        
        processed_count = 0
        new_q_count = 0
        
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_url = {executor.submit(self.parse_single_page, url): url for url in list(self.pending_urls)}
            
            try:
                for future in as_completed(future_to_url):
                    url = future_to_url[future]
                    processed_count += 1
                    
                    try:
                        q_list = future.result()
                        if q_list:
                            with self.lock:
                                # 二次去重檢查：確保 URL 尚未收錄
                                if url not in self.known_urls:
                                    # 內容去重：檢查該測驗內的每一題是否已存在
                                    added_for_this_url = 0
                                    for q in q_list:
                                        if 'question' in q:
                                            qh = hash(q['question'].strip())
                                            if qh not in self.known_hashes:
                                                self.questions_db.append(q)
                                                self.known_hashes.add(qh)
                                                added_for_this_url += 1
                                    
                                    # 無論是否有新題目，都將 URL 標記為已處理，避免重複抓取
                                    self.known_urls.add(url)
                                    self.pending_urls.discard(url)
                                    
                                    if added_for_this_url > 0:
                                        new_q_count += added_for_this_url
                                        print(f"[{processed_count}/{total}] ✅ 新增 {added_for_this_url} 題 (共 {len(q_list)} 題) | {q_list[0]['category']}")
                                    else:
                                        print(f"[{processed_count}/{total}] ⚠️ 無新題目 (重複) | {url.split('/')[-1]}")
                                else:
                                    self.pending_urls.discard(url)
                                
                        else:
                            print(f"[{processed_count}/{total}] ⚠️ 無題目 | {url.split('/')[-1]}")
                            with self.lock:
                                self.known_urls.add(url) # 即使沒題目也標記已處理
                                self.pending_urls.discard(url)
                                
                    except Exception as e:
                        print(f"[{processed_count}/{total}] ❌ 失敗: {url} ({e})")
                    
                    if processed_count % 20 == 0:
                        self.save_db()
                        self.save_pending()
                        print(f"--- 自動存檔中 (進度 {processed_count}/{total}) ---")
                        
            except KeyboardInterrupt:
                print("\n🛑 使用者中斷！正在等待執行中的線程結束...")
                executor.shutdown(wait=False)
                raise
 
        self.save_db()
        self.save_pending()
        print(f"\n🎉 下載完成！共新增 {new_q_count} 題。")
        
        if auto_push and new_q_count > 0:
            self.push_to_github(new_q_count)
        elif auto_push:
            print("ℹ️ 無新題目，略過 GitHub 上傳。")

    def push_to_github(self, count):
        print("\n☁️ [Git] 正在上傳至 GitHub...")
        import subprocess
        try:
            subprocess.check_call(["git", "add", "questions.json"])
            subprocess.check_call(["git", "commit", "-m", f"Auto Update: Added {count} new questions"])
            # 使用 -u 參數確保設定上游分支 (首次 push 必須)
            subprocess.check_call(["git", "push", "-u", "origin", "main"])
            print("✅ GitHub 更新成功！")
        except subprocess.CalledProcessError as e:
            if e.returncode == 1:
                # 可能是沒有任何變更需要 commit
                print("ℹ️ 沒有變更需要上傳。")
            else:
                print(f"❌ 上傳失敗: {e}")
                print("   請檢查網路或 Git 設定。")
        except Exception as e:
            print(f"❌ 上傳失敗: {e}")

    def parse_single_page(self, url):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            title_text = "未命名測驗"
            if hasattr(self, 'title_map') and url in self.title_map:
                title_text = self.title_map[url]
            else:
                t_selectors = ['h2.post-title', 'h1', '.title']
                for sel in t_selectors:
                    found = soup.select_one(sel)
                    if found:
                        title_text = found.get_text().strip()
                        break
            
            table = soup.select_one('.article-content table, .article-content-inner table')
            if not table: return []

            rows = table.find_all('tr')
            extracted_qs = []
            
            current_q = None
            
            for tr in rows:
                tds = tr.find_all('td')
                if len(tds) < 1: continue
                
                cell_text_list = [td.get_text(strip=True) for td in tds]
                marker = cell_text_list[0]
                content_cell = tds[-1]
                
                # Remove obfuscation
                for span in content_cell.find_all('span'):
                    style = span.get('style', '')
                    if '255, 255, 255' in style or '255,255,255' in style or '#fff' in style.lower():
                        span.decompose()

                content = content_cell.get_text(strip=True)
                
                # Filter junk
                if not content: continue
                
                # Clean Watermarks
                content = content.replace("r.o.d.d.a.y.e.y.e.", "").replace("roddayeye", "").strip()
                if not content: continue
                
                if marker == 'Q':
                    if current_q: extracted_qs.append(current_q)
                    current_q = {
                        "category": title_text,
                        "source_url": url,
                        "question": content,
                        "options": [],
                        "answer": None
                    }
                elif current_q:
                    is_correct = (marker == 'v')
                    current_q['options'].append({
                        "text": content,
                        "correct": is_correct
                    })
                    if is_correct:
                        current_q['answer'] = content
            
            if current_q: extracted_qs.append(current_q)
            return extracted_qs
    
        except Exception as e:
            return []

    def import_html_exams(self):
        """從 題庫/ 資料夾匯入 HTML 考卷結果"""
        base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '題庫')

        if not os.path.exists(base_dir):
            print(f'❌ 找不到題庫資料夾: {base_dir}')
            print('   請建立 題庫/ 資料夾，並將考卷 HTML 放入子資料夾中')
            return

        htm_files = []
        for root, dirs, files in os.walk(base_dir):
            for f in files:
                if f.endswith('.htm') or f.endswith('.html'):
                    htm_files.append(os.path.join(root, f))

        if not htm_files:
            print('❌ 題庫資料夾裡沒有 .htm/.html 檔案')
            return

        htm_files = sorted(htm_files)
        print(f'📂 找到 {len(htm_files)} 個 HTML 檔案')
        print()

        all_new = []
        for idx, fp in enumerate(htm_files):
            rel = os.path.relpath(fp, base_dir)
            questions = self._parse_exam_html(fp)
            print(f'  📄 [{idx+1}] {rel}: {len(questions)} 題')
            for i, q in enumerate(questions):
                correct = q['answer'] or '(無答案)'
                print(f'     Q{i+1}: {q["question"][:50]}  → {correct}')
            print()

            folder_name = os.path.basename(os.path.dirname(fp))
            cat = input(f'  📝 請輸入 [{idx+1}] 的課程名稱 (Enter=使用資料夾名「{folder_name}」): ').strip()
            if cat:
                for q in questions:
                    q['category'] = cat
            print()
            all_new.extend(questions)

        print(f'📊 共解析到 {len(all_new)} 題')
        if not all_new:
            return

        print()
        confirm = input('確認要寫入 questions.json？(y/N): ').strip().lower()
        if confirm != 'y':
            print('❌ 已取消')
            return

        # Dedup and merge
        added = 0
        skipped = 0
        for q in all_new:
            h = hashlib.md5((q.get('question', '') + '|' + '|'.join(
                o.get('text', '') for o in q.get('options', [])
            )).encode('utf-8')).hexdigest()

            qh = hash(q['question'].strip())
            if h in self.known_hashes or qh in self.known_hashes:
                skipped += 1
            else:
                self.questions_db.append(q)
                self.known_hashes.add(h)
                self.known_hashes.add(qh)
                added += 1

        self.save_db()
        print(f'\n✅ 完成！新增 {added} 題，跳過 {skipped} 題（已存在）')
        print(f'📦 題庫總數: {len(self.questions_db)} 題')

        if added > 0 and input('\n是否上傳到 GitHub？(y/N): ').strip().lower() == 'y':
            self.push_to_github(added)

    def _parse_exam_html(self, filepath):
        """解析單一 HTML 考卷結果檔案"""
        print(f"DEBUG: Parsing {filepath}")
        with open(filepath, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')

        # ... (rest of logic) ...
        # (I will modify the loop to print each found question)
        
        title = os.path.basename(os.path.dirname(filepath))
        source_url = 'manual://' + title

        questions = []
        for ol in soup.find_all('ol'):
            parent_td = ol.find_parent('td')
            if not parent_td:
                continue

            q_text = ''
            p_tag = parent_td.find('p')
            if p_tag:
                q_text = p_tag.get_text(strip=True)
            else:
                for child in parent_td.children:
                    if hasattr(child, 'name') and child.name == 'ol':
                        break
                    if hasattr(child, 'get_text'):
                        q_text += child.get_text(strip=True)
                    elif isinstance(child, str):
                        q_text += child.strip()
            
            # DEBUG
            # print(f"DEBUG: Raw q_text: {q_text[:30]}...")

            q_text = re.sub(r'^\d+\.\s*', '', q_text).strip()
            if not q_text:
                continue
            
            # DEBUG
            # print(f"DEBUG: Parsed Question: {q_text[:50]}...")

            options = []
            for li in ol.find_all('li'):
                span = li.find('span')
                is_correct = False
                if span:
                    style = span.get('style', '')
                    if 'green' in style:
                        is_correct = True

                opt_text = li.get_text(strip=True)
                if not opt_text:
                    img = li.find('img')
                    if img:
                        src = img.get('src', '')
                        if 'right' in src:
                            opt_text = '○'
                        elif 'wrong' in src:
                            opt_text = '╳'

                if opt_text:
                    options.append({'text': opt_text, 'correct': is_correct})

            correct_answers = [o['text'] for o in options if o['correct']]
            answer_str = '、'.join(correct_answers) if correct_answers else ''

            questions.append({
                'category': title,
                'source_url': source_url,
                'question': q_text,
                'options': options,
                'answer': answer_str
            })
        
        print(f"DEBUG: Found {len(questions)} questions in {filepath}")
        return questions

    def main_loop(self):
        while True:
            print("\n======================================")
            print("   Pixnet 題庫自動化管理器 (v3)")
            print("======================================")
            print("1. 🚀 一鍵自動更新 (抓取+下載+上傳)")
            print("2. 📊 查看目前題庫狀態")
            print("3. 🔧 手動輸入網址 (Debug用)")
            print("4. 📄 匯入 HTML 考卷 (題庫/ 資料夾)")
            print("q. 離開")
            
            choice = input("\n請選擇功能 [1, 2, 3, 4, q]: ").strip().lower()
            
            if choice == '1':
                self.auto_update_workflow()
            elif choice == '2':
                print(f"目前資料庫共 {len(self.questions_db)} 題")
                print(f"已知網址 (包含已抓取): {len(self.known_urls)} 個")
                print(f" pending_urls (佇列中): {len(self.pending_urls)} 個")
            elif choice == '3':
                self.add_manual_url()
                if input("是否立即下載? (y/n): ").lower() == 'y':
                    self.scrape_all(auto_push=False)
            elif choice == '4':
                self.import_html_exams()
            elif choice == 'q':
                break
            else:
                print("無效輸入")


if __name__ == "__main__":
    app = QuestionBankManager()
    app.main_loop()
