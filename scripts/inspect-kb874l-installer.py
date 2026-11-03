#!/usr/bin/env python3
"""Read-only checks for the supplied Inno Setup KB874L installer.

The script decompresses the first zlb/LZMA block in memory. It does not extract
files to disk or execute the installer or any embedded program.
"""

from __future__ import annotations

import argparse
import hashlib
import lzma
import struct
from pathlib import Path


ZLB_MAGIC = b"zlb\x1a"
KNOWN_DRIVER_SIZE = 1_802_752
KNOWN_CONFIG_OFFSET = KNOWN_DRIVER_SIZE
KNOWN_CONFIG_SIZE = 746
CODE_RANGES = (
    (0x44B9B0, 0x44BE00),
    (0x44EE60, 0x44F050),
    (0x4513D0, 0x451470),
    (0x42B0F0, 0x42B260),
    (0x434080, 0x434180),
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def decompress_zlb(installer: bytes) -> tuple[bytes, int, bool]:
    offset = installer.find(ZLB_MAGIC)
    if offset < 0:
        raise ValueError("No zlb LZMA block found")

    properties = installer[offset + 4]
    dictionary_size = struct.unpack_from("<I", installer, offset + 5)[0]
    lc = properties % 9
    remainder = properties // 9
    lp = remainder % 5
    pb = remainder // 5
    if lc > 8 or lp > 4 or pb > 4:
        raise ValueError(f"Invalid LZMA properties byte: 0x{properties:02x}")

    decoder = lzma.LZMADecompressor(
        format=lzma.FORMAT_RAW,
        filters=[{
            "id": lzma.FILTER_LZMA1,
            "dict_size": dictionary_size,
            "lc": lc,
            "lp": lp,
            "pb": pb,
        }],
    )
    stream = decoder.decompress(installer[offset + 9 :])
    return stream, offset, decoder.eof


def undo_inno_call_filter(encoded: bytes) -> bytes:
    """Reverse Inno's E8/E9 operand transform for one PE file buffer."""
    data = bytearray(encoded)
    file_size = len(data)
    cursor = 0
    while cursor < file_size - 5:
        if data[cursor] not in (0xE8, 0xE9):
            cursor += 1
            continue

        address = struct.unpack_from("<I", data, cursor + 1)[0]
        offset = cursor + 5
        if address < file_size:
            struct.pack_into("<I", data, cursor + 1, (address - offset) & 0xFFFFFFFF)
        elif address >= 0x1_0000_0000 - offset:
            struct.pack_into("<I", data, cursor + 1, (address - file_size) & 0xFFFFFFFF)
        cursor += 5
    return bytes(data)


def pe_sections(data: bytes) -> tuple[int, list[tuple[str, int, int, int, int]]]:
    if data[:2] != b"MZ":
        raise ValueError("Embedded file is not an MZ executable")
    pe_offset = struct.unpack_from("<I", data, 0x3C)[0]
    if data[pe_offset : pe_offset + 4] != b"PE\0\0":
        raise ValueError("Embedded file has no PE signature")
    section_count = struct.unpack_from("<H", data, pe_offset + 6)[0]
    optional = pe_offset + 24
    image_base = struct.unpack_from("<I", data, optional + 28)[0]
    section_table = optional + struct.unpack_from("<H", data, pe_offset + 20)[0]
    sections = []
    for index in range(section_count):
        at = section_table + index * 40
        name = data[at : at + 8].split(b"\0", 1)[0].decode("ascii", "replace")
        virtual_size, virtual_address, raw_size, raw_offset = struct.unpack_from("<IIII", data, at + 8)
        sections.append((name, virtual_address, virtual_size, raw_offset, raw_size))
    return image_base, sections


def read_va_range(data: bytes, va_start: int, va_end: int) -> bytes:
    image_base, sections = pe_sections(data)
    start_rva = va_start - image_base
    end_rva = va_end - image_base
    for _, virtual_address, virtual_size, raw_offset, raw_size in sections:
        extent = max(virtual_size, raw_size)
        if virtual_address <= start_rva < end_rva <= virtual_address + extent:
            raw_start = raw_offset + start_rva - virtual_address
            raw_end = raw_start + (va_end - va_start)
            if raw_end > raw_offset + raw_size:
                raise ValueError(f"VA range {va_start:#x}–{va_end:#x} exceeds section raw data")
            return data[raw_start:raw_end]
    raise ValueError(f"VA range {va_start:#x}–{va_end:#x} is not in one PE section")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("installer", type=Path, help="Path to the supplied installer")
    parser.add_argument("--installed-driver", type=Path, help="Optional installed DeviceDriver.exe for comparison")
    parser.add_argument("--installed-config", type=Path, help="Optional installed config.xml for comparison")
    parser.add_argument(
        "--driver-size",
        type=int,
        default=KNOWN_DRIVER_SIZE,
        help=f"Embedded driver length in bytes (default: {KNOWN_DRIVER_SIZE})",
    )
    args = parser.parse_args()

    stream, block_offset, ended = decompress_zlb(args.installer.read_bytes())
    if not ended:
        raise RuntimeError("LZMA stream did not reach its end marker")
    if len(stream) < args.driver_size:
        raise RuntimeError("Decompressed stream is shorter than the requested driver size")

    raw_driver = stream[: args.driver_size]
    print(f"installer zlb offset: 0x{block_offset:X}")
    print(f"decompressed stream: {len(stream)} bytes SHA-256 {sha256(stream)}")
    print(f"embedded raw driver: {len(raw_driver)} bytes SHA-256 {sha256(raw_driver)}")
    if len(stream) >= KNOWN_CONFIG_OFFSET + KNOWN_CONFIG_SIZE:
        config = stream[KNOWN_CONFIG_OFFSET : KNOWN_CONFIG_OFFSET + KNOWN_CONFIG_SIZE]
        print(f"following config.xml: {len(config)} bytes SHA-256 {sha256(config)}")
        if args.installed_config:
            installed_config = args.installed_config.read_bytes()
            print(f"installed config.xml: {'MATCH' if config == installed_config else 'DIFF'}")

    restored_driver = undo_inno_call_filter(raw_driver)
    print(f"CALL/JMP-restored driver SHA-256 {sha256(restored_driver)}")

    if args.installed_driver:
        installed = args.installed_driver.read_bytes()
        print(f"installed driver: {len(installed)} bytes SHA-256 {sha256(installed)}")
        if len(installed) == len(restored_driver):
            differences = sum(a != b for a, b in zip(restored_driver, installed))
            print(f"whole-driver differing bytes after CALL/JMP transform: {differences}")
        for start, end in CODE_RANGES:
            left = read_va_range(restored_driver, start, end)
            right = read_va_range(installed, start, end)
            differences = sum(a != b for a, b in zip(left, right))
            print(
                f"VA {start:#010x}-{end:#010x}: "
                f"{'MATCH' if differences == 0 else f'{differences} differing bytes'}"
            )


if __name__ == "__main__":
    main()
