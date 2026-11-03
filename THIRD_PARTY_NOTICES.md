# Third-party notices

## Runtime and development dependencies

Application and build dependencies are declared with exact versions in `package.json`; the resolved dependency graph is recorded in `pnpm-lock.yaml`. The generated [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md) lists package license metadata found in the installed pnpm store. Regenerate it with `pnpm licenses:report` after installing dependencies and changing the lockfile.

The Windows application bundles Electron 45.2.1, React 19.3.1, React DOM 19.3.1, and its transitive `scheduler` 0.28.0 runtime dependency. The React packages and Scheduler are MIT-licensed by Meta Platforms, Inc. and affiliates; see [`licenses/runtime/Meta-MIT.txt`](licenses/runtime/Meta-MIT.txt). Electron is MIT-licensed; see [`licenses/runtime/Electron-MIT.txt`](licenses/runtime/Electron-MIT.txt). The bundled Electron distribution also contains `LICENSES.chromium.html`, which carries Chromium and bundled third-party notices; preserve it in releases.

The dependency inventory is not itself a replacement for license texts or notices required by individual packages. The `electron-builder` configuration is set to copy this notices file and the runtime license texts into the packaged app's `resources` directory; the output still needs verification when packaging can complete. Build-only packages listed in `THIRD_PARTY_LICENSES.md` are not intentionally shipped as application dependencies.

## Assets

No vendor driver artwork, keyboard images, fonts, or other third-party visual assets are copied into this repository. The keyboard diagram is rendered from coordinate data read from the installed driver's layout XML. HAVIT and KB874L are used only to identify the target product; this project is not endorsed by HAVIT.

## Open-source license status

The project is licensed under the [MIT License](LICENSE), with the copyright attribution `Copyright (c) 2026 Tiro`, as authorized by the repository owner. This project license applies to the repository's original project code and does not replace third-party notices above.
