# macOS 屏幕保护程序

把 `wallpapers/` 里的单文件 HTML 壁纸打包成原生 `.saver`，交给 macOS 的
`ScreenSaver.framework` 播放。每个壁纸生成一个独立的屏保，内核是一个嵌入了
`WKWebView` 的 `ScreenSaverView`。

```
screensaver/
├─ LumenSaverView.m      屏保视图：WKWebView + ScreenSaverView
├─ build.js              编译 / 打包 / 签名 / 安装 / 自检
├─ tools/SaverHarness.m  渲染自检工具（独立进程截图 + JS 探针）
└─ build/                构建产物（已 gitignore）
```

## 快速使用

```bash
npm run saver:install
```

然后打开 **系统设置 → 墙纸 → 屏幕保护程序…**，在列表底部选择
「流光 · 墨荷游鱼」等任意一个。

只构建不安装：

```bash
npm run saver
# 产物在 screensaver/build/
```

渲染自检（不需要真的启动屏保）：

```bash
npm run saver:test
# 截图写到 screensaver/.build/snapshots/
```

## 原理

- 每个 `.saver` 只携带一个 `wallpaper.html`，放在 `Contents/Resources/`。
  屏保进程是沙盒化的，直接读 `~/…/wallpapers` 可能被拒绝，所以把 HTML 打进包里。
- `LumenSaverView` 是 `ScreenSaverView` 的子类，内部放一个 `WKWebView`，
  用 `loadFileURL:allowingReadAccessToURL:` 加载 `wallpaper.html`。
- 屏保启动 / 停止时由系统调用 `startAnimation` / `stopAnimation`；
  停止时隐藏 `WKWebView`，壁纸里的 `visibilitychange` 逻辑会暂停 `requestAnimationFrame`。
- 注入一小段 CSS/脚本，给 `<html>` 加上 `lumen-saver` 类并隐藏 HUD、操作提示、
  光标等交互元素，让屏保画面保持干净。
- 系统为每块显示器创建一个 `ScreenSaverView` 实例，多屏各自播放。
- 产物做 ad-hoc 签名（`codesign -s -`）。本机 `legacyScreenSaver` 带
  `disable-library-validation`，未签名也能加载，但签名后更接近正常分发形态。

## 兼容性

- 需要 macOS 13+；在 macOS 26（Apple Silicon）上构建并自检通过。
- 屏保宿主是按 arm64 + x86_64 通用二进制编译的；HTML 里的 WebGL 2 由 WebKit 负责，
  使用 Apple GPU。
- 屏保运行在 `legacyScreenSaver` 进程里，`ScreenSaver.framework` 仍然支持
  `~/Library/Screen Savers/*.saver`；macOS 26 把它收进了「墙纸」设置面板。

## 增加 / 更新壁纸

在 `wallpapers/` 下新增 `<id>/wallpaper.html`（可选 `meta.json`），重新执行：

```bash
npm run saver:install
```

`build.js` 会自动扫描所有壁纸、读取 `meta.json` 的 `title` 作为屏保名，
并清理旧的 Lumen 屏保（通过 Info.plist 里的 `LumenWallpaperIdentifier` 识别，
不会动其他屏保）。

## 卸载

```bash
rm -rf ~/Library/"Screen Savers"/流光*.saver
```

## 已知限制

- 屏保不会主动降帧。WebGL 壁纸在 120Hz 屏幕上仍然按页面 `requestAnimationFrame`
  节奏绘制，长时间亮屏会耗电，出门前建议用系统设置里的「使用电池时…」策略。
- 屏保里的壁纸没有鼠标 / 键盘交互，只播放动画。
- 如果系统设置里的缩略图是黑的，先选一次全屏预览；WebKit 首帧需要一点时间。
- 自检工具会临时关闭 WebKit 的窗口遮挡检测（`_setWindowOcclusionDetectionEnabled:`），
  否则后台窗口里的 `requestAnimationFrame` 会被暂停；屏保本体不需要这个私有开关。
