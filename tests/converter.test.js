/* Run with `node tests/converter.test.js`, or open tests/run.html in a browser. */
(function () {
  const inNode = typeof module !== "undefined" && module.exports;
  const core = inNode ? require("../converter.js") : window.OpticsConverter;
  const { assert, test, report } = inNode ? require("./harness.js") : window.TestHarness;
  const { CONSTANTS, conversionResult, convert, unitsFor, findUnit, parseNumber } = core;

  const ids = (key) => unitsFor(key).map((u) => u.id);
  const run = (from, value, fromUnit, to, toUnit, refractiveIndex = 1) =>
    conversionResult({ from, to, value, fromUnit, toUnit, refractiveIndex });

  test("parses plain numbers and expressions", () => {
    assert.equal(parseNumber("1000"), 1000);
    assert.closeTo(parseNumber("1e6"), 1e6);
    assert.closeTo(parseNumber("1*10^-3"), 1e-3);
    assert.closeTo(parseNumber("1.55 × 10^3"), 1550);
    assert.closeTo(parseNumber("1.55x10^3"), 1550);
    assert.closeTo(parseNumber("2^(10)"), 1024);
  });

  test("rejects units and junk in the value", () => {
    assert.throws(() => parseNumber("1 km"), /only a number/);
    assert.throws(() => parseNumber(""), /Enter a value/);
    assert.throws(() => parseNumber("1+*"), /could not be read/);
    assert.throws(() => convert({ from: "wavelength", to: "frequency", value: "-5" }), /greater than zero/);
  });

  test("unit factors", () => {
    assert.closeTo(findUnit("wavelength", "km").factor, 1e3);
    assert.closeTo(findUnit("wavelength", "um").factor, 1e-6, 1e-12, "u is an alias for µ");
    assert.closeTo(findUnit("wavenumber", "cm^-1").factor, 100);
    assert.closeTo(findUnit("wavevector", "rad/um").factor, 1e6);
    assert.closeTo(findUnit("energy", "meV").factor, 1e-3 * CONSTANTS.e);
    assert.closeTo(findUnit("energy", "J").factor, 1);
  });

  test("unit lists", () => {
    assert.deepEqual(ids("wavelength"), ["Tm", "Gm", "Mm", "km", "m", "cm", "mm", "µm", "nm", "pm", "fm", "am"]);
    assert.deepEqual(ids("frequency"), ["PHz", "THz", "GHz", "MHz", "kHz", "Hz", "mHz", "µHz", "nHz", "pHz", "fHz", "aHz"]);
    assert.ok(ids("wavenumber").includes("cm^-1"));
    assert.ok(ids("wavevector").includes("rad/µm"));
    assert.ok(ids("angularFrequency").includes("rad/s"));
    assert.ok(ids("energy").includes("eV") && ids("energy").includes("J") && ids("energy").includes("meV"));
    assert.ok(!ids("frequency").includes("cHz"), "no centi prefix for Hz");
    assert.ok(!ids("energy").includes("ceV"), "no centi prefix for eV");
  });

  test("500 nm → THz", () => {
    const r = run("wavelength", "500", "nm", "frequency", "THz");
    assert.closeTo(r.value, 599.584916);
    assert.equal(r.equation, "ν = c / (nλ)");
  });

  test("100 THz → J", () => {
    const r = run("frequency", "100", "THz", "energy", "J");
    assert.closeTo(r.value, CONSTANTS.h * 100e12);
    assert.equal(r.equation, "E = hν");
  });

  test("2 eV → nm", () => {
    assert.closeTo(run("energy", "2", "eV", "wavelength", "nm").value, 619.9209921660013);
  });

  test("1550 nm → eV", () => {
    assert.closeTo(run("wavelength", "1550", "nm", "energy", "eV").value, 1239.841984 / 1550, 1e-8);
  });

  test("wavenumber → wavevector is ×2π", () => {
    const r = run("wavenumber", "1000", "m^-1", "wavevector", "rad/m");
    assert.closeTo(r.value, 2 * Math.PI * 1000);
    assert.equal(r.equation, "ν = cν̃ / n; k = 2πnν / c");
  });

  test("refractive index shortens the wavelength", () => {
    const r = run("frequency", "200", "THz", "wavelength", "nm", 1.5);
    assert.closeTo(r.value, CONSTANTS.c / (1.5 * 200e12) / 1e-9);
    assert.ok(r.dependsOnIndex);
  });

  test("index does not affect ν ↔ E", () => {
    const a = run("frequency", "200", "THz", "energy", "eV", 1);
    const b = run("frequency", "200", "THz", "energy", "eV", 3.476);
    assert.closeTo(a.value, b.value);
    assert.ok(!a.dependsOnIndex);
  });

  test("same quantity is ratio 1: only units change", () => {
    const r = run("wavelength", "1550", "nm", "wavelength", "µm", 1.5);
    assert.ok(r.sameQuantity);
    assert.equal(r.ratio, 1);
    assert.closeTo(r.value, 1.55);
    assert.closeTo(r.unitScale, 1e-3);
    assert.equal(r.equation, "λ = λ (same quantity, ratio 1)");
    assert.equal(run("frequency", "193.4", "THz", "frequency", "THz").value, 193.4, "exact identity");
    assert.closeTo(run("energy", "1", "eV", "energy", "J").value, CONSTANTS.e, 1e-15);
  });

  test("same quantity ignores an invalid refractive index", () => {
    const r = run("frequency", "1", "THz", "frequency", "GHz", "oops");
    assert.closeTo(r.value, 1000);
    assert.equal(r.state, null);
    assert.throws(() => run("frequency", "1", "THz", "wavelength", "nm", "0"), /Refractive index/);
  });

  test("every pair converts and round-trips", () => {
    for (const from of core.QUANTITY_KEYS) {
      for (const to of core.QUANTITY_KEYS) {
        const fromUnit = core.quantity(from).defaultUnit;
        const toUnit = core.quantity(to).defaultUnit;
        const forward = run(from, "1.234", fromUnit, to, toUnit, 1.33);
        assert.ok(Number.isFinite(forward.value), `${from} → ${to} finite`);
        assert.ok(forward.equation.length > 0, `${from} → ${to} has an equation`);
        const back = run(to, forward.plain, toUnit, from, fromUnit, 1.33);
        assert.closeTo(back.value, 1.234, 1e-12, `${from} → ${to} → ${from} round trip`);
      }
    }
  });

  test("formats", () => {
    assert.equal(core.formatScientific(599.584916), "5.99584916 × 10^2");
    assert.equal(core.formatScientific(1.5), "1.5");
    assert.equal(core.formatProgramming(6.62607015e-34), "6.62607015e-34");
    assert.equal(core.formatProgramming(1550), "1.55e3");
    assert.equal(core.formatPlain(0.5), "0.5");
  });

  test("auto display unit", () => {
    assert.equal(core.autoUnit("wavelength", 1550e-9).id, "µm");
    assert.equal(core.autoUnit("wavelength", 500e-9).id, "nm");
    assert.equal(core.autoUnit("frequency", 193.4e12).id, "THz");
    assert.equal(core.autoUnit("energy", 0.8 * CONSTANTS.e).id, "meV");
    assert.equal(core.autoUnit("wavenumber", 6451).id, "cm^-1");
  });

  test("spectral region", () => {
    const at = (nm) => core.spectralRegion(CONSTANTS.c / (nm * 1e-9));
    assert.equal(at(532).name, "Visible");
    assert.equal(at(532).detail, "green");
    assert.ok(at(532).colour);
    assert.equal(at(1550).detail, "telecom C-band");
    assert.equal(at(1310).detail, "telecom O-band");
    assert.equal(at(254).detail, "UV-C");
    assert.equal(at(10600).name, "Long-wave infrared");
  });

  report("converter");
})();
