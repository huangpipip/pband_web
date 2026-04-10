(function () {
  const state = {
    data: null,
    markerColorOverrides: createEmptyMarkerColorOverrides(),
    plotNodes: [],
    plotUiRevision: 0,
    relayoutSyncInProgress: false,
    sharedPlotRanges: createEmptyPlotRanges(),
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
    markerScale: document.getElementById("marker-scale"),
    markerScaleValue: document.getElementById("marker-scale-value"),
    markerOpacity: document.getElementById("marker-opacity"),
    markerOpacityValue: document.getElementById("marker-opacity-value"),
    markerOutline: document.getElementById("marker-outline"),
    plotMode: document.getElementById("plot-mode"),
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
    plotHost: document.getElementById("plot-host"),
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

  function orbitalColorScope(orbitalMode) {
    return orbitalMode === "families" ? "families" : "components";
  }

  function colorOverrideStore(orbitalMode) {
    return state.markerColorOverrides[orbitalColorScope(orbitalMode)];
  }

  function selectionColorKey(selectionItem) {
    return String(selectionItem.colorKey || selectionItem.label || "orbital");
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

  function populateControls(data) {
    const windowRange = defaultWindow(data);
    resetMarkerColorOverrides();
    elements.energyMin.value = windowRange.min;
    elements.energyMax.value = windowRange.max;
    elements.alignFermi.checked = true;
    elements.markerScale.value = "18";
    elements.markerScaleValue.textContent = "18";
    elements.markerOpacity.value = "80";
    elements.markerOpacityValue.textContent = "80%";
    elements.markerOutline.checked = false;
    elements.plotMode.value = "single";
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
      input.addEventListener("change", renderPlot);
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

  function populateOrbitalFilters(data) {
    elements.orbitalFilters.innerHTML = "";
    if (!data.hasProjection) {
      elements.orbitalFilters.textContent = "No projected eigenvalues found in the file.";
      elements.orbitalFilters.classList.add("empty-state");
      return;
    }

    const useFamilies = elements.orbitalMode.value === "families";
    const entries = useFamilies
      ? orderedOrbitalFamilies(data).map((family) => ({
          label: family.label,
          indices: family.indices,
          family: family.key,
        }))
      : orderedOrbitals(data).map((orbital) => ({
          label: orbital.name,
          indices: [orbital.index],
          family: orbitalFamily(orbital.name),
        }));

    if (!entries.length) {
      elements.orbitalFilters.textContent = "Projected data found, but orbital fields are empty.";
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
      input.checked = false;
      input.dataset.selectionLabel = entry.label;
      input.dataset.selectionIndices = entry.indices.join(",");
      input.dataset.selectionFamily = entry.family;
      input.dataset.selectionColorKey = entry.label;
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
        family: entry.family,
        colorKey: entry.label,
      };
      const syncColorUi = (color) => {
        colorButton.style.backgroundColor = color;
        colorInput.value = color;
      };
      syncColorUi(colorForSelection(entrySelection, index, elements.orbitalMode.value));

      colorButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        colorInput.click();
      });

      const applyColorChange = () => {
        colorOverrideStore(elements.orbitalMode.value)[entry.label] = colorInput.value;
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

    const selectedOrbitalInputs = Array.from(
      elements.orbitalFilters.querySelectorAll("input[data-selection-indices]:checked"),
    );
    const orbitalSelections = selectedOrbitalInputs
      .map((input) => ({
        indices: String(input.dataset.selectionIndices || "")
          .split(",")
          .map((part) => Number(part))
          .filter((value) => Number.isInteger(value))
          .sort((a, b) => a - b),
        label: input.dataset.selectionLabel || "orbital",
        colorKey: input.dataset.selectionColorKey || input.dataset.selectionLabel || "orbital",
        family: input.dataset.selectionFamily || "other",
      }))
      .filter((item) => item.indices.length > 0)
      .sort((left, right) => left.indices[0] - right.indices[0]);
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
      markerScale: Number(elements.markerScale.value),
      markerOpacity: Number(elements.markerOpacity.value) / 100,
      markerOutline: elements.markerOutline.checked,
      plotMode: elements.plotMode.value,
      plotTheme: elements.plotTheme.value,
      selectedElements,
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
    return `${modeLabel(data.mode)} • ${atomLabel} • ${selection.orbitalMode} • ${orbitalLabel} • ${mode}`;
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
    if (selectionItem.label) {
      return colorForOrbital(selectionItem.label, index);
    }
    if (selectionItem.family && selectionItem.family !== "other") {
      return colorForOrbital(selectionItem.family, index);
    }
    return colorForOrbital("other", index);
  }

  function colorForSelection(selectionItem, index, orbitalMode) {
    const override = colorOverrideStore(orbitalMode)[selectionColorKey(selectionItem)];
    return override || defaultColorForSelection(selectionItem, index);
  }

  function buildLineTrace(xValues, bandEntries, segments, energyShift, descriptor) {
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
        width: 1.2,
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
      energyShift,
      selection,
    } = options;
    const x = [];
    const y = [];
    const sizes = [];
    const weights = [];
    const bandIndices = [];
    const kIndices = [];
    let maxAbs = 0;

    if (!weightMatrix.length) {
      return null;
    }

    weightMatrix.forEach((bandWeights, kIndex) => {
      bandWeights.forEach((weight, bandIndex) => {
        const energy = bandEntries[kIndex][bandIndex].energy - energyShift;
        if (energy < selection.energyMin || energy > selection.energyMax) {
          return;
        }
        const absWeight = Math.abs(weight);
        if (absWeight < 1e-6) {
          return;
        }
        x.push(xValues[kIndex]);
        y.push(energy);
        weights.push(weight);
        bandIndices.push(bandIndex + 1);
        kIndices.push(kIndex + 1);
        maxAbs = Math.max(maxAbs, absWeight);
      });
    });

    if (!weights.length) {
      return null;
    }

    weights.forEach((weight) => {
      const relative = maxAbs > 0 ? Math.abs(weight) / maxAbs : 0;
      sizes.push(4 + Math.sqrt(relative) * selection.markerScale);
    });

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

  function boundaryShapes(data, energyMin, energyMax, theme) {
    return data.boundaryPositions.map((position) => ({
      type: "line",
      x0: position,
      x1: position,
      y0: energyMin,
      y1: energyMax,
      line: {
        color: theme.boundary,
        width: 1,
        dash: "dot",
      },
    }));
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
    const canExport = Boolean(state.data) && elements.plotMode.value === "single";
    elements.exportButton.disabled = !canExport;
    elements.exportButton.title =
      state.data && elements.plotMode.value === "multi"
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

  function buildSelectionSummaryText(data, selection) {
    const summary = summarizeSelection(data, selection);
    return selection.plotMode === "multi" ? `${summary} • multi-view` : summary;
  }

  function buildPlotLayout(data, selection, theme, energyMin, energyMax, compact) {
    const layout = {
      uirevision: `plot-${state.plotUiRevision}`,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: theme.plotBg,
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
        title: "k-path distance",
        zeroline: false,
        showgrid: false,
        showline: true,
        linecolor: theme.axis,
        linewidth: 1.3,
        ticks: "outside",
        tickcolor: theme.tickLine,
        tickfont: {
          color: theme.tick,
        },
        titlefont: {
          color: theme.font,
        },
      },
      yaxis: {
        title: selection.alignToFermi ? "Energy - E_F (eV)" : "Energy (eV)",
        zeroline: true,
        zerolinecolor: theme.zero,
        zerolinewidth: 1.3,
        gridcolor: theme.grid,
        gridwidth: 1,
        showline: true,
        linecolor: theme.axis,
        linewidth: 1.3,
        ticks: "outside",
        tickcolor: theme.tickLine,
        tickfont: {
          color: theme.tick,
        },
        titlefont: {
          color: theme.font,
        },
      },
      shapes: boundaryShapes(data, energyMin, energyMax, theme),
      hovermode: "closest",
      showlegend: !compact,
    };

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
    if (xRange) {
      layout.xaxis.range = xRange;
    } else {
      layout.xaxis.autorange = true;
    }

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
        buildLineTrace(data.kpointDistances, bandEntries, data.segments, energyShift, descriptor),
      );

      if (!data.hasProjection) {
        return;
      }

      const projectionMatrix = channelProjectionMatrix(data, descriptor.key, selection.socComponent);
      orbitalPlots.forEach((orbitalPlot) => {
        const weights = aggregateWeights(
          projectionMatrix,
          selection.atomIndices,
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
          energyShift,
          selection: { ...selection, energyMin, energyMax },
        });
        if (markerTrace) {
          orbitalPlot.markerTraces.push(markerTrace);
        }
      });
    });

    return {
      lineTraces,
      orbitalPlots,
    };
  }

  function singlePlotTraces(model) {
    return [
      ...model.lineTraces,
      ...model.orbitalPlots.flatMap((orbitalPlot) => orbitalPlot.markerTraces),
    ];
  }

  function subplotMetaLabel(data, selection) {
    const channel = data.mode === "soc" ? selection.socComponent : selection.spinChannel;
    return `${modeLabel(data.mode)} • ${channel}`;
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
      if (state.relayoutSyncInProgress || elements.plotMode.value !== "multi") {
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

      const traces = [
        ...model.lineTraces.map(cloneTrace),
        ...orbitalPlot.markerTraces.map(cloneTrace),
      ];

      Plotly.react(
        plotNode,
        traces,
        buildPlotLayout(data, selection, theme, energyMin, energyMax, true),
        plotConfig(),
      ).then(() => {
        attachMultiPlotListeners(plotNode);
      });
    });

    elements.plotHost.appendChild(grid);
  }

  function renderPlot() {
    updateExportAvailability();
    if (!state.data) {
      clearRenderedPlots();
      return;
    }

    const data = state.data;
    const selection = currentSelection(data);
    const theme = visualTheme(selection.plotTheme);
    let energyMin = selection.energyMin;
    let energyMax = selection.energyMax;
    if (!(energyMin < energyMax)) {
      energyMin = energyMax - 0.5;
    }

    elements.selectionSummary.textContent = buildSelectionSummaryText(data, selection);
    elements.plotTitle.textContent = buildPlotTitle(data, selection);

    const model = buildPlotModel(data, selection, theme, energyMin, energyMax);
    if (selection.plotMode === "multi") {
      renderMultiPlotGrid(data, selection, theme, energyMin, energyMax, model);
      return;
    }

    renderSinglePlot(data, selection, theme, energyMin, energyMax, model);
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
      if (!state.data || elements.plotMode.value !== "single" || !plotNode) {
        return;
      }
      Plotly.downloadImage(plotNode, {
        format: "png",
        filename: "projected-band-structure",
        scale: 2,
      });
    });

    [elements.energyMin, elements.energyMax, elements.alignFermi].forEach((input) =>
      input.addEventListener("input", () => {
        invalidatePlotView();
        renderPlot();
      }),
    );

    [
      elements.markerOutline,
      elements.plotMode,
      elements.plotTheme,
      elements.spinChannel,
      elements.socComponent,
      elements.atomSelection,
    ].forEach((input) => input.addEventListener("input", renderPlot));

    elements.orbitalMode.addEventListener("input", () => {
      if (!state.data) {
        return;
      }
      populateOrbitalFilters(state.data);
      renderPlot();
    });

    elements.markerScale.addEventListener("input", () => {
      elements.markerScaleValue.textContent = elements.markerScale.value;
      renderPlot();
    });

    elements.markerOpacity.addEventListener("input", () => {
      elements.markerOpacityValue.textContent = `${elements.markerOpacity.value}%`;
      renderPlot();
    });

    updateExportAvailability();
  }

  bindEvents();
})();
