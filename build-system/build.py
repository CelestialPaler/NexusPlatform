from __future__ import annotations

import argparse
import importlib.util
import json
import platform
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from shutil import which
from typing import Any

from profile_loader import ProfileLoadError, load_named_profile


TOOL_MANIFEST_PATH = Path("tools/manifests/tools.json")


def detect_host_os() -> str:
    system_name = platform.system().lower()
    mapping = {
        "darwin": "macos",
        "windows": "windows",
        "linux": "linux",
    }
    return mapping.get(system_name, system_name)


def load_app_version(root_dir: Path) -> str:
    versions_json = root_dir / "nexus-platform" / "config" / "versions.json"
    if not versions_json.exists():
        return "0.0.0"

    try:
        versions_data = json.loads(versions_json.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return "0.0.0"

    return str(versions_data.get("app") or "0.0.0")


def get_git_revision(root_dir: Path) -> str | None:
    try:
        result = subprocess.run(
            ["git", "-C", str(root_dir), "rev-parse", "--short", "HEAD"],
            capture_output=True,
            check=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None

    revision = result.stdout.strip()
    return revision or None


def default_application_name(build_name: str) -> str:
    return "NexusPlatform_Debug" if "debug" in build_name else "NexusPlatform"


def resolve_artifact_name(build_profile: dict[str, Any], app_version: str) -> str:
    template = build_profile.get("artifactNameTemplate")
    application_name = build_profile.get("applicationName") or default_application_name(
        build_profile.get("name", "")
    )
    if template:
        return template.format(appVersion=app_version, applicationName=application_name)
    return application_name


def get_data_separator() -> str:
    return ";" if sys.platform == "win32" else ":"


def pyinstaller_output_suffix(packaging: dict[str, Any], target_os: str) -> str:
    output_format = packaging.get("format", "")
    if output_format == "app":
        return ".app"
    if target_os == "windows":
        return ".exe"
    return ""


def command_display(parts: list[str]) -> str:
    return " ".join(parts)


def run_command(command: list[str], cwd: Path) -> None:
    print(f"[build-system] Running: {command_display(command)}")
    subprocess.run(command, cwd=cwd, check=True)


def load_tool_manifest(root_dir: Path) -> dict[str, Any]:
    manifest_path = root_dir / TOOL_MANIFEST_PATH
    if not manifest_path.exists():
        return {"schemaVersion": 1, "tools": {}}

    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise RuntimeError(f"Tool manifest must contain a top-level object: {manifest_path}")
    if not isinstance(data.get("tools", {}), dict):
        raise RuntimeError(f"Tool manifest 'tools' field must be an object: {manifest_path}")
    return data


def resolve_tool_platform_entry(
    root_dir: Path,
    tool_name: str,
    target_os: str,
    tool_manifest: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    manifest = tool_manifest or load_tool_manifest(root_dir)
    tool_entry = manifest.get("tools", {}).get(tool_name)
    if not isinstance(tool_entry, dict):
        return None

    platform_entry = tool_entry.get(target_os)
    return platform_entry if isinstance(platform_entry, dict) else None


def resolve_tool_sources(
    root_dir: Path,
    tool_name: str,
    target_os: str,
    tool_manifest: dict[str, Any] | None = None,
) -> list[Path]:
    platform_entry = resolve_tool_platform_entry(root_dir, tool_name, target_os, tool_manifest)
    if platform_entry is None:
        return []

    assets = platform_entry.get("assets", [])
    if not isinstance(assets, list):
        return []

    resolved_paths: list[Path] = []
    for asset in assets:
        if not isinstance(asset, str):
            continue
        asset_path = root_dir / asset
        if asset_path.exists():
            resolved_paths.append(asset_path)
    return resolved_paths


def resolve_bundled_tool_assets(
    root_dir: Path,
    bundled_tools: list[str],
    target_os: str,
    tool_manifest: dict[str, Any] | None = None,
) -> list[Path]:
    manifest = tool_manifest or load_tool_manifest(root_dir)
    resolved: dict[str, Path] = {}

    for tool_name in bundled_tools:
        for asset_path in resolve_tool_sources(root_dir, tool_name, target_os, manifest):
            resolved[str(asset_path.relative_to(root_dir))] = asset_path

    return [resolved[key] for key in sorted(resolved)]


def clean_macos_extended_attributes(root_dir: Path, targets: list[Path]) -> list[dict[str, str]]:
    if detect_host_os() != "macos" or which("xattr") is None:
        return []

    existing_targets: list[Path] = []
    seen: set[Path] = set()
    for target in targets:
        if target.exists() and target not in seen:
            seen.add(target)
            existing_targets.append(target)

    if not existing_targets:
        return []

    for target in existing_targets:
        run_command(["xattr", "-cr", str(target)], cwd=root_dir)

    details = ", ".join(str(target.relative_to(root_dir)) for target in existing_targets)
    return [{"step": "xattr-clean", "detail": f"Cleared macOS extended attributes for {details}"}]


def sign_macos_bundle(root_dir: Path, bundle_path: Path, signing: dict[str, Any]) -> list[dict[str, str]]:
    if detect_host_os() != "macos" or bundle_path.suffix != ".app":
        return []
    if which("codesign") is None:
        return []

    ad_hoc = bool(signing.get("adHoc"))
    signing_enabled = bool(signing.get("enabled"))
    if not ad_hoc and not signing_enabled:
        return []

    identity = signing.get("identity") or "-"
    command = ["codesign", "--force", "--deep", "--sign", identity]
    if signing_enabled and identity != "-":
        command.append("--timestamp")
    command.append(str(bundle_path))
    try:
        run_command(command, cwd=root_dir)

        verify_command = ["codesign", "--verify", "--deep", "--strict", str(bundle_path)]
        run_command(verify_command, cwd=root_dir)
    except subprocess.CalledProcessError as exc:
        return [
            {
                "step": "codesign-warn",
                "detail": (
                    f"Signing attempt failed for {bundle_path.relative_to(root_dir)} "
                    f"(exit {exc.returncode}); manual macOS signing may still be required."
                ),
            }
        ]

    mode = "ad-hoc signed" if identity == "-" else f"signed with identity {identity}"
    return [
        {"step": "codesign", "detail": f"{mode} {bundle_path.relative_to(root_dir)}"},
        {"step": "codesign-verify", "detail": f"Verified {bundle_path.relative_to(root_dir)}"},
    ]


def copy_path(source: Path, destination: Path) -> None:
    if source.is_dir():
        shutil.copytree(source, destination, dirs_exist_ok=True, copy_function=shutil.copy)
    else:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(source, destination)


def stage_frontend(root_dir: Path) -> list[dict[str, str]]:
    frontend_dir = root_dir / "nexus-platform" / "frontend"
    actions: list[dict[str, str]] = []
    node_modules_dir = frontend_dir / "node_modules"

    if not node_modules_dir.exists():
        run_command(["npm", "install"], cwd=frontend_dir)
        actions.append({"step": "frontend-install", "detail": "npm install"})

    run_command(["npm", "run", "build"], cwd=frontend_dir)
    actions.append({"step": "frontend-build", "detail": "npm run build"})
    return actions


def build_pyinstaller_bundle(root_dir: Path, plan: dict[str, Any]) -> tuple[Path, list[dict[str, str]]]:
    build_profile = plan["buildProfile"]
    packaging = build_profile.get("packaging", {})
    platform_dir = root_dir / "nexus-platform"
    app_name = build_profile.get("applicationName") or default_application_name(build_profile["name"])
    entrypoint = root_dir / build_profile.get("entryPoint", "nexus-platform/run.py")
    icon_path = platform_dir / "assets" / "icon.ico"
    icon_path_icns = platform_dir / "assets" / "icon.icns"

    staging_root = root_dir / ".build-system" / build_profile["name"]
    dist_dir = staging_root / "dist"
    work_dir = staging_root / "work"

    if staging_root.exists():
        shutil.rmtree(staging_root)
    staging_root.mkdir(parents=True, exist_ok=True)

    actions: list[dict[str, str]] = []
    if build_profile.get("targetOs") == "macos" and packaging.get("format") == "app":
        actions.extend(
            clean_macos_extended_attributes(
                root_dir,
                [
                    platform_dir / "dist",
                    platform_dir / "backend",
                    platform_dir / "config",
                    platform_dir / "assets",
                    entrypoint,
                ],
            )
        )

    command = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--noconfirm",
        "--clean",
        "--name",
        app_name,
        "--distpath",
        str(dist_dir),
        "--workpath",
        str(work_dir),
        "--paths",
        str(root_dir / "nexus-core"),
        "--paths",
        str(root_dir / "nexus-contracts" / "src"),
        "--add-data",
        f"{platform_dir / 'dist'}{get_data_separator()}dist",
        "--add-data",
        f"{platform_dir / 'backend'}{get_data_separator()}backend",
        "--add-data",
        f"{platform_dir / 'config'}{get_data_separator()}config",
        "--add-data",
        f"{platform_dir / 'assets'}{get_data_separator()}assets",
        "--hidden-import",
        "nexus_core",
        "--hidden-import",
        "nexus_contracts",
    ]

    if packaging.get("mode") == "one-file":
        command.append("--onefile")
    else:
        command.append("--onedir")

    if packaging.get("console"):
        command.append("--console")
    else:
        command.append("--windowed")

    if build_profile.get("targetOs") == "windows" and icon_path.exists():
        command.extend(["--icon", str(icon_path)])
    elif build_profile.get("targetOs") == "macos" and icon_path_icns.exists():
        command.extend(["--icon", str(icon_path_icns)])

    command.append(str(entrypoint))
    run_command(command, cwd=platform_dir)

    bundle_path = dist_dir / f"{app_name}{pyinstaller_output_suffix(packaging, build_profile['targetOs'])}"
    if not bundle_path.exists():
        raise RuntimeError(f"Expected PyInstaller output not found: {bundle_path}")

    actions.append(
        {
            "step": "pyinstaller",
            "detail": f"Built {bundle_path.relative_to(root_dir)}",
        }
    )
    return bundle_path, actions


def stage_artifact(root_dir: Path, plan: dict[str, Any], bundle_path: Path) -> dict[str, Any]:
    build_profile = plan["buildProfile"]
    artifact_name = resolve_artifact_name(build_profile, plan["appVersion"])
    artifact_dir = root_dir / build_profile["artifactBaseDir"] / artifact_name
    resources = build_profile.get("resources", {})
    bundle_dirs = resources.get("bundleDirs", [])
    create_dirs = resources.get("createDirs", [])
    bundled_tools = build_profile.get("bundledTools", [])
    target_os = build_profile.get("targetOs", "")
    tool_manifest = load_tool_manifest(root_dir)

    if artifact_dir.exists():
        shutil.rmtree(artifact_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    output_path = artifact_dir / bundle_path.name
    copy_path(bundle_path, output_path)

    copied_resources: list[str] = [str(output_path.relative_to(root_dir))]
    resolved_tool_roots: list[str] = []

    for directory_name in bundle_dirs:
        if directory_name == "tools":
            tool_assets = resolve_bundled_tool_assets(root_dir, bundled_tools, target_os, tool_manifest)
            if not tool_assets:
                continue

            for tool_asset in tool_assets:
                destination = artifact_dir / tool_asset.relative_to(root_dir)
                copy_path(tool_asset, destination)
                copied_resources.append(str(destination.relative_to(root_dir)))
                resolved_tool_roots.append(str(destination.relative_to(root_dir)))
            continue

        source = root_dir / "nexus-platform" / directory_name
        if source.exists():
            destination = artifact_dir / directory_name
            copy_path(source, destination)
            copied_resources.append(str(destination.relative_to(root_dir)))

    for directory_name in create_dirs:
        destination = artifact_dir / directory_name
        destination.mkdir(parents=True, exist_ok=True)
        copied_resources.append(str(destination.relative_to(root_dir)))

    manifest = {
        "applicationName": build_profile.get("applicationName") or default_application_name(build_profile["name"]),
        "artifactName": artifact_name,
        "appVersion": plan["appVersion"],
        "gitRevision": plan.get("gitRevision"),
        "buildTimeUtc": datetime.now(timezone.utc).isoformat(),
        "buildProfile": build_profile["name"],
        "featureProfile": plan["featureProfile"]["name"],
        "hostOs": plan["hostOs"],
        "targetOs": build_profile.get("targetOs"),
        "packaging": build_profile.get("packaging", {}),
        "bundlePath": str(output_path.relative_to(root_dir)),
        "artifactDir": str(artifact_dir.relative_to(root_dir)),
        "bundledToolsDeclared": bundled_tools,
        "bundledToolAssets": resolved_tool_roots,
        "copiedResources": copied_resources,
    }

    manifest_path = artifact_dir / "artifact-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    return {
        "artifactDir": str(artifact_dir.relative_to(root_dir)),
        "bundlePath": str(output_path.relative_to(root_dir)),
        "manifestPath": str(manifest_path.relative_to(root_dir)),
        "copiedResources": copied_resources,
        "bundledToolAssets": resolved_tool_roots,
    }


def execute_build(root_dir: Path, plan: dict[str, Any]) -> dict[str, Any]:
    if not plan["compatibility"]["hostSupported"]:
        raise RuntimeError("The selected build profile does not allow execution on the current host OS.")

    execution_steps: list[dict[str, str]] = []
    execution_steps.extend(stage_frontend(root_dir))
    bundle_path, pyinstaller_steps = build_pyinstaller_bundle(root_dir, plan)
    execution_steps.extend(pyinstaller_steps)
    artifact = stage_artifact(root_dir, plan, bundle_path)

    staged_bundle_path = root_dir / artifact["bundlePath"]
    execution_steps.extend(clean_macos_extended_attributes(root_dir, [staged_bundle_path]))
    execution_steps.extend(sign_macos_bundle(root_dir, staged_bundle_path, plan["buildProfile"].get("signing", {})))

    execution_steps.append(
        {
            "step": "artifact-stage",
            "detail": f"Staged artifact at {artifact['artifactDir']}",
        }
    )

    return {
        "status": "built",
        "steps": execution_steps,
        "artifact": artifact,
    }


def build_plan(root_dir: Path, build_name: str, feature_name: str) -> dict[str, Any]:
    build_profile, build_profile_path = load_named_profile(root_dir / "profiles" / "builds", build_name)
    feature_profile, feature_profile_path = load_named_profile(root_dir / "profiles" / "features", feature_name)

    host_os = detect_host_os()
    allowed_hosts = build_profile.get("allowedHostOs", [])
    host_supported = not allowed_hosts or host_os in allowed_hosts

    warnings: list[str] = []
    if not host_supported:
        warnings.append(
            f"Host OS '{host_os}' is not in allowedHostOs={allowed_hosts} for build profile '{build_name}'."
        )

    artifact_base_dir = build_profile.get("artifacts", {}).get("baseDir", "artifacts")

    return {
        "status": "plan-only",
        "rootDir": str(root_dir),
        "appVersion": load_app_version(root_dir),
        "gitRevision": get_git_revision(root_dir),
        "hostOs": host_os,
        "buildProfile": {
            "name": build_profile.get("name", build_name),
            "path": str(build_profile_path.relative_to(root_dir)),
            "targetOs": build_profile.get("targetOs"),
            "allowedHostOs": allowed_hosts,
            "includeDebugInfo": build_profile.get("includeDebugInfo", False),
            "applicationName": build_profile.get("applicationName") or default_application_name(build_name),
            "artifactNameTemplate": build_profile.get("artifactNameTemplate"),
            "entryPoint": build_profile.get("entryPoint", "nexus-platform/run.py"),
            "packaging": build_profile.get("packaging", {}),
            "signing": build_profile.get("signing", {}),
            "bundledTools": build_profile.get("bundledTools", []),
            "resources": build_profile.get("resources", {}),
            "artifactBaseDir": artifact_base_dir,
        },
        "featureProfile": {
            "name": feature_profile.get("name", feature_name),
            "path": str(feature_profile_path.relative_to(root_dir)),
            "features": feature_profile.get("features", {}),
            "externalDependencies": feature_profile.get("externalDependencies", {}),
            "uiVisibility": feature_profile.get("uiVisibility", {}),
        },
        "compatibility": {
            "hostSupported": host_supported,
        },
        "nextStep": "Add signing, richer tool manifests, and more profiles after the unified executor fully owns current release flows.",
        "warnings": warnings,
    }


def run_readonly_validation(root_dir: Path, plan: dict[str, Any]) -> dict[str, Any]:
    checks: list[dict[str, str]] = []
    errors: list[str] = []
    warnings: list[str] = list(plan.get("warnings", []))

    def record_check(name: str, status: str, detail: str) -> None:
        checks.append({"name": name, "status": status, "detail": detail})

    frontend_dir = root_dir / "nexus-platform" / "frontend"
    platform_dir = root_dir / "nexus-platform"
    package_json = frontend_dir / "package.json"
    requirements_txt = platform_dir / "requirements.txt"
    entrypoint = platform_dir / "dist" / "index.html"
    versions_json = platform_dir / "config" / "versions.json"
    tool_manifest_path = root_dir / TOOL_MANIFEST_PATH
    run_entrypoint = root_dir / plan.get("buildProfile", {}).get("entryPoint", "nexus-platform/run.py")
    assets_icon = platform_dir / "assets" / "icon.ico"
    assets_icon_icns = platform_dir / "assets" / "icon.icns"
    core_dir = root_dir / "nexus-core"
    contracts_dir = root_dir / "nexus-contracts" / "src"

    if package_json.exists():
        record_check("frontend-package", "pass", "Found nexus-platform/frontend/package.json")
        try:
            package_data = json.loads(package_json.read_text(encoding="utf-8"))
            build_script = package_data.get("scripts", {}).get("build")
            if build_script:
                record_check("frontend-build-script", "pass", f"Found frontend build script: {build_script}")
            else:
                errors.append("Frontend package.json does not define a build script.")
                record_check("frontend-build-script", "fail", "Missing scripts.build in package.json")
        except json.JSONDecodeError as exc:
            errors.append(f"Failed to parse frontend package.json: {exc}")
            record_check("frontend-package-json", "fail", f"Invalid JSON: {exc}")
    else:
        errors.append("Missing nexus-platform/frontend/package.json")
        record_check("frontend-package", "fail", "Missing nexus-platform/frontend/package.json")

    if requirements_txt.exists():
        record_check("python-requirements", "pass", "Found nexus-platform/requirements.txt")
    else:
        errors.append("Missing nexus-platform/requirements.txt")
        record_check("python-requirements", "fail", "Missing nexus-platform/requirements.txt")

    if versions_json.exists():
        try:
            versions_data = json.loads(versions_json.read_text(encoding="utf-8"))
            app_version = versions_data.get("app")
            if app_version:
                record_check("version-file", "pass", f"Found config/versions.json with app={app_version}")
            else:
                warnings.append("config/versions.json exists but does not define an app version.")
                record_check("version-file", "warn", "config/versions.json missing 'app' field")
        except json.JSONDecodeError as exc:
            errors.append(f"Failed to parse config/versions.json: {exc}")
            record_check("version-file", "fail", f"Invalid JSON: {exc}")
    else:
        warnings.append("config/versions.json is missing; release packaging will fall back to 0.0.0.")
        record_check("version-file", "warn", "config/versions.json not found")

    tool_manifest: dict[str, Any] | None = None
    if tool_manifest_path.exists():
        try:
            tool_manifest = load_tool_manifest(root_dir)
            record_check("tool-manifest", "pass", f"Found tool manifest {tool_manifest_path.relative_to(root_dir)}")
        except (json.JSONDecodeError, RuntimeError) as exc:
            errors.append(f"Failed to parse tool manifest: {exc}")
            record_check("tool-manifest", "fail", f"Invalid tool manifest: {exc}")
    else:
        warnings.append("tools/manifests/tools.json is missing; bundled tool resolution will fall back to empty results.")
        record_check("tool-manifest", "warn", "tools/manifests/tools.json not found")

    if core_dir.exists():
        record_check("workspace-core", "pass", "Found nexus-core workspace package")
    else:
        errors.append("Missing nexus-core workspace directory")
        record_check("workspace-core", "fail", "nexus-core directory not found")

    if contracts_dir.exists():
        record_check("workspace-contracts", "pass", "Found nexus-contracts/src workspace package")
    else:
        warnings.append("nexus-contracts/src is missing; contract package migration has not been initialized.")
        record_check("workspace-contracts", "warn", "nexus-contracts/src directory not found")

    if entrypoint.exists():
        record_check("frontend-dist", "pass", "Found built frontend entrypoint dist/index.html")
    else:
        warnings.append("Frontend bundle dist/index.html is missing; GUI packaging should build frontend first.")
        record_check("frontend-dist", "warn", "dist/index.html not found yet")

    if run_entrypoint.exists():
        record_check("pyinstaller-entrypoint", "pass", f"Found entrypoint {run_entrypoint.relative_to(root_dir)}")
    else:
        errors.append(f"Missing PyInstaller entrypoint: {run_entrypoint}")
        record_check("pyinstaller-entrypoint", "fail", f"Missing entrypoint {run_entrypoint.relative_to(root_dir)}")

    if assets_icon.exists():
        record_check("platform-icon", "pass", "Found platform icon asset nexus-platform/assets/icon.ico")
    else:
        warnings.append("nexus-platform/assets/icon.ico is missing; Windows packaging will not embed an icon.")
        record_check("platform-icon", "warn", "Missing nexus-platform/assets/icon.ico")
    if assets_icon_icns.exists():
        record_check("platform-icon-icns", "pass", "Found macOS icon asset nexus-platform/assets/icon.icns")
    else:
        warnings.append("nexus-platform/assets/icon.icns is missing; macOS packaging will not embed an icon.")
        record_check("platform-icon-icns", "warn", "Missing nexus-platform/assets/icon.icns")

    npm_path = which("npm")
    if npm_path:
        record_check("npm", "pass", f"Found npm at {npm_path}")
    else:
        warnings.append("npm is not available in PATH; frontend build cannot run from this shell.")
        record_check("npm", "warn", "npm not found in PATH")

    pyinstaller_spec = importlib.util.find_spec("PyInstaller")
    if pyinstaller_spec is not None:
        record_check("pyinstaller", "pass", "PyInstaller module is importable in the current Python environment")
    else:
        pyinstaller_path = which("pyinstaller")
        if pyinstaller_path:
            warnings.append(
                "pyinstaller executable exists in PATH, but the current Python environment cannot import PyInstaller."
            )
            record_check("pyinstaller", "warn", f"Executable found at {pyinstaller_path}, but Python module import failed")
        else:
            warnings.append(
                "PyInstaller is not importable in the current Python environment; the unified executor relies on 'python -m PyInstaller'."
            )
            record_check("pyinstaller", "warn", "PyInstaller module is not importable and no executable was found in PATH")

    target_os = plan.get("buildProfile", {}).get("targetOs", "")
    packaging = plan.get("buildProfile", {}).get("packaging", {})
    if target_os == "macos" and packaging.get("format") == "app":
        xattr_path = which("xattr")
        if xattr_path:
            record_check("xattr", "pass", f"Found xattr at {xattr_path}")
        else:
            warnings.append("xattr is not available in PATH; macOS bundle cleanup will be skipped.")
            record_check("xattr", "warn", "xattr not found in PATH")

        codesign_path = which("codesign")
        if codesign_path:
            record_check("codesign", "pass", f"Found codesign at {codesign_path}")
        else:
            warnings.append("codesign is not available in PATH; macOS app signing will be skipped.")
            record_check("codesign", "warn", "codesign not found in PATH")

    artifact_base_dir = plan.get("buildProfile", {}).get("artifactBaseDir", "")
    if artifact_base_dir.startswith("artifacts/"):
        record_check("artifact-path-policy", "pass", f"Artifact path follows artifacts/ policy: {artifact_base_dir}")
    else:
        warnings.append(f"Artifact baseDir '{artifact_base_dir}' is outside the recommended artifacts/ tree.")
        record_check("artifact-path-policy", "warn", f"Non-standard artifact path: {artifact_base_dir}")

    bundled_tools = plan.get("buildProfile", {}).get("bundledTools", [])
    for tool_name in bundled_tools:
        tool_sources = resolve_tool_sources(root_dir, tool_name, target_os, tool_manifest)
        if tool_sources:
            tool_detail = ", ".join(str(path.relative_to(root_dir)) for path in tool_sources)
            record_check(f"tool-{tool_name}", "pass", f"Resolved candidate assets: {tool_detail}")
        else:
            warnings.append(f"Bundled tool '{tool_name}' is declared in the build profile but no matching asset was found.")
            record_check(f"tool-{tool_name}", "warn", f"No matching asset for {tool_name}")

    validation = {
        "status": "pass" if not errors else "fail",
        "checks": checks,
        "warnings": warnings,
        "errors": errors,
    }
    return validation


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Resolve Nexus build and feature profiles into a build plan."
    )
    parser.add_argument(
        "--build-profile",
        required=True,
        help="Build profile name under profiles/builds/, e.g. windows-release",
    )
    parser.add_argument(
        "--feature-profile",
        required=True,
        help="Feature profile name under profiles/features/, e.g. demo",
    )
    parser.add_argument(
        "--output-format",
        choices=["text", "json"],
        default="text",
        help="Render the resolved plan as text or JSON.",
    )
    parser.add_argument(
        "--strict-host",
        action="store_true",
        help="Exit with status 2 when the current host OS is not allowed by the build profile.",
    )
    parser.add_argument(
        "--validate-readonly",
        action="store_true",
        help="Run non-destructive repository validation checks and include the results in the plan output.",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Run the full profile-driven build pipeline: frontend build, PyInstaller packaging, artifact staging, and manifest writing.",
    )
    return parser.parse_args()


def render_text(plan: dict[str, Any]) -> str:
    build_profile = plan["buildProfile"]
    feature_profile = plan["featureProfile"]
    packaging = build_profile.get("packaging", {})
    signing = build_profile.get("signing", {})
    feature_flags = feature_profile.get("features", {})
    dependencies = feature_profile.get("externalDependencies", {})

    lines = [
        "Nexus build plan",
        f"  status           : {plan['status']}",
        f"  app version      : {plan.get('appVersion')}",
        f"  git revision     : {plan.get('gitRevision') or '(unknown)'}",
        f"  host OS          : {plan['hostOs']}",
        f"  build profile    : {build_profile['name']} ({build_profile['path']})",
        f"  feature profile  : {feature_profile['name']} ({feature_profile['path']})",
        f"  target OS        : {build_profile.get('targetOs')}",
        f"  host supported   : {'yes' if plan['compatibility']['hostSupported'] else 'no'}",
        f"  packaging        : {packaging.get('format', 'unknown')} / {packaging.get('mode', 'unknown')}",
        f"  artifact base    : {build_profile.get('artifactBaseDir')}",
        f"  signing enabled  : {'yes' if signing.get('enabled') else 'no'}",
        f"  bundled tools    : {', '.join(build_profile.get('bundledTools', [])) or '(none)'}",
        "  features:",
    ]

    for key, value in sorted(feature_flags.items()):
        lines.append(f"    - {key}: {value}")

    lines.append("  external dependencies:")
    for key, value in sorted(dependencies.items()):
        lines.append(f"    - {key}: {value}")

    if plan["warnings"]:
        lines.append("  warnings:")
        for warning in plan["warnings"]:
            lines.append(f"    - {warning}")

    validation = plan.get("validation")
    if validation:
        lines.append(f"  validation      : {validation['status']}")
        lines.append("  validation checks:")
        for check in validation["checks"]:
            lines.append(f"    - [{check['status']}] {check['name']}: {check['detail']}")
        if validation["warnings"]:
            lines.append("  validation warnings:")
            for warning in validation["warnings"]:
                lines.append(f"    - {warning}")
        if validation["errors"]:
            lines.append("  validation errors:")
            for error in validation["errors"]:
                lines.append(f"    - {error}")

    execution = plan.get("execution")
    if execution:
        lines.append(f"  execution       : {execution['status']}")
        lines.append("  execution steps:")
        for step in execution["steps"]:
            lines.append(f"    - {step['step']}: {step['detail']}")
        artifact = execution.get("artifact", {})
        if artifact:
            lines.append(f"  artifact dir     : {artifact.get('artifactDir')}")
            lines.append(f"  artifact bundle  : {artifact.get('bundlePath')}")
            lines.append(f"  manifest         : {artifact.get('manifestPath')}")

    lines.append(f"  next step        : {plan['nextStep']}")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    root_dir = Path(__file__).resolve().parent.parent

    try:
        plan = build_plan(root_dir, args.build_profile, args.feature_profile)
    except ProfileLoadError as exc:
        print(f"[build-system] {exc}", file=sys.stderr)
        return 1

    should_validate = args.validate_readonly or args.execute
    if should_validate:
        plan["validation"] = run_readonly_validation(root_dir, plan)

    if args.execute:
        if plan["validation"]["status"] == "fail":
            if args.output_format == "json":
                print(json.dumps(plan, indent=2, ensure_ascii=False))
            else:
                print(render_text(plan))
            return 3

        try:
            plan["execution"] = execute_build(root_dir, plan)
            plan["status"] = plan["execution"]["status"]
        except (OSError, RuntimeError, subprocess.CalledProcessError) as exc:
            print(f"[build-system] Build execution failed: {exc}", file=sys.stderr)
            return 4

    if args.output_format == "json":
        print(json.dumps(plan, indent=2, ensure_ascii=False))
    else:
        print(render_text(plan))

    if (args.strict_host or args.execute) and not plan["compatibility"]["hostSupported"]:
        return 2

    if should_validate and plan["validation"]["status"] == "fail":
        return 3

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
