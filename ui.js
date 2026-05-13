const form = document.querySelector("#converter-form");
const fromProperty = document.querySelector("#from-property");
const toProperty = document.querySelector("#to-property");
const fromValue = document.querySelector("#from-value");
const fromUnit = document.querySelector("#from-unit");
const toUnit = document.querySelector("#to-unit");
const refractiveIndex = document.querySelector("#refractive-index");
const resultOutput = document.querySelector("#result-output");
const copyButton = document.querySelector("#copy-result");
const calculateButton = document.querySelector("#calculate");

if (!window.OpticsConverter) {
  throw new Error("converter.js did not load");
}

const {
  PROPERTIES,
  prefixedUnits,
  conversionResult,
} = window.OpticsConverter;

let latestResultText = "";

function propertyChoices(excludedPropertyKey) {
  return Object.entries(PROPERTIES)
    .filter(([key]) => key !== excludedPropertyKey)
    .map(([key, property]) => ({ key, label: property.label }));
}

function fillPropertySelect(select, excludedPropertyKey, preferredPropertyKey) {
  const choices = propertyChoices(excludedPropertyKey);
  select.replaceChildren();

  for (const property of choices) {
    const option = document.createElement("option");
    option.value = property.key;
    option.textContent = property.label;
    select.append(option);
  }

  const allowedValues = choices.map((property) => property.key);
  select.value = allowedValues.includes(preferredPropertyKey)
    ? preferredPropertyKey
    : allowedValues[0];
}

function fillUnitSelect(select, propertyKey, preferredUnitValue = null) {
  const units = prefixedUnits(propertyKey);
  select.replaceChildren();

  for (const unit of units) {
    const option = document.createElement("option");
    option.value = unit.value;
    option.dataset.factor = String(unit.factor);
    option.textContent = unit.label;
    select.append(option);
  }

  const allowedValues = units.map((unit) => unit.value);
  select.value = allowedValues.includes(preferredUnitValue)
    ? preferredUnitValue
    : allowedValues[0];
}

function selectedUnit(select) {
  const option = select.selectedOptions[0];
  return {
    label: option?.value ?? "",
    factor: Number(option?.dataset.factor ?? 1),
  };
}

function refreshControls(changedSelect = null) {
  let nextFromProperty = fromProperty.value || "wavelength";
  let nextToProperty = toProperty.value || "frequency";

  if (nextFromProperty === nextToProperty) {
    if (changedSelect === fromProperty) {
      nextToProperty = propertyChoices(nextFromProperty)[0].key;
    } else {
      nextFromProperty = propertyChoices(nextToProperty)[0].key;
    }
  }

  const nextFromUnit = fromUnit.value || "km";
  const nextToUnit = toUnit.value || "THz";

  fillPropertySelect(fromProperty, nextToProperty, nextFromProperty);
  fillPropertySelect(toProperty, nextFromProperty, nextToProperty);
  fillUnitSelect(fromUnit, fromProperty.value, nextFromUnit);
  fillUnitSelect(toUnit, toProperty.value, nextToUnit);
}

function renderResult(result, unitLabel) {
  latestResultText = [
    `Equation: ${result.equation}`,
    `Plain: ${result.plain} ${unitLabel}`,
    `Scientific: ${result.scientific} ${unitLabel}`,
    `Programming: ${result.programming} ${unitLabel}`,
  ].join("\n");

  resultOutput.replaceChildren();

  const equation = document.createElement("div");
  equation.className = "equation";
  equation.textContent = result.equation;
  resultOutput.append(equation);

  const rows = [
    ["Plain number", `${result.plain} ${unitLabel}`],
    ["Scientific", `${result.scientific} ${unitLabel}`],
    ["Programming", `${result.programming} ${unitLabel}`],
  ];

  for (const [label, value] of rows) {
    const row = document.createElement("div");
    row.className = "result-line";

    const rowLabel = document.createElement("span");
    rowLabel.textContent = label;

    const code = document.createElement("code");
    code.textContent = value;

    row.append(rowLabel, code);
    resultOutput.append(row);
  }
}

function renderError(message) {
  latestResultText = "";
  resultOutput.replaceChildren();

  const error = document.createElement("span");
  error.className = "error";
  error.textContent = message;
  resultOutput.append(error);
}

function calculate() {
  try {
    const sourceUnit = selectedUnit(fromUnit);
    const targetUnit = selectedUnit(toUnit);
    const result = conversionResult({
      fromProperty: fromProperty.value,
      fromValue: fromValue.value,
      fromUnitFactor: sourceUnit.factor,
      toProperty: toProperty.value,
      toUnitFactor: targetUnit.factor,
      refractiveIndex: refractiveIndex.value,
    });

    renderResult(result, targetUnit.label);
  } catch (error) {
    renderError(error.message);
  }
}

fromProperty.addEventListener("change", () => refreshControls(fromProperty));
toProperty.addEventListener("change", () => refreshControls(toProperty));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  calculate();
});

calculateButton.addEventListener("click", (event) => {
  event.preventDefault();
  calculate();
});

copyButton.addEventListener("click", async () => {
  if (!latestResultText) return;
  await navigator.clipboard.writeText(latestResultText);
  copyButton.textContent = "Copied";
  setTimeout(() => {
    copyButton.textContent = "Copy";
  }, 1100);
});

fromProperty.value = "wavelength";
toProperty.value = "frequency";
refreshControls();
