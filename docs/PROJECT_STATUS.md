# Project status

Last updated: 2026-11-03

## Current milestone

Milestone 3: physical HID discovery and safe connection.

## Completed

- Cloned the supplied repository; its initial commit contains only the project brief in `README.md`.
- Identified the supplied installer by size, PE signature, embedded Inno Setup marker, and SHA-256. Decompressed its LZMA data stream in memory and matched its embedded `config.xml` byte-for-byte against the installed copy; no installer code was executed.
- Recorded the previous investigation as reported evidence, separate from findings reproduced locally.
- Inspected the installed app's `config.xml`, `layouts/rgb-keyboard.xml`, and bundled keyboard preview image read-only.
- Statically parsed the installed `DeviceDriver.exe` PE headers and import modules and scanned ASCII strings for HID and SetupAPI names; the binary was not executed.
- Disassembled the installed driver's HID loader and write path: it dynamically resolves `HidD_SetFeature`, builds a zero report-ID byte plus a 64-byte payload, and calls it with a 65-byte buffer length.
- Read-only Windows PnP enumeration confirms the connected test keyboard reports VID/PID `05AC:024F`, revision `0102`, and interfaces `MI_00/01/02`; the configured `MI_00` is present.
- Static inspection recovered command-like payload prefixes, but not full semantics. Direct descriptor-only HID access returned Windows error 5; no report descriptor was captured.
- Traced routine `0x414230`: it sends `04 18` and `04 17`, reads `fn_switch`, `sleep_time`, and `key_respondtime`, then builds a `00 01` message with an `AA 55` trailer and sends `04 02`; the command purpose is unknown.
- Independently reproduced a `04 23` report builder at `0x44B9B0`: one branch sends 576 bytes of 4-byte per-index records; the other sends a 192-byte one-byte `0xFF` mask. Both reserve the last two sent bytes for `AA 55`. The following short `04 02` send checks response byte `1`; large chunks are not individually response-polled. This is a per-key lighting candidate, but color channels, mask semantics, and Static-mode mapping remain unknown.
- Recovered embedded SQLite schema strings for built-in and custom lighting records, and traced worker dirty bit `0x10` to the `0x44B9B0` builder (with bits `0x04` and `0x100` dispatching to other routines). This narrows the static trace but does not identify the UI mode or transmitted RGB channel mapping.
- Mapped the `0x42B0F0` `t_light_data` message candidate: mode at byte 0, low 24 bits of `color_value` at bytes 1–3, `colorful`/brightness/speed/direction at bytes 8–11, and `AA 55` at 14–15. It remains unvalidated on the keyboard; channel order and UI mode ID are unknown.
- Added `scripts/inspect-kb874l-lighting-static.py` to reproduce the driver worker call-site and schema-string findings against the pinned installed-driver hash.
- Corrected the byte order of marker words: `mov word ..., 0x55AA` yields bytes `AA 55` on x86 little-endian.
- Confirmed the app's layout XML defines 67 key positions and a 17-column, 6-row canvas; reproduced the geometry without copying its image assets.
- Selected Electron and React at the user's direction; added a secure main/preload/renderer boundary.
- Added an interactive desktop UI with overview, lighting, key editor, macros, profiles, diagnostics, and settings views.
- Added a WebHID connect/close flow restricted to the host-observed KB874L VID/PID, with app-window-only Electron permission handling and explicit interface choice if multiple matching collections appear. Diagnostics now displays collection/report metadata exposed by WebHID. The path does not read or write report payloads and still needs runtime verification on the device.
- Added profile-local settings, JSON import/export validation, and a deterministic offline simulator.
- Fixed manual hex color entry in Lighting Studio: partial drafts now remain editable, a complete value updates the local preview, and incomplete drafts revert on blur. Added input normalization tests.
- Corrected simulator connectivity indicators for disconnected state; removed the unsupported notification badge; clarified that the Reactive preview is a visual accent pattern, not keypress detection; and labeled the effect controls accessibly.
- Added initial unit tests for profile validation/storage and simulator status/error handling.

## Hardware status

