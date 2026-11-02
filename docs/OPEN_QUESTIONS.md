# Open questions

## Installer

- Can the installer payload be extracted without running it, and what files does it contain?
- What are the exact architecture, dependencies, and imports of the main executable?
- Which configuration and layout files define the official application's device assumptions?
- Does the application bundle a firmware image or updater, and what is its role?

## Hardware identity

- What VID/PID, interface numbers, usage page/usage, serial number, and report descriptor does the target keyboard actually expose?
- Are there multiple KB874L hardware revisions with different descriptors or capabilities?
- Can identity be established without relying on the reported Apple VID `05AC` alone?

## Protocol and capabilities

- What are the exact feature-report fields and report ID?
- Which commands are read-only, and which change device state?
- What are the confirmed meanings and valid parameter ranges for each command?
- Is there a checksum, sequence number, acknowledgment, or read-back operation?
- Which lighting modes and parameters are truly supported?
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
