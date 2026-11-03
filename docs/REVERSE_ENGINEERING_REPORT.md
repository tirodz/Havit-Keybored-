# Reverse-engineering report

Last updated: 2026-11-03

## Scope and safety

This report covers the supplied installer and the already-installed `DeviceDriver.exe`. The installer binary was not launched; its and the installed executable's static inspection was read-only. At the user's request, the installed vendor utility was opened and its UI was set to Static, RGB `255/0/0`, with “Colorful” off. Its on-screen key preview changed to red, but the physical LEDs were not independently observed. The HAVIT project's lighting/key actions still target the simulator; a connection-only WebHID diagnostic was added later, but it has not been runtime-verified and sends no report payloads.

## Locally reproduced findings

| Finding | Evidence | Confidence |
| --- | --- | --- |
| File size is 5,708,058 bytes | Filesystem metadata | High |
| File has an `MZ` DOS header and a `PE\0\0` signature at the offset named by the DOS header | Read-only PE header parsing | High |
| File contains the ASCII marker `Inno Setup Setup Data` at byte offset 751,376 | Read-only byte-string search | High for an Inno Setup-related marker; this alone does not establish the exact version or payload contents |
| SHA-256 is `99764db2b122cee56e6e1de018e23da8a8acac52c4b1ddba3a3fa70a951a4f90` | Local SHA-256 calculation | High |
| Installer data block at offset `0xCDE00` uses LZMA1 properties `0x5D` and an 8 MiB dictionary; raw decompression yields 10,614,680 bytes with SHA-256 `e1425a8c0ea5eaf50667661760c088f59a3191d59fa4c27a4a66b92e187a5fc7` | Read-only in-memory LZMA decompression; end-of-stream reached | High for the block and decompressed stream |
| The first 1,802,752 bytes of the decompressed stream form a PE executable with raw SHA-256 `6b6a4b3c4039333e4ef289cd2f932b622fd9fc054580f73431c0b0afc40da179`; the following 746-byte `config.xml` exactly matches the installed config file | Read-only slicing/hash and byte-for-byte comparison | High for raw stream content and config match; the executable requires reversing Inno's CALL/JMP filter before normal disassembly |
| Installed `DeviceDriver.exe` is 1,802,752 bytes, version resource `1.0.0.0`, and SHA-256 `9e12ce7795189eda1a660b5dcf3e61b2954eca6d1bad5727aa14fea2774765f9` | Read-only filesystem metadata, version resource, and SHA-256 | High |
| Installed `DeviceDriver.exe` is a 32-bit x86 PE (machine `0x014c`, PE32) with seven sections | Read-only PE header parsing | High |
| Its import table names `SETUPAPI.dll`, `KERNEL32.dll`, `USER32.dll`, `ADVAPI32.dll`, `WININET.dll`, and other Windows/runtime libraries | Read-only PE import directory parsing | High for module names; the list alone does not show which code paths use them |
| The executable contains ASCII strings `HidD_GetAttributes`, `HidD_GetFeature`, `HidD_SetFeature`, `HidD_GetPreparsedData`, `HidP_GetCaps`, `SetupDiEnumDeviceInterfaces`, `SetupDiGetDeviceInterfaceDetailW`, and `CreateFileW` | Read-only scan of printable ASCII strings in the installed executable | High that the strings are present; they may be dynamically resolved or unused |
| Disassembly shows the application loads `hid.dll` and resolves HID names with `GetProcAddress` | Static x86 disassembly around the dynamic-loader call sites | High for the loader path in this executable |
| The HID write call passes a 65-byte buffer to the resolved `HidD_SetFeature` pointer | Static call-site disassembly; the call passes a handle, buffer pointer, and length `0x41` | High for the vendor software's call argument |
| The vendor transport zeroes a 65-byte buffer, copies a 64-byte payload at byte offset 1, then passes the buffer to `HidD_SetFeature` | Static disassembly of the report transport routine | High for this software's framing; the actual device report descriptor could not be read in this environment |
| Several callers construct payload prefixes `04 18`, `04 17`, `04 13`, `04 19`, `04 23`, `04 28`, `04 02`, and `04 F0`; code stores the word `0x55AA` at varying offsets | Static disassembly of feature-report call sites | High that these bytes are constructed; meanings and complete layouts remain unknown |
| Routine `0x414230` sends `04 18` and `04 17`, reads application settings named `fn_switch`, `sleep_time`, and `key_respondtime`, then constructs a `00 01` message with `AA 55` at message offsets `0x3E`–`0x3F` and sends `04 02` | Static disassembly and string references in the installed executable | High for message construction and settings names; command purpose is unknown, not established as lighting |
| Routines `0x434080` and `0x44B8A0` send `04 18`, `04 13`, a data-dependent message, `04 02`, and `04 F0`; the message uses fields from an object, and stores word `0x55AA` at message offsets `0x0E`–`0x0F` (bytes `AA 55`) | Independently reproduced from the installed executable, SHA-256 `9e12ce7795189eda1a660b5dcf3e61b2954eca6d1bad5727aa14fea2774765f9` | High for message construction; meanings of object fields and whether these are lighting settings remain unknown |
| Routine `0x44B9B0` sends `04 18`, then `04 23`, and allocates `0x258` bytes. With `[ebx+0x7AC] != 0`, it fills 4-byte slots with an index and three key-record bytes, places `AA 55` at offsets 574–575, and sends `0x240` bytes. With the flag zero, it writes one-byte `0xFF` marks, places `AA 55` at offsets 190–191, and sends `0xC0` bytes | Independently reproduced from the installed executable disassembly | High for the two encodings and send lengths; color-channel meaning, mask meaning, and UI-mode mapping remain unproven |
| Embedded lighting database schema names `t_light_data` fields `mode`, `brightness`, `speed`, `direction`, `colorful`, `colorindex`, `color_value`, `config_func`, `reserved`, and `status`; custom tables include `t_customrgb_data(keycode, rgbvalue, light_mode, colortype, light_type)` and `t_userlightrgb_data(key_code, key_rgb)` | Read-only extraction of null-terminated SQL strings from the installed executable's `.rdata` | High for strings/column names; no proven mapping from database fields to wire bytes |
| Routine `0x408520` executes `SELECT * FROM t_light_data WHERE profile = ? AND mode = ?` and copies the 13 columns in table order into a record; `mode` is at record offset `0x0C`, `brightness` `0x10`, `speed` `0x14`, `direction` `0x18`, `colorful` `0x1C`, `colorindex` `0x20`, `color_value` `0x24`, `config_func` `0x28`, `reserved` `0x2C`, and `status` `0x30` | Query string, bound-column reads, and destination stores in installed executable | High for the row/record layout; these record offsets are not HID message offsets |
| Routine `0x42B0F0` queries a `t_light_data` record and builds a separate message: object mode byte at message offset `0`, low 24 bits of the record's `color_value` at offsets `1`–`3`, `colorful` at `8`, brightness at `9`, speed at `10`, direction at `11`, and `AA 55` at `14`–`15`. The message follows short `04 18` and `04 13` reports and precedes `04 02`/`04 F0` | Field loads/stores and send sequence in installed executable | High for this candidate software message layout; RGB channel order, mode ID meaning, and physical device effect remain unverified |
| Worker code at `0x435137` gates `0x44B9B0` on dirty-state bit `0x10` at `[edi+0x7A4]` when `[edi+0x784] == 0`; the same worker calls `0x42B0F0` for bit `0x04` and `0x434080` for bit `0x100` | Direct-call and conditional-branch disassembly from the installed executable | High for dispatch conditions/call targets; bit meanings and UI labels remain unknown |
| The large table send enters the chunk branch of `0x44EE60`, which retries failed feature writes but does not poll a response after each chunk; the following short `04 02` send uses the response helper and checks for byte `1` | Static disassembly of `0x44EE60` and `0x44B9B0` | High for control flow; protocol meaning of the response byte is unknown |
| After reversing the Inno CALL/JMP transform on the extracted first PE, code ranges `0x44B9B0–0x44BE00`, `0x4513D0–0x451470`, `0x42B0F0–0x42B260`, and `0x434080–0x434180` match the installed executable byte-for-byte; the full executable hashes still differ | Read-only transform and byte-for-byte range comparison | High for these specific code ranges; not proof that every extracted/installed byte is identical |
| Windows currently enumerates a connected USB keyboard as VID/PID `05AC:024F`, revision `0102`, interfaces `MI_00`, `MI_01`, and `MI_02`; the `MI_00` child describes itself as `Gaming Keyboard` | Read-only `pnputil /enum-devices` output from this host | High for this host's current PnP enumeration; does not prove every market variant |
| Opening the HID collection from this execution environment for descriptor-only access returned Windows error 5 (access denied) | Read-only SetupAPI enumeration followed by `CreateFile` with read-only and zero access | High for the observed denial; report descriptor and `HIDP_CAPS` lengths remain unavailable |

