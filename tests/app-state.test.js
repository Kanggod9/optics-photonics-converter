/* Run with `node tests/app-state.test.js`, or open tests/run.html in a browser. */
(function () {
  const inNode = typeof module !== "undefined" && module.exports;
  const store = inNode ? require("../app-state.js") : window.ConverterState;
  const { assert, test, report } = inNode ? require("./harness.js") : window.TestHarness;

  test("default state", () => {
    const s = store.createState();
    assert.deepEqual(s.from, { quantity: "wavelength", unit: "nm" });
    assert.deepEqual(s.to, { quantity: "frequency", unit: "THz" });
    assert.equal(s.value, "", "the value starts empty");
    assert.ok(!store.evaluate(s).ok, "no result until a value is entered");
  });

  test("both sides can pick any quantity, including the same one", () => {
    let s = store.createState({ value: "1550" });
    s = store.setQuantity(s, "to", "wavelength");
    assert.equal(s.from.quantity, "wavelength", "from is not forced to change");
    assert.equal(s.to.quantity, "wavelength");
    const out = store.evaluate(store.setUnit(s, "to", "µm"));
    assert.ok(out.ok);
    assert.equal(out.result.ratio, 1);
    assert.equal(out.result.plain, "1.55");
  });

  test("changing quantity picks that quantity's default unit", () => {
    const s = store.setQuantity(store.createState(), "from", "energy");
    assert.equal(s.from.unit, "eV");
    assert.equal(store.setQuantity(s, "to", "wavenumber").to.unit, "cm^-1");
  });

  test("swap reverses the direction and carries the result over", () => {
    const start = store.createState({ value: "500" });
    const swapped = store.swap(start);
    assert.deepEqual(swapped.from, { quantity: "frequency", unit: "THz" });
    assert.deepEqual(swapped.to, { quantity: "wavelength", unit: "nm" });
    assert.equal(swapped.value, "599.584916");
    assert.equal(store.evaluate(swapped).result.plain, "500");
    const back = store.swap(swapped);
    assert.deepEqual(back.from, start.from);
    assert.equal(back.value, "500");
  });

  test("swap with an invalid value keeps the typed text", () => {
    const s = store.swap(store.createState({ value: "abc" }));
    assert.equal(s.value, "abc");
    assert.equal(s.from.quantity, "frequency");
  });

  test("normalize repairs a stale saved state", () => {
    const s = store.normalize({ from: { quantity: "energyEv", unit: "eV" }, to: { quantity: "wavelength", unit: "bogus" } });
    assert.deepEqual(s.from, { quantity: "wavelength", unit: "nm" });
    assert.deepEqual(s.to, { quantity: "wavelength", unit: "nm" });
  });

  report("app-state");
})();
