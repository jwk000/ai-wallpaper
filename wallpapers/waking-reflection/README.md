# 雨城的倒影先醒了 · The Reflection Wakes First

雨夜的窗灯与电车在倒影中提前出现，水中的楼宇渐渐长成树；雨圈偶尔让两个世界重新对齐。

这是一幅独立壁纸。打开本目录的 wallpaper.html 即可离线播放，也会作为独立条目被流光壁纸自动扫描。无外部字体、图片、音频或网络依赖。

- H：打开或关闭设置；空格：暂停或继续；E：两个世界对齐；R：变换构图。
- 设置中可调流速和画质。系统“减少动态效果”默认显示静帧，可手动继续。页面隐藏时停止绘制，暂停及静帧状态调整窗口仍会重绘。
- 特殊事件也会按各作品的时间节奏自然出现。暂停时触发会显示事件中段；播放时触发从头开始。
- 支持 ?seed=42&t=30&still=1&hud=0&quality=low 参数；t 为动画秒数，still=0 可明确启用动画。
- 画布最多约 260 万像素（节能 120 万），目标 30 FPS；不依赖帧数推进动画。

源代码：scripts/dream-atlas/waking-reflection.js 与 runtime.js；运行 node scripts/dream-atlas/build.cjs 重新生成单文件 HTML。运行 node scripts/verify-dream-atlas.cjs 验证；加 --capture 更新预览和在线馆素材。
