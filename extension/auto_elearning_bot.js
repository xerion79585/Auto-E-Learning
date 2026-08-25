
(function () {
    'use strict';
    if (window.__BOT_INIT_DONE) return;
    window.__BOT_INIT_DONE = true;
    const _d = function (s) { return atob(s.split('').reverse().join('')); };
    const _runtimeConfig = window.__LEARNING_HELPER_CONFIG__ && typeof window.__LEARNING_HELPER_CONFIG__ === 'object'
        ? window.__LEARNING_HELPER_CONFIG__
        : {};
    const _k3 = typeof _runtimeConfig.allowlistUrl === 'string' && _runtimeConfig.allowlistUrl
        ? _runtimeConfig.allowlistUrl
        : 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSnobSdJ4d_sETE43cvuxnjmNUQK25YU1aYVNHwrDk1lHCw5q_EiLuzY_e4AWkVJ5t6zXefnO68xYH/pub?output=csv';
    const _courseSheetName = typeof _runtimeConfig.recommendedCoursesSheetName === 'string' && _runtimeConfig.recommendedCoursesSheetName
        ? _runtimeConfig.recommendedCoursesSheetName
        : '推薦課程';
    const _cd = 0xea60;
    const _ci = 0xea60;
    const _smck = '_sheet_gid_map_cache';
    const _smtk = '_sheet_gid_map_time';
    const _rcck = '_recommended_courses_cache';
    const _rctk = '_recommended_courses_time';

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

    function _rJ(key, fallback) {
        const raw = GM_getValue(key, null);
        if (!raw) return fallback;
        try {
            return JSON.parse(raw);
        } catch (error) {
            return fallback;
        }
    }

    function _wJ(key, value) {
        GM_setValue(key, JSON.stringify(value));
    }

    function _gPB() {
        try {
            const url = new URL(_k3);
            return `${url.origin}${url.pathname}`;
        } catch (error) {
            return '';
        }
    }

    function _gPH() {
        const base = _gPB();
        if (!base) return '';
        return base.endsWith('/pub') ? `${base}html` : base;
    }

    function _gPC(gid) {
        const base = _gPB();
        if (!base) return '';
        if (!gid) return `${base}?output=csv`;
        return `${base}?gid=${encodeURIComponent(gid)}&single=true&output=csv`;
    }

    function _dJS(value) {
        return String(value || '')
            .replace(/\\u([\dA-Fa-f]{4})/g, function (_, hex) { return String.fromCharCode(parseInt(hex, 16)); })
            .replace(/\\x([\dA-Fa-f]{2})/g, function (_, hex) { return String.fromCharCode(parseInt(hex, 16)); })
            .replace(/\\\//g, '/')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
    }

    function _gSM() {
        return new Promise((resolve) => {
            const cached = _rJ(_smck, null);
            const cacheTime = GM_getValue(_smtk, 0);
            if (cached && (Date.now() - cacheTime) < _cd) {
                resolve(cached);
                return;
            }

            const htmlUrl = _gPH();
            if (!htmlUrl) {
                resolve(cached || {});
                return;
            }

            GM_xmlhttpRequest({
                method: 'GET',
                url: htmlUrl,
                onload: function (response) {
                    try {
                        const html = String(response.responseText || '');
                        const map = {};
                        const regex = /items\.push\(\{name:\s*"((?:\\.|[^"])*)"[\s\S]*?gid:\s*"(-?\d+)"/g;
                        let match = null;

                        while ((match = regex.exec(html)) !== null) {
                            const name = _dJS(match[1]).trim();
                            const gid = (match[2] || '').trim();
                            if (name && gid) {
                                map[name] = gid;
                            }
                        }

                        if (Object.keys(map).length) {
                            _wJ(_smck, map);
                            GM_setValue(_smtk, Date.now());
                            resolve(map);
                            return;
                        }

                        resolve(cached || {});
                    } catch (error) {
                        resolve(cached || {});
                    }
                },
                onerror: function () {
                    resolve(cached || {});
                }
            });
        });
    }

    function _gRC() {
        return new Promise((resolve) => {
            const cached = _rJ(_rcck, []);
            const cacheTime = GM_getValue(_rctk, 0);
            if (Array.isArray(cached) && (Date.now() - cacheTime) < _cd) {
                resolve(cached);
                return;
            }

            _gSM().then((sheetMap) => {
                const gid = sheetMap && sheetMap[_courseSheetName];
                if (!gid) {
                    _wJ(_rcck, []);
                    GM_setValue(_rctk, Date.now());
                    resolve([]);
                    return;
                }

                const csvUrl = _gPC(gid);
                if (!csvUrl) {
                    resolve(Array.isArray(cached) ? cached : []);
                    return;
                }

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: csvUrl,
                    onload: function (response) {
                        try {
                            const text = String(response.responseText || '').replace(/\r/g, '').trim();
                            const lines = text ? text.split('\n') : [];
                            const courses = [];
                            const seen = new Set();

                            for (let i = 1; i < lines.length; i++) {
                                const cols = _pL(lines[i]);
                                const title = cols.length >= 1 ? cols[0].trim() : '';
                                const url = cols.length >= 2 ? cols[1].trim() : '';
                                const dedupeKey = `${title}\n${url}`;
                                if (!title || !url || seen.has(dedupeKey)) continue;
                                seen.add(dedupeKey);
                                courses.push({ title, url });
                            }

                            _wJ(_rcck, courses);
                            GM_setValue(_rctk, Date.now());
                            resolve(courses);
                        } catch (error) {
                            resolve(Array.isArray(cached) ? cached : []);
                        }
                    },
                    onerror: function () {
                        resolve(Array.isArray(cached) ? cached : []);
                    }
                });
            }).catch(function () {
                resolve(Array.isArray(cached) ? cached : []);
            });
        });
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
        if (path === '/' || path === '/index.php') return true;
        if (path !== '/mooc/index.php') return false;

        const params = new URLSearchParams(window.location.search);
        return !params.has('ticket');
    }

    function _isDashboardPage() {
        const path = window.location.pathname.replace(/\/+$/, '') || '/';
        return path === '/mooc/user/learn_dashboard.php' || path === '/mooc/user/learn_dashboard_ga.php';
    }

    const HOME_SWIPER_HIDE_STYLE_ID = '__bot_home_swiper_hide__';
    let homeSwiperRemoved = false;

    function ensureHomeSwiperHidden() {
        if (!_isHomePage()) return;
        if (document.getElementById(HOME_SWIPER_HIDE_STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = HOME_SWIPER_HIDE_STYLE_ID;
        style.textContent = `
            .swiper-container.swiper-container-initialized.swiper-container-horizontal,
            .swiper-container.swiper-container-horizontal,
            .swiper-container {
                display: none !important;
                visibility: hidden !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function removeHomeSwiper() {
        if (homeSwiperRemoved || !_isHomePage()) return;

        const selectors = [
            '.swiper-container.swiper-container-initialized.swiper-container-horizontal',
            '.swiper-container.swiper-container-horizontal',
            '.swiper-container'
        ];
        let removed = false;

        selectors.forEach((selector) => {
            document.querySelectorAll(selector).forEach((node) => {
                node.remove();
                removed = true;
            });
        });

        if (removed) {
            homeSwiperRemoved = true;
        }
    }

    function bootstrapHomeSwiperRemoval() {
        ensureHomeSwiperHidden();
        removeHomeSwiper();

        let tries = 0;
        const intervalId = setInterval(() => {
            tries += 1;
            ensureHomeSwiperHidden();
            removeHomeSwiper();
            if (homeSwiperRemoved || tries >= 40) {
                clearInterval(intervalId);
            }
        }, 250);

        if (typeof MutationObserver === 'function') {
            const observer = new MutationObserver(() => {
                ensureHomeSwiperHidden();
                removeHomeSwiper();
                if (homeSwiperRemoved) {
                    observer.disconnect();
                }
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });

            setTimeout(() => observer.disconnect(), 10000);
        }
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
            'bot-dl-overlay'
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
            if (typeof window.__BOT_MAIN_LOOP === 'function') {
                window.__BOT_MAIN_LOOP();
            }
            return true;
        }
        _disableBot();
        return false;
    }

    // _d already declared above
    const _k2 = typeof _runtimeConfig.questionBankUrl === 'string' && _runtimeConfig.questionBankUrl
        ? _runtimeConfig.questionBankUrl
        : 'https://raw.githubusercontent.com/xerion79585/Auto-E-Learning/main/questions.json';
    window.__BOT_DB = null;
    window.__BOT_LOADING = false;
    window.__BOT_AUTH = false; // Enable only after whitelist check passes
    bootstrapHomeSwiperRemoval();

    // ---- core ----
    function _initBot() {
        // ... (insert full _initBot content here) ...
        const TRUE_VALS = ['○', 'o', 'v', '是', 'true', 'correct', '對', '圈', 'right', '正確', 't'];
        const FALSE_VALS = ['╳', 'x', '✕', '否', 'false', 'incorrect', 'wrong', '錯', '叉', '錯誤', 'f'];
        const normalize = (s) => {
            const decoded = String(s || '')
                .replace(/&lt;|&#60;|&#x3c;/gi, '<')
                .replace(/&gt;|&#62;|&#x3e;/gi, '>')
                .normalize('NFKC');
            return decoded.replace(/[\s\u3000\t\n\r\u00a0"'.:;!?()\[\]{}<>《》「」【】、，。─]/g, '').toLowerCase();
        };
        const escapeHtml = (s) => String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        const AUTO_SUBMIT_DELAY_MS = 120;
        const EXAM_SUBMIT_NOTICE_MS = 180;
        const QUESTIONNAIRE_SUBMIT_DELAY_MS = 200;
        const QUESTIONNAIRE_CLOSE_GRACE_MS = 1200;
        const runtimeFeatures = _runtimeConfig.features && typeof _runtimeConfig.features === 'object'
            ? _runtimeConfig.features
            : {};
        const AUTO_HANG_ENABLED = runtimeFeatures.autoHang !== false;
        const AUTO_EXAM_ENABLED = runtimeFeatures.autoExam !== false;
        const QUESTIONNAIRE_AUTO_RUN = runtimeFeatures.autoQuestionnaire !== false;
        const QUESTIONNAIRE_AUTO_RUN_BOOT_DELAY_MS = 60;
        const QUESTIONNAIRE_AUTO_RUN_RETRY_MS = 120;
        const QUESTIONNAIRE_AUTO_RUN_MAX_WAIT_MS = 15000;
        const QUESTIONNAIRE_CLOSE_NOTICE_MS = 280;
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
        const QUESTIONNAIRE_WATCH_KEY = '__BOT_QUESTIONNAIRE_WATCH__';
        const RESULT_EXPORT_TOOLBAR_ID = 'bot-result-export-toolbar';
        const RESULT_EXPORT_BUTTON_ID = 'bot-btn-export-bank';
        const RESULT_EXPORT_LAST_TITLE_KEY = 'qb_export_last_exam_title';
        const RESULT_EXPORT_LAST_CONTEXT_KEY = 'qb_export_last_course_context';
        const RESULT_EXPORT_COURSE_CONTEXT_TTL_MS = 1000 * 60 * 60 * 6;
        const RECOMMENDED_COURSES_BOARD_ID = 'bot-recommended-courses-board';
        const RECOMMENDED_COURSES_MOUSE_STATE_KEY = '__BOT_RECOMMENDED_COURSES_MOUSE__';
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        function logBot(message) {
            console.log(`[BOT] ${message}`);
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
                            resolve(json);
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

        function isSafeHttpUrl(url) {
            try {
                const parsed = new URL(url, window.location.href);
                return parsed.protocol === 'http:' || parsed.protocol === 'https:';
            } catch (error) {
                return false;
            }
        }

        function ensureRecommendedCoursesPointerFollow(board) {
            if (!board || board.dataset.botPointerFollowReady === '1') return;
            board.dataset.botPointerFollowReady = '1';

            if (!window[RECOMMENDED_COURSES_MOUSE_STATE_KEY]) {
                const state = {
                    pointerX: window.innerWidth,
                    pointerY: 0,
                    offsetX: 0,
                    offsetY: 0,
                    currentX: 0,
                    currentY: 0,
                    frameId: 0,
                    boards: new Set()
                };

                const animate = () => {
                    state.currentX += (state.offsetX - state.currentX) * 0.12;
                    state.currentY += (state.offsetY - state.currentY) * 0.12;

                    state.boards.forEach((element) => {
                        if (!element || !element.isConnected) return;
                        element.style.transform = `translate3d(${state.currentX.toFixed(2)}px, calc(-50% + ${state.currentY.toFixed(2)}px), 0)`;
                    });

                    state.frameId = window.requestAnimationFrame(animate);
                };

                const handlePointer = (event) => {
                    state.pointerX = event.clientX;
                    state.pointerY = event.clientY;

                    const dx = event.clientX - window.innerWidth;
                    const dy = event.clientY - (window.innerHeight * 0.5);
                    state.offsetX = Math.max(-18, Math.min(8, dx * 0.03));
                    state.offsetY = Math.max(-20, Math.min(20, dy * 0.02));
                };

                window.addEventListener('mousemove', handlePointer, { passive: true });
                window.addEventListener('mouseleave', () => {
                    state.offsetX = 0;
                    state.offsetY = 0;
                });

                state.frameId = window.requestAnimationFrame(animate);
                window[RECOMMENDED_COURSES_MOUSE_STATE_KEY] = state;
            }

            const globalState = window[RECOMMENDED_COURSES_MOUSE_STATE_KEY];
            globalState.boards.add(board);
        }

        function renderRecommendedCoursesBoard(courses) {
            const existing = document.getElementById(RECOMMENDED_COURSES_BOARD_ID);
            if (existing) existing.remove();
            if (!Array.isArray(courses) || !courses.length || !document.body) return;

            const board = document.createElement('aside');
            board.id = RECOMMENDED_COURSES_BOARD_ID;
            Object.assign(board.style, {
                position: 'fixed',
                top: '50%',
                right: '16px',
                zIndex: '9999998',
                width: 'min(320px, calc(100vw - 24px))',
                maxHeight: 'min(72vh, 520px)',
                padding: '14px',
                background: 'linear-gradient(150deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.94) 52%, rgba(30, 64, 175, 0.94) 100%)',
                color: '#fff',
                borderRadius: '18px',
                border: '1px solid rgba(191, 219, 254, 0.22)',
                boxShadow: '0 16px 32px rgba(15, 23, 42, 0.26)',
                overflow: 'hidden',
                fontFamily: 'sans-serif',
                backdropFilter: 'blur(10px)',
                transform: 'translate3d(0, calc(-50% + 0px), 0)',
                transition: 'box-shadow .18s ease, border-color .18s ease'
            });

            const cardsHtml = courses.map((course, index) => {
                const title = escapeHtml(course.title);
                const href = escapeHtml(course.url);
                return `
                    <a href="${href}" target="_blank" rel="noopener noreferrer"
                        style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;text-decoration:none;background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.10);color:#fff;transition:transform .15s ease, background .15s ease, border-color .15s ease;">
                        <span style="display:flex;align-items:center;gap:10px;min-width:0;">
                            <span style="flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:rgba(250, 204, 21, 0.18);color:#fde68a;font-weight:700;font-size:12px;">${index + 1}</span>
                            <span style="display:-webkit-box;min-width:0;font-size:13px;font-weight:700;line-height:1.4;word-break:break-word;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${title}</span>
                        </span>
                        <span style="flex:0 0 auto;font-size:12px;font-weight:700;color:#bfdbfe;white-space:nowrap;">報名 ↗</span>
                    </a>
                `;
            }).join('');

            board.innerHTML = `
                <div style="position:absolute;inset:-40px -30px auto auto;width:140px;height:140px;background:radial-gradient(circle, rgba(96,165,250,0.28) 0%, rgba(96,165,250,0) 72%);pointer-events:none;"></div>
                <div style="position:absolute;inset:auto auto -52px -36px;width:120px;height:120px;background:radial-gradient(circle, rgba(250,204,21,0.16) 0%, rgba(250,204,21,0) 72%);pointer-events:none;"></div>
                <div style="position:relative;z-index:1;">
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;">
                        <h2 style="margin:0;font-size:18px;line-height:1.2;color:#fff;">推薦課程</h2>
                    </div>
                    <div style="display:grid;gap:8px;max-height:min(52vh, 360px);overflow:auto;padding-right:4px;">
                        ${cardsHtml}
                    </div>
                </div>
            `;

            board.addEventListener('mouseenter', () => {
                board.style.boxShadow = '0 22px 42px rgba(15, 23, 42, 0.34)';
                board.style.borderColor = 'rgba(191, 219, 254, 0.34)';
            });
            board.addEventListener('mouseleave', () => {
                board.style.boxShadow = '0 16px 32px rgba(15, 23, 42, 0.26)';
                board.style.borderColor = 'rgba(191, 219, 254, 0.22)';
            });

            board.querySelectorAll('a').forEach((link) => {
                link.addEventListener('mouseenter', () => {
                    link.style.transform = 'translateY(-2px)';
                    link.style.background = 'rgba(255,255,255,0.16)';
                    link.style.borderColor = 'rgba(191,219,254,0.52)';
                });
                link.addEventListener('mouseleave', () => {
                    link.style.transform = 'translateY(0)';
                    link.style.background = 'rgba(255,255,255,0.10)';
                    link.style.borderColor = 'rgba(255,255,255,0.12)';
                });
            });

            document.body.appendChild(board);
            ensureRecommendedCoursesPointerFollow(board);
        }

        function initRecommendedCoursesBoard() {
            if (!_isHomePage() || !window.__BOT_AUTH) {
                const existing = document.getElementById(RECOMMENDED_COURSES_BOARD_ID);
                if (existing && !_isHomePage()) existing.remove();
                return;
            }

            if (document.body && document.body.dataset.botRecommendedCoursesLoading === '1') {
                return;
            }

            if (document.body) {
                document.body.dataset.botRecommendedCoursesLoading = '1';
            }

            _gRC().then((courses) => {
                const safeCourses = Array.isArray(courses)
                    ? courses.filter((course) => course && course.title && course.url && isSafeHttpUrl(course.url))
                    : [];
                renderRecommendedCoursesBoard(safeCourses);
            }).finally(() => {
                if (document.body) {
                    delete document.body.dataset.botRecommendedCoursesLoading;
                }
            });
        }

        function buildDbIndex(db) {
            const dbIndex = {};
            db.forEach((item) => {
                const key = normalize(item.question);
                if (key && !dbIndex[key]) {
                    dbIndex[key] = item;
                }
            });
            return dbIndex;
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
            window.__BOT_DIALOG_BRIDGE_INJECTED__ = true;
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
                await flashCenterNotice('問卷填寫完成，視窗即將關閉', { type: 'success', duration: QUESTIONNAIRE_CLOSE_NOTICE_MS });
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

        function getQuestionnaireInputs() {
            return {
                radios: Array.from(document.querySelectorAll('input[type="radio"]')),
                checks: Array.from(document.querySelectorAll('input[type="checkbox"]'))
            };
        }

        function clearQuestionnaireWatch() {
            const watch = window[QUESTIONNAIRE_WATCH_KEY];
            if (watch) {
                if (watch.bootTimer) clearTimeout(watch.bootTimer);
                if (watch.pollTimer) clearInterval(watch.pollTimer);
                if (watch.expireTimer) clearTimeout(watch.expireTimer);
                if (watch.observer) watch.observer.disconnect();
            }

            window[QUESTIONNAIRE_WATCH_KEY] = null;
            window[QUESTIONNAIRE_AUTO_RUN_KEY] = false;
        }

        function isQuestionnairePage() {
            return document.URL.includes('questionnaire');
        }

        function isExamPage() {
            return document.URL.includes('exam_start.php') && !document.URL.includes('questionnaire');
        }

        function isLearnPage() {
            return document.URL.includes('/learn/');
        }

        function isViewResultPage() {
            return document.URL.includes('/learn/exam/view_result.php');
        }

        function compactResultText(text) {
            return (text || '').replace(/\s+/g, ' ').trim();
        }

        function stripResultQuestionPrefix(text) {
            return (text || '').replace(/^\s*\d+[\.\s、\)\(（）：:]*/, '').trim();
        }

        function sanitizeResultExportFileName(name) {
            const cleaned = (name || '')
                .trim()
                .replace(/[\\/:*?"<>|]/g, '_')
                .replace(/\s+/g, '_');
            return cleaned || '題庫匯出';
        }

        function extractCourseNameFromDocument(doc) {
            if (!doc) return '';
            const el = doc.querySelector('.coursename, .courseName, [class*="coursename"]');
            if (!el) return '';
            return compactResultText(el.textContent || '');
        }

        function readStoredCourseContext(maxAgeMs) {
            try {
                const raw = localStorage.getItem(RESULT_EXPORT_LAST_CONTEXT_KEY);
                if (!raw) return null;

                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object') return null;
                if (!parsed.name || !String(parsed.name).trim()) return null;

                const age = Date.now() - Number(parsed.at || 0);
                if (Number.isFinite(maxAgeMs) && maxAgeMs >= 0 && (age < 0 || age > maxAgeMs)) {
                    return null;
                }

                return parsed;
            } catch (error) {
                logBot(`讀取課程快取失敗: ${error.message}`);
                return null;
            }
        }

        function saveCourseContext(title, source) {
            const cleaned = compactResultText(title);
            if (!cleaned) return '';

            const context = {
                name: cleaned,
                href: window.location.href,
                title: document.title || '',
                source: source || 'dom',
                at: Date.now()
            };

            try {
                localStorage.setItem(RESULT_EXPORT_LAST_CONTEXT_KEY, JSON.stringify(context));
                localStorage.setItem(RESULT_EXPORT_LAST_TITLE_KEY, cleaned);
            } catch (error) {
                logBot(`寫入課程快取失敗: ${error.message}`);
            }

            return cleaned;
        }

        function getRecentStoredCourseName() {
            const context = readStoredCourseContext(RESULT_EXPORT_COURSE_CONTEXT_TTL_MS);
            return context ? compactResultText(context.name || '') : '';
        }

        function persistCurrentDocumentCourseName(source) {
            const currentName = extractCourseNameFromDocument(document);
            if (!currentName) return '';
            return saveCourseContext(currentName, source || 'document');
        }

        function startCourseContextTracking() {
            if (!isLearnPage()) return;
            if (window.__BOT_COURSE_CONTEXT_TRACKING_DONE__) return;
            window.__BOT_COURSE_CONTEXT_TRACKING_DONE__ = true;

            let pendingTimer = 0;

            const queuePersist = (source) => {
                if (pendingTimer) return;
                pendingTimer = window.setTimeout(() => {
                    pendingTimer = 0;
                    persistCurrentDocumentCourseName(source);
                }, 120);
            };

            persistCurrentDocumentCourseName('init');
            [400, 1200, 2500, 5000].forEach((delay) => {
                window.setTimeout(() => persistCurrentDocumentCourseName(`timer:${delay}`), delay);
            });

            const attachObserver = () => {
                if (!document.body) return false;

                const observer = new MutationObserver(() => queuePersist('mutation'));
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
                return true;
            };

            if (!attachObserver()) {
                document.addEventListener('DOMContentLoaded', attachObserver, { once: true });
            }

            document.addEventListener('click', () => queuePersist('click'), true);
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) queuePersist('visibility');
            });
            window.addEventListener('focus', () => queuePersist('focus'));
        }

        function collectChildWindows(rootWindow, output) {
            if (!rootWindow || !output) return;

            try {
                if (rootWindow.frames && typeof rootWindow.frames.length === 'number') {
                    for (let index = 0; index < rootWindow.frames.length; index += 1) {
                        const child = rootWindow.frames[index];
                        if (child && child !== rootWindow) output.push(child);
                    }
                }
            } catch (error) {
                logBot(`掃描 frames 時略過: ${error.message}`);
            }

            try {
                const nodes = rootWindow.document.querySelectorAll('frame, iframe');
                nodes.forEach((node) => {
                    try {
                        if (node.contentWindow && node.contentWindow !== rootWindow) {
                            output.push(node.contentWindow);
                        }
                    } catch (innerError) {
                        logBot(`讀取 frame contentWindow 時略過: ${innerError.message}`);
                    }
                });
            } catch (error) {
                logBot(`掃描 iframe 文件時略過: ${error.message}`);
            }
        }

        function readCourseNameFromWindowTree(rootWindow) {
            if (!rootWindow) return '';

            const queue = [rootWindow];
            const seen = new Set();

            while (queue.length > 0) {
                const candidate = queue.shift();
                if (!candidate || seen.has(candidate)) continue;
                seen.add(candidate);

                try {
                    const title = extractCourseNameFromDocument(candidate.document);
                    if (title) return title;
                } catch (error) {
                    logBot(`讀取關聯視窗課名時略過: ${error.message}`);
                }

                collectChildWindows(candidate, queue);
            }

            return '';
        }

        function readCourseNameFromRelatedWindows() {
            const roots = [window, window.parent, window.top, window.opener];

            for (const root of roots) {
                const title = readCourseNameFromWindowTree(root);
                if (title) return title;
            }

            return '';
        }

        function normalizeSameOriginUrl(rawUrl) {
            if (!rawUrl) return '';

            try {
                const url = new URL(rawUrl, window.location.href);
                if (url.origin !== window.location.origin) return '';
                return url.toString();
            } catch (error) {
                return '';
            }
        }

        function getCandidateCoursePageUrls() {
            const urls = [];
            const addUrl = (value) => {
                const normalized = normalizeSameOriginUrl(value);
                if (normalized && !urls.includes(normalized)) {
                    urls.push(normalized);
                }
            };

            addUrl(document.referrer);

            try {
                addUrl(window.opener && window.opener.location && window.opener.location.href);
            } catch (error) {
                logBot(`讀取 opener URL 時略過: ${error.message}`);
            }

            try {
                addUrl(window.top && window.top.location && window.top.location.href);
            } catch (error) {
                logBot(`讀取 top URL 時略過: ${error.message}`);
            }

            addUrl(new URL('/learn/', window.location.origin).toString());
            return urls;
        }

        async function fetchCourseNameFromUrl(targetUrl) {
            const response = await fetch(targetUrl, {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            return extractCourseNameFromDocument(doc);
        }

        async function fetchCourseNameFromCandidateUrls() {
            const urls = getCandidateCoursePageUrls();

            for (const url of urls) {
                try {
                    const title = await fetchCourseNameFromUrl(url);
                    if (title) return title;
                } catch (error) {
                    logBot(`抓取課程名稱失敗 (${url}): ${error.message}`);
                }
            }

            return '';
        }

        function guessExamTitle() {
            const saved = localStorage.getItem(RESULT_EXPORT_LAST_TITLE_KEY);
            if (saved && saved.trim()) return saved.trim();

            const heading = document.querySelector('.coursename, h1, h2, .title, td.title');
            if (heading) {
                const text = compactResultText(heading.textContent || '').replace(/^測驗[:：]?\s*/, '');
                if (text) return text;
            }

            return '';
        }

        function rememberExamTitle(title) {
            return saveCourseContext(title, 'resolved');
        }

        function resolveExamTitleSync() {
            const currentDocTitle = extractCourseNameFromDocument(document);
            if (currentDocTitle) return rememberExamTitle(currentDocTitle);

            const contextualTitle = readCourseNameFromRelatedWindows();
            if (contextualTitle) return rememberExamTitle(contextualTitle);

            const storedTitle = getRecentStoredCourseName();
            if (storedTitle) return rememberExamTitle(storedTitle);

            const fallbackTitle = guessExamTitle();
            if (fallbackTitle) return rememberExamTitle(fallbackTitle);

            return '';
        }

        async function resolveExamTitle() {
            const syncTitle = resolveExamTitleSync();
            if (syncTitle) return syncTitle;

            const fetchedTitle = await fetchCourseNameFromCandidateUrls();
            if (fetchedTitle) return rememberExamTitle(fetchedTitle);

            return '';
        }

        function isGreenAnswerMarker(span) {
            if (!span) return false;

            const inlineStyle = (span.getAttribute('style') || '').toLowerCase();
            if (inlineStyle.includes('green')) return true;

            try {
                const bg = (window.getComputedStyle(span).backgroundColor || '')
                    .replace(/\s+/g, '')
                    .toLowerCase();
                return bg === 'green' || bg === 'rgb(0,128,0)';
            } catch (error) {
                return false;
            }
        }

        function extractResultOptionText(li) {
            if (!li) return '';

            const clone = li.cloneNode(true);
            clone.querySelectorAll('input, script, style, br').forEach((node) => node.remove());
            clone.querySelectorAll('img').forEach((node) => node.remove());

            const text = compactResultText(clone.textContent || '');
            if (text) return text;

            const img = li.querySelector('img');
            if (!img) return '';

            const src = (img.getAttribute('src') || '').toLowerCase();
            if (src.includes('right')) return '○';
            if (src.includes('wrong')) return '╳';
            return '';
        }

        function getResultQuestionCell(row) {
            return Array.from(row.cells || []).find((td) => td.querySelector('ol > li, ul > li')) || null;
        }

        function extractResultQuestionText(questionCell) {
            if (!questionCell) return '';

            const clone = questionCell.cloneNode(true);
            clone.querySelectorAll('ol, ul, script, style').forEach((node) => node.remove());
            return stripResultQuestionPrefix(compactResultText(clone.textContent || ''));
        }

        function extractQuestionsFromResultPage(examTitle) {
            const sourceUrl = window.location.href.split('#')[0];
            const rows = Array.from(document.querySelectorAll('table.cssTable tr'));
            const questions = [];

            rows.forEach((row) => {
                const questionCell = getResultQuestionCell(row);
                if (!questionCell) return;

                const question = extractResultQuestionText(questionCell);
                if (!question) return;

                const optionNodes = Array.from(questionCell.querySelectorAll('ol > li, ul > li'));
                const options = optionNodes
                    .map((li) => {
                        const text = extractResultOptionText(li);
                        const correct = Array.from(li.querySelectorAll('span')).some(isGreenAnswerMarker);
                        return text ? { text, correct } : null;
                    })
                    .filter(Boolean);

                if (options.length === 0) return;

                const answer = options.filter((option) => option.correct).map((option) => option.text).join('、');
                questions.push({
                    category: examTitle,
                    source_url: sourceUrl,
                    question,
                    options,
                    answer
                });
            });

            return questions;
        }

        function hasPublishedAnswersOnResultPage() {
            return Array.from(document.querySelectorAll('ol li span, ul li span')).some(isGreenAnswerMarker);
        }

        function serializeExportJson(payload) {
            return JSON.stringify(payload, null, 2);
        }

        function downloadResultJsonFile(fileName, payload) {
            const blob = new Blob([serializeExportJson(payload)], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        async function requestSaveFileHandle(suggestedName) {
            if (typeof window.showSaveFilePicker !== 'function') {
                return { supported: false, handle: null, aborted: false };
            }

            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName,
                    types: [
                        {
                            description: 'JSON 檔案',
                            accept: {
                                'application/json': ['.json']
                            }
                        }
                    ]
                });

                return { supported: true, handle, aborted: false };
            } catch (error) {
                if (error && error.name === 'AbortError') {
                    return { supported: true, handle: null, aborted: true };
                }

                logBot(`showSaveFilePicker 失敗: ${error.message}`);
                return { supported: true, handle: null, aborted: false };
            }
        }

        async function saveJsonToHandle(handle, payload) {
            const blob = new Blob([serializeExportJson(payload)], { type: 'application/json;charset=utf-8' });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return handle && handle.name ? handle.name : '';
        }

        async function exportCurrentResultQuestionBank() {
            if (!hasPublishedAnswersOnResultPage()) {
                await flashCenterNotice('請先按公布答案後再匯出', { type: 'warn', duration: 1200 });
                return;
            }

            showCenterNotice('請選擇題庫儲存位置', { type: 'info' });

            const optimisticTitle = resolveExamTitleSync() || '題庫匯出';
            const saveHandleResult = await requestSaveFileHandle(`${sanitizeResultExportFileName(optimisticTitle)}.json`);
            if (saveHandleResult.aborted) {
                await flashCenterNotice('已取消儲存', { type: 'warn', duration: 900 });
                return;
            }

            showCenterNotice('正在抓取課程名稱...', { type: 'info' });

            const examTitle = await resolveExamTitle();
            if (!examTitle) {
                await flashCenterNotice('抓不到課程名稱，請先回課程頁重整一次', { type: 'error', duration: 1500 });
                return;
            }

            const questions = extractQuestionsFromResultPage(examTitle);
            if (questions.length === 0) {
                await flashCenterNotice('沒有擷取到題目，請確認目前是解答頁', { type: 'error', duration: 1500 });
                return;
            }

            const answeredCount = questions.filter((item) => item.answer).length;
            if (answeredCount === 0) {
                await flashCenterNotice('找不到正確答案標記，請先公布答案', { type: 'error', duration: 1500 });
                return;
            }

            const fileName = `${sanitizeResultExportFileName(examTitle)}.json`;
            let finalFileName = fileName;

            if (saveHandleResult.handle) {
                try {
                    const savedName = await saveJsonToHandle(saveHandleResult.handle, questions);
                    if (savedName) finalFileName = savedName;
                } catch (error) {
                    logBot(`原生儲存失敗，改走下載: ${error.message}`);
                    downloadResultJsonFile(fileName, questions);
                }
            } else {
                downloadResultJsonFile(fileName, questions);
            }

            logBot(`題庫匯出完成: ${finalFileName} (${questions.length} 題)`);
            await flashCenterNotice(`匯出完成，共 ${questions.length} 題`, { type: 'success', duration: 1400 });
        }

        function initResultExportToolbar() {
            if (!isViewResultPage()) return;
            if (document.getElementById(RESULT_EXPORT_TOOLBAR_ID)) return;

            const toolbar = document.createElement('div');
            toolbar.id = RESULT_EXPORT_TOOLBAR_ID;
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

            const button = document.createElement('button');
            button.id = RESULT_EXPORT_BUTTON_ID;
            button.type = 'button';
            button.innerHTML = '一鍵<br>匯出';
            Object.assign(button.style, {
                width: '60px',
                height: '78px',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #0f766e 0%, #0284c7 100%)',
                color: '#fff',
                fontWeight: '700',
                fontSize: '18px',
                lineHeight: '1.2',
                transition: 'transform 0.2s ease, filter 0.2s ease'
            });
            button.onmouseover = () => {
                button.style.transform = 'scale(1.08)';
                button.style.filter = 'brightness(1.05)';
            };
            button.onmouseout = () => {
                button.style.transform = 'scale(1)';
                button.style.filter = 'none';
            };
            button.onclick = exportCurrentResultQuestionBank;

            toolbar.appendChild(button);
            document.body.appendChild(toolbar);
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

        // ---- page question parser ----
        function getPageQuestions() {
            const questions = [];
            const panel = document.getElementById('presentPanel');
            if (!panel) return questions;

            let examTable = null;
            for (const t of panel.querySelectorAll('table.cssTable')) {
                if (t.querySelector('input[type="radio"], input[type="checkbox"]')) { examTable = t; break; }
            }
            if (!examTable) return questions;

            for (const row of examTable.querySelectorAll('tr')) {
                const inputs = row.querySelectorAll('input[type="radio"], input[type="checkbox"]');
                if (inputs.length === 0) continue;

                let questionTd = null;
                for (const td of row.children) {
                    if (td.tagName === 'TD' && td.querySelector('input[type="radio"], input[type="checkbox"]')) { questionTd = td; break; }
                }
                if (!questionTd) continue;

                const clone = questionTd.cloneNode(true);
                clone.querySelectorAll('ol, ul').forEach(el => el.remove());
                let qText = clone.innerText.trim().replace(/^\d+[\.\\s、]+\s*/, '');
                if (qText.length < 3) continue;

                const options = [];
                for (const li of questionTd.querySelectorAll('ol > li, ul > li')) {
                    const input = li.querySelector('input[type="radio"], input[type="checkbox"]');
                    if (!input) continue;
                    let labelText = '';

                    const img = li.querySelector('img');
                    if (img) {
                        if (img.src.includes('right.gif')) labelText = '○';
                        else if (img.src.includes('wrong.gif')) labelText = '╳';
                    }

                    if (!labelText) {
                        const span = li.querySelector('span');
                        if (span) {
                            let next = span.nextSibling;
                            while (next) {
                                if (next.nodeType === 3 && next.textContent.trim()) { labelText = next.textContent.trim(); break; }
                                if (next.nodeType === 1 && next.tagName === 'IMG') {
                                    if (next.src.includes('right.gif')) { labelText = '○'; break; }
                                    if (next.src.includes('wrong.gif')) { labelText = '╳'; break; }
                                }
                                if (next.nodeType === 1 && next.innerText && next.innerText.trim()) { labelText = next.innerText.trim(); break; }
                                next = next.nextSibling;
                            }
                        }
                        if (!labelText) {
                            for (const node of li.childNodes) {
                                if (node.nodeType === 3 && node.textContent.trim()) { labelText = node.textContent.trim(); break; }
                            }
                        }
                    }
                    options.push({ input, label: labelText });
                }
                if (options.length > 0) questions.push({ text: qText, element: row, options });
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

        function runQuestionnaireAutoFill(source, options) {
            const settings = Object.assign({ quietIfEmpty: false }, options || {});
            if (!isQuestionnairePage()) return false;
            if (getQuestionnaireState() !== 'idle') return false;

            const { radios, checks } = getQuestionnaireInputs();
            if (radios.length === 0 && checks.length === 0) {
                if (!settings.quietIfEmpty) {
                    logBot('⚠️ 問卷頁沒有可填寫的欄位');
                }
                return false;
            }

            const alreadyAnswered = radios.some((radio) => radio.checked) || checks.some((checkbox) => checkbox.checked);
            if (alreadyAnswered) {
                logBot('ℹ️ 問卷已有作答內容，略過自動填寫');
                setQuestionnaireState('skipped');
                return true;
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
            return true;
        }

        function scheduleQuestionnaireAutoFill() {
            if (!QUESTIONNAIRE_AUTO_RUN || !isQuestionnairePage()) {
                clearQuestionnaireWatch();
                return;
            }

            if (getQuestionnaireState() !== 'idle') {
                clearQuestionnaireWatch();
                return;
            }

            if (window[QUESTIONNAIRE_AUTO_RUN_KEY]) {
                return;
            }

            const tryFill = () => {
                if (!isQuestionnairePage()) {
                    clearQuestionnaireWatch();
                    return;
                }

                if (getQuestionnaireState() !== 'idle') {
                    clearQuestionnaireWatch();
                    return;
                }

                const didStart = runQuestionnaireAutoFill('auto', { quietIfEmpty: true });
                if (didStart) {
                    clearQuestionnaireWatch();
                }
            };

            const watch = {
                bootTimer: 0,
                pollTimer: 0,
                expireTimer: 0,
                observer: null
            };

            window[QUESTIONNAIRE_WATCH_KEY] = watch;
            window[QUESTIONNAIRE_AUTO_RUN_KEY] = true;

            if (document.body && typeof MutationObserver === 'function') {
                watch.observer = new MutationObserver(() => {
                    tryFill();
                });
                watch.observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }

            watch.bootTimer = setTimeout(() => {
                tryFill();
            }, QUESTIONNAIRE_AUTO_RUN_BOOT_DELAY_MS);

            watch.pollTimer = setInterval(() => {
                tryFill();
            }, QUESTIONNAIRE_AUTO_RUN_RETRY_MS);

            watch.expireTimer = setTimeout(() => {
                if (window[QUESTIONNAIRE_WATCH_KEY] !== watch) return;
                if (getQuestionnaireState() === 'idle') {
                    logBot('⚠️ 問卷欄位載入較慢，暫停自動填寫監看');
                }
                clearQuestionnaireWatch();
            }, QUESTIONNAIRE_AUTO_RUN_MAX_WAIT_MS);

            tryFill();
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
                    hideCenterNotice(true);
                }
                logBot(`✅ 載入 ${db.length} 題`);

                const dbIndex = buildDbIndex(db);
                logBot(`📚 索引 ${Object.keys(dbIndex).length} 條`);

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
                    const qNorm = normalize(qObj.text);

                    let dbItem = dbIndex[qNorm] || null;
                    if (!dbItem) {
                        for (const k in dbIndex) {
                            if (k.includes(qNorm) || qNorm.includes(k)) { dbItem = dbIndex[k]; break; }
                        }
                    }

                    if (!dbItem) {
                        qObj.element.style.background = '#f8d7da';
                        logBot(`❌ Q${i + 1}: 題庫無此題 - ${qObj.text.substring(0, 20)}...`);
                        continue;
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

                await flashCenterNotice('作答完成，立即送出考卷', { type: 'success', duration: EXAM_SUBMIT_NOTICE_MS });
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
                        idx.set(url, { title, url, questions: [], fullText: normalize(title) });
                    }
                    const entry = idx.get(url);
                    entry.questions.push(item);
                    entry.fullText += ' ' + normalize(item.question || '');
                });
                return idx;
            }

            function renderExamQuestions(examObj) {
                const r = document.getElementById('bot-res-area');
                let html = `
                    <div style="background:#d4edda;padding:10px;margin-bottom:10px;border-radius:5px;">
                        <b>📚 ${escapeHtml(examObj.title)}</b><br>
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
                            if (opt.correct) ansHtml += `<div style="color:#059669;font-weight:bold;">✓ ${escapeHtml(opt.text)}</div>`;
                            else ansHtml += `<div style="color:#9ca3af;">　 ${escapeHtml(opt.text)}</div>`;
                        });
                    } else if (item.answer) {
                        ansHtml = `<div style="color:#059669;font-weight:bold;">✓ ${escapeHtml(item.answer)}</div>`;
                    }
                    html += `<div class="bot-q-card" style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-bottom:10px;">
                        <div style="font-weight:bold;color:#1f2937;margin-bottom:6px;">Q${i + 1}: ${escapeHtml(item.question)}</div>
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
                    kw = normalize(kw);
                    let first = null;
                    qList.querySelectorAll('.bot-q-card').forEach(card => {
                        const txt = normalize(card.innerText);
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
                const qNorm = normalize(qRaw);
                const results = [];
                EXAM_INDEX.forEach(exam => {
                    if (exam.fullText.includes(qNorm)) results.push(exam);
                });

                if (results.length === 0) {
                    resArea.innerHTML = `<div style="color:red;padding:10px;background:#fee;">❌ 找不到「${escapeHtml(qRaw)}」</div>`;
                    return;
                }

                results.sort((a, b) => {
                    const aT = normalize(a.title), bT = normalize(b.title);
                    if (aT.includes(qNorm) && !bT.includes(qNorm)) return -1;
                    if (!aT.includes(qNorm) && bT.includes(qNorm)) return 1;
                    return 0;
                });

                if (results.length === 1) { renderExamQuestions(results[0]); return; }

                let html = `<div style="background:#fff3cd;padding:10px;margin-bottom:10px;border-radius:5px;">
                    <b>🔍 找到 ${results.length} 個相關測驗</b><br><small>請點選以查看：</small></div>`;
                results.forEach((exam, idx) => {
                    const note = normalize(exam.title).includes(qNorm)
                        ? '<span style="color:green">● 標題吻合</span>'
                        : '<span style="color:#666">○ 內文吻合</span>';
                    html += `<div class="bot-cat-item" data-url="${exam.url}"
                        style="background:#fff;border:1px solid #ddd;border-radius:5px;padding:10px;margin-bottom:6px;cursor:pointer;">
                        <div><b>${idx + 1}. ${escapeHtml(exam.title)}</b></div>
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
                clearQuestionnaireWatch();
            }

            if (shouldAutoCloseCurrentPage()) {
                closeCurrentPageBestEffort();
                return;
            }

            autoHandleBlockingDialog();

            if (!window.__BOT_AUTH) return;

            const url = window.location.href;

            // 1. path tree - left toolbar with hang button (OLD STYLE)
            if (AUTO_HANG_ENABLED && url.includes('pathtree.php')) {
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
                        const readBridgeValue = (name) => {
                            const attr = name === 'ticket' ? 'data-bot-ticket' : 'data-bot-cid';
                            const documents = [document];
                            try { if (window.parent && window.parent.document) documents.push(window.parent.document); } catch (_error) {}
                            try { if (window.top && window.top.document && !documents.includes(window.top.document)) documents.push(window.top.document); } catch (_error) {}
                            for (const currentDocument of documents) {
                                const value = currentDocument.documentElement && currentDocument.documentElement.getAttribute(attr);
                                if (value) return value.trim();
                            }
                            return '';
                        };
                        const readUrlValue = (name) => {
                            try {
                                return new URL(window.location.href).searchParams.get(name) || '';
                            } catch (_error) {
                                return '';
                            }
                        };
                        let t = (typeof pTicket !== 'undefined' ? pTicket : '') || readBridgeValue('ticket') || readUrlValue('ticket');
                        let c = (typeof cid !== 'undefined' ? cid : '') || readBridgeValue('cid') || readUrlValue('cid');
                        if (t && c) {
                            const destination = `/mooc/index.php?ticket=${encodeURIComponent(t)}&cid=${encodeURIComponent(c)}`;
                            try { window.top.location.href = destination; } catch (_error) { window.location.href = destination; }
                        } else {
                            alert('找不到 ticket 或 cid');
                        }
                    };
                    document.body.appendChild(btn);
                }
            }

            // 2. hanging overlay with real-time clock
            if (AUTO_HANG_ENABLED && url.includes('mooc/index.php') && url.includes('ticket=')) {
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

            // 3. learn pages - track course context and result export
            startCourseContextTracking();
            initResultExportToolbar();
            initRecommendedCoursesBoard();

            // 4. exam page
            if (AUTO_EXAM_ENABLED) initExamToolbar();

            // 5. questionnaire
            if (QUESTIONNAIRE_AUTO_RUN && isQuestionnairePage() && getQuestionnaireState() === 'idle') {
                scheduleQuestionnaireAutoFill();
            }

            // 6. certificate download button on learn record page
            if (url.includes('learn_dashboard_ga.php')) {
                if (!document.getElementById('bot-cert-toolbar') && document.getElementById('form_print')) {
                    _setupCertificateDownloadButton();
                }
            }
        }

        window.__BOT_MAIN_LOOP = mainLoop;
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
    setTimeout(_chk, 150);

    // Re-check periodically
    setInterval(() => {
        GM_setValue('_b_t', 0);
        _chk();
    }, _ci);

})();
