const SPREADSHEET_ID = '1bW6UHnzKVGz17S-cKfyVL1mqN9k7N0Cb8D_0W6BCP6s';
const PASS_KEY_SHEET_NAME = 'PASS-KEY';
const ALLOWLIST_SHEET_NAME = '平台識別碼';
const HEADER_ROW = 1;
const NTFY_TOPIC_PROPERTY = 'NTFY_TOPIC';
const NTFY_TOKEN_PROPERTY = 'NTFY_TOKEN';
const NTFY_COOLDOWN_SECONDS = 600;

function doGet() {
  return jsonResponse({ ok: true, service: '學習小幫手 PASS-KEY' });
}

function doPost(e) {
  try {
    const body = parseRequestBody(e);
    if (String(body.action || '').trim().toLowerCase() === 'notify') {
      return handleNotify(body);
    }
    return handlePassKey(body);
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse({ ok: false, valid: false, sent: false, reason: 'server_error' });
  }
}

function handlePassKey(body) {
  const password = String(body.password || '').trim();
  const uid = String(body.uid || '').trim();

  if (!password) {
    return jsonResponse({ ok: false, valid: false, reason: 'missing_password' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(PASS_KEY_SHEET_NAME);
    if (!sheet) {
      return jsonResponse({ ok: false, valid: false, reason: 'sheet_not_found' });
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= HEADER_ROW) {
      return jsonResponse({ ok: true, valid: false, reason: 'invalid' });
    }

    const rows = sheet
      .getRange(HEADER_ROW + 1, 1, lastRow - HEADER_ROW, 3)
      .getDisplayValues();

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const savedPassword = String(row[0] || '').trim();
      const usedAt = String(row[1] || '').trim();
      if (savedPassword !== password) continue;

      if (usedAt) {
        return jsonResponse({ ok: true, valid: false, reason: 'used' });
      }

      const sheetRow = HEADER_ROW + 1 + index;
      sheet.getRange(sheetRow, 2).setValue(new Date());
      if (uid) sheet.getRange(sheetRow, 3).setValue(uid);
      return jsonResponse({ ok: true, valid: true });
    }

    return jsonResponse({ ok: true, valid: false, reason: 'invalid' });
  } finally {
    lock.releaseLock();
  }
}

function handleNotify(body) {
  const uid = String(body.uid || '').trim();
  if (!uid) return jsonResponse({ ok: false, sent: false, reason: 'missing_uid' });
  if (!isAllowlistedUid(uid)) {
    return jsonResponse({ ok: true, sent: false, reason: 'not_allowed' });
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = `ntfy:${hashText(uid)}`;
  if (cache.get(cacheKey)) {
    return jsonResponse({ ok: true, sent: false, reason: 'cooldown' });
  }

  const properties = PropertiesService.getScriptProperties();
  const topic = String(properties.getProperty(NTFY_TOPIC_PROPERTY) || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  const token = String(properties.getProperty(NTFY_TOKEN_PROPERTY) || '').trim();
  if (!topic || !token) {
    return jsonResponse({ ok: false, sent: false, reason: 'not_configured' });
  }

  const timezone = Session.getScriptTimeZone() || 'Asia/Taipei';
  const timestamp = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd HH:mm:ss');
  const response = UrlFetchApp.fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
    method: 'post',
    contentType: 'text/plain; charset=utf-8',
    payload: `學習小幫手使用通知\nUID: ${uid}\nTime: ${timestamp}`,
    headers: {
      Authorization: `Bearer ${token}`,
      Title: '學習小幫手使用通知',
      Priority: '3',
      Tags: 'computer,green_circle'
    },
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    return jsonResponse({ ok: false, sent: false, reason: 'ntfy_error' });
  }

  cache.put(cacheKey, '1', NTFY_COOLDOWN_SECONDS);
  return jsonResponse({ ok: true, sent: true });
}

function isAllowlistedUid(uid) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  // Prefer the named tab; gid=0 is the fallback used by the published CSV.
  const sheet = spreadsheet.getSheetByName(ALLOWLIST_SHEET_NAME)
    || spreadsheet.getSheets()[0];
  if (!sheet) return false;
  if (sheet.getName() === PASS_KEY_SHEET_NAME) return false;
  const lastRow = sheet.getLastRow();
  if (lastRow <= HEADER_ROW) return false;
  const values = sheet
    .getRange(HEADER_ROW + 1, 1, lastRow - HEADER_ROW, 1)
    .getDisplayValues();
  return values.some((row) => String(row[0] || '').trim() === uid);
}

function parseRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    return {};
  }
}

function hashText(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    value,
    Utilities.Charset.UTF_8
  );
  return bytes.map((byte) => {
    const unsigned = byte < 0 ? byte + 256 : byte;
    return unsigned.toString(16).padStart(2, '0');
  }).join('');
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
