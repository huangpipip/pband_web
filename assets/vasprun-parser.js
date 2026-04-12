(function () {
  const EPSILON = 1e-8;
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

  function getText(node) {
    return node && typeof node.textContent === "string"
      ? node.textContent.trim()
      : "";
  }

  function toChildren(parent, tagName) {
    if (!parent) {
      return [];
    }
    return Array.from(parent.children || []).filter((child) => child.tagName === tagName);
  }

  function parseNumericRow(node) {
    return getText(node)
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => Number(part));
  }

  function parseBooleanFlag(doc, name) {
    const nodes = doc.querySelectorAll(`i[name="${name}"], v[name="${name}"]`);
    return Array.from(nodes).some((node) => {
      const value = getText(node).toUpperCase();
      return value === "T" || value === "TRUE" || value === "1";
    });
  }

  function parseSpinIndex(comment) {
    const match = /spin\s*(\d+)/i.exec(comment || "");
    return match ? Number(match[1]) : 1;
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

  function parseAtomInfo(doc) {
    const atomSet = doc.querySelector('atominfo > array[name="atoms"] > set');
    const atomRows = toChildren(atomSet, "rc");
    const atoms = atomRows.map((row, index) => {
      const cols = toChildren(row, "c").map(getText);
      return {
        index: index + 1,
        symbol: cols[0] || `Atom${index + 1}`,
        typeIndex: cols[1] ? Number(cols[1]) : null,
      };
    });

    const elements = Array.from(new Set(atoms.map((atom) => atom.symbol)));
    return { atoms, elements };
  }

  function parseBasis(doc) {
    const basisNode =
      doc.querySelector('structure[name="finalpos"] varray[name="basis"]') ||
      doc.querySelector('structure[name="initialpos"] varray[name="basis"]');

    if (!basisNode) {
      return null;
    }

    const rows = toChildren(basisNode, "v").map(parseNumericRow);
    return rows.length === 3 ? rows : null;
  }

  function invert3x3(matrix) {
    const [
      [a, b, c],
      [d, e, f],
      [g, h, i],
    ] = matrix;
    const A = e * i - f * h;
    const B = -(d * i - f * g);
    const C = d * h - e * g;
    const D = -(b * i - c * h);
    const E = a * i - c * g;
    const F = -(a * h - b * g);
    const G = b * f - c * e;
    const H = -(a * f - c * d);
    const I = a * e - b * d;
    const determinant = a * A + b * B + c * C;

    if (Math.abs(determinant) < EPSILON) {
      return null;
    }

    return [
      [A / determinant, D / determinant, G / determinant],
      [B / determinant, E / determinant, H / determinant],
      [C / determinant, F / determinant, I / determinant],
    ];
  }

  function transpose(matrix) {
    return matrix[0].map((_, column) => matrix.map((row) => row[column]));
  }

  function reciprocalBasis(directBasis) {
    const inverse = invert3x3(directBasis);
    return inverse ? transpose(inverse) : null;
  }

  function multiplyFractionalVector(vector, basis) {
    return [
      vector[0] * basis[0][0] + vector[1] * basis[1][0] + vector[2] * basis[2][0],
      vector[0] * basis[0][1] + vector[1] * basis[1][1] + vector[2] * basis[2][1],
      vector[0] * basis[0][2] + vector[1] * basis[1][2] + vector[2] * basis[2][2],
    ];
  }

  function norm(vector) {
    return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  }

  function samePoint(a, b) {
    return a.every((value, index) => Math.abs(value - b[index]) < EPSILON);
  }

  function median(values) {
    if (!values.length) {
      return 0;
    }
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
  }

  function buildKpath(kpoints, basis) {
    const reciprocal = basis ? reciprocalBasis(basis) : null;
    const stepNorms = [];

    for (let index = 1; index < kpoints.length; index += 1) {
      const delta = kpoints[index].map((value, axis) => value - kpoints[index - 1][axis]);
      const cartesianDelta = reciprocal ? multiplyFractionalVector(delta, reciprocal) : delta;
      const length = norm(cartesianDelta);
      stepNorms.push(length);
    }

    const positiveSteps = stepNorms.filter((value) => value > EPSILON);
    const typicalStep = median(positiveSteps);
    const jumpThreshold = typicalStep > EPSILON ? typicalStep * 3 : Number.POSITIVE_INFINITY;
    const jumpGap = typicalStep > EPSILON ? typicalStep * 0.35 : 0;
    const distances = [];
    const segments = [];
    let start = 0;

    for (let index = 0; index < kpoints.length; index += 1) {
      if (index === 0) {
        distances.push(0);
        continue;
      }

      const stepNorm = stepNorms[index - 1];
      if (samePoint(kpoints[index], kpoints[index - 1])) {
        segments.push({ start, end: index - 1 });
        start = index;
        distances.push(distances[index - 1]);
        continue;
      }

      if (stepNorm > jumpThreshold) {
        segments.push({ start, end: index - 1 });
        start = index;
        distances.push(distances[index - 1] + jumpGap);
        continue;
      }

      distances.push(distances[index - 1] + stepNorm);
    }

    if (kpoints.length > 0) {
      segments.push({ start, end: kpoints.length - 1 });
    }

    const boundaryPositions = segments.slice(1).map((segment) => distances[segment.start]);
    return { kpoints, distances, segments, boundaryPositions };
  }

  function parseKpoints(doc, basis) {
    const kpointNode = doc.querySelector('kpoints > varray[name="kpointlist"]');
    if (!kpointNode) {
      throw new Error("Unable to locate k-point path in vasprun.xml.");
    }

    const kpoints = toChildren(kpointNode, "v").map(parseNumericRow);
    return buildKpath(kpoints, basis);
  }

  function parseFermiEnergy(doc) {
    const values = Array.from(doc.querySelectorAll('i[name="efermi"]'))
      .map((node) => Number(getText(node)))
      .filter((value) => Number.isFinite(value));

    if (values.length === 0) {
      return 0;
    }

    return values[values.length - 1];
  }

  function parseEigenvalues(doc) {
    const nodes = doc.getElementsByTagName("eigenvalues");
    const node = nodes[nodes.length - 1];
    if (!node) {
      throw new Error("Unable to locate eigenvalue data in vasprun.xml.");
    }

    const arrayNode = node.querySelector("array");
    const rootSet = toChildren(arrayNode, "set")[0];
    const spinSets = toChildren(rootSet, "set");

    if (spinSets.length === 0) {
      throw new Error("Malformed eigenvalue section in vasprun.xml.");
    }

    const channels = {};
    spinSets.forEach((spinSet) => {
      const spinIndex = parseSpinIndex(spinSet.getAttribute("comment"));
      const kSets = toChildren(spinSet, "set");
      channels[spinIndex] = kSets.map((kSet) =>
        toChildren(kSet, "r").map((row) => {
          const [energy, occupation] = parseNumericRow(row);
          return { energy, occupation };
        }),
      );
    });

    if (channels[2]) {
      return {
        up: channels[1],
        down: channels[2],
      };
    }

    return {
      total: channels[1] || [],
    };
  }

  function parseProjected(doc) {
    const nodes = doc.getElementsByTagName("projected");
    const node = nodes[nodes.length - 1];
    if (!node) {
      return {
        orbitalNames: [],
        orbitalGroups: {},
        projections: {},
        magnetization: null,
      };
    }

    const arrayNode = toChildren(node, "array")[0];
    if (!arrayNode) {
      return {
        orbitalNames: [],
        orbitalGroups: {},
        projections: {},
        magnetization: null,
      };
    }
    const fields = toChildren(arrayNode, "field").map(getText);
    const rootSet = toChildren(arrayNode, "set")[0];
    if (!rootSet) {
      return {
        orbitalNames: fields,
        orbitalGroups: buildOrbitalGroups(fields),
        projections: {},
        magnetization: null,
      };
    }
    const spinSets = toChildren(rootSet, "set");
    const rawChannels = {};

    spinSets.forEach((spinSet) => {
      const spinIndex = parseSpinIndex(spinSet.getAttribute("comment"));
      rawChannels[spinIndex] = toChildren(spinSet, "set").map((kSet) =>
        toChildren(kSet, "set").map((bandSet) =>
          toChildren(bandSet, "r").map((row) => parseNumericRow(row)),
        ),
      );
    });

    const projections = {};
    let magnetization = null;

    if (Object.keys(rawChannels).length > 2) {
      projections.total = rawChannels[1] || [];
      magnetization = {
        mx: rawChannels[2] || [],
        my: rawChannels[3] || [],
        mz: rawChannels[4] || [],
      };
    } else if (rawChannels[2]) {
      projections.up = rawChannels[1] || [];
      projections.down = rawChannels[2] || [];
    } else {
      projections.total = rawChannels[1] || [];
    }

    const orbitalGroups = buildOrbitalGroups(fields);
    return {
      orbitalNames: fields,
      orbitalGroups,
      projections,
      magnetization,
    };
  }

  function classifyOrbital(name) {
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

  function buildOrbitalGroups(orbitalNames) {
    const groups = {};
    orbitalNames.forEach((name, index) => {
      const key = classifyOrbital(name);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(index);
    });
    return groups;
  }

  function energyBounds(bands) {
    let minimum = Number.POSITIVE_INFINITY;
    let maximum = Number.NEGATIVE_INFINITY;

    Object.values(bands).forEach((channel) => {
      channel.forEach((kpoint) => {
        kpoint.forEach((entry) => {
          minimum = Math.min(minimum, entry.energy);
          maximum = Math.max(maximum, entry.energy);
        });
      });
    });

    return {
      min: Number.isFinite(minimum) ? minimum : 0,
      max: Number.isFinite(maximum) ? maximum : 0,
    };
  }

  function detectMode(options) {
    if (options.hasSocSignals) {
      return "soc";
    }
    if (options.hasSpinDown) {
      return "collinear_spin";
    }
    return "nonspin";
  }

  function parse(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "application/xml");
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      throw new Error("The selected file is not valid XML.");
    }

    const { atoms, elements } = parseAtomInfo(doc);
    const basis = parseBasis(doc);
    const kpath = parseKpoints(doc, basis);
    const bands = parseEigenvalues(doc);
    const projected = parseProjected(doc);
    const fermiEnergy = parseFermiEnergy(doc);
    const bounds = energyBounds(bands);
    const hasSocSignals =
      Boolean(projected.magnetization) ||
      parseBooleanFlag(doc, "LSORBIT") ||
      parseBooleanFlag(doc, "LNONCOLLINEAR");
    const mode = detectMode({
      hasSocSignals,
      hasSpinDown: Boolean(bands.down || projected.projections.down),
    });

    const primaryBandChannel = bands.total || bands.up || [];
    const nbands = primaryBandChannel[0] ? primaryBandChannel[0].length : 0;
    const nkpoints = primaryBandChannel.length;

    return {
      atoms,
      elements,
      basis,
      orbitalNames: projected.orbitalNames,
      orbitalGroups: projected.orbitalGroups,
      projections: projected.projections,
      magnetization: projected.magnetization,
      hasProjection:
        Object.values(projected.projections).some((channel) => channel.length > 0),
      hasMagnetization: Boolean(projected.magnetization),
      mode,
      fermiEnergy,
      kpoints: kpath.kpoints,
      kpointDistances: kpath.distances,
      segments: kpath.segments,
      boundaryPositions: kpath.boundaryPositions,
      bands,
      energyRange: bounds,
      summary: {
        nkpoints,
        nbands,
        natoms: atoms.length,
        norbitals: projected.orbitalNames.length,
      },
    };
  }

  window.VasprunParser = {
    buildKpath,
    parse,
  };
})();
