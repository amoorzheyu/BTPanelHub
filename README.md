# BTPanelHub

Chrome / Chromium Manifest V3 扩展，在工具栏 Popup 中本地管理多台宝塔面板。

## 开发

Node.js 24+，执行 `npm ci`、`npm run dev`，打开开发服务的 `/popup.html`。普通网页只用于界面开发，浏览器能力必须加载扩展验证。

执行 `npm run build`，在 Chrome 的 `chrome://extensions` 开启开发者模式，选择“加载已解压的扩展程序”，选择本项目 `dist` 目录。更新构建后点击扩展卡片的刷新按钮。

执行 `npm test` 运行核心逻辑测试。

## 数据与权限

配置与凭据仅存于 `chrome.storage.local`。本地存储不是系统密码保险柜；可选站点权限仅用于主动启用的自动登录。仅打开面板不要求站点权限。导出默认排除密码，带密码的备份应妥善保管。验证码、MFA、未知登录页需要手动操作。

原始设计资料位于被 Git 忽略的 `docs/`，测试凭据不包含在源码和构建产物中。
