import time
import os
import sys
import subprocess
from playwright.sync_api import sync_playwright

# ===========================================================================
# Auto-E-Learning Bot v12 (Standard Edition)
# ===========================================================================
# 
# 功能：
# 1. 🔧 自動環境安裝: 自動檢查並下載 Playwright 瀏覽器
# 2. 🔍 包含 v11 所有搜尋功能 (多選單、快速搜尋、反光特效)
# ===========================================================================

def ensure_browser_installed():
    print("🔧 檢查系統環境...")
    try:
        # 檢查 Playwright 是否能找到 Chromium
        print("   正在驗證瀏覽器組件 (Chromium)...")
        print("   (如果是第一次執行，可能需要幾分鐘下載瀏覽器，請耐心等待)")
        
        # 判斷是否為打包後的執行檔
        if getattr(sys, 'frozen', False):
            # 打包環境：需要設定環境變數並直接執行 driver
            os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "0"  # 安裝在本地目錄
            
            # 從 playwright package 內部取得 driver 路徑
            from playwright._impl._driver import compute_driver_executable, get_driver_env
            driver_executable, driver_env = compute_driver_executable()
            
            # 建構完整的環境變數字典
            env = os.environ.copy()
            env["PLAYWRIGHT_BROWSERS_PATH"] = "0" # 強制安裝在本地
            
            if driver_env and isinstance(driver_env, dict):
                env.update(driver_env)
            
            cmd = [str(driver_executable), "install", "chromium"]
            
            # 如果 driver 是 node.exe，我們必須手動指定 cli.js 的路徑
            if "node.exe" in str(driver_executable).lower():
                # 在 _MEIPASS 中尋找 cli.js
                cli_path = None
                base_path = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
                
                for root, dirs, files in os.walk(base_path):
                    if "cli.js" in files:
                         # 檢查是否為 playwright 的 cli
                         if "playwright" in root.lower() or "driver" in root.lower():
                             cli_path = os.path.join(root, "cli.js")
                             break
                
                if cli_path:
                    cmd = [str(driver_executable), cli_path, "install", "chromium"]
                else:
                    print("⚠️ 警告: 找不到 cli.js，嘗試直接執行...")

            # 執行安裝指令
            subprocess.check_call(
                cmd,
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE
            )
        else:
            # 開發環境：使用 python -m playwright
            subprocess.check_call(
                [sys.executable, "-m", "playwright", "install", "chromium"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE
            )
            
        print("✅ 瀏覽器環境準備就緒")
    except Exception as e:
        print("\n❌ 自動安裝瀏覽器失敗")
        print(f"   錯誤訊息: {e}")
        # 如果是打包環境，提供更具體的除錯建議
        if getattr(sys, 'frozen', False):
             print("   (Debug Info: Frozen Environment Detection Active)")
        print("   請確認網路連線正常。")
        input("   按 Enter 鍵退出...")
        sys.exit(1)

UNIVERSAL_JS = """
(() => {
    if (window.__AUTO_BOT_LOADED) return;
    window.__AUTO_BOT_LOADED = true;

    console.log('[AutoBot v12] Loaded');

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
                btn.onclick = () => {
                    try {
                        let t = window.pTicket || (window.parent && window.parent.pTicket);
                        let c = window.cid || (window.parent && window.parent.cid);
                        if (t && c) window.top.location.href = `/mooc/index.php?ticket=${t}&cid=${c}`;
                        else alert('無法取得 ticket/cid');
                    } catch(e) { alert('錯誤: ' + e); }
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

        // 3. Exam
        if (url.includes('exam_start.php') && !url.includes('questionnaire')) {
            if (!document.getElementById('bot-exam-panel')) {
                document.body.style.marginLeft = '450px';
                
                const panel = document.createElement('div');
                panel.id = 'bot-exam-panel';
                Object.assign(panel.style, {
                    position: 'fixed', top: '0', left: '0', width: '430px', height: '100%',
                    background: '#f8f9fa', borderRight: '1px solid #ddd', padding: '15px',
                    boxSizing: 'border-box', overflowY: 'auto', zIndex: '999999',
                    fontFamily: 'sans-serif'
                });
                panel.innerHTML = `
                    <h3 style="margin:0 0 10px 0;">🤖 題庫搜尋 (v12)</h3>
                    <input type="text" id="bot-input-q" style="width:100%;padding:10px;font-size:14px;" placeholder="測驗標題...">
                    <button id="bot-btn-search" style="width:100%;margin-top:10px;padding:10px;background:#007bff;color:#fff;border:none;cursor:pointer;font-size:14px;">🔍 搜尋 Pixnet 題庫</button>
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
                        const respAns = await fetch(targetUrl);
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
                    console.log('[v12] Search:', q);

                    try {
                        const INDEX_URL = 'https://roddayeye.pixnet.net/blog/posts/15325785090';
                        
                        const respIdx = await fetch(INDEX_URL);
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

        // 4. Questionnaire
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
"""

def main():
    print("="*60)
    print("🚀 Auto-E-Learning Bot v12 (Standard Edition)")
    print("="*60)
    
    # 2. 檢查環境 (自動安裝瀏覽器)
    ensure_browser_installed()
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=[
                "--start-maximized", 
                "--disable-blink-features=AutomationControlled",
                "--disable-web-security",
                "--disable-site-isolation-trials",
                "--window-size=1280,800"
            ]
        )
        
        context = browser.new_context(
            no_viewport=True, 
            bypass_csp=True
        )

        context.add_init_script(UNIVERSAL_JS)
        
        page = context.new_page()
        
        print("🔗 前往登入頁面...")
        try:
            page.goto("https://elearn.hrd.gov.tw/mooc/login.php")
        except:
            pass
            
        print("\n✅ 程式已啟動 (v12)")
        print("   - 自動環境維護已啟用")

        try:
            while True:
                time.sleep(1)
                if page.is_closed():
                    break
        except KeyboardInterrupt:
            pass
        
        print("👋 Bye")

if __name__ == "__main__":
    main()
