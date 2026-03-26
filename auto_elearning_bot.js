
(function () {
    'use strict';
    if (window.__BOT_INIT_DONE) return;
    window.__BOT_INIT_DONE = true;
    const _d = function (s) { return atob(s.split('').reverse().join('')); };
    const _k0 = _d('=IGdwcGM2tWZmZnN6NjdvtWb3MXdipXNhlHaqhDMftGd');
    const _k1 = _d('0JXZsFULlNXVtcmbp5mchVGbF1yb0VXQ');
    const _k3 = _d('==gdzNWP0VHc0V3b/IWdw9CSZhHO28kbmVGW6ZDd1okVrdVQ0U2XZpXdMlWRfFXN3NESsFzaEJ3dI5kVZFWMVlVNysUUV5Ubq5Ge1Z3YzQTRUV0cfRGNKR2Ui9mbTJldx0CWDFEUy8SZvQ2LzRXZlh2ckFWZyB3cv02bj5SZsd2bvdmLzN2bk9yL6MHc0RHa');
    const _cd = 0xea60;
    const _ci = 0xea60;

    // ---- ntfy login notification ----
    function _notifyLoginAllowed() {
        const nameEl = document.querySelector('.co-realname');
        const idEl = document.querySelector('.co-username');

        if (window.location.href.includes('login') || window.location.href.includes('logout')) {
            GM_setValue('_sn3', '');
            GM_setValue('_uId', '');
            GM_setValue('_uName', '');
        }

        if (nameEl && nameEl.textContent.trim()) {
            GM_setValue('_uName', nameEl.textContent.trim());
            if (idEl && idEl.textContent.trim()) {
                GM_setValue('_uId', idEl.textContent.trim().replace(/^平台識別碼：/, ''));
            }

            const u = GM_getValue('_uName', '');
            const uid = GM_getValue('_uId', '');
            const label = uid ? (u + ' (' + uid + ')') : u;

            if (GM_getValue('_sn3', '') === u) {
                return;
            }

            const dev = navigator.userAgent;
            const pg = window.location.href;
            const ts = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

            GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://api.ipify.org?format=json',
                responseType: 'json',
                onload: function (r) {
                    const ip = (r.response && r.response.ip) ? r.response.ip : 'N/A';
                    _send(label, u, dev, ip, pg, ts);
                },
                onerror: function () {
                    _send(label, u, dev, 'N/A', pg, ts);
                }
            });
            return;
        }

        function _send(name, rawName, dev, ip, pg, time) {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://ntfy.sh/' + _k1,
                headers: {
                    'Authorization': 'Bearer ' + _k0,
                    'Title': 'Bot Online',
                    'Priority': '3',
                    'Tags': 'robot,green_circle'
                },
                data: [
                    'User: ' + name,
                    'Time: ' + time,
                    'IP: ' + ip,
                    'Page: ' + pg,
                    'UA: ' + dev
                ].join('\n'),
                onload: function (resp) {
                    if (resp.status >= 200 && resp.status < 300) {
                        GM_setValue('_sn3', rawName);
                    }
                },
                onerror: function () { }
            });
        }
    }
    function _gU() {
        // Prefer the current page's logged-in identity.
        const idEl = document.querySelector('.co-username');
        if (idEl && idEl.textContent.trim()) {
            const uid = idEl.textContent.trim().replace(/^平台識別碼：/, '');
            GM_setValue('_uId', uid);
            return uid;
        }
        // 白名單模式：在任何頁面都 fallback 到快取的 UID
        // 使用者在首頁/儀表板登入時 UID 已被快取
        return GM_getValue('_uId', '');
    }


    function _gC() {
        return new Promise((resolve) => {
            // Check cache first
            const cached = GM_getValue('_b_c', null);
            const cacheTime = GM_getValue('_b_t', 0);
            if (cached && (Date.now() - cacheTime) < _cd) {
                resolve(JSON.parse(cached));
                return;
            }

            if (!_k3) { resolve([]); return; }

            GM_xmlhttpRequest({
                method: 'GET',
                url: _k3,
                onload: function (response) {
                    try {
                        const lines = response.responseText.replace(/\r/g, '').trim().split('\n');
                        const _lst = [];

                        // Skip header row (uid, reason, date)
                        for (let i = 1; i < lines.length; i++) {
                            const cols = _pL(lines[i]);
                            if (cols.length >= 1 && cols[0].trim()) {
                                _lst.push({
                                    uid: cols[0].trim(),
                                    reason: cols.length >= 2 ? cols[1].trim() : '',
                                    date: cols.length >= 3 ? cols[2].trim() : ''
                                });
                            }
                        }

                        GM_setValue('_b_c', JSON.stringify(_lst));
                        GM_setValue('_b_t', Date.now());
                        resolve(_lst);
                    } catch (e) {

                        resolve([]);
                    }
                },
                onerror: function (e) {

                    resolve([]);
                }
            });
        });
    }

    function _pL(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                inQuotes = !inQuotes;
            } else if (c === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += c;
            }
        }
        result.push(current);
        return result;
    }

    function _sR(title, color, detail) {
        const existing = document.getElementById('_sp');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = '_sp';
        Object.assign(panel.style, {
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: '9999999',
            padding: '15px 20px',
            background: '#fff',
            border: `3px solid ${color}`,
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            fontFamily: 'sans-serif',
            fontSize: '14px',
            maxWidth: '350px',
            lineHeight: '1.6'
        });

        panel.innerHTML = `
            <div style="font-size:18px;font-weight:bold;color:${color};margin-bottom:8px;text-align:center;">${title}</div>
            <div style="color:#333;font-weight:bold;text-align:center;">${detail}</div>
        `;
        document.body.appendChild(panel);
    }

    function _isHomePage() {
        const path = window.location.pathname.replace(/\/+$/, '') || '/';
        return path === '/' || path === '/index.php' || path === '/mooc/index.php';
    }

    function _disableBot() {
        window.__BOT_AUTH = false;

        [
            '_sp',
            'bot-btn-hang',
            'bot-hang-overlay',
            'bot-exam-toolbar',
            'bot-exam-panel',
            'bot-solver-log',
            'bot-dl-overlay',
            'oac-block-modal',
            'open-all-courses-container'
        ].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        document.body.style.marginLeft = '';
        const prompt = document.getElementById('_sp');
        if (_isHomePage()) {
            const promptText = prompt ? prompt.textContent.replace(/\s+/g, '') : '';
            if (!promptText.includes('此帳號不在允許名單內')) {
                _sR('提示', '#f44336', '此帳號不在允許名單內');
            }
        } else if (prompt) {
            prompt.remove();
        }
    }

    async function _chk() {
        const uid = _gU();
        if (!uid) {
            window.__BOT_AUTH = false;
            const prompt = document.getElementById('_sp');
            if (prompt) prompt.remove();
            return false;
        }
        const _lst = await _gC();
        const allowed = _lst.some(entry => entry.uid === uid);
        if (allowed) {
            window.__BOT_AUTH = true;
            const prompt = document.getElementById('_sp');
            if (prompt) prompt.remove();
            _notifyLoginAllowed();
            return true;
        }
        _disableBot();
        return false;
    }

    // _d already declared above
    const _k2 = _d('u92cq5ycu9Wa0NXZ1F3LulWYt9yZulmbyFWZM1SRt8Gd1F0L1gTN5cjbvlmclh3Lt92YuQnblRnbvNmclNXdiVHa0l2ZucXYy9yL6MHc0RHa');
    window.__BOT_DB = null;
    window.__BOT_LOADING = false;
    window.__BOT_AUTH = false; // Enable only after whitelist check passes

    // ---- core ----
    function _initBot() {
        // ... (insert full _initBot content here) ...
        const TRUE_VALS = ['○', 'o', 'v', '是', 'true', 'correct', '對', '圈', 'right', '正確', 't'];
        const FALSE_VALS = ['╳', 'x', '✕', '否', 'false', 'incorrect', 'wrong', '錯', '叉', '錯誤', 'f'];
        const normalize = (s) => ((s || '') + '')
            .toLowerCase()
            .replace(/&nbsp;/gi, ' ')
            .replace(/[\u200b-\u200d\ufeff]/g, '')
            .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '');
        const AUTO_SUBMIT_DELAY_MS = 800;
        const QUESTIONNAIRE_SUBMIT_DELAY_MS = 500;
        const QUESTIONNAIRE_CLOSE_GRACE_MS = 2500;
        const QUESTIONNAIRE_AUTO_RUN = true;
        const DIALOG_BYPASS_MS = 10000;
        const QUESTIONNAIRE_DIALOG_BYPASS_MS = 45000;
        const DIALOG_SWEEP_INTERVAL_MS = 300;
        const AUTO_CLOSE_DELAY_MS = 1500;
        const AUTO_CLOSE_MARKER_TTL_MS = 120000;
        const PAGE_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        const CENTER_NOTICE_ID = 'bot-center-notice';
        const CENTER_PROGRESS_FILL_ID = 'bot-center-progress-fill';
        const CENTER_DOWNLOAD_TEXT_ID = 'bot-center-download-text';
        const RUNTIME_STYLE_ID = 'bot-runtime-style';
        const DIALOG_BYPASS_KEY = '__BOT_DIALOG_BYPASS_UNTIL__';
        const DIALOG_BYPASS_STORAGE_KEY = '__BOT_DIALOG_BYPASS_UNTIL_TS__';
        const PAGE_DIALOG_BRIDGE_ID = 'bot-page-dialog-bridge';
        const AUTO_CLOSE_MARKER_KEY = '__BOT_PENDING_CLOSE__';
        const AUTO_CLOSE_ATTEMPTED_KEY = '__BOT_CLOSE_ATTEMPTED__';
        const QUESTIONNAIRE_STATE_KEY = '__BOT_QUESTIONNAIRE_STATE__';
        const QUESTIONNAIRE_AUTO_RUN_KEY = '__BOT_QUESTIONNAIRE_AUTO_RUN_DONE__';
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        function logBot(message) {
            console.log(`[BOT] ${message}`);
        }

        function cleanInlineText(value) {
            return ((value || '') + '')
                .replace(/&nbsp;/gi, ' ')
                .replace(/[\u200b-\u200d\ufeff]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function stripQuestionPrefix(value) {
            let text = cleanInlineText(value);
            text = text.replace(/^[【\[]?\s*(?:單選題|複選題|是非題|問答題|題目)\s*[】\]]?\s*/i, '');
            text = text.replace(/^[(（]?\s*\d+\s*[)）]\s*/, '');
            text = text.replace(/^(?:第\s*)?\d+\s*(?:題|[.、:：\-－]|）|\))\s*/i, '');
            text = text.replace(/^[Qq]\s*\d+\s*(?:[.、:：\-－]|）|\))\s*/i, '');
            return cleanInlineText(text);
        }

        function stripOptionPrefix(value) {
            let text = cleanInlineText(value);
            text = text.replace(/^[A-HＡ-Ｈa-h][.、)）:：\-－]\s*/, '');
            text = text.replace(/^[①②③④⑤⑥⑦⑧]\s*/, '');
            text = text.replace(/^[（(]?[1-8一二三四五六七八][)）.、]\s*/, '');
            return cleanInlineText(text);
        }

        function getQuestionVariants(value) {
            const source = cleanInlineText(value);
            const variants = [];

            function pushVariant(candidate) {
                const normalized = normalize(stripQuestionPrefix(candidate));
                if (normalized && !variants.includes(normalized)) {
                    variants.push(normalized);
                }
            }

            if (!source) return variants;

            pushVariant(source);
            pushVariant(stripQuestionPrefix(source));

            const firstLine = cleanInlineText(source.split(/\n+/).find(Boolean) || '');
            if (firstLine) pushVariant(firstLine);

            const sentenceMatch = source.match(/^(.{4,180}?[?？。])/);
            if (sentenceMatch) pushVariant(sentenceMatch[1]);

            const optionCutMatch = source.match(/^(.{4,220}?)(?=\s*(?:[A-DＡ-Ｄa-d][.、)）]\s*|[(（]?[1-4一二三四][)）.、]\s*|①|②|③|④))/);
            if (optionCutMatch) pushVariant(optionCutMatch[1]);

            return variants;
        }

        function getCommonPrefixLength(a, b) {
            const limit = Math.min(a.length, b.length);
            let index = 0;
            while (index < limit && a[index] === b[index]) index += 1;
            return index;
        }

        function scoreQuestionVariantMatch(a, b) {
            if (!a || !b) return 0;
            if (a === b) return 1;

            const shorter = Math.min(a.length, b.length);
            const longer = Math.max(a.length, b.length);

            if (shorter >= 3 && (a.includes(b) || b.includes(a))) {
                if (shorter <= 6) {
                    return Math.min(0.99, 0.92 + (shorter / Math.max(longer, 1)) * 0.06);
                }
                return Math.min(0.99, 0.88 + (shorter / Math.max(longer, 1)) * 0.1);
            }

            const prefixLength = getCommonPrefixLength(a, b);
            if (prefixLength >= 6) {
                return Math.min(0.9, 0.72 + (prefixLength / Math.max(longer, 1)) * 0.18);
            }

            return 0;
        }

        function ensureRuntimeStyles() {
            if (document.getElementById(RUNTIME_STYLE_ID)) return;

            const style = document.createElement('style');
            style.id = RUNTIME_STYLE_ID;
            style.textContent = `
                @keyframes bot-download-sweep {
                    0% { transform: translateX(-140%); }
                    100% { transform: translateX(320%); }
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        function formatBytes(bytes) {
            const safeBytes = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
            if (safeBytes < 1024) return `${safeBytes.toFixed(0)} B`;
            if (safeBytes < 1024 * 1024) return `${(safeBytes / 1024).toFixed(1)} KB`;
            if (safeBytes < 1024 * 1024 * 1024) return `${(safeBytes / 1024 / 1024).toFixed(1)} MB`;
            return `${(safeBytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
        }

        function getCenterNoticeStyles(type) {
            if (type === 'success') {
                return {
                    background: 'rgba(5, 122, 76, 0.94)',
                    border: '2px solid rgba(167, 243, 208, 0.9)'
                };
            }
            if (type === 'warn') {
                return {
                    background: 'rgba(180, 83, 9, 0.95)',
                    border: '2px solid rgba(253, 230, 138, 0.9)'
                };
            }
            return {
                background: 'rgba(15, 23, 42, 0.92)',
                border: '2px solid rgba(147, 197, 253, 0.75)'
            };
        }

        function getCenterNoticeElement() {
            ensureRuntimeStyles();

            let element = document.getElementById(CENTER_NOTICE_ID);
            if (element) return element;

            element = document.createElement('div');
            element.id = CENTER_NOTICE_ID;
            Object.assign(element.style, {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) scale(0.96)',
                zIndex: '10000000',
                minWidth: '280px',
                maxWidth: '70vw',
                padding: '18px 28px',
                borderRadius: '16px',
                background: 'rgba(15, 23, 42, 0.92)',
                color: '#fff',
                fontSize: '18px',
                fontWeight: '700',
                fontFamily: 'sans-serif',
                textAlign: 'center',
                boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
                opacity: '0',
                pointerEvents: 'none',
                transition: 'opacity 0.2s ease, transform 0.2s ease'
            });
            document.body.appendChild(element);
            return element;
        }

        function showCenterNotice(message, options) {
            const settings = Object.assign({ type: 'info' }, options || {});
            const element = getCenterNoticeElement();
            const styles = getCenterNoticeStyles(settings.type);

            element.textContent = message;
            element.style.background = styles.background;
            element.style.border = styles.border;
            element.style.opacity = '1';
            element.style.transform = 'translate(-50%, -50%) scale(1)';
        }

        function hideCenterNotice(immediate) {
            const element = document.getElementById(CENTER_NOTICE_ID);
            if (!element) return Promise.resolve();

            if (immediate) {
                element.style.opacity = '0';
                element.style.transform = 'translate(-50%, -50%) scale(0.96)';
                return Promise.resolve();
            }

            return new Promise((resolve) => {
                element.style.opacity = '0';
                element.style.transform = 'translate(-50%, -50%) scale(0.96)';
                setTimeout(resolve, 220);
            });
        }

        async function flashCenterNotice(message, options) {
            const settings = Object.assign({ duration: 1200, type: 'info' }, options || {});
            showCenterNotice(message, settings);
            await sleep(settings.duration);
            await hideCenterNotice(false);
        }

        function showCenterDownloadNotice() {
            const element = getCenterNoticeElement();
            const styles = getCenterNoticeStyles('info');

            element.style.background = styles.background;
            element.style.border = styles.border;
            element.style.opacity = '1';
            element.style.transform = 'translate(-50%, -50%) scale(1)';
            element.innerHTML = `
                <div style="font-size:20px;font-weight:700;margin-bottom:14px;">題庫下載中...</div>
                <div style="position:relative;width:100%;height:14px;background:rgba(255,255,255,0.14);border-radius:999px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,0.25);">
                    <div id="${CENTER_PROGRESS_FILL_ID}" style="position:absolute;top:0;left:0;width:34%;height:100%;background:linear-gradient(90deg, rgba(96,165,250,0.15) 0%, #60a5fa 30%, #38bdf8 70%, rgba(34,211,238,0.15) 100%);border-radius:999px;box-shadow:0 0 14px rgba(56,189,248,0.35);transform:translateX(-140%);animation:bot-download-sweep 1.15s ease-in-out infinite;"></div>
                </div>
                <div id="${CENTER_DOWNLOAD_TEXT_ID}" style="margin-top:10px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.92);">準備下載...</div>
            `;
        }

        function updateCenterDownloadProgress(event) {
            const textNode = document.getElementById(CENTER_DOWNLOAD_TEXT_ID);
            if (!textNode) return;
            const loaded = event && typeof event.loaded === 'number' ? event.loaded : 0;
            textNode.innerText = loaded > 0 ? `已下載 ${formatBytes(loaded)}` : '正在取得題庫...';
        }

        function loadDatabase(statusEl) {
            return new Promise((resolve) => {
                if (window.__BOT_DB) { resolve(window.__BOT_DB); return; }
                if (window.__BOT_LOADING) {
                    const check = setInterval(() => {
                        if (window.__BOT_DB) { clearInterval(check); resolve(window.__BOT_DB); }
                    }, 200);
                    return;
                }
                window.__BOT_LOADING = true;
                if (statusEl) statusEl.innerHTML = `
                    <div style="color:blue;margin-bottom:5px;">☁️ 下載題庫中...</div>
                    <div id="bot-dl-text" style="font-size:12px;color:#666;">0 MB</div>
                `;
                GM_xmlhttpRequest({
                    method: "GET", url: _k2, responseType: "json",
                    onprogress: (e) => {
                        const pTxt = document.getElementById('bot-dl-text');
                        if (pTxt && e && typeof e.loaded === 'number') {
                            pTxt.innerText = `已下載 ${formatBytes(e.loaded)}...`;
                        }
                        updateCenterDownloadProgress(e);
                    },
                    onload: (response) => {
                        try {
                            let json = response.response;
                            if (typeof json === 'string') json = JSON.parse(json);
                            window.__BOT_DB = json;
                            if (statusEl) statusEl.innerHTML = `<div style="color:green">✅ 題庫下載完成 (共 ${json.length} 題)</div>`;
                            setTimeout(() => resolve(json), 100);
                        } catch (err) {
                            if (statusEl) statusEl.innerHTML = `<div style="color:red">❌ 解析失敗: ${err.message}</div>`;
                            resolve(null);
                        } finally { window.__BOT_LOADING = false; }
                    },
                    onerror: () => {
                        if (statusEl) statusEl.innerHTML = `<div style="color:red">❌ 下載失敗</div>`;
                        window.__BOT_LOADING = false; resolve(null);
                    }
                });
            });
        }

        function createOverlay(id, html) {
            if (document.getElementById(id)) return null;
            const div = document.createElement('div');
            div.id = id; div.innerHTML = html;
            document.body.appendChild(div);
            return div;
        }

        function buildDbIndex(db) {
            const exactMap = new Map();
            const entries = [];

            db.forEach((item) => {
                const variants = getQuestionVariants(item.question);
                if (variants.length === 0) return;

                const entry = { item, variants };
                entries.push(entry);

                variants.forEach((variant) => {
                    if (!exactMap.has(variant)) {
                        exactMap.set(variant, entry);
                    }
                });
            });

            return { exactMap, entries };
        }

        function findBestDbMatch(questionText, dbIndex) {
            const variants = getQuestionVariants(questionText);
            if (!variants.length) return null;

            for (const variant of variants) {
                const exactEntry = dbIndex.exactMap.get(variant);
                if (exactEntry) {
                    return { item: exactEntry.item, score: 1, mode: 'exact' };
                }
            }

            let bestEntry = null;
            let bestScore = 0;

            for (const entry of dbIndex.entries) {
                let entryScore = 0;
                for (const sourceVariant of variants) {
                    for (const targetVariant of entry.variants) {
                        const pairScore = scoreQuestionVariantMatch(sourceVariant, targetVariant);
                        if (pairScore > entryScore) {
                            entryScore = pairScore;
                        }
                        if (entryScore >= 0.995) break;
                    }
                    if (entryScore >= 0.995) break;
                }

                if (entryScore > bestScore) {
                    bestScore = entryScore;
                    bestEntry = entry;
                }
            }

            if (!bestEntry || bestScore < 0.9) {
                return null;
            }

            return { item: bestEntry.item, score: bestScore, mode: 'fuzzy' };
        }

        function getStoredDialogBypassUntil() {
            try {
                return Number(sessionStorage.getItem(DIALOG_BYPASS_STORAGE_KEY) || '0');
            } catch (error) {
                console.log('[BOT] Failed to read dialog bypass storage:', error);
                return 0;
            }
        }

        function setStoredDialogBypassUntil(until) {
            try {
                sessionStorage.setItem(DIALOG_BYPASS_STORAGE_KEY, String(until));
            } catch (error) {
                console.log('[BOT] Failed to persist dialog bypass storage:', error);
            }
        }

        function isDialogBypassActive() {
            const localUntil = Number(window[DIALOG_BYPASS_KEY] || 0);
            const pageUntil = Number(PAGE_WINDOW && PAGE_WINDOW[DIALOG_BYPASS_KEY] || 0);
            const storedUntil = getStoredDialogBypassUntil();
            return Date.now() < Math.max(localUntil, pageUntil, storedUntil);
        }

        function injectPageDialogBypassBridge() {
            if (window.__BOT_DIALOG_BRIDGE_INJECTED__) return;

            const root = document.documentElement || document.head || document.body;
            if (!root || document.getElementById(PAGE_DIALOG_BRIDGE_ID)) return;
            window.__BOT_DIALOG_BRIDGE_INJECTED__ = true;

            const script = document.createElement('script');
            script.id = PAGE_DIALOG_BRIDGE_ID;
            script.textContent = `
                (function () {
                    try {
                        if (window.__BOT_PAGE_DIALOG_BRIDGE__) return;
                        window.__BOT_PAGE_DIALOG_BRIDGE__ = true;

                        const STORAGE_KEY = ${JSON.stringify(DIALOG_BYPASS_STORAGE_KEY)};
                        const PROP_KEY = ${JSON.stringify(DIALOG_BYPASS_KEY)};

                        function getUntil() {
                            let stored = 0;
                            let prop = 0;
                            try { stored = Number(sessionStorage.getItem(STORAGE_KEY) || '0'); } catch (error) {}
                            try { prop = Number(window[PROP_KEY] || 0); } catch (error) {}
                            return Math.max(stored, prop);
                        }

                        function isActive() {
                            return Date.now() < getUntil();
                        }

                        function patch(name, factory) {
                            const originalKey = '__BOT_PAGE_ORIGINAL_' + name + '__';
                            if (typeof window[name] !== 'function' || window[originalKey]) return;
                            const original = window[name];
                            window[originalKey] = original;
                            window[name] = factory(original);
                        }

                        patch('alert', function (original) {
                            return function (message) {
                                if (isActive()) {
                                    console.log('[BOT/Page] Auto-dismissed alert:', message);
                                    return;
                                }
                                return original.call(this, message);
                            };
                        });

                        patch('confirm', function (original) {
                            return function (message) {
                                if (isActive()) {
                                    console.log('[BOT/Page] Auto-confirmed:', message);
                                    return true;
                                }
                                return original.call(this, message);
                            };
                        });

                        patch('prompt', function (original) {
                            return function (message, defaultValue) {
                                if (isActive()) {
                                    console.log('[BOT/Page] Auto-dismissed prompt:', message);
                                    return defaultValue || '';
                                }
                                return original.call(this, message, defaultValue);
                            };
                        });
                    } catch (error) {
                        console.log('[BOT/Page] Bridge failed:', error);
                    }
                })();
            `;

            root.appendChild(script);
            script.remove();
        }

        function getActionText(element) {
            return ((element.innerText || element.textContent || element.value || element.getAttribute('aria-label') || element.title || '') + '')
                .replace(/\s+/g, '')
                .trim();
        }

        function isVisibleElement(element) {
            if (!element || !element.isConnected) return false;
            const style = window.getComputedStyle(element);
            if (!style || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
                return false;
            }
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        }

        function autoHandleBlockingDialog() {
            if (!document.body || !isDialogBypassActive()) return false;

            const modalSelector = [
                '[role="dialog"]',
                '.ui-dialog',
                '.modal',
                '.modal-dialog',
                '.dialog',
                '.swal-modal',
                '.swal2-popup',
                '.sweet-alert',
                '.jconfirm',
                '.jconfirm-box',
                '.layui-layer',
                '.bootbox',
                '.el-message-box',
                '.ant-modal',
                '.ant-modal-root',
                '.x-window',
                '.window',
                '.messager-window'
            ].join(', ');

            const actionSelector = [
                'button',
                'input[type="button"]',
                'input[type="submit"]',
                'a[role="button"]',
                '[role="button"]',
                '.ui-button',
                '.swal-button',
                '.swal2-confirm',
                '.swal2-close',
                '.layui-layer-btn a',
                '.bootbox-accept'
            ].join(', ');

            const dialogRoots = Array.from(document.querySelectorAll(modalSelector)).filter(isVisibleElement);
            const prioritizedButtons = [];

            dialogRoots.forEach((root) => {
                const buttons = Array.from(root.querySelectorAll(actionSelector)).filter((element) => {
                    if (!isVisibleElement(element)) return false;
                    if (element.disabled) return false;
                    return Boolean(getActionText(element));
                });

                if (buttons.length === 0) return;

                const rootText = ((root.innerText || root.textContent || '') + '').replace(/\s+/g, '');
                const primary = buttons.find((element) => /^(確定|確認|關閉|完成|好|ok|yes)$/i.test(getActionText(element)));
                if (primary) {
                    prioritizedButtons.push(primary);
                    return;
                }

                if (buttons.length === 1 && /(更新完畢|完成|成功|提示|訊息|message|notice|已送出)/i.test(rootText)) {
                    prioritizedButtons.push(buttons[0]);
                }
            });

            if (prioritizedButtons.length === 0) {
                const looseButtons = Array.from(document.querySelectorAll(actionSelector)).filter((element) => {
                    if (!isVisibleElement(element)) return false;
                    if (element.disabled) return false;
                    return /^(確定|確認|關閉|完成|好|ok|yes)$/i.test(getActionText(element));
                });

                if (looseButtons.length > 0) {
                    prioritizedButtons.push(looseButtons[0]);
                }
            }

            const target = prioritizedButtons[0];
            if (!target) return false;

            logBot(`🤖 自動點擊彈窗按鈕: ${getActionText(target)}`);
            target.click();
            return true;
        }

        function patchDialogMethod(target, methodName, handlerFactory) {
            const originalKey = `__BOT_ORIGINAL_${methodName}__`;
            if (!target || typeof target[methodName] !== 'function') return;
            if (target[originalKey]) return;

            const original = target[methodName];
            target[originalKey] = original;
            target[methodName] = handlerFactory(original, target);
        }

        function armDialogBypassOnTarget(target, until) {
            try {
                if (!target) return;

                target[DIALOG_BYPASS_KEY] = Math.max(target[DIALOG_BYPASS_KEY] || 0, until);

                patchDialogMethod(target, 'confirm', (original, owner) => function (message) {
                    if (Date.now() < (owner[DIALOG_BYPASS_KEY] || 0)) {
                        console.log('[BOT] Auto-confirmed:', message);
                        return true;
                    }
                    return original.call(this, message);
                });

                patchDialogMethod(target, 'alert', (original, owner) => function (message) {
                    if (Date.now() < (owner[DIALOG_BYPASS_KEY] || 0)) {
                        console.log('[BOT] Auto-dismissed alert:', message);
                        return;
                    }
                    return original.call(this, message);
                });

                patchDialogMethod(target, 'prompt', (original, owner) => function (message, defaultValue) {
                    if (Date.now() < (owner[DIALOG_BYPASS_KEY] || 0)) {
                        console.log('[BOT] Auto-dismissed prompt:', message);
                        return defaultValue || '';
                    }
                    return original.call(this, message, defaultValue);
                });
            } catch (error) {
                console.log('[BOT] Failed to patch dialog target:', error);
            }
        }

        function installDialogBypass(durationMs) {
            const until = Date.now() + durationMs;
            setStoredDialogBypassUntil(until);
            injectPageDialogBypassBridge();

            const targets = [window, PAGE_WINDOW];
            try {
                if (PAGE_WINDOW.parent && PAGE_WINDOW.parent !== PAGE_WINDOW) {
                    targets.push(PAGE_WINDOW.parent);
                }
            } catch (error) {
                console.log('[BOT] parent patch skipped:', error);
            }

            try {
                if (PAGE_WINDOW.top && PAGE_WINDOW.top !== PAGE_WINDOW) {
                    targets.push(PAGE_WINDOW.top);
                }
            } catch (error) {
                console.log('[BOT] top patch skipped:', error);
            }

            targets.forEach((target) => armDialogBypassOnTarget(target, until));
        }

        function setPendingAutoCloseMarker(kind) {
            try {
                sessionStorage.setItem(AUTO_CLOSE_MARKER_KEY, JSON.stringify({
                    at: Date.now(),
                    href: document.URL,
                    kind: kind || 'exam'
                }));
            } catch (error) {
                console.log('[BOT] Failed to set close marker:', error);
            }
        }

        function getPendingAutoCloseMarker() {
            try {
                const raw = sessionStorage.getItem(AUTO_CLOSE_MARKER_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch (error) {
                console.log('[BOT] Failed to parse close marker:', error);
                return null;
            }
        }

        function clearPendingAutoCloseMarker() {
            try {
                sessionStorage.removeItem(AUTO_CLOSE_MARKER_KEY);
            } catch (error) {
                console.log('[BOT] Failed to clear close marker:', error);
            }
        }

        function isLikelyPostSubmitResultPage() {
            const url = document.URL.toLowerCase();
            if (url.includes('exam_start.php')) return false;
            if (url.includes('questionnaire')) return false;
            if (/(view_result|exam_result|result|score)/.test(url)) return true;

            const bodyText = ((document.body && document.body.innerText) || '').replace(/\s+/g, '');
            return /(測驗結果|測驗成績|成績結果|成績|分數|總分|及格|不及格|答對|答錯)/.test(bodyText);
        }

        function shouldAutoCloseCurrentPage() {
            const marker = getPendingAutoCloseMarker();
            if (!marker || !marker.at) return false;

            const age = Date.now() - marker.at;
            if (age < 0 || age > AUTO_CLOSE_MARKER_TTL_MS) {
                clearPendingAutoCloseMarker();
                return false;
            }

            if (marker.kind === 'questionnaire') {
                return age >= QUESTIONNAIRE_CLOSE_GRACE_MS;
            }

            return isLikelyPostSubmitResultPage();
        }

        function getQuestionnaireState() {
            return window[QUESTIONNAIRE_STATE_KEY] || 'idle';
        }

        function setQuestionnaireState(state) {
            window[QUESTIONNAIRE_STATE_KEY] = state;
        }

        async function closeCurrentPageBestEffort() {
            if (window[AUTO_CLOSE_ATTEMPTED_KEY]) return;
            window[AUTO_CLOSE_ATTEMPTED_KEY] = true;

            const marker = getPendingAutoCloseMarker();
            const closeKind = marker && marker.kind ? marker.kind : 'exam';
            clearPendingAutoCloseMarker();
            setQuestionnaireState('idle');

            logBot(`🪟 偵測到送出後頁面，${AUTO_CLOSE_DELAY_MS}ms 後嘗試自動關閉`);

            if (closeKind === 'questionnaire') {
                await flashCenterNotice('問卷填寫完成，視窗即將關閉', { type: 'success', duration: 1100 });
            }

            const closeDelay = closeKind === 'questionnaire' ? 80 : AUTO_CLOSE_DELAY_MS;

            setTimeout(() => {
                const targets = [PAGE_WINDOW, window];

                targets.forEach((target) => {
                    try {
                        if (target && typeof target.open === 'function') {
                            target.open('', '_self');
                        }
                    } catch (error) {
                        console.log('[BOT] open("", "_self") skipped:', error);
                    }
                });

                targets.forEach((target) => {
                    try {
                        if (target && typeof target.close === 'function') {
                            target.close();
                        }
                    } catch (error) {
                        console.log('[BOT] close() skipped:', error);
                    }
                });

                setTimeout(() => {
                    if (!document.hidden) {
                        const fallbackMessage = closeKind === 'questionnaire'
                            ? '問卷已送出，請手動關閉此視窗'
                            : '考卷已送出，請手動關閉此視窗';
                        showCenterNotice(fallbackMessage, { type: 'warn' });
                    }
                }, 1200);
            }, closeDelay);
        }

        function bootstrapPendingDialogBypass() {
            injectPageDialogBypassBridge();

            const marker = getPendingAutoCloseMarker();
            if (!marker) return;

            if (marker.kind === 'questionnaire') {
                installDialogBypass(QUESTIONNAIRE_DIALOG_BYPASS_MS);
                return;
            }

            installDialogBypass(DIALOG_BYPASS_MS);
        }

        function findSubmitControl() {
            const selectorCandidates = [
                'input[type="submit"]',
                'button[type="submit"]',
                'input[value="送出"]',
                'input[value*="送出"]',
                'input[value*="提交"]',
                'input[value*="交卷"]',
                'button[value*="送出"]',
                'button[value*="提交"]',
                'button[value*="交卷"]'
            ];

            for (const selector of selectorCandidates) {
                const found = document.querySelector(selector);
                if (found) return found;
            }

            const controls = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'));
            return controls.find((element) => /(送出|提交|完成|交卷|submit)/i.test(((element.innerText || element.textContent || element.value || '') + '').trim())) || null;
        }

        function appendSubmitControlValue(formData, submitControl) {
            if (!submitControl) return;
            const name = submitControl.getAttribute('name');
            if (!name) return;
            const value = (submitControl.value || submitControl.innerText || submitControl.textContent || '送出').trim();
            formData.append(name, value);
        }

        async function submitQuestionnaireByFetch(form, submitControl) {
            if (!window.fetch || !form) return false;

            const action = new URL(form.getAttribute('action') || form.action || window.location.href, window.location.href);
            const method = ((form.getAttribute('method') || form.method || 'POST') + '').toUpperCase();
            const formData = new FormData(form);
            appendSubmitControlValue(formData, submitControl);

            if (method === 'GET') {
                for (const [key, value] of formData.entries()) {
                    action.searchParams.append(key, value);
                }

                const response = await fetch(action.toString(), {
                    method: 'GET',
                    credentials: 'include',
                    redirect: 'follow'
                });
                await response.text();
                return response.ok;
            }

            const body = new URLSearchParams();
            for (const [key, value] of formData.entries()) {
                body.append(key, value);
            }

            const response = await fetch(action.toString(), {
                method: method,
                credentials: 'include',
                redirect: 'follow',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                body: body.toString()
            });
            await response.text();
            return response.ok;
        }

        function submitQuestionnaireByIframe(form, submitControl) {
            return new Promise((resolve) => {
                if (!form) {
                    resolve(false);
                    return;
                }

                const frameName = `bot-questionnaire-submit-frame-${Date.now()}`;
                const frame = document.createElement('iframe');
                frame.name = frameName;
                frame.id = frameName;
                frame.setAttribute('sandbox', 'allow-forms');
                frame.style.display = 'none';

                const originalTarget = form.getAttribute('target');
                const hiddenInputs = [];
                let armed = false;
                let done = false;

                const cleanup = (success) => {
                    if (done) return;
                    done = true;
                    frame.remove();
                    hiddenInputs.forEach((input) => input.remove());
                    if (originalTarget !== null) {
                        form.setAttribute('target', originalTarget);
                    } else {
                        form.removeAttribute('target');
                    }
                    resolve(success);
                };

                if (submitControl) {
                    const name = submitControl.getAttribute('name');
                    if (name) {
                        const hidden = document.createElement('input');
                        hidden.type = 'hidden';
                        hidden.name = name;
                        hidden.value = (submitControl.value || submitControl.innerText || submitControl.textContent || '送出').trim();
                        form.appendChild(hidden);
                        hiddenInputs.push(hidden);
                    }
                }

                frame.onload = () => {
                    if (!armed) return;
                    cleanup(true);
                };

                document.body.appendChild(frame);
                form.setAttribute('target', frameName);

                setTimeout(() => {
                    armed = true;
                    try {
                        form.submit();
                    } catch (error) {
                        cleanup(false);
                    }
                }, 60);

                setTimeout(() => cleanup(true), 8000);
            });
        }

        async function submitQuestionnaireSilently() {
            if (window.__BOT_QUESTIONNAIRE_SUBMITTING__) {
                return true;
            }

            const submitControl = findSubmitControl();
            const form = (submitControl && submitControl.form) || document.querySelector('form');
            if (!form) {
                return false;
            }

            window.__BOT_QUESTIONNAIRE_SUBMITTING__ = true;

            try {
                try {
                    const ok = await submitQuestionnaireByFetch(form, submitControl);
                    if (ok) return true;
                } catch (error) {
                    console.log('[BOT] fetch questionnaire submit failed:', error);
                }

                return await submitQuestionnaireByIframe(form, submitControl);
            } finally {
                if (!document.hidden) {
                    window.__BOT_QUESTIONNAIRE_SUBMITTING__ = false;
                }
            }
        }

        function groupInputsByName(nodeList) {
            const groups = {};
            nodeList.forEach((input) => {
                const key = input.name || `__noname_${Object.keys(groups).length}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(input);
            });
            return groups;
        }

        function isQuestionnairePage() {
            return document.URL.includes('questionnaire');
        }

        function isExamPage() {
            return document.URL.includes('exam_start.php') && !document.URL.includes('questionnaire');
        }

        function initExamToolbar() {
            if (!isExamPage()) return;
            if (document.getElementById('bot-exam-toolbar')) return;

            const toolbar = document.createElement('div');
            toolbar.id = 'bot-exam-toolbar';
            Object.assign(toolbar.style, {
                position: 'fixed',
                top: '50%',
                left: '0',
                transform: 'translateY(-50%)',
                zIndex: '9999999',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                background: 'rgba(0,0,0,0.85)',
                borderRadius: '0 12px 12px 0',
                boxShadow: '2px 0 15px rgba(0,0,0,0.3)'
            });

            const btnSolve = document.createElement('button');
            btnSolve.id = 'bot-btn-solve';
            btnSolve.innerHTML = '⚡<br><span style="font-size:11px;">一鍵</span><br><span style="font-size:11px;">作答</span>';
            Object.assign(btnSolve.style, {
                width: '60px',
                height: '70px',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #6610f2 0%, #6f42c1 100%)',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '18px',
                transition: 'transform 0.2s',
                lineHeight: '1.2'
            });
            btnSolve.onmouseover = () => btnSolve.style.transform = 'scale(1.08)';
            btnSolve.onmouseout = () => btnSolve.style.transform = 'scale(1)';
            btnSolve.onclick = oneClickSolve;

            const btnSearch = document.createElement('button');
            btnSearch.id = 'bot-btn-manual';
            btnSearch.innerHTML = '🔍<br><span style="font-size:11px;">手動</span><br><span style="font-size:11px;">搜尋</span>';
            Object.assign(btnSearch.style, {
                width: '60px',
                height: '70px',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #24292e 0%, #444d56 100%)',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '18px',
                transition: 'transform 0.2s',
                lineHeight: '1.2'
            });
            btnSearch.onmouseover = () => btnSearch.style.transform = 'scale(1.08)';
            btnSearch.onmouseout = () => btnSearch.style.transform = 'scale(1)';
            btnSearch.onclick = () => {
                const panel = document.getElementById('bot-exam-panel');
                if (panel) {
                    const isVisible = panel.style.display !== 'none';
                    panel.style.display = isVisible ? 'none' : 'block';
                    document.body.style.marginLeft = isVisible ? '0' : '510px';
                    btnSearch.style.background = isVisible
                        ? 'linear-gradient(135deg, #24292e 0%, #444d56 100%)'
                        : 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)';
                } else {
                    setupSearchPanel();
                    btnSearch.style.background = 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)';
                }
            };

            toolbar.appendChild(btnSolve);
            toolbar.appendChild(btnSearch);
            document.body.appendChild(toolbar);
        }

        function cloneWithoutFormControls(node) {
            const clone = node.cloneNode(true);
            clone.querySelectorAll('script, style, input, select, textarea, button').forEach((element) => element.remove());
            return clone;
        }

        function extractTextBeforeFirstInput(node) {
            if (!node || !node.childNodes) return '';

            const parts = [];
            for (const child of Array.from(node.childNodes)) {
                if (child.nodeType === 1) {
                    const element = child;
                    if (element.matches && element.matches('input[type="radio"], input[type="checkbox"]')) {
                        break;
                    }
                    if (element.querySelector && element.querySelector('input[type="radio"], input[type="checkbox"]')) {
                        const nested = extractTextBeforeFirstInput(element);
                        if (nested) parts.push(nested);
                        break;
                    }
                    if (/^(BR|HR)$/i.test(element.tagName)) {
                        if (parts.length > 0) break;
                        continue;
                    }
                    const elementText = cleanInlineText(element.innerText || element.textContent || '');
                    if (elementText) parts.push(elementText);
                    continue;
                }
                if (child.nodeType === 3) {
                    const text = cleanInlineText(child.textContent || '');
                    if (text) parts.push(text);
                }
            }

            return stripQuestionPrefix(cleanInlineText(parts.join(' ')));
        }

        function getBinaryLabelFromNode(node) {
            if (!node) return '';
            const image = node.querySelector('img');
            if (!image || !image.src) return '';
            if (image.src.includes('right.gif')) return '○';
            if (image.src.includes('wrong.gif')) return '╳';
            return '';
        }

        function extractQuestionTextFromContainer(container) {
            if (!container) return '';

            const clone = cloneWithoutFormControls(container);
            clone.querySelectorAll('ol, ul').forEach((element) => element.remove());

            const text = stripQuestionPrefix(cleanInlineText(clone.innerText || clone.textContent || ''));
            return text;
        }

        function extractOptionLabelFromInput(input) {
            if (!input) return '';

            if (input.id) {
                const selector = typeof CSS !== 'undefined' && CSS.escape
                    ? `label[for="${CSS.escape(input.id)}"]`
                    : `label[for="${String(input.id).replace(/"/g, '\\"')}"]`;
                const labelByFor = document.querySelector(selector);
                if (labelByFor) {
                    const clone = cloneWithoutFormControls(labelByFor);
                    const labelText = stripOptionPrefix(cleanInlineText(clone.innerText || clone.textContent || ''));
                    if (labelText) return labelText;
                }
            }

            const inlineParts = [];
            let sibling = input.nextSibling;
            while (sibling) {
                if (sibling.nodeType === 1) {
                    const element = sibling;
                    if (element.matches && element.matches('input[type="radio"], input[type="checkbox"]')) break;
                    if (/^(BR|HR)$/i.test(element.tagName)) break;
                    if (element.querySelector && element.querySelector('input[type="radio"], input[type="checkbox"]')) break;
                    const binaryLabel = getBinaryLabelFromNode(element);
                    if (binaryLabel) {
                        inlineParts.push(binaryLabel);
                        break;
                    }
                    const text = cleanInlineText(element.innerText || element.textContent || '');
                    if (text) inlineParts.push(text);
                } else if (sibling.nodeType === 3) {
                    const text = cleanInlineText(sibling.textContent || '');
                    if (text) inlineParts.push(text);
                }
                sibling = sibling.nextSibling;
            }

            const inlineText = stripOptionPrefix(cleanInlineText(inlineParts.join(' ')));
            if (inlineText) return inlineText;

            const containers = [
                input.closest('label'),
                input.closest('li'),
                input.parentElement,
                input.closest('td'),
                input.closest('div')
            ].filter(Boolean);

            const seen = new Set();
            for (const container of containers) {
                if (seen.has(container)) continue;
                seen.add(container);

                const binaryLabel = getBinaryLabelFromNode(container);
                if (binaryLabel) return binaryLabel;

                const nestedInputCount = container.querySelectorAll('input[type="radio"], input[type="checkbox"]').length;
                const safeSingleOptionContainer = /^(LABEL|LI)$/i.test(container.tagName || '');
                if (nestedInputCount > 1 && !safeSingleOptionContainer) {
                    continue;
                }

                const clone = cloneWithoutFormControls(container);
                let text = cleanInlineText(clone.innerText || clone.textContent || '');
                text = stripOptionPrefix(text);
                if (text && text.length <= 120) {
                    return text;
                }
            }

            const valueText = cleanInlineText(input.value || input.getAttribute('value') || '');
            if (valueText) return valueText;

            return '';
        }

        // ---- page question parser ----
        function getPageQuestions() {
            const questions = [];
            const panel = document.getElementById('presentPanel') || document;

            let examTable = null;
            for (const table of panel.querySelectorAll('table')) {
                if (table.querySelector('input[type="radio"], input[type="checkbox"]')) {
                    examTable = table;
                    break;
                }
            }
            if (!examTable) return questions;

            function appendUniqueOptions(targetQuestion, optionList) {
                if (!targetQuestion || !Array.isArray(optionList)) return;
                optionList.forEach((option) => {
                    if (!option || !option.input) return;
                    const exists = targetQuestion.options.some((existing) => existing.input === option.input);
                    if (!exists) {
                        targetQuestion.options.push(option);
                    }
                });
            }

            function sharesInputGroup(targetQuestion, optionList) {
                if (!targetQuestion || !Array.isArray(optionList) || optionList.length === 0) return false;
                const currentNames = new Set(targetQuestion.options.map((option) => option.input && option.input.name).filter(Boolean));
                const nextNames = new Set(optionList.map((option) => option.input && option.input.name).filter(Boolean));
                if (currentNames.size === 0 || nextNames.size === 0) return true;
                return Array.from(nextNames).some((name) => currentNames.has(name));
            }

            let currentQuestion = null;
            let pendingQuestionText = '';
            for (const row of examTable.querySelectorAll('tr')) {
                const inputs = Array.from(row.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
                if (inputs.length === 0) {
                    const rowCells = Array.from(row.children).filter((element) => /^(TD|TH)$/i.test(element.tagName));
                    const standaloneCandidates = rowCells
                        .map((cell) => extractQuestionTextFromContainer(cell))
                        .filter((text) => text.length >= 3);
                    if (standaloneCandidates.length > 0) {
                        standaloneCandidates.sort((a, b) => b.length - a.length);
                        pendingQuestionText = standaloneCandidates[0];
                    } else {
                        const rowText = stripQuestionPrefix(cleanInlineText(row.innerText || row.textContent || ''));
                        if (rowText.length >= 6) {
                            pendingQuestionText = rowText;
                        }
                    }
                    continue;
                }

                const cells = Array.from(row.children).filter((element) => /^(TD|TH)$/i.test(element.tagName));
                const optionCell = cells.find((cell) => cell.querySelector('input[type="radio"], input[type="checkbox"]')) || row;

                let qText = '';
                const optionCellIndex = cells.indexOf(optionCell);
                if (optionCellIndex > 0) {
                    for (let index = optionCellIndex - 1; index >= 0; index -= 1) {
                        const candidateText = extractQuestionTextFromContainer(cells[index]);
                        if (candidateText.length >= 3) {
                            qText = candidateText;
                            break;
                        }
                    }
                }

                if (qText.length < 3) {
                    qText = extractTextBeforeFirstInput(optionCell);
                }
                if (qText.length < 3) {
                    qText = extractTextBeforeFirstInput(row);
                }
                if (qText.length < 3 && pendingQuestionText) {
                    qText = pendingQuestionText;
                }

                const options = [];
                const listItems = optionCell.querySelectorAll('ol > li, ul > li');
                if (listItems.length > 0) {
                    for (const li of listItems) {
                        const input = li.querySelector('input[type="radio"], input[type="checkbox"]');
                        if (!input) continue;
                        options.push({ input, label: extractOptionLabelFromInput(input) });
                    }
                } else {
                    inputs.forEach((input) => {
                        options.push({ input, label: extractOptionLabelFromInput(input) });
                    });
                }

                const usableOptions = options.filter((option) => option.input);
                if (qText.length < 3) {
                    if (currentQuestion && sharesInputGroup(currentQuestion, usableOptions)) {
                        appendUniqueOptions(currentQuestion, usableOptions);
                    }
                    continue;
                }

                pendingQuestionText = '';
                currentQuestion = { text: qText, element: row, options: [] };
                appendUniqueOptions(currentQuestion, usableOptions);
                if (currentQuestion.options.length > 0) {
                    questions.push(currentQuestion);
                }
            }

            return questions;
        }

        function isTFMatch(a, b) {
            const aN = normalize(a), bN = normalize(b);
            if (aN === bN) return true;
            if (TRUE_VALS.includes(aN) && TRUE_VALS.includes(bN)) return true;
            if (FALSE_VALS.includes(aN) && FALSE_VALS.includes(bN)) return true;
            return false;
        }

        function isTextMatch(a, b) {
            const aN = normalize(a), bN = normalize(b);
            if (!aN || !bN) return false;
            if (aN === bN) return true;
            if (aN.length > 2 && bN.length > 2 && (aN.includes(bN) || bN.includes(aN))) return true;
            return false;
        }

        function submitExam() {
            try {
                installDialogBypass(DIALOG_BYPASS_MS);
                logBot(`🤖 已啟用 ${DIALOG_BYPASS_MS}ms 考卷對話框自動處理`);

                const submitControl = findSubmitControl();
                if (submitControl) {
                    const label = (submitControl.innerText || submitControl.textContent || submitControl.value || submitControl.tagName).trim();
                    setPendingAutoCloseMarker('exam');
                    logBot(`📝 自動送出考卷: ${label}`);
                    submitControl.click();
                    return true;
                }

                const form = document.querySelector('form');
                if (form) {
                    setPendingAutoCloseMarker('exam');
                    logBot('📝 找不到考卷送出按鈕，改用 form.submit() 送出');
                    form.submit();
                    return true;
                }

                logBot('⚠️ 找不到考卷送出按鈕或表單，請手動檢查');
                return false;
            } catch (error) {
                logBot(`❌ 自動送出考卷失敗: ${error.message}`);
                return false;
            }
        }

        async function submitQuestionnaire() {
            try {
                installDialogBypass(QUESTIONNAIRE_DIALOG_BYPASS_MS);
                setPendingAutoCloseMarker('questionnaire');
                logBot(`🤖 已啟用 ${QUESTIONNAIRE_DIALOG_BYPASS_MS}ms 問卷對話框自動處理`);

                logBot('📝 以背景模式送出問卷...');
                const submitted = await submitQuestionnaireSilently();
                if (!submitted) {
                    logBot('⚠️ 找不到問卷送出按鈕或表單，無法自動送出');
                    setQuestionnaireState('idle');
                    clearPendingAutoCloseMarker();
                    return;
                }

                setQuestionnaireState('submitted');
                await closeCurrentPageBestEffort();
            } catch (error) {
                logBot(`❌ 問卷自動送出失敗: ${error.message}`);
                setQuestionnaireState('idle');
                clearPendingAutoCloseMarker();
            }
        }

        function runQuestionnaireAutoFill(source) {
            if (!isQuestionnairePage()) return;
            if (getQuestionnaireState() !== 'idle') return;

            const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
            const checks = Array.from(document.querySelectorAll('input[type="checkbox"]'));
            if (radios.length === 0 && checks.length === 0) {
                logBot('⚠️ 問卷頁沒有可填寫的欄位');
                return;
            }

            const alreadyAnswered = radios.some((radio) => radio.checked);
            if (alreadyAnswered) {
                logBot('ℹ️ 問卷已有作答內容，略過自動填寫');
                setQuestionnaireState('skipped');
                return;
            }

            setQuestionnaireState('filling');
            installDialogBypass(QUESTIONNAIRE_DIALOG_BYPASS_MS);
            logBot(source === 'auto' ? '📝 偵測到問卷頁，自動開始填寫' : '📝 開始自動填寫問卷');

            const radioGroups = groupInputsByName(radios);
            Object.keys(radioGroups).forEach((key) => {
                const group = radioGroups[key];
                const target = group.find((radio) => radio.value === 'C') || group[2] || group[group.length - 1];
                if (target && !target.checked) {
                    target.click();
                }
            });

            const checkGroups = groupInputsByName(checks);
            Object.keys(checkGroups).forEach((key) => {
                checkGroups[key].slice(0, 3).forEach((checkbox) => {
                    if (!checkbox.checked) {
                        checkbox.click();
                    }
                });
            });

            logBot(`⏳ ${QUESTIONNAIRE_SUBMIT_DELAY_MS}ms 後自動送出問卷...`);
            setTimeout(() => {
                submitQuestionnaire();
            }, QUESTIONNAIRE_SUBMIT_DELAY_MS);
        }

        // ---- one-click solver ----
        async function oneClickSolve() {
            const btn = document.getElementById('bot-btn-solve');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '⏳<br><span style="font-size:11px;">處理</span><br><span style="font-size:11px;">中</span>';
            }

            const oldLogArea = document.getElementById('bot-solver-log');
            if (oldLogArea) {
                oldLogArea.remove();
            }

            logBot('🚀 開始作答...');

            try {
                const hadCachedDb = Boolean(window.__BOT_DB);
                if (!hadCachedDb) {
                    showCenterDownloadNotice();
                }
                const db = await loadDatabase(null);
                if (!db) throw new Error('題庫下載失敗');
                if (!hadCachedDb) {
                    await flashCenterNotice('題庫下載完成', { type: 'success', duration: 1000 });
                }
                logBot(`✅ 載入 ${db.length} 題`);

                const dbIndex = buildDbIndex(db);
                logBot(`📚 索引 ${dbIndex.entries.length} 條`);

                const pageQs = getPageQuestions();
                logBot(`📄 偵測到 ${pageQs.length} 題`);

                if (pageQs.length === 0) {
                    logBot('⚠️ 未偵測到題目，停止送出');
                    alert('未偵測到任何題目，請確認考試頁面已完全載入。');
                    return;
                }

                let filled = 0;

                for (let i = 0; i < pageQs.length; i++) {
                    const qObj = pageQs[i];
                    const match = findBestDbMatch(qObj.text, dbIndex);
                    const dbItem = match ? match.item : null;

                    if (!dbItem) {
                        qObj.element.style.background = '#f8d7da';
                        logBot(`❌ Q${i + 1}: 題庫無此題 - ${qObj.text.substring(0, 20)}...`);
                        continue;
                    }

                    if (match && match.mode !== 'exact') {
                        logBot(`ℹ️ Q${i + 1}: 使用強化比對命中題庫 (${Math.round(match.score * 100)}%)`);
                    }

                    const correctOpts = (dbItem.options || []).filter(o => o.correct).map(o => o.text);
                    const expectedCorrectKeys = new Set(correctOpts.map((text) => normalize(text)).filter(Boolean));
                    const matchedCorrectKeys = new Set();
                    let hit = false;

                    for (const pageOpt of qObj.options) {
                        let shouldSelect = false;
                        for (const ct of correctOpts) {
                            if (isTFMatch(pageOpt.label, ct) || isTextMatch(pageOpt.label, ct) || isTFMatch(pageOpt.input.value, ct)) {
                                shouldSelect = true;
                                matchedCorrectKeys.add(normalize(ct));
                                break;
                            }
                        }
                        if (shouldSelect) {
                            if (!pageOpt.input.checked) pageOpt.input.click();
                            hit = true;
                        }
                    }

                    const fullyMatched = hit && expectedCorrectKeys.size > 0 && matchedCorrectKeys.size === expectedCorrectKeys.size;

                    if (fullyMatched) {
                        filled++;
                        qObj.element.style.background = '#d1e7dd';
                    } else {
                        qObj.element.style.background = '#fff3cd';
                        if (expectedCorrectKeys.size === 0) {
                            logBot(`⚠️ Q${i + 1}: 題庫有題目但沒有可用答案資料`);
                        } else {
                            logBot(`⚠️ Q${i + 1}: 選項不符 DB:[${correctOpts.join('|')}] Page:[${qObj.options.map(o => o.label).join('|')}]`);
                        }
                    }
                }

                logBot(`🎉 完成！完整填寫 ${filled}/${pageQs.length}`);

                if (filled !== pageQs.length) {
                    logBot(`⚠️ 尚有 ${pageQs.length - filled} 題未完整匹配，已取消自動送出`);
                    await flashCenterNotice(`尚有 ${pageQs.length - filled} 題未匹配，已取消自動送出`, { type: 'warn', duration: 1500 });
                    return;
                }

                await flashCenterNotice('作答完成，即將送出考卷', { type: 'success', duration: 1200 });
                await flashCenterNotice('視窗即將自動關閉', { type: 'success', duration: 1000 });
                if (AUTO_SUBMIT_DELAY_MS > 0) {
                    await sleep(AUTO_SUBMIT_DELAY_MS);
                }
                submitExam();
            } catch (e) {
                logBot(`❌ ${e.message}`);
                await hideCenterNotice(true);
                alert('Error: ' + e.message);
            } finally {
                await hideCenterNotice(true);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '⚡<br><span style="font-size:11px;">一鍵</span><br><span style="font-size:11px;">作答</span>';
                }
            }
        }

        // ---- search panel ----
        function setupSearchPanel() {
            if (document.getElementById('bot-exam-panel')) return;

            document.body.style.marginLeft = '510px';
            const panel = document.createElement('div');
            panel.id = 'bot-exam-panel';
            Object.assign(panel.style, {
                position: 'fixed', top: '0', left: '80px', width: '430px', height: '100%',
                background: '#f8f9fa', borderRight: '1px solid #ddd', padding: '15px',
                boxSizing: 'border-box', overflowY: 'auto', zIndex: '999999',
                fontFamily: 'sans-serif', textAlign: 'left'
            });
            panel.innerHTML = `
                <h3 style="margin:0 0 10px 0;">📖 手動搜尋題庫</h3>
                <div style="margin-bottom:10px;">
                    <input type="text" id="bot-input-q" style="width:100%;padding:10px;font-size:14px;border:1px solid #ccc;border-radius:4px;" placeholder="輸入測驗名稱或題目關鍵字...">
                    <button id="bot-btn-search" style="width:100%;margin-top:5px;padding:8px;background:#24292e;color:#fff;border:none;cursor:pointer;border-radius:4px;">開始搜尋</button>
                </div>
                <div id="bot-res-area" style="font-size:13px;line-height:1.6;"></div>
            `;
            document.body.appendChild(panel);

            let EXAM_INDEX = null;

            function buildIndex(db) {
                const idx = new Map();
                db.forEach(item => {
                    const url = item.source_url || 'UNKNOWN';
                    if (!idx.has(url)) {
                        let title = (item.category && item.category !== '未命名測驗') ? item.category : '未命名測驗';
                        if (title === '未命名測驗' && url !== 'UNKNOWN') {
                            const m = url.match(/post\/(\d+)/);
                            if (m) title += ` (${m[1]})`;
                        }
                        idx.set(url, {
                            title,
                            url,
                            questions: [],
                            fullText: title.toLowerCase(),
                            normalizedTitle: normalize(title),
                            normalizedFullText: normalize(title),
                            questionVariantSet: new Set()
                        });
                    }
                    const entry = idx.get(url);
                    entry.questions.push(item);
                    entry.fullText += ' ' + (item.question || '').toLowerCase();
                    const questionVariants = getQuestionVariants(item.question);
                    if (questionVariants.length > 0) {
                        entry.normalizedFullText += ' ' + questionVariants.join(' ');
                        questionVariants.forEach((variant) => entry.questionVariantSet.add(variant));
                    }
                });
                return idx;
            }

            function renderExamQuestions(examObj) {
                const r = document.getElementById('bot-res-area');
                let html = `
                    <div style="background:#d4edda;padding:10px;margin-bottom:10px;border-radius:5px;">
                        <b>📚 ${examObj.title}</b><br>
                        <small>共 ${examObj.questions.length} 題</small>
                        <button id="bot-back-btn" style="float:right;padding:2px 8px;font-size:11px;cursor:pointer;">↩ 返回列表</button>
                    </div>
                    <div style="margin-bottom:10px;">
                        <input type="text" id="bot-quick-search" placeholder="🔍 在此題庫內搜尋..." style="width:100%;padding:8px;font-size:13px;border:1px solid #ccc;border-radius:4px;">
                    </div>
                    <div id="bot-answer-list">
                `;
                examObj.questions.forEach((item, i) => {
                    let ansHtml = '';
                    if (item.options) {
                        item.options.forEach(opt => {
                            if (opt.correct) ansHtml += `<div style="color:#059669;font-weight:bold;">✓ ${opt.text}</div>`;
                            else ansHtml += `<div style="color:#9ca3af;">　 ${opt.text}</div>`;
                        });
                    } else if (item.answer) {
                        ansHtml = `<div style="color:#059669;font-weight:bold;">✓ ${item.answer}</div>`;
                    }
                    html += `<div class="bot-q-card" style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-bottom:10px;">
                        <div style="font-weight:bold;color:#1f2937;margin-bottom:6px;">Q${i + 1}: ${item.question}</div>
                        <div style="color:#059669;font-weight:bold;">答案：${ansHtml.includes('<br>') ? '<br>• ' + ansHtml : ansHtml}</div>
                    </div>`;
                });
                html += `</div>`;
                r.innerHTML = html;

                // Selection Search Listener
                document.addEventListener('mouseup', () => {
                    const panel = document.getElementById('bot-exam-panel');
                    if (panel && panel.style.display !== 'none') {
                        const sel = window.getSelection().toString().trim();
                        if (sel && sel.length > 1) {
                            const input = document.getElementById('bot-input-q');
                            if (input && input.value !== sel) {
                                input.value = sel;
                                doSearch(sel);
                            }
                        }
                    }
                });

                document.getElementById('bot-back-btn').onclick = () => doSearch(document.getElementById('bot-input-q').value);

                const qInput = document.getElementById('bot-quick-search');
                const qList = document.getElementById('bot-answer-list');
                function doQuickFilter(kw) {
                    kw = kw.toLowerCase().trim();
                    let first = null;
                    qList.querySelectorAll('.bot-q-card').forEach(card => {
                        const txt = card.innerText.toLowerCase();
                        if (!kw || txt.includes(kw)) {
                            card.style.display = 'block';
                            if (kw && !first) first = card;
                            card.style.background = kw ? '#fef3c7' : '#fff';
                        } else card.style.display = 'none';
                    });
                    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                qInput.addEventListener('input', e => doQuickFilter(e.target.value));
                document.onmouseup = (e) => {
                    if (e.target.closest('#bot-exam-panel')) return;
                    const sel = window.getSelection().toString().trim();
                    if (sel && sel.length > 1) { qInput.value = sel; doQuickFilter(sel); }
                };
            }

            async function doSearch(qRaw) {
                const resArea = document.getElementById('bot-res-area');
                if (!window.__BOT_DB) {
                    const db = await loadDatabase(resArea);
                    if (!db) return;
                }
                if (!EXAM_INDEX) {
                    resArea.innerHTML += '<div>⚙️ 建立索引...</div>';
                    await new Promise(r => setTimeout(r, 10));
                    EXAM_INDEX = buildIndex(window.__BOT_DB);
                }
                if (!qRaw) { resArea.innerHTML = ''; return; }

                resArea.innerHTML = '<div style="color:blue">🔍 搜尋中...</div>';
                const queryVariants = getQuestionVariants(qRaw);
                const fallbackNorm = normalize(qRaw);
                const searchTerms = queryVariants.length > 0 ? queryVariants : (fallbackNorm ? [fallbackNorm] : []);
                const results = [];

                EXAM_INDEX.forEach(exam => {
                    let score = 0;
                    let mode = '';

                    searchTerms.forEach((term) => {
                        if (!term) return;
                        if (exam.normalizedTitle.includes(term)) {
                            score = Math.max(score, 1);
                            mode = 'title';
                            return;
                        }
                        if (exam.normalizedFullText.includes(term)) {
                            if (score < 0.95) {
                                score = 0.95;
                                mode = 'question';
                            }
                            return;
                        }
                        const titleScore = scoreQuestionVariantMatch(term, exam.normalizedTitle);
                        if (titleScore >= 0.9 && titleScore > score) {
                            score = titleScore;
                            mode = 'title';
                            return;
                        }
                        if (exam.questionVariantSet && exam.questionVariantSet.size > 0) {
                            for (const variant of exam.questionVariantSet) {
                                const questionScore = scoreQuestionVariantMatch(term, variant);
                                if (questionScore >= 0.9 && questionScore > score) {
                                    score = questionScore;
                                    mode = 'question';
                                }
                                if (score >= 0.99) break;
                            }
                        }
                    });

                    if (score > 0) {
                        results.push({ exam, score, mode });
                    }
                });

                if (results.length === 0) {
                    resArea.innerHTML = `<div style="color:red;padding:10px;background:#fee;">❌ 找不到「${qRaw}」</div>`;
                    return;
                }

                results.sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return a.exam.title.localeCompare(b.exam.title, 'zh-Hant');
                });

                if (results.length === 1) { renderExamQuestions(results[0].exam); return; }

                let html = `<div style="background:#fff3cd;padding:10px;margin-bottom:10px;border-radius:5px;">
                    <b>🔍 找到 ${results.length} 個相關測驗</b><br><small>請點選以查看：</small></div>`;
                results.forEach((result, idx) => {
                    const exam = result.exam;
                    const note = result.mode === 'title'
                        ? '<span style="color:green">● 標題吻合</span>'
                        : result.score >= 0.95
                            ? '<span style="color:#666">○ 題目吻合</span>'
                            : '<span style="color:#92400e">≈ 模糊匹配</span>';
                    html += `<div class="bot-cat-item" data-url="${exam.url}"
                        style="background:#fff;border:1px solid #ddd;border-radius:5px;padding:10px;margin-bottom:6px;cursor:pointer;">
                        <div><b>${idx + 1}. ${exam.title}</b></div>
                        <div style="font-size:11px;color:#666;margin-top:3px;display:flex;justify-content:space-between;">
                            <span>${exam.questions.length} 題</span><span>${note}</span>
                        </div></div>`;
                });
                resArea.innerHTML = html;
                resArea.querySelectorAll('.bot-cat-item').forEach(el => {
                    el.onclick = () => renderExamQuestions(EXAM_INDEX.get(el.dataset.url));
                });
            }

            document.getElementById('bot-btn-search').onclick = () => doSearch(document.getElementById('bot-input-q').value.trim());

            setTimeout(() => {
                let title = '';
                const h = document.querySelector('h1, h2, .title') || document.querySelector('td.title');
                if (h) title = h.innerText.trim().replace(/^測驗：/, '').trim();
                if (title) {
                    document.getElementById('bot-input-q').value = title;
                    document.getElementById('bot-btn-search').click();
                }
            }, 1000);
        }

        // ---- certificate download button on learn record page ----
        function _setupCertificateDownloadButton() {
            if (document.getElementById('bot-cert-toolbar')) return;

            const form = document.getElementById('form_print');
            if (!form) return;

            const toolbar = document.createElement('div');
            toolbar.id = 'bot-cert-toolbar';
            Object.assign(toolbar.style, {
                position: 'fixed',
                top: '50%',
                left: '0',
                transform: 'translateY(-50%)',
                zIndex: '9999999',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                background: 'rgba(0,0,0,0.85)',
                borderRadius: '0 12px 12px 0',
                boxShadow: '2px 0 15px rgba(0,0,0,0.3)'
            });

            const btn = document.createElement('button');
            btn.id = 'bot-btn-cert';
            btn.innerHTML = '下載<br>證書';
            Object.assign(btn.style, {
                width: '60px',
                height: '70px',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #0b8f57 0%, #17a96b 55%, #057a4c 100%)',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '18px',
                transition: 'transform 0.2s',
                lineHeight: '1.2'
            });
            btn.onmouseover = () => btn.style.transform = 'scale(1.08)';
            btn.onmouseout = () => btn.style.transform = 'scale(1)';
            btn.onclick = async () => {
                if (btn.disabled) return;
                btn.disabled = true;
                btn.title = '處理中';
                btn.style.opacity = '0.72';
                btn.style.cursor = 'wait';
                btn.style.transform = 'none';

                try {
                    const certForm = document.getElementById('form_print');
                    if (!certForm) throw new Error('找不到證書表單');

                    const idCheckbox = certForm.querySelector('#pb');
                    if (idCheckbox) idCheckbox.checked = true;

                    const courseBoxes = certForm.querySelectorAll('input[name="arr_course_id[]"]');
                    if (!courseBoxes.length) {
                        throw new Error('目前沒有可勾選的課程');
                    }
                    courseBoxes.forEach((box) => { box.checked = true; });

                    let frame = document.querySelector('iframe[name="bot-cert-download-frame"]');
                    if (!frame) {
                        frame = document.createElement('iframe');
                        frame.name = 'bot-cert-download-frame';
                        frame.style.display = 'none';
                        frame.setAttribute('aria-hidden', 'true');
                        document.body.appendChild(frame);
                    }

                    const actionField = certForm.querySelector('input[name="action"]');
                    const originalActionValue = actionField ? actionField.value : null;
                    const originalTarget = certForm.getAttribute('target');
                    const originalAction = certForm.getAttribute('action');

                    if (actionField) actionField.value = 'print';
                    certForm.setAttribute('action', '/mooc/user/learn_stat.php');
                    certForm.setAttribute('target', frame.name);
                    certForm.submit();

                    if (originalTarget === null) certForm.removeAttribute('target');
                    else certForm.setAttribute('target', originalTarget);

                    if (originalAction === null) certForm.removeAttribute('action');
                    else certForm.setAttribute('action', originalAction);

                    if (actionField && originalActionValue !== null) {
                        actionField.value = originalActionValue;
                    }

                    btn.title = '下載已送出';
                } catch (err) {
                    btn.title = err && err.message ? err.message : '下載失敗';
                } finally {
                    setTimeout(() => {
                        btn.disabled = false;
                        btn.style.opacity = '1';
                        btn.style.cursor = 'pointer';
                        btn.title = '一鍵下載證書';
                    }, 800);
                }
            };

            toolbar.appendChild(btn);
            document.body.appendChild(toolbar);
        }


        // ---- main loop ----
        function mainLoop() {
            injectPageDialogBypassBridge();

            if (!document.body) {
                return;
            }

            const marker = getPendingAutoCloseMarker();

            if (!isQuestionnairePage()) {
                if (!marker && getQuestionnaireState() !== 'idle') {
                    setQuestionnaireState('idle');
                }
                window[QUESTIONNAIRE_AUTO_RUN_KEY] = false;
            }

            if (shouldAutoCloseCurrentPage()) {
                closeCurrentPageBestEffort();
                return;
            }

            autoHandleBlockingDialog();

            if (!window.__BOT_AUTH) return;

            const url = window.location.href;

            // 1. path tree - left toolbar with hang button (OLD STYLE)
            if (url.includes('pathtree.php')) {
                if (!document.getElementById('bot-btn-hang')) {
                    const btn = document.createElement('button');
                    btn.id = 'bot-btn-hang';
                    btn.innerHTML = '開始掛網';
                    Object.assign(btn.style, {
                        position: 'fixed', top: '15px', right: '15px', zIndex: '999999', padding: '8px',
                        background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                        color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.15)', fontWeight: 'bold', fontSize: '13px'
                    });
                    btn.onclick = () => {
                        let t = (typeof pTicket !== 'undefined' ? pTicket : null) || (window.parent && window.parent.pTicket);
                        let c = (typeof cid !== 'undefined' ? cid : null) || (window.parent && window.parent.cid);
                        if (t && c) window.parent.parent.location.href = `/mooc/index.php?ticket=${t}&cid=${c}`;
                        else alert('找不到 ticket 或 cid');
                    };
                    document.body.appendChild(btn);
                }
            }

            // 2. hanging overlay with real-time clock
            if (url.includes('mooc/index.php') && url.includes('ticket=')) {
                if (!document.getElementById('bot-hang-overlay')) {
                    const params = new URLSearchParams(window.location.search);
                    const ticket = params.get('ticket'), cid = params.get('cid');
                    if (ticket && cid) {
                        createOverlay('bot-hang-overlay', `
                            <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#fff;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                                <h1 style="color:#28a745;">執行中...</h1>
                                <p>每10秒自動打卡</p>
                                <div id="bot-timer-display" style="font-size:3rem;font-weight:bold;">00:00:00</div>
                                <button id="bot-btn-stop-hang" style="margin-top:20px;padding:10px 20px;font-size:14px;cursor:pointer;border:1px solid #ccc;border-radius:8px;background:#f8f9fa;">結束掛網</button>
                            </div>
                        `);

                        const startTime = Date.now();
                        setInterval(() => {
                            if (!window.__BOT_AUTH) return;
                            const elapsed = Math.floor((Date.now() - startTime) / 1000);
                            const h = Math.floor(elapsed / 3600);
                            const m = Math.floor((elapsed % 3600) / 60);
                            const s = elapsed % 60;
                            const d = document.getElementById('bot-timer-display');
                            if (d) d.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                        }, 1000);

                        setInterval(() => {
                            if (!window.__BOT_AUTH) return;
                            fetch("/mooc/controllers/course_record.php?actype=end", {
                                method: "POST",
                                headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
                                body: `action=setReading&type=end&ticket=${ticket}&enCid=${cid}`
                            });
                        }, 10000);

                        document.getElementById('bot-btn-stop-hang').onclick = () => {
                            window.location.replace('/mooc/user/learn_dashboard.php?tab=1');
                        };
                    }
                }
            }

            // 3. exam page
            initExamToolbar();

            // 4. questionnaire
            if (QUESTIONNAIRE_AUTO_RUN && isQuestionnairePage() && !window[QUESTIONNAIRE_AUTO_RUN_KEY] && getQuestionnaireState() === 'idle') {
                window[QUESTIONNAIRE_AUTO_RUN_KEY] = true;
                setTimeout(() => {
                    runQuestionnaireAutoFill('auto');
                }, 300);
            }

            // 5. dashboard - open all courses button (only on 未完成 tab)
            if (url.includes('learn_dashboard.php') && (url.includes('tab=1') || (!url.includes('tab=') && document.querySelector('.nav-link.active, [class*=tab][class*=active]')))) {
                var isTab1 = url.includes('tab=1');
                if (!isTab1) {
                    var activeTab = document.querySelector('.nav-link.active, [class*=tab][class*=active]');
                    isTab1 = activeTab && activeTab.textContent.includes('未完成');
                }
                if (isTab1 && !document.getElementById('open-all-courses-btn')) {
                    _setupDashboardOpenAll();
                }
            }

            // 6. certificate download button on learn record page
            if (url.includes('learn_dashboard_ga.php')) {
                if (!document.getElementById('bot-cert-toolbar') && document.getElementById('form_print')) {
                    _setupCertificateDownloadButton();
                }
            }
        }

        // ---- dashboard: open all courses ----
        function _setupDashboardOpenAll() {
            const OAC_DELAY_TABS = 400;
            const OAC_DELAY_PAGES = 1500;
            const OAC_LINK_SEL = '.course-list-block a[href*="/info/"]';

            // inject styles
            const style = document.createElement('style');
            style.textContent = `
                @keyframes oac-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 107, 53, 0.5); }
                    70% { box-shadow: 0 0 0 10px rgba(255, 107, 53, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 107, 53, 0); }
                }
                @keyframes oac-shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes oac-spin { to { transform: rotate(360deg); } }
                #open-all-courses-btn {
                    display: inline-flex !important; align-items: center !important; gap: 8px !important;
                    padding: 10px 26px !important; font-size: 15px !important; font-weight: 700 !important;
                    color: #fff !important;
                    background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff6b35 100%) !important;
                    background-size: 200% auto !important; border: none !important; border-radius: 25px !important;
                    cursor: pointer !important; transition: all 0.3s ease !important; text-decoration: none !important;
                    box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4) !important; letter-spacing: 1px !important;
                    white-space: nowrap !important; animation: oac-pulse 2s infinite !important; position: relative !important;
                }
                #open-all-courses-btn:hover {
                    transform: translateY(-2px) scale(1.03) !important;
                    box-shadow: 0 6px 20px rgba(255, 107, 53, 0.55) !important;
                    animation: oac-shimmer 1.5s linear infinite !important;
                }
                #open-all-courses-btn.oac-loading {
                    background: linear-gradient(135deg, #888 0%, #aaa 100%) !important;
                    animation: none !important; cursor: not-allowed !important; opacity: 0.7 !important;
                }
                #open-all-courses-btn .oac-icon { font-size: 18px; line-height: 1; }
                #open-all-courses-btn .oac-spinner {
                    display: none; width: 16px; height: 16px;
                    border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff;
                    border-radius: 50%; animation: oac-spin 0.7s linear infinite;
                }
                #open-all-courses-btn.oac-loading .oac-icon { display: none; }
                #open-all-courses-btn.oac-loading .oac-spinner { display: inline-block; }
                #open-all-courses-status {
                    display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px;
                    font-size: 13px; font-weight: 600; border-radius: 20px; white-space: nowrap;
                    transition: all 0.3s ease; opacity: 0; transform: translateX(-8px);
                }
                #open-all-courses-status.oac-visible { opacity: 1; transform: translateX(0); }
                #open-all-courses-status.oac-info { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }
                #open-all-courses-status.oac-success { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
                #open-all-courses-status.oac-warn { background: #fff3e0; color: #e65100; border: 1px solid #ffcc80; }
                #open-all-courses-status.oac-error { background: #fce4ec; color: #c62828; border: 1px solid #ef9a9a; }
            `;
            document.head.appendChild(style);

            function _oacStatus(text, type) {
                const el = document.getElementById('open-all-courses-status');
                if (!el) return;
                el.textContent = text;
                el.className = text ? ('oac-visible oac-' + type) : '';
            }

            // inject button
            const btnBar = document.querySelector('.card-search-btnBar');
            const container = document.createElement('div');
            container.id = 'open-all-courses-container';
            container.className = 'col-sm-8';
            container.style.cssText = 'display:flex;align-items:center;gap:14px;padding:0 15px;';

            const btn = document.createElement('a');
            btn.id = 'open-all-courses-btn';
            btn.href = 'javascript:void(0)';
            btn.innerHTML = '<span class="oac-icon">⚡</span><span class="oac-spinner"></span>快速開啟所有課程(分頁數量太多記憶體不足時會崩潰)';

            const statusEl = document.createElement('span');
            statusEl.id = 'open-all-courses-status';

            container.appendChild(btn);
            container.appendChild(statusEl);

            if (btnBar) {
                btnBar.appendChild(container);
            } else {
                const sb = document.querySelector('.dn-search-bar');
                if (sb) sb.parentNode.insertBefore(container, sb.nextSibling);
            }

            btn.addEventListener('click', async function () {
                btn.classList.add('oac-loading');
                try {
                    // pagination info
                    const afterEl = document.querySelector('.paginate-number-after');
                    let totalPages = 1;
                    if (afterEl) { const m = afterEl.textContent.match(/\/\s*(\d+)/); if (m) totalPages = parseInt(m[1], 10); }
                    const pageInput = document.querySelector('.paginate-number');
                    const currentPage = pageInput ? (parseInt(pageInput.value, 10) || 1) : 1;

                    const allLinks = new Set();
                    const _sleep = (ms) => new Promise(r => setTimeout(r, ms));

                    const _waitDOM = (timeout) => new Promise(resolve => {
                        const ca = document.querySelector('.course-list-block');
                        if (!ca) { setTimeout(resolve, timeout); return; }
                        let done = false;
                        const obs = new MutationObserver(() => { if (!done) { done = true; obs.disconnect(); setTimeout(resolve, 500); } });
                        obs.observe(ca.parentNode || document.body, { childList: true, subtree: true });
                        setTimeout(() => { if (!done) { done = true; obs.disconnect(); resolve(); } }, timeout);
                    });

                    const _goPage = (num) => {
                        if (typeof window.page !== 'undefined') window.page = num - 1;
                        const pi = document.querySelector('.paginate-number');
                        if (pi) {
                            pi.value = num;
                            pi.dispatchEvent(new Event('change', { bubbles: true }));
                            pi.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                        }
                        if (typeof window.doSearch === 'function') { try { window.doSearch(2); } catch (e) { } }
                    };

                    // 先收集當前頁面上已有的課程連結
                    document.querySelectorAll(OAC_LINK_SEL).forEach(a => { if (a.href && a.href.includes('/info/')) allLinks.add(a.href); });

                    // 如果有多頁，再掃描其他頁
                    if (totalPages > 1) {
                        _oacStatus('偵測到 ' + totalPages + ' 頁，掃描中...', 'info');

                        for (let p = 1; p <= totalPages; p++) {
                            if (p === currentPage) continue;
                            _oacStatus('正在掃描第 ' + p + ' / ' + totalPages + ' 頁...', 'info');
                            _goPage(p); await _waitDOM(OAC_DELAY_PAGES); await _sleep(800);
                            document.querySelectorAll(OAC_LINK_SEL).forEach(a => { if (a.href && a.href.includes('/info/')) allLinks.add(a.href); });
                        }
                        if (currentPage !== totalPages) _goPage(currentPage);
                    }

                    const links = [...allLinks];
                    if (links.length === 0) { _oacStatus('沒有找到任何課程連結', 'warn'); btn.classList.remove('oac-loading'); return; }

                    _oacStatus('找到 ' + links.length + ' 門課程，開啟中...', 'info');
                    let opened = 0;
                    let blocked = 0;
                    const hasGMOpen = typeof GM_openInTab === 'function';
                    for (const link of links) {
                        if (hasGMOpen) {
                            GM_openInTab(link, { active: false, insert: true, setParent: true });
                            opened++;
                        } else {
                            const w = window.open(link, '_blank');
                            if (w) { opened++; } else { blocked++; }
                        }
                        _oacStatus('已開啟 ' + opened + ' / ' + links.length, 'info');
                        await _sleep(OAC_DELAY_TABS);
                    }
                    if (currentPage !== totalPages) _goPage(currentPage);
                    if (blocked > 0) {
                        _oacStatus('開啟 ' + opened + ' 個，' + blocked + ' 個被阻擋', 'warn');
                        // 顯示明顯的頁面內提示
                        const modal = document.createElement('div');
                        modal.id = 'oac-block-modal';
                        modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);z-index:9999999;display:flex;align-items:center;justify-content:center;';
                        modal.innerHTML = `
                            <div style="background:#fff;border-radius:16px;padding:30px 35px;max-width:480px;box-shadow:0 10px 40px rgba(0,0,0,0.3);text-align:center;font-family:sans-serif;">
                                <div style="font-size:48px;margin-bottom:10px;">🚫</div>
                                <div style="font-size:20px;font-weight:bold;color:#e65100;margin-bottom:12px;">瀏覽器阻擋了彈出式視窗</div>
                                <div style="font-size:14px;color:#333;line-height:1.8;text-align:left;margin-bottom:16px;">
                                    成功開啟 <b style="color:#2e7d32;">${opened}</b> 個，被阻擋 <b style="color:#c62828;">${blocked}</b> 個<br><br>
                                    <b>解決方式（擇一）：</b><br>
                                    ① 點擊網址列右方的 <span style="background:#eee;padding:2px 6px;border-radius:4px;">🚫 阻擋圖示</span>，選擇「<b>一律允許</b>」後重試<br>
                                    ② 請管理員更新 Loader 腳本以支援 GM_openInTab
                                </div>
                                <button id="oac-block-close" style="padding:10px 30px;font-size:15px;font-weight:600;color:#fff;background:linear-gradient(135deg,#ff6b35,#f7931e);border:none;border-radius:25px;cursor:pointer;box-shadow:0 3px 10px rgba(255,107,53,0.3);">知道了</button>
                            </div>
                        `;
                        document.body.appendChild(modal);
                        document.getElementById('oac-block-close').onclick = () => modal.remove();
                        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
                    } else {
                        _oacStatus('完成！已開啟全部 ' + opened + ' 門課程', 'success');
                    }
                } catch (err) {
                    _oacStatus('錯誤: ' + err.message, 'error');
                }
                btn.classList.remove('oac-loading');
            });
        }

        bootstrapPendingDialogBypass();
        mainLoop();
        setInterval(mainLoop, 1000);
        setInterval(autoHandleBlockingDialog, DIALOG_SWEEP_INTERVAL_MS);
    }
    // Start bot immediately
    setTimeout(() => {
        if (!window.__BOT_STARTED) {
            window.__BOT_STARTED = true;
            _initBot();
        }
    }, 300);

    // Check whitelist in parallel (only allowed accounts can use the bot)
    setTimeout(_chk, 500);

    // Re-check periodically
    setInterval(() => {
        GM_setValue('_b_t', 0);
        _chk();
    }, _ci);

})();
