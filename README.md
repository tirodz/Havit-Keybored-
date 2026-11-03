# HAVIT Gaming Control Center

An independent, community-built desktop control center for exploring and configuring HAVIT gaming peripherals. The first target is the KB874L keyboard. The application uses Electron, React, and TypeScript, with a polished offline simulator as its current device backend.

> **Hardware support status:** An explicit WebHID connection check is implemented for the reported KB874L USB identity, but has not yet been runtime-verified on the keyboard. No physical keyboard commands are implemented. Lighting, key, and profile controls currently change local preview data only.

This is not an official HAVIT product and is not affiliated with or endorsed by HAVIT. The HAVIT name is used only to identify the intended compatible product.

## Current features

- Electron desktop shell with a React interface and a restricted preload boundary.
- 67-key KB874L layout reconstructed from the installed software's layout configuration.
- Lighting preview with Static, Breathing, Wave, and Reactive visualizations.
- Key Studio and Macro Studio editors for local profile data.
- Multiple local profiles, JSON import/export, and input validation.
- Offline simulator with explicit connection and error states.
- Physical HID interface connection and close flow, restricted to the reported KB874L USB ID; displays collection/report metadata exposed by WebHID and sends no reports.
- Diagnostics and settings views; no telemetry or application network calls.

The four lighting previews are application effects. They are not claims about the keyboard's 20 manufacturer-advertised onboard modes.

## Screenshots

Screenshots will be added after the Electron window can be launched and visually reviewed in the target environment. The supplied vendor artwork is not redistributed; the keyboard preview is drawn from layout coordinates.

## Compatibility

| Platform/device | Status |
| --- | --- |
| Windows desktop app | Development target; packaged release not yet verified |
| HAVIT KB874L layout | Modeled from bundled driver configuration |
| Physical KB874L connection | WebHID open/close path implemented; runtime verification pending |
| Other HAVIT devices | Not supported or validated |

The installed driver's configuration identifies a 67-position layout and declares a USB ID, but this is not proof of the actual descriptors of every keyboard revision. See [hardware specification](docs/HARDWARE_SPECIFICATION.md) and [protocol status](docs/HID_PROTOCOL.md).

## Development

Requirements: Node.js 22.12 or newer and pnpm 11.17.0. From the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

`npm run dev` starts the Vite renderer at `http://127.0.0.1:1420/`. To launch the desktop application during development, run:

```powershell
pnpm desktop:dev
```

The local `desktop:dev` launcher starts Vite and Electron together. Production renderer build:

```powershell
pnpm build
```

Run unit tests:

```powershell
pnpm test
```

Create a Windows NSIS installer (Windows build host required):

```powershell
pnpm package:win
```

Packaged artifacts are written to `release/`. Packaging and application startup must be verified on a supported Windows machine before publishing a release.

## Project map

- `electron/` — Electron main process and restricted preload.
- `src/` — React views, keyboard layout, profiles, and simulator provider.
- `docs/ARCHITECTURE.md` — architecture and security boundaries.
- `docs/HARDWARE_SPECIFICATION.md` — evidence-based compatibility status.
- `docs/HID_PROTOCOL.md` — protocol investigation status and implementation gate.
- `docs/PROJECT_STATUS.md` — milestone and known limitations.

## Safety and privacy

The application can open the matching physical HID interface for connection checks, but sends no commands to the keyboard. Profiles are stored in the app's local browser storage. JSON import validates profile data before it is used. No telemetry is included. Keep the physical write path disabled until the protocol has been captured and validated with controlled tests.

Report security issues privately as described in [SECURITY.md](SECURITY.md). See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Attribution and license

The repository is published under the GitHub account [`tirodz`](https://github.com/tirodz); the individual creator and maintainer's preferred public attribution has not been confirmed. No personal name, email, or legal copyright holder is inferred here. Contributors should be credited through their accepted contributions and bylines.

This repository does not yet contain an open-source license. MIT is a candidate for maintainer review; until a human maintainer selects and adds a license, reuse and redistribution permissions should not be assumed. Third-party package notices are tracked in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Project status

See [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) for completed work, evidence, blockers, and release-readiness items.