The installer hash matches the value reported in the earlier investigation conversation. The raw LZMA stream and raw first-file hash in Claude's report were reproduced locally. Applying the Inno CALL/JMP inverse to that extracted executable yields matching code at the key protocol ranges above, but the resulting whole-file hash does not match Claude's reported decoded hash or the installed executable hash. In the compared 1,802,752-byte executable, 1,128 bytes still differ from the installed copy (including nine bytes in the `0x44EE60` transport range). Thus the relevant `0x44B9B0` builder and HID API wrapper are cross-checked across both artifacts, while full binary identity and every transport detail remain unresolved. Do not assume the whole executables are byte-identical.

To repeat the read-only extraction/hash and code-range comparison, run `py -3 scripts/inspect-kb874l-installer.py <installer-path> --installed-driver <installed-DeviceDriver.exe> --installed-config <installed-config.xml>`. The script decompresses into memory and writes no extracted files.

To reproduce the worker call-site, `t_light_data` row extraction, `0x42B0F0` message construction, and embedded lighting-schema string checks, install the optional analysis dependency with `py -m pip install capstone`, then run `py -3 scripts/inspect-kb874l-lighting-static.py <installed-DeviceDriver.exe>`. The script requires the recorded installed-driver SHA-256, disassembles the installed file only, and makes no device calls.

