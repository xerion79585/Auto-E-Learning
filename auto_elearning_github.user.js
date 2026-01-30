// ==UserScript==
// @name         Auto E-Learning Bot (v13 - GitHub Edition)
// @namespace    http://tampermonkey.net/
// @version      13.1
// @description  自動掛網、GitHub極速題庫搜尋 (仿v12操作邏輯)、自動填寫問卷
// @author       Shengyang
// @match        *://elearn.hrd.gov.tw/*
// @match        *://*.hrd.gov.tw/*
// @grant        GM_xmlhttpRequest
// @match        *://www.cp.gov.tw/*
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';
    console.log('[AutoBot v13.1] Init');

    // ==========================================
    // Config
    // ==========================================
    // 你的 GitHub Raw JSON 連結
    const DB_URL = "https://raw.githubusercontent.com/xerion79585/Auto-E-Learning/main/questions.json";

    // Global Cache
    window.__BOT_DB = null;
    window.__BOT_LOADING = false;

    if (window.getAttribute && window.getAttribute('data-bot-loaded')) return;
    if (window.document && window.document.body) window.document.body.setAttribute('data-bot-loaded', 'true');

    // ==========================================
    // Helper Functions
    // ==========================================
    function createOverlay(id, html) {
        if (document.getElementById(id)) return null;
        const div = document.createElement('div');
        div.id = id;
        div.innerHTML = html;
        document.body.appendChild(div);
        return div;
    }

    // Load Database (with progress for user)
    function loadDatabase(statusDiv) {
        return new Promise((resolve) => {
            if (window.__BOT_DB) {
                resolve(window.__BOT_DB);
                return;
            }
            if (window.__BOT_LOADING) {
                // Simple polling if already loading
                const check = setInterval(() => {
                    if (window.__BOT_DB) {
                        clearInterval(check);
                        resolve(window.__BOT_DB);
                    }
                }, 200);
                return;
            }

            window.__BOT_LOADING = true;
            statusDiv.innerHTML = `
                <div style="color:blue;margin-bottom:5px;">☁️ 準備下載題庫 (約 55MB)...</div>
                <div style="width:100%;background:#eee;border-radius:4px;height:10px;overflow:hidden;">
                    <div id="bot-dl-progress" style="width:0%;height:100%;background:#28a745;transition:width 0.2s;"></div>
                </div>
                <div id="bot-dl-text" style="font-size:11px;color:#666;text-align:right;">0%</div>
            `;

            console.log('[AutoBot] Fetching DB from:', DB_URL);

            GM_xmlhttpRequest({
                method: "GET",
                url: DB_URL,
                responseType: "json", // Auto parse JSON
                onprogress: (e) => {
                    if (e.lengthComputable) {
                        const pct = Math.floor((e.loaded / e.total) * 100);
                        const pBar = document.getElementById('bot-dl-progress');
                        const pTxt = document.getElementById('bot-dl-text');
                        if (pBar) pBar.style.width = pct + '%';
                        if (pTxt) pTxt.innerText = `${pct}% (${(e.loaded / 1024 / 1024).toFixed(1)}MB / ${(e.total / 1024 / 1024).toFixed(1)}MB)`;
                    } else {
                        // Fallback if no total size
                        const mb = (e.loaded / 1024 / 1024).toFixed(1);
                        const pTxt = document.getElementById('bot-dl-text');
                        if (pTxt) pTxt.innerText = `已下載 ${mb} MB...`;
                    }
                },
                onload: (response) => {
                    try {
                        let json = response.response;
                        // Fallback parse if responseType didn't work (Tampermonkey version dependent)
                        if (typeof json === 'string') {
                            json = JSON.parse(json);
                        }

                        window.__BOT_DB = json;
                        console.log(`[AutoBot] DB Loaded: ${json.length} items`);
                        statusDiv.innerHTML = `<div style="color:green">✅ 題庫下載完成 (共 ${json.length} 題) / 準備建立索引...</div>`;
                        setTimeout(() => resolve(json), 100); // Give UI a moment to update
                    } catch (err) {
                        console.error(err);
                        statusDiv.innerHTML = `<div style="color:red">❌ 解析失敗: ${err.message}</div>`;
                        resolve(null);
                    } finally {
                        window.__BOT_LOADING = false;
                    }
                },
                onerror: (err) => {
                    console.error(err);
                    statusDiv.innerHTML = `<div style="color:red">❌ 下載失敗: 網路錯誤</div>`;
                    window.__BOT_LOADING = false;
                    resolve(null);
                }
            });
        });
    }

    // ==========================================
    // Main Loop
    // ==========================================
    setInterval(() => {
        const url = window.location.href;

        // 1. Path Tree
        if (url.includes('pathtree.php')) {
            if (!document.getElementById('bot-btn-hang')) {
                const btn = document.createElement('button');
                btn.id = 'bot-btn-hang';
                btn.innerHTML = '▶ 開始掛網 (v13)';
                Object.assign(btn.style, {
                    position: 'fixed', top: '15px', right: '15px',
                    zIndex: '999999', padding: '10px 20px',
                    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                    color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(56, 239, 125, 0.4)',
                    fontWeight: 'bold', fontSize: '14px'
                });
                btn.onclick = () => {
                    if (typeof pTicket !== 'undefined' && typeof cid !== 'undefined') {
                        window.parent.parent.location.href = `/mooc/index.php?ticket=${pTicket}&cid=${cid}`;
                    } else {
                        let t = window.pTicket || (window.parent && window.parent.pTicket);
                        let c = window.cid || (window.parent && window.parent.cid);
                        if (t && c) {
                            window.parent.parent.location.href = `/mooc/index.php?ticket=${t}&cid=${c}`;
                        } else {
                            alert('找不到 ticket 或 cid，請確認課程頁面已完全載入。');
                        }
                    }
                };
                document.body.appendChild(btn);
            }
        }

        // 2. Hanging Overlay
        if (url.includes('mooc/index.php') && url.includes('ticket=')) {
            if (!document.getElementById('bot-hang-overlay')) {
                const params = new URLSearchParams(window.location.search);
                const ticket = params.get('ticket');
                const cid = params.get('cid');
                if (ticket && cid) {
                    createOverlay('bot-hang-overlay', `
                        <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#fff;z-index:999999;flex-direction:column;align-items:center;justify-content:center;display:flex;">
                            <h1 style="color:#28a745;">Running (GitHub)...</h1>
                            <p>掛網中，每10秒自動打卡</p>
                            <div id="bot-timer-display" style="font-size:3rem;font-weight:bold;">00:00</div>
                            <button onclick="window.location.href='/mooc/user/learn_dashboard.php?tab=1'" style="margin-top:20px;padding:10px 20px;">結束掛網</button>
                        </div>
                    `);
                    let sec = 0;
                    setInterval(() => {
                        fetch("/mooc/controllers/course_record.php?actype=end", {
                            method: "POST", headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
                            body: `action=setReading&type=end&ticket=${ticket}&enCid=${cid}`
                        }).then(() => {
                            sec += 10;
                            const d = document.getElementById('bot-timer-display');
                            if (d) d.innerText = `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
                        });
                    }, 10000);
                }
            }
        }

        // 3. Exam Logic (v13.2 - True Exam Grouping)
        if (url.includes('exam_start.php') && !url.includes('questionnaire')) {
            if (!document.getElementById('bot-exam-panel')) {
                document.body.style.marginLeft = '450px';
                const panel = document.createElement('div');
                panel.id = 'bot-exam-panel';
                Object.assign(panel.style, {
                    position: 'fixed', top: '0', left: '0', width: '430px', height: '100%',
                    background: '#f8f9fa', borderRight: '1px solid #ddd', padding: '15px',
                    boxSizing: 'border-box', overflowY: 'auto', zIndex: '999999',
                    fontFamily: 'sans-serif', textAlign: 'left'
                });

                panel.innerHTML = `
                    <h3 style="margin:0 0 10px 0;">GitHub 題庫 (v13.2)</h3>
                    <div style="margin-bottom:10px;">
                        <input type="text" id="bot-input-q" style="width:100%;padding:10px;font-size:14px;border:1px solid #ccc;border-radius:4px;" placeholder="輸入測驗名稱或題目關鍵字...">
                        <button id="bot-btn-search" style="width:100%;margin-top:5px;padding:8px;background:#24292e;color:#fff;border:none;cursor:pointer;border-radius:4px;">🔍 搜尋測驗</button>
                    </div>
                    <div id="bot-res-area" style="font-size:13px;line-height:1.6;"></div>
                `;
                document.body.appendChild(panel);

                // --- Global vars for this scope ---
                let EXAM_INDEX = null; // Map<URL, {title, questions: [], tags: string}>

                // Build Index (Group by URL)
                function buildIndex(db) {
                    const idx = new Map();
                    db.forEach(item => {
                        const url = item.source_url || 'UNKNOWN';
                        if (!idx.has(url)) {
                            let title = (item.category && item.category !== '未命名測驗') ? item.category : '未命名測驗';
                            // If title is generic, try to append ID for distinction
                            if (title === '未命名測驗' && url !== 'UNKNOWN') {
                                const m = url.match(/post\/(\d+)/);
                                if (m) title += ` (${m[1]})`;
                            }

                            idx.set(url, {
                                title: title,
                                url: url,
                                questions: [],
                                fullText: title.toLowerCase() // Search cache
                            });
                        }
                        const entry = idx.get(url);
                        entry.questions.push(item);
                        // Add question text to search cache
                        entry.fullText += ' ' + (item.question || '').toLowerCase();
                    });
                    console.log(`[AutoBot] Index Built: ${idx.size} exams`);
                    return idx;
                }

                // Auto Search
                setTimeout(() => {
                    let title = '';
                    const h = document.querySelector('h1, h2, .title') || document.querySelector('td.title');
                    if (h) title = h.innerText.trim();
                    if (title) {
                        title = title.replace(/^測驗：/, '').trim();
                        document.getElementById('bot-input-q').value = title;
                        document.getElementById('bot-btn-search').click();
                    }
                }, 1000);

                // --- Function: Render specific exam questions ---
                function renderExamQuestions(examObj) {
                    const r = document.getElementById('bot-res-area');

                    let html = `
                        <div style="background:#d4edda;padding:10px;margin-bottom:10px;border-radius:5px;">
                            <b>📚 ${examObj.title}</b><br>
                            <small>共 ${examObj.questions.length} 題</small>
                            <button id="bot-back-btn" style="float:right;padding:2px 8px;font-size:11px;cursor:pointer;">↩ 返回列表</button>
                        </div>
                        <div style="margin-bottom:10px;position.sticky;top:0;background:#f8f9fa;padding-bottom:5px;z-index:10;">
                             <input type="text" id="bot-quick-search" placeholder="🔍 在此題庫內搜尋..." 
                                    style="width:100%;padding:8px;font-size:13px;border:1px solid #ccc;border-radius:4px;">
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

                        html += `
                            <div class="bot-q-card" style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-bottom:10px;">
                                <div style="font-weight:bold;color:#1f2937;margin-bottom:8px;">Q${i + 1}: ${item.question}</div>
                                ${ansHtml}
                            </div>
                        `;
                    });
                    html += `</div>`;

                    r.innerHTML = html;

                    // Back Button
                    document.getElementById('bot-back-btn').onclick = () => {
                        // Trigger search again to show list (simple caching)
                        const lastQ = document.getElementById('bot-input-q').value;
                        doSearch(lastQ);
                    };

                    // Quick Search Logic
                    const qInput = document.getElementById('bot-quick-search');
                    const qList = document.getElementById('bot-answer-list');

                    function doQuickFilter(kw) {
                        const cards = qList.querySelectorAll('.bot-q-card');
                        kw = kw.toLowerCase().trim();
                        let first = null;
                        cards.forEach(card => {
                            const txt = card.innerText.toLowerCase();
                            if (!kw || txt.includes(kw)) {
                                card.style.display = 'block';
                                if (kw && !first) first = card;
                                if (kw) card.style.background = '#fef3c7';
                                else card.style.background = '#fff';
                            } else {
                                card.style.display = 'none';
                            }
                        });
                        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }

                    qInput.addEventListener('input', (e) => doQuickFilter(e.target.value));

                    document.onmouseup = (e) => {
                        if (e.target.closest('#bot-exam-panel')) return;
                        const sel = window.getSelection().toString().trim();
                        if (sel && sel.length > 1) {
                            qInput.value = sel;
                            doQuickFilter(sel);
                        }
                    };
                }

                // --- Search Logic ---
                async function doSearch(qRaw) {
                    const resArea = document.getElementById('bot-res-area');

                    // 1. Ensure DB
                    if (!window.__BOT_DB) {
                        const db = await loadDatabase(resArea);
                        if (!db) return;
                    }

                    // 2. Build Index if needed
                    if (!EXAM_INDEX) {
                        resArea.innerHTML += '<div>⚙️ 正在建立索引...</div>';
                        // Yield to UI
                        await new Promise(r => setTimeout(r, 10));
                        EXAM_INDEX = buildIndex(window.__BOT_DB);
                    }

                    if (!qRaw) {
                        resArea.innerHTML = '';
                        return;
                    }

                    resArea.innerHTML = '<div style="color:blue">🔍 搜尋中...</div>';
                    const qNorm = qRaw.toLowerCase().replace(/\s+/g, '');

                    // 3. Search Index
                    const results = [];
                    EXAM_INDEX.forEach((exam) => {
                        // Search in pre-built fullText (Title + Questions)
                        if (exam.fullText.replace(/\s+/g, '').includes(qNorm)) {
                            results.push(exam);
                        }
                    });

                    if (results.length === 0) {
                        resArea.innerHTML = `<div style="color:red;padding:10px;background:#fee;">❌ 找不到符合「${qRaw}」的測驗</div>`;
                        return;
                    }

                    // Sort by relevance? (Exact title match first)
                    results.sort((a, b) => {
                        const aTitle = a.title.toLowerCase();
                        const bTitle = b.title.toLowerCase();
                        if (aTitle.includes(qNorm) && !bTitle.includes(qNorm)) return -1;
                        if (!aTitle.includes(qNorm) && bTitle.includes(qNorm)) return 1;
                        return 0;
                    });

                    // Auto-open if 1 result
                    if (results.length === 1) {
                        renderExamQuestions(results[0]);
                        return;
                    }

                    // Render List
                    let html = `<div style="background:#fff3cd;padding:10px;margin-bottom:10px;border-radius:5px;">
                                <b>🔍 找到 ${results.length} 個相關測驗</b><br>
                                <small>請點選以查看完整題庫：</small>
                                </div>`;

                    results.forEach((exam, idx) => {
                        // Highlight match type
                        let note = '';
                        if (exam.title.toLowerCase().replace(/\s+/g, '').includes(qNorm)) {
                            note = '<span style="color:green">● 標題吻合</span>';
                        } else {
                            note = '<span style="color:#666">○ 內文吻合</span>';
                        }

                        html += `
                            <div class="bot-cat-item" data-url="${exam.url}"
                                 style="background:#fff;border:1px solid #ddd;border-radius:5px;padding:10px;margin-bottom:6px;cursor:pointer;transition:background 0.2s;">
                                <div><span style="color:#333;font-weight:bold;">${idx + 1}. ${exam.title}</span></div>
                                <div style="font-size:11px;color:#666;margin-top:3px;display:flex;justify-content:space-between;">
                                    <span>${exam.questions.length} 題</span>
                                    <span>${note}</span>
                                </div>
                            </div>
                         `;
                    });
                    resArea.innerHTML = html;

                    resArea.querySelectorAll('.bot-cat-item').forEach(el => {
                        el.onclick = () => {
                            const u = el.dataset.url;
                            renderExamQuestions(EXAM_INDEX.get(u));
                        };
                    });
                }

                document.getElementById('bot-btn-search').onclick = () => {
                    doSearch(document.getElementById('bot-input-q').value.trim());
                };
            }
        }

        // 4. Questionnaire
        if (url.includes('questionnaire')) {
            if (!window.__bot_q_filled && document.querySelector('input[type="radio"]')) {
                window.__bot_q_filled = true;
                window.alert = () => { }; window.confirm = () => true;
                const radios = document.querySelectorAll('input[type="radio"]');
                const groups = {};
                radios.forEach(r => { if (!groups[r.name]) groups[r.name] = []; groups[r.name].push(r); });
                for (let k in groups) {
                    const g = groups[k];
                    let t = g.find(r => r.value === 'C') || g[2] || g[g.length - 1];
                    if (t) t.click();
                }
                const checks = document.querySelectorAll('input[type="checkbox"]');
                const cgroups = {};
                checks.forEach(c => { if (!cgroups[c.name]) cgroups[c.name] = []; cgroups[c.name].push(c); });
                for (let k in cgroups) {
                    cgroups[k].slice(0, 3).forEach(c => c.click());
                }
                setTimeout(() => {
                    const btn = document.querySelector('input[type="submit"], button[type="submit"], input[value="送出"]');
                    if (btn) btn.click();
                }, 1500);
            }
        }
    }, 1000);

})();
