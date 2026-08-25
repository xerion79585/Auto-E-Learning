# 學習小幫手 Chrome 擴充程式

這個目錄是可由 Chrome「載入未封裝項目」安裝，也可打包上架 Chrome Web Store 的 Manifest V3 擴充程式。它取代原本的 `auto_elearning_loader.user.js`，並保留啟用與白名單流程：

1. 使用者輸入啟用密碼。
2. 擴充程式取得目前登入 UID，並從 Google Sheet 白名單確認 UID。
3. 只有通過前兩步，才會啟動擴充程式內附的固定版 `auto_elearning_bot.js`。

原 bot 仍使用 Tampermonkey 的 `GM_getValue`、`GM_setValue`、`GM_xmlhttpRequest` 和 `GM_openInTab`。`loader.js` 會在 content-script isolated world 提供相容 API；通過白名單後，service worker 只注入擴充程式套件內的固定 bot。GitHub 只提供經過欄位驗證的 JSON 設定，不能提供或執行 JavaScript。

## 安裝

1. 開啟 `chrome://extensions`。
2. 開啟右上角「開發人員模式」。
3. 選擇「載入未封裝項目」，指定這個 `extension` 目錄。
4. 開啟 `https://elearn.hrd.gov.tw/`，輸入一次啟用密碼。
5. 先登入白名單帳號，再重新整理頁面；通過後才會啟動套件內的 bot。啟用狀態會永久保留，之後不再要求密碼。

也可以點擊工具列的「學習小幫手」貓咪圖示，在 popup 內先完成密碼啟用。之後進入支援網站時只會重新檢查目前登入帳號是否仍在白名單內；不在名單內時才會顯示「此帳號不在允許名單內」。

## 更新與安全邊界

GitHub 的 `learning-helper-config.json` 只包含設定資料，例如白名單 URL、題庫 URL、推薦課程分頁名稱與功能開關，快取時間為五分鐘。白名單快取一分鐘；網路暫時失敗時，已有快取的白名單可以繼續使用，空白快取則一律阻擋 bot。`questions.json` 這類大型資料會由 service worker 分段傳輸，避免 Chrome runtime 訊息大小限制。

程式邏輯完全包含在擴充程式 bundle 中，符合 Manifest V3 對遠端程式碼的限制。背景程式只接受 Google Sheets 試算表資料與 `xerion79585/Auto-E-Learning` 儲存庫內的 `.json` 資料，不接受任意 URL。bot 邏輯更新需要提高擴充程式版本並透過 Chrome Web Store 或 USB 套件重新發布；設定與資料仍可由遠端 JSON 即時調整。

發布前，請將本目錄的 `learning-helper-config.json` 推送到 `main` 分支的 `extension/learning-helper-config.json`。`loader.js` 會固定讀取該 JSON URL；若設定檔暫時無法取得，會改用套件內相同的安全預設值，功能不會改為下載或執行遠端 JavaScript。

## USB 安裝

解壓縮 USB 套件後，開啟 `chrome://extensions`、啟用「開發人員模式」，選擇「載入未封裝項目」，指定解壓縮後的 `extension` 資料夾。這種安裝不需要 Chrome Web Store，但課程、白名單與題庫功能本身仍需要網路。
