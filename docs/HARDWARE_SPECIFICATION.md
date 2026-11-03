# Hardware specification

Status: preliminary; software layout and product-page claims are established, but no feature has been physically validated against a connected KB874L.

## Target

- Product: HAVIT KB874L compact gaming keyboard.
- Supplied software package: `KB874L RGB Gaming Keyboard Driver-1.0.0.1(1).exe`.
- Exact hardware revision/market variant: current host reports revision `0102`; other variants unknown.
- Actual USB vendor/product IDs: PnP confirms `05AC:024F` on the currently attached keyboard.
- USB interfaces: PnP confirms `MI_00`, `MI_01`, and `MI_02`; `MI_00` is the interface named in the installed app config.
- HID report descriptor and usage values: unknown; descriptor-only access returned Windows error 5 in this environment.

The installed application's `config.xml` identifies its UI model as `KB874L RGB Gaming Keyboard`, `device_type=101`, and declares VID/PID `05AC:024F`, interface `MI_00`. Read-only Windows PnP enumeration currently shows a connected `Gaming Keyboard` with matching VID/PID and revision `0102`, with composite interfaces `MI_00`, `MI_01`, and `MI_02`; the `MI_00` interface is present and started. This confirms the attached test device matches the installed software's reported identifiers on this host. It does not prove every physical market variant is identical. Descriptor usage and report lengths remain unavailable because a read-only HID handle could not be opened here.

The `rgb-keyboard.xml` file defines 67 key positions across a 17-column, 6-row canvas (800 × 300 coordinates). Its bundled keyboard preview image agrees with the compact 67-key layout. This establishes the software's modeled layout, not physical alignment or support for every control.

The same layout XML declares `default_mode="11"`, `default_brightness="5"`, and `default_speed="3"`, with brightness and speed maxima of `5`. These are vendor application defaults, not a verified mode map: they do not establish that mode `11` means Static, that these values are sent directly to the keyboard, or what any value does on hardware.

The [official HAVIT product page](https://havitsmart.com/products/havit-gaming-mechanical-keyboard-kb874l) also lists a 67-key layout, USB connection, 20 lighting effects, adjustable lighting mode and brightness, and dimensions of 321 × 113 × 40 mm. Its FAQ describes standard USB plug-and-play operation without a required driver/software installation. These are manufacturer-published claims, not a protocol capability matrix or a physical test result.

## Capability status

| Capability | Status | Notes |
| --- | --- | --- |
| Software key layout | Confirmed from installed app configuration | 67 entries, key indices, HID-like key codes, and canvas coordinates |
| Physical layout alignment | App-model evidence only | No connected device or physical measurement used to confirm the regional variant |
| Host device identity | PnP match on current host | `05AC:024F`, revision `0102`, interfaces `MI_00/01/02`; usage checks remain unavailable |
| Project-app device detection | WebHID connection path implemented; runtime verification pending | Filtered to host-confirmed `05AC:024F`; opens/closes only and sends no reports |
| Built-in lighting modes | Manufacturer-listed | 20 effects are advertised; application controls and protocol remain under investigation |
| Brightness control | Manufacturer-listed | Adjustable brightness is advertised; app transport remains unknown |
| Custom RGB software control | Static vendor command candidate partly mapped; physical behavior unknown | `0x42B0F0` assembles a data message from `t_light_data`, including low 24 bits of `color_value`; UI mode mapping and RGB byte order are unknown |
| Per-key RGB | Vendor has a per-key table upload candidate | `04 23` path builds four-byte slots with a key index and three record bytes; channel order, UI mapping, and hardware result remain unverified |
| Key remapping | UI exposed; physical support unknown | The installed app defines key rows and command menus, but persistence/transport is unverified |
| Macros | UI exposed; physical support unknown | Device format and playback behavior are unknown |
| On-device profiles | Unknown | Profile handling has not been determined |
| Firmware update | Unsupported by this project scope | No updater will be implemented |

## Safety policy

- Device matching must use verified descriptors and must avoid claiming generic or ambiguous devices as the KB874L.
- Keep physical writes disabled while protocol semantics are unknown.
- Do not send guessed or random reports.
- Maintain separate desired, preview, confirmed, unknown, and simulated state.
- A successful local enqueue or UI operation is not proof that the keyboard applied a setting.
- Mark simulator behavior clearly.
