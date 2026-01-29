# Auto-E-Learning Standalone App - Implementation Plan

## Goal
Create a standalone Python application that launches a browser, allows the user to log in to `elearn.hrd.gov.tw`, and automatically activates the auto-learning and exam-helper features.

## Architecture

### Tech Stack
- **Language**: Python 3
- **Browser Automation**: `playwright` (Robust, handles modern web frames and contexts well)
- **Networking**: `requests` (For fetching Pixnet answers server-side to bypass CORS)
- **UI/Interaction**: The app will launch a standard browser window (Headful mode) for the user to interact with.

### Core Logic (`main.py`)
1.  **Launch**: Open Chromium in non-headless mode.
2.  **Navigation Handling**: Listen to `page.on("load")` or poll URL changes.
3.  **Feature - Index Page (`/learn/path/pathtree.php`)**:
    - Inject the blue "Start Hanging" button via `page.evaluate()`.
    - Button click triggers navigation to `mooc/index.php`.
4.  **Feature - Class Loop (`/mooc/index.php`)**:
    - Inject the "Auto Class" overlay (HTML/CSS).
    - Inject the Heartbeat JS logic (the `setInterval` fetch).
    - *Improvement*: The heartbeat can run in the browser context exactly as before, as it's same-origin.
5.  **Feature - Exam Search (`/learn/exam/exam_start.php`)**:
    - Detect Exam Page.
    - scrape "Exam Title" from page.
    - **Python Side**: `requests.get('pixnet...')`.
    - **Python Side**: Parse HTML, find matching links, fetch answers.
    - **Injection**: Format answers as HTML strings and inject the Side Panel into the browser.
    - *Benefit*: This completely bypasses the complex `GM_xmlhttpRequest` needs.

## Files
- `main.py`: The single entry point script.
- `requirements.txt`: Dependencies.

## Packaging
- Use `pyinstaller --onefile --windowed main.py` to generate the exe.
