# Architecture decision

Status: provisional foundation decision, 2026-11-02.

## Decision

Start with a single Tauri desktop application using React and TypeScript for the UI and Rust for application services and device abstractions. Keep the HAVIT-specific implementation behind a stable device interface. Begin with simulator-only behavior; do not open or write to a physical device until identification and protocol work is complete.

## Why this fits the current repository

- The repository has no existing application stack or code that must be preserved.
- The project needs a rich interactive keyboard editor and a clear boundary between presentation and hardware operations.
- Rust can host the native device boundary in the same application process without introducing a separate service.
- The UI can remain useful in simulator mode while protocol research continues.

This is a starting decision, not a claim that a specific HID library or platform matrix has been validated. Select dependencies during scaffolding after checking their maintenance, Windows support, and licensing.

## Alternatives considered

| Option | Trade-off |
| --- | --- |
| C++ with Qt Quick/QML | Strong native UI and direct platform access; requires a larger C++/Qt stack for the desired UI and contributor workflow. Reconsider if Tauri HID support proves unsuitable. |
| Tauri with React, TypeScript, and Rust | Good fit for interactive UI plus an in-process native boundary; requires careful review of HID library support and packaging. Selected provisionally. |
| Electron with React and TypeScript | Mature UI ecosystem; larger runtime footprint and a native bridge is still needed for safe HID access. |
| React frontend plus a C++ engine | Clear separation but adds process/protocol/deployment complexity without a demonstrated need. |

## Boundaries

- UI components express desired configuration and preview state; they do not construct HID packets.
- Device services expose typed operations and capability/status data.
- The simulator implements the same high-level interface as a physical backend.
- The HAVIT backend owns matching, serialization, timing, and response handling.
- Persistence is versioned and local. Start with JSON profiles unless later requirements establish a need for SQLite.
- Logging is local and privacy-preserving; no telemetry or network service is needed by default.

## Revisit when

Reassess the decision if a maintained HID implementation cannot safely support the verified report type on the target Windows versions, if the desired platform support changes substantially, or if the UI requirements expose a clear limitation in Tauri.
