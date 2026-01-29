// ==UserScript==
// @name         Auto E-Learning Bot (v13 - GitHub Edition)
// @namespace    http://tampermonkey.net/
// @version      13.0
// @description  自動掛網、GitHub極速題庫搜尋、自動填寫問卷
// @author       Shengyang
// @match        *://elearn.hrd.gov.tw/*
// @match        *://*.hrd.gov.tw/*
// @grant        GM_xmlhttpRequest
// @match        *://www.cp.gov.tw/*
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';
    console.log('[AutoBot v13] Start');

    // ==========================================
    // 設定區 (Config)
    // ==========================================
    const DB_URL = "https://raw.githubusercontent.com/xerion79585/Auto-E-Learning/main/questions.json";

    window.__BOT_DB = null;
    window.__BOT_LOADING = false;

    if (window.getAttribute && window.getAttribute('data-bot-loaded')) return;
    if (window.document && window.document.body) window.document.body.setAttribute('data-bot-loaded', 'true');

    function createOverlay(id, html) {
        if (document.getElementById(id)) return null;
        const div = document.createElement('div');
        div.id = id;
        div.innerHTML = html;
        document.body.appendChild(div);
        return div;
    }

    async function loadDatabase(statusDiv) {
        if (window.__BOT_DB) return window.__BOT_DB;
        if (window.__BOT_LOADING) {
            while (window.__BOT_LOADING) await new Promise(r => setTimeout(r, 200));
            return window.__BOT_DB;
        }

        window.__BOT_LOADING = true;
        if (statusDiv) statusDiv.innerHTML = '<div style="color:blue">📥 正在從 GitHub 下載題庫 (約 50MB)...<br>初次載入需數秒，請稍候</div>';

        try {
            console.log('[AutoBot] Fetching DB from:', DB_URL);
            const resp = await fetch(DB_URL);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json();
            window.__BOT_DB = json;
            console.log(`[AutoBot] DB Loaded: ${json.length} questions`);
            if (statusDiv) statusDiv.innerHTML = `<div style="color:green">✅ 題庫載入完成 (共 ${json.length} 題)</div>`;
            return json;
        } catch (e) {
            console.error(e);
            if (statusDiv) statusDiv.innerHTML = `<div style="color:red">❌ 下載失敗: ${e.message}</div>`;
            return null;
        } finally {
            window.__BOT_LOADING = false;
        }
    }

    setInterval(() => {
        const url = window.location.href;

        // Path Tree
        if (url.includes('pathtree.php')) {
            if (!document.getElementById('bot-btn-hang')) {
                const btn = document.createElement('button');
                btn.id = 'bot-btn-hang';
                btn.innerHTML = '▶ 開始掛網 (GitHub版)';
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

        // Hanging
        if (url.includes('mooc/index.php') && url.includes('ticket=')) {
            if (!document.getElementById('bot-hang-overlay')) {
                const params = new URLSearchParams(window.location.search);
                const ticket = params.get('ticket');
                const cid = params.get('cid');
                if (ticket && cid) {
                    createOverlay('bot-hang-overlay', `
                        <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#fff;z-index:999999;flex-direction:column;align-items:center;justify-content:center;display:flex;">
                            <h1 style="color:#28a745;">Running (GitHub Edition)...</h1>
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

        // Exam
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
                    <h3 style="margin:0 0 10px 0;">GitHub 極速題庫</h3>
                    <div style="font-size:12px;color:#666;margin-bottom:10px;">資料來源: GitHub (v13)</div>
                    <input type="text" id="bot-input-q" style="width:100%;padding:10px;font-size:14px;border:1px solid #ccc;border-radius:4px;" placeholder="輸入題目關鍵字...">
                    <button id="bot-btn-search" style="width:100%;margin-top:10px;padding:10px;background:#24292e;color:#fff;border:none;cursor:pointer;font-size:14px;border-radius:4px;">🔍 本地秒搜</button>
                    <div id="bot-res-area" style="margin-top:15px;font-size:13px;line-height:1.6;"></div>
                `;
                document.body.appendChild(panel);

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

                document.getElementById('bot-btn-search').onclick = async () => {
                    const qRaw = document.getElementById('bot-input-q').value.trim();
                    const resArea = document.getElementById('bot-res-area');

                    if (!window.__BOT_DB) {
                        const success = await loadDatabase(resArea);
                        if (!success) return;
                    }

                    if (!qRaw) return;

                    const qNorm = qRaw.toLowerCase().replace(/\s+/g, '');
                    const db = window.__BOT_DB;

                    resArea.innerHTML = '<div style="color:blue">🔍 搜尋中...</div>';

                    const results = db.filter(item => {
                        const cat = (item.category || '').toLowerCase().replace(/\s+/g, '');
                        const ques = (item.question || '').toLowerCase().replace(/\s+/g, '');
                        return cat.includes(qNorm) || ques.includes(qNorm);
                    });

                    if (results.length === 0) {
                        resArea.innerHTML = `<div style="color:red;padding:10px;background:#fee;">❌ 找不到符合「${qRaw}」的題目</div>`;
                        return;
                    }

                    let html = `<div style="background:#e6fffa;padding:10px;margin-bottom:10px;border-radius:5px;">
                                <b>🎉 找到 ${results.length} 筆資料</b>
                                </div>`;

                    const displayList = results.slice(0, 50);

                    displayList.forEach((item, i) => {
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
                            <div class="bot-card" style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:12px;margin-bottom:10px;">
                                <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">${item.category || '未分類'}</div>
                                <div style="font-weight:bold;color:#1f2937;margin-bottom:8px;">Q: ${item.question}</div>
                                ${ansHtml}
                            </div>
                        `;
                    });

                    if (results.length > 50) {
                        html += `<div style="text-align:center;color:#666;padding:10px;">...還有 ${results.length - 50} 筆結果未顯示...</div>`;
                    }

                    resArea.innerHTML = html;
                };
            }
        }

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
