# Releases

Dhaka Index uses the global `PHASE.MAJOR.MINOR` convention and
`vPHASE.MAJOR.MINOR` Git tags, with no patch component. Versions are managed by
the publishing agent rather than entered manually.

- **Minor** releases increment the third component for backward-compatible
  fixes, security/performance improvements, dependency updates, or small
  usability improvements.
- **Major** releases increment the second component for backward-compatible
  features, meaningful UI or workflow additions, new job sources, additive
  schema/configuration work, or incompatible public contracts.
- **Phase** releases are rare lifecycle transitions: phase `0` is alpha or
  beta, phase `1` is a completed app, and phase `2` is a complete rewrite or
  brand change. A phase transition resets both other components to `0`.
- Documentation, CI-only work, tests, and data-only feed refreshes do not create
  an application release.

The preceding release was deliberately corrected from `v1.7.0` to `v1.6.6` at the
user's request, following the previous `v1.6.5` tag. Its release notes and
GitHub Release display title remain unchanged; the tag, packages, lockfile, and
changelog use `1.6.6`. The correction command was:

```powershell
node scripts/version.mjs correct-release --from 1.7.0 --to 1.6.6
```

Earlier historical tags remain untouched. The new job-description workflow is
a separate feature release at `1.7.0`, following the corrected `1.6.6` baseline.

For a fix, feature, or lifecycle transition, the agent runs:

```powershell
node scripts/version.mjs bump minor `
  --note "Fix an existing user workflow" `
  --note "Improve the related experience"
```

Use `bump major` for a feature or meaningful workflow addition and `bump phase`
only for a lifecycle transition.

The script updates both application packages, `package-lock.json`, and
`CHANGELOG.md` together. CI rejects mismatched versions. After the verified pull
request is squash-merged, the agent tags that merge commit and pushes the tag.
The Release workflow validates the tag, reruns the full verification suite, and
creates the corresponding GitHub Release from the curated changelog entry.
