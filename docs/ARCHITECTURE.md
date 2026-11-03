# Architecture decision

Status: Electron and React selected, 2026-11-02.

## Decision

Build a Windows-first Electron desktop application with React and TypeScript. Electron hosts the UI in Chromium and provides a narrow native-process boundary. The app retains an offline simulator and now has a narrowly filtered physical HID connection check using Electron's WebHID support. The connection path is not yet verified at runtime on the keyboard, and it sends no hardware command.

The user explicitly chose Electron, with a high visual-quality target. Electron gives the interface a consistent Chromium rendering target and broad frontend ecosystem. Its larger runtime footprint is an accepted trade-off for this product direction.

## Process boundaries

- `electron/main.mjs` owns the window lifecycle and local application loading.
- `electron/preload.cjs` exposes only non-sensitive runtime metadata. It does not expose Node.js, filesystem access, or raw IPC to the renderer.
- `electron/main.mjs` permits HID access only for the app window and selects only the investigated VID/PID. Multiple matching interfaces require an explicit native dialog selection.
- `src/services/havit-hid.ts` requests and opens the filtered HID interface, reports connection state, displays collection/report metadata exposed by WebHID, and closes it. It does not expose input/output report methods.
- `src/` contains the React application, simulator model, and local profile operations.
- Renderer settings use validated, versioned JSON stored in browser local storage. This is suitable for the current simulator milestone; a native persistence layer may replace it if requirements grow.
- `src/services/device.ts` defines a high-level provider interface. The simulator is the only provider implemented today.
- Any physical write backend must validate device identity, protocol inputs, timing, and responses before writes are enabled. The current WebHID connection check is discovery only and is not proof that a control report works.

## Security defaults

- `contextIsolation`, `sandbox`, and `webSecurity` are enabled.
- `nodeIntegration` is disabled.
- The app loads bundled local content or the loopback development server only.
- Navigation to other origins and new windows are denied.
- Content Security Policy restricts scripts and network connections.
- The app makes no telemetry or application network requests.

## Alternatives considered

| Option | Trade-off |
| --- | --- |
| C++ with Qt Quick/QML | Strong native UI and direct platform access, with a distinct contributor and frontend stack. |
| Tauri with React and Rust | Smaller runtime footprint and an in-process native backend; not selected because the user explicitly requested Electron. |
| Electron with React and TypeScript | Selected. Consistent Chromium UI and broad frontend ecosystem; carries a larger runtime footprint and requires a deliberately narrow preload boundary. |
| React frontend plus a C++ engine | Adds a second process and deployment boundary before the device protocol establishes a concrete need. |

## Revisit when

Reassess the device boundary when read-only descriptors and protocol evidence are available. Revisit Electron only if measured resource use, platform requirements, or security constraints materially change.
