# HID protocol status

Status: vendor transport and several report builders are partly recovered; no physical protocol command is safe to implement yet. The app has an unverified WebHID connection-only path filtered to the host-observed KB874L VID/PID. It opens/closes the selected HID interface and displays collection/report metadata exposed by WebHID, but does not read or write report payloads. Static disassembly of the installed `DeviceDriver.exe` shows it loads `hid.dll`, resolves HID APIs with `GetProcAddress`, and invokes `HidD_SetFeature` with a 65-byte length. Its main transport zeroes that report and copies a 64-byte message at offset 1. Several call sites build prefixes including `04 18`, `04 17`, `04 13`, `04 19`, `04 23`, `04 28`, `04 02`, and `04 F0`. A 600-byte per-key table is uploaded in one code path, but the link to a specific lighting mode and the channel meanings are unproven. The actual report descriptor remains unknown. The installed layout XML confirms key positions and key codes for UI modeling, not a safe packet format.

## Preliminary report

## WebHID inspection

The Diagnostics page now displays the HID collection metadata returned by `HIDDevice.collections` after a user requests and opens the filtered interface. It shows usage page/usage and each input, output, and feature report ID with its item count. This is Chromium's parsed collection metadata, not raw report-descriptor bytes and not proof that a vendor report is valid. The app does not call `sendReport`, `sendFeatureReport`, `receiveFeatureReport`, or consume input reports. This path still needs runtime verification with the attached keyboard.

## Candidate built-in lighting message

Static disassembly of `0x42B0F0` links the selected `t_light_data` database row to a 64-byte software message. The routine performs the short `04 18` and `04 13` calls, then constructs a separate zero-initialized message with:

| Message offset | Value assembled by the vendor app | Evidence status |
| --- | --- | --- |
| `0x00` | Current mode value from the app object | Static load/store; mapping to the vendor UI's Static label is unknown |
| `0x01`–`0x03` | Low 24 bits of the selected row's `color_value`, least-significant byte first; skipped when mode is zero | Static shifts and stores; RGB/BGR channel meaning is unknown |
| `0x08` | Row's `colorful` field | Static record load/store; device-side meaning unverified |
| `0x09` | Row's `brightness` field | Static record load/store; physical range/effect unverified |
| `0x0A` | Row's `speed` field | Static record load/store; physical range/effect unverified |
| `0x0B` | Row's `direction` field | Static record load/store; physical meaning unverified |
| `0x0E`–`0x0F` | `AA 55` marker | Static store; framing/checksum role unknown |

The other bytes in this data message are zeroed by the builder. The routine then sends short `04 02` and `04 F0` messages. This is a candidate built-in lighting/settings path, not a validated Static-red report. The control flow does not prove what a keyboard does with it, and the project must not transmit it until mode selection, descriptor compatibility, response behavior, and a reversible physical validation are established.

The earlier investigation reports a 65-byte feature-report buffer, `HidD_SetFeature`, possible command identifiers `0x18`, `0x17`, `0x13`, `0x02`, and `0xF0`, a `0x55AA` word in code (bytes `AA 55` on x86), and an approximate 35 ms delay. The report also notes that command meanings, checksum, effect IDs, and real hardware descriptors were not recovered.

The earlier command list is now partly corroborated by disassembly, and one `0x42B0F0` data-message layout is partly mapped below. A matching prefix or a statically reconstructed message does not establish a safe command. Windows enumerates a connected device on this host with the reported VID/PID and revision; descriptor-only access was denied with Windows error 5 in this execution environment. This project has sent no report to the keyboard.

The `0x42B0F0` report builder sends `04 18`, `04 13`, a data-dependent message, `04 02`, and `04 F0`. The worker's object value at `[esi+0x804]` is used as the selected mode lookup and as byte 0 in the data message; the selected `t_light_data` record supplies the other mapped fields below. This does not identify the UI's Static mode ID or prove the physical result. A separate routine at `0x414230` reads application settings named `fn_switch`, `sleep_time`, and `key_respondtime`; those names must not be attributed to `0x42B0F0`. That routine also constructs a separate `00 01` message with `AA 55` at message offsets `0x3E`–`0x3F`, then sends `04 02`; its purpose is unknown.

