/*
 * DOM layer: reads user input into the state (app-state.js), runs the
 * conversion (converter.js) and renders. Every change re-renders from state,
 * so the screen never drifts out of sync with what is being converted.
 */
(function () {
  "use strict";

  const core = window.OpticsConverter;
  const store = window.ConverterState;
  if (!core || !store) throw new Error("converter.js and app-state.js must load before ui.js");

  const $ = (id) => document.getElementById(id);
  const el = {
    form: $("converter"),
    fromQuantity: $("from-quantity"),
    fromValue: $("from-value"),
    fromUnit: $("from-unit"),
    fromSymbol: $("from-symbol"),
    fromHint: $("from-hint"),
    toQuantity: $("to-quantity"),
    toValue: $("to-value"),
    toUnit: $("to-unit"),
    toSymbol: $("to-symbol"),
    toHint: $("to-hint"),
    swap: $("swap"),
    index: $("refractive-index"),
    indexHint: $("index-hint"),
    presets: document.querySelectorAll("[data-index]"),
    region: $("region"),
    equation: $("equation"),
    formats: $("formats"),
    copyAll: $("copy-all"),
    equivalents: $("equivalents"),
    toast: $("toast"),
  };

  // Only the quantity/unit choices are remembered; the value always starts empty.
  const STORAGE_KEY = "photon-converter.sides.v3";
  const VALUE_HINT = "Type 1550, 1.55e3 or 1.55*10^3.";
  const INDEX_HINT = el.indexHint.textContent.trim();

  let state = store.createState(loadSaved());
  let latest = { ok: false };

  // ---------------------------------------------------------- utilities ---

  function loadSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") ?? {};
      return { from: saved.from, to: saved.to };
    } catch {
      return {};
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ from: state.from, to: state.to }));
    } catch {
      /* storage unavailable: the converter still works, it just won't remember */
    }
  }

  function make(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === "dataset") Object.assign(node.dataset, value);
      else if (key in node) node[key] = value;
      else node.setAttribute(key, value);
    }
    node.append(...children);
    return node;
  }

  /** "6.02 × 10^23" → nodes with a real superscript exponent. */
  function scientificNodes(text) {
    const match = /^(.*) × 10\^(-?\d+)$/.exec(text);
    if (!match) return [text];
    return [`${match[1]} × 10`, make("sup", { textContent: match[2].replace("-", "−") })];
  }

  /** Big readout: plain digits when readable, otherwise scientific. */
  function readoutNodes(result) {
    const abs = Math.abs(result.value);
    const readable = abs >= 1e-4 && abs < 1e10;
    return readable ? [result.plain] : scientificNodes(result.scientific);
  }

  let toastTimer = 0;
  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("is-visible"), 1400);
  }

  async function copy(text, label = "Copied") {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = make("textarea", { value: text, readOnly: true });
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    toast(label);
  }

  /** Nothing typed yet: show an empty, neutral form rather than an error. */
  function isEmpty() {
    return state.value.trim() === "";
  }

  // ------------------------------------------------------------ selects ---

  function fillQuantitySelect(select) {
    select.replaceChildren(
      ...core.quantityOptions().map((q) => make("option", { value: q.key, textContent: q.label })),
    );
  }

  function fillUnitSelect(select, quantityKey) {
    if (select.dataset.quantity === quantityKey) return; // already filled
    const units = core.unitsFor(quantityKey);
    const groups = [...new Set(units.map((u) => u.group))];
    const option = (u) => make("option", { value: u.id, textContent: u.label });
    select.replaceChildren(
      ...(groups.length > 1
        ? groups.map((g) =>
            make("optgroup", { label: g }, units.filter((u) => u.group === g).map(option)),
          )
        : units.map(option)),
    );
    select.dataset.quantity = quantityKey;
  }

  // ------------------------------------------------------------- render ---

  function renderSides() {
    for (const which of ["from", "to"]) {
      const s = state[which];
      const q = core.quantity(s.quantity);
      el[`${which}Quantity`].value = s.quantity;
      fillUnitSelect(el[`${which}Unit`], s.quantity);
      el[`${which}Unit`].value = s.unit;
      el[`${which}Symbol`].textContent = q.symbol;
    }
    if (el.fromValue.value !== state.value) el.fromValue.value = state.value;
    if (el.index.value !== state.refractiveIndex) el.index.value = state.refractiveIndex;
  }

  function renderValidity() {
    let indexError = null;
    try {
      core.parseRefractiveIndex(state.refractiveIndex);
    } catch (error) {
      indexError = error.message;
    }
    const valueError = latest.ok || indexError || isEmpty() ? null : latest.error;

    el.fromValue.setAttribute("aria-invalid", String(Boolean(valueError)));
    el.fromHint.textContent = valueError ?? VALUE_HINT;
    el.fromHint.classList.toggle("is-error", Boolean(valueError));

    el.index.setAttribute("aria-invalid", String(Boolean(indexError)));
    el.indexHint.textContent = indexError ?? INDEX_HINT;
    el.indexHint.classList.toggle("is-error", Boolean(indexError));

    for (const chip of el.presets) {
      chip.setAttribute("aria-pressed", String(Number(chip.dataset.index) === Number(state.refractiveIndex)));
    }
  }

  function renderReadout() {
    if (!latest.ok) {
      el.toValue.replaceChildren();
      el.toValue.removeAttribute("title");
      el.toHint.textContent = "";
      return;
    }
    const r = latest.result;
    el.toValue.replaceChildren(...readoutNodes(r));
    el.toValue.title = `${r.plain} ${r.targetUnit.label}`;
    const n = r.dependsOnIndex ? core.parseRefractiveIndex(state.refractiveIndex) : null;
    el.toHint.textContent = r.sameQuantity
      ? "Same quantity on both sides: ratio 1, only the unit changes."
      : !r.dependsOnIndex
        ? "Independent of the refractive index."
        : n === 1
          ? "In vacuum (n = 1)."
          : `Inside a medium with n = ${core.formatPlain(n)}.`;
  }

  function renderEquation() {
    if (!latest.ok) {
      const message = isEmpty() ? "Enter a value to see the working." : "Enter a valid value to see the working.";
      el.equation.replaceChildren(make("p", { className: "muted", textContent: message }));
      return;
    }
    const r = latest.result;
    const from = core.quantity(state.from.quantity);
    const to = core.quantity(state.to.quantity);
    const chip = (text, extra = "") => make("span", { className: `eq ${extra}`.trim(), textContent: text });
    const arrow = () => make("span", { className: "eq-arrow", textContent: "→", ariaHidden: "true" });

    const parts = [chip(`${from.symbol} = ${state.value.trim()} ${r.sourceUnit.label}`, "eq--io")];
    if (r.sameQuantity) {
      parts.push(arrow(), chip(`${to.symbol} = ${from.symbol}`));
    } else {
      for (const step of r.steps) parts.push(arrow(), chip(step));
    }
    parts.push(arrow(), chip(`${to.symbol} = ${r.plain} ${r.targetUnit.label}`, "eq--io"));

    const note = r.sameQuantity
      ? `Ratio 1 — 1 ${r.sourceUnit.label} = ${core.formatPlain(r.unitScale)} ${r.targetUnit.label}.`
      : null;

    el.equation.replaceChildren(make("div", { className: "eq-chain" }, parts));
    if (note) el.equation.append(make("p", { className: "muted", textContent: note }));
  }

  function formatRows() {
    if (!latest.ok) return [];
    const r = latest.result;
    const unit = r.targetUnit.label;
    return [
      { label: "Plain", text: `${r.plain} ${unit}`, nodes: [`${r.plain} ${unit}`] },
      { label: "Scientific", text: `${r.scientific} ${unit}`, nodes: [...scientificNodes(r.scientific), ` ${unit}`] },
      { label: "Programming", text: `${r.programming} ${unit}`, nodes: [`${r.programming} ${unit}`] },
    ];
  }

  function renderFormats() {
    const rows = formatRows();
    el.copyAll.disabled = rows.length === 0;
    el.formats.replaceChildren(
      ...rows.map((row) =>
        make("div", { className: "format" }, [
          make("dt", { textContent: row.label }),
          make("dd", {}, [
            make("code", {}, row.nodes),
            make("button", {
              type: "button",
              className: "btn btn--icon",
              textContent: "Copy",
              ariaLabel: `Copy ${row.label.toLowerCase()} value`,
              onclick: () => copy(row.text, `${row.label} value copied`),
            }),
          ]),
        ]),
      ),
    );
  }

  function renderRegion(photon) {
    if (!photon) {
      el.region.hidden = true;
      return;
    }
    const region = core.spectralRegion(photon.frequency);
    const parts = [];
    if (region.colour) parts.push(make("span", { className: "region__swatch", style: `background:${region.colour}` }));
    parts.push(make("span", { textContent: region.detail ? `${region.name} · ${region.detail}` : region.name }));
    el.region.replaceChildren(...parts);
    el.region.title = `Vacuum wavelength ${core.formatCompact(region.lambda * 1e9)} nm`;
    el.region.hidden = false;
  }

  function renderEquivalents(photon) {
    if (!photon) {
      el.equivalents.replaceChildren(
        make("p", {
          className: "muted",
          textContent: latest.ok
            ? "Enter a valid refractive index to list every quantity."
            : isEmpty()
              ? "Enter a value to list every quantity."
              : "Enter a valid value to list every quantity.",
        }),
      );
      return;
    }
    el.equivalents.replaceChildren(
      ...core.QUANTITY_KEYS.map((key) => {
        const q = core.quantity(key);
        const unit = core.autoUnit(key, photon[key]);
        const value = core.formatCompact(photon[key] / unit.factor);
        const isSource = key === state.from.quantity;
        const isTarget = key === state.to.quantity;
        const badge = isSource && isTarget ? "from & to" : isSource ? "from" : isTarget ? "to" : "";
        return make(
          "button",
          {
            type: "button",
            className: `tile${isTarget ? " is-target" : ""}${isSource ? " is-source" : ""}`,
            ariaPressed: String(isTarget),
            title: `Convert to ${q.label.toLowerCase()} in ${unit.label}`,
            onclick: () => update(store.setQuantity(state, "to", key, unit.id)),
          },
          [
            make("span", { className: "tile__head" }, [
              make("span", { className: "tile__symbol", textContent: q.symbol }),
              make("span", { className: "tile__name", textContent: q.label }),
              ...(badge ? [make("span", { className: "tile__badge", textContent: badge })] : []),
            ]),
            make("span", { className: "tile__value" }, [
              make("code", { textContent: value }),
              make("span", { className: "tile__unit", textContent: ` ${unit.label}` }),
            ]),
          ],
        );
      }),
    );
  }

  function render() {
    latest = store.evaluate(state);
    const photon = latest.ok ? latest.result.state : null;
    renderSides();
    renderValidity();
    renderReadout();
    renderEquation();
    renderFormats();
    renderRegion(photon);
    renderEquivalents(photon);
  }

  function update(next) {
    state = next;
    render();
    save();
  }

  // ------------------------------------------------------------- events ---

  function swapDirection() {
    update(store.swap(state));
    el.swap.classList.remove("is-spinning");
    void el.swap.offsetWidth; // restart the animation
    el.swap.classList.add("is-spinning");
  }

  el.fromQuantity.addEventListener("change", () => update(store.setQuantity(state, "from", el.fromQuantity.value)));
  el.toQuantity.addEventListener("change", () => update(store.setQuantity(state, "to", el.toQuantity.value)));
  el.fromUnit.addEventListener("change", () => update(store.setUnit(state, "from", el.fromUnit.value)));
  el.toUnit.addEventListener("change", () => update(store.setUnit(state, "to", el.toUnit.value)));
  el.fromValue.addEventListener("input", () => update(store.setValue(state, el.fromValue.value)));
  el.index.addEventListener("input", () => update(store.setRefractiveIndex(state, el.index.value)));
  el.swap.addEventListener("click", swapDirection);

  for (const chip of el.presets) {
    chip.addEventListener("click", () => update(store.setRefractiveIndex(state, chip.dataset.index)));
  }

  el.copyAll.addEventListener("click", () => {
    if (!latest.ok) return;
    const lines = [
      `${core.quantity(state.from.quantity).label}: ${state.value.trim()} ${latest.result.sourceUnit.label}`,
      `Equation: ${latest.result.equation}`,
      ...formatRows().map((row) => `${row.label}: ${row.text}`),
    ];
    copy(lines.join("\n"), "All formats copied");
  });

  el.form.addEventListener("submit", (event) => event.preventDefault());

  document.addEventListener("keydown", (event) => {
    if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "s") {
      event.preventDefault();
      swapDirection();
    }
  });

  // --------------------------------------------------------------- init ---

  fillQuantitySelect(el.fromQuantity);
  fillQuantitySelect(el.toQuantity);
  render();
})();
