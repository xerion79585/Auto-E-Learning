// ==UserScript==
// @name         Auto E-Learning Bot (v14 - Test Full)
// @namespace    http://tampermonkey.net/
// @version      14.1-TEST
// @description  全功能測試版：自動掛網、一鍵作答(瘦身版題庫)、問卷填寫、手動搜尋(全域)
// @author       Shengyang
// @match        *://elearn.hrd.gov.tw/*
// @match        *://*.hrd.gov.tw/*
// @match        *://www.cp.gov.tw/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';
    console.log('[AutoBot-Test-Full] Init');

    // ★★★ GitHub Raw URL for remote testing (Optimized DB) ★★★
    const DB_URL_TEST = "https://raw.githubusercontent.com/xerion79585/Auto-E-Learning/main/test/questions_min.json";

    // Global State
    window.__BOT_DB = null;     // Array of [Q, A]
    window.__BOT_LOADING = false;
    window.__bot_q_filled = false;

    // String Normalization Helpers
    const TRUE_VALS = ['○', 'o', 'v', '是', 'true', 'correct', '對', '圈', 'right', '正確', 't'];
    const FALSE_VALS = ['╳', 'x', '✕', '否', 'false', 'incorrect', 'wrong', '錯', '叉', '錯誤', 'f'];
    const normalize = (s) => (s || '').replace(/[\s\u3000\t\n\r\u00a0"'.:;!?()\[\]{}<>《》「」【】、，。─]/g, '').toLowerCase();

    function isTFMatch(a, b) {
        const aN = normalize(a), bN = normalize(b);
        if (aN === bN) return true;
        if (TRUE_VALS.includes(aN) && TRUE_VALS.includes(bN)) return true;
        if (FALSE_VALS.includes(aN) && FALSE_VALS.includes(bN)) return true;
        return false;
    }

    function isTextMatch(a, b) {
        // a: option text, b: answer text
        const aN = normalize(a), bN = normalize(b);
        if (!aN || !bN) return false;
        if (aN === bN) return true;
        // Fuzzy match: if enough length, check inclusion
        if (aN.length > 2 && bN.length > 2 && (aN.includes(bN) || bN.includes(aN))) return true;
        return false;
    }

    // Database Loader
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
            if (statusEl) statusEl.innerHTML = `<div style="color:blue">☁️ 下載瘦身版題庫 (約 11MB)...</div>`;

            GM_xmlhttpRequest({
                method: "GET", url: DB_URL_TEST, responseType: "json",
                onprogress: (e) => {
                    if (statusEl) {
                        if (e.lengthComputable) {
                            const pct = Math.floor((e.loaded / e.total) * 100);
                            statusEl.innerHTML = `<div style="color:blue">☁️ 下載中... ${pct}% (${(e.loaded / 1024 / 1024).toFixed(1)}MB / ${(e.total / 1024 / 1024).toFixed(1)}MB)</div>`;
                        } else {
                            statusEl.innerHTML = `<div style="color:blue">☁️ 下載中... ${(e.loaded / 1024 / 1024).toFixed(1)}MB</div>`;
                        }
                    }
                },
                onload: (response) => {
                    try {
                        let json = response.response;
                        if (typeof json === 'string') json = JSON.parse(json);
                        window.__BOT_DB = json; // Array of [q, a]
                        console.log(`[AutoBot] DB Loaded: ${json.length} items`);
                        if (statusEl) statusEl.innerHTML = `<div style="color:green">✅ 載入成功 (${json.length} 題)</div>`;
                        resolve(json);
                    } catch (err) {
                        if (statusEl) statusEl.innerHTML = `<div style="color:red">❌ 錯誤: ${err.message}</div>`;
                        resolve(null);
                    } finally { window.__BOT_LOADING = false; }
                },
                onerror: (e) => {
                    if (statusEl) statusEl.innerHTML = `<div style="color:red">❌ 下載失敗</div>`;
                    window.__BOT_LOADING = false; resolve(null);
                }
            });
        });
    }

    // -------------------------------------------------------------
    // Feature 1: Manual Search Panel (Global Search)
    // -------------------------------------------------------------
    function setupSearchPanel() {
        if (document.getElementById('bot-exam-panel')) return;

        document.body.style.marginLeft = '450px';
        const panel = document.createElement('div');
        panel.id = 'bot-exam-panel';
        Object.assign(panel.style, {
            position: 'fixed', top: '0', left: '0', width: '430px', height: '100%',
            background: '#f8f9fa', borderRight: '1px solid #ddd', padding: '15px',
            boxSizing: 'border-box', overflowY: 'auto', zIndex: '999999',
            fontFamily: 'sans-serif', textAlign: 'left',
            boxShadow: '2px 0 10px rgba(0,0,0,0.1)'
        });
        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h3 style="margin:0;">📖 題庫搜尋 (全域)</h3>
                <button id="bot-close-panel" style="background:none;border:none;font-size:20px;cursor:pointer;">&times;</button>
            </div>
            <div style="margin-bottom:10px;">
                <input type="text" id="bot-input-q" style="width:100%;padding:10px;font-size:14px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;" placeholder="輸入題目或答案關鍵字...">
                <button id="bot-btn-search" style="width:100%;margin-top:5px;padding:8px;background:#24292e;color:#fff;border:none;cursor:pointer;border-radius:4px;">開始搜尋</button>
            </div>
            <div id="bot-res-area" style="font-size:13px;line-height:1.6;"></div>
        `;
        document.body.appendChild(panel);

        document.getElementById('bot-close-panel').onclick = () => {
            panel.style.display = 'none';
            document.body.style.marginLeft = '0';
        };

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

        async function doSearch(qRaw) {
            const resArea = document.getElementById('bot-res-area');
            if (!qRaw) { resArea.innerHTML = ''; return; }

            // Ensure DB loaded
            if (!window.__BOT_DB) {
                const statusDiv = document.createElement('div');
                resArea.innerHTML = '';
                resArea.appendChild(statusDiv);
                await loadDatabase(statusDiv);
                if (!window.__BOT_DB) return;
            }

            resArea.innerHTML = '<div style="color:blue">🔍 搜尋中...</div>';

            // Search logic: simple substring match
            const kw = normalize(qRaw);
            if (kw.length < 2) {
                resArea.innerHTML = '<div style="color:red">⚠️ 關鍵字太短，請輸入至少2個字</div>';
                return;
            }

            const results = [];
            // Limit results to 50 to avoid freezing UI
            for (let i = 0; i < window.__BOT_DB.length; i++) {
                const item = window.__BOT_DB[i]; // [Q, A]
                const q = normalize(item[0]);
                const a = normalize(item[1]);
                if (q.includes(kw) || a.includes(kw)) {
                    results.push(item);
                    if (results.length >= 50) break;
                }
            }

            if (results.length === 0) {
                resArea.innerHTML = `<div style="color:red;padding:10px;background:#fee;">❌ 找不到「${qRaw}」</div>`;
                return;
            }

            let html = `<div style="background:#d1e7dd;padding:8px;margin-bottom:10px;border-radius:4px;">
                <b>🔍 找到 ${results.length} 筆資料</b> (最多顯示50筆)
            </div>`;

            results.forEach((item, idx) => {
                // Formatting answer: replace separator with newline or bullet
                const ansDisplay = item[1].replace(/ \/\/\/ /g, '<br>• ');

                html += `<div class="bot-q-card" style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-bottom:10px;">
                    <div style="font-weight:bold;color:#1f2937;margin-bottom:6px;">Q: ${item[0]}</div>
                    <div style="color:#059669;font-weight:bold;">答案：${ansDisplay.includes('<br>') ? '<br>• ' + ansDisplay : ansDisplay}</div>
                </div>`;
            });
            resArea.innerHTML = html;
        }

        document.getElementById('bot-btn-search').onclick = () => doSearch(document.getElementById('bot-input-q').value.trim());
        document.getElementById('bot-input-q').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') doSearch(e.target.value.trim());
        });
    }


    // -------------------------------------------------------------
    // Feature 2: One-Click Solver
    // -------------------------------------------------------------
    // (Helper: Parse Questions from Page)
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
            let qText = clone.innerText.trim().replace(/^\d+[\.\s、]+\s*/, '');
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
                    if (span) labelText = span.innerText.trim();
                    if (!labelText) labelText = li.textContent.trim();
                }
                options.push({ input, label: labelText });
            }
            if (options.length > 0) questions.push({ text: qText, element: row, options });
        }
        return questions;
    }

    async function oneClickSolve() {
        const btn = document.getElementById('bot-btn-solve');
        if (btn) { btn.disabled = true; btn.innerText = '⏳ ...'; }

        // Create log area
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

        log('🚀 [Test] 開始作答...');

        try {
            if (!window.__BOT_DB) {
                const statusDiv = document.createElement('div');
                statusDiv.style.marginBottom = '5px';
                logArea.prepend(statusDiv);
                await loadDatabase(statusDiv);
                if (!window.__BOT_DB) throw new Error("無題庫下載失敗");
            }

            // Build simplified index
            const dbIndex = {};
            window.__BOT_DB.forEach(item => {
                const qKey = normalize(item[0]);
                if (qKey && !dbIndex[qKey]) dbIndex[qKey] = item[1];
            });
            log(`📚 索引建置完成 (${window.__BOT_DB.length} 題)`);

            const pageQs = getPageQuestions();
            log(`📄 偵測到 ${pageQs.length} 題`);

            if (pageQs.length === 0) {
                alert('未偵測到題目！請確認頁面載入完全。');
                return;
            }

            let filled = 0;
            for (let i = 0; i < pageQs.length; i++) {
                const qObj = pageQs[i];
                const qNorm = normalize(qObj.text);

                // Find answer in DB
                let dbAns = dbIndex[qNorm] || null;
                if (!dbAns) {
                    for (const k in dbIndex) {
                        if (k.includes(qNorm) || qNorm.includes(k)) { dbAns = dbIndex[k]; break; }
                    }
                }

                if (!dbAns) {
                    qObj.element.style.background = '#f8d7da'; // Red
                    continue;
                }

                // Match options
                let hit = false;
                for (const pageOpt of qObj.options) {
                    if (isTFMatch(pageOpt.label, dbAns) || isTextMatch(pageOpt.label, dbAns) || isTFMatch(pageOpt.input.value, dbAns)) {
                        if (!pageOpt.input.checked) pageOpt.input.click();
                        hit = true;
                    }
                }

                if (hit) {
                    filled++;
                    qObj.element.style.background = '#d1e7dd'; // Green
                } else {
                    qObj.element.style.background = '#fff3cd'; // Yellow (Known Q, but fail to match opt)
                    log(`⚠️ Q${i + 1} 答案"${dbAns}" 無法匹配選項`);
                }
            }
            alert(`完成！共填寫 ${filled}/${pageQs.length} 題`);

        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '⚡<br><span style="font-size:11px;">一鍵</span><br><span style="font-size:11px;">作答</span>'; }
        }
    }


    // -------------------------------------------------------------
    // Feature 3: Hang Button (Legacy Floating)
    // -------------------------------------------------------------
    function setupHangButton() {
        if (window.location.href.includes('pathtree.php')) {
            if (!document.getElementById('bot-btn-hang')) {
                const btn = document.createElement('button');
                btn.id = 'bot-btn-hang';
                btn.innerHTML = '▶ 開始掛網';
                Object.assign(btn.style, {
                    position: 'fixed', top: '15px', right: '15px', zIndex: '999999', padding: '8px',
                    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                    color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)', fontWeight: 'bold', fontSize: '13px'
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
        // Overlay Logic
        if (window.location.href.includes('mooc/index.php') && window.location.href.includes('ticket=')) {
            if (!document.getElementById('bot-hang-overlay')) {
                const params = new URLSearchParams(window.location.search);
                const ticket = params.get('ticket'), cid = params.get('cid');
                if (ticket && cid) {
                    const div = document.createElement('div');
                    div.id = 'bot-hang-overlay';
                    div.innerHTML = `
                            <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#fff;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                                <h1 style="color:#28a745;">執行中...</h1>
                                <p>每10秒自動打卡</p>
                                <div id="bot-timer-display" style="font-size:3rem;font-weight:bold;">00:00:00</div>
                                <button id="bot-btn-stop-hang" style="margin-top:20px;padding:10px 20px;font-size:14px;cursor:pointer;border:1px solid #ccc;border-radius:8px;background:#f8f9fa;">結束掛網</button>
                            </div>
                        `;
                    document.body.appendChild(div);

                    const startTime = Date.now();
                    setInterval(() => {
                        const elapsed = Math.floor((Date.now() - startTime) / 1000);
                        const h = Math.floor(elapsed / 3600);
                        const m = Math.floor((elapsed % 3600) / 60);
                        const s = elapsed % 60;
                        const d = document.getElementById('bot-timer-display');
                        if (d) d.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    }, 1000);

                    setInterval(() => {
                        fetch("/mooc/controllers/course_record.php?actype=end", {
                            method: "POST", headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
                            body: `action=setReading&type=end&ticket=${ticket}&enCid=${cid}`
                        });
                    }, 10000);

                    document.getElementById('bot-btn-stop-hang').onclick = () => {
                        window.location.replace('/mooc/user/learn_dashboard.php?tab=1');
                    };
                }
            }
        }
    }

    // -------------------------------------------------------------
    // Feature 4: Questionnaire
    // -------------------------------------------------------------
    function autoFillQuestionnaire() {
        if (window.location.href.includes('questionnaire')) {
            if (!window.__bot_q_filled && document.querySelector('input[type="radio"]')) {
                window.__bot_q_filled = true;
                // Disable alerts
                window.alert = () => { };
                window.confirm = () => true;

                const radios = document.querySelectorAll('input[type="radio"]');
                const alreadyAnswered = Array.from(radios).some(r => r.checked);
                if (alreadyAnswered) return;

                const groups = {};
                radios.forEach(r => { if (!groups[r.name]) groups[r.name] = []; groups[r.name].push(r); });
                for (let k in groups) {
                    const g = groups[k];
                    // Select 'Very Satisfied' (usually last or first) - User logic: choose 'C' or 3rd or last
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
    }


    // -------------------------------------------------------------
    // Main Loop
    // -------------------------------------------------------------
    setInterval(() => {
        setupHangButton();
        autoFillQuestionnaire();

        // Exam Toolbar
        if (window.location.href.includes('exam_start.php') && !window.location.href.includes('questionnaire')) {
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
                btnSearch.onclick = () => {
                    const panel = document.getElementById('bot-exam-panel');
                    if (panel) {
                        panel.style.display = (panel.style.display === 'none') ? 'block' : 'none';
                        document.body.style.marginLeft = (panel.style.display === 'block') ? '450px' : '0';
                    } else {
                        setupSearchPanel();
                    }
                };

                toolbar.appendChild(btnSolve);
                toolbar.appendChild(btnSearch);
                document.body.appendChild(toolbar);
            }
        }
    }, 1000);

})();
