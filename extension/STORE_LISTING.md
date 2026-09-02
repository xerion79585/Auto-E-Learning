# Chrome Web Store Listing Draft

## Basic information

- Extension name: `學習小幫手`
- Suggested short description: `僅限允許帳號使用的線上學習流程輔助工具，提供掛網、測驗題庫與問卷操作功能。`
- Category: Productivity
- Language: Traditional Chinese

## Detailed description

學習小幫手是 `https://elearn.hrd.gov.tw/` 的學習流程輔助擴充功能。課程內容有時會由 HTTPS 的其他 `*.hrd.gov.tw` 子網域 frame 承載，擴充功能僅在這些 HRD 學習平台網域中執行。使用者第一次輸入啟用密碼後，擴充功能會在每次進入網站時，於本機讀取目前頁面顯示的 UID，並以公開 Google Sheets 白名單確認使用資格。未通過白名單的帳號不會載入任何學習輔助控制項，且只會顯示未授權提示。

通過授權的帳號可使用套件內建的固定程式碼，提供課程掛網、測驗題庫查找及問卷操作等功能。程式碼不會從網路下載或執行；GitHub 與 Google Sheets 僅提供 JSON、CSV 等設定與資料。題庫、白名單和功能開關可更新，但任何功能邏輯變更都必須透過新版擴充功能發布。

啟用密碼會透過 HTTPS 傳送到發布者管理的 Google Apps Script 一次性驗證服務。服務只會回傳驗證成功或失敗，成功後在私人工作表記錄使用時間；密碼不會送到 GitHub 或公開白名單。白名單通過後，擴充功能會取得公開 IP，並將姓名、UID、IP、User-Agent 和時間交給 Apps Script，再由 Apps Script 傳送到發布者設定的私有 ntfy 主題。服務設有十分鐘冷卻時間，ntfy 憑證不會放在擴充功能中。

## Permission justification

| Permission or host | Reason |
| --- | --- |
| `storage` | 在本機保存啟用狀態、目前 UID 與短期資料快取，避免使用者每次都輸入密碼。 |
| `scripting` | 在已通過白名單的課程頁面注入套件內建的固定程式碼，以及主世界橋接程式以讀取課程頁面已有的 ticket/cid 資訊。 |
| `https://*.hrd.gov.tw/*` | 僅在 HRD 線上學習平台的首頁、課程頁面與其子網域 frame 執行內容腳本和顯示控制項。此範圍是課程內容由不同 HRD 子網域承載時所必需。 |
| `https://docs.google.com/*` | 讀取公開 Google Sheets 的白名單與推薦課程資料；請求不帶使用者 Google Cookie。 |
| `https://raw.githubusercontent.com/*` | 讀取指定 GitHub 儲存庫內的 JSON 設定和題庫資料；請求層另限制為該儲存庫中的 `.json` 路徑。 |
| `https://api.ipify.org/*` | 取得使用者的公開 IP，提供給發布者管理的 Apps Script，作為使用通知內容；不會直接連線到 ntfy。 |
| `https://script.google.com/macros/s/*`、`https://script.googleusercontent.com/macros/echo*` | 將使用者輸入的啟用密碼透過 HTTPS 傳送至發布者管理的 Apps Script，一次性驗證後只回傳成功或失敗；不讀取或公開 `PASS-KEY` 工作表。前者是部署端點，後者是 Apps Script 的 JSON 回應重新導向端點。 |

## Reviewer instructions

1. 將 ZIP 解壓縮後載入 Chrome，或於 Chrome Web Store 安裝。
2. 開啟 `https://elearn.hrd.gov.tw/`。
3. 第一次使用時，點擊工具列的擴充功能圖示，輸入審核用啟用密碼：`[發布者需在送審表單提供]`。
4. 以發布者提供的測試帳號登入：`[發布者需在送審表單提供]`。該帳號的 UID 必須存在於公開白名單。
5. 重新整理頁面。通過白名單後，課程頁面會顯示對應的控制項；不在白名單內的帳號僅顯示「此帳號不在允許名單內。」。

若 Chrome Web Store 審核人員無法取得目標網站的測試帳號，請在提交表單的「測試說明」提供可用帳密、測試 UID、啟用密碼和有效課程網址。這些值不得寫入公開商店說明或套件檔案。

## Before submission

1. 將 `learning-helper-config.json` 發布到 GitHub `main` 分支的 `extension/learning-helper-config.json`。
2. 確認該 URL 回傳 HTTP 200，並確認 JSON 中的白名單與題庫 URL 正確。
3. 將 `docs/privacy-policy.html` 發布為可公開存取的 HTTPS 網頁，將該 URL 填入 Chrome Web Store 的隱私權欄位。
4. 準備至少一張不含真實帳號、UID 或課程個資的螢幕截圖，並填入支援電子郵件地址。
5. 依實際行為完成 Chrome Web Store 的資料使用揭露表單；不可宣稱收集或不收集與本版程式不符的資料。

Chrome Web Store 的最終核准由 Google 決定。即使沒有遠端程式碼，目標網站的服務條款、帳號授權方式與自動化操作的使用情境仍可能影響審核結果。
