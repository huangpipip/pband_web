(function () {
  const state = {
    data: null,
  };

  const colors = {
    total: "#b3472f",
    up: "#b3472f",
    down: "#215f7d",
    socLine: "#704214",
  };
  const orbitalPalette = [
    "#b3472f",
    "#215f7d",
    "#ab7a19",
    "#2f6b4f",
    "#8f4aa1",
    "#c15c17",
    "#4b63c1",
    "#7b8f22",
    "#8a3b69",
    "#2d8b8b",
    "#7f4f24",
    "#b03a7a",
  ];

  const elements = {
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
    plot: document.getElementById("plot"),
  };

  function setStatus(message, isError) {
    elements.statusLine.textContent = message;
    elements.statusLine.classList.toggle("error", Boolean(isError));
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
    populateControls(data);
    updateSummary(data);
    renderPlot();
    elements.exportButton.disabled = false;
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
    elements.energyMin.value = windowRange.min;
    elements.energyMax.value = windowRange.max;
    elements.alignFermi.checked = true;
    elements.markerScale.value = "18";
    elements.markerScaleValue.textContent = "18";
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
    const lower = String(name || "").toLowerCase();
    if (lower === "tot") {
      return "tot";
    }
    if (lower === "s" || lower.startsWith("s")) {
      return "s";
    }
    if (lower.startsWith("p")) {
      return "p";
    }
    if (lower.startsWith("d") || ["x2-y2", "dx2-y2", "dz2"].includes(lower)) {
      return "d";
    }
    if (lower.startsWith("f")) {
      return "f";
    }
    return "other";
  }

  function orbitalSortKey(name) {
    const lower = String(name || "").toLowerCase();
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
      tot: 99,
    };
    const family = orbitalFamily(lower);
    return [familyOrder[family] ?? 98, componentOrder[lower] ?? 50, lower];
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
    const hasResolvedChannels = entries.some((entry) => entry.family !== "tot");
    entries.forEach((entry) => {
      const label = document.createElement("label");
      label.className = "pill";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = hasResolvedChannels ? entry.family !== "tot" : true;
      input.dataset.selectionLabel = entry.label;
      input.dataset.selectionIndices = entry.indices.join(",");
      input.dataset.selectionFamily = entry.family;
      input.addEventListener("change", renderPlot);
      label.appendChild(input);
      label.appendChild(document.createTextNode(entry.label));
      elements.orbitalFilters.appendChild(label);
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

  function buildChannelDescriptors(data, selection) {
    if (data.mode === "collinear_spin") {
      if (selection.spinChannel === "up") {
        return [{ key: "up", label: "Spin up", color: colors.up }];
      }
      if (selection.spinChannel === "down") {
        return [{ key: "down", label: "Spin down", color: colors.down }];
      }
      return [
        { key: "up", label: "Spin up", color: colors.up },
        { key: "down", label: "Spin down", color: colors.down },
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
          color: colors.socLine,
        },
      ];
    }

    return [{ key: "total", label: "Bands", color: colors.total }];
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
    const normalized = String(label || "").toLowerCase();
    const explicitMap = {
      s: "#c05a2b",
      py: "#215f7d",
      pz: "#2f6b4f",
      px: "#7a56c5",
      dxy: "#ab7a19",
      dyz: "#cc5c39",
      dz2: "#3b7bb5",
      dxz: "#8f4aa1",
      "x2-y2": "#8a3b69",
      "dx2-y2": "#8a3b69",
      tot: "#4c3d28",
    };
    return explicitMap[normalized] || orbitalPalette[index % orbitalPalette.length];
  }

  function colorForSelection(selectionItem, index) {
    if (selectionItem.family && selectionItem.family !== "other") {
      return colorForOrbital(selectionItem.family, index);
    }
    return colorForOrbital(selectionItem.label, index);
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
        opacity: 0.72,
        line: {
          width: 0.6,
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

  function boundaryShapes(data, energyMin, energyMax) {
    return data.boundaryPositions.map((position) => ({
      type: "line",
      x0: position,
      x1: position,
      y0: energyMin,
      y1: energyMax,
      line: {
        color: "rgba(31,27,22,0.12)",
        width: 1,
        dash: "dot",
      },
    }));
  }

  function renderPlot() {
    if (!state.data) {
      return;
    }

    const data = state.data;
    const selection = currentSelection(data);
    let energyMin = selection.energyMin;
    let energyMax = selection.energyMax;
    if (!(energyMin < energyMax)) {
      energyMin = energyMax - 0.5;
    }
    const energyShift = selection.alignToFermi ? data.fermiEnergy : 0;
    const descriptors = buildChannelDescriptors(data, selection);
    const traces = [];

    descriptors.forEach((descriptor) => {
      const bandEntries = channelEnergyMatrix(data, descriptor.key);
      if (!bandEntries.length) {
        return;
      }

      traces.push(
        buildLineTrace(data.kpointDistances, bandEntries, data.segments, energyShift, descriptor),
      );

      if (data.hasProjection) {
        const projectionMatrix = channelProjectionMatrix(
          data,
          descriptor.key,
          selection.socComponent,
        );
        selection.orbitalSelections.forEach((orbital, orbitalOffset) => {
          const weights = aggregateWeights(projectionMatrix, selection.atomIndices, orbital.indices);
          const baseLabel =
            data.mode === "collinear_spin"
              ? `${descriptor.label} · ${orbital.label}`
              : orbital.label;
          const markerTrace = buildMarkerTrace({
            descriptor,
            traceLabel:
              data.mode === "soc" && selection.socComponent !== "total"
                ? `${baseLabel} (${selection.socComponent})`
                : baseLabel,
            traceColor: colorForSelection(orbital, orbitalOffset),
            xValues: data.kpointDistances,
            bandEntries,
            weightMatrix: weights,
            energyShift,
            selection: { ...selection, energyMin, energyMax },
          });
          if (markerTrace) {
            traces.push(markerTrace);
          }
        });
      }
    });

    elements.selectionSummary.textContent = summarizeSelection(data, selection);
    elements.plotTitle.textContent =
      data.mode === "soc" ? "Projected band structure with SOC" : "Projected band structure";

    const layout = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(255,251,245,0.55)",
      margin: { l: 70, r: 30, t: 20, b: 58 },
      xaxis: {
        title: "k-path distance",
        zeroline: false,
        showgrid: false,
      },
      yaxis: {
        title: selection.alignToFermi ? "Energy - E_F (eV)" : "Energy (eV)",
        range: [energyMin, energyMax],
        zeroline: true,
        zerolinecolor: "rgba(31,27,22,0.18)",
        gridcolor: "rgba(31,27,22,0.08)",
      },
      legend: {
        orientation: "h",
        y: 1.05,
      },
      shapes: boundaryShapes(data, energyMin, energyMax),
      hovermode: "closest",
    };

    Plotly.react(elements.plot, traces, layout, {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["lasso2d", "select2d"],
    });
  }

  function resetFilters() {
    if (!state.data) {
      return;
    }
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
        elements.exportButton.disabled = true;
        setStatus(error.message || "Failed to parse vasprun.xml.", true);
      }
    });

    elements.resetButton.addEventListener("click", resetFilters);
    elements.exportButton.addEventListener("click", () => {
      if (!state.data) {
        return;
      }
      Plotly.downloadImage(elements.plot, {
        format: "png",
        filename: "projected-band-structure",
        scale: 2,
      });
    });

    [
      elements.energyMin,
      elements.energyMax,
      elements.alignFermi,
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
  }

  bindEvents();
})();
