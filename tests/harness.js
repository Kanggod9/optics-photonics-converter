/* Minimal test harness that works in Node and in a browser (tests/run.html). */
(function (root) {
  const results = [];

  function fail(message) {
    throw new Error(message);
  }

  const assert = {
    ok(value, message = "expected a truthy value") {
      if (!value) fail(message);
    },
    equal(actual, expected, message) {
      if (actual !== expected) fail(message ?? `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    deepEqual(actual, expected, message) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) fail(message ?? `expected ${b}, got ${a}`);
    },
    closeTo(actual, expected, relTol = 1e-12, message) {
      const scale = Math.max(Math.abs(expected), Number.MIN_VALUE);
      if (!(Math.abs(actual - expected) <= scale * relTol)) {
        fail(message ?? `expected ${actual} to be within ${relTol} (relative) of ${expected}`);
      }
    },
    throws(fn, pattern, message) {
      try {
        fn();
      } catch (error) {
        if (pattern && !pattern.test(error.message)) fail(`error "${error.message}" did not match ${pattern}`);
        return;
      }
      fail(message ?? "expected function to throw");
    },
  };

  function test(name, fn) {
    try {
      fn();
      results.push({ name, ok: true });
    } catch (error) {
      results.push({ name, ok: false, error: error.message });
    }
  }

  function report(label) {
    const failed = results.filter((r) => !r.ok);
    if (typeof console !== "undefined") {
      for (const r of failed) console.error(`✗ ${r.name}: ${r.error}`);
      console.log(`${label}: ${results.length - failed.length}/${results.length} passed`);
    }
    if (failed.length && typeof process !== "undefined") process.exitCode = 1;
    return { results: results.slice(), failed: failed.length };
  }

  function reset() {
    results.length = 0;
  }

  const api = { assert, test, report, reset, results };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TestHarness = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
