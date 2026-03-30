import requests
from bs4 import BeautifulSoup
import json
import os
import re
import shutil
import subprocess
import tempfile
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
DEFAULT_GIT_BRANCH = "main"
DEFAULT_GIT_REMOTE_NAME = "origin"
DEFAULT_GIT_REMOTE_URL = "https://github.com/xerion79585/Auto-E-Learning.git"

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
        db_path = self._db_path()
        if os.path.exists(db_path):
            try:
                with open(db_path, 'r', encoding='utf-8') as f:
                    self.questions_db = json.load(f)
                    for q in self.questions_db:
                        if 'source_url' in q:
                            self.known_urls.add(q['source_url'])
                        self._register_known_question(q)
                print(f"📚 已載入 {len(self.questions_db)} 筆題目資料")
            except Exception as e:
                print(f"⚠️ 讀取資料庫失敗: {e}")
        else:
            print("ℹ️ 尚未建立資料庫")

    def save_db(self):
        try:
            # 存檔時也要鎖，避免寫到一半被讀取
            db_path = self._db_path()
            with self.lock:
                with open(db_path, 'w', encoding='utf-8') as f:
                    json.dump(self.questions_db, f, ensure_ascii=False, indent=2)
            # print(f"💾 資料庫已儲存 ({len(self.questions_db)} 筆)")
        except Exception as e:
            print(f"❌ 儲存失敗: {e}")

    def load_pending(self):
        pending_path = self._pending_path()
        if os.path.exists(pending_path):
            with open(pending_path, 'r', encoding='utf-8') as f:
                for line in f:
                    url = line.strip()
                    if url and url not in self.known_urls:
                        self.pending_urls.add(url)
            print(f"📋 待處理網址清單: {len(self.pending_urls)} 筆")

    def save_pending(self):
        pending_path = self._pending_path()
        with self.lock:
            with open(pending_path, 'w', encoding='utf-8') as f:
                for url in self.pending_urls:
                    f.write(f"{url}\n")

    def _normalize_text(self, text):
        return re.sub(
            r"[\s\u3000\t\n\r\u00a0\"'.:;!?()\[\]{}<>《》「」【】、，。─]",
            "",
            (text or ""),
        ).lower()

    def _question_keys(self, question_item):
        keys = set()
        if not isinstance(question_item, dict):
            return keys

        question_key = self._normalize_text(question_item.get("question", ""))
        if question_key:
            keys.add("q:" + hashlib.md5(question_key.encode("utf-8")).hexdigest())

        option_keys = []
        for option in question_item.get("options", []):
            if not isinstance(option, dict):
                continue
            normalized_option = self._normalize_text(option.get("text", ""))
            if normalized_option:
                option_keys.append(normalized_option)

        raw = "|".join([question_key] + option_keys)
        if raw.strip("|"):
            keys.add("fp:" + hashlib.md5(raw.encode("utf-8")).hexdigest())

        return keys

    def _register_known_question(self, question_item):
        self.known_hashes.update(self._question_keys(question_item))

    def _normalize_imported_question(self, raw_item, default_category, source_hint):
        if not isinstance(raw_item, dict):
            return None

        question = (raw_item.get("question") or "").strip()
        if not question:
            return None

        category = (raw_item.get("category") or "").strip() or default_category
        source_url = (raw_item.get("source_url") or "").strip() or source_hint

        raw_options = raw_item.get("options")
        options = []
        if isinstance(raw_options, list):
            for option in raw_options:
                if isinstance(option, dict):
                    text = (option.get("text") or "").strip()
                    if not text:
                        continue
                    options.append({
                        "text": text,
                        "correct": bool(option.get("correct"))
                    })
                elif isinstance(option, str):
                    text = option.strip()
                    if text:
                        options.append({
                            "text": text,
                            "correct": False
                        })

        answer = (raw_item.get("answer") or "").strip()
        if options and answer:
            answer_tokens = {
                token.strip()
                for token in re.split(r"[、,，;/；\n]+", answer)
                if token.strip()
            }
            if answer_tokens:
                for option in options:
                    if option["text"] in answer_tokens:
                        option["correct"] = True

        if not answer and options:
            correct_answers = [option["text"] for option in options if option.get("correct")]
            answer = "、".join(correct_answers)

        return {
            "category": category,
            "source_url": source_url,
            "question": question,
            "options": options,
            "answer": answer
        }

    def _extract_import_questions_payload(self, payload):
        if isinstance(payload, dict) and isinstance(payload.get("questions"), list):
            return payload.get("questions")
        if isinstance(payload, list):
            return payload
        return None

    def _load_import_bank_file(self, import_path):
        result = {
            "path": import_path,
            "name": os.path.basename(import_path),
            "is_bank": False,
            "error": None,
            "reason": "",
            "payload_count": 0,
            "invalid_count": 0,
            "questions": [],
        }

        try:
            with open(import_path, 'r', encoding='utf-8') as f:
                payload = json.load(f)
        except Exception as e:
            result["error"] = f"讀取 JSON 失敗: {e}"
            return result

        payload = self._extract_import_questions_payload(payload)
        if payload is None:
            result["reason"] = "格式不是題目陣列，也不是包含 questions 陣列的物件"
            return result

        result["payload_count"] = len(payload)
        source_hint = 'manualjson://' + os.path.basename(import_path)
        default_category = os.path.splitext(os.path.basename(import_path))[0]

        normalized_questions = []
        invalid_count = 0
        for item in payload:
            normalized = self._normalize_imported_question(item, default_category, source_hint)
            if normalized:
                normalized_questions.append(normalized)
            else:
                invalid_count += 1

        result["invalid_count"] = invalid_count
        result["questions"] = normalized_questions
        result["is_bank"] = len(normalized_questions) > 0
        if not result["is_bank"]:
            result["reason"] = "沒有可匯入的有效題目"

        return result

    def _simulate_import_merge(self, bank_results):
        simulated_known_hashes = set(self.known_hashes)
        planned_banks = []
        total_new = 0
        total_duplicates = 0

        for bank in bank_results:
            new_questions = []
            duplicate_questions = []

            for question in bank["questions"]:
                q_keys = self._question_keys(question)
                if q_keys and any(key in simulated_known_hashes for key in q_keys):
                    duplicate_questions.append(question)
                    continue

                new_questions.append(question)
                simulated_known_hashes.update(q_keys)

            planned_bank = dict(bank)
            planned_bank["new_questions"] = new_questions
            planned_bank["duplicate_questions"] = duplicate_questions
            planned_bank["new_count"] = len(new_questions)
            planned_bank["duplicate_count"] = len(duplicate_questions)
            planned_banks.append(planned_bank)
            total_new += planned_bank["new_count"]
            total_duplicates += planned_bank["duplicate_count"]

        return planned_banks, total_new, total_duplicates

    def _script_dir(self):
        return os.path.dirname(os.path.abspath(__file__))

    def _db_path(self):
        return os.path.join(self._script_dir(), DB_FILE)

    def _pending_path(self):
        return os.path.join(self._script_dir(), PENDING_FILE)

    def _detect_repo_root(self):
        try:
            proc = subprocess.run(
                ["git", "-C", self._script_dir(), "rev-parse", "--show-toplevel"],
                text=True,
                capture_output=True,
                check=False,
            )
            if proc.returncode == 0:
                return (proc.stdout or "").strip()
        except Exception:
            pass
        return None

    def _get_remote_url(self, repo_root):
        if not repo_root:
            return DEFAULT_GIT_REMOTE_URL
        try:
            proc = subprocess.run(
                ["git", "-C", repo_root, "remote", "get-url", DEFAULT_GIT_REMOTE_NAME],
                text=True,
                capture_output=True,
                check=False,
            )
            if proc.returncode == 0:
                remote_url = (proc.stdout or "").strip()
                if remote_url:
                    return remote_url
        except Exception:
            pass
        return DEFAULT_GIT_REMOTE_URL

    def _get_git_config(self, repo_root, key):
        if not repo_root:
            return ""
        try:
            proc = subprocess.run(
                ["git", "-C", repo_root, "config", "--get", key],
                text=True,
                capture_output=True,
                check=False,
            )
            if proc.returncode == 0:
                return (proc.stdout or "").strip()
        except Exception:
            pass
        return ""

    def _run_and_print(self, command, cwd=None):
        proc = subprocess.run(
            command,
            cwd=cwd,
            text=True,
            capture_output=True,
            check=False,
        )
        stdout = (proc.stdout or "").strip()
        stderr = (proc.stderr or "").strip()
        for line in filter(None, stdout.splitlines()):
            print(line)
        for line in filter(None, stderr.splitlines()):
            print(line)
        return proc
    
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
                                        q_keys = self._question_keys(q)
                                        if q_keys and not any(key in self.known_hashes for key in q_keys):
                                            self.questions_db.append(q)
                                            self._register_known_question(q)
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

    def push_to_github(self, count, commit_message=None):
        print("\n☁️ [Git] 正在上傳至 GitHub...")
        db_path = self._db_path()
        if not os.path.exists(db_path):
            print(f"❌ 找不到題庫檔案: {db_path}")
            return

        message = commit_message or f"Auto Update: Added {count} new questions"

        repo_root = self._detect_repo_root()
        remote_url = self._get_remote_url(repo_root)
        temp_root = tempfile.mkdtemp(prefix="autoelearning_push_")
        temp_repo = os.path.join(temp_root, "repo")

        try:
            init_proc = self._run_and_print(["git", "init", "-b", DEFAULT_GIT_BRANCH, temp_repo])
            if init_proc.returncode != 0:
                raise RuntimeError("無法建立臨時 Git 倉庫")

            add_remote_proc = self._run_and_print(
                ["git", "-C", temp_repo, "remote", "add", DEFAULT_GIT_REMOTE_NAME, remote_url]
            )
            if add_remote_proc.returncode != 0:
                raise RuntimeError("無法設定 GitHub 遠端")

            fetch_proc = self._run_and_print(
                ["git", "-C", temp_repo, "fetch", DEFAULT_GIT_REMOTE_NAME, DEFAULT_GIT_BRANCH]
            )
            if fetch_proc.returncode != 0:
                raise RuntimeError("無法取得 GitHub 最新版本")

            checkout_proc = self._run_and_print(
                ["git", "-C", temp_repo, "checkout", "-B", DEFAULT_GIT_BRANCH, "FETCH_HEAD"]
            )
            if checkout_proc.returncode != 0:
                raise RuntimeError("無法切換到最新 GitHub 主分支")

            git_user_name = self._get_git_config(repo_root, "user.name")
            git_user_email = self._get_git_config(repo_root, "user.email")
            if git_user_name:
                self._run_and_print(["git", "-C", temp_repo, "config", "user.name", git_user_name])
            if git_user_email:
                self._run_and_print(["git", "-C", temp_repo, "config", "user.email", git_user_email])

            shutil.copy2(db_path, os.path.join(temp_repo, DB_FILE))

            diff_proc = subprocess.run(
                ["git", "-C", temp_repo, "diff", "--quiet", "--", DB_FILE],
                text=True,
                capture_output=True,
                check=False,
            )
            if diff_proc.returncode == 0:
                print("ℹ️ 沒有變更需要上傳。")
                return

            add_proc = self._run_and_print(["git", "-C", temp_repo, "add", "--", DB_FILE])
            if add_proc.returncode != 0:
                raise RuntimeError("無法加入題庫檔案到 Git 暫存區")

            commit_proc = self._run_and_print(
                ["git", "-C", temp_repo, "commit", "-m", message]
            )
            if commit_proc.returncode != 0:
                combined = f"{commit_proc.stdout or ''}\n{commit_proc.stderr or ''}".lower()
                if "nothing to commit" in combined or "nothing added to commit" in combined:
                    print("ℹ️ 沒有變更需要上傳。")
                    return
                raise RuntimeError("建立 Git commit 失敗")

            push_proc = self._run_and_print(
                ["git", "-C", temp_repo, "push", DEFAULT_GIT_REMOTE_NAME, DEFAULT_GIT_BRANCH]
            )
            if push_proc.returncode != 0:
                raise RuntimeError("推送到 GitHub 失敗")

            print("✅ GitHub 更新成功！")
        except Exception as e:
            print(f"❌ 上傳失敗: {e}")
            print("   請檢查網路、GitHub 權限或 Git 設定。")
        finally:
            shutil.rmtree(temp_root, ignore_errors=True)

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

    def import_question_bank_json(self):
        """自動偵測同目錄題庫 JSON，與 questions.json 比對後合併"""
        script_dir = self._script_dir()
        db_path = os.path.abspath(self._db_path())
        candidate_paths = []
        for filename in sorted(os.listdir(script_dir)):
            if not filename.lower().endswith('.json'):
                continue
            file_path = os.path.abspath(os.path.join(script_dir, filename))
            if file_path == db_path:
                continue
            if os.path.isfile(file_path):
                candidate_paths.append(file_path)

        print('\n📥 將自動掃描程式同目錄內的所有 JSON 題庫檔')
        print(f'   掃描資料夾: {script_dir}')

        if not candidate_paths:
            print('❌ 找不到可掃描的 JSON 檔案')
            print('   請把一鍵匯出的題庫 JSON 放在 question_bank_manager.py 同一個資料夾')
            return

        valid_banks = []
        skipped_files = []
        error_files = []
        for import_path in candidate_paths:
            result = self._load_import_bank_file(import_path)
            if result["error"]:
                error_files.append(result)
            elif result["is_bank"]:
                valid_banks.append(result)
            else:
                skipped_files.append(result)

        print(f'📂 掃描到 {len(candidate_paths)} 個 JSON 檔')

        if skipped_files:
            print(f'⏭️ 略過 {len(skipped_files)} 個非題庫 JSON:')
            for item in skipped_files[:5]:
                print(f'   - {item["name"]}: {item["reason"]}')
            if len(skipped_files) > 5:
                print(f'   ... 其餘 {len(skipped_files) - 5} 個檔案已略過')

        if error_files:
            print(f'⚠️ 有 {len(error_files)} 個 JSON 無法讀取:')
            for item in error_files[:5]:
                print(f'   - {item["name"]}: {item["error"]}')
            if len(error_files) > 5:
                print(f'   ... 其餘 {len(error_files) - 5} 個檔案讀取失敗')

        if not valid_banks:
            print('❌ 沒有找到可匯入的有效題庫 JSON')
            return

        planned_banks, total_new, total_duplicates = self._simulate_import_merge(valid_banks)
        normalized_questions = []
        questions_to_add = []
        for bank in planned_banks:
            normalized_questions.extend(bank["questions"])
            questions_to_add.extend(bank["new_questions"])

        total_payload = sum(bank["payload_count"] for bank in planned_banks)
        total_invalid = sum(bank["invalid_count"] for bank in planned_banks)
        print(f'✅ 偵測到 {len(planned_banks)} 個題庫檔:')
        for bank in planned_banks:
            print(
                f'   - {bank["name"]}: 原始 {bank["payload_count"]} 筆，'
                f'格式有效 {len(bank["questions"])} 筆，'
                f'預計新增 {bank["new_count"]} 筆，'
                f'重複略過 {bank["duplicate_count"]} 筆，'
                f'無效 {bank["invalid_count"]} 筆'
            )

        print(
            f'📊 題庫總計: 原始 {total_payload} 筆，'
            f'格式有效 {len(normalized_questions)} 筆，'
            f'預計新增 {total_new} 筆，'
            f'重複略過 {total_duplicates} 筆，'
            f'無效 {total_invalid} 筆'
        )

        preview_source = questions_to_add if questions_to_add else normalized_questions
        preview_label = '預計新增題目預覽'
        if not questions_to_add:
            preview_label = '題目預覽（本次皆為重複題）'

        preview_count = len(preview_source)
        print()
        print(f'📝 {preview_label}（共 {preview_count} 題）:')
        for idx, question in enumerate(preview_source[:preview_count], start=1):
            answer = question.get('answer', '').strip() or '(無答案)'
            source_name = question.get('category', '').strip() or '未分類'
            print(f'   {idx}. [{source_name}] {question["question"][:50]}  → {answer}')

        print()
        confirm = input('確認要寫入 questions.json？(y/N): ').strip().lower()
        if confirm != 'y':
            print('❌ 已取消')
            return

        added = 0
        skipped = 0
        file_stats = []
        for bank in planned_banks:
            for question in bank["new_questions"]:
                self.questions_db.append(question)
                if question.get('source_url'):
                    self.known_urls.add(question['source_url'])
                self._register_known_question(question)

            added += bank["new_count"]
            skipped += bank["duplicate_count"]
            file_stats.append((bank["name"], bank["new_count"], bank["duplicate_count"]))

        if added > 0:
            self.save_db()
        print(f'\n✅ 完成！新增 {added} 題，跳過 {skipped} 題（已存在）')
        print(f'📦 題庫總數: {len(self.questions_db)} 題')
        print('📁 各檔案處理結果:')
        for file_name, file_added, file_skipped in file_stats:
            print(f'   - {file_name}: 新增 {file_added} 題，跳過 {file_skipped} 題')

        push_prompt = '\n是否上傳到 GitHub？(y/N): '
        if added == 0:
            push_prompt = '\n本次沒有新增題目，是否仍要檢查並推送目前題庫到 GitHub？(y/N): '

        if input(push_prompt).strip().lower() == 'y':
            commit_message = (
                f"Import JSON Bank: Added {added} new questions"
                if added > 0
                else "Manual Update: Refresh question bank"
            )
            self.push_to_github(added, commit_message=commit_message)

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
            print("4. 📥 匯入題庫 JSON（比對後合併）")
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
                self.import_question_bank_json()
            elif choice == 'q':
                break
            else:
                print("無效輸入")


if __name__ == "__main__":
    app = QuestionBankManager()
    app.main_loop()