## Findings reported by the earlier investigation

The earlier report states that the installer is Inno Setup 6.1.0 Unicode and contains an x86 MFC/C++ application named `DeviceDriver.exe`, `mui.dll`, XML configuration/layout files, SQLite-related components, and Windows HID feature-report communication. It further reports VID/PID `05AC:024F`, interface `MI_00`, a 65-byte report, and command bytes `0x18`, `0x17`, `0x13`, `0x02`, and `0xF0`.

The installer-specific details remain **preliminary reported findings** unless called out in the locally reproduced section above. Static analysis of the installed executable reproduces a dynamic HID API loader, a 65-byte `HidD_SetFeature` call, a zero report-ID byte followed by a 64-byte payload, several command-like prefixes, SQLite lighting schemas, a dirty-state dispatch into the `04 23` table builder, and a candidate `04 13` message layout assembled from `t_light_data`. The installer payload has since been decompressed in memory and compared with the installed executable as documented above. Command semantics, checksums, complete valid packet structures, RGB channel order, the physical report descriptor, and on-device behavior remain unestablished. The connected host currently exposes the same VID/PID and revision as the vendor config, but interface usage and report capabilities still need runtime verification. Do not send command-like byte sequences as guessed reports.

## Not established

- Raw USB/HID descriptors and report capabilities. PnP identity `05AC:024F` on this host matches the vendor config, but the report descriptor/usage values remain unavailable.
- Physical HID report descriptor/usage, supported report lengths, command checksum, acknowledgment meaning, and timing.
- Whether the `04 23` table is specifically the custom per-key lighting upload, and what each record byte means.
- Which UI handler populates `t_light_data` and how Static mode maps to the mode value and packed `color_value`.
- Whether the `04 13` message candidate applies Static mode or another lighting mode, and what RGB channel order the packed integer uses.
- How `t_customrgb_data`/`t_userlightrgb_data` records reach routine `0x44B9B0` and its three per-key record bytes.
- Whether remapping or macros are stored on the device or handled by host software.
- Whether the official application reads back or verifies applied settings.
- Any firmware-update behavior.

## Next safe investigation steps

1. Trace how `t_customrgb_data` records and selected UI colors populate the per-key records consumed by `0x44B9B0`.
2. Inspect the remaining `0x44B9B0` send/ack path and establish exact table offsets, sent lengths, and mode-selection inputs.
3. If static analysis cannot link selected Static red to reports, capture vendor-software USB traffic while changing one lighting value at a time; do not inject reports.
4. Capture the physical HID report descriptor through a read-only method before enabling project device writes.

See [HARDWARE_SPECIFICATION.md](HARDWARE_SPECIFICATION.md), [HID_PROTOCOL.md](HID_PROTOCOL.md), and [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).
