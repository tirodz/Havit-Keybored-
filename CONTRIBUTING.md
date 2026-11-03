# Contributing

Thanks for helping improve HAVIT Gaming Control Center. This is an independent community project. Contributions should keep the application honest about what has and has not been tested on a physical keyboard.

## Before opening a pull request

1. Open an issue describing the problem or proposed change when the work affects hardware support, the data model, or the user experience substantially.
2. Keep UI simulator behavior distinct from confirmed device state.
3. Include evidence and hardware/software revision details for protocol or compatibility claims. Do not submit guessed physical-device reports.
4. Add or update tests for changes to validation, profile behavior, or simulator state.
5. Run `npm run build` and `npm test` locally, and describe the results in the pull request.
6. Keep changes focused and include screenshots for visible UI changes once the desktop app can be reviewed.

## Development setup

Use Node.js 22.12 or newer. Run `npm install`, then `npm run dev` for the renderer or `npm run desktop:dev` for the Electron application. See the README for build commands and project structure.

## Attribution

Do not add names, email addresses, assets, or third-party code without a reliable source and permission or license basis. Preserve upstream copyright notices. See `THIRD_PARTY_NOTICES.md`.

## Pull requests

Use a clear title, explain the user impact, list validation performed, and link any related issue. Do not claim that untested hardware behavior is supported.
