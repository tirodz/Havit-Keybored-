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

The current development environment returned a native `EXCEPTION_BREAKPOINT` while launching Electron 45.2.1, before a window could be inspected. This smoke check is outstanding and must pass on the release build host.

## Release checks

Before publishing a release:

- Run the local checks above on a clean checkout.
- Run `pnpm package:win` on a supported Windows build host.
- Install and launch the generated NSIS package in a clean Windows account or VM.
- Review app identity, installer/uninstaller behavior, file provenance, and dependency license notices.
- Capture current screenshots and add them to the README.
- Confirm the project license and maintainer attribution have been explicitly selected by the human maintainer.
- Test hardware features only after the device and protocol evidence gates in `HARDWARE_SPECIFICATION.md` and `HID_PROTOCOL.md` are met.
