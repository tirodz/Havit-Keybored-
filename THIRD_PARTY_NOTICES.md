# Third-party notices

## Runtime and development dependencies

Application and build dependencies are declared with exact versions in `package.json`; the resolved dependency graph is recorded in `pnpm-lock.yaml`. The generated [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md) lists package license metadata found in the installed pnpm store. Regenerate it with `pnpm licenses:report` after installing dependencies and changing the lockfile.

The inventory is not itself a replacement for license texts or notices required by individual licenses. A release checklist must review package license files, confirm which packages are shipped, and include every required notice in distributable artifacts.

## Assets

No vendor driver artwork, keyboard images, fonts, or other third-party visual assets are copied into this repository. The keyboard diagram is rendered from coordinate data read from the installed driver's layout XML. HAVIT and KB874L are used only to identify the target product; this project is not endorsed by HAVIT.

## Open-source license status

The repository does not currently include a project license. MIT has been proposed for maintainer review, but no license has been selected or granted. Until the maintainer adds a license, do not assume permission to reuse this project's code.
