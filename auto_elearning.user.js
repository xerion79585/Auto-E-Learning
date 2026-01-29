// ==UserScript==
// @name         Auto E-Learning Bot (v12.2)
// @namespace    http://tampermonkey.net/
// @version      12.2
// @description  自動掛網、Pixnet題庫搜尋、自動填寫問卷 (v12 UI + Proven Logic)
// @author       Antigravity
// @match        *://elearn.hrd.gov.tw/*
// @match        *://*.hrd.gov.tw/*
// @connect      roddayeye.pixnet.net
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==
(function() {
    'use strict';
    console.log('[AutoBot] Script Start on:', window.location.href);

    // 移除全域鎖定，允許在多個 frame 同時執行
    if (window.getAttribute && window.getAttribute('data-bot-loaded')) return;
    if (window.document && window.document.body) {
         window.document.body.setAttribute('data-bot-loaded', 'true');
    }
    console.log('[AutoBot v12.2] Init success');

    // ★ Helper: Cross-Origin Fetch using GM_xmlhttpRequest
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

        // 1. Path Tree (掛網按鈕) - 使用您提供的舊版邏輯 + v12 美觀樣式
        if (url.includes('pathtree.php')) {
            if (!document.getElementById('bot-btn-hang')) {
                const btn = document.createElement('button');
                btn.id = 'bot-btn-hang';
                btn.innerHTML = '▶ 開始掛網';
                Object.assign(btn.style, {
                    position: 'fixed', top: '15px', right: '15px',
                    zIndex: '999999', padding: '10px 20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                    fontWeight: '500', fontSize: '14px', letterSpacing: '0.5px',
                    transition: 'all 0.3s ease'
                });
                btn.onmouseenter = () => {
                    btn.style.transform = 'translateY(-2px)';
                    btn.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                };
                btn.onmouseleave = () => {
                    btn.style.transform = 'translateY(0)';
                    btn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                };
                
                // ★ 關鍵修正：使用舊版證明可行的邏輯
                btn.onclick = () => {
                   if (typeof pTicket !== 'undefined' && typeof cid !== 'undefined') {
                        // 這是舊版腳本的關鍵：往上跳兩層
                        window.parent.parent.location.href = `/mooc/index.php?ticket=${pTicket}&cid=${cid}`;
                    } else {
                        // 如果直接存取不到，嘗試從 window (iframe 內) 獲取
                        let t = window.pTicket || (window.parent && window.parent.pTicket);
                        let c = window.cid || (window.parent && window.parent.cid);
                        
                        if(t && c) {
                             window.parent.parent.location.href = `/mooc/index.php?ticket=${t}&cid=${c}`;
                        } else {
                             alert('找不到 ticket 或 cid，請確認課程頁面已完全載入。');
                        }
                    }
                };
                document.body.appendChild(btn);
            }
        }

        // 2. Hanging (掛網頁面)
        if (url.includes('mooc/index.php') && url.includes('ticket=')) {
            if (!document.getElementById('bot-hang-overlay')) {
                const params = new URLSearchParams(window.location.search);
                const ticket = params.get('ticket');
                const cid = params.get('cid');
                if (ticket && cid) {
                    createOverlay('bot-hang-overlay', `
                        <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#fff;z-index:999999;flex-direction:column;align-items:center;justify-content:center;display:flex;">
                            <h1 style="color:#28a745;">Running...</h1>
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
                            if(d) d.innerText = `${Math.floor(sec/60)}:${(sec%60).toString().padStart(2,'0')}`;
                        });
                    }, 10000);
                }
            }
        }

        // 3. Exam (題庫搜尋)
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
                    <input type="text" id="bot-input-q" style="width:100%;padding:10px;font-size:14px;" placeholder="請輸入測驗名稱(可關鍵字模糊搜尋)">
                    <button id="bot-btn-search" style="width:100%;margin-top:10px;padding:10px;background:#007bff;color:#fff;border:none;cursor:pointer;font-size:14px;">搜尋</button>
                    <div id="bot-res-area" style="margin-top:15px;font-size:13px;line-height:1.6;"></div>
                `;
                document.body.appendChild(panel);
                setTimeout(() => {
                    let title = '';
                    const tds = Array.from(document.querySelectorAll('td'));
                    const label = tds.find(td => td.innerText.includes('測驗名稱'));
                    if (label && label.nextElementSibling) title = label.nextElementSibling.innerText.trim();
                    if (!title) {
                        const h = document.querySelector('h1, h2, .title');
                        if (h) title = h.innerText.trim();
                    }
                    if (title) {
                        document.getElementById('bot-input-q').value = title;
                        document.getElementById('bot-btn-search').click();
                    }
                }, 800);
                async function fetchAndDisplayAnswers(targetUrl, targetTitle, resultArea) {
                    resultArea.innerHTML = `<div style="color:green">✅ 載入: ${targetTitle}<br>讀取中...</div>`;

                    try {
                        const respAns = await gmFetch(targetUrl);
                        const textAns = await respAns.text();
                        const docAns = new DOMParser().parseFromString(textAns, 'text/html');

                        const table = docAns.querySelector('.article-content table, .article-content-inner table');
                        if (!table) {
                            resultArea.innerHTML = '<div style="color:orange">找到頁面但無表格</div>' +
                                `<a href="${targetUrl}" target="_blank">🔗 ${targetTitle}</a>`;
                            return;
                        }

                        const rows = table.querySelectorAll('tr');
                        let questions = [];
                        let currentQ = null;

                        for (const tr of rows) {
                            const tds = tr.querySelectorAll('td');
                            if (tds.length < 1) continue;

                            const markerCell = tds[0];
                            const marker = markerCell.innerText.trim();
                            const contentCell = tds[tds.length - 1];

                            const clone = contentCell.cloneNode(true);
                            clone.querySelectorAll('span').forEach(span => {
                                const style = span.getAttribute('style') || '';
                                if (style.includes('255, 255, 255') || style.includes('255,255,255') || style.includes('#fff')) {
                                    span.remove();
                                }
                            });
                            const content = clone.innerText.trim();

                            if (content.includes('roddayeye') || content.includes('r.o.d.d.a.y.e.y.e') ||
                                content.includes('pixnet') || content.length < 1) {
                                continue;
                            }

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

                        let html = `
                            <div style="background:#d4edda;padding:10px;margin-bottom:10px;border-radius:5px;">
                                <b>📚 ${targetTitle}</b><br>
                                <small>共 ${questions.length} 題</small> ·
                                <a href="${targetUrl}" target="_blank" style="font-size:12px;">開啟原頁</a>
                                <button id="bot-back-btn" style="float:right;padding:3px 8px;font-size:11px;">↩ 返回搜尋</button>
                            </div>
                            <div style="margin-bottom:10px;">
                                <input type="text" id="bot-quick-search" placeholder="🔍 輸入關鍵字快速定位答案..."
                                       style="width:100%;padding:8px;font-size:13px;border:1px solid #ccc;border-radius:4px;">
                                <small style="color:#666;">提示：在右邊選取題目文字可自動搜尋</small>
                            </div>
                            <div id="bot-answer-list">
                        `;

                        questions.forEach((q, i) => {
                            html += `
                                <div class="bot-q-card" data-q="${q.question.substring(0,50)}" style="background:#fff;border:1px solid #ddd;border-radius:5px;padding:10px;margin-bottom:8px;transition:all 0.3s;">
                                    <div style="font-weight:bold;color:#333;margin-bottom:5px;">
                                        Q${i+1}. ${q.question}
                                    </div>`;

                            q.options.forEach(opt => {
                                if (opt.correct) {
                                    html += `<div style="color:#28a745;font-weight:bold;">✓ ${opt.text}</div>`;
                                } else {
                                    html += `<div style="color:#888;">　 ${opt.text}</div>`;
                                }
                            });

                            if (!q.answer) {
                                html += `<div style="color:orange;font-style:italic;">⚠️ 無法判斷正確答案</div>`;
                            }

                            html += `</div>`;
                        });

                        html += `</div>`;

                        resultArea.innerHTML = html;

                        document.getElementById('bot-back-btn')?.addEventListener('click', () => {
                            document.getElementById('bot-btn-search').click();
                        });

                        const quickSearchInput = document.getElementById('bot-quick-search');
                        const answerList = document.getElementById('bot-answer-list');

                        function doQuickSearch(keyword) {
                            answerList.querySelectorAll('.bot-q-card').forEach(card => {
                                card.style.border = '1px solid #ddd';
                                card.style.background = '#fff';
                                card.style.boxShadow = 'none';
                            });

                            if (!keyword || keyword.length < 2) return;

                            const kw = keyword.toLowerCase();
                            let firstMatch = null;

                            answerList.querySelectorAll('.bot-q-card').forEach(card => {
                                const text = card.innerText.toLowerCase();
                                if (text.includes(kw)) {
                                    card.style.border = '2px solid #ffc107';
                                    card.style.background = 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
                                    card.style.boxShadow = '0 0 15px rgba(255, 193, 7, 0.6), 0 0 30px rgba(255, 193, 7, 0.3)';
                                    if (!firstMatch) firstMatch = card;
                                }
                            });

                            if (firstMatch) {
                                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                        }

                        quickSearchInput?.addEventListener('input', (e) => {
                            doQuickSearch(e.target.value.trim());
                        });

                        document.addEventListener('mouseup', (e) => {
                            if (e.target.closest('#bot-exam-panel')) return;
                            const selection = window.getSelection();
                            const text = selection.toString().trim();
                            if (text && text.length >= 3 && text.length <= 100) {
                                if (quickSearchInput) {
                                    quickSearchInput.value = text;
                                    doQuickSearch(text);
                                }
                            }
                        });

                    } catch(e) {
                        console.error(e);
                        resultArea.innerHTML = '<div style="color:red">載入失敗: ' + e.message + '</div>';
                    }
                }
                document.getElementById('bot-btn-search').onclick = async () => {
                    const q = document.getElementById('bot-input-q').value.trim();
                    const r = document.getElementById('bot-res-area');
                    if(!q) return;

                    r.innerHTML = '<div style="color:blue">🔍 搜尋中...</div>';
                    console.log('[v12] search:', q);
                    try {
                        const INDEX_URL = 'https://roddayeye.pixnet.net/blog/posts/15325785090';
                        const respIdx = await gmFetch(INDEX_URL);
                        const textIdx = await respIdx.text();
                        const docIdx = new DOMParser().parseFromString(textIdx, 'text/html');

                        const links = Array.from(docIdx.querySelectorAll('a[href*="roddayeye.pixnet.net/blog/post/"]'));
                        const normalize = s => s.replace(/[\s《》\[\]【】「」解答]/g, '').toLowerCase();
                        const normQ = normalize(q);

                        let matches = [];

                        for (const a of links) {
                            const txt = a.innerText.trim();
                            if (!txt || !txt.includes('解答')) continue;
                            const normTxt = normalize(txt);

                            let score = 0;
                            if (normTxt.includes(normQ) || normQ.includes(normTxt)) {
                                score = 100;
                            } else {
                                let matchCount = 0;
                                for (let i = 0; i < normQ.length && i < 15; i++) {
                                    if (normTxt.includes(normQ[i])) matchCount++;
                                }
                                score = Math.round((matchCount / Math.min(normQ.length, 15)) * 80);
                            }

                            if (score >= 90) {
                                matches.push({ url: a.href, title: txt, score });
                            }
                        }

                        matches.sort((a, b) => b.score - a.score);

                        const seen = new Set();
                        matches = matches.filter(m => {
                            if (seen.has(m.url)) return false;
                            seen.add(m.url);
                            return true;
                        });

                        matches = matches.slice(0, 20);

                        if (matches.length === 0) {
                            r.innerHTML = `<div style="color:red;padding:10px;background:#fee;">❌ 找不到「${q}」</div>
                                <a href="${INDEX_URL}" target="_blank">🔗 手動搜尋</a>`;
                            return;
                        }

                        if (matches.length === 1) {
                            await fetchAndDisplayAnswers(matches[0].url, matches[0].title, r);
                            return;
                        }

                        let html = `
                            <div style="background:#fff3cd;padding:10px;margin-bottom:10px;border-radius:5px;">
                                <b>🔍 找到 ${matches.length} 個相似題庫</b><br>
                                <small>請點選要查看的題庫：</small>
                            </div>
                        `;

                        matches.forEach((m, i) => {
                            html += `
                                <div class="bot-match-item" data-url="${m.url}" data-title="${m.title}"
                                     style="background:#fff;border:1px solid #ddd;border-radius:5px;padding:10px;margin-bottom:6px;cursor:pointer;transition:background 0.2s;">
                                    <div>
                                        <span style="color:#333;">${i+1}. ${m.title}</span>
                                    </div>
                                </div>
                            `;
                        });

                        r.innerHTML = html;

                        r.querySelectorAll('.bot-match-item').forEach(item => {
                            item.addEventListener('mouseenter', () => item.style.background = '#e9ecef');
                            item.addEventListener('mouseleave', () => item.style.background = '#fff');
                            item.addEventListener('click', async () => {
                                const url = item.dataset.url;
                                const title = item.dataset.title;
                                await fetchAndDisplayAnswers(url, title, r);
                            });
                        });
                    } catch(e) {
                        console.error(e);
                        r.innerHTML = '<div style="color:red">搜尋失敗: ' + e.message + '</div>';
                    }
                };
            }
        }
        // 4. Questionnaire (自動填寫問卷)
        if (url.includes('questionnaire')) {
             if (!window.__bot_q_filled && document.querySelector('input[type="radio"]')) {
                window.__bot_q_filled = true;
                window.alert = () => {}; window.confirm = () => true;
                const radios = document.querySelectorAll('input[type="radio"]');
                const groups = {};
                radios.forEach(r => { if(!groups[r.name]) groups[r.name]=[]; groups[r.name].push(r); });
                for(let k in groups) {
                    const g = groups[k];
                    let t = g.find(r => r.value === 'C') || g[2] || g[g.length-1];
                    if(t) t.click();
                }

                const checks = document.querySelectorAll('input[type="checkbox"]');
                const cgroups = {};
                checks.forEach(c => { if(!cgroups[c.name]) cgroups[c.name]=[]; cgroups[c.name].push(c); });
                for(let k in cgroups) {
                    cgroups[k].slice(0,3).forEach(c => c.click());
                }
                setTimeout(() => {
                    const btn = document.querySelector('input[type="submit"], button[type="submit"], input[value="送出"]');
                    if(btn) btn.click();
                }, 1500);
            }
        }
    }, 1000);
})();
