// ==UserScript==
// @name         Auto E-Learning Bot (v12.2 - Pixnet Edition)
// @namespace    http://tampermonkey.net/
// @version      12.2
// @description  自動掛網、Pixnet題庫搜尋、自動填寫問卷
// @author       Shengyang
// @match        *://elearn.hrd.gov.tw/*
// @match        *://*.hrd.gov.tw/*
// @grant        GM_xmlhttpRequest
// @match        *://www.cp.gov.tw/*
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // 初始化標記，防止重複執行
    if (window.getAttribute && window.getAttribute('data-bot-loaded')) return;
    if (window.document && window.document.body) {
        window.document.body.setAttribute('data-bot-loaded', 'true');
    }
    console.log('[AutoBot v12.2] Init success');

    // GM_fetch 封裝
    function gmFetch(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: (response) => {
                    resolve({
                        text: () => Promise.resolve(response.responseText)
                    });
                },
                onerror: (err) => reject(err)
            });
        });
    }

    function createOverlay(id, html) {
        if (document.getElementById(id)) return null;
        const div = document.createElement('div');
        div.id = id;
        div.innerHTML = html;
        document.body.appendChild(div);
        return div;
    }

    setInterval(() => {
        const url = window.location.href;

        // 1. Path Tree
        if (url.includes('pathtree.php')) {
            if (!document.getElementById('bot-btn-hang')) {
                const btn = document.createElement('button');
                btn.id = 'bot-btn-hang';
                btn.innerHTML = '▶ 開始掛網 (Pixnet版)';
                Object.assign(btn.style, {
                    position: 'fixed', top: '15px', right: '15px',
                    zIndex: '999999', padding: '10px 20px',
                    background: 'linear-gradient(135deg, #FF512F 0%, #DD2476 100%)',
                    color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
                    fontWeight: '500', fontSize: '14px'
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

        // 2. Hanging
        if (url.includes('mooc/index.php') && url.includes('ticket=')) {
            if (!document.getElementById('bot-hang-overlay')) {
                const params = new URLSearchParams(window.location.search);
                const ticket = params.get('ticket');
                const cid = params.get('cid');
                if (ticket && cid) {
                    createOverlay('bot-hang-overlay', `
                        <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#fff;z-index:999999;flex-direction:column;align-items:center;justify-content:center;display:flex;">
                            <h1 style="color:#28a745;">Running (Pixnet)...</h1>
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

        // 3. Exam Logic (Pixnet Search)
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
                    <input type="text" id="bot-input-q" style="width:100%;padding:10px;font-size:14px;" placeholder="測驗名稱(Pixnet搜尋)">
                    <button id="bot-btn-search" style="width:100%;margin-top:10px;padding:10px;background:#007bff;color:#fff;border:none;cursor:pointer;font-size:14px;">搜尋</button>
                    <div id="bot-res-area" style="margin-top:15px;font-size:13px;line-height:1.6;"></div>
                `;
                document.body.appendChild(panel);

                setTimeout(() => {
                    let title = '';
                    const h = document.querySelector('h1, h2, .title');
                    if (h) title = h.innerText.trim();
                    if (title) {
                        document.getElementById('bot-input-q').value = title;
                        document.getElementById('bot-btn-search').click();
                    }
                }, 1500);

                async function fetchAndDisplayAnswers(targetUrl, targetTitle, resultArea) {
                    resultArea.innerHTML = `<div style="color:green">✅ 載入: ${targetTitle}<br>讀取中...</div>`;
                    try {
                        const respAns = await gmFetch(targetUrl);
                        const textAns = await respAns.text();
                        const docAns = new DOMParser().parseFromString(textAns, 'text/html');

                        const table = docAns.querySelector('.article-content table, .article-content-inner table');
                        if (!table) {
                            resultArea.innerHTML = '<div style="color:orange">找到頁面但無表格</div>';
                            return;
                        }
                        const rows = table.querySelectorAll('tr');
                        let questions = [];
                        let currentQ = null;
                        for (const tr of rows) {
                            const tds = tr.querySelectorAll('td');
                            if (tds.length < 1) continue;
                            const marker = tds[0].innerText.trim();
                            const contentCell = tds[tds.length - 1];
                            const clone = contentCell.cloneNode(true);
                            clone.querySelectorAll('span').forEach(span => {
                                const style = span.getAttribute('style') || '';
                                if (style.includes('255, 255, 255') || style.includes('#fff')) {
                                    span.remove();
                                }
                            });
                            const content = clone.innerText.trim();
                            if (content.includes('roddayeye') || content.length < 1) continue;

                            if (marker === 'Q') {
                                if (currentQ) questions.push(currentQ);
                                currentQ = { question: content, options: [], answer: null };
                            } else if (currentQ) {
                                const isCorrect = (marker === 'v');
                                currentQ.options.push({ text: content, correct: isCorrect });
                                if (isCorrect) currentQ.answer = content;
                            }
                        }
                        if (currentQ) questions.push(currentQ);

                        let html = '';
                        questions.forEach((q, i) => {
                            html += `<div style="background:#fff;border:1px solid #ddd;padding:5px;margin-bottom:5px;"><b>Q${i + 1}</b> ${q.question}<br>`;
                            q.options.forEach(opt => {
                                if (opt.correct) html += `<span style="color:green">✓ ${opt.text}</span><br>`;
                                else html += `<span style="color:#aaa">　 ${opt.text}</span><br>`;
                            });
                            html += `</div>`;
                        });
                        resultArea.innerHTML = html;
                    } catch (e) {
                        resultArea.innerHTML = '<div style="color:red">Error: ' + e + '</div>';
                    }
                }

                document.getElementById('bot-btn-search').onclick = async () => {
                    const q = document.getElementById('bot-input-q').value.trim();
                    const r = document.getElementById('bot-res-area');
                    if (!q) return;
                    r.innerHTML = 'Search...';
                    try {
                        const INDEX_URL = 'https://roddayeye.pixnet.net/blog/posts/15325785090';
                        const respIdx = await gmFetch(INDEX_URL);
                        const textIdx = await respIdx.text();
                        const docIdx = new DOMParser().parseFromString(textIdx, 'text/html');
                        const links = Array.from(docIdx.querySelectorAll('a[href*="roddayeye.pixnet.net/blog/post/"]'));

                        const matches = links.filter(a => a.innerText.includes(q) || q.includes(a.innerText)).slice(0, 10);

                        let html = '';
                        matches.forEach(m => {
                            html += `<div class="bot-res-item" data-url="${m.href}" style="cursor:pointer;padding:5px;border-bottom:1px solid #eee;">${m.innerText}</div>`;
                        });
                        if (matches.length === 0) html = 'Not Found';
                        r.innerHTML = html;
                        r.querySelectorAll('.bot-res-item').forEach(d => {
                            d.onclick = () => fetchAndDisplayAnswers(d.dataset.url, d.innerText, r);
                        });

                    } catch (e) { r.innerHTML = 'Err:' + e; }
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
