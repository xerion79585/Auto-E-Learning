// ==UserScript==
// @name         一鍵開啟所有課程
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在學習儀表板頁面加入按鈕，一鍵開啟所有未完成課程（含所有分頁）
// @author       Shengyang
// @match        *://elearn.hrd.gov.tw/mooc/user/learn_dashboard.php*
// @grant        GM_openInTab
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // 只在 learn_dashboard.php 頁面執行
    if (!window.location.href.includes('learn_dashboard.php')) return;

    // ---- 設定 ----
    const DELAY_BETWEEN_TABS = 400;       // 每個分頁間的延遲 (ms)
    const DELAY_BETWEEN_PAGES = 1500;     // 換頁後等待 DOM 更新的延遲 (ms)
    const COURSE_LINK_SELECTOR = '.course-list-block a[href*="/info/"]';

    // ---- 注入樣式 ----
    function injectStyles() {
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
            @keyframes oac-spin {
                to { transform: rotate(360deg); }
            }
            #open-all-courses-btn {
                display: inline-flex !important;
                align-items: center !important;
                gap: 8px !important;
                padding: 10px 26px !important;
                font-size: 15px !important;
                font-weight: 700 !important;
                color: #fff !important;
                background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ff6b35 100%) !important;
                background-size: 200% auto !important;
                border: none !important;
                border-radius: 25px !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                text-decoration: none !important;
                box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4) !important;
                letter-spacing: 1px !important;
                white-space: nowrap !important;
                animation: oac-pulse 2s infinite !important;
                position: relative !important;
            }
            #open-all-courses-btn:hover {
                transform: translateY(-2px) scale(1.03) !important;
                box-shadow: 0 6px 20px rgba(255, 107, 53, 0.55) !important;
                animation: oac-shimmer 1.5s linear infinite !important;
            }
            #open-all-courses-btn.oac-loading {
                background: linear-gradient(135deg, #888 0%, #aaa 100%) !important;
                animation: none !important;
                cursor: not-allowed !important;
                opacity: 0.7 !important;
            }
            #open-all-courses-btn .oac-icon {
                font-size: 18px;
                line-height: 1;
            }
            #open-all-courses-btn .oac-spinner {
                display: none;
                width: 16px;
                height: 16px;
                border: 2.5px solid rgba(255,255,255,0.3);
                border-top-color: #fff;
                border-radius: 50%;
                animation: oac-spin 0.7s linear infinite;
            }
            #open-all-courses-btn.oac-loading .oac-icon { display: none; }
            #open-all-courses-btn.oac-loading .oac-spinner { display: inline-block; }

            #open-all-courses-status {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 16px;
                font-size: 13px;
                font-weight: 600;
                border-radius: 20px;
                white-space: nowrap;
                transition: all 0.3s ease;
                opacity: 0;
                transform: translateX(-8px);
            }
            #open-all-courses-status.oac-visible {
                opacity: 1;
                transform: translateX(0);
            }
            #open-all-courses-status.oac-info {
                background: #e3f2fd;
                color: #1565c0;
                border: 1px solid #90caf9;
            }
            #open-all-courses-status.oac-success {
                background: #e8f5e9;
                color: #2e7d32;
                border: 1px solid #a5d6a7;
            }
            #open-all-courses-status.oac-warn {
                background: #fff3e0;
                color: #e65100;
                border: 1px solid #ffcc80;
            }
            #open-all-courses-status.oac-error {
                background: #fce4ec;
                color: #c62828;
                border: 1px solid #ef9a9a;
            }
        `;
        document.head.appendChild(style);
    }

    // ---- 更新狀態 ----
    function setStatus(text, type = 'info') {
        const status = document.getElementById('open-all-courses-status');
        if (!status) return;
        status.textContent = text;
        status.className = text ? `oac-visible oac-${type}` : '';
    }

    // ---- 注入按鈕 ----
    function injectButton() {
        injectStyles();
        // 找到 "搜尋與排序" 所在的 .card-search-btnBar，把按鈕放在旁邊
        const btnBar = document.querySelector('.card-search-btnBar');

        // 建立按鈕容器（col 元素，和搜尋排序並排）
        const container = document.createElement('div');
        container.id = 'open-all-courses-container';
        container.className = 'col-sm-8';
        container.style.cssText = `
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 0 15px;
        `;

        // 主按鈕
        const btn = document.createElement('a');
        btn.id = 'open-all-courses-btn';
        btn.href = 'javascript:void(0)';
        btn.innerHTML = '<span class="oac-icon">⚡</span><span class="oac-spinner"></span>快速開啟所有課程';

        // 狀態文字
        const status = document.createElement('span');
        status.id = 'open-all-courses-status';

        container.appendChild(btn);
        container.appendChild(status);

        // 插入到 .card-search-btnBar 裡面（搜尋與排序的旁邊）
        if (btnBar) {
            btnBar.appendChild(container);
        } else {
            const searchBar = document.querySelector('.dn-search-bar');
            if (searchBar) {
                searchBar.parentNode.insertBefore(container, searchBar.nextSibling);
            } else {
                const content = document.querySelector('.d3-container, .main-content, #content');
                if (content) {
                    content.insertBefore(container, content.firstChild);
                }
            }
        }

        btn.addEventListener('click', handleOpenAllCourses);
    }

    // ---- 取得當前頁面的所有課程連結 ----
    function getCurrentPageLinks() {
        const links = document.querySelectorAll(COURSE_LINK_SELECTOR);
        const urls = new Set();
        links.forEach(link => {
            const href = link.href;
            if (href && href.includes('/info/')) {
                urls.add(href);
            }
        });
        return [...urls];
    }

    // ---- 取得分頁資訊 ----
    function getPaginationInfo() {
        // 從 ".paginate-number-after" 取得總頁數，格式為 "/ 4"
        const afterEl = document.querySelector('.paginate-number-after');
        let totalPages = 1;
        if (afterEl) {
            const match = afterEl.textContent.match(/\/\s*(\d+)/);
            if (match) totalPages = parseInt(match[1], 10);
        }

        // 從 ".paginate-message" 取得總筆數，格式為 "1 - 6 共 19 筆"
        const msgEl = document.querySelector('.paginate-message');
        let totalItems = 0;
        if (msgEl) {
            const match = msgEl.textContent.match(/共\s*(\d+)\s*筆/);
            if (match) totalItems = parseInt(match[1], 10);
        }

        // 從 ".paginate-number" input 取得當前頁碼
        const pageInput = document.querySelector('.paginate-number');
        let currentPage = 1;
        if (pageInput) {
            currentPage = parseInt(pageInput.value, 10) || 1;
        }

        return { totalPages, totalItems, currentPage };
    }

    // ---- 等待工具 ----
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 等待 DOM 變化（課程列表更新）
    function waitForDOMUpdate(timeout = 3000) {
        return new Promise(resolve => {
            const courseArea = document.querySelector('.course-list-area, .row.course-list, #courseListArea, .course-list-block');
            if (!courseArea) {
                setTimeout(resolve, timeout);
                return;
            }

            let resolved = false;
            const observer = new MutationObserver(() => {
                if (!resolved) {
                    resolved = true;
                    observer.disconnect();
                    // 給一點額外時間讓 DOM 完全更新
                    setTimeout(resolve, 500);
                }
            });

            observer.observe(courseArea.parentNode || document.body, {
                childList: true,
                subtree: true
            });

            // 超時也要 resolve
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    observer.disconnect();
                    resolve();
                }
            }, timeout);
        });
    }

    // ---- 模擬切換到指定頁碼 ----
    function goToPage(pageNum) {
        // 方法：設定全域 page 變數（0-indexed）後呼叫 doSearch
        // page 是全域 0-indexed，pageNum 是 1-indexed
        if (typeof window.page !== 'undefined') {
            window.page = pageNum - 1;
        }

        // 嘗試透過 paginate input 切換
        const pageInput = document.querySelector('.paginate-number');
        if (pageInput) {
            pageInput.value = pageNum;
            // 觸發 change/keydown 事件
            pageInput.dispatchEvent(new Event('change', { bubbles: true }));
            // 有些 jQuery 組件需要 keydown + Enter
            pageInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        }

        // 嘗試直接呼叫 doSearch（頁面上的全域函數）
        if (typeof window.doSearch === 'function') {
            try {
                window.doSearch(2);
            } catch (e) {
                console.warn('[OpenAll] doSearch 呼叫失敗:', e);
            }
        }
    }

    // ---- 主要邏輯：收集所有分頁的課程並開啟 ----
    async function handleOpenAllCourses() {
        const btn = document.getElementById('open-all-courses-btn');

        btn.classList.add('oac-loading');

        try {
            const { totalPages, totalItems, currentPage } = getPaginationInfo();
            setStatus(`📊 偵測到 ${totalItems} 門課程，共 ${totalPages} 頁`, 'info');

            const allLinks = new Set();

            // 收集每一頁的課程連結
            for (let p = 1; p <= totalPages; p++) {
                setStatus(`正在掃描第 ${p} / ${totalPages} 頁...`, 'info');

                if (p !== currentPage) {
                    goToPage(p);
                    await waitForDOMUpdate(DELAY_BETWEEN_PAGES);
                    await sleep(800);
                }

                const pageLinks = getCurrentPageLinks();
                pageLinks.forEach(link => allLinks.add(link));
                console.log(`[OpenAll] 第 ${p} 頁收集到 ${pageLinks.length} 個連結`);
            }

            const uniqueLinks = [...allLinks];

            if (uniqueLinks.length === 0) {
                setStatus('⚠️ 沒有找到任何課程連結', 'warn');
                btn.classList.remove('oac-loading');
                return;
            }

            setStatus(`✅ 找到 ${uniqueLinks.length} 門課程，開啟中...`, 'info');

            // 逐一開啟新分頁（使用 GM_openInTab 繞過彈出視窗阻擋）
            let opened = 0;
            for (const link of uniqueLinks) {
                GM_openInTab(link, { active: false, insert: true, setParent: true });
                opened++;
                setStatus(`🔗 已開啟 ${opened} / ${uniqueLinks.length}`, 'info');
                await sleep(DELAY_BETWEEN_TABS);
            }

            // 切回原來的頁碼
            if (currentPage !== totalPages) {
                goToPage(currentPage);
            }

            setStatus(`完成！已開啟全部 ${opened} 門課程`, 'success');

        } catch (err) {
            console.error('[OpenAll] 錯誤:', err);
            setStatus(`❌ 錯誤: ${err.message}`, 'error');
        }

        btn.classList.remove('oac-loading');
    }

    // ---- 啟動 ----
    // 等待頁面完全載入後再注入
    if (document.readyState === 'complete') {
        setTimeout(injectButton, 1000);
    } else {
        window.addEventListener('load', () => setTimeout(injectButton, 1000));
    }

})();
