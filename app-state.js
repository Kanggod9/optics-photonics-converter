/*
 * Converter state and the transitions the UI can make. Pure functions that
 * return new state objects, so they can be unit-tested without a DOM.
 *
 * state = {
 *   from:  { quantity, unit },
 *   to:    { quantity, unit },
 *   value: "",                // raw text typed by the user (source side); empty on start
 *   refractiveIndex: "1",     // raw text
 * }
 */
(function (root, factory) {
  const core =
    typeof module !== "undefined" && module.exports
      ? require("./converter.js")
      : root.OpticsConverter;
  const api = factory(core);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.ConverterState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (core) {
  "use strict";

  if (!core) throw new Error("converter.js must load before app-state.js");

  const DEFAULT_STATE = Object.freeze({
    from: Object.freeze({ quantity: "wavelength", unit: "nm" }),
    to: Object.freeze({ quantity: "frequency", unit: "THz" }),
    value: "",
    refractiveIndex: "1",
  });

  function side(quantity, unit) {
    const unitId = core.findUnit(quantity, unit)?.id ?? core.quantity(quantity).defaultUnit;
    return { quantity, unit: unitId };
  }

  /** Repair anything invalid (e.g. a stale saved state) against the registry. */
  function normalize(state = {}) {
    const pick = (s, fallback) =>
      s && core.QUANTITIES[s.quantity] ? side(s.quantity, s.unit) : { ...fallback };
    return {
      from: pick(state.from, DEFAULT_STATE.from),
      to: pick(state.to, DEFAULT_STATE.to),
      value: typeof state.value === "string" ? state.value : DEFAULT_STATE.value,
      refractiveIndex:
        typeof state.refractiveIndex === "string" ? state.refractiveIndex : DEFAULT_STATE.refractiveIndex,
    };
  }

  function createState(overrides = {}) {
    return normalize({ ...DEFAULT_STATE, ...overrides });
  }

  /**
   * Change the quantity on one side. Any quantity is allowed on either side,
   * including the same one on both (an identity conversion, ratio 1). The unit
   * resets to that quantity's default unless `unit` is given.
   */
  function setQuantity(state, which, quantity, unit = null) {
    if (which !== "from" && which !== "to") throw new Error(`Unknown side "${which}".`);
    const current = state[which];
    const nextUnit = unit ?? (current.quantity === quantity ? current.unit : null);
    return { ...state, [which]: side(quantity, nextUnit) };
  }

  function setUnit(state, which, unit) {
    return { ...state, [which]: side(state[which].quantity, unit) };
  }

  function setValue(state, value) {
    return { ...state, value: String(value) };
  }

  function setRefractiveIndex(state, refractiveIndex) {
    return { ...state, refractiveIndex: String(refractiveIndex) };
  }

  /** Run the conversion for a state; never throws. */
  function evaluate(state) {
    try {
      const result = core.conversionResult({
        from: state.from.quantity,
        to: state.to.quantity,
        value: state.value,
        fromUnit: state.from.unit,
        toUnit: state.to.unit,
        refractiveIndex: state.refractiveIndex,
      });
      return { ok: true, result };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  /**
   * Reverse the conversion direction: the target becomes the source and vice
   * versa. When the current conversion is valid its result becomes the new
   * input, so converting back reproduces the original value.
   */
  function swap(state) {
    const outcome = evaluate(state);
    return {
      ...state,
      from: { ...state.to },
      to: { ...state.from },
      value: outcome.ok ? outcome.result.plain : state.value,
    };
  }

  return Object.freeze({
    DEFAULT_STATE,
    createState,
    normalize,
    setQuantity,
    setUnit,
    setValue,
    setRefractiveIndex,
    evaluate,
    swap,
  });
});
