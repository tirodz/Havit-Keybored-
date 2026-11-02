# Hardware specification

Status: preliminary; no feature is verified against a physical KB874L.

## Target

- Product: HAVIT KB874L RGB Gaming Keyboard
- Supplied software: driver package labeled version 1.0.0.1
- Exact hardware revision: unknown
- Actual USB vendor/product IDs: unknown
- USB interfaces and HID report descriptor: unknown

The earlier investigation reports that the bundled configuration names VID `05AC`, PID `024F`, and interface `MI_00`. This is not independently confirmed from extracted configuration files or a connected keyboard. Do not match a device using this pair alone.

## Capability status

| Capability | Status | Notes |
| --- | --- | --- |
| Device detection | Unknown | Requires descriptors from the actual device and cautious identity matching |
| RGB effects | Unknown | Do not expose physical controls until supported modes and parameters are established |
| Brightness and speed | Unknown | Reported UI controls are not proof of device support |
| Per-key RGB | Unknown | No evidence establishes independent per-key control |
| Key remapping | Unknown | Persistence and host/device behavior are unknown |
| Macros | Unknown | Format, storage, and execution behavior are unknown |
| On-device profiles | Unknown | Profile handling has not been determined |
| Firmware update | Unsupported by this project scope | No updater will be implemented |

## Safety policy

- Device matching must use verified descriptors and must avoid claiming generic or ambiguous devices as the KB874L.
- Keep physical writes disabled while protocol semantics are unknown.
- Do not send guessed or random reports.
- Maintain separate desired, preview, confirmed, unknown, and simulated state.
- A successful local enqueue or write call is not proof that the keyboard applied a setting.
- Mark simulator behavior clearly in the UI.
