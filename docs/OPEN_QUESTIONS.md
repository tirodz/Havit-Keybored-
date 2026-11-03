# Open questions

## Confirmed from local static inspection

- The installer's first LZMA stream can be decompressed in memory without launching the installer; its embedded `config.xml` matches the installed copy. The embedded executable is only partially reconciled with the installed binary; see the hashes and differing byte ranges in `REVERSE_ENGINEERING_REPORT.md`.
- The installed `DeviceDriver.exe` is x86 PE32 and imports HID/SetupAPI-related APIs. Its HID feature-report wrapper and selected lighting-related routines are documented in the reverse-engineering report.
- The installed `config.xml` and `layouts/rgb-keyboard.xml` define the software device assumptions and 67-position preview layout.
- The host currently enumerates the attached keyboard as `05AC:024F`, revision `0102`, with `MI_00/01/02`; the vendor config names `MI_00`.
- Embedded SQLite strings name built-in and custom lighting fields. A worker dirty-state bit dispatches to the `04 23` table builder, but the database records and UI selections are not mapped to specific transmitted color bytes.

## Remaining installer questions

- What remaining installed resources and file-table entries are present in the Inno payload beyond the locally matched executable/config files?
- Which executable routines consume the lighting database fields, and how do they map onto UI controls and device messages?
- Does the application bundle a firmware image or updater, and what is its role?

## Hardware identity

- What usage page/usage and report collections does WebHID expose for the target keyboard? PnP confirms VID/PID `05AC:024F`, revision `0102`, and interfaces `MI_00/01/02`; the app now shows available collection metadata after user-authorized connection, but runtime access has not yet been verified.
- Are there multiple KB874L hardware revisions with different descriptors or capabilities?
- Can identity be established without relying on the reported Apple VID `05AC` alone?

## Protocol and capabilities

- What are the exact feature-report fields and report ID?
- Which commands are read-only, and which change device state?
- What are the confirmed meanings and valid parameter ranges for each command?
- Is there a checksum, sequence number, acknowledgment, or read-back operation?
- Which lighting modes and parameters are truly supported?
- Does the dirty-state bit `0x10` and dispatch into `0x44B9B0` correspond to the custom per-key lighting UI? What do key-record bytes `+0x10..+0x12` and the one-byte `0xFF` mask branch mean?
- Which UI path maps a selected Static color to the settings object fields used by `0x42B0F0`, `0x434080`, or `0x44B8A0`?
- Does the `04 23` table represent RGB channel values, and what channel order and valid key-index range does the target device expect?
- Are key remapping and macros device-side, host-side, or absent?
- Are profiles stored on the keyboard, in the official app, or both?

## Product and architecture

- Which desktop platform is required beyond Windows?
- Should profile interchange use a versioned JSON format or another format?
- What exact physical keyboard geometry should the visualizer use, and what source can establish it?

## Validation

- What controlled, reversible hardware test can validate an understood lighting command?
- How can operation success be observed if the protocol has no acknowledgment?
- Which diagnostics may be collected locally, and how should users opt into them?