| Area | Status | Evidence |
| --- | --- | --- |
| Installer identity | Investigated statically | SHA-256 and file signatures recorded in `REVERSE_ENGINEERING_REPORT.md` |
| Installed application binary | Static PE/disassembly inspection | x86 PE32, version 1.0.0.0, HID loader and feature-report transport recovered; command semantics incomplete |
| App layout model | Confirmed: 67 positions | Installed app's `rgb-keyboard.xml`; includes key indices, key codes, and coordinates |
| Physical key geometry | App-modeled, not physically checked | PnP identifies the connected test device; no physical measurements or legend alignment check were made |
| Manufacturer lighting | Listed as 20 effects with adjustable mode/brightness | Product page claims; protocol and physical operation remain unverified |
| Device identity and interfaces | Confirmed by host PnP for connected test keyboard | `05AC:024F`, revision `0102`, interfaces `MI_00/01/02` |
| Physical HID connection path | Implemented, runtime verification pending | WebHID open/close code restricted to `05AC:024F`; no reports sent |
| HID report descriptor and usage caps | Unknown | Read-only device open denied (Windows error 5); `HIDP_CAPS` unavailable |
| RGB modes and parameters | Unknown | No protocol command has been validated on hardware |
| Key remapping and macros | Unknown | UI claims or prior reports do not establish hardware support |
| Vendor HID transport | Partly recovered statically | 65-byte `HidD_SetFeature` buffer; zero report-ID byte plus 64-byte payload |
| Per-key lighting candidate | Static table builder partly mapped | `04 23`, key index plus three bytes per slot; color channel meaning and UI mapping remain unverified |
| Command semantics and full report format | Unknown/incomplete | Prefixes and data builders recovered; guessed reports remain disabled |
| Firmware update | Out of scope | Must remain unimplemented |

## Verification and blockers

- `npm test`: passed on 2026-11-03 after the hex color input fix (3 test files, 13 tests).
- `npm run build`: passed on 2026-11-03 after the hex color input fix (TypeScript and Vite production build).
- `pnpm build`: could not start because pnpm attempted a workspace/store symlink and Windows returned `EPERM`; `npm run build` succeeded using the installed dependencies.
- Physical WebHID open/close: code added, but runtime connection against the attached keyboard was not verified in this session. No HID reports were sent.
- `node scripts/generate-license-report.mjs`: passed; inventory generated for 346 package versions, with no missing license metadata (license texts and release bundle still require review).
- Electron desktop launch: still not verified. On 2026-11-03 the bundled Electron 45.2.1 binary exited with Windows status `0x80000003` (`EXCEPTION_BREAKPOINT`) even for `--version`, before the application could load. The local Vite server started, but the in-app browser could not reach `127.0.0.1:1420` and timed out. Visual review and screenshots remain outstanding; this failure has not been attributed to application code.
- Windows packaging: not completed. On 2026-11-03 both `npm run package:win` and `npm exec electron-builder -- --win --dir` reached the Windows packaging stage, then failed with `getaddrinfo ENOTFOUND github.com` while retrieving packaging resources. No installer or unpacked application bundle was produced.

## Known limitations

- The installer payload was not executed. Its LZMA stream and raw embedded executable hash are reproduced locally; selected protocol code ranges match the installed executable after reversing the CALL/JMP transform. The full extracted executable hash still differs from the installed binary by 1,128 bytes, including nine bytes in the transport routine, so artifact identity is only partly reconciled.
- The physical keyboard is PnP-enumerated on this host, but descriptor access was denied and the project has not performed a controlled feature test. The installed vendor utility's red preview was not independently verified against the physical LEDs.
- The 67-key layout models the supplied app's canvas; variant and physical alignment still require checking on the actual keyboard.
- There is no verified physical-device capture or controlled hardware test result.

## Next milestone

1. Launch the Electron app on Windows, verify WebHID permission selection against the connected KB874L, and capture the actual descriptor/collections if access permits.
2. Generate a complete dependency license inventory for redistributable artifacts and obtain a human maintainer decision on the project license and public attribution.
3. Capture vendor-app USB traffic for one-variable lighting changes and resolve the report fields before implementing any writes.
4. Build and verify a Windows installer on the target platform; visually inspect the interface at multiple sizes.
5. Add physical lighting functionality only after protocol evidence and a reversible hardware validation procedure are available.
