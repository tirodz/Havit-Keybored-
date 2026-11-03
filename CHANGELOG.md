# Changelog

All notable changes to HAVIT Gaming Control Center are recorded here.

## Unreleased — 2026-11-02

- Established an Electron and React desktop application structure.
- Added overview, lighting preview, key editor, macro editor, profile, diagnostics, and settings views.
- Reconstructed a 67-key simulator layout from the installed vendor app's layout configuration without copying its artwork.
- Added local profile persistence and validated JSON import/export.
- Added simulator provider and initial unit coverage.
- Documented the current hardware evidence, unknown protocol, and physical-device implementation gate.
- Added repository contribution, security, attribution, build, and release-readiness documentation.

## Unreleased — 2026-11-03

- Added a KB874L-filtered WebHID connection check in Diagnostics with explicit interface selection when multiple matches are present.
- Restricted Electron HID permissions to the app window; the connection flow opens/closes an interface and sends no reports.
- Reconciled installer and installed-driver hashes and updated protocol notes with the remaining transport differences.
