# Remote JSON Configuration Schema

`loader.js` 固定從下列網址讀取設定：

```text
https://raw.githubusercontent.com/xerion79585/Auto-E-Learning/main/extension/learning-helper-config.json
```

設定檔必須是 JSON 物件，且 `schemaVersion` 必須為數字 `1`。無法讀取、HTTP 狀態不是 200、JSON 無效或 schema 不符時，擴充功能會使用套件內建的安全預設值。

```json
{
  "schemaVersion": 1,
  "configVersion": "2026.08.25.1",
  "allowlistUrl": "https://docs.google.com/spreadsheets/d/.../pub?output=csv",
  "questionBankUrl": "https://raw.githubusercontent.com/xerion79585/Auto-E-Learning/main/questions.json",
  "recommendedCoursesSheetName": "推薦課程",
  "features": {
    "autoHang": true,
    "autoExam": true,
    "autoQuestionnaire": true
  }
}
```

## Accepted fields

| Field | Type | Constraint | Purpose |
| --- | --- | --- | --- |
| `schemaVersion` | number | Must equal `1`. | Allows intentional, versioned schema changes. |
| `configVersion` | string | First 80 characters retained. | Human-readable config release identifier. |
| `allowlistUrl` | string | HTTPS `docs.google.com/spreadsheets/...` URL. | Public CSV allowlist source. |
| `questionBankUrl` | string | HTTPS `raw.githubusercontent.com/xerion79585/Auto-E-Learning/.../*.json` URL. | JSON question-bank source. |
| `recommendedCoursesSheetName` | string | First 100 characters retained. | Google Sheet tab name for recommended courses. |
| `features.autoHang` | boolean | Missing means enabled. | Enables or disables the bundled hang control. |
| `features.autoExam` | boolean | Missing means enabled. | Enables or disables the bundled exam UI. |
| `features.autoQuestionnaire` | boolean | Missing means enabled. | Enables or disables bundled questionnaire automation. |

## Security boundary

The configuration is data only. It cannot define JavaScript source, executable expressions, module URLs, HTML templates, CSS, selectors, event handlers, extension permissions, match patterns or script filenames. The extension does not use `eval`, `new Function`, dynamic script tags or remote module imports.

The service worker independently blocks requests outside the approved Google Sheets and repository JSON endpoints. Changing this document therefore cannot cause remotely hosted JavaScript to be downloaded or executed.
