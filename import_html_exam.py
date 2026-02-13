#!/usr/bin/env python3
"""Parse saved exam result HTML files and merge new questions into questions.json."""

import os
import sys
import json
import hashlib
from bs4 import BeautifulSoup

QUESTIONS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'questions.json')

def parse_exam_html(filepath):
    """Parse a saved exam result HTML file and extract questions with correct answers."""
    with open(filepath, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    source_url = 'manual://' + os.path.basename(os.path.dirname(filepath))

    questions = []
    # Find all <ol> elements (each contains one question's options)
    for ol in soup.find_all('ol'):
        parent_td = ol.find_parent('td')
        if not parent_td:
            continue

        # Extract question text (remove the number prefix and option list)
        q_text = ''
        
        # Try finding <p> first
        p_tag = parent_td.find('p')
        if p_tag and p_tag.get_text(strip=True):
            q_text = p_tag.get_text(strip=True)
        
        # Fallback: get text directly from td but excluding <ol>
        if not q_text:
            # Clone to safely remove children without affecting original soup
            import copy
            td_clone = copy.copy(parent_td)
            for tag in td_clone.find_all(['ol', 'ul', 'script', 'style']):
                tag.decompose()
            q_text = td_clone.get_text(strip=True)

        # Cleanup question text
        import re
        q_text = re.sub(r'^\d+[\.\s]*', '', q_text).strip()
        
        if not q_text:
            continue

        options = []
        lis = ol.find_all('li')
        for li in lis:
            is_correct = False
            # Check if input is checked inside a green span
            span = li.find('span')
            if span and 'background-color: green' in span.get('style', ''):
                is_correct = True
            
            # Additional check: sometimes background color is on the li or handled differently
            # But based on observation, span style='background-color: green' is the key
            
            # Get option text (after the input element)
            opt_text = li.get_text(strip=True)

            # Handle true/false questions with right.gif/wrong.gif images
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

        # Only add if we found a correct answer
        if any(o['correct'] for o in options):
            questions.append({
                'question': q_text,
                'options': options,
                'source_url': source_url,
                'category': 'Manual Import'
            })

    return questions

def load_db():
    if os.path.exists(QUESTIONS_FILE):
        with open(QUESTIONS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_db(data):
    with open(QUESTIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '題庫')

    if not os.path.exists(base_dir):
        print(f'❌ 找不到題庫資料夾: {base_dir}')
        print('請將 HTML 檔案放在「題庫」資料夾下的子目錄中 (例如: 題庫/1/view_result.htm)')
        return

    db = load_db()
    
    # Build efficient lookup index
    # Normalize function to improve matching
    def normalize(s):
        import re
        return re.sub(r'[\s\u3000\t\n\r\u00a0"\'.:;!?()\[\]{}<>《》「」【】、，。─]', '', s).lower()

    existing_qs = set()
    for item in db:
        if 'question' in item:
            existing_qs.add(normalize(item['question']))

    new_count = 0
    total_parsed = 0

    print('📂 開始掃描題庫資料夾...')
    
    # Walk through all subdirectories
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.htm') or file.endswith('.html'):
                filepath = os.path.join(root, file)
                print(f'📄 正在處理: {os.path.relpath(filepath, base_dir)}')
                
                try:
                    # Ask for category name for this file
                    print(f'   針對檔案 {os.path.basename(root)}/{file}')
                    
                    # For bulk processing, we might want to skip asking or use folder name
                    # Using folder name by default
                    category_name = os.path.basename(root)
                    
                    extracted = parse_exam_html(filepath)
                    total_parsed += len(extracted)
                    
                    file_new = 0
                    for q in extracted:
                        q_norm = normalize(q['question'])
                        
                        # Set category
                        q['category'] = category_name
                        
                        if q_norm not in existing_qs:
                            db.append(q)
                            existing_qs.add(q_norm)
                            new_count += 1
                            file_new += 1
                    
                    print(f'   ✅ 讀取 {len(extracted)} 題，新增 {file_new} 題')
                    
                except Exception as e:
                    print(f'   ❌ 錯誤: {e}')

    extracted = [] # Clear extracted to free memory
    
    if new_count > 0:
        print(f'💾 正在儲存 {len(db)} 筆題目...')
        save_db(db)
        print(f'🎉 完成！共新增 {new_count} 題 (總計 {len(db)} 題)')
    else:
        print('🎉 完成！沒有新題目需要新增。')

if __name__ == '__main__':
    main()
