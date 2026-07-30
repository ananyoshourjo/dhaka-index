# Releases

Dhaka Index uses Semantic Versioning with `vMAJOR.MINOR.PATCH` Git tags.
Versions are managed by the publishing agent rather than entered manually.

- **Patch** releases contain backward-compatible fixes, security updates,
  performance improvements, dependency updates, or small usability repairs.
- **Minor** releases contain backward-compatible features, meaningful UI or
  workflow additions, new job sources, or additive schema/configuration work.
- **Major** releases contain incompatible public contracts after `v1.0.0`.
  During the `0.x` phase, incompatible changes advance the minor version and
  are called out prominently in the release notes.
- Documentation, CI-only work, tests, and data-only feed refreshes do not create
  an application release.

For a release-bearing publication, the agent runs:

```powershell
node scripts/version.mjs bump minor `
  --note "Add the new user-facing capability" `
  --note "Improve the related workflow"
```

The script updates both application packages, `package-lock.json`, and
`CHANGELOG.md` together. CI rejects mismatched versions. After the verified pull
request is squash-merged, the agent tags that merge commit and pushes the tag.
The Release workflow validates the tag, reruns the full verification suite, and
creates the corresponding GitHub Release from the curated changelog entry.
