# 风洞 · 卡宴

深灰色保时捷卡宴静止在风洞试验段。干冰雾气从地面漫起，沿前轮拱、侧裙和车顶边缘散开；几组流线掠过发动机盖、挡风玻璃与车顶，随后没入背景的巨型风扇。

- **分辨率**：3840 × 2160（16:9，4K）
- **文件**：`preview.png` 原图 · `preview.jpg` 4K JPEG · `preview-1920.jpg` 1080p · `wallpaper.html` 单文件动态壁纸
- **构图**：3/4 前侧低机位；冷蓝主光、暖色后缘轮廓光、湿地面反射与体积雾

## 画面实现

车身采用高精度 3D 汽车渲染素材，按公开的 2015 款 Cayenne（958.2）比例校准；风洞、滚动路面、风扇、地面反射和雾气由 Three.js 程序化场景渲染为 4K 底板，再与车身遮罩、干冰雾、表面流线、接触阴影、辉光和胶片颗粒在合成阶段完成。

参考参数：

| 项目 | 数值 |
| --- | --- |
| 车长 | 4855 mm |
| 车宽 | 1939 mm |
| 车高 | 1705 mm |
| 轴距 | 2895 mm |
| 前/后轮距 | 1655 / 1666 mm |
| 风阻系数 | Cd ≈ 0.34 |
| 标准轮胎 | 255/55 R18（渲染轮毂尺寸更大） |

雾气和流线不是贴图：低层雾由多尺度 FBM 噪声与软粒子叠加，沿车身轮廓与轮拱生成；流线沿发动机盖、A 柱、车顶和肩线绘制，并带有轻微的发光的流动层。

## 动态壁纸

直接打开 `wallpaper.html` 即可全屏播放。图片已内嵌，无外部字体、图片、音频或网络请求。

- 默认：58 秒一次的极慢呼吸式推拉，避免桌面壁纸产生明显运动。
- `?still=1`：强制静帧。
- 系统开启「减少动态效果」时自动静帧。
- 按 `Esc` 可退出浏览器全屏（浏览器行为）。

## 素材与授权

- 车身渲染素材来自 **PNGimg** 的 Porsche Cayenne PNG（图号 10610），原图版权归 **Porsche AG** 所有：<https://pngimg.com/image/10610>。本作品将其作为个人壁纸用途的汽车视觉素材；如需公开再分发或商用，请替换为取得授权的车辆素材。
- 风洞环境、雾、流线、调色与合成代码为本项目原创；环境底板使用 [Three.js](https://threejs.org/)（MIT）。
- 车型与商标归 Porsche AG 所有；本作品与 Porsche AG 无关联。

## 源文件

生成脚本位于仓库 `scripts/phantom-wind-tunnel/`：

- `composite_final.py`：4K 车身、地面、雾气与合成
- `final_streamlines.py`：最终流线层
- `final_grade.py`：底部压暗与色彩收尾
- `render2.js` / `scene.js`：风洞底板渲染

重新生成：

```powershell
# 1. 渲染 4K 风洞底板
.\node_modules\electron\dist\electron.exe scripts\phantom-wind-tunnel\render2.js `
  --nocar --fov 30 --cam 3.2,2.0,6.8,0,0.95,0 --w 3840 --h 2160 --out temp\plate-4k.png

# 2. 合成与流线
& $PY scripts\phantom-wind-tunnel\composite_final.py
& $PY scripts\phantom-wind-tunnel\final_streamlines.py
& $PY scripts\phantom-wind-tunnel\final_grade.py
```
