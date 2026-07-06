/**
 * Feishu Doc Unlocker — Popup Script
 */

(function () {
  'use strict';

  // ---- DOM Elements ----

  const toggleBtn = document.getElementById('toggleBtn');
  const statusText = document.getElementById('statusText');
  const statusDesc = document.getElementById('statusDesc');
  const copyAllBtn = document.getElementById('copyAllBtn');
  const reloadBtn = document.getElementById('reloadBtn');
  const toast = document.getElementById('toast');

  let isEnabled = true;

  // ---- Helper: Show Toast ----

  let toastTimer = null;
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () {
        toast.classList.add('hidden');
      }, 300);
    }, 2000);
  }

  // ---- Helper: Send Message to Content Script ----

  function sendToContent(action, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs[0]) {
        if (callback) callback(null);
        return;
      }
      const tab = tabs[0];
      const url = tab.url || '';

      // 检查是否在支持的域名上
      const isSupported =
        url.includes('feishu.cn') ||
        url.includes('larkoffice.com') ||
        url.includes('larksuite.com');

      if (!isSupported) {
        if (callback) callback({ error: 'unsupported' });
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: action }, function (response) {
        if (chrome.runtime.lastError) {
          // Content script 可能未加载，尝试重新加载页面
          if (callback) callback({ error: 'no_content_script' });
          return;
        }
        if (callback) callback(response);
      });
    });
  }

  // ---- Update UI Based on State ----

  function updateUI(enabled) {
    isEnabled = enabled;

    if (enabled) {
      statusText.textContent = '已解锁';
      statusText.className = 'status-badge status-on';
      statusDesc.textContent = '文本已可自由选中、复制、右键';
      toggleBtn.className = 'toggle-btn toggle-btn--on';
    } else {
      statusText.textContent = '已锁定';
      statusText.className = 'status-badge status-off';
      statusDesc.textContent = '已恢复飞书默认的复制限制';
      toggleBtn.className = 'toggle-btn toggle-btn--off';
    }
  }

  // ---- Init: Get Current Status ----

  function init() {
    sendToContent('getStatus', function (response) {
      if (response && response.error === 'unsupported') {
        statusText.textContent = '不支持的页面';
        statusText.className = 'status-badge status-off';
        statusDesc.textContent = '请在飞书/Lark 文档页面使用此扩展';
        toggleBtn.style.opacity = '0.5';
        toggleBtn.style.pointerEvents = 'none';
        copyAllBtn.style.opacity = '0.5';
        copyAllBtn.style.pointerEvents = 'none';
        return;
      }

      if (response && response.error === 'no_content_script') {
        statusText.textContent = '请刷新页面';
        statusText.className = 'status-badge status-off';
        statusDesc.textContent = '扩展脚本未加载，请刷新文档页面后重试';
        return;
      }

      if (response && typeof response.enabled === 'boolean') {
        updateUI(response.enabled);
      } else {
        // 默认启用
        updateUI(true);
      }
    });
  }

  // ---- Toggle ----

  toggleBtn.addEventListener('click', function () {
    sendToContent('toggle', function (response) {
      if (response && typeof response.enabled === 'boolean') {
        updateUI(response.enabled);
        showToast(response.enabled ? '已解锁，可自由复制' : '已恢复限制');
      }
    });
  });

  // ---- Copy All ----

  copyAllBtn.addEventListener('click', function () {
    sendToContent('extractContent', function (response) {
      if (!response || !response.content) {
        showToast('未能提取文档内容，请刷新页面后重试');
        return;
      }

      const content = response.content;
      if (content.length < 20) {
        showToast('提取内容过短，请确认当前页面是文档正文');
        return;
      }

      // 复制到剪贴板
      navigator.clipboard
        .writeText(content)
        .then(function () {
          showToast(
            '已复制 ' +
              content.length +
              ' 个字符到剪贴板'
          );
        })
        .catch(function () {
          // 回退方案：使用 textarea
          const textarea = document.createElement('textarea');
          textarea.value = content;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            showToast(
              '已复制 ' +
                content.length +
                ' 个字符到剪贴板'
            );
          } catch (e) {
            showToast('复制失败，请尝试手动选中文本后 Ctrl+C');
          }
          document.body.removeChild(textarea);
        });
    });
  });

  // ---- Reload ----

  reloadBtn.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id);
        window.close();
      }
    });
  });

  // ---- Start ----

  init();
})();
