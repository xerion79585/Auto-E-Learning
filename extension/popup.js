/* global chrome */

(function () {
  'use strict';

  const ACTIVATED_KEY = '_m2';
  const status = document.getElementById('status');
  const form = document.getElementById('activation-form');
  const password = document.getElementById('password');

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        const error = chrome.runtime.lastError;
        if (error) reject(new Error(error.message));
        else resolve(response);
      });
    });
  }

  function setStatus(text, error) {
    status.textContent = text;
    status.style.color = error ? '#b91c1c' : '#475569';
  }

  async function refresh() {
    const values = await sendMessage({ type: 'storage.getAll' });
    const activated = String(values && values[ACTIVATED_KEY] || '') === '1';
    form.hidden = activated;
    setStatus(activated ? '已啟用。進入支援網站後會自動檢查白名單。' : '尚未啟用。');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const result = await sendMessage({ type: 'auth.verify', password: password.value, uid: '' });
      if (!result || !result.valid) {
        const reason = result && result.reason;
        setStatus(reason === 'used' ? '此密碼已使用過。' : reason === 'server_error' ? '驗證服務暫時無法連線。' : '密碼錯誤。', true);
        return;
      }
      await sendMessage({ type: 'storage.set', key: ACTIVATED_KEY, value: '1' });
      await sendMessage({ type: 'auth.changed' });
      password.value = '';
      setStatus('啟用成功。請回到支援的網站完成白名單檢查。');
    } catch (error) {
      setStatus(`啟用失敗：${error.message}`, true);
    } finally {
      button.disabled = false;
    }
  });

  refresh().catch((error) => setStatus(`讀取失敗：${error.message}`, true));
})();
