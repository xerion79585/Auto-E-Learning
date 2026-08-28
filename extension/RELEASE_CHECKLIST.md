# 發布檢查表

## GitHub 設定資料

- [ ] 將 `learning-helper-config.json` 推送至 `main` 分支的 `extension/learning-helper-config.json`。
- [ ] 在未登入 GitHub 的瀏覽器視窗開啟固定設定 URL，確認回傳 HTTP 200 與有效 JSON。
- [ ] 確認 `allowlistUrl` 是已發布的 Google Sheets CSV，且白名單第一欄為 UID。
- [ ] 確認 `questionBankUrl` 回傳 JSON 陣列，且位於 `xerion79585/Auto-E-Learning` 儲存庫。
- [ ] 確認 Apps Script `/exec` 部署為「任何人」可存取，且 `PASS-KEY` 分頁未發布到網路。
- [ ] 確認 `background.js` 中的固定 Apps Script `/exec` 網址與目前部署一致。
- [ ] 用測試密碼確認第一次驗證成功、第二次回傳已使用；測試後不要把該密碼提供給審核人員以外的人。

## Chrome Web Store

- [ ] 上傳 `dist/學習小幫手-Chrome-Web-Store-1.1.2.zip`；壓縮檔根目錄必須直接包含 `manifest.json`。
- [ ] 填入 `STORE_LISTING.md` 的短說明、完整說明和權限理由。
- [ ] 在審核人員說明欄提供啟用密碼、白名單測試 UID、測試帳密和可測試課程網址。
- [ ] 將 `docs/privacy-policy.html` 透過 GitHub Pages 部署為公開 HTTPS 網頁並填入隱私權政策 URL。
- [ ] 提供不含個人資料的截圖、有效支援信箱，並依實際行為完成資料使用揭露。

## USB 發布

- [ ] 將 `dist/學習小幫手-USB-1.1.2.zip` 複製至 USB。
- [ ] 在一個乾淨的 Chrome 個人資料中依 `USB_INSTALL.md` 載入未封裝項目。
- [ ] 確認來源資料夾留在固定位置，避免因 USB 拔除或移動資料夾造成擴充功能失效。
