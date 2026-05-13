const CONSTANTS = Object.freeze({
  c: 299792458,
  h: 6.62607015e-34,
  hbar: 1.0545718176461565e-34,
  e: 1.602176634e-19,
  twoPi: 2 * Math.PI,
});

const PREFIXES = Object.freeze([
  { symbol: "T", name: "tera", factor: 1e12 },
  { symbol: "G", name: "giga", factor: 1e9 },
  { symbol: "M", name: "mega", factor: 1e6 },
  { symbol: "k", name: "kilo", factor: 1e3 },
  { symbol: "", name: "base", factor: 1 },
  { symbol: "m", name: "milli", factor: 1e-3 },
  { symbol: "u", display: "µ", name: "micro", factor: 1e-6 },
  { symbol: "n", name: "nano", factor: 1e-9 },
  { symbol: "p", name: "pico", factor: 1e-12 },
  { symbol: "f", name: "femto", factor: 1e-15 },
  { symbol: "a", name: "atto", factor: 1e-18 },
]);

const PROPERTIES = Object.freeze({
  wavelength: {
    label: "Wavelength (λ)",
    baseUnit: "m",
    quantity: "length",
    symbol: "λ",
  },
  frequency: {
    label: "Frequency (ν)",
    baseUnit: "Hz",
    quantity: "frequency",
    symbol: "ν",
  },
  angularFrequency: {
    label: "Angular frequency (ω)",
    baseUnit: "rad/s",
    quantity: "angularFrequency",
    symbol: "ω",
  },
  wavenumber: {
    label: "Wavenumber (ν̃)",
    baseUnit: "m^-1",
    quantity: "inverseLength",
    symbol: "ν̃",
  },
  wavevector: {
    label: "Wavevector (k)",
    baseUnit: "rad/m",
    quantity: "inverseLength",
    symbol: "k",
  },
  energyJoule: {
    label: "Energy (E, joule)",
    baseUnit: "J",
    quantity: "energy",
    symbol: "E",
  },
  energyEv: {
    label: "Energy (E, electronvolt)",
    baseUnit: "eV",
    quantity: "energy",
    symbol: "E",
  },
});

function propertyOptions(excludedPropertyKey = null) {
  return Object.entries(PROPERTIES)
    .filter(([key]) => key !== excludedPropertyKey)
    .map(([key, property]) => ({ key, label: property.label }));
}

function prefixesFor(propertyKey) {
  if (propertyKey !== "wavelength" && propertyKey !== "wavenumber") return PREFIXES;
  return [
    { symbol: "T", name: "tera", factor: 1e12 },
    { symbol: "G", name: "giga", factor: 1e9 },
    { symbol: "M", name: "mega", factor: 1e6 },
    { symbol: "k", name: "kilo", factor: 1e3 },
    { symbol: "", name: "base", factor: 1 },
    { symbol: "c", name: "centi", factor: 1e-2 },
    { symbol: "m", name: "milli", factor: 1e-3 },
    { symbol: "u", display: "µ", name: "micro", factor: 1e-6 },
    { symbol: "n", name: "nano", factor: 1e-9 },
    { symbol: "p", name: "pico", factor: 1e-12 },
    { symbol: "f", name: "femto", factor: 1e-15 },
    { symbol: "a", name: "atto", factor: 1e-18 },
  ];
}

function prefixedUnits(propertyKey) {
  if (propertyKey === "angularFrequency" || propertyKey === "wavevector") {
    const baseUnit = PROPERTIES[propertyKey].baseUnit;
    return [{ label: baseUnit, value: baseUnit, factor: 1 }];
  }

  const baseUnit = PROPERTIES[propertyKey].baseUnit;
  if (propertyKey === "wavenumber") {
    return prefixesFor(propertyKey).map((prefix) => {
      const displayPrefix = prefix.display ?? prefix.symbol;
      const unit = `${displayPrefix}m^-1`;
      return { label: unit, value: unit, factor: 1 / prefix.factor };
    });
  }

  return prefixesFor(propertyKey).map((prefix) => {
    const displayPrefix = prefix.display ?? prefix.symbol;
    const unit = `${displayPrefix}${baseUnit}`;
    return { label: unit, value: unit, factor: prefix.factor };
  });
}

function unitMap() {
  const aliases = new Map();
  for (const key of Object.keys(PROPERTIES)) {
    for (const unit of prefixedUnits(key)) {
      aliases.set(unit.value, unit.factor);
      aliases.set(unit.value.replace("µ", "u"), unit.factor);
      aliases.set(unit.value.replace("u", "µ"), unit.factor);
    }
  }
  aliases.set("s^-1", 1);
  aliases.set("1/s", 1);
  aliases.set("/s", 1);
  return aliases;
}

const UNIT_ALIASES = unitMap();

function normalizeExpression(input) {
  return input
    .trim()
    .replace(/×/g, "*")
    .replace(/\s+/g, "")
    .replace(/(\d|\))x10\^/gi, "$1*10^")
    .replace(/\^([+-]?\d+(?:\.\d+)?)/g, "**($1)");
}

