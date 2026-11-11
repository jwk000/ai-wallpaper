# 字海 · Words in Orbit

按词频缩放的立体词云动态壁纸。浅绿、青蓝与暖白文字沿球面旋转，伴随低频漂移、前后景深和细微星尘。无需网络资源。壁纸库自动发现本目录的 `wallpaper.html`。

## 使用

1. 在流光壁纸库刷新并选择「字海」，或直接打开 `wallpaper.html`。首次显示明确标记的演示词云，不代表你的输入记录。
2. 点「输入与设置」，在文字框中使用输入法打字或粘贴文字。中文按词分割，词频越高字体越大；第一次输入自动切换到个人词云，演示数据不混入统计。
3. Windows 跨应用统计：双击 `启动输入统计.cmd`，保持窗口运行，将窗口显示的连接口令粘贴到壁纸的「连接 Windows 输入」。也可打开该窗口显示的本地预览地址。需要 Windows 10/11 x64、.NET Framework 4.x 和 Node.js 18+。
4. 预览窗口与桌面宿主的浏览器存储相互独立；在需要显示词频的页面中分别连接。默认固定端口 `127.0.0.1:18767`，不监听局域网。

快捷键：`Space` 暂停旋转，`H` 隐藏或显示界面，`F` 全屏。设置中可调整速度、显示词数，切换演示/个人词云，清空当前来源词频。动画暂停不暂停输入统计；系统采集使用单独的暂停按钮。遵循系统减少动态效果偏好。

微信输入法沿用上述 Windows 本地采集器：统计输入框中的新增文字，不读取微信输入法的历史词库。具体效果取决于正在输入的应用；尚未完成微信输入法实际组合输入的兼容性验证。可以在壁纸自带输入框确认候选文字后观察词频，再检查跨应用输入。

词语避让保留上一帧的位置和速度，使用连续的弹性避让；词频更新保留原有轨道，字号渐变，新词淡入，退出显示范围的词淡出。

## 数据与统计口径

- 本页输入：处理 `compositionend` 和非组合输入；组合输入期间不计数，提交后按文本差异只记新增内容。普通输入停顿 600ms 后统计，粘贴也算输入。删除不减去历史词频，替换后的新增部分会计入。
- 使用 `Intl.Segmenter('zh-CN')` 分词，英文统一小写，过滤标点、纯数字及少量常见虚词。最多保留 10,000 个不同词；画面展示频率最高的 20–200 个词，每个词只显示一次。字体大小按词频平方根缩放；景深改变透明度，保持频率与字形大小的对应关系。
- 本页词频存在浏览器 `localStorage`。采集器词频保存在 `%LOCALAPPDATA%\Lumen\word-cloud\frequencies.json`，只存「词、次数」，不存原句。连接口令也保存在该目录和连接页面的本机存储中。数据不会上传。
- 采集器每 220ms 读取当前焦点输入框，经 900ms 稳定检测后统计新增文本。首次聚焦已有内容只作为基线，不导入旧文档。密码、只读控件、超过 32,768 字符的输入框和不支持的控件跳过。原始快照仅短暂存在内存及本机进程管道里。
- **这是兼容性受限的近似输入统计，不是读取输入法词库或历史，也不是系统级 IME 提交事件。** 依赖目标应用提供 UI Automation 的可编辑 ValuePattern/TextPattern。部分浏览器、聊天软件、终端、游戏和自绘编辑器可能不支持。未确认候选文字若被应用暴露且停留较久可能被误计；快速发送、焦点切换、长时间连续输入和撤销可能漏计或重复。程序修改当前输入框也可能计入。具体输入法与应用组合需要实测。
- 系统连接成功后只显示系统词频，本页自己的输入统计暂停，避免两路相加。断开后返回本页词频；断开仅停止壁纸取数。**关闭采集器窗口或 Ctrl+C 才会停止跨应用采集。** 采集器没有开机自启、管理员要求或键盘钩子。
- 如果桌面模式不接收鼠标，可先在交互预览里使用本页输入；跨宿主同步需让各宿主页面分别连接采集器。直接用采集器的本地网页可操作全部控制。

## 开发验证

在项目根目录执行：

```powershell
node wallpapers/word-cloud/verify-core.cjs
node wallpapers/word-cloud/verify-motion.cjs
powershell -NoProfile -ExecutionPolicy Bypass -File wallpapers/word-cloud/verify-native.ps1
$env:ELECTRON_RUN_AS_NODE = $null
& node_modules/electron/dist/electron.exe wallpapers/word-cloud/verify-render.cjs
```

`verify-core.cjs` 检查分词、焦点基线、去重、删除、稳定窗口、口令与跨域检查、暂停、清空和持久化；`verify-native.ps1` 只读取测试程序自己创建的 Windows 输入框，验证原生中文读取、密码和只读排除；`verify-render.cjs` 在真实 Chromium 中检查画面、输入事件、横竖屏、暂停、重载和采集器连接，并生成库预览。验证只使用合成文字，不启动实际全局采集。

`verify-motion.cjs` 在横屏、竖屏和超宽屏分别模拟 1,800 帧，检查逐帧位移、速度变化、新词淡入，以及词频排名变化时轨道不跳变、字号渐变。

参考：[Microsoft UI Automation TextPattern](https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/ui-automation-textpattern-overview)、[compositionend](https://developer.mozilla.org/en-US/docs/Web/API/Element/compositionend_event)。
