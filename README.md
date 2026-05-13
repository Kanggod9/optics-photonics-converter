# Optics and Photonics Physical Properties Converter

A browser-based converter for common optics and photonics quantities. The app converts between wavelength, frequency, angular frequency, wavenumber, wavevector, photon energy in joules, and photon energy in electronvolts.

## Features

- Source and target quantity dropdowns with matching unit dropdowns.
- Prevents choosing the same property on both sides of the conversion.
- Supports refractive index `n`, with a default value of `1`.
- Displays the equation used for the selected conversion.
- Shows results in plain number, scientific notation, and programming-style exponential notation.
- Copy button for the displayed result.
- Runs locally in a browser with no installation required.

## Supported Quantities and Units

| Quantity | Units |
| --- | --- |
| Wavelength (λ) | Tm, Gm, Mm, km, m, cm, mm, µm, nm, pm, fm, am |
| Frequency (ν) | THz, GHz, MHz, kHz, Hz, mHz, µHz, nHz, pHz, fHz, aHz |
| Angular frequency (ω) | rad/s |
| Wavenumber (ν̃) | Tm^-1, Gm^-1, Mm^-1, km^-1, m^-1, cm^-1, mm^-1, µm^-1, nm^-1, pm^-1, fm^-1, am^-1 |
| Wavevector (k) | rad/m |
| Energy (joule) | TJ, GJ, MJ, kJ, J, mJ, µJ, nJ, pJ, fJ, aJ |
| Energy (electronvolt) | TeV, GeV, MeV, keV, eV, meV, µeV, neV, peV, feV, aeV |

## Equations

The converter uses photon relationships including:

- `ν = c / (nλ)`
- `ω = 2πν`
- `ν̃ = nν / c`
- `k = 2πnν / c`
- `E = hν`
- `E(eV) = hν / e`

Constants use high-precision defined values, including `c = 299792458 m/s`, `h = 6.62607015e-34 J s`, and `e = 1.602176634e-19 C`.

## Usage

Open `index.html` in a browser. No build step, package install, or server is required.
