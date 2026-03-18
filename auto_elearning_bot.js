
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
        const normalize = (s) => (s || '').replace(/[\s\u3000\t\n\r\u00a0"'.:;!?()\[\]{}<>《》「」【】、，。─]/g, '').toLowerCase();

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
                        if (pTxt) pTxt.innerText = `已下載 ${(e.loaded / 1024 / 1024).toFixed(1)} MB...`;
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

        // ---- one-click solver ----
        async function oneClickSolve() {
            const btn = document.getElementById('bot-btn-solve');
            if (btn) { btn.disabled = true; btn.innerText = '⏳ ...'; }

            const logArea = document.getElementById('bot-solver-log') || (() => {
                const d = document.createElement('div');
                d.id = 'bot-solver-log';
                Object.assign(d.style, {
                    position: 'fixed', bottom: '10px', right: '10px', width: '400px', maxHeight: '350px',
                    overflowY: 'auto', background: 'rgba(0,0,0,0.95)', color: '#eee', fontSize: '11px',
                    padding: '12px', borderRadius: '8px', zIndex: '999999', fontFamily: 'Consolas, monospace',
                    border: '1px solid #555', whiteSpace: 'pre-wrap'
                });
                document.body.appendChild(d);
                return d;
            })();

            const log = (msg) => {
                const p = document.createElement('div');
                p.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
                logArea.prepend(p);
            };

            log('🚀 開始作答...');

            try {
                if (!window.__BOT_DB) {
                    log('☁️ 下載題庫中...');
                    // Show full-screen progress overlay
                    let dlOverlay = document.getElementById('bot-dl-overlay');
                    if (!dlOverlay) {
                        dlOverlay = document.createElement('div');
                        dlOverlay.id = 'bot-dl-overlay';
                        Object.assign(dlOverlay.style, {
                            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                            background: 'rgba(0,0,0,0.7)', zIndex: '9999999',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                        });
                        dlOverlay.innerHTML = `
                            <div style="background:#fff;border-radius:16px;padding:40px 50px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,0.3);min-width:350px;">
                                <div style="font-size:40px;margin-bottom:10px;">☁️</div>
                                <div style="font-size:18px;font-weight:bold;margin-bottom:5px;">下載題庫中...</div>
                                <div id="bot-dl-text" style="font-size:14px;color:#666;margin-top:8px;">0 MB</div>
                            </div>`;
                        document.body.appendChild(dlOverlay);
                    }
                    const db = await loadDatabase(null);
                    if (dlOverlay) dlOverlay.remove();
                    if (!db) { log('❌ 題庫下載失敗'); return; }
                    log(`✅ 載入 ${window.__BOT_DB.length} 題`);
                }

                const dbIndex = {};
                window.__BOT_DB.forEach(item => {
                    const qKey = normalize(item.question);
                    if (qKey && !dbIndex[qKey]) dbIndex[qKey] = item;
                });
                log(`📚 索引 ${Object.keys(dbIndex).length} 條`);

                const pageQs = getPageQuestions();
                log(`📄 偵測到 ${pageQs.length} 題`);

                if (pageQs.length === 0) {
                    log('⚠️ 未偵測到題目！');
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
                        log(`❌ Q${i + 1}: 題庫無此題 - ${qObj.text.substring(0, 20)}...`);
                        continue;
                    }

                    const correctOpts = (dbItem.options || []).filter(o => o.correct).map(o => o.text);
                    let hit = false;

                    for (const pageOpt of qObj.options) {
                        let shouldSelect = false;
                        for (const ct of correctOpts) {
                            if (isTFMatch(pageOpt.label, ct) || isTextMatch(pageOpt.label, ct) || isTFMatch(pageOpt.input.value, ct)) {
                                shouldSelect = true; break;
                            }
                        }
                        if (shouldSelect) {
                            if (!pageOpt.input.checked) pageOpt.input.click();
                            hit = true;
                        }
                    }

                    if (hit) {
                        filled++;
                        qObj.element.style.background = '#d1e7dd';
                    } else {
                        qObj.element.style.background = '#fff3cd';
                        log(`⚠️ Q${i + 1}: 選項不符 DB:[${correctOpts.join('|')}] Page:[${qObj.options.map(o => o.label).join('|')}]`);
                    }
                }

                log(`🎉 完成！填寫 ${filled}/${pageQs.length}`);
                alert(`完成！共填寫 ${filled}/${pageQs.length} 題\n請人工檢查後再送出！`);

            } catch (e) {
                log(`Error: ${e.message}`);
                alert('Error: ' + e.message);
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = '⚡<br><span style="font-size:11px;">一鍵</span><br><span style="font-size:11px;">作答</span>'; }
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
                        idx.set(url, { title, url, questions: [], fullText: title.toLowerCase() });
                    }
                    const entry = idx.get(url);
                    entry.questions.push(item);
                    entry.fullText += ' ' + (item.question || '').toLowerCase();
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
                const qNorm = qRaw.toLowerCase().replace(/\s+/g, '');
                const results = [];
                EXAM_INDEX.forEach(exam => {
                    if (exam.fullText.replace(/\s+/g, '').includes(qNorm)) results.push(exam);
                });

                if (results.length === 0) {
                    resArea.innerHTML = `<div style="color:red;padding:10px;background:#fee;">❌ 找不到「${qRaw}」</div>`;
                    return;
                }

                results.sort((a, b) => {
                    const aT = a.title.toLowerCase(), bT = b.title.toLowerCase();
                    if (aT.includes(qNorm) && !bT.includes(qNorm)) return -1;
                    if (!aT.includes(qNorm) && bT.includes(qNorm)) return 1;
                    return 0;
                });

                if (results.length === 1) { renderExamQuestions(results[0]); return; }

                let html = `<div style="background:#fff3cd;padding:10px;margin-bottom:10px;border-radius:5px;">
                    <b>🔍 找到 ${results.length} 個相關測驗</b><br><small>請點選以查看：</small></div>`;
                results.forEach((exam, idx) => {
                    const note = exam.title.toLowerCase().replace(/\s+/g, '').includes(qNorm)
                        ? '<span style="color:green">● 標題吻合</span>'
                        : '<span style="color:#666">○ 內文吻合</span>';
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
        setInterval(() => {
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

                        // Real-time clock (not affected by tab switching)
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

                        // Punch every 10 seconds
                        setInterval(() => {
                            if (!window.__BOT_AUTH) return;
                            fetch("/mooc/controllers/course_record.php?actype=end", {
                                method: "POST", headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
                                body: `action=setReading&type=end&ticket=${ticket}&enCid=${cid}`
                            });
                        }, 10000);

                        // Stop button - use replace to prevent back-button returning to expired ticket
                        document.getElementById('bot-btn-stop-hang').onclick = () => {
                            window.location.replace('/mooc/user/learn_dashboard.php?tab=1');
                        };
                    }
                }
            }

            // 3. exam page
            if (url.includes('exam_start.php') && !url.includes('questionnaire')) {
                if (!document.getElementById('bot-exam-toolbar')) {
                    const toolbar = document.createElement('div');
                    toolbar.id = 'bot-exam-toolbar';
                    Object.assign(toolbar.style, {
                        position: 'fixed', top: '50%', left: '0', transform: 'translateY(-50%)',
                        zIndex: '9999999', display: 'flex', flexDirection: 'column', gap: '8px',
                        padding: '10px', background: 'rgba(0,0,0,0.85)', borderRadius: '0 12px 12px 0',
                        boxShadow: '2px 0 15px rgba(0,0,0,0.3)'
                    });

                    const btnSolve = document.createElement('button');
                    btnSolve.id = 'bot-btn-solve';
                    btnSolve.innerHTML = '⚡<br><span style="font-size:11px;">一鍵</span><br><span style="font-size:11px;">作答</span>';
                    Object.assign(btnSolve.style, {
                        width: '60px', height: '70px', border: 'none', borderRadius: '10px', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #6610f2 0%, #6f42c1 100%)',
                        color: '#fff', fontWeight: 'bold', fontSize: '18px',
                        transition: 'transform 0.2s', lineHeight: '1.2'
                    });
                    btnSolve.onmouseover = () => btnSolve.style.transform = 'scale(1.08)';
                    btnSolve.onmouseout = () => btnSolve.style.transform = 'scale(1)';
                    btnSolve.onclick = oneClickSolve;

                    const btnSearch = document.createElement('button');
                    btnSearch.id = 'bot-btn-manual';
                    btnSearch.innerHTML = '🔍<br><span style="font-size:11px;">手動</span><br><span style="font-size:11px;">搜尋</span>';
                    Object.assign(btnSearch.style, {
                        width: '60px', height: '70px', border: 'none', borderRadius: '10px', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #24292e 0%, #444d56 100%)',
                        color: '#fff', fontWeight: 'bold', fontSize: '18px',
                        transition: 'transform 0.2s', lineHeight: '1.2'
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
            }

            // 4. questionnaire
            if (url.includes('questionnaire')) {
                if (!window.__bot_q_filled && document.querySelector('input[type="radio"]')) {
                    window.__bot_q_filled = true;

                    const radios = document.querySelectorAll('input[type="radio"]');
                    const alreadyAnswered = Array.from(radios).some(r => r.checked);
                    if (alreadyAnswered) return;

                    window.alert = () => { }; window.confirm = () => true;
                    const groups = {};
                    radios.forEach(r => { if (!groups[r.name]) groups[r.name] = []; groups[r.name].push(r); });
                    for (let k in groups) {
                        const g = groups[k];
                        let t = g.find(r => r.value === 'C') || g[2] || g[g.length - 1];
                        if (t && !t.checked) t.click();
                    }
                    const checks = document.querySelectorAll('input[type="checkbox"]');
                    const cgroups = {};
                    checks.forEach(c => { if (!cgroups[c.name]) cgroups[c.name] = []; cgroups[c.name].push(c); });
                    for (let k in cgroups) {
                        cgroups[k].slice(0, 3).forEach(c => { if (!c.checked) c.click(); });
                    }
                    setTimeout(() => {
                        const btn = document.querySelector('input[type="submit"], button[type="submit"], input[value="送出"]');
                        if (btn) btn.click();
                    }, 500);
                }
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
        }, 1000);

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
            btn.innerHTML = '<span class="oac-icon">⚡</span><span class="oac-spinner"></span>快速開啟所有課程(記憶體不足多開會崩潰)';

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
