#!/usr/bin/env python3
"""Read-only checks for lighting-related structures in the installed KB874L driver.

Requires the optional Python package `capstone` for x86 disassembly. This script
does not execute the vendor program or interact with a HID device.
"""

from __future__ import annotations

import argparse
import hashlib
import struct
from pathlib import Path

try:
    from capstone import CS_ARCH_X86, CS_MODE_32, Cs
    from capstone.x86 import X86_OP_IMM
except ImportError as exc:
    raise SystemExit("Install the optional analysis dependency with: py -m pip install capstone") from exc


EXPECTED_SHA256 = "9e12ce7795189eda1a660b5dcf3e61b2954eca6d1bad5727aa14fea2774765f9"
LIGHTING_CALLS = (0x42B0F0, 0x434080, 0x44B9B0, 0x44BE20)
SQL_PREFIXES = (
    b"CREATE TABLE IF NOT EXISTS t_light_data",
    b"CREATE TABLE IF NOT EXISTS t_userlightrgb_data",
    b"CREATE TABLE IF NOT EXISTS t_customrgb_data",
)


def parse_pe(data: bytes) -> tuple[int, list[tuple[str, int, int, int, int]]]:
    if data[:2] != b"MZ":
        raise ValueError("Input is not a PE executable")
    pe_offset = struct.unpack_from("<I", data, 0x3C)[0]
    if data[pe_offset : pe_offset + 4] != b"PE\0\0":
        raise ValueError("PE signature is missing")
    section_count = struct.unpack_from("<H", data, pe_offset + 6)[0]
    optional = pe_offset + 24
    image_base = struct.unpack_from("<I", data, optional + 28)[0]
    section_table = optional + struct.unpack_from("<H", data, pe_offset + 20)[0]
    sections = []
    for index in range(section_count):
        at = section_table + index * 40
        name = data[at : at + 8].split(b"\0", 1)[0].decode("ascii", "replace")
        virtual_size, virtual_address, raw_size, raw_offset = struct.unpack_from("<IIII", data, at + 8)
        sections.append((name, image_base + virtual_address, max(virtual_size, raw_size), raw_offset, raw_size))
    return image_base, sections


def va_bytes(data: bytes, sections: list[tuple[str, int, int, int, int]], address: int, size: int) -> bytes:
    for _, section_va, extent, raw_offset, raw_size in sections:
        if section_va <= address and address + size <= section_va + extent:
            start = raw_offset + address - section_va
            if start + size > raw_offset + raw_size:
                break
            return data[start : start + size]
    raise ValueError(f"VA range {address:#x}–{address + size:#x} is not backed by section data")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("driver", type=Path, help="Path to installed DeviceDriver.exe")
    args = parser.parse_args()

    data = args.driver.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != EXPECTED_SHA256:
        raise SystemExit(f"Unexpected driver SHA-256 {digest}; expected {EXPECTED_SHA256}. Refusing to apply version-specific addresses.")

    _, sections = parse_pe(data)
    text = next(section for section in sections if section[0] == ".text")
    _, text_va, _, text_offset, text_size = text
    decoder = Cs(CS_ARCH_X86, CS_MODE_32)
    decoder.detail = True
    decoder.skipdata = True
    instructions = list(decoder.disasm(data[text_offset : text_offset + text_size], text_va))

    print(f"driver SHA-256: {digest}")
    print("direct callers in .text:")
    for target in LIGHTING_CALLS:
        callers = [
            instruction.address
            for instruction in instructions
            if instruction.id
            and instruction.mnemonic == "call"
            and instruction.operands[0].type == X86_OP_IMM
            and instruction.operands[0].imm & 0xFFFFFFFF == target
        ]
        print(f"  {target:#010x}: {', '.join(f'{address:#010x}' for address in callers) or 'none'}")

    print("worker dispatch at 0x00435137:")
    for instruction in decoder.disasm(va_bytes(data, sections, 0x435103, 0x8A), 0x435103):
        print(f"  {instruction.address:#010x}: {instruction.mnemonic:7} {instruction.op_str}")

    print("embedded SQLite lighting schema strings:")
    for prefix in SQL_PREFIXES:
        offset = data.find(prefix)
        if offset < 0:
            print(f"  {prefix.decode('ascii')}: not found")
            continue
        end = data.find(b"\0", offset)
        statement = data[offset : end if end >= 0 else len(data)].decode("ascii", "replace")
        print(f"  file offset {offset:#x}: {statement}")


if __name__ == "__main__":
    main()
