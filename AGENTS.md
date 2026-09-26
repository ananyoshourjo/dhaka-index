# Repository agent instructions

## GitHub publication and releases

When the user asks to publish or update GitHub, manage the entire pull request
and release lifecycle. Do not ask the user to choose or type a version.
Use the global `PHASE.MAJOR.MINOR` convention; repository rules and tools must
implement that convention rather than override it.

1. Compare the intended changes with the latest `v*` tag and select the highest
   applicable release impact:
   - `none`: documentation, CI/release plumbing, tests, or data-only job-feed
     refreshes with no application behavior change.
   - `minor`: backward-compatible fixes, security/performance improvements,
     dependency updates, or small usability improvements; increment the third
     `MINOR` component.
   - `major`: backward-compatible features, meaningful workflow/UI additions,
     new sources, additive schema/configuration changes, or incompatible public
     contracts; increment `MAJOR` and reset `MINOR` to `0`.
   - `phase`: a rare lifecycle transition; increment `PHASE` and reset both
     other components to `0`.
2. For `minor`, `major`, or `phase`, run
   `node scripts/version.mjs bump <impact> --note "<release note>"` with one
   `--note` for each notable user-facing change. Never hand-edit version fields.
3. Include the synchronized version files and changelog in the product pull
   request. Use the highest impact when a publication contains several changes.
4. Run `npm run verify`, publish the branch, wait for all GitHub checks, and
   squash-merge when green and safe.
5. Tag the resulting `main` merge commit with the prepared version
   (`v<PHASE>.<MAJOR>.<MINOR>`), push the tag, and verify that the Release
   workflow created the matching GitHub Release.
6. Never tag a feature branch, release failing checks, or republish an existing
   version. Keep unrelated local work out of the release.

Use numeric versions and tags in `PHASE.MAJOR.MINOR` and `vPHASE.MAJOR.MINOR`
format, with no patch component. Keep `PHASE` stable except for lifecycle
transitions: phase `0` is alpha/beta, phase `1` is a completed app, and phase `2`
is a complete rewrite or brand change. Fixes increment `MINOR`; features and
meaningful workflow additions increment `MAJOR`. Historical tags are not
renamed unless the user explicitly requests a correction; document deliberate
corrections and keep all current version surfaces synchronized.

The root app, admin portal, package lock, changelog, Git tag, and GitHub Release
tag must always agree on the same version. A GitHub Release display title is
separate metadata. The public crawler boundary still applies: never publish
private crawler code, browser state, SQLite data, logs, or secrets.
