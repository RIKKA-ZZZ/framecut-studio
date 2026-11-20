# 取景 Framecut

在浏览器中裁切图片和视频，拖动选区、缩放素材并导出文件。素材和视频编码过程都留在当前设备上。[打开在线工作台](https://rikka-zzz.github.io/framecut-studio/)

## 编辑与导出

- **自由裁切**　拖动边角选取画面，支持锁定比例和自定义输出宽度。
- **固定画布**　选择预设比例或输入宽高，在画布内移动和缩放素材，可调背景色。PNG 支持透明留白。
- **图片**　导出 PNG、JPG 或 WebP。
- **视频**　播放检查构图，导出带原声的 H.264 MP4。首次导出视频时，浏览器会从本站加载编码器。

## 本地使用

安装 Python 3 后，Windows 用户可以双击 `Framecut.cmd`。也可以在项目目录运行 `python start.py` 或 `python3 start.py`。启动器会打开浏览器，关闭进程即可停止服务。

## 开发与发布

编辑器源码在 `src/`，样式、视频 Worker 和静态资源在 `docs/`。

```sh
npm ci
npm run check
npm run build
```

GitHub Pages 从 `main` 分支的 `/docs` 目录发布。修改源码后，将构建生成的 `docs/studio.js` 随源码一并提交。视频引擎和依赖的许可信息见 [第三方说明](docs/engine/NOTICE.txt)。