function safeEvaluateNumber(expression) {
  const normalized = normalizeExpression(expression);
  if (!normalized || !/^[0-9+\-*/().eE\s*]+$/.test(normalized)) {
    throw new Error("Enter a numeric value such as 1000, 1e3, or 1*10^-3.");
  }
  const value = Function(`"use strict"; return (${normalized});`)();
  if (!Number.isFinite(value)) {
    throw new Error("The numeric value must be finite.");
  }
  return value;
}

function parseValueInput(input, fallbackUnitFactor = 1) {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) {
    throw new Error("Enter a value to convert.");
  }

  if (/[A-DF-Za-df-zµ/]/.test(trimmed)) {
    throw new Error("Enter only the number in Value. Choose the unit from the Unit dropdown.");
  }

  return safeEvaluateNumber(trimmed) * fallbackUnitFactor;
}

function photonStateFromBase(propertyKey, baseValue, refractiveIndex) {
  const n = validateRefractiveIndex(refractiveIndex);
  let frequency;

  switch (propertyKey) {
    case "wavelength":
      frequency = CONSTANTS.c / (n * baseValue);
      break;
    case "frequency":
      frequency = baseValue;
      break;
    case "angularFrequency":
      frequency = baseValue / CONSTANTS.twoPi;
      break;
    case "wavenumber":
      frequency = (CONSTANTS.c * baseValue) / n;
      break;
    case "wavevector":
      frequency = (CONSTANTS.c * baseValue) / (n * CONSTANTS.twoPi);
      break;
    case "energyJoule":
      frequency = baseValue / CONSTANTS.h;
      break;
    case "energyEv":
      frequency = (baseValue * CONSTANTS.e) / CONSTANTS.h;
      break;
    default:
      throw new Error("Unsupported source property.");
  }

  if (!Number.isFinite(frequency) || frequency <= 0) {
    throw new Error("The converted frequency must be positive and finite.");
  }

  return {
    frequency,
    wavelength: CONSTANTS.c / (n * frequency),
    angularFrequency: CONSTANTS.twoPi * frequency,
    wavenumber: (n * frequency) / CONSTANTS.c,
    wavevector: (CONSTANTS.twoPi * n * frequency) / CONSTANTS.c,
    energyJoule: CONSTANTS.h * frequency,
    energyEv: (CONSTANTS.h * frequency) / CONSTANTS.e,
  };
}

function convert({ fromProperty, fromValue, fromUnitFactor, toProperty, toUnitFactor, refractiveIndex }) {
  const baseValue = parseValueInput(fromValue, fromUnitFactor);
  if (baseValue <= 0) {
    throw new Error("Value must be greater than zero.");
  }

  const state = photonStateFromBase(fromProperty, baseValue, refractiveIndex);
  const targetBaseValue = state[toProperty];
  return targetBaseValue / toUnitFactor;
}

function validateRefractiveIndex(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Refractive index must be a positive number.");
  }
  return n;
}

function equationFor(fromProperty, toProperty) {
  if (fromProperty === toProperty) {
    return `${PROPERTIES[toProperty].symbol} = ${PROPERTIES[fromProperty].symbol}`;
  }

  const sourceToFrequency = {
    wavelength: "ν = c / (nλ)",
    frequency: "ν = ν",
    angularFrequency: "ν = ω / 2π",
    wavenumber: "ν = cν̃ / n",
    wavevector: "ν = ck / (2πn)",
    energyJoule: "ν = E / h",
    energyEv: "ν = Ee / h",
  };

  const frequencyToTarget = {
    wavelength: "λ = c / (nν)",
    frequency: "ν = ν",
    angularFrequency: "ω = 2πν",
    wavenumber: "ν̃ = nν / c",
    wavevector: "k = 2πnν / c",
    energyJoule: "E = hν",
    energyEv: "E = hν / e",
  };

  const equations = [];
  if (fromProperty !== "frequency") equations.push(sourceToFrequency[fromProperty]);
  if (toProperty !== "frequency") equations.push(frequencyToTarget[toProperty]);
  return equations.join("; ");
}

function formatPlain(value) {
  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 15,
    useGrouping: false,
  }).format(value);
}

function formatMathScientific(value) {
  if (value === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const coefficient = value / 10 ** exponent;
  return `${formatPlain(coefficient)} × 10^${exponent}`;
}

function formatProgramming(value) {
  return value.toExponential(12).replace("e+", "e").replace("e", "e");
}

function conversionResult(options) {
  const value = convert(options);
  return {
    value,
    plain: formatPlain(value),
    scientific: formatMathScientific(value),
    programming: formatProgramming(value),
    equation: equationFor(options.fromProperty, options.toProperty),
  };
}

const api = {
  CONSTANTS,
  PREFIXES,
  PROPERTIES,
  propertyOptions,
  prefixesFor,
  prefixedUnits,
  parseValueInput,
  photonStateFromBase,
  convert,
  conversionResult,
  equationFor,
  formatPlain,
  formatMathScientific,
  formatProgramming,
};

if (typeof module !== "undefined") {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.OpticsConverter = api;
}
