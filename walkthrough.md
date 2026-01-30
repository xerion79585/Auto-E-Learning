# Auto E-Learning Project Walkthrough

This project provides a complete suite of tools to automate e-learning tasks, manage question banks, and secure your own private database.

## 📂 Project Structure (GitHub Repo)

Repo: [https://github.com/xerion79585/Auto-E-Learning](https://github.com/xerion79585/Auto-E-Learning)

| File | Description |
| :--- | :--- |
| **`question_bank_manager.py`** | **The Core Utility**. A CLI tool to scrape Pixnet, download questions, and save them to `questions.json`. Supports multi-threading for speed. |
| **`questions.json`** | **The Database**. Your local copy of the question bank (currently ~55MB). Updated by the manager script. |
| **`auto_elearning_github.user.js`** | **v13 Script (Recommended)**. Tampermonkey script that fetches `questions.json` from your GitHub for instant searching. |
| **`auto_elearning.user.js`** | **v12 Script (Legacy)**. Fallback script that searches Pixnet directly. Use this if GitHub is unavailable. |
| **`multi_bot.py`** | **Automation Bot**. A Python script to launch multiple browser instances with auto-login capabilities. |
| **`pending_urls.txt`** | Tracks which Pixnet URLs are queued for scraping. |

## 🚀 How to Use (Workflow)

### 1. Maintain the Question Bank
To update your database with new questions:
1.  Open Terminal.
2.  Run: `python3 question_bank_manager.py`
3.  Choose **[1] Crawl Index** to find new posts.
4.  Choose **[2] Scrape All** to download new questions.
5.  (Optional) Run `git add .`, `git commit -m "update"`, `git push` to upload changes to GitHub.

### 2. Auto-Study & Exam
1.  Install **Tampermonkey** in your browser (Chrome/Edge).
2.  Install the **v13 Script** (`auto_elearning_github.user.js`).
3.  Navigate to the e-learning site.
    *   **Study**: Click the "Start Hanging" button.
    *   **Exam**: The script will automatically load the question bank from GitHub (first time takes a few seconds) and instantly show answers.

### 3. Multi-Account Bot
1.  Create an `accounts.txt` file with `username,password` (one per line).
2.  Run: `python3 multi_bot.py`.
3.  It will read the accounts, open separate browsers, auto-login, and inject the script.

## 💡 Tips
- **Duplicate Prevention**: The manager script automatically skips URLs already in `questions.json`. You can crawl as often as you like.
- **GitHub Limit**: The `questions.json` is large (~55MB). It works fine, but avoid editing it manually. Git handles the large file sync efficiently.
