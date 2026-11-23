# Optics and Photonics Physical Properties Converter

A browser-based converter for common optics and photonics quantities. Convert any one of wavelength, frequency, angular frequency, wavenumber, wavevector and photon energy into any other, in vacuum or inside a medium.

## Features

- Any quantity can be picked on either side. Picking the same quantity on both sides is an identity conversion (ratio 1): only the unit changes.
- Swap button (⇄, or Alt+S) reverses the conversion direction; the current result becomes the new input.
- Live results as you type; the converter opens with an empty input.
- Refractive index `n` (default `1`) with presets for vacuum, water, fused silica and silicon.
- Step-by-step working showing the equations used.
- Results in plain, scientific and programming notation, each with a copy button, plus "Copy all formats".
- "Same photon, every quantity" panel showing the value in all six quantities; click one to make it the target.
- Spectral-region badge (e.g. visible colour, UV band, telecom O/E/S/C/L/U band).
- Light and dark themes, works on phones, remembers your last quantity and unit choices.
- Runs locally in a browser with no installation required.

## Supported Quantities and Units

| Quantity | Units |
| --- | --- |
| Wavelength (λ) | Tm, Gm, Mm, km, m, cm, mm, µm, nm, pm, fm, am |
| Frequency (ν) | PHz, THz, GHz, MHz, kHz, Hz, mHz, µHz, nHz, pHz, fHz, aHz |
| Angular frequency (ω) | Prad/s … arad/s (SI prefixes) |
| Wavenumber (ν̃) | Tm⁻¹ … am⁻¹, including cm⁻¹ |
| Wavevector (k) | rad/Tm … rad/am, including rad/cm and rad/µm |
| Photon energy (E) | TeV … aeV and TJ … aJ (SI prefixes) |

## Equations

Every conversion goes through the optical frequency ν:

- `ν = c / (nλ)`
- `ω = 2πν`
- `ν̃ = nν / c`
- `k = 2πnν / c`
- `E = hν`

λ, ν̃ and k are the values inside the medium of index `n`; ν, ω and E do not depend on `n`.

Constants use the exact SI values `c = 299792458 m/s`, `h = 6.62607015e-34 J s` and `e = 1.602176634e-19 C`.

## Project layout

| File | Role |
| --- | --- |
| `converter.js` | Conversion core: quantities, units, parsing and formatting (no DOM). |
| `app-state.js` | Converter state and transitions such as swap (no DOM). |
| `ui.js` | Reads the page, runs conversions and renders results. |
| `index.html`, `styles.css` | Page markup and styles. |
| `tests/` | Tests for the core and the state logic. |

## Usage

Open `index.html` in a browser. No build step, package install, or server is required.

## Tests

With Node.js:

```bash
node tests/converter.test.js
node tests/app-state.test.js
```

Or serve the folder over HTTP and open `tests/run.html` in a browser.
