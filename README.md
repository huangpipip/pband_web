# pband_web

访问在线地址: https://pband.cquctcmp.com/

Access online: https://pband.cquctcmp.com/

`pband_web` 是一个纯前端静态网页工具，用来直接读取 VASP 生成的 `vasprun.xml`，并在浏览器中交互式绘制 projected band structure。

`pband_web` is a static browser app for loading VASP `vasprun.xml` files and interactively plotting projected band structures directly in the browser.

## Demo

<video src="./demo/demo.mov" controls muted playsinline width="100%">
  Your browser does not support the video tag.
</video>

备用链接 / Fallback link: [demo.mov](./demo/demo.mov)

## 简介 | Overview

- 无后端、无数据库、无构建步骤。
- 所有解析都在浏览器本地完成，不上传输入文件。
- 面向普通用户，推荐直接使用在线部署版本。

- No backend, no database, and no build step.
- All parsing happens locally in the browser.
- For end users, the recommended access path is the hosted deployment.

## 功能特性 | Features

- 支持非自旋、共线自旋极化、SOC / 非共线 `vasprun.xml`。
- 支持按元素、原子编号范围、轨道分量、轨道族 (`s/p/d/f`) 过滤投影。
- 提供 `single` 与 `multi` 两种绘图模式，便于叠加查看或分面比较。
- 自动识别 k-path 中的跳变并在图中分段显示。
- 可选择是否对齐到费米能级，并可手动设置能量窗口。
- 可调节投影 marker 的大小、透明度、描边和颜色。
- 内置多种绘图主题。
- `single` 模式下可直接导出 PNG。
- 如果文件没有 projected eigenvalues，仍可查看能带线，但无法进行轨道投影比较。

- Supports non-spin, collinear spin-polarized, and SOC / non-collinear `vasprun.xml` files.
- Filters projections by element, atom index range, orbital component, or orbital family (`s/p/d/f`).
- Offers both `single` and `multi` plot modes for overlay or side-by-side comparison.
- Detects k-path discontinuities and renders band segments accordingly.
- Can align energies to the Fermi level or use absolute energies.
- Lets you adjust marker size, opacity, outline, and per-orbital colors.
- Includes multiple plot themes.
- Exports PNG in `single` mode.
- If projected eigenvalues are absent, band lines can still be shown, but orbital comparison is unavailable.

## 快速开始 | Quick Start

访问在线地址: https://pband.cquctcmp.com/

Access online: https://pband.cquctcmp.com/

### 使用流程 | Basic Workflow

1. 选择一个 `vasprun.xml` 文件。
2. 查看数据摘要，包括模式、k-point 数、band 数、原子数、轨道数和 `E_F`。
3. 选择 `single` 或 `multi` 模式。
4. 按元素、原子编号、轨道分量或轨道族筛选投影。
5. 根据需要调整能量窗口、费米能级对齐、marker 样式和主题。
6. 在 `single` 模式下导出 PNG。

1. Load a `vasprun.xml` file.
2. Inspect the dataset summary, including mode, k-points, bands, atoms, orbitals, and `E_F`.
3. Choose `single` or `multi` plot mode.
4. Filter projections by element, atom indices, orbital components, or orbital families.
5. Adjust the energy window, Fermi alignment, marker styling, and theme as needed.
6. Export PNG from `single` mode.

## 支持的输入场景 | Supported Cases

- 非自旋计算。
- 共线自旋极化计算，支持 `up/down` 同图显示或单独显示。
- SOC / 非共线计算；如果 XML 中包含磁化投影通道，可切换 `mx/my/mz`。
- 含 projected 数据的常规 band structure 输出。
- 大尺寸 `vasprun.xml` 文件，但解析速度和浏览器内存占用取决于文件大小。

- Non-spin calculations.
- Collinear spin-polarized calculations with combined or per-channel `up/down` display.
- SOC / non-collinear calculations; if magnetization projection channels exist, `mx/my/mz` can be selected.
- Standard band-structure outputs with projected data.
- Large `vasprun.xml` files, subject to browser memory and parsing time.

## 开发与检查 | Development Notes

本项目是纯静态网页，没有构建步骤。

This project is a static web app with no build step.

可用的本地检查命令 / Useful local checks:

```bash
node --check assets/app.js
node --check assets/vasprun-parser.js
```

## 项目结构 | Project Structure

- [`index.html`](./index.html): 页面入口与 UI 布局。 / App entry point and UI layout.
- [`assets/app.js`](./assets/app.js): 状态管理、筛选逻辑、Plotly 渲染与交互。 / State, filters, Plotly rendering, and interactions.
- [`assets/vasprun-parser.js`](./assets/vasprun-parser.js): 浏览器端 XML 解析与 k-path 处理。 / Browser-side XML parsing and k-path handling.
- [`assets/app.css`](./assets/app.css): 页面样式。 / Visual styling.
- [`vendor/plotly.min.js`](./vendor/plotly.min.js): 本地 Plotly bundle。 / Vendored Plotly bundle.

## 注意事项 | Notes

- 面向普通用户时，请直接使用在线部署地址：`https://pband.cquctcmp.com/`。
- `multi` 模式用于比较不同轨道投影，但 PNG 导出仅支持 `single` 模式。
- 建议使用现代桌面浏览器打开较大的 `vasprun.xml` 文件。

- For normal end-user usage, access the deployed app directly at `https://pband.cquctcmp.com/`.
- `multi` mode is intended for comparing orbital projections, while PNG export is currently limited to `single` mode.
- A modern desktop browser is recommended for large `vasprun.xml` files.

## 开发说明 | Development Note

本项目在开发过程中使用了 Codex 进行辅助编写、重构和文档整理。

Codex was used during development to assist with implementation, refactoring, and documentation.
