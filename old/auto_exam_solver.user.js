// ==UserScript==
// @name         Auto Exam Solver (One-Click Edition - GitHub)
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  一鍵自動搜尋題庫並填寫答案 (來源: GitHub)
// @author       Shengyang
// @match        *://elearn.hrd.gov.tw/*
// @match        *://*.hrd.gov.tw/*
// @match        *://www.cp.gov.tw/*
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const DB_URL = "https://raw.githubusercontent.com/xerion79585/Auto-E-Learning/main/questions.json";
    window.__BOT_DB = null;

    // True/False synonyms
    const TRUE_VALS = ['○', 'o', 'v', '是', 'true', 'correct', '對', '圈', 'right', '正確', 't'];
    const FALSE_VALS = ['╳', 'x', '✕', '否', 'false', 'incorrect', 'wrong', '錯', '叉', '錯誤', 'f'];

    const normalize = (str) => (str || '').replace(/[\s\u3000\t\n\r\u00a0"'.:;!?()\[\]{}<>《》「」【】、，。─]/g, '').toLowerCase();

    function gmFetch(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET", url, responseType: "json",
                onload: (res) => resolve(res.response || JSON.parse(res.responseText)),
                onerror: reject
            });
        });
    }

    // ==============================
    // Page Parser (targeted for HRD exam)
    // ==============================
    function getPageQuestions() {
        const questions = [];

        // Find the exam table inside presentPanel (NOT the info table)
        const panel = document.getElementById('presentPanel');
        if (!panel) return questions;

        const tables = panel.querySelectorAll('table.cssTable');
        // Use the LAST cssTable in presentPanel (the exam one), or iterate all
        let examTable = null;
        for (const t of tables) {
            if (t.querySelector('input[type="radio"], input[type="checkbox"]')) {
                examTable = t;
                break;
            }
        }
        if (!examTable) return questions;

        const rows = examTable.querySelectorAll('tr');

        for (const row of rows) {
            const inputs = row.querySelectorAll('input[type="radio"], input[type="checkbox"]');
            if (inputs.length === 0) continue;

            // Find the TD that contains the question + options (the one with inputs)
            let questionTd = null;
            for (const td of row.children) {
                if (td.tagName === 'TD' && td.querySelector('input[type="radio"], input[type="checkbox"]')) {
                    questionTd = td;
                    break;
                }
            }
            if (!questionTd) continue;

            // Extract Question Text: Clone TD, remove <ol>/<ul>, get remaining text
            const clone = questionTd.cloneNode(true);
            clone.querySelectorAll('ol, ul').forEach(el => el.remove());
            let qText = clone.innerText.trim();
            // Strip leading number: "1. " or "10. "
            qText = qText.replace(/^\d+[\.\s、]+\s*/, '');
            if (qText.length < 3) continue;

            // Extract Options from <li> elements
            const liItems = questionTd.querySelectorAll('ol > li, ul > li');
            const options = [];

            for (const li of liItems) {
                const input = li.querySelector('input[type="radio"], input[type="checkbox"]');
                if (!input) continue;

                let labelText = '';

                // Check for image (True/False: right.gif = ○, wrong.gif = ╳)
                const img = li.querySelector('img');
                if (img) {
                    if (img.src.includes('right.gif')) labelText = '○';
                    else if (img.src.includes('wrong.gif')) labelText = '╳';
                }

                // If no image, get text from the <li> excluding the input
                if (!labelText) {
                    for (const node of li.childNodes) {
                        if (node.nodeType === 3 && node.textContent.trim()) {
                            labelText = node.textContent.trim();
                            break;
                        }
                        if (node.nodeType === 1 && node.tagName !== 'SPAN' && node.tagName !== 'INPUT') {
                            labelText = node.innerText.trim();
                            break;
                        }
                    }
                    // If text is after the <span><input></span>
                    if (!labelText) {
                        const span = li.querySelector('span');
                        if (span) {
                            let next = span.nextSibling;
                            while (next) {
                                if (next.nodeType === 3 && next.textContent.trim()) {
                                    labelText = next.textContent.trim();
                                    break;
                                }
                                if (next.nodeType === 1 && next.tagName === 'IMG') {
                                    if (next.src.includes('right.gif')) { labelText = '○'; break; }
                                    if (next.src.includes('wrong.gif')) { labelText = '╳'; break; }
                                }
                                if (next.nodeType === 1 && next.innerText && next.innerText.trim()) {
                                    labelText = next.innerText.trim();
                                    break;
                                }
                                next = next.nextSibling;
                            }
                        }
                    }
                }

                options.push({ input, label: labelText });
            }

            if (options.length > 0) {
                questions.push({ text: qText, element: row, options });
            }
        }

        return questions;
    }

    // ==============================
    // Answer Matching
    // ==============================
    function isTrueFalseMatch(a, b) {
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
        if (aN.length > 2 && bN.length > 2) {
            if (aN.includes(bN) || bN.includes(aN)) return true;
        }
        return false;
    }

    // ==============================
    // Main Logic
    // ==============================
    async function oneClickSolve() {
        const btn = document.getElementById('bot-btn-solve');
        if (btn) { btn.disabled = true; btn.innerText = '⏳ 處理中...'; }

        const logArea = document.getElementById('bot-solver-log') || createLogArea();
        const log = (msg) => {
            const p = document.createElement('div');
            p.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
            logArea.prepend(p);
            console.log(`[AutoSolver] ${msg}`);
        };

        log('🚀 開始作答 (v3.1)...');

        try {
            // 1. Load DB
            if (!window.__BOT_DB) {
                log('☁️ 下載題庫...');
                window.__BOT_DB = await gmFetch(DB_URL);
                log(`✅ 載入 ${window.__BOT_DB.length} 題`);
            }

            // 2. Build index: normalized question text -> DB item
            const dbIndex = {};
            window.__BOT_DB.forEach(item => {
                const qKey = normalize(item.question);
                if (!qKey) return;
                if (!dbIndex[qKey]) dbIndex[qKey] = item;
            });
            log(`📚 索引 ${Object.keys(dbIndex).length} 條`);

            // 3. Parse page
            const pageQs = getPageQuestions();
            log(`📄 偵測到 ${pageQs.length} 題`);

            if (pageQs.length === 0) {
                log('⚠️ 未偵測到題目！請確認頁面已載入');
                alert('未偵測到任何題目，請確認考試頁面已完全載入。');
                return;
            }

            // Debug: log all extracted questions
            pageQs.forEach((q, i) => {
                console.log(`[Q${i + 1}] "${q.text}" | Opts: ${q.options.map(o => o.label + '(' + o.input.value + ')').join(', ')}`);
            });

            let filled = 0;

            for (let i = 0; i < pageQs.length; i++) {
                const qObj = pageQs[i];
                const qTextNorm = normalize(qObj.text);

                // Find match in DB
                let dbItem = dbIndex[qTextNorm] || null;

                // Fuzzy fallback
                if (!dbItem) {
                    for (const k in dbIndex) {
                        if (k.includes(qTextNorm) || qTextNorm.includes(k)) {
                            dbItem = dbIndex[k];
                            break;
                        }
                    }
                }

                if (!dbItem) {
                    qObj.element.style.background = '#f8d7da';
                    log(`❌ Q${i + 1}: 題庫無此題 - ${qObj.text.substring(0, 20)}...`);
                    continue;
                }

                // Use the options[].correct field from DB for matching
                const correctOpts = (dbItem.options || []).filter(o => o.correct).map(o => o.text);
                log(`🔍 Q${i + 1}: 找到答案 [${correctOpts.join(', ')}]`);

                let hit = false;

                for (const pageOpt of qObj.options) {
                    const pageLabel = pageOpt.label;
                    const pageValue = pageOpt.input.value;

                    let shouldSelect = false;

                    for (const correctText of correctOpts) {
                        // Match by text
                        if (isTrueFalseMatch(pageLabel, correctText)) {
                            shouldSelect = true;
                            break;
                        }
                        if (isTextMatch(pageLabel, correctText)) {
                            shouldSelect = true;
                            break;
                        }
                        // Match by value (T/F)
                        if (isTrueFalseMatch(pageValue, correctText)) {
                            shouldSelect = true;
                            break;
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
                    log(`⚠️ Q${i + 1}: 選項不符\n  DB: ${correctOpts.join('|')}\n  Page: ${qObj.options.map(o => o.label).join('|')}`);
                }
            }

            log(`🎉 完成！填寫 ${filled}/${pageQs.length}`);
            alert(`完成！共填寫 ${filled}/${pageQs.length} 題\n請人工檢查後再送出！`);

        } catch (e) {
            log(`❌ ${e.message}`);
            console.error(e);
            alert('錯誤: ' + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.innerText = '⚡ 一鍵自動作答'; }
        }
    }

    function createLogArea() {
        const div = document.createElement('div');
        div.id = 'bot-solver-log';
        Object.assign(div.style, {
            position: 'fixed', bottom: '10px', right: '10px',
            width: '400px', maxHeight: '350px', overflowY: 'auto',
            background: 'rgba(0,0,0,0.95)', color: '#eee', fontSize: '11px',
            padding: '12px', borderRadius: '8px', zIndex: '999999',
            fontFamily: 'Consolas, monospace', border: '1px solid #555',
            whiteSpace: 'pre-wrap'
        });
        document.body.appendChild(div);
        return div;
    }

    function init() {
        if (!document.URL.includes('exam_start.php') || document.URL.includes('questionnaire')) return;
        if (document.getElementById('bot-btn-solve')) return;

        const btn = document.createElement('button');
        btn.id = 'bot-btn-solve';
        btn.innerHTML = '⚡ 一鍵自動作答';
        Object.assign(btn.style, {
            position: 'fixed', top: '80px', right: '15px',
            zIndex: '999999', padding: '12px 20px',
            background: 'linear-gradient(135deg, #6610f2 0%, #6f42c1 100%)',
            color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer',
            fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s'
        });
        btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';
        btn.onclick = oneClickSolve;
        document.body.appendChild(btn);
    }

    setInterval(init, 1000);

})();
