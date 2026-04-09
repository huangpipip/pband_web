# see_pband

Static web app for reading `vasprun.xml` and plotting projected band structures with local `Plotly`.

## Features

- Works as a plain static site with no backend.
- Supports non-spin, collinear spin (`up/down`), and SOC / non-collinear projection layouts.
- Filters by element, atom index, and orbital groups (`s/p/d/f` when present).
- Plots `up/down` on the same chart by default.
- For SOC files, defaults to total projection and exposes `mx/my/mz` if the XML contains magnetization channels.
- Can export the current chart as PNG.

## Files

- [index.html](/Users/hsp/repo/see_pband/index.html)
- [assets/vasprun-parser.js](/Users/hsp/repo/see_pband/assets/vasprun-parser.js)
- [assets/app.js](/Users/hsp/repo/see_pband/assets/app.js)
- [assets/app.css](/Users/hsp/repo/see_pband/assets/app.css)
- [vendor/plotly.min.js](/Users/hsp/repo/see_pband/vendor/plotly.min.js)

## Usage

Open [index.html](/Users/hsp/repo/see_pband/index.html) in a modern browser, select a `vasprun.xml` file, then adjust the filters in the left panel.

For very large XML files, using a lightweight local static server is still recommended even though the app does not require one.
