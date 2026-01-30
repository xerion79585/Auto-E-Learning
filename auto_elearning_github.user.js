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
    async function loadDatabase(statusDiv) {
        if (window.__BOT_DB) return window.__BOT_DB;
        if (window.__BOT_LOADING) {
            while (window.__BOT_LOADING) await new Promise(r => setTimeout(r, 200));
            return window.__BOT_DB;
        }

        window.__BOT_LOADING = true;
        if (statusDiv) statusDiv.innerHTML = '<div style="color:blue">☁️ 正在連線 GitHub (約 50MB)...<br>第一次會比較久，請稍候</div>';

        try {
            console.log('[AutoBot] Fetching DB from:', DB_URL);
            const resp = await fetch(DB_URL);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json();
            window.__BOT_DB = json;
            console.log(`[AutoBot] DB Loaded: ${json.length} items`);
            if (statusDiv) statusDiv.innerHTML = `<div style="color:green">✅ 題庫下載完成 (共 ${json.length} 題)</div>`;
            return json;
        } catch (e) {
            console.error(e);
            if (statusDiv) statusDiv.innerHTML = `<div style="color:red">❌ GitHub 連線失敗: ${e.message}</div>`;
            return null;
        } finally {
            window.__BOT_LOADING = false;
        }
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

        // 3. Exam Logic (v13 - Replicating v12 UX)
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
                    <h3 style="margin:0 0 10px 0;">GitHub 題庫 (v13)</h3>
                    <div style="margin-bottom:10px;">
                        <input type="text" id="bot-input-q" style="width:100%;padding:10px;font-size:14px;border:1px solid #ccc;border-radius:4px;" placeholder="輸入測驗名稱...">
                        <button id="bot-btn-search" style="width:100%;margin-top:5px;padding:8px;background:#24292e;color:#fff;border:none;cursor:pointer;border-radius:4px;">🔍 搜尋測驗</button>
                    </div>
                    <div id="bot-res-area" style="font-size:13px;line-height:1.6;"></div>
                `;
                document.body.appendChild(panel);

                // Auto Search on Open
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
                function renderExamQuestions(questions, examTitle) {
                    const r = document.getElementById('bot-res-area');

                    let html = `
                        <div style="background:#d4edda;padding:10px;margin-bottom:10px;border-radius:5px;">
                            <b>📚 ${examTitle}</b><br>
                            <small>共 ${questions.length} 題</small>
                            <button id="bot-back-btn" style="float:right;padding:2px 8px;font-size:11px;cursor:pointer;">↩ 返回</button>
                        </div>
                        <div style="margin-bottom:10px;position:sticky;top:0;background:#f8f9fa;padding-bottom:5px;z-index:10;">
                             <input type="text" id="bot-quick-search" placeholder="🔍 在此頁面內搜尋..." 
                                    style="width:100%;padding:8px;font-size:13px;border:1px solid #ccc;border-radius:4px;">
                        </div>
                        <div id="bot-answer-list">
                    `;

                    questions.forEach((item, i) => {
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
                        document.getElementById('bot-btn-search').click(); // Re-trigger search to show list
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
                                if (kw) card.style.background = '#fef3c7'; // Highlight
                                else card.style.background = '#fff';
                            } else {
                                card.style.display = 'none';
                            }
                        });
                        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }

                    qInput.addEventListener('input', (e) => doQuickFilter(e.target.value));

                    // Text Selection Listener
                    document.onmouseup = (e) => {
                        if (e.target.closest('#bot-exam-panel')) return; // Ignore clicks inside panel
                        const sel = window.getSelection().toString().trim();
                        if (sel && sel.length > 1) {
                            qInput.value = sel;
                            doQuickFilter(sel);
                        }
                    };
                }

                // --- Search Button Logic ---
                document.getElementById('bot-btn-search').onclick = async () => {
                    const qRaw = document.getElementById('bot-input-q').value.trim();
                    const resArea = document.getElementById('bot-res-area');

                    // 1. Ensure DB loaded
                    if (!window.__BOT_DB) {
                        const success = await loadDatabase(resArea);
                        if (!success) return;
                    }

                    if (!qRaw) return;
                    const qNorm = qRaw.toLowerCase().replace(/\s+/g, '');
                    const db = window.__BOT_DB;

                    resArea.innerHTML = '<div style="color:blue">🔍 搜尋中...</div>';

                    // 2. Group by Category (Exam Title)
                    // We scan the DB to find unique matched categories
                    const matches = new Map(); // Title -> [Questions]

                    // Optimizations: Limit verify count if DB is huge? No, JS filter is fast enough for 50MB json usually.
                    db.forEach(item => {
                        const cat = (item.category || '未分類').trim();
                        const catNorm = cat.toLowerCase().replace(/\s+/g, '');

                        // Check if Category matches Query
                        let isMatch = false;
                        if (catNorm.includes(qNorm)) isMatch = true;

                        // Bonus: If query matches question text, also include that exam?
                        // User said "Search Exam Title" implies category search, but v12 also found posts by content.
                        // Let's stick to category match primarily for grouping, but maybe add question match support?
                        // If we do question match, we might get too many disparate categories.
                        // Let's try strictly Category first.

                        if (isMatch) {
                            if (!matches.has(cat)) matches.set(cat, []);
                            matches.get(cat).push(item);
                        }
                    });

                    // If strict category search failed, try looser search (question text match)
                    if (matches.size === 0) {
                        db.forEach(item => {
                            const qText = (item.question || '').toLowerCase();
                            if (qText.includes(qNorm)) {
                                const cat = (item.category || '未分類').trim();
                                if (!matches.has(cat)) matches.set(cat, []);
                                matches.get(cat).push(item);
                            }
                        });
                    }

                    if (matches.size === 0) {
                        resArea.innerHTML = `<div style="color:red;padding:10px;background:#fee;">❌ 找不到符合「${qRaw}」的測驗</div>`;
                        return;
                    }

                    // 3. Render List of Categories
                    // Convert Map to Array for sorting
                    const sortedCats = Array.from(matches.keys()).sort();

                    // If only 1 result, auto-click it
                    if (sortedCats.length === 1) {
                        renderExamQuestions(matches.get(sortedCats[0]), sortedCats[0]);
                        return;
                    }

                    let html = `<div style="background:#fff3cd;padding:10px;margin-bottom:10px;border-radius:5px;">
                                <b>🔍 找到 ${sortedCats.length} 個題庫</b><br>
                                <small>請選擇符合的測驗：</small>
                                </div>`;

                    sortedCats.forEach((title, idx) => {
                        const count = matches.get(title).length;
                        html += `
                            <div class="bot-cat-item" data-title="${title}"
                                 style="background:#fff;border:1px solid #ddd;border-radius:5px;padding:10px;margin-bottom:6px;cursor:pointer;transition:background 0.2s;">
                                <div><span style="color:#333;font-weight:bold;">${idx + 1}. ${title}</span></div>
                                <div style="font-size:11px;color:#666;margin-top:3px;">包含 ${count} 題</div>
                            </div>
                         `;
                    });
                    resArea.innerHTML = html;

                    // Bind Clicks
                    resArea.querySelectorAll('.bot-cat-item').forEach(el => {
                        el.onclick = () => {
                            const t = el.getAttribute('data-title');
                            renderExamQuestions(matches.get(t), t);
                        };
                    });
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
