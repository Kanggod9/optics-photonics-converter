/*
 * Optics & photonics conversion core.
 *
 * Pure functions only (no DOM). Every quantity is described once in QUANTITIES
 * with a pair of functions that map it to and from optical frequency ν, which
 * acts as the hub: any quantity → ν → any other quantity. Choosing the same
 * quantity on both sides is an identity conversion (ratio 1), so only the unit
 * scaling applies and the refractive index plays no part.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.OpticsConverter = api;
  else if (root) root.OpticsConverter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CONSTANTS = Object.freeze({
    c: 299792458, // speed of light in vacuum, m/s (exact)
    h: 6.62607015e-34, // Planck constant, J·s (exact)
    e: 1.602176634e-19, // elementary charge, C (exact)
    twoPi: 2 * Math.PI,
  });

  // ---------------------------------------------------------------- units ---

  /** SI prefixes, largest first. `engineering` marks powers of 1000. */
  const PREFIXES = Object.freeze([
    { id: "P", label: "P", name: "peta", factor: 1e15, engineering: true },
    { id: "T", label: "T", name: "tera", factor: 1e12, engineering: true },
    { id: "G", label: "G", name: "giga", factor: 1e9, engineering: true },
    { id: "M", label: "M", name: "mega", factor: 1e6, engineering: true },
    { id: "k", label: "k", name: "kilo", factor: 1e3, engineering: true },
    { id: "", label: "", name: "", factor: 1, engineering: true },
    { id: "c", label: "c", name: "centi", factor: 1e-2, engineering: false },
    { id: "m", label: "m", name: "milli", factor: 1e-3, engineering: true },
    { id: "µ", label: "µ", name: "micro", factor: 1e-6, engineering: true },
    { id: "n", label: "n", name: "nano", factor: 1e-9, engineering: true },
    { id: "p", label: "p", name: "pico", factor: 1e-12, engineering: true },
    { id: "f", label: "f", name: "femto", factor: 1e-15, engineering: true },
    { id: "a", label: "a", name: "atto", factor: 1e-18, engineering: true },
  ]);

  function pickPrefixes({ min = "a", max = "T", centi = false } = {}) {
    const start = PREFIXES.findIndex((p) => p.id === max);
    const end = PREFIXES.findIndex((p) => p.id === min);
    return PREFIXES.slice(start, end + 1).filter((p) => centi || p.id !== "c");
  }

  /**
   * Build a unit family.
   *  - "direct":  unit = prefix·base       (km, THz, meV …)
   *  - "inverse": unit = numerator/(prefix·m)  (cm⁻¹, rad/µm …)
   * `factor` converts a value in this unit into the quantity's SI base unit.
   */
  function unitFamily({ kind = "direct", base, idFor, labelFor, scale = 1, group, ...range }) {
    return pickPrefixes(range).map((prefix) => ({
      id: idFor(prefix.id),
      label: labelFor(prefix.label),
      factor: kind === "inverse" ? scale / prefix.factor : scale * prefix.factor,
      engineering: prefix.engineering,
      group: group ?? base,
    }));
  }

  const direct = (base, extra = {}) =>
    unitFamily({ base, idFor: (p) => p + base, labelFor: (p) => p + base, ...extra });

  // ----------------------------------------------------------- quantities ---

  const { c, h, e, twoPi } = CONSTANTS;

  /**
   * Each quantity converts to/from frequency ν (Hz) given the refractive index
   * n. λ, ν̃ and k are the values inside the medium; ν, ω and E are not affected
   * by n.
   */
  const QUANTITIES = Object.freeze({
    wavelength: {
      label: "Wavelength",
      symbol: "λ",
      defaultUnit: "nm",
      dependsOnIndex: true,
      units: direct("m", { centi: true }),
      toFrequency: (x, n) => c / (n * x),
      fromFrequency: (nu, n) => c / (n * nu),
      toFrequencyEq: "ν = c / (nλ)",
      fromFrequencyEq: "λ = c / (nν)",
    },
    frequency: {
      label: "Frequency",
      symbol: "ν",
      defaultUnit: "THz",
      dependsOnIndex: false,
      units: direct("Hz", { max: "P" }),
      toFrequency: (x) => x,
      fromFrequency: (nu) => nu,
      toFrequencyEq: "",
      fromFrequencyEq: "",
    },
    angularFrequency: {
      label: "Angular frequency",
      symbol: "ω",
      defaultUnit: "Trad/s",
      dependsOnIndex: false,
      units: unitFamily({
        base: "rad/s",
        max: "P",
        idFor: (p) => `${p}rad/s`,
        labelFor: (p) => `${p}rad/s`,
      }),
      toFrequency: (x) => x / twoPi,
      fromFrequency: (nu) => twoPi * nu,
      toFrequencyEq: "ν = ω / 2π",
      fromFrequencyEq: "ω = 2πν",
    },
    wavenumber: {
      label: "Wavenumber",
      symbol: "ν̃",
      defaultUnit: "cm^-1",
      displayUnit: "cm^-1", // spectroscopists always quote cm⁻¹
      dependsOnIndex: true,
      units: unitFamily({
        kind: "inverse",
        base: "m^-1",
        centi: true,
        idFor: (p) => `${p}m^-1`,
        labelFor: (p) => `${p}m⁻¹`,
      }),
      toFrequency: (x, n) => (c * x) / n,
      fromFrequency: (nu, n) => (n * nu) / c,
      toFrequencyEq: "ν = cν̃ / n",
      fromFrequencyEq: "ν̃ = nν / c",
    },
    wavevector: {
      label: "Wavevector",
      symbol: "k",
      defaultUnit: "rad/µm",
      dependsOnIndex: true,
      units: unitFamily({
        kind: "inverse",
        base: "rad/m",
        centi: true,
        idFor: (p) => `rad/${p}m`,
        labelFor: (p) => `rad/${p}m`,
      }),
      toFrequency: (x, n) => (c * x) / (n * twoPi),
      fromFrequency: (nu, n) => (twoPi * n * nu) / c,
      toFrequencyEq: "ν = ck / (2πn)",
      fromFrequencyEq: "k = 2πnν / c",
    },
    energy: {
      label: "Photon energy",
      symbol: "E",
      defaultUnit: "eV",
      displayGroup: "Electronvolt",
      dependsOnIndex: false,
      units: [
        ...direct("eV", { scale: e, group: "Electronvolt" }),
        ...direct("J", { group: "Joule" }),
      ],
      toFrequency: (x) => x / h,
      fromFrequency: (nu) => h * nu,
      toFrequencyEq: "ν = E / h",
      fromFrequencyEq: "E = hν",
    },
  });

  const QUANTITY_KEYS = Object.freeze(Object.keys(QUANTITIES));

  function quantity(key) {
    const q = QUANTITIES[key];
    if (!q) throw new Error(`Unknown quantity "${key}".`);
    return q;
  }

  function quantityOptions() {
    return QUANTITY_KEYS.map((key) => ({
      key,
      label: `${QUANTITIES[key].label} (${QUANTITIES[key].symbol})`,
      symbol: QUANTITIES[key].symbol,
    }));
  }

  function unitsFor(key) {
    return quantity(key).units;
  }

  /** Find a unit by id; accepts "u" as an ASCII alias for "µ". */
  function findUnit(key, unitId) {
    const units = unitsFor(key);
    const wanted = String(unitId ?? "").replace(/^u|(?<=\/)u/, "µ");
    return units.find((u) => u.id === unitId || u.id === wanted) ?? null;
  }

  function resolveUnit(key, unitId) {
    return findUnit(key, unitId) ?? findUnit(key, quantity(key).defaultUnit);
  }

  // -------------------------------------------------------------- parsing ---

  function normalizeExpression(input) {
    return input
      .trim()
      .replace(/[×·]/g, "*")
      .replace(/−/g, "-")
      .replace(/\s+/g, "")
      .replace(/(\d|\))x10\^/gi, "$1*10^")
      .replace(/\^\(?([+-]?\d+(?:\.\d+)?)\)?/g, "**($1)");
  }

  /** Evaluate a plain arithmetic expression such as "1.55e3" or "3*10^8". */
  function parseNumber(input) {
    const trimmed = String(input ?? "").trim();
    if (!trimmed) throw new Error("Enter a value to convert.");
    const withoutTimes = trimmed.replace(/(\d|\))\s*x\s*10\s*\^/gi, "$1*10^");
    if (/[A-DF-Za-df-zµ]/.test(withoutTimes)) {
      throw new Error("Enter only a number here — pick the unit from the unit menu.");
    }
    const expression = normalizeExpression(trimmed);
    if (!/^[0-9+\-*/().eE]+$/.test(expression)) {
      throw new Error("Enter a number such as 1550, 1.55e3 or 1.55*10^3.");
    }
    let value;
    try {
      value = Function(`"use strict"; return (${expression});`)();
    } catch {
      throw new Error("That expression could not be read. Try 1550, 1.55e3 or 1.55*10^3.");
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("The value must be a finite number.");
    }
    return value;
  }

  function parseRefractiveIndex(value) {
    const n = typeof value === "number" ? value : parseNumber(value);
    if (!Number.isFinite(n) || n <= 0) throw new Error("Refractive index must be a positive number.");
    return n;
  }

  // ----------------------------------------------------------- conversion ---

  /** All quantities (SI base units) for a photon of frequency ν in index n. */
  function photonState(frequency, n) {
    const state = {};
    for (const key of QUANTITY_KEYS) state[key] = QUANTITIES[key].fromFrequency(frequency, n);
    return state;
  }

  /** The equations applied, in order, for a from → to conversion. */
  function equationSteps(fromKey, toKey) {
    if (fromKey === toKey) return [];
    return [quantity(fromKey).toFrequencyEq, quantity(toKey).fromFrequencyEq].filter(Boolean);
  }

  function equationFor(fromKey, toKey) {
    if (fromKey === toKey) {
      const s = quantity(fromKey).symbol;
      return `${s} = ${s} (same quantity, ratio 1)`;
    }
    return equationSteps(fromKey, toKey).join("; ");
  }

  /**
   * Convert between any two quantities.
   * @param {object} o
   * @param {string} o.from        quantity key
   * @param {string} o.to          quantity key
   * @param {number|string} o.value  number or numeric expression, in o.fromUnit
   * @param {string} o.fromUnit    unit id (defaults to the quantity's default)
   * @param {string} o.toUnit      unit id
   * @param {number|string} [o.refractiveIndex=1]
   */
  function convert({ from, to, value, fromUnit, toUnit, refractiveIndex = 1 }) {
    const source = quantity(from);
    const target = quantity(to);
    const sourceUnit = resolveUnit(from, fromUnit);
    const targetUnit = resolveUnit(to, toUnit);

    const input = typeof value === "number" ? value : parseNumber(value);
    if (!(input > 0)) throw new Error("Value must be greater than zero.");
    const sourceBase = input * sourceUnit.factor;

    const sameQuantity = from === to;
    let state = null;
    let targetBase;

    if (sameQuantity) {
      targetBase = sourceBase; // identity: ratio 1, only the unit changes
      try {
        const n = parseRefractiveIndex(refractiveIndex);
        state = photonState(source.toFrequency(sourceBase, n), n);
        state[from] = sourceBase; // keep the exact input, no round trip
      } catch {
        state = null; // the index does not matter for an identity conversion
      }
    } else {
      const n = parseRefractiveIndex(refractiveIndex);
      const frequency = source.toFrequency(sourceBase, n);
      if (!Number.isFinite(frequency) || frequency <= 0) {
        throw new Error("The value is outside the range that can be converted.");
      }
      state = photonState(frequency, n);
      state[from] = sourceBase;
      targetBase = state[to];
    }

    const result = targetBase / targetUnit.factor;
    if (!Number.isFinite(result)) throw new Error("The result is outside the representable range.");

    return {
      value: result,
      sameQuantity,
      ratio: sameQuantity ? 1 : null,
      unitScale: sameQuantity ? sourceUnit.factor / targetUnit.factor : null,
      sourceUnit,
      targetUnit,
      state,
      equation: equationFor(from, to),
      steps: equationSteps(from, to),
      dependsOnIndex: !sameQuantity && (source.dependsOnIndex || target.dependsOnIndex),
    };
  }

  // ----------------------------------------------------------- formatting ---

  const SIGNIFICANT_DIGITS = 15;

  function splitExponential(value, digits = SIGNIFICANT_DIGITS) {
    const [mantissa, exponent] = value.toExponential(digits - 1).split("e");
    const trimmed = mantissa.includes(".") ? mantissa.replace(/\.?0+$/, "") : mantissa;
    return { mantissa: trimmed, exponent: Number(exponent) };
  }

  function formatPlain(value) {
    return new Intl.NumberFormat("en-US", {
      maximumSignificantDigits: SIGNIFICANT_DIGITS,
      useGrouping: false,
    }).format(value);
  }

  function formatScientific(value) {
    if (value === 0) return "0";
    const { mantissa, exponent } = splitExponential(value);
    return exponent === 0 ? mantissa : `${mantissa} × 10^${exponent}`;
  }

  function formatProgramming(value) {
    if (value === 0) return "0";
    const { mantissa, exponent } = splitExponential(value);
    return `${mantissa}e${exponent}`;
  }

  /** Short human-friendly form, e.g. "1550.00" → "1550", 4 significant digits. */
  function formatCompact(value, digits = 6) {
    if (value === 0) return "0";
    const abs = Math.abs(value);
    if (abs >= 1e-3 && abs < 1e9) {
      return new Intl.NumberFormat("en-US", {
        maximumSignificantDigits: digits,
        useGrouping: false,
      }).format(value);
    }
    const { mantissa, exponent } = splitExponential(value, digits);
    return `${mantissa}e${exponent}`;
  }

  function formatAll(value) {
    return {
      plain: formatPlain(value),
      scientific: formatScientific(value),
      programming: formatProgramming(value),
    };
  }

  /** convert() plus every display format. */
  function conversionResult(options) {
    const result = convert(options);
    return { ...result, ...formatAll(result.value) };
  }

  /**
   * Pick a readable unit for a base-unit value: the engineering prefix that
   * puts the number in [1, 1000), honouring a quantity's preferred unit.
   */
  function autoUnit(key, baseValue) {
    const q = quantity(key);
    if (q.displayUnit) return findUnit(key, q.displayUnit);
    const candidates = q.units.filter(
      (u) => u.engineering && (!q.displayGroup || u.group === q.displayGroup),
    );
    let best = candidates[0];
    let bestScore = Infinity;
    for (const unit of candidates) {
      const x = Math.abs(baseValue / unit.factor);
      const score = x >= 1 && x < 1000 ? 0 : Math.abs(Math.log10(x) - 1.5);
      if (score < bestScore) {
        best = unit;
        bestScore = score;
      }
    }
    return best;
  }

  // ------------------------------------------------------ spectral region ---

  const TELECOM_BANDS = [
    [1260e-9, 1360e-9, "O-band"],
    [1360e-9, 1460e-9, "E-band"],
    [1460e-9, 1530e-9, "S-band"],
    [1530e-9, 1565e-9, "C-band"],
    [1565e-9, 1625e-9, "L-band"],
    [1625e-9, 1675e-9, "U-band"],
  ];

  const VISIBLE_COLOURS = [
    [380e-9, 450e-9, "violet"],
    [450e-9, 485e-9, "blue"],
    [485e-9, 500e-9, "cyan"],
    [500e-9, 565e-9, "green"],
    [565e-9, 590e-9, "yellow"],
    [590e-9, 625e-9, "orange"],
    [625e-9, 750e-9, "red"],
  ];

  function inRange(table, x) {
    const hit = table.find(([lo, hi]) => x >= lo && x < hi);
    return hit ? hit[2] : null;
  }

  /** Approximate sRGB colour of visible light (vacuum wavelength in m). */
  function visibleColour(lambda) {
    const nm = lambda * 1e9;
    if (nm < 380 || nm > 750) return null;
    let r = 0;
    let g = 0;
    let b = 0;
    if (nm < 440) [r, g, b] = [-(nm - 440) / 60, 0, 1];
    else if (nm < 490) [r, g, b] = [0, (nm - 440) / 50, 1];
    else if (nm < 510) [r, g, b] = [0, 1, -(nm - 510) / 20];
    else if (nm < 580) [r, g, b] = [(nm - 510) / 70, 1, 0];
    else if (nm < 645) [r, g, b] = [1, -(nm - 645) / 65, 0];
    else [r, g, b] = [1, 0, 0];
    const fade = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (750 - nm)) / 50 : 1;
    const channel = (v) => Math.round(255 * Math.pow(v * fade, 0.8));
    return `rgb(${channel(r)}, ${channel(g)}, ${channel(b)})`;
  }

  /** Name the part of the spectrum a photon of frequency ν belongs to. */
  function spectralRegion(frequency) {
    const lambda = c / frequency; // vacuum wavelength
    const colour = inRange(VISIBLE_COLOURS, lambda);
    if (colour) return { name: "Visible", detail: colour, colour: visibleColour(lambda), lambda };
    const band = inRange(TELECOM_BANDS, lambda);
    if (band) return { name: "Near-infrared", detail: `telecom ${band}`, colour: null, lambda };
    const regions = [
      [0, 1e-11, "Gamma rays"],
      [1e-11, 1e-8, "X-rays"],
      [1e-8, 200e-9, "Extreme / vacuum UV"],
      [200e-9, 280e-9, "Ultraviolet", "UV-C"],
      [280e-9, 315e-9, "Ultraviolet", "UV-B"],
      [315e-9, 380e-9, "Ultraviolet", "UV-A"],
      [750e-9, 1.4e-6, "Near-infrared"],
      [1.4e-6, 3e-6, "Short-wave infrared"],
      [3e-6, 8e-6, "Mid-infrared"],
      [8e-6, 15e-6, "Long-wave infrared"],
      [15e-6, 1e-3, "Far-infrared / terahertz"],
      [1e-3, 1, "Microwave"],
      [1, Infinity, "Radio"],
    ];
    const hit = regions.find(([lo, hi]) => lambda >= lo && lambda < hi) ?? regions.at(-1);
    return { name: hit[2], detail: hit[3] ?? null, colour: null, lambda };
  }

  return Object.freeze({
    CONSTANTS,
    PREFIXES,
    QUANTITIES,
    QUANTITY_KEYS,
    quantity,
    quantityOptions,
    unitsFor,
    findUnit,
    resolveUnit,
    parseNumber,
    parseRefractiveIndex,
    photonState,
    equationSteps,
    equationFor,
    convert,
    conversionResult,
    formatPlain,
    formatScientific,
    formatProgramming,
    formatCompact,
    formatAll,
    autoUnit,
    spectralRegion,
  });
});
