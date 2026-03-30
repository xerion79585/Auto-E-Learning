// ==UserScript==
// @name         e等公務園 解答頁題庫匯出器
// @namespace    https://mohw.elearn.hrd.gov.tw/
// @version      1.3.0
// @description  在 view_result.php 左側加入一鍵匯出題庫按鈕，將公布答案頁面匯出成 JSON。
// @author       Codex
// @match        *://*.hrd.gov.tw/learn/exam/view_result.php*
// @match        *://*.hrd.gov.tw/learn/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const TOOLBAR_ID = 'qb-export-toolbar';
    const BUTTON_ID = 'qb-export-btn';
    const TOAST_ID = 'qb-export-toast';
    const LAST_TITLE_KEY = 'qb_export_last_exam_title';
    const LAST_CONTEXT_KEY = 'qb_export_last_course_context';
    const LEARN_HOME_PATH = '/learn/';
    const COURSE_CONTEXT_TTL_MS = 1000 * 60 * 60 * 6;

    function compactText(text) {
        return (text || '').replace(/\s+/g, ' ').trim();
    }

    function stripQuestionPrefix(text) {
        return (text || '').replace(/^\s*\d+[\.\s、\)\(（）：:]*/, '').trim();
    }

    function sanitizeFileName(name) {
        const cleaned = (name || '')
            .trim()
            .replace(/[\\/:*?"<>|]/g, '_')
            .replace(/\s+/g, '_');
        return cleaned || '題庫匯出';
    }

    function isViewResultPage() {
        return window.location.pathname.includes('/learn/exam/view_result.php');
    }

    function isGreenAnswerMarker(span) {
        if (!span) return false;

        const inlineStyle = (span.getAttribute('style') || '').toLowerCase();
        if (inlineStyle.includes('green')) return true;

        try {
            const bg = (window.getComputedStyle(span).backgroundColor || '')
                .replace(/\s+/g, '')
                .toLowerCase();
            return bg === 'green' || bg === 'rgb(0,128,0)';
        } catch (error) {
            return false;
        }
    }

    function extractOptionText(li) {
        if (!li) return '';

        const clone = li.cloneNode(true);
        clone.querySelectorAll('input, script, style, br').forEach((node) => node.remove());
        clone.querySelectorAll('img').forEach((node) => node.remove());

        const text = compactText(clone.textContent || '');
        if (text) return text;

        const img = li.querySelector('img');
        if (!img) return '';

        const src = (img.getAttribute('src') || '').toLowerCase();
        if (src.includes('right')) return '○';
        if (src.includes('wrong')) return '╳';
        return '';
    }

    function getQuestionCell(row) {
        return Array.from(row.cells || []).find((td) => td.querySelector('ol > li, ul > li')) || null;
    }

    function extractQuestionText(questionCell) {
        if (!questionCell) return '';

        const clone = questionCell.cloneNode(true);
        clone.querySelectorAll('ol, ul, script, style').forEach((node) => node.remove());
        return stripQuestionPrefix(compactText(clone.textContent || ''));
    }

    function extractQuestionsFromPage(examTitle) {
        const sourceUrl = window.location.href.split('#')[0];
        const rows = Array.from(document.querySelectorAll('table.cssTable tr'));
        const questions = [];

        rows.forEach((row) => {
            const questionCell = getQuestionCell(row);
            if (!questionCell) return;

            const question = extractQuestionText(questionCell);
            if (!question) return;

            const optionNodes = Array.from(questionCell.querySelectorAll('ol > li, ul > li'));
            const options = optionNodes
                .map((li) => {
                    const text = extractOptionText(li);
                    const correct = Array.from(li.querySelectorAll('span')).some(isGreenAnswerMarker);
                    return text ? { text, correct } : null;
                })
                .filter(Boolean);

            if (options.length === 0) return;

            const answer = options.filter((option) => option.correct).map((option) => option.text).join('、');

            questions.push({
                category: examTitle,
                source_url: sourceUrl,
                question,
                options,
                answer
            });
        });

        return questions;
    }

    function hasPublishedAnswers() {
        return Array.from(document.querySelectorAll('ol li span, ul li span')).some(isGreenAnswerMarker);
    }

    function guessExamTitle() {
        const saved = localStorage.getItem(LAST_TITLE_KEY);
        if (saved && saved.trim()) return saved.trim();

        const heading = document.querySelector('.coursename, h1, h2, .title, td.title');
        if (heading) {
            const text = compactText(heading.textContent || '').replace(/^測驗[:：]?\s*/, '');
            if (text) return text;
        }

        return '';
    }

    function resolveExamTitleSync() {
        const currentDocTitle = extractCourseNameFromDocument(document);
        if (currentDocTitle) return rememberExamTitle(currentDocTitle);

        const contextualTitle = readCourseNameFromRelatedWindows();
        if (contextualTitle) return rememberExamTitle(contextualTitle);

        const storedTitle = getRecentStoredCourseName();
        if (storedTitle) return rememberExamTitle(storedTitle);

        const fallbackTitle = guessExamTitle();
        if (fallbackTitle) return rememberExamTitle(fallbackTitle);

        return '';
    }

    function rememberExamTitle(title) {
        return saveCourseContext(title, 'resolved');
    }

    function extractCourseNameFromDocument(doc) {
        if (!doc) return '';
        const el = doc.querySelector('.coursename, .courseName, [class*="coursename"]');
        if (!el) return '';
        return compactText(el.textContent || '');
    }

    function readStoredCourseContext(maxAgeMs) {
        try {
            const raw = localStorage.getItem(LAST_CONTEXT_KEY);
            if (!raw) return null;

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            if (!parsed.name || !String(parsed.name).trim()) return null;

            const age = Date.now() - Number(parsed.at || 0);
            if (Number.isFinite(maxAgeMs) && maxAgeMs >= 0 && (age < 0 || age > maxAgeMs)) {
                return null;
            }

            return parsed;
        } catch (error) {
            return null;
        }
    }

    function saveCourseContext(title, source) {
        const cleaned = compactText(title);
        if (!cleaned) return '';

        const context = {
            name: cleaned,
            href: window.location.href,
            title: document.title || '',
            source: source || 'dom',
            at: Date.now()
        };

        try {
            localStorage.setItem(LAST_CONTEXT_KEY, JSON.stringify(context));
            localStorage.setItem(LAST_TITLE_KEY, cleaned);
        } catch (error) {
            console.log('[QB Export] Failed to save course context:', error);
        }

        return cleaned;
    }

    function getRecentStoredCourseName() {
        const context = readStoredCourseContext(COURSE_CONTEXT_TTL_MS);
        return context ? compactText(context.name || '') : '';
    }

    function persistCurrentDocumentCourseName(source) {
        const currentName = extractCourseNameFromDocument(document);
        if (!currentName) return '';
        return saveCourseContext(currentName, source || 'document');
    }

    function startCourseContextTracking() {
        let pendingTimer = 0;

        const queuePersist = (source) => {
            if (pendingTimer) return;
            pendingTimer = window.setTimeout(() => {
                pendingTimer = 0;
                persistCurrentDocumentCourseName(source);
            }, 120);
        };

        persistCurrentDocumentCourseName('init');
        [400, 1200, 2500, 5000].forEach((delay) => {
            window.setTimeout(() => persistCurrentDocumentCourseName(`timer:${delay}`), delay);
        });

        const attachObserver = () => {
            if (!document.body) return false;

            const observer = new MutationObserver(() => queuePersist('mutation'));
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
            return true;
        };

        if (!attachObserver()) {
            document.addEventListener('DOMContentLoaded', attachObserver, { once: true });
        }

        document.addEventListener('click', () => queuePersist('click'), true);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) queuePersist('visibility');
        });
        window.addEventListener('focus', () => queuePersist('focus'));
    }

    function collectChildWindows(rootWindow, output) {
        if (!rootWindow || !output) return;

        try {
            if (rootWindow.frames && typeof rootWindow.frames.length === 'number') {
                for (let index = 0; index < rootWindow.frames.length; index += 1) {
                    const child = rootWindow.frames[index];
                    if (child && child !== rootWindow) output.push(child);
                }
            }
        } catch (error) {
            // Ignore inaccessible frame collections.
        }

        try {
            const nodes = rootWindow.document.querySelectorAll('frame, iframe');
            nodes.forEach((node) => {
                try {
                    if (node.contentWindow && node.contentWindow !== rootWindow) {
                        output.push(node.contentWindow);
                    }
                } catch (innerError) {
                    // Ignore inaccessible frame windows.
                }
            });
        } catch (error) {
            // Ignore inaccessible documents.
        }
    }

    function readCourseNameFromWindowTree(rootWindow) {
        if (!rootWindow) return '';

        const queue = [rootWindow];
        const seen = new Set();

        while (queue.length > 0) {
            const candidate = queue.shift();
            if (!candidate) continue;
            if (seen.has(candidate)) continue;
            seen.add(candidate);

            try {
                const title = extractCourseNameFromDocument(candidate.document);
                if (title) return title;
            } catch (error) {
                // Cross-window access may fail; ignore and continue.
            }

            collectChildWindows(candidate, queue);
        }

        return '';
    }

    function readCourseNameFromRelatedWindows() {
        const roots = [window, window.parent, window.top, window.opener];

        for (const root of roots) {
            const title = readCourseNameFromWindowTree(root);
            if (title) return title;
        }

        return '';
    }

    function normalizeSameOriginUrl(rawUrl) {
        if (!rawUrl) return '';

        try {
            const url = new URL(rawUrl, window.location.href);
            if (url.origin !== window.location.origin) return '';
            return url.toString();
        } catch (error) {
            return '';
        }
    }

    function getCandidateCoursePageUrls() {
        const urls = [];
        const addUrl = (value) => {
            const normalized = normalizeSameOriginUrl(value);
            if (normalized && !urls.includes(normalized)) {
                urls.push(normalized);
            }
        };

        addUrl(document.referrer);

        try {
            addUrl(window.opener && window.opener.location && window.opener.location.href);
        } catch (error) {
            // Ignore inaccessible opener location.
        }

        try {
            addUrl(window.top && window.top.location && window.top.location.href);
        } catch (error) {
            // Ignore inaccessible top location.
        }

        addUrl(new URL(LEARN_HOME_PATH, window.location.origin).toString());
        return urls;
    }

    async function fetchCourseNameFromUrl(targetUrl) {
        const response = await fetch(targetUrl, {
            method: 'GET',
            credentials: 'include',
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return extractCourseNameFromDocument(doc);
    }

    async function fetchCourseNameFromCandidateUrls() {
        const urls = getCandidateCoursePageUrls();

        for (const url of urls) {
            try {
                const title = await fetchCourseNameFromUrl(url);
                if (title) return title;
            } catch (error) {
                console.log('[QB Export] Failed to fetch course page:', url, error);
            }
        }

        return '';
    }

    async function resolveExamTitle() {
        const syncTitle = resolveExamTitleSync();
        if (syncTitle) return syncTitle;

        const fetchedTitle = await fetchCourseNameFromCandidateUrls();
        if (fetchedTitle) return rememberExamTitle(fetchedTitle);

        return '';
    }

    function serializeJson(payload) {
        return JSON.stringify(payload, null, 2);
    }

    function downloadJsonFile(fileName, payload) {
        const blob = new Blob([serializeJson(payload)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function requestSaveFileHandle(suggestedName) {
        if (typeof window.showSaveFilePicker !== 'function') {
            return { supported: false, handle: null, aborted: false };
        }

        try {
            const handle = await window.showSaveFilePicker({
                suggestedName,
                types: [
                    {
                        description: 'JSON 檔案',
                        accept: {
                            'application/json': ['.json']
                        }
                    }
                ]
            });

            return { supported: true, handle, aborted: false };
        } catch (error) {
            if (error && error.name === 'AbortError') {
                return { supported: true, handle: null, aborted: true };
            }

            console.log('[QB Export] showSaveFilePicker failed:', error);
            return { supported: true, handle: null, aborted: false };
        }
    }

    async function saveJsonToHandle(handle, payload) {
        const blob = new Blob([serializeJson(payload)], { type: 'application/json;charset=utf-8' });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return handle && handle.name ? handle.name : '';
    }

    function showToast(message, type) {
        let toast = document.getElementById(TOAST_ID);
        if (!toast) {
            toast = document.createElement('div');
            toast.id = TOAST_ID;
            Object.assign(toast.style, {
                position: 'fixed',
                top: '20px',
                right: '20px',
                maxWidth: '360px',
                padding: '12px 16px',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                lineHeight: '1.5',
                boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                zIndex: '2147483647',
                whiteSpace: 'pre-wrap'
            });
            document.body.appendChild(toast);
        }

        const colors = {
            success: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
            warn: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
            error: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)',
            info: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)'
        };

        toast.style.background = colors[type] || colors.info;
        toast.textContent = message;
        toast.style.display = 'block';

        if (toast._hideTimer) {
            window.clearTimeout(toast._hideTimer);
        }
        toast._hideTimer = window.setTimeout(() => {
            toast.style.display = 'none';
        }, 2800);
    }

    async function exportQuestionBank() {
        if (!hasPublishedAnswers()) {
            showToast('尚未偵測到標準答案。\n請先按頁面上的「公布答案」後再匯出。', 'warn');
            return;
        }

        showToast('正在抓取課程名稱...', 'info');

        const optimisticTitle = resolveExamTitleSync() || '題庫匯出';
        const saveHandleResult = await requestSaveFileHandle(`${sanitizeFileName(optimisticTitle)}.json`);
        if (saveHandleResult.aborted) {
            showToast('已取消儲存。', 'warn');
            return;
        }

        const examTitle = await resolveExamTitle();
        if (!examTitle) {
            showToast('抓不到課程名稱。\n請先確認 `/learn/` 頁面可正常開啟，且頁面內有 `.coursename`。', 'error');
            return;
        }

        const questions = extractQuestionsFromPage(examTitle);
        if (questions.length === 0) {
            showToast('沒有擷取到任何題目，請確認目前頁面是否為解答頁。', 'error');
            return;
        }

        const answeredCount = questions.filter((item) => item.answer).length;
        if (answeredCount === 0) {
            showToast('沒有擷取到正確答案標記，請確認答案是否已公布。', 'error');
            return;
        }

        const fileName = `${sanitizeFileName(examTitle)}.json`;
        let finalFileName = fileName;

        if (saveHandleResult.handle) {
            try {
                const savedName = await saveJsonToHandle(saveHandleResult.handle, questions);
                if (savedName) finalFileName = savedName;
            } catch (error) {
                console.log('[QB Export] Failed to write via file picker:', error);
                downloadJsonFile(fileName, questions);
            }
        } else {
            downloadJsonFile(fileName, questions);
        }

        showToast(`匯出完成：${questions.length} 題\n檔名：${finalFileName}`, 'success');
    }

    function createToolbar() {
        if (!document.body || document.getElementById(TOOLBAR_ID)) return;

        const toolbar = document.createElement('div');
        toolbar.id = TOOLBAR_ID;
        Object.assign(toolbar.style, {
            position: 'fixed',
            top: '50%',
            left: '0',
            transform: 'translateY(-50%)',
            zIndex: '2147483646',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px',
            background: 'rgba(0,0,0,0.85)',
            borderRadius: '0 12px 12px 0',
            boxShadow: '2px 0 15px rgba(0,0,0,0.3)'
        });

        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.type = 'button';
        button.innerHTML = '一鍵<br>匯出';
        Object.assign(button.style, {
            width: '60px',
            height: '78px',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #0f766e 0%, #0284c7 100%)',
            color: '#fff',
            fontWeight: '700',
            fontSize: '18px',
            lineHeight: '1.2',
            transition: 'transform 0.2s ease, filter 0.2s ease'
        });
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.08)';
            button.style.filter = 'brightness(1.05)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
            button.style.filter = 'none';
        });
        button.addEventListener('click', exportQuestionBank);

        toolbar.appendChild(button);
        document.body.appendChild(toolbar);
    }

    function init() {
        startCourseContextTracking();
        if (isViewResultPage()) {
            createToolbar();
        }
    }

    window.__QB_EXPORTER__ = {
        extractQuestionsFromPage,
        hasPublishedAnswers,
        getRecentStoredCourseName,
        readStoredCourseContext,
        resolveExamTitleSync,
        resolveExamTitle,
        exportQuestionBank
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

    window.addEventListener('load', init, { once: true });
})();
