# Nexus Build System

This directory is the active profile-driven build entrypoint for Nexus.

Current scope:

1. Load a build profile from `profiles/builds/`
2. Load a feature profile from `profiles/features/`
3. Resolve them into a build plan
4. Run read-only validation checks
5. Execute frontend build
6. Execute PyInstaller packaging
7. Stage final artifacts under `artifacts/`
8. Generate `artifact-manifest.json`
9. Resolve bundled tools from `tools/manifests/tools.json`
10. Run macOS `xattr` cleanup and attempt final `codesign` for `.app` artifacts

Current read-only checks:

1. Frontend package and build script presence
2. Python requirements presence
3. Frontend `dist/index.html` presence
4. `config/versions.json` presence and parseability
5. PyInstaller entrypoint and icon asset presence
6. Workspace package paths used by the unified executor
7. `npm` and `PyInstaller` discoverability
8. Artifact output path policy
9. Target-OS bundled tool asset resolution
10. macOS `xattr` and `codesign` availability for app packaging

Current non-goals:

1. Production-grade signing and notarization automation
2. Full tool-manifest governance for every bundled dependency
3. CI matrix orchestration

Example:

```bash
/Users/celestialpaler/Documents/Arsenal/.venv/bin/python build-system/build.py \
  --build-profile macos-demo \
  --feature-profile demo \
  --execute
```

The root PowerShell wrappers now delegate to this entrypoint, so profile resolution, validation, packaging, artifact staging, and manifest writing happen in one place.

Bundled tool inclusion now comes from `tools/manifests/tools.json`, not from hard-coded directory guesses.

On macOS, the executor clears extended attributes before packaging, then performs a final signing attempt on the staged `.app`. If that signing attempt still fails because of bundle contents emitted by PyInstaller, the build completes and reports a `codesign-warn` step instead of aborting artifact creation.