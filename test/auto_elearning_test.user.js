// ==UserScript==
// @name         Auto E-Learning Bot (v14 - Test)
// @namespace    http://tampermonkey.net/
// @version      14.0-TEST
// @description  自動掛網、一鍵自動作答 (使用瘦身版題庫)
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
    console.log('[AutoBot-Test] Init');

    // ★★★ Point to GitHub Raw file for remote testing ★★★
    const DB_URL_TEST = "https://raw.githubusercontent.com/xerion79585/Auto-E-Learning/main/test/questions_min.json";

    window.__BOT_DB = null;
    window.__BOT_LOADING = false;

    // ... (Authentication logic skipped for test, just core features) ...

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
            if (statusEl) statusEl.innerHTML = `<div style="color:blue">☁️ 下載瘦身版題庫 (約 11MB)...</div>`;

            GM_xmlhttpRequest({
                method: "GET", url: DB_URL_TEST, responseType: "json",
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
                    if (statusEl) statusEl.innerHTML = `<div style="color:red">❌ 下載失敗 (請確認 python server 已啟動)</div>`;
                    window.__BOT_LOADING = false; resolve(null);
                }
            });
        });
    }

    // ... (Helpers) ...

    function isTFMatch(a, b) {
        const aN = normalize(a), bN = normalize(b);
        if (aN === bN) return true;
        if (TRUE_VALS.includes(aN) && TRUE_VALS.includes(bN)) return true;
        if (FALSE_VALS.includes(aN) && FALSE_VALS.includes(bN)) return true;
        return false;
    }

    function isTextMatch(a, b) {
        // a is page option, b is db answer
        const aN = normalize(a), bN = normalize(b);
        if (!aN || !bN) return false;
        if (aN === bN) return true;
        // Fuzzy match: if answer is long enough, check inclusion
        if (aN.length > 2 && bN.length > 2 && (aN.includes(bN) || bN.includes(aN))) return true;
        return false;
    }

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

        log('🚀 [Test] 開始作答...');

        try {
            if (!window.__BOT_DB) {
                const statusDiv = document.createElement('div');
                statusDiv.style.marginBottom = '5px';
                logArea.prepend(statusDiv);

                await loadDatabase(statusDiv); // Pass div to show progress

                if (!window.__BOT_DB) throw new Error("無題庫下載失敗");
            }

            // Build index for [Q, A] format
            const dbIndex = {};
            window.__BOT_DB.forEach(item => {
                // item is [Question, Answer]
                const qKey = normalize(item[0]);
                if (qKey && !dbIndex[qKey]) dbIndex[qKey] = item[1]; // Store answer string directly
            });

            // ... (Get Page Questions logic is same) ...
            // Dummy logic to simulate getting page questions
            // In real script, use the getPageQuestions() function from v14

            // Re-implementing simplified getPageQuestions for this test script context
            // Copied from v14 logic...
            // (For this file write, I'll omit full DOM traversal for brevity unless requested, 
            //  but to make it functional I should include it. I will include the core logic.)

            function getPageQuestions() {
                const questions = [];
                const panel = document.getElementById('presentPanel');
                if (!panel) return questions;
                // ... (Same traversal logic) ...
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

            const pageQs = getPageQuestions();
            let filled = 0;

            for (let i = 0; i < pageQs.length; i++) {
                const qObj = pageQs[i];
                const qNorm = normalize(qObj.text);

                // Find answer in DB
                let dbAns = dbIndex[qNorm] || null;
                if (!dbAns) {
                    // Startswith / contains logic for fuzzy match
                    for (const k in dbIndex) {
                        if (k.includes(qNorm) || qNorm.includes(k)) { dbAns = dbIndex[k]; break; }
                    }
                }

                if (!dbAns) {
                    qObj.element.style.background = '#f8d7da'; // Not found
                    continue;
                }

                // Match options
                let hit = false;
                for (const pageOpt of qObj.options) {
                    // Check if option matches the Answer String
                    // In minified DB, 'dbAns' is the correct answer text (e.g. "To be or not to be")
                    // We check if page option matches this text.
                    if (isTFMatch(pageOpt.label, dbAns) || isTextMatch(pageOpt.label, dbAns) || isTFMatch(pageOpt.input.value, dbAns)) {
                        if (!pageOpt.input.checked) pageOpt.input.click();
                        hit = true;
                    }
                }

                if (hit) {
                    filled++;
                    qObj.element.style.background = '#d1e7dd';
                } else {
                    qObj.element.style.background = '#fff3cd'; // Found q but no matching opt
                }
            }
            alert(`完成！共填寫 ${filled}/${pageQs.length} 題 (瘦身版)`);

        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.innerText = '⚡一鍵作答(Test)'; }
        }
    }

    // Inject button for testing
    setInterval(() => {
        const url = window.location.href;
        if (url.includes('exam_start.php') && !url.includes('questionnaire')) {
            if (!document.getElementById('bot-btn-solve')) {
                const btn = document.createElement('button');
                btn.id = 'bot-btn-solve';
                btn.innerText = '⚡一鍵作答(Test)';
                Object.assign(btn.style, {
                    position: 'fixed', top: '100px', left: '10px', zIndex: 999999,
                    padding: '10px', background: 'red', color: 'white'
                });
                btn.onclick = oneClickSolve;
                document.body.appendChild(btn);
            }
        }
    }, 1000);

})();
