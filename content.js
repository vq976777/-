/**
 * Feishu Doc Unlocker — Content Script
 *
 * 飞书 / Lark 文档的复制限制通常通过三层防护实现：
 *   1. CSS 层：user-select: none 禁止选中
 *   2. 事件层：拦截 copy / cut / contextmenu / selectstart 事件
 *   3. 键盘层：拦截 Ctrl+C / Ctrl+A / Ctrl+X
 *
 * 本脚本在捕获阶段 (capture phase) 介入，在飞书自身的事件处理器执行前
 * 放行被阻止的事件；同时注入 CSS 强制恢复文本选中能力。
 */

(function () {
  'use strict';

  // ============================================================
  // 配置
  // ============================================================

  const STYLE_ID = '__feishu_unlocker_style__';
  const ENABLED_KEY = 'feishu_unlocker_enabled';

  // 当前站点类型
  const host = location.hostname;
  const isFeishu = host.includes('feishu.cn');
  const isLark = host.includes('larkoffice.com') || host.includes('larksuite.com');

  if (!isFeishu && !isLark) return;

  // ============================================================
  // 状态管理
  // ============================================================

  let enabled = true;

  function loadState() {
    chrome.storage.local.get([ENABLED_KEY], function (result) {
      enabled = result[ENABLED_KEY] !== false; // 默认为 true
      if (enabled) {
        enable();
      } else {
        disable();
      }
    });
  }

  chrome.storage.onChanged.addListener(function (changes) {
    if (ENABLED_KEY in changes) {
      enabled = changes[ENABLED_KEY].newValue !== false;
      if (enabled) {
        enable();
      } else {
        disable();
      }
    }
  });

  // ============================================================
  // CSS 注入：强制恢复文本选中能力
  // ============================================================

  const OVERRIDE_CSS = `
    /* 全局恢复文本选中 */
    * {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }

    /* 飞书常见的阻塞容器 */
    [class*="block"],
    [class*="page"],
    [class*="content"],
    [class*="editor"],
    [class*="document"],
    [class*="doc-"],
    [class*="sheet"],
    [class*="wiki"],
    [class*="note"],
    div[data-block-root="true"],
    .docs-block,
    .lark-block,
    .page-content,
    .editor-content,
    .sheet-content {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }

    /* 光标样式恢复 */
    body, p, span, div, h1, h2, h3, h4, h5, h6,
    li, td, th, pre, code, blockquote {
      cursor: auto !important;
    }
  `;

  let styleElement = null;

  function injectCSS() {
    if (styleElement) return;
    styleElement = document.createElement('style');
    styleElement.id = STYLE_ID;
    styleElement.textContent = OVERRIDE_CSS;
    (document.head || document.documentElement).appendChild(styleElement);
  }

  function removeCSS() {
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
    // 也清理可能残留的同 ID 元素
    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();
  }

  // ============================================================
  // 事件拦截：在捕获阶段放行被阻止的事件
  // ============================================================

  const BLOCKED_EVENTS = [
    'copy',
    'cut',
    'paste',
    'contextmenu',
    'selectstart',
    'dragstart',
    'mousedown',
    'mouseup',
  ];

  /**
   * 事件处理器 —— 在捕获阶段拦截，阻止飞书自己的 handler 执行。
   */
  function eventUnblocker(e) {
    if (!enabled) return; // 如果扩展被关闭，不做任何事

    // 对于 copy / cut / contextmenu / selectstart：停止 immediate propagation，
    // 使飞书在 bubbling 阶段注册的阻止 handler 收不到事件。
    //
    // 注意：不能 stopPropagation（会阻止所有冒泡），必须 stopImmediatePropagation
    // 来阻止同一元素上后续的同类监听器。
    if (BLOCKED_EVENTS.includes(e.type)) {
      e.stopImmediatePropagation();
    }
  }

  /**
   * 键盘事件 —— 在捕获阶段拦截，放行 Ctrl+C / Ctrl+A / Ctrl+X 等
   */
  function keydownUnblocker(e) {
    if (!enabled) return;

    // Ctrl / Cmd 组合键
    const mod = e.ctrlKey || e.metaKey;

    // 放行的快捷键
    const allowedKeys = new Set(['c', 'a', 'x', 'v', 'z', 'y', 's']);
    const allowedWithShift = new Set(['c', 'a', 'x', 'v', 'z', 'y', 's']);

    if (mod && (allowedKeys.has(e.key.toLowerCase()) ||
        (e.shiftKey && allowedWithShift.has(e.key.toLowerCase())))) {
      e.stopImmediatePropagation();
      // 不调用 preventDefault，让浏览器执行默认复制行为
    }
  }

  let eventListenersAttached = false;

  function attachEventListeners() {
    if (eventListenersAttached) return;

    // 使用 capture: true 在捕获阶段拦截，优先级高于飞书在 bubbling 阶段的 handler
    BLOCKED_EVENTS.forEach(function (eventName) {
      document.addEventListener(eventName, eventUnblocker, true);
    });

    document.addEventListener('keydown', keydownUnblocker, true);
    eventListenersAttached = true;
  }

  function detachEventListeners() {
    if (!eventListenersAttached) return;

    BLOCKED_EVENTS.forEach(function (eventName) {
      document.removeEventListener(eventName, eventUnblocker, true);
    });

    document.removeEventListener('keydown', keydownUnblocker, true);
    eventListenersAttached = false;
  }

  // ============================================================
  // MutationObserver: 处理动态加载的 iframe / shadow DOM
  // ============================================================

  let observer = null;

  function observeDOM() {
    if (observer) return;

    observer = new MutationObserver(function (mutations) {
      if (!enabled) return;

      // 检查是否有新增的 iframe
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.tagName === 'IFRAME') {
            try {
              const iframeDoc =
                node.contentDocument || node.contentWindow.document;
              if (iframeDoc) {
                // 向 iframe 内部注入样式
                const iframeStyle = document.createElement('style');
                iframeStyle.textContent = OVERRIDE_CSS;
                iframeDoc.head.appendChild(iframeStyle);

                // 向 iframe 内部注入事件拦截
                BLOCKED_EVENTS.forEach(function (eventName) {
                  iframeDoc.addEventListener(
                    eventName,
                    eventUnblocker,
                    true
                  );
                });
                iframeDoc.addEventListener('keydown', keydownUnblocker, true);
              }
            } catch (e) {
              // 跨域 iframe 无法访问，忽略
            }
          }

          // 处理 shadow DOM
          if (node.nodeType === Node.ELEMENT_NODE && node.shadowRoot) {
            try {
              const shadowStyle = document.createElement('style');
              shadowStyle.textContent = OVERRIDE_CSS;
              node.shadowRoot.appendChild(shadowStyle);
            } catch (e) {
              // shadow root 可能已关闭
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function disconnectObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  // ============================================================
  // 启用 / 禁用
  // ============================================================

  function enable() {
    injectCSS();
    attachEventListeners();
    observeDOM();
  }

  function disable() {
    removeCSS();
    detachEventListeners();
    disconnectObserver();
  }

  // ============================================================
  // 初始化
  // ============================================================

  // 等待飞书的 JS 先执行（它们通常在 DOMContentLoaded 或更晚注册事件）
  // document_end 已经保证了 DOM 完整，再加一个微小的延迟确保飞书初始化完成
  function init() {
    loadState();
  }

  if (document.readyState === 'complete') {
    setTimeout(init, 500);
  } else {
    window.addEventListener('load', function () {
      setTimeout(init, 500);
    });
  }

  // ============================================================
  // 对外 API：供 popup 调用
  // ============================================================

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.action) {
      case 'getStatus':
        sendResponse({ enabled: enabled });
        break;

      case 'enable':
        enabled = true;
        chrome.storage.local.set({ [ENABLED_KEY]: true });
        enable();
        sendResponse({ success: true });
        break;

      case 'disable':
        enabled = false;
        chrome.storage.local.set({ [ENABLED_KEY]: false });
        disable();
        sendResponse({ success: true });
        break;

      case 'toggle':
        enabled = !enabled;
        chrome.storage.local.set({ [ENABLED_KEY]: enabled });
        if (enabled) enable();
        else disable();
        sendResponse({ success: true, enabled: enabled });
        break;

      case 'extractContent':
        // 提取当前页面文档正文
        sendResponse({ content: extractDocumentContent() });
        break;
    }
  });

  // ============================================================
  // 文档内容提取（可选功能：一键复制全文）
  // ============================================================

  function extractDocumentContent() {
    // 飞书文档的内容通常在特定的 block 容器中
    const selectors = [
      '[class*="block"]',
      '[class*="editor"]',
      '[class*="document"]',
      '[data-block-root="true"]',
      '.page-content',
      '.editor-content',
      '[role="textbox"]',
    ];

    let content = '';

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        const texts = [];
        elements.forEach(function (el) {
          const text = el.innerText || el.textContent || '';
          if (text.trim()) {
            texts.push(text.trim());
          }
        });
        content = texts.join('\n\n');
        if (content.length > 100) break; // 找到足够多的内容就停止
      }
    }

    // 如果选择器都没匹配到，回退到 body
    if (!content || content.length < 50) {
      content = (document.body.innerText || document.body.textContent || '').trim();
    }

    return content;
  }
})();
