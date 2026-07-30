# Repository agent instructions

## GitHub publication and releases

When the user asks to publish or update GitHub, manage the entire pull request
and release lifecycle. Do not ask the user to choose or type a version.

1. Compare the intended changes with the latest `v*` tag and select the highest
   applicable release impact:
   - `none`: documentation, CI/release plumbing, tests, or data-only job-feed
     refreshes with no application behavior change.
   - `patch`: backward-compatible bug, security, performance, dependency, or
     small usability fixes.
   - `minor`: backward-compatible features, meaningful workflow/UI additions,
     new sources, or additive schema/configuration changes.
   - `major`: incompatible public API, data, configuration, or deployment
     changes after `v1.0.0`. Before `v1.0.0`, treat breaking changes as `minor`
     and explain the compatibility impact in the release notes.
2. For `patch`, `minor`, or `major`, run
   `node scripts/version.mjs bump <impact> --note "<release note>"` with one
   `--note` for each notable user-facing change. Never hand-edit version fields.
3. Include the synchronized version files and changelog in the product pull
   request. Use the highest impact when a publication contains several changes.
4. Run `npm run verify`, publish the branch, wait for all GitHub checks, and
   squash-merge when green and safe.
5. Tag the resulting `main` merge commit with the prepared version
   (`v<version>`), push the tag, and verify that the Release workflow created
   the matching GitHub Release.
6. Never tag a feature branch, release failing checks, or republish an existing
   version. Keep unrelated local work out of the release.

The root app, admin portal, package lock, changelog, Git tag, and GitHub Release
must always agree on the same version. The public crawler boundary still
applies: never publish private crawler code, browser state, SQLite data, logs,
or secrets.
