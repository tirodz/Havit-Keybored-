# HID protocol status

Status: unknown; no protocol commands are currently safe to implement for physical hardware.

## Preliminary report

The earlier investigation reports a 65-byte feature-report buffer, `HidD_SetFeature`, possible command identifiers `0x18`, `0x17`, `0x13`, `0x02`, and `0xF0`, a possible `0x55AA` marker, and an approximate 35 ms delay. The report also notes that command meanings, checksum, effect IDs, and real hardware descriptors were not recovered.

These details are recorded as leads only. They are not a protocol specification and must not be emitted to a physical keyboard.

## Verified protocol fields

None.

| Field | Value | Status |
| --- | --- | --- |
| Report type | Feature report (reported) | Unverified |
| Report ID | Unknown | Unverified |
| Report length | 65 bytes (reported) | Unverified |
| Command layout | Unknown | Unverified |
| Checksum | Unknown | Unverified |
| Response/acknowledgment | Unknown | Unverified |
| Timing constraints | Unknown | The reported 35 ms delay is unverified |

## Implementation gate

Physical commands may be implemented only after the report descriptor and packet structure are understood, command purpose is supported by evidence, input constraints are documented, and the behavior has a controlled validation procedure. Unknown commands remain unavailable. The simulator may model only clearly labeled application behavior and must not imply that its packets match the hardware protocol.
