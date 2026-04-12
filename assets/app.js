(function () {
  const state = {
    data: null,
    markerColorOverrides: createEmptyMarkerColorOverrides(),
    plotNodes: [],
    plotUiRevision: 0,
    relayoutSyncInProgress: false,
    sharedPlotRanges: createEmptyPlotRanges(),
    lastAlignToFermi: true,
  };

  const MATPLOTLIB_HIGH_CONTRAST_PALETTE = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#17becf",
    "#bcbd22",
    "#7f7f7f",
  ];

  const MATPLOTLIB_ORBITAL_SEQUENCE = {
    s: "#1f77b4",
    px: "#d62728",
    py: "#2ca02c",
    pz: "#ff7f0e",
    dxy: "#9467bd",
    dyz: "#17becf",
    dz2: "#8c564b",
    dxz: "#e377c2",
    "x2-y2": "#bcbd22",
    "dx2-y2": "#bcbd22",
    "fy(3x2-y2)": "#4c78a8",
    fxyz: "#f58518",
    fyz2: "#54a24b",
    fz3: "#e45756",
    fxz2: "#72b7b2",
    "fz(x2-y2)": "#b279a2",
    "fx(x2-3y2)": "#ff9da6",
    f: "#7f7f7f",
    p: "#ff7f0e",
    d: "#9467bd",
    tot: "#111111",
    other: "#17becf",
  };
  const ORBITAL_CANONICAL_BY_FINGERPRINT = {
    tot: "tot",
    total: "tot",
    s: "s",
    px: "px",
    py: "py",
    pz: "pz",
    dxy: "dxy",
    xy: "dxy",
    dyz: "dyz",
    yz: "dyz",
    dz2: "dz2",
    z2: "dz2",
    dxz: "dxz",
    xz: "dxz",
    dx2y2: "dx2-y2",
    x2y2: "dx2-y2",
    fy3x2y2: "fy(3x2-y2)",
    y3x2y2: "fy(3x2-y2)",
    fxyz: "fxyz",
    xyz: "fxyz",
    fyz2: "fyz2",
    yz2: "fyz2",
    fz3: "fz3",
    z3: "fz3",
    fxz2: "fxz2",
    xz2: "fxz2",
    fzx2y2: "fz(x2-y2)",
    zx2y2: "fz(x2-y2)",
    fxx23y2: "fx(x2-3y2)",
    xx23y2: "fx(x2-3y2)",
    p: "p",
    d: "d",
    f: "f",
  };
  const ORBITAL_FAMILY_BY_CANONICAL = {
    tot: "tot",
    s: "s",
    px: "p",
    py: "p",
    pz: "p",
    p: "p",
    dxy: "d",
    dyz: "d",
    dz2: "d",
    dxz: "d",
    "dx2-y2": "d",
    d: "d",
    "fy(3x2-y2)": "f",
    fxyz: "f",
    fyz2: "f",
    fz3: "f",
    fxz2: "f",
    "fz(x2-y2)": "f",
    "fx(x2-3y2)": "f",
    f: "f",
  };

  const elements = {
    uploadCard: document.getElementById("upload-card"),
    fileInput: document.getElementById("file-input"),
    resetButton: document.getElementById("reset-button"),
    exportButton: document.getElementById("export-button"),
    statusLine: document.getElementById("status-line"),
    datasetSummary: document.getElementById("dataset-summary"),
    energyMin: document.getElementById("energy-min"),
    energyMax: document.getElementById("energy-max"),
    alignFermi: document.getElementById("align-fermi"),
    kpointSkip: document.getElementById("kpoint-skip"),
    markerScale: document.getElementById("marker-scale"),
    markerScaleValue: document.getElementById("marker-scale-value"),
    markerOpacity: document.getElementById("marker-opacity"),
    markerOpacityValue: document.getElementById("marker-opacity-value"),
    markerSkip: document.getElementById("marker-skip"),
    markerSkipValue: document.getElementById("marker-skip-value"),
    markerOutline: document.getElementById("marker-outline"),
    plotBackgroundColor: document.getElementById("plot-background-color"),
    bandLineLayer: document.getElementById("band-line-layer"),
    bandLineColorMode: document.getElementById("band-line-color-mode"),
    bandLineColor: document.getElementById("band-line-color"),
    frameLineWidth: document.getElementById("frame-line-width"),
    frameLineWidthValue: document.getElementById("frame-line-width-value"),
    bandLineWidth: document.getElementById("band-line-width"),
    bandLineWidthValue: document.getElementById("band-line-width-value"),
    showXAxisTitle: document.getElementById("show-x-axis-title"),
    xAxisTitle: document.getElementById("x-axis-title"),
    xAxisTitleSize: document.getElementById("x-axis-title-size"),
    showYAxisTitle: document.getElementById("show-y-axis-title"),
    yAxisTitle: document.getElementById("y-axis-title"),
    yAxisTitleSize: document.getElementById("y-axis-title-size"),
    gridLineColor: document.getElementById("grid-line-color"),
    gridLineOpacity: document.getElementById("grid-line-opacity"),
    gridLineOpacityValue: document.getElementById("grid-line-opacity-value"),
    showXAxisLabels: document.getElementById("show-x-axis-labels"),
    xAxisLabelSize: document.getElementById("x-axis-label-size"),
    showYAxisLabels: document.getElementById("show-y-axis-labels"),
    yAxisLabelSize: document.getElementById("y-axis-label-size"),
    plotModeToggle: document.getElementById("plot-mode-toggle"),
    plotTheme: document.getElementById("plot-theme"),
    spinChannel: document.getElementById("spin-channel"),
    socComponent: document.getElementById("soc-component"),
    spinWrap: document.getElementById("spin-channel-wrap"),
    socWrap: document.getElementById("soc-component-wrap"),
    atomSelection: document.getElementById("atom-selection"),
    elementFilters: document.getElementById("element-filters"),
    orbitalMode: document.getElementById("orbital-mode"),
    orbitalFilters: document.getElementById("orbital-filters"),
    selectionSummary: document.getElementById("selection-summary"),
    plotTitle: document.getElementById("plot-title"),
    plotCard: document.getElementById("plot-card"),
    plotHost: document.getElementById("plot-host"),
    plotResizeHandle: document.getElementById("plot-resize-handle"),
  };

  function setStatus(message, isError) {
    elements.statusLine.textContent = message;
    elements.statusLine.classList.toggle("error", Boolean(isError));
  }

  function setUploadCardIdle(isIdle) {
    elements.uploadCard.classList.toggle("upload-card-idle", Boolean(isIdle));
  }

  function createEmptyMarkerColorOverrides() {
    return {
      components: Object.create(null),
      families: Object.create(null),
      elementComponents: Object.create(null),
      elementFamilies: Object.create(null),
    };
  }

  function createEmptyPlotRanges() {
    return {
      x: null,
      y: null,
    };
  }

  function resetMarkerColorOverrides() {
    state.markerColorOverrides = createEmptyMarkerColorOverrides();
  }

  function resetSharedPlotRanges() {
    state.sharedPlotRanges = createEmptyPlotRanges();
  }

  function isFamilyOrbitalMode(orbitalMode) {
    return orbitalMode === "families" || orbitalMode === "element-families";
  }

  function isElementSeparatedOrbitalMode(orbitalMode) {
    return orbitalMode === "element-components" || orbitalMode === "element-families";
  }

  function orbitalModeLabel(orbitalMode) {
    if (orbitalMode === "families") {
      return "families";
    }
    if (orbitalMode === "element-components") {
      return "element components";
    }
    if (orbitalMode === "element-families") {
      return "element families";
    }
    return "components";
  }

  function orbitalColorScope(orbitalMode) {
    if (orbitalMode === "families") {
      return "families";
    }
    if (orbitalMode === "element-components") {
      return "elementComponents";
    }
    if (orbitalMode === "element-families") {
      return "elementFamilies";
    }
    return "components";
  }

  function colorOverrideStore(orbitalMode) {
    return state.markerColorOverrides[orbitalColorScope(orbitalMode)];
  }

  function selectionColorKey(selectionItem) {
    return String(selectionItem.colorKey || selectionItem.label || "orbital");
  }

  function plotModeButtons() {
    return Array.from(elements.plotModeToggle.querySelectorAll("[data-plot-mode]"));
  }

  function currentPlotMode() {
    const activeButton = elements.plotModeToggle.querySelector(".is-active[data-plot-mode]");
    return activeButton ? activeButton.dataset.plotMode : "single";
  }

  function setPlotMode(mode) {
    plotModeButtons().forEach((button) => {
      const isActive = button.dataset.plotMode === mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function invalidatePlotView() {
    state.plotUiRevision += 1;
    resetSharedPlotRanges();
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  async function loadFile(file) {
    setStatus(`Reading ${file.name} ...`);
    const xmlText = await file.text();
    await nextFrame();
    setStatus(`Parsing ${file.name} ...`);
    await nextFrame();
    const data = window.VasprunParser.parse(xmlText);
    state.data = data;
    setUploadCardIdle(false);
    invalidatePlotView();
    populateControls(data);
    updateSummary(data);
    renderPlot();
    setStatus(`Loaded ${file.name}.`);
  }

  function modeLabel(mode) {
    if (mode === "soc") {
      return "SOC / non-collinear";
    }
    if (mode === "collinear_spin") {
      return "Spin-polarized";
    }
    return "Non-spin";
  }

  function updateSummary(data) {
    const values = [
      modeLabel(data.mode),
      String(data.summary.nkpoints),
      String(data.summary.nbands),
      String(data.summary.natoms),
      String(data.summary.norbitals || 0),
      data.fermiEnergy.toFixed(4),
    ];

    Array.from(elements.datasetSummary.querySelectorAll("dd")).forEach((node, index) => {
      node.textContent = values[index];
    });
  }

  function defaultWindow(data) {
    const shiftedMin = data.energyRange.min - data.fermiEnergy;
    const shiftedMax = data.energyRange.max - data.fermiEnergy;
    let min = Math.max(-12, Math.floor(shiftedMin));
    let max = Math.min(12, Math.ceil(shiftedMax));
    if (!(min < max)) {
      min = -6;
      max = 6;
    }
    return {
      min: Number.isFinite(min) ? min : -6,
      max: Number.isFinite(max) ? max : 6,
    };
  }

  function formatEnergyInputValue(value) {
    if (!Number.isFinite(value)) {
      return "";
    }
    const rounded = Number(value.toFixed(4));
    return String(Object.is(rounded, -0) ? 0 : rounded);
  }

  function defaultXAxisTitle() {
    return "k-path distance";
  }

  function defaultYAxisTitle(alignToFermi) {
    return alignToFermi ? "Energy - E_F (eV)" : "Energy (eV)";
  }

  function clampNumber(value, min, max, fallback) {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    if (Number.isFinite(min)) {
      value = Math.max(min, value);
    }
    if (Number.isFinite(max)) {
      value = Math.min(max, value);
    }
    return value;
  }

  function detailFontSizeValue(input, fallback) {
    return clampNumber(Number(input.value), 8, 32, fallback);
  }

  function detailOpacityValue(input, fallbackPercent) {
    return clampNumber(Number(input.value), 0, 100, fallbackPercent) / 100;
  }

  function parseHexColor(hex) {
    const match = /^#([0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!match) {
      return null;
    }
    const value = match[1];
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  function hexColor(red, green, blue) {
    const channels = [red, green, blue].map((value) =>
      clampNumber(Math.round(value), 0, 255, 0).toString(16).padStart(2, "0"),
    );
    return `#${channels.join("")}`;
  }

  function mixHexColors(baseHex, accentHex, weight, fallback) {
    const base = parseHexColor(baseHex);
    const accent = parseHexColor(accentHex);
    if (!base || !accent) {
      return fallback || baseHex || accentHex || "#7f7f7f";
    }

    const mixWeight = clampNumber(weight, 0, 1, 0.24);
    return hexColor(
      base.r * (1 - mixWeight) + accent.r * mixWeight,
      base.g * (1 - mixWeight) + accent.g * mixWeight,
      base.b * (1 - mixWeight) + accent.b * mixWeight,
    );
  }

  function rgbaColor(hex, opacity, fallback) {
    const rgb = parseHexColor(hex);
    if (!rgb) {
      return fallback;
    }
    const alpha = clampNumber(opacity, 0, 1, 1);
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
  }

  function resolvedGridColor(selection, theme) {
    return rgbaColor(selection.gridLineColor, selection.gridLineOpacity, theme.grid);
  }

  function syncBandLineColorInputState() {
    const useCustomColor = elements.bandLineColorMode.value === "custom";
    elements.bandLineColor.disabled = !useCustomColor;
  }

  function syncDefaultYAxisTitle(nextAlignToFermi) {
    const currentTitle = elements.yAxisTitle.value;
    const previousDefaultTitle = defaultYAxisTitle(state.lastAlignToFermi);
    if (currentTitle === previousDefaultTitle) {
      elements.yAxisTitle.value = defaultYAxisTitle(nextAlignToFermi);
    }
  }

  function syncEnergyWindowToAlignment(data, nextAlignToFermi) {
    if (!data) {
      state.lastAlignToFermi = nextAlignToFermi;
      return;
    }

    if (state.lastAlignToFermi === nextAlignToFermi) {
      return;
    }

    const energyMin = Number(elements.energyMin.value);
    const energyMax = Number(elements.energyMax.value);
    if (Number.isFinite(energyMin) && Number.isFinite(energyMax)) {
      const shift = nextAlignToFermi ? -data.fermiEnergy : data.fermiEnergy;
      elements.energyMin.value = formatEnergyInputValue(energyMin + shift);
      elements.energyMax.value = formatEnergyInputValue(energyMax + shift);
    }

    state.lastAlignToFermi = nextAlignToFermi;
  }

  function populateControls(data) {
    const windowRange = defaultWindow(data);
    const maxKpointSkip = Math.max((data.summary.nkpoints || 0) - 1, 0);
    resetMarkerColorOverrides();
    elements.energyMin.value = windowRange.min;
    elements.energyMax.value = windowRange.max;
    elements.alignFermi.checked = true;
    state.lastAlignToFermi = true;
    elements.kpointSkip.min = "0";
    elements.kpointSkip.max = String(maxKpointSkip);
    elements.kpointSkip.value = "0";
    elements.markerScale.value = "18";
    elements.markerScaleValue.textContent = "18";
    elements.markerOpacity.value = "80";
    elements.markerOpacityValue.textContent = "80%";
    elements.markerSkip.value = "0";
    elements.markerSkipValue.textContent = "0%";
    elements.markerOutline.checked = false;
    elements.plotBackgroundColor.value = "#f8f1e4";
    elements.bandLineLayer.value = "bottom";
    elements.bandLineColorMode.value = "theme";
    elements.bandLineColor.value = "#8f3625";
    syncBandLineColorInputState();
    elements.frameLineWidth.value = "1.3";
    elements.frameLineWidthValue.textContent = "1.3px";
    elements.bandLineWidth.value = "1.2";
    elements.bandLineWidthValue.textContent = "1.2px";
    elements.showXAxisTitle.checked = true;
    elements.xAxisTitle.value = defaultXAxisTitle();
    elements.xAxisTitleSize.value = "16";
    elements.showYAxisTitle.checked = true;
    elements.yAxisTitle.value = defaultYAxisTitle(true);
    elements.yAxisTitleSize.value = "16";
    elements.gridLineColor.value = "#221c15";
    elements.gridLineOpacity.value = "14";
    elements.gridLineOpacityValue.textContent = "14%";
    elements.showXAxisLabels.checked = true;
    elements.xAxisLabelSize.value = "12";
    elements.showYAxisLabels.checked = true;
    elements.yAxisLabelSize.value = "12";
    setPlotMode("single");
    elements.plotTheme.value = "sandstone";
    elements.atomSelection.value = "";
    elements.orbitalMode.value = "components";

    populateSpinControls(data);
    populateElementFilters(data);
    populateOrbitalFilters(data);
  }

  function populateSpinControls(data) {
    elements.spinChannel.innerHTML = "";
    elements.socComponent.innerHTML = "";

    if (data.mode === "collinear_spin") {
      [
        ["both", "up + down"],
        ["up", "up only"],
        ["down", "down only"],
      ].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        elements.spinChannel.appendChild(option);
      });
      elements.spinWrap.hidden = false;
    } else {
      const option = document.createElement("option");
      option.value = "total";
      option.textContent = data.mode === "soc" ? "total" : "single channel";
      elements.spinChannel.appendChild(option);
      elements.spinWrap.hidden = true;
    }

    if (data.mode === "soc") {
      const componentOptions = [["total", "total projection"]];
      if (data.hasMagnetization) {
        componentOptions.push(
          ["mx", "magnetization x"],
          ["my", "magnetization y"],
          ["mz", "magnetization z"],
        );
      }
      componentOptions.forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        elements.socComponent.appendChild(option);
      });
      elements.socWrap.hidden = false;
    } else {
      const option = document.createElement("option");
      option.value = "total";
      option.textContent = "not applicable";
      elements.socComponent.appendChild(option);
      elements.socWrap.hidden = true;
    }
  }

  function populateElementFilters(data) {
    elements.elementFilters.innerHTML = "";
    if (!data.elements.length) {
      elements.elementFilters.textContent = "No atom metadata found.";
      elements.elementFilters.classList.add("empty-state");
      return;
    }

    elements.elementFilters.classList.remove("empty-state");
    data.elements.forEach((symbol) => {
      const label = document.createElement("label");
      label.className = "pill";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = true;
      input.dataset.element = symbol;
      input.addEventListener("change", () => {
        if (state.data && isElementSeparatedOrbitalMode(elements.orbitalMode.value)) {
          populateOrbitalFilters(state.data);
        }
        renderPlot();
      });
      label.appendChild(input);
      label.appendChild(document.createTextNode(symbol));
      elements.elementFilters.appendChild(label);
    });
  }

  function orbitalFamily(name) {
    const canonical = canonicalOrbitalName(name);
    if (ORBITAL_FAMILY_BY_CANONICAL[canonical]) {
      return ORBITAL_FAMILY_BY_CANONICAL[canonical];
    }
    if (canonical.startsWith("s")) {
      return "s";
    }
    if (canonical.startsWith("p")) {
      return "p";
    }
    if (canonical.startsWith("d")) {
      return "d";
    }
    if (canonical.startsWith("f")) {
      return "f";
    }
    return "other";
  }

  function orbitalFingerprint(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function canonicalOrbitalName(name) {
    const fingerprint = orbitalFingerprint(name);
    if (!fingerprint) {
      return "";
    }
    return ORBITAL_CANONICAL_BY_FINGERPRINT[fingerprint] || fingerprint;
  }

  function orbitalSortKey(name) {
    const canonical = canonicalOrbitalName(name);
    const familyOrder = {
      s: 0,
      p: 1,
      d: 2,
      f: 3,
      other: 4,
      tot: 5,
    };
    const componentOrder = {
      s: 0,
      py: 0,
      pz: 1,
      px: 2,
      p: 3,
      dxy: 0,
      dyz: 1,
      dz2: 2,
      dxz: 3,
      "x2-y2": 4,
      "dx2-y2": 4,
      d: 5,
      "fy(3x2-y2)": 0,
      fxyz: 1,
      fyz2: 2,
      fz3: 3,
      fxz2: 4,
      "fz(x2-y2)": 5,
      "fx(x2-3y2)": 6,
      f: 7,
      tot: 99,
    };
    const family = orbitalFamily(canonical);
    return [familyOrder[family] ?? 98, componentOrder[canonical] ?? 50, canonical];
  }

  function orderedOrbitals(data) {
    return data.orbitalNames
      .map((name, index) => ({ index, name }))
      .sort((left, right) => {
        const a = orbitalSortKey(left.name);
        const b = orbitalSortKey(right.name);
        if (a[0] !== b[0]) {
          return a[0] - b[0];
        }
        if (a[1] !== b[1]) {
          return a[1] - b[1];
        }
        return String(a[2]).localeCompare(String(b[2]));
      });
  }

  function orderedOrbitalFamilies(data) {
    const preferred = ["s", "p", "d", "f", "tot", "other"];
    return preferred
      .filter((family) => Array.isArray(data.orbitalGroups[family]) && data.orbitalGroups[family].length)
      .map((family) => ({
        key: family,
        label: family,
        indices: [...data.orbitalGroups[family]],
      }));
  }

  function activeElementSymbols(data) {
    const elementInputs = elements.elementFilters.querySelectorAll("input[data-element]");
    if (!elementInputs.length) {
      return [...data.elements];
    }

    const selected = new Set(checkedValues(elements.elementFilters, "element"));
    return data.elements.filter((symbol) => selected.has(symbol));
  }

  function orbitalEntriesForMode(data, orbitalMode) {
    const useFamilies = isFamilyOrbitalMode(orbitalMode);
    const baseEntries = useFamilies
      ? orderedOrbitalFamilies(data).map((family) => ({
          label: family.label,
          baseLabel: family.label,
          indices: family.indices,
          family: family.key,
        }))
      : orderedOrbitals(data).map((orbital) => ({
          label: orbital.name,
          baseLabel: orbital.name,
          indices: [orbital.index],
          family: orbitalFamily(orbital.name),
        }));

    if (!isElementSeparatedOrbitalMode(orbitalMode)) {
      return baseEntries.map((entry) => ({
        ...entry,
        colorKey: entry.label,
      }));
    }

    const selectedElements = activeElementSymbols(data);
    return baseEntries.flatMap((entry) =>
      selectedElements.map((symbol) => ({
        ...entry,
        label: `${symbol} ${entry.label}`,
        colorKey: `${symbol} ${entry.label}`,
        elementSymbol: symbol,
        elementIndex: data.elements.indexOf(symbol),
      })),
    );
  }

  function populateOrbitalFilters(data) {
    const checkedSelectionKeys = new Set(
      Array.from(elements.orbitalFilters.querySelectorAll("input[data-selection-color-key]:checked")).map(
        (input) => input.dataset.selectionColorKey || input.dataset.selectionLabel || "orbital",
      ),
    );
    elements.orbitalFilters.innerHTML = "";
    if (!data.hasProjection) {
      elements.orbitalFilters.textContent = "No projected eigenvalues found in the file.";
      elements.orbitalFilters.classList.add("empty-state");
      return;
    }

    const orbitalMode = elements.orbitalMode.value;
    const entries = orbitalEntriesForMode(data, orbitalMode);

    if (!entries.length) {
      elements.orbitalFilters.textContent = isElementSeparatedOrbitalMode(orbitalMode)
        ? "Select at least one element to build element-separated orbital filters."
        : "Projected data found, but orbital fields are empty.";
      elements.orbitalFilters.classList.add("empty-state");
      return;
    }

    elements.orbitalFilters.classList.remove("empty-state");
    entries.forEach((entry, index) => {
      const pill = document.createElement("div");
      pill.className = "pill pill-with-color";
      const label = document.createElement("label");
      label.className = "pill-toggle";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = checkedSelectionKeys.has(entry.colorKey);
      input.dataset.selectionLabel = entry.label;
      input.dataset.selectionBaseLabel = entry.baseLabel;
      input.dataset.selectionIndices = entry.indices.join(",");
      input.dataset.selectionFamily = entry.family;
      input.dataset.selectionColorKey = entry.colorKey;
      if (entry.elementSymbol) {
        input.dataset.selectionElement = entry.elementSymbol;
        input.dataset.selectionElementIndex = String(entry.elementIndex);
      }
      input.addEventListener("change", renderPlot);

      const colorButton = document.createElement("button");
      colorButton.type = "button";
      colorButton.className = "pill-color-swatch";
      colorButton.title = `Set marker color for ${entry.label}`;
      colorButton.setAttribute("aria-label", `Set marker color for ${entry.label}`);

      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.className = "pill-color-input";
      colorInput.tabIndex = -1;

      const entrySelection = {
        label: entry.label,
        baseLabel: entry.baseLabel,
        family: entry.family,
        colorKey: entry.colorKey,
        elementSymbol: entry.elementSymbol,
        elementIndex: entry.elementIndex,
      };
      const syncColorUi = (color) => {
        colorButton.style.backgroundColor = color;
        colorInput.value = color;
      };
      syncColorUi(colorForSelection(entrySelection, index, orbitalMode));

      colorButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        colorInput.click();
      });

      const applyColorChange = () => {
        colorOverrideStore(orbitalMode)[entry.colorKey] = colorInput.value;
        syncColorUi(colorInput.value);
        renderPlot();
      };
      colorInput.addEventListener("input", applyColorChange);
      colorInput.addEventListener("change", applyColorChange);

      label.appendChild(input);
      label.appendChild(document.createTextNode(entry.label));
      pill.appendChild(label);
      pill.appendChild(colorButton);
      pill.appendChild(colorInput);
      elements.orbitalFilters.appendChild(pill);
    });
  }

  function datasetAttributeName(key) {
    return key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
  }

  function checkedValues(container, datasetKey) {
    const attrName = datasetAttributeName(datasetKey);
    return Array.from(container.querySelectorAll(`input[data-${attrName}]:checked`)).map((input) =>
      input.dataset[datasetKey],
    );
  }

  function parseAtomSelection(inputValue, atomCount) {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return null;
    }

    const selected = new Set();
    const tokens = trimmed.split(",");
    for (const token of tokens) {
      const piece = token.trim();
      if (!piece) {
        continue;
      }
      const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(piece);
      if (rangeMatch) {
        let start = Number(rangeMatch[1]);
        let end = Number(rangeMatch[2]);
        if (start > end) {
          [start, end] = [end, start];
        }
        for (let value = start; value <= end; value += 1) {
          if (value >= 1 && value <= atomCount) {
            selected.add(value - 1);
          }
        }
        continue;
      }
      const value = Number(piece);
      if (Number.isInteger(value) && value >= 1 && value <= atomCount) {
        selected.add(value - 1);
      }
    }

    return selected;
  }

  function groupAtomIndicesByElement(data, atomIndices) {
    const grouped = Object.create(null);
    atomIndices.forEach((atomIndex) => {
      const atom = data.atoms[atomIndex];
      if (!atom) {
        return;
      }
      if (!Array.isArray(grouped[atom.symbol])) {
        grouped[atom.symbol] = [];
      }
      grouped[atom.symbol].push(atomIndex);
    });
    return grouped;
  }

  function sanitizeKpointSkipCount(value) {
    const numeric = Math.floor(Number(value));
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }

  function currentSelection(data) {
    const selectedElements = new Set(checkedValues(elements.elementFilters, "element"));
    const hasElementOptions = elements.elementFilters.querySelectorAll("input[data-element]").length > 0;
    const atomFilter = parseAtomSelection(elements.atomSelection.value, data.atoms.length);
    const selectedAtoms = [];

    data.atoms.forEach((atom, index) => {
      if (hasElementOptions && !selectedElements.has(atom.symbol)) {
        return;
      }
      if (atomFilter && !atomFilter.has(index)) {
        return;
      }
      selectedAtoms.push(index);
    });
    const atomIndicesByElement = groupAtomIndicesByElement(data, selectedAtoms);

    const selectedOrbitalInputs = Array.from(
      elements.orbitalFilters.querySelectorAll("input[data-selection-indices]:checked"),
    );
    const orbitalSelections = selectedOrbitalInputs
      .map((input) => {
        const elementSymbol = input.dataset.selectionElement || "";
        const elementIndex = Number(input.dataset.selectionElementIndex);
        return {
          indices: String(input.dataset.selectionIndices || "")
          .split(",")
          .map((part) => Number(part))
          .filter((value) => Number.isInteger(value))
          .sort((a, b) => a - b),
        label: input.dataset.selectionLabel || "orbital",
        baseLabel: input.dataset.selectionBaseLabel || input.dataset.selectionLabel || "orbital",
        colorKey: input.dataset.selectionColorKey || input.dataset.selectionLabel || "orbital",
        family: input.dataset.selectionFamily || "other",
        elementSymbol,
        elementIndex: Number.isInteger(elementIndex) ? elementIndex : null,
        atomIndices: elementSymbol ? [...(atomIndicesByElement[elementSymbol] || [])] : null,
      };
      })
      .filter((item) => item.indices.length > 0)
      .sort((left, right) => {
        if (left.indices[0] !== right.indices[0]) {
          return left.indices[0] - right.indices[0];
        }
        return left.label.localeCompare(right.label);
      });
    const orbitalLabels = orbitalSelections.map((entry) => entry.label);
    const orbitalIndices = Array.from(
      new Set(orbitalSelections.flatMap((entry) => entry.indices)),
    ).sort((a, b) => a - b);

    return {
      atomIndices: selectedAtoms,
      orbitalIndices,
      orbitalLabels,
      orbitalSelections,
      orbitalMode: elements.orbitalMode.value,
      spinChannel: elements.spinChannel.value,
      socComponent: elements.socComponent.value,
      energyMin: Number(elements.energyMin.value),
      energyMax: Number(elements.energyMax.value),
      alignToFermi: elements.alignFermi.checked,
      kpointSkipCount: sanitizeKpointSkipCount(elements.kpointSkip.value),
      markerScale: Number(elements.markerScale.value),
      markerOpacity: Number(elements.markerOpacity.value) / 100,
      markerSkipFraction: clampNumber(Number(elements.markerSkip.value), 0, 95, 0) / 100,
      markerOutline: elements.markerOutline.checked,
      plotBackgroundColor: elements.plotBackgroundColor.value,
      bandLineLayer: elements.bandLineLayer.value === "top" ? "top" : "bottom",
      bandLineColorMode: elements.bandLineColorMode.value === "custom" ? "custom" : "theme",
      bandLineColor: elements.bandLineColor.value,
      frameLineWidth: Number(elements.frameLineWidth.value),
      bandLineWidth: Number(elements.bandLineWidth.value),
      showXAxisTitle: elements.showXAxisTitle.checked,
      xAxisTitle: elements.xAxisTitle.value,
      xAxisTitleSize: detailFontSizeValue(elements.xAxisTitleSize, 16),
      showYAxisTitle: elements.showYAxisTitle.checked,
      yAxisTitle: elements.yAxisTitle.value,
      yAxisTitleSize: detailFontSizeValue(elements.yAxisTitleSize, 16),
      gridLineColor: elements.gridLineColor.value,
      gridLineOpacity: detailOpacityValue(elements.gridLineOpacity, 14),
      showXAxisLabels: elements.showXAxisLabels.checked,
      xAxisLabelSize: detailFontSizeValue(elements.xAxisLabelSize, 12),
      showYAxisLabels: elements.showYAxisLabels.checked,
      yAxisLabelSize: detailFontSizeValue(elements.yAxisLabelSize, 12),
      plotMode: currentPlotMode(),
      plotTheme: elements.plotTheme.value,
      selectedElements,
    };
  }

  function sliceKpointChannel(channel, startIndex) {
    return Array.isArray(channel) ? channel.slice(startIndex) : [];
  }

  function sliceKpointChannels(channelMap, startIndex) {
    const result = {};
    Object.keys(channelMap || {}).forEach((key) => {
      result[key] = sliceKpointChannel(channelMap[key], startIndex);
    });
    return result;
  }

  function visiblePlotData(data, skipCount) {
    const safeSkip = sanitizeKpointSkipCount(skipCount);
    const totalKpoints = Array.isArray(data.kpoints) ? data.kpoints.length : 0;
    const originalKpointIndices = Array.from(
      { length: Math.max(totalKpoints - safeSkip, 0) },
      (_, index) => safeSkip + index,
    );

    if (safeSkip === 0) {
      return {
        ...data,
        originalKpointIndices,
        skippedKpoints: 0,
        visibleKpointCount: totalKpoints,
      };
    }

    if (safeSkip >= totalKpoints) {
      return {
        ...data,
        kpoints: [],
        kpointDistances: [],
        segments: [],
        boundaryPositions: [],
        bands: sliceKpointChannels(data.bands, totalKpoints),
        projections: sliceKpointChannels(data.projections, totalKpoints),
        magnetization: data.magnetization
          ? sliceKpointChannels(data.magnetization, totalKpoints)
          : null,
        originalKpointIndices: [],
        skippedKpoints: safeSkip,
        visibleKpointCount: 0,
      };
    }

    const kpoints = data.kpoints.slice(safeSkip);
    const kpath = window.VasprunParser.buildKpath(kpoints, data.basis);

    return {
      ...data,
      kpoints,
      kpointDistances: kpath.distances,
      segments: kpath.segments,
      boundaryPositions: kpath.boundaryPositions,
      bands: sliceKpointChannels(data.bands, safeSkip),
      projections: sliceKpointChannels(data.projections, safeSkip),
      magnetization: data.magnetization ? sliceKpointChannels(data.magnetization, safeSkip) : null,
      originalKpointIndices,
      skippedKpoints: safeSkip,
      visibleKpointCount: kpoints.length,
    };
  }

  function channelEnergyMatrix(data, channelName) {
    if (channelName === "up") {
      return data.bands.up || [];
    }
    if (channelName === "down") {
      return data.bands.down || [];
    }
    return data.bands.total || data.bands.up || [];
  }

  function channelProjectionMatrix(data, channelName, socComponent) {
    if (data.mode === "soc") {
      if (socComponent === "mx" || socComponent === "my" || socComponent === "mz") {
        return data.magnetization ? data.magnetization[socComponent] || [] : [];
      }
      return data.projections.total || [];
    }
    if (channelName === "up") {
      return data.projections.up || [];
    }
    if (channelName === "down") {
      return data.projections.down || [];
    }
    return data.projections.total || data.projections.up || [];
  }

  function summarizeSelection(data, selection) {
    const atomLabel = selection.atomIndices.length
      ? `${selection.atomIndices.length} atoms`
      : "0 atoms";
    const orbitalLabel = selection.orbitalLabels.length
      ? selection.orbitalLabels.slice(0, 5).join(" + ") +
        (selection.orbitalLabels.length > 5 ? " ..." : "")
      : "no orbitals";
    const mode = data.mode === "soc" ? selection.socComponent : selection.spinChannel;
    return `${modeLabel(data.mode)} • ${atomLabel} • ${orbitalModeLabel(selection.orbitalMode)} • ${orbitalLabel} • ${mode}`;
  }

  function buildChannelDescriptors(data, selection, theme) {
    if (data.mode === "collinear_spin") {
      if (selection.spinChannel === "up") {
        return [{ key: "up", label: "Spin up", color: theme.bandColors.up }];
      }
      if (selection.spinChannel === "down") {
        return [{ key: "down", label: "Spin down", color: theme.bandColors.down }];
      }
      return [
        { key: "up", label: "Spin up", color: theme.bandColors.up },
        { key: "down", label: "Spin down", color: theme.bandColors.down },
      ];
    }

    if (data.mode === "soc") {
      return [
        {
          key: "total",
          label:
            selection.socComponent === "total"
              ? "SOC total"
              : `SOC ${selection.socComponent}`,
          color: theme.bandColors.socLine,
        },
      ];
    }

    return [{ key: "total", label: "Bands", color: theme.bandColors.total }];
  }

  function resolvedBandLineColor(selection, fallbackColor) {
    if (selection.bandLineColorMode === "custom") {
      return selection.bandLineColor;
    }
    return fallbackColor;
  }

  function aggregateWeights(projectionMatrix, atomIndices, orbitalIndices) {
    if (!projectionMatrix.length || !atomIndices.length || !orbitalIndices.length) {
      return [];
    }

    return projectionMatrix.map((kpointBands) =>
      kpointBands.map((bandAtoms) => {
        let sum = 0;
        atomIndices.forEach((atomIndex) => {
          const orbitals = bandAtoms[atomIndex];
          if (!orbitals) {
            return;
          }
          orbitalIndices.forEach((orbitalIndex) => {
            const value = orbitals[orbitalIndex];
            if (Number.isFinite(value)) {
              sum += value;
            }
          });
        });
        return sum;
      }),
    );
  }

  function colorForOrbital(label, index) {
    const normalized = canonicalOrbitalName(label);
    return (
      MATPLOTLIB_ORBITAL_SEQUENCE[normalized] ||
      MATPLOTLIB_HIGH_CONTRAST_PALETTE[index % MATPLOTLIB_HIGH_CONTRAST_PALETTE.length]
    );
  }

  function defaultColorForSelection(selectionItem, index) {
    const baseLabel = selectionItem.baseLabel || selectionItem.label;
    let color = baseLabel
      ? colorForOrbital(baseLabel, index)
      : selectionItem.family && selectionItem.family !== "other"
        ? colorForOrbital(selectionItem.family, index)
        : colorForOrbital("other", index);

    if (selectionItem.elementSymbol) {
      const accent =
        MATPLOTLIB_HIGH_CONTRAST_PALETTE[
          (selectionItem.elementIndex ?? index) % MATPLOTLIB_HIGH_CONTRAST_PALETTE.length
        ];
      color = mixHexColors(color, accent, 0.28, color);
    }

    return color;
  }

  function colorForSelection(selectionItem, index, orbitalMode) {
    const override = colorOverrideStore(orbitalMode)[selectionColorKey(selectionItem)];
    return override || defaultColorForSelection(selectionItem, index);
  }

  function buildLineTrace(xValues, bandEntries, segments, energyShift, descriptor) {
    const lineWidth = Number.isFinite(descriptor.width) ? descriptor.width : 1.2;
    const x = [];
    const y = [];
    const bandCount = bandEntries[0] ? bandEntries[0].length : 0;

    for (let bandIndex = 0; bandIndex < bandCount; bandIndex += 1) {
      segments.forEach((segment) => {
        for (let kIndex = segment.start; kIndex <= segment.end; kIndex += 1) {
          x.push(xValues[kIndex]);
          y.push(bandEntries[kIndex][bandIndex].energy - energyShift);
        }
        x.push(null);
        y.push(null);
      });
    }

    return {
      type: "scattergl",
      mode: "lines",
      x,
      y,
      name: descriptor.label,
      line: {
        color: descriptor.color,
        width: lineWidth,
      },
      hoverinfo: "skip",
      showlegend: false,
    };
  }

  function buildMarkerTrace(options) {
    const {
      descriptor,
      traceLabel,
      traceColor,
      xValues,
      bandEntries,
      weightMatrix,
      segments,
      energyShift,
      selection,
      originalKpointIndices,
    } = options;
    const x = [];
    const y = [];
    const sizes = [];
    const weights = [];
    const bandIndices = [];
    const kIndices = [];

    if (!weightMatrix.length) {
      return null;
    }

    const bandCount = bandEntries[0] ? bandEntries[0].length : 0;
    const validSegments =
      Array.isArray(segments) && segments.length
        ? segments
        : [{ start: 0, end: Math.max(weightMatrix.length - 1, 0) }];

    for (let bandIndex = 0; bandIndex < bandCount; bandIndex += 1) {
      validSegments.forEach((segment) => {
        const bandPoints = [];
        const start = Math.max(0, segment.start);
        const end = Math.min(weightMatrix.length - 1, segment.end);

        for (let kIndex = start; kIndex <= end; kIndex += 1) {
          const bandWeights = weightMatrix[kIndex];
          const bandEntry = bandEntries[kIndex];
          if (!bandWeights || !bandEntry || !bandEntry[bandIndex]) {
            continue;
          }

          const weight = bandWeights[bandIndex];
          if (!Number.isFinite(weight)) {
            continue;
          }
          const energy = bandEntry[bandIndex].energy - energyShift;
          if (energy < selection.energyMin || energy > selection.energyMax) {
            continue;
          }

          const absWeight = Math.abs(weight);
          if (absWeight < 1e-6) {
            continue;
          }

          bandPoints.push({
            x: xValues[kIndex],
            y: energy,
            weight,
            size: Math.sqrt(absWeight) * selection.markerScale,
            bandIndex: bandIndex + 1,
            kIndex:
              Array.isArray(originalKpointIndices) &&
              Number.isInteger(originalKpointIndices[kIndex])
                ? originalKpointIndices[kIndex] + 1
                : kIndex + 1,
          });
        }

        selectMarkerPoints(bandPoints, selection.markerSkipFraction).forEach((point) => {
          x.push(point.x);
          y.push(point.y);
          weights.push(point.weight);
          sizes.push(point.size);
          bandIndices.push(point.bandIndex);
          kIndices.push(point.kIndex);
        });
      });
    }

    if (!weights.length) {
      return null;
    }

    const trace = {
      type: "scattergl",
      mode: "markers",
      x,
      y,
      name: traceLabel,
      marker: {
        size: sizes,
        opacity: selection.markerOpacity,
        line: {
          width: selection.markerOutline ? 0.6 : 0,
          color: "rgba(255,255,255,0.55)",
        },
      },
      customdata: bandIndices.map((bandIndex, index) => [bandIndex, kIndices[index], weights[index]]),
      hovertemplate:
        "band %{customdata[0]}<br>" +
        "k-point %{customdata[1]}<br>" +
        "projection %{customdata[2]:.4f}<br>" +
        "x %{x:.4f}<br>" +
        "E %{y:.4f} eV<extra></extra>",
    };
    trace.marker.color = traceColor;

    return trace;
  }

  function sampledMarkerIndices(totalCount, keepCount) {
    if (keepCount >= totalCount) {
      return Array.from({ length: totalCount }, (_, index) => index);
    }

    if (keepCount <= 1) {
      return [Math.floor((totalCount - 1) / 2)];
    }

    const indices = [];
    const used = new Set();

    for (let sampleIndex = 0; sampleIndex < keepCount; sampleIndex += 1) {
      let pointIndex = Math.round((sampleIndex * (totalCount - 1)) / (keepCount - 1));
      while (used.has(pointIndex) && pointIndex < totalCount - 1) {
        pointIndex += 1;
      }
      while (used.has(pointIndex) && pointIndex > 0) {
        pointIndex -= 1;
      }
      if (!used.has(pointIndex)) {
        used.add(pointIndex);
        indices.push(pointIndex);
      }
    }

    return indices.sort((left, right) => left - right);
  }

  function selectMarkerPoints(points, markerSkipFraction) {
    if (points.length <= 1 || markerSkipFraction <= 0) {
      return points;
    }

    const keepRatio = 1 - markerSkipFraction;
    const keepCount = Math.max(1, Math.round(points.length * keepRatio));
    if (keepCount >= points.length) {
      return points;
    }

    return sampledMarkerIndices(points.length, keepCount).map((index) => points[index]);
  }

  function roundToStep(value, step) {
    if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
      return value;
    }
    return Math.round(value / step) * step;
  }

  function nextTickValue(min, step) {
    if (!Number.isFinite(min) || !Number.isFinite(step) || step <= 0) {
      return min;
    }
    return Math.ceil((min - 1e-9) / step) * step;
  }

  function denseYAxisConfig(selection, energyMin) {
    if (selection.alignToFermi) {
      return null;
    }

    const majorStep = 0.5;
    return {
      tick0: roundToStep(nextTickValue(energyMin, majorStep), majorStep),
      dtick: majorStep,
    };
  }

  function horizontalLineShape(yValue, theme, lineOverrides) {
    return {
      type: "line",
      layer: "below",
      xref: "paper",
      x0: 0,
      x1: 1,
      yref: "y",
      y0: yValue,
      y1: yValue,
      line: lineOverrides
        ? { ...lineOverrides }
        : {
            color: theme.grid,
            width: 1,
          },
    };
  }

  function fermiLevelShape(data, selection, energyMin, energyMax, theme) {
    if (selection.alignToFermi || data.fermiEnergy < energyMin || data.fermiEnergy > energyMax) {
      return null;
    }

    const gridColor = resolvedGridColor(selection, theme);
    return horizontalLineShape(data.fermiEnergy, theme, {
      color: gridColor,
      width: selection.frameLineWidth,
      dash: "dash",
    });
  }

  function fermiLevelAnnotation(data, selection, energyMin, energyMax, theme, compact) {
    if (selection.alignToFermi || data.fermiEnergy < energyMin || data.fermiEnergy > energyMax) {
      return null;
    }

    const span = Math.max(energyMax - energyMin, 0.1);
    const nearTop = data.fermiEnergy > energyMax - span * 0.08;
    const nearBottom = data.fermiEnergy < energyMin + span * 0.08;

    return {
      xref: "paper",
      x: 0.99,
      xanchor: "right",
      yref: "y",
      y: data.fermiEnergy,
      yanchor: nearTop ? "top" : "bottom",
      yshift: nearTop && !nearBottom ? -4 : 4,
      text: "E_F",
      showarrow: false,
      font: {
        color: theme.font,
        size: compact ? 11 : 12,
      },
      bgcolor: theme.fermiLabelBg,
      bordercolor: theme.fermiLabelBorder,
      borderwidth: selection.frameLineWidth,
      borderpad: compact ? 2 : 3,
    };
  }

  function boundaryShapes(data, energyMin, energyMax, theme, selection) {
    const gridColor = resolvedGridColor(selection, theme);
    return data.boundaryPositions.map((position) => ({
      type: "line",
      x0: position,
      x1: position,
      y0: energyMin,
      y1: energyMax,
      line: {
        color: gridColor,
        width: selection.frameLineWidth,
        dash: "dot",
      },
    }));
  }

  function plotShapes(data, selection, energyMin, energyMax, theme) {
    const yAxisDensity = denseYAxisConfig(selection, energyMin);
    const shapes = [...boundaryShapes(data, energyMin, energyMax, theme, selection)];
    const fermiShape = fermiLevelShape(data, selection, energyMin, energyMax, theme);
    if (fermiShape) {
      shapes.push(fermiShape);
    }
    return {
      shapes,
      yAxisDensity,
    };
  }

  function visualTheme(themeKey) {
    const themes = {
      sandstone: {
        plotBg: "#f8f1e4",
        font: "#221c15",
        tick: "#342b21",
        axis: "rgba(34,28,21,0.42)",
        tickLine: "rgba(34,28,21,0.36)",
        zero: "rgba(34,28,21,0.34)",
        grid: "rgba(34,28,21,0.14)",
        fermiLine: "rgba(143,54,37,0.88)",
        fermiLabelBg: "rgba(255, 251, 244, 0.94)",
        fermiLabelBorder: "rgba(143,54,37,0.3)",
        legendBg: "rgba(255, 251, 244, 0.88)",
        legendBorder: "rgba(58,43,27,0.18)",
        boundary: "rgba(34,28,21,0.18)",
        bandColors: {
          total: "#8f3625",
          up: "#b3472f",
          down: "#215f7d",
          socLine: "#704214",
        },
      },
      studio: {
        plotBg: "#fffdfb",
        font: "#191616",
        tick: "#302828",
        axis: "rgba(25,22,22,0.42)",
        tickLine: "rgba(25,22,22,0.34)",
        zero: "rgba(25,22,22,0.28)",
        grid: "rgba(25,22,22,0.1)",
        fermiLine: "rgba(123,47,47,0.82)",
        fermiLabelBg: "rgba(255,255,255,0.94)",
        fermiLabelBorder: "rgba(123,47,47,0.24)",
        legendBg: "rgba(255,255,255,0.92)",
        legendBorder: "rgba(25,22,22,0.14)",
        boundary: "rgba(25,22,22,0.15)",
        bandColors: {
          total: "#202020",
          up: "#2d2d2d",
          down: "#7b2f2f",
          socLine: "#4a4a4a",
        },
      },
      harbor: {
        plotBg: "#e7eef5",
        font: "#142536",
        tick: "#22384d",
        axis: "rgba(20,37,54,0.42)",
        tickLine: "rgba(20,37,54,0.34)",
        zero: "rgba(20,37,54,0.28)",
        grid: "rgba(20,37,54,0.12)",
        fermiLine: "rgba(23,79,120,0.86)",
        fermiLabelBg: "rgba(241,246,251,0.94)",
        fermiLabelBorder: "rgba(23,79,120,0.26)",
        legendBg: "rgba(241,246,251,0.9)",
        legendBorder: "rgba(20,37,54,0.16)",
        boundary: "rgba(20,37,54,0.17)",
        bandColors: {
          total: "#174f78",
          up: "#1f5f8b",
          down: "#7a3d55",
          socLine: "#2f4f68",
        },
      },
      moss: {
        plotBg: "#edf2e8",
        font: "#1d2b1f",
        tick: "#304235",
        axis: "rgba(29,43,31,0.42)",
        tickLine: "rgba(29,43,31,0.34)",
        zero: "rgba(29,43,31,0.28)",
        grid: "rgba(29,43,31,0.12)",
        fermiLine: "rgba(53,92,58,0.86)",
        fermiLabelBg: "rgba(244,248,240,0.94)",
        fermiLabelBorder: "rgba(53,92,58,0.24)",
        legendBg: "rgba(244,248,240,0.9)",
        legendBorder: "rgba(29,43,31,0.16)",
        boundary: "rgba(29,43,31,0.17)",
        bandColors: {
          total: "#355c3a",
          up: "#406d45",
          down: "#7a4f2d",
          socLine: "#4b5e3a",
        },
      },
    };
    return themes[themeKey] || themes.sandstone;
  }

  function copyRange(range) {
    return Array.isArray(range) && range.length === 2 ? [range[0], range[1]] : null;
  }

  function cloneTrace(trace) {
    const cloned = { ...trace };
    if (Array.isArray(trace.x)) {
      cloned.x = [...trace.x];
    }
    if (Array.isArray(trace.y)) {
      cloned.y = [...trace.y];
    }
    if (trace.line) {
      cloned.line = { ...trace.line };
    }
    if (trace.marker) {
      cloned.marker = { ...trace.marker };
      if (Array.isArray(trace.marker.size)) {
        cloned.marker.size = [...trace.marker.size];
      }
      if (trace.marker.line) {
        cloned.marker.line = { ...trace.marker.line };
      }
    }
    if (Array.isArray(trace.customdata)) {
      cloned.customdata = trace.customdata.map((item) => (Array.isArray(item) ? [...item] : item));
    }
    return cloned;
  }

  function visibleRangesFromPlot(plotNode) {
    const fullLayout = plotNode ? plotNode._fullLayout : null;
    return {
      x: copyRange(fullLayout && fullLayout.xaxis ? fullLayout.xaxis.range : null),
      y: copyRange(fullLayout && fullLayout.yaxis ? fullLayout.yaxis.range : null),
    };
  }

  function rememberVisibleRanges(plotNode) {
    state.sharedPlotRanges = visibleRangesFromPlot(plotNode);
  }

  function plotConfig() {
    return {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["lasso2d", "select2d"],
    };
  }

  function updateExportAvailability() {
    const canExport = Boolean(state.data) && currentPlotMode() === "single";
    elements.exportButton.disabled = !canExport;
    elements.exportButton.title =
      state.data && currentPlotMode() === "multi"
        ? "Switch to single plot mode to export PNG."
        : "";
  }

  function clearRenderedPlots() {
    state.plotNodes.forEach((plotNode) => {
      if (plotNode) {
        Plotly.purge(plotNode);
      }
    });
    state.plotNodes = [];
    elements.plotHost.innerHTML = "";
  }

  function renderPlotEmptyState(message) {
    clearRenderedPlots();
    const empty = document.createElement("div");
    empty.className = "plot-empty-state";
    empty.textContent = message;
    elements.plotHost.appendChild(empty);
  }

  function buildPlotTitle(data, selection) {
    if (selection.plotMode === "multi") {
      return data.mode === "soc"
        ? "Projected band structure by orbital with SOC"
        : "Projected band structure by orbital";
    }
    return data.mode === "soc" ? "Projected band structure with SOC" : "Projected band structure";
  }

  function defaultXRange(data) {
    const values = Array.isArray(data.kpointDistances)
      ? data.kpointDistances.filter((value) => Number.isFinite(value))
      : [];
    if (!values.length) {
      return [0, 1];
    }
    const min = values[0];
    const max = values[values.length - 1];
    if (max > min) {
      return [min, max];
    }
    return [min - 0.5, max + 0.5];
  }

  function buildSelectionSummaryText(data, selection) {
    const summary = summarizeSelection(data, selection);
    const kpointSummary =
      selection.kpointSkipCount > 0
        ? `${summary} • skip first ${selection.kpointSkipCount} k-points`
        : summary;
    return selection.plotMode === "multi" ? `${kpointSummary} • multi-view` : kpointSummary;
  }

  function buildPlotLayout(data, selection, theme, energyMin, energyMax, compact) {
    const decorations = plotShapes(data, selection, energyMin, energyMax, theme);
    const gridColor = resolvedGridColor(selection, theme);
    const frameColor = gridColor;
    const xAxisTitle = compact || !selection.showXAxisTitle ? "" : selection.xAxisTitle;
    const yAxisTitle = compact || !selection.showYAxisTitle ? "" : selection.yAxisTitle;
    const layout = {
      uirevision: `plot-${state.plotUiRevision}`,
      paper_bgcolor: selection.plotBackgroundColor,
      plot_bgcolor: selection.plotBackgroundColor,
      margin: compact
        ? {
            l: 62,
            r: 16,
            t: 22,
            b: 52,
            autoexpand: false,
          }
        : {
            l: 70,
            r: 30,
            t: 72,
            b: 58,
            autoexpand: false,
          },
      font: {
        color: theme.font,
      },
      xaxis: {
        title: xAxisTitle,
        zeroline: false,
        showgrid: false,
        showline: true,
        mirror: true,
        linecolor: frameColor,
        linewidth: selection.frameLineWidth,
        ticks: selection.showXAxisLabels ? "outside" : "",
        tickcolor: theme.tickLine,
        showticklabels: selection.showXAxisLabels,
        tickfont: {
          color: theme.tick,
          size: selection.xAxisLabelSize,
        },
        titlefont: {
          color: theme.font,
          size: selection.xAxisTitleSize,
        },
      },
      yaxis: {
        title: yAxisTitle,
        zeroline: selection.alignToFermi,
        zerolinecolor: frameColor,
        zerolinewidth: selection.frameLineWidth,
        gridcolor: gridColor,
        gridwidth: selection.frameLineWidth,
        showline: true,
        mirror: true,
        linecolor: frameColor,
        linewidth: selection.frameLineWidth,
        ticks: selection.showYAxisLabels ? "outside" : "",
        tickcolor: theme.tickLine,
        showticklabels: selection.showYAxisLabels,
        tickfont: {
          color: theme.tick,
          size: selection.yAxisLabelSize,
        },
        titlefont: {
          color: theme.font,
          size: selection.yAxisTitleSize,
        },
      },
      shapes: decorations.shapes,
      hovermode: "closest",
      showlegend: !compact,
    };

    if (decorations.yAxisDensity) {
      layout.yaxis.tickmode = "linear";
      layout.yaxis.tick0 = decorations.yAxisDensity.tick0;
      layout.yaxis.dtick = decorations.yAxisDensity.dtick;
      layout.yaxis.tickformat = ".1f";
    }

    const fermiAnnotation = fermiLevelAnnotation(
      data,
      selection,
      energyMin,
      energyMax,
      theme,
      compact,
    );
    if (fermiAnnotation) {
      layout.annotations = [fermiAnnotation];
    }

    if (!compact) {
      layout.legend = {
        orientation: "h",
        x: 0,
        xanchor: "left",
        y: 1.02,
        yanchor: "bottom",
        bgcolor: theme.legendBg,
        bordercolor: theme.legendBorder,
        borderwidth: 1,
      };
    }

    const xRange = copyRange(state.sharedPlotRanges.x);
    layout.xaxis.range = xRange || defaultXRange(data);

    const yRange = copyRange(state.sharedPlotRanges.y);
    layout.yaxis.range = yRange || [energyMin, energyMax];

    return layout;
  }

  function buildPlotModel(data, selection, theme, energyMin, energyMax) {
    const energyShift = selection.alignToFermi ? data.fermiEnergy : 0;
    const descriptors = buildChannelDescriptors(data, selection, theme);
    const lineTraces = [];
    const orbitalPlots = selection.orbitalSelections.map((orbital, orbitalOffset) => ({
      key: selectionColorKey(orbital),
      label: orbital.label,
      orbital,
      orbitalOffset,
      markerTraces: [],
    }));

    descriptors.forEach((descriptor) => {
      const bandEntries = channelEnergyMatrix(data, descriptor.key);
      if (!bandEntries.length) {
        return;
      }

      lineTraces.push(
        buildLineTrace(data.kpointDistances, bandEntries, data.segments, energyShift, {
          ...descriptor,
          color: resolvedBandLineColor(selection, descriptor.color),
          width: selection.bandLineWidth,
        }),
      );

      if (!data.hasProjection) {
        return;
      }

      const projectionMatrix = channelProjectionMatrix(data, descriptor.key, selection.socComponent);
      orbitalPlots.forEach((orbitalPlot) => {
        const atomIndices = Array.isArray(orbitalPlot.orbital.atomIndices)
          ? orbitalPlot.orbital.atomIndices
          : selection.atomIndices;
        const weights = aggregateWeights(
          projectionMatrix,
          atomIndices,
          orbitalPlot.orbital.indices,
        );
        const baseLabel =
          data.mode === "collinear_spin"
            ? `${descriptor.label} · ${orbitalPlot.label}`
            : orbitalPlot.label;
        const markerTrace = buildMarkerTrace({
          descriptor,
          traceLabel:
            data.mode === "soc" && selection.socComponent !== "total"
              ? `${baseLabel} (${selection.socComponent})`
              : baseLabel,
          traceColor: colorForSelection(
            orbitalPlot.orbital,
            orbitalPlot.orbitalOffset,
            selection.orbitalMode,
          ),
          xValues: data.kpointDistances,
          bandEntries,
          weightMatrix: weights,
          segments: data.segments,
          energyShift,
          selection: { ...selection, energyMin, energyMax },
          originalKpointIndices: data.originalKpointIndices,
        });
        if (markerTrace) {
          orbitalPlot.markerTraces.push(markerTrace);
        }
      });
    });

    return {
      bandLineLayer: selection.bandLineLayer,
      lineTraces,
      orbitalPlots,
    };
  }

  function singlePlotTraces(model) {
    const markerTraces = model.orbitalPlots.flatMap((orbitalPlot) => orbitalPlot.markerTraces);
    if (model.bandLineLayer === "top") {
      return [...markerTraces, ...model.lineTraces];
    }
    return [
      ...model.lineTraces,
      ...markerTraces,
    ];
  }

  function subplotTraces(model, orbitalPlot) {
    const markerTraces = orbitalPlot.markerTraces.map(cloneTrace);
    const lineTraces = model.lineTraces.map(cloneTrace);
    if (model.bandLineLayer === "top") {
      return [...markerTraces, ...lineTraces];
    }
    return [...lineTraces, ...markerTraces];
  }

  function subplotMetaLabel(data, selection) {
    const channel = data.mode === "soc" ? selection.socComponent : selection.spinChannel;
    return `${modeLabel(data.mode)} • ${channel}`;
  }

  function multiPlotColumnCount(plotCount) {
    if (window.innerWidth <= 720) {
      return 1;
    }
    if (window.innerWidth <= 1280) {
      return Math.min(plotCount, 2);
    }
    if (window.innerWidth <= 1680) {
      return Math.min(plotCount, 3);
    }
    return Math.min(plotCount, 4);
  }

  function applyMultiPlotGridLayout(grid, plotCount) {
    const gap = 14;
    const columns = Math.max(1, multiPlotColumnCount(plotCount));
    const rows = Math.max(1, Math.ceil(plotCount / columns));
    const availableHeight = Math.max(elements.plotHost.clientHeight - 4, 0);
    const fillHeight =
      rows > 0 ? Math.floor((availableHeight - gap * (rows - 1)) / rows) : availableHeight;
    const subplotHeight = Math.max(280, fillHeight || 0);

    grid.style.setProperty("--plot-columns", String(columns));
    grid.style.setProperty("--plot-grid-gap", `${gap}px`);
    grid.style.setProperty("--subplot-height", `${subplotHeight}px`);
  }

  function attachSinglePlotListeners(plotNode) {
    plotNode.on("plotly_relayout", () => {
      if (state.relayoutSyncInProgress) {
        return;
      }
      rememberVisibleRanges(plotNode);
    });
  }

  function syncRangesFromSourcePlot(sourcePlotNode) {
    if (state.relayoutSyncInProgress) {
      return;
    }

    rememberVisibleRanges(sourcePlotNode);
    const update = {
      "xaxis.range": copyRange(state.sharedPlotRanges.x),
      "yaxis.range": copyRange(state.sharedPlotRanges.y),
    };

    state.relayoutSyncInProgress = true;
    Promise.all(
      state.plotNodes
        .filter((plotNode) => plotNode !== sourcePlotNode)
        .map((plotNode) => Plotly.relayout(plotNode, update).catch(() => null)),
    ).finally(() => {
      state.relayoutSyncInProgress = false;
    });
  }

  function attachMultiPlotListeners(plotNode) {
    plotNode.on("plotly_relayout", () => {
      if (state.relayoutSyncInProgress || currentPlotMode() !== "multi") {
        return;
      }
      syncRangesFromSourcePlot(plotNode);
    });
  }

  function renderSinglePlot(data, selection, theme, energyMin, energyMax, model) {
    clearRenderedPlots();
    const plotNode = document.createElement("div");
    plotNode.className = "plot-canvas";
    elements.plotHost.appendChild(plotNode);
    state.plotNodes = [plotNode];

    Plotly.react(
      plotNode,
      singlePlotTraces(model),
      buildPlotLayout(data, selection, theme, energyMin, energyMax, false),
      plotConfig(),
    ).then(() => {
      attachSinglePlotListeners(plotNode);
    });
  }

  function renderMultiPlotGrid(data, selection, theme, energyMin, energyMax, model) {
    clearRenderedPlots();

    if (!data.hasProjection) {
      renderPlotEmptyState("Multi-plot mode requires projected eigenvalues.");
      return;
    }

    if (!selection.orbitalSelections.length) {
      renderPlotEmptyState("Select at least one orbital or family filter to compare in multi mode.");
      return;
    }

    const grid = document.createElement("div");
    grid.className = "plot-grid";
    const meta = subplotMetaLabel(data, selection);
    const plotEntries = [];

    elements.plotHost.appendChild(grid);
    applyMultiPlotGridLayout(grid, model.orbitalPlots.length);

    model.orbitalPlots.forEach((orbitalPlot) => {
      const card = document.createElement("section");
      card.className = "subplot-card";

      const header = document.createElement("div");
      header.className = "subplot-header";

      const title = document.createElement("h3");
      title.className = "subplot-title";
      title.textContent = orbitalPlot.label;

      const metaLabel = document.createElement("span");
      metaLabel.className = "subplot-meta";
      metaLabel.textContent = meta;

      const plotNode = document.createElement("div");
      plotNode.className = "subplot-plot";

      header.appendChild(title);
      header.appendChild(metaLabel);
      card.appendChild(header);
      card.appendChild(plotNode);
      grid.appendChild(card);
      state.plotNodes.push(plotNode);
      plotEntries.push({
        plotNode,
        traces: subplotTraces(model, orbitalPlot),
      });
    });

    requestAnimationFrame(() => {
      if (!grid.isConnected) {
        return;
      }

      plotEntries.forEach(({ plotNode, traces }) => {
        Plotly.react(
          plotNode,
          traces,
          buildPlotLayout(data, selection, theme, energyMin, energyMax, true),
          plotConfig(),
        ).then(() => {
          attachMultiPlotListeners(plotNode);
          Plotly.Plots.resize(plotNode).catch(() => null);
        });
      });
    });
  }

  function renderPlot() {
    updateExportAvailability();
    if (!state.data) {
      clearRenderedPlots();
      return;
    }

    const data = state.data;
    const selection = currentSelection(data);
    const plotData = visiblePlotData(data, selection.kpointSkipCount);
    const theme = visualTheme(selection.plotTheme);
    let energyMin = selection.energyMin;
    let energyMax = selection.energyMax;
    if (!(energyMin < energyMax)) {
      energyMin = energyMax - 0.5;
    }

    elements.selectionSummary.textContent = buildSelectionSummaryText(data, selection);
    elements.plotTitle.textContent = buildPlotTitle(data, selection);

    if (!plotData.visibleKpointCount) {
      renderPlotEmptyState(
        selection.kpointSkipCount > 0
          ? `K-point skip (${selection.kpointSkipCount}) removes all ${data.summary.nkpoints} available k-points.`
          : "No k-points available for plotting.",
      );
      return;
    }

    const model = buildPlotModel(plotData, selection, theme, energyMin, energyMax);
    if (selection.plotMode === "multi") {
      renderMultiPlotGrid(plotData, selection, theme, energyMin, energyMax, model);
      return;
    }

    renderSinglePlot(plotData, selection, theme, energyMin, energyMax, model);
  }

  function resizeRenderedPlots() {
    if (!state.plotNodes.length) {
      return;
    }

    const plotGrid = elements.plotHost.querySelector(".plot-grid");
    if (plotGrid && currentPlotMode() === "multi") {
      applyMultiPlotGridLayout(plotGrid, state.plotNodes.length);
    }

    state.plotNodes.forEach((plotNode) => {
      Plotly.Plots.resize(plotNode).catch(() => null);
    });
  }

  function resetFilters() {
    if (!state.data) {
      return;
    }
    invalidatePlotView();
    populateControls(state.data);
    renderPlot();
  }

  function bindEvents() {
    let resizeFrameId = 0;
    let plotResizeFrameId = 0;
    let plotResizeDrag = null;

    const scheduleRenderedPlotResize = () => {
      if (plotResizeFrameId) {
        return;
      }
      plotResizeFrameId = requestAnimationFrame(() => {
        plotResizeFrameId = 0;
        resizeRenderedPlots();
      });
    };

    const handlePlotResizePointerMove = (event) => {
      if (!plotResizeDrag) {
        return;
      }
      const nextHeight = Math.max(
        360,
        Math.round(plotResizeDrag.startHeight + event.clientY - plotResizeDrag.startY),
      );
      elements.plotCard.style.setProperty("--plot-card-height", `${nextHeight}px`);
      scheduleRenderedPlotResize();
    };

    const stopPlotResizeDrag = () => {
      if (!plotResizeDrag) {
        return;
      }
      plotResizeDrag = null;
      document.body.classList.remove("is-resizing-plot");
      window.removeEventListener("pointermove", handlePlotResizePointerMove);
      window.removeEventListener("pointerup", stopPlotResizeDrag);
      window.removeEventListener("pointercancel", stopPlotResizeDrag);
      scheduleRenderedPlotResize();
    };

    elements.fileInput.addEventListener("change", async (event) => {
      const [file] = event.target.files || [];
      if (!file) {
        return;
      }

      try {
        await loadFile(file);
      } catch (error) {
        console.error(error);
        state.data = null;
        setUploadCardIdle(true);
        updateExportAvailability();
        setStatus(error.message || "Failed to parse vasprun.xml.", true);
      }
    });

    elements.resetButton.addEventListener("click", resetFilters);
    elements.exportButton.addEventListener("click", () => {
      const plotNode = state.plotNodes[0];
      if (!state.data || currentPlotMode() !== "single" || !plotNode) {
        return;
      }
      Plotly.downloadImage(plotNode, {
        format: "png",
        filename: "projected-band-structure",
        scale: 2,
      });
    });

    [elements.energyMin, elements.energyMax, elements.kpointSkip].forEach((input) =>
      input.addEventListener("input", () => {
        invalidatePlotView();
        renderPlot();
      }),
    );

    elements.alignFermi.addEventListener("input", () => {
      const nextAlignToFermi = elements.alignFermi.checked;
      syncDefaultYAxisTitle(nextAlignToFermi);
      syncEnergyWindowToAlignment(state.data, nextAlignToFermi);
      invalidatePlotView();
      renderPlot();
    });

    [
      elements.markerOutline,
      elements.bandLineLayer,
      elements.plotTheme,
      elements.spinChannel,
      elements.socComponent,
      elements.atomSelection,
    ].forEach((input) => input.addEventListener("input", renderPlot));

    plotModeButtons().forEach((button) => {
      button.addEventListener("click", () => {
        const nextMode = button.dataset.plotMode;
        if (!nextMode || nextMode === currentPlotMode()) {
          return;
        }
        setPlotMode(nextMode);
        renderPlot();
      });
    });

    elements.orbitalMode.addEventListener("input", () => {
      if (!state.data) {
        return;
      }
      populateOrbitalFilters(state.data);
      renderPlot();
    });

    elements.plotResizeHandle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || window.innerWidth <= 1080) {
        return;
      }

      plotResizeDrag = {
        startY: event.clientY,
        startHeight: elements.plotCard.getBoundingClientRect().height,
      };
      document.body.classList.add("is-resizing-plot");
      window.addEventListener("pointermove", handlePlotResizePointerMove);
      window.addEventListener("pointerup", stopPlotResizeDrag);
      window.addEventListener("pointercancel", stopPlotResizeDrag);
      event.preventDefault();
    });

    elements.markerScale.addEventListener("input", () => {
      elements.markerScaleValue.textContent = elements.markerScale.value;
      renderPlot();
    });

    elements.markerOpacity.addEventListener("input", () => {
      elements.markerOpacityValue.textContent = `${elements.markerOpacity.value}%`;
      renderPlot();
    });

    elements.markerSkip.addEventListener("input", () => {
      elements.markerSkipValue.textContent = `${elements.markerSkip.value}%`;
      renderPlot();
    });

    elements.plotBackgroundColor.addEventListener("input", renderPlot);
    elements.bandLineColor.addEventListener("input", renderPlot);

    elements.bandLineColorMode.addEventListener("input", () => {
      syncBandLineColorInputState();
      renderPlot();
    });

    elements.frameLineWidth.addEventListener("input", () => {
      elements.frameLineWidthValue.textContent = `${elements.frameLineWidth.value}px`;
      renderPlot();
    });

    elements.bandLineWidth.addEventListener("input", () => {
      elements.bandLineWidthValue.textContent = `${elements.bandLineWidth.value}px`;
      renderPlot();
    });

    elements.gridLineOpacity.addEventListener("input", () => {
      elements.gridLineOpacityValue.textContent = `${elements.gridLineOpacity.value}%`;
      renderPlot();
    });

    [
      elements.showXAxisTitle,
      elements.xAxisTitle,
      elements.xAxisTitleSize,
      elements.showYAxisTitle,
      elements.yAxisTitle,
      elements.yAxisTitleSize,
      elements.gridLineColor,
      elements.showXAxisLabels,
      elements.xAxisLabelSize,
      elements.showYAxisLabels,
      elements.yAxisLabelSize,
    ].forEach((input) => input.addEventListener("input", renderPlot));

    window.addEventListener("resize", () => {
      if (window.innerWidth <= 1080) {
        elements.plotCard.style.removeProperty("--plot-card-height");
      }
      scheduleRenderedPlotResize();

      if (!state.data || currentPlotMode() !== "multi") {
        return;
      }
      if (resizeFrameId) {
        cancelAnimationFrame(resizeFrameId);
      }
      resizeFrameId = requestAnimationFrame(() => {
        resizeFrameId = 0;
        renderPlot();
      });
    });

    setPlotMode(currentPlotMode());
    syncBandLineColorInputState();
    updateExportAvailability();
  }

  bindEvents();
})();
