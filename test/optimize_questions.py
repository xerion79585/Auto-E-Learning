import json
import os

INPUT_FILE = '../questions.json'
OUTPUT_FILE = 'questions_min.json'

def optimize():
    print(f"Reading {INPUT_FILE}...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"Original items: {len(data)}")
    
    optimized_data = []
    
    for item in data:
        q_raw = item.get('question')
        a_raw = item.get('answer')
        
        question = q_raw.strip() if q_raw else ''
        answer = a_raw.strip() if a_raw else ''
        
        # If answer is empty, try to find it in options
        if not answer and 'options' in item:
            for opt in item['options']:
                if opt.get('correct'):
                    answer = opt.get('text', '').strip()
                    break
        
        # Determine strict matching mode (for O/X questions)
        # If answer is very short (O/X), we might need strict match, but for now just text is fine.
        
        if question and answer:
            # We use a simple list [question, answer] to save space
            # Replace common characters to save more space if needed, but JSON standard is fine.
            optimized_data.append([question, answer])

    print(f"Optimized items: {len(optimized_data)}")
    
    # Save as compact JSON
    print(f"Saving to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        # separators=(',', ':') removes whitespace
        json.dump(optimized_data, f, ensure_ascii=False, separators=(',', ':'))
        
    # Stats
    orig_size = os.path.getsize(INPUT_FILE) / 1024 / 1024
    new_size = os.path.getsize(OUTPUT_FILE) / 1024 / 1024
    print(f"Done! Size reduced from {orig_size:.2f} MB to {new_size:.2f} MB ({new_size/orig_size*100:.1f}%)")

if __name__ == '__main__':
    optimize()
