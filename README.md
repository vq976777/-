# Feishu Doc Unlocker / 飞书文档解锁器

[English](#english) | [中文](#中文)

---

## English

A Chrome/Edge browser extension that removes copy restrictions on Feishu (Lark) documents. When enabled, you can freely select text, right-click, and copy content from Feishu documents — even those with copy protection enabled by the document owner.

### Supported Platforms

| Platform | Domain |
|----------|--------|
| Feishu (飞书) | `*.feishu.cn` |
| Lark (Overseas) | `*.larkoffice.com` |
| Lark Suite | `*.larksuite.com` |

### Features

- **One-click unlock** — toggle the copy restriction on/off from the extension popup
- **Restore text selection** — forcefully overrides `user-select: none` CSS
- **Re-enable keyboard shortcuts** — Ctrl+C, Ctrl+A, Ctrl+X, Ctrl+V all work
- **Restore right-click menu** — context menu is available again
- **Copy all content** — one-click button to extract and copy the entire document body
- **iframe support** — handles Feishu's iframe-embedded content blocks
- **Dynamic content** — uses MutationObserver to handle lazy-loaded content

### How It Works

Feishu/Lark applies three layers of copy protection:

| Layer | Mechanism | Our Solution |
|-------|-----------|--------------|
| CSS | `user-select: none` on all elements | Inject an override stylesheet with `!important` |
| DOM Events | Block `copy` / `cut` / `contextmenu` / `selectstart` | Capture events at the capture phase (before Feishu's handlers run) with `stopImmediatePropagation()` |
| Keyboard | Block Ctrl+C / Ctrl+A via `keydown` | Intercept `keydown` in capture phase, allow common shortcuts |

### Installation

#### From Chrome Web Store (Coming Soon)

1. Visit the Chrome Web Store page
2. Click "Add to Chrome"

#### Developer Mode (Manual)

1. Download or clone this repository:
   ```bash
   git clone https://github.com/vq976777/-.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the project folder
5. The extension icon should appear in your toolbar

### Usage

1. Open any Feishu/Lark document page
2. Click the extension icon in the toolbar
3. The popup shows the current status — **Unlocked** means copy protection is disabled
4. Click the toggle to switch between unlocked/locked
5. Use **Copy All Content** to extract and copy the entire document at once
6. Select text, right-click, and use Ctrl+C as you normally would

### Project Structure

```
feishu-doc-unlocker/
├── manifest.json         # Chrome Extension manifest (Manifest V3)
├── content.js            # Content script — core unlock logic
├── popup/
│   ├── popup.html        # Extension popup UI
│   ├── popup.css         # Popup styles
│   └── popup.js          # Popup interaction logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md
├── README_CN.md
└── LICENSE
```

### Technical Details

- **Manifest V3** compliant
- Pure vanilla JavaScript — no framework dependencies
- Uses `stopImmediatePropagation()` in the **capture phase** to neutralize Feishu's event blockers before they execute
- `MutationObserver` monitors dynamic DOM changes (Feishu loads content lazily)
- Handles cross-origin iframe limitations gracefully

### Privacy

This extension:
- Does NOT collect any data
- Does NOT send any network requests
- Does NOT use any analytics or tracking
- All code runs locally on your browser
- Source code is fully open for inspection

### Disclaimer

This tool is intended for personal use to improve the reading and note-taking experience on Feishu/Lark documents you have legitimate access to. Please respect document owners' intellectual property rights and do not use this tool to redistribute content without permission.

### License

MIT License — see [LICENSE](./LICENSE) for details.

---

## 中文

一个 Chrome/Edge 浏览器扩展，用于解除飞书（Lark）文档的复制限制。启用后，即使文档所有者设置了禁止复制权限，你也可以自由选中文字、右键、复制文档内容。

### 支持的平台

| 平台 | 域名 |
|------|------|
| 飞书（国内版） | `*.feishu.cn` |
| Lark（海外版） | `*.larkoffice.com` |
| Lark Suite | `*.larksuite.com` |

### 功能

- **一键解锁** — 从扩展弹窗中切换是否解除复制限制
- **恢复文本选中** — 强制覆盖 `user-select: none` CSS
- **恢复快捷键** — Ctrl+C、Ctrl+A、Ctrl+X、Ctrl+V 均可正常使用
- **恢复右键菜单** — 重新启用右键菜单
- **复制全文** — 一键提取并复制文档全部正文内容
- **支持 iframe** — 处理飞书内嵌的 iframe 内容块
- **动态内容监听** — 使用 MutationObserver 处理懒加载的内容

### 工作原理

飞书/Lark 通过三层防护来限制复制：

| 层次 | 机制 | 本文方案 |
|------|------|----------|
| CSS | 所有元素设置 `user-select: none` | 注入带 `!important` 的覆盖样式表 |
| DOM 事件 | 拦截 `copy` / `cut` / `contextmenu` / `selectstart` | 在捕获阶段用 `stopImmediatePropagation()` 抢先拦截 |
| 键盘 | 通过 `keydown` 拦截 Ctrl+C / Ctrl+A 等 | 在捕获阶段拦截 keydown，放行常用快捷键 |

### 安装方法

#### 从 Chrome 应用商店安装（即将上线）

1. 访问 Chrome 应用商店页面
2. 点击"添加至 Chrome"

#### 开发者模式（手动安装）

1. 下载或克隆此仓库：
   ```bash
   git clone https://github.com/vq976777/-.git
   ```
2. 打开 Chrome 浏览器，进入 `chrome://extensions/`
3. 打开右上角的 **开发者模式** 开关
4. 点击 **加载已解压的扩展程序**，选择项目文件夹
5. 工具栏中会出现扩展图标

### 使用方法

1. 打开任意飞书/Lark 文档页面
2. 点击工具栏中的扩展图标
3. 弹窗中会显示当前状态——**已解锁** 表示复制限制已解除
4. 点击开关按钮在解锁/锁定之间切换
5. 使用 **复制全文内容** 按钮一键提取并复制整个文档
6. 像平常一样选中文字、右键、使用 Ctrl+C 复制

### 隐私说明

此扩展：
- 不收集任何数据
- 不发送任何网络请求
- 不使用任何分析或追踪服务
- 所有代码仅在本地浏览器中运行
- 源代码完全开放审阅

### 免责声明

本工具仅供个人在合法访问的飞书/Lark 文档上改善阅读和笔记体验使用。请尊重文档所有者的知识产权，未经许可不要使用本工具分发他人内容。

### 开源协议

MIT License — 详见 [LICENSE](./LICENSE)