Static disassembly of `0x44B9B0` shows a `04 23` path with two different table encodings. When `[ebx+0x7AC] != 0`, it fills 4-byte slots with an index and three bytes from a key record at offsets `+0x10`, `+0x11`, and `+0x12`; it places `AA 55` at table offsets 574–575 and sends 576 bytes (nine 64-byte chunks). The installed layout's maximum `light_index` is 121, so the marker in slot 143 is beyond its listed keys. When `[ebx+0x7AC] == 0`, it writes one-byte `0xFF` marks at per-index offsets, places `AA 55` at offsets 190–191, and sends 192 bytes (three chunks). This is a byte mask, not the 4-byte color-slot encoding; the layout's maximum index 121 is below the marker. The protocol still does not establish the three color-byte meanings, the mask semantics, or which UI mode invokes either branch. Neither branch is a verified solid-red operation.

The data transfer call passes a nonzero acknowledgment flag, but the large-payload branch of `0x44EE60` chunks and retries `HidD_SetFeature` writes without polling a response for each chunk. The subsequent 65-byte `04 02` call uses the short-report branch, which invokes the acknowledgment/readback helper and checks for response byte `1`. This establishes an acknowledgment check on the final `04 02` step in this code path, not per-chunk acknowledgments or the meaning of the response.

## Recovered fields (static software evidence only)

| Field | Value | Status |
| --- | --- | --- |
| Report type | Feature report | Confirmed in installed application disassembly (`HidD_SetFeature` call) |
| Report ID | Zero in the vendor application's transport buffer | Confirmed in static report-buffer construction; physical descriptor not read |
| Report length | 65 bytes (`0x41`) | Confirmed as the vendor call's length argument; not cross-checked against `HIDP_CAPS` |
| Payload | Main transport copies 64 message bytes to report offsets 1–64 | Confirmed in static disassembly |
| `0x42B0F0` data message | Mode byte at message offset 0; low 24 bits of `t_light_data.color_value` at 1–3; `colorful`, brightness, speed, direction at 8–11; `AA 55` at 14–15 | Software message construction mapped statically; color-channel order, mode ID, report descriptor compatibility, and physical behavior unverified |
| `04 23` table branches | Flagged branch uses 4-byte color-record slots and sends `0x240` bytes with `AA 55` at offsets 574–575; other branch writes a one-byte `0xFF` per-index mask and sends `0xC0` bytes with `AA 55` at offsets 190–191 | Static construction confirmed at `0x44B9B0`; RGB channels, mask meaning, and mode mapping unknown |
| Marker word | Code stores `0x55AA`, which is byte sequence `AA 55` on x86 little-endian | Confirmed where present; framing/checksum role unknown |
| Keyboard settings-read sequence | `04 18`, `04 17` in routine `0x414230` | Confirmed; reads `fn_switch`, `sleep_time`, `key_respondtime`; not a lighting command |
| Message marker position | `AA 55` at message offsets `0x0E`–`0x0F` in data messages built at `0x42B0F0` and `0x434080`; offsets vary in other builders | Static bytes confirmed; role unknown |
| Other command prefixes | Examples include `04 13`, `04 17`, `04 18`, `04 19`, `04 23`, `04 28`, `04 02`, `04 F0` | Bytes are statically constructed; meanings and full layouts unknown |
| Command layout | `0x42B0F0` message partly mapped; other messages known only by prefix or selected fields | Incomplete; no physical command validated |
| Checksum | Unknown | Unverified |
| Response/acknowledgment | In this path, large table writes are chunked without per-chunk response polling; the following short `04 02` call checks response byte `1` | Static behavior confirmed; response semantics unknown |
| Timing constraints | Unknown | The reported 35 ms delay is unverified |

## Implementation gate

Physical commands may be implemented only after the report descriptor and packet structure are understood, command purpose is supported by evidence, input constraints are documented, and behavior has a controlled validation procedure. The `04 23` per-key table is a promising static finding, not sufficient evidence for a write path. Unknown commands remain unavailable. The simulator may model only clearly labeled application behavior and must not imply that its packets match the hardware protocol.
