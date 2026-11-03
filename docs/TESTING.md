# Build and testing

## Local checks

Run these commands from the repository root using Node.js 22.12+ and pnpm 11.17.0:

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

The test suite currently covers profile document validation/storage and the simulator provider's connection and error states. It does not exercise a physical keyboard, validate protocol reports, or prove compatibility with a specific device revision.

## Desktop smoke check

On Windows, run `pnpm desktop:dev`. Confirm the Electron window opens, the seven navigation pages render, the 67-key diagram is aligned, and profile/lighting changes remain local. Try JSON export and import using a test profile. Confirm simulator disconnect/error states are labeled as simulated. Do not infer physical-device support from these checks.

Retest on 2026-11-03: the bundled Electron 45.2.1 executable exited with Windows status `0x80000003` (`EXCEPTION_BREAKPOINT`) even for `electron.exe --version`, before this app's main process or renderer could be inspected. Vite itself started at `127.0.0.1:1420`, but the in-app browser timed out trying to reach it. This does not establish an application startup defect; the Electron desktop smoke check and screenshot review remain outstanding on a host where Electron can launch.

Packaging retest on 2026-11-03: both the NSIS target (`npm run package:win`) and unpacked directory target (`npm exec electron-builder -- --win --dir`) failed when electron-builder attempted to resolve `github.com` (`getaddrinfo ENOTFOUND`). No distributable was produced.

## Release checks

Before publishing a release:

- Run the local checks above on a clean checkout.
- Run `pnpm package:win` on a supported Windows build host.
- Install and launch the generated NSIS package in a clean Windows account or VM.
- Review app identity, installer/uninstaller behavior, file provenance, and dependency license notices.
- Capture current screenshots and add them to the README.
- Confirm the project license and maintainer attribution have been explicitly selected by the human maintainer.
- Test hardware features only after the device and protocol evidence gates in `HARDWARE_SPECIFICATION.md` and `HID_PROTOCOL.md` are met.
