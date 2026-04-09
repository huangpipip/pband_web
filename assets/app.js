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

  function orderedOrbitalGroups(data) {
    const preferred = ["s", "p", "d", "f", "tot", "other"];
    return preferred.filter((key) => Array.isArray(data.orbitalGroups[key]));
  }

  function populateOrbitalFilters(data) {
    elements.orbitalFilters.innerHTML = "";
    if (!data.hasProjection) {
      elements.orbitalFilters.textContent = "No projected eigenvalues found in the file.";
      elements.orbitalFilters.classList.add("empty-state");
      return;
    }

    const groups = orderedOrbitalGroups(data);
    if (!groups.length) {
      elements.orbitalFilters.textContent = "Projected data found, but orbital fields are empty.";
      elements.orbitalFilters.classList.add("empty-state");
      return;
    }

    elements.orbitalFilters.classList.remove("empty-state");
    const hasResolvedChannels = groups.some((group) => ["s", "p", "d", "f"].includes(group));
    groups.forEach((group) => {
      const label = document.createElement("label");
      label.className = "pill";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = hasResolvedChannels ? group !== "tot" : true;
      input.dataset.orbitalGroup = group;
      input.addEventListener("change", renderPlot);
      label.appendChild(input);
      label.appendChild(document.createTextNode(group));
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

    const groupKeys = checkedValues(elements.orbitalFilters, "orbitalGroup");
    const orbitalIndices = Array.from(
      new Set(groupKeys.flatMap((key) => data.orbitalGroups[key] || [])),
    ).sort((a, b) => a - b);

    return {
      atomIndices: selectedAtoms,
      orbitalIndices,
      spinChannel: elements.spinChannel.value,
      socComponent: elements.socComponent.value,
      energyMin: Number(elements.energyMin.value),
      energyMax: Number(elements.energyMax.value),
      alignToFermi: elements.alignFermi.checked,
      markerScale: Number(elements.markerScale.value),
      selectedElements,
      groupKeys,
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
    const orbitalLabel = selection.groupKeys.length
      ? selection.groupKeys.join(" + ")
      : "no orbitals";
    const mode = data.mode === "soc" ? selection.socComponent : selection.spinChannel;
    return `${modeLabel(data.mode)} • ${atomLabel} • ${orbitalLabel} • ${mode}`;
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
    };
  }

  function buildMarkerTrace(options) {
    const {
      descriptor,
      xValues,
      bandEntries,
      weightMatrix,
      energyShift,
      selection,
      signedColors,
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
      name: `${descriptor.label} projection`,
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

    if (signedColors) {
      trace.marker.color = weights;
      trace.marker.colorscale = [
        [0, "#215f7d"],
        [0.5, "#f8f3eb"],
        [1, "#b3472f"],
      ];
      trace.marker.cmin = -maxAbs;
      trace.marker.cmax = maxAbs;
      trace.marker.colorbar = {
        title: "Signed projection",
        thickness: 12,
        len: 0.5,
      };
    } else {
      trace.marker.color = descriptor.color;
    }

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
        const weights = aggregateWeights(
          projectionMatrix,
          selection.atomIndices,
          selection.orbitalIndices,
        );
        const markerTrace = buildMarkerTrace({
          descriptor,
          xValues: data.kpointDistances,
          bandEntries,
          weightMatrix: weights,
          energyShift,
          selection: { ...selection, energyMin, energyMax },
          signedColors:
            data.mode === "soc" && selection.socComponent !== "total" && data.hasMagnetization,
        });
        if (markerTrace) {
          traces.push(markerTrace);
        }
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

    elements.markerScale.addEventListener("input", () => {
      elements.markerScaleValue.textContent = elements.markerScale.value;
      renderPlot();
    });
  }

  bindEvents();
})();
