# Reverse-engineering report

Last updated: 2026-11-02

## Scope and safety

This report covers the supplied `KB874L RGB Gaming Keyboard Driver-1.0.0.1(1).exe`. Inspection was static and read-only. The installer was not launched, installed, or connected to a keyboard. No HID traffic was generated.

## Locally reproduced findings

| Finding | Evidence | Confidence |
| --- | --- | --- |
| File size is 5,708,058 bytes | Filesystem metadata | High |
| File has an `MZ` DOS header and a `PE\0\0` signature at the offset named by the DOS header | Read-only PE header parsing | High |
| File contains the ASCII marker `Inno Setup Setup Data` at byte offset 751,376 | Read-only byte-string search | High for an Inno Setup-related marker; this alone does not establish the exact version or payload contents |
| SHA-256 is `99764db2b122cee56e6e1de018e23da8a8acac52c4b1ddba3a3fa70a951a4f90` | Local SHA-256 calculation | High |

The hash matches the value reported in the earlier investigation conversation. This supports that the same installer file is being discussed; it does not independently validate that conversation's extracted-file findings.

## Findings reported by the earlier investigation

The earlier report states that the installer is Inno Setup 6.1.0 Unicode and contains an x86 MFC/C++ application named `DeviceDriver.exe`, `mui.dll`, XML configuration/layout files, SQLite-related components, and Windows HID feature-report communication. It further reports VID/PID `05AC:024F`, interface `MI_00`, a 65-byte report, `HidD_SetFeature`, and command bytes `0x18`, `0x17`, `0x13`, `0x02`, and `0xF0`.

These remain **preliminary reported findings**. The installer payload has not yet been unpacked locally and those details have not been reproduced from the supplied binary in this repository. They must not be used as device-matching rules or as authorization to send commands.

## Not established

- Actual USB descriptors and whether the reported VID/PID identify the target keyboard.
- HID report descriptor, report ID, payload layout, command semantics, checksum, acknowledgment behavior, or timing.
- Whether lighting is per-key, zoned, or limited to fixed effects.
- Whether remapping or macros are stored on the device or handled by host software.
- Whether the official application reads back or verifies applied settings.
- Any firmware-update behavior.

## Next safe investigation steps

1. Unpack the installer with a static archive tool without launching its payload.
2. Record hashes for extracted files and inspect configuration/layout data.
3. Verify executable architecture and imports/strings against the earlier report.
4. Inspect packet construction and call sites, but keep command meanings marked unknown until corroborated.
5. Capture actual device descriptors through read-only enumeration before implementing device matching.

See [HARDWARE_SPECIFICATION.md](HARDWARE_SPECIFICATION.md), [HID_PROTOCOL.md](HID_PROTOCOL.md), and [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).
