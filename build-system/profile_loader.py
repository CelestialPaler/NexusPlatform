from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class ProfileLoadError(RuntimeError):
    pass


def load_named_profile(profile_dir: Path, name: str) -> tuple[dict[str, Any], Path]:
    candidates = [
        profile_dir / f"{name}.json",
        profile_dir / f"{name}.yaml",
        profile_dir / f"{name}.yml",
    ]

    for candidate in candidates:
        if candidate.exists():
            return _load_profile(candidate), candidate

    suffixes = ", ".join(path.name for path in candidates)
    raise ProfileLoadError(f"Profile '{name}' not found in {profile_dir} (expected one of: {suffixes})")


def _load_profile(profile_path: Path) -> dict[str, Any]:
    if profile_path.suffix == ".json":
        with profile_path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    elif profile_path.suffix in {".yaml", ".yml"}:
        try:
            import yaml  # type: ignore
        except ImportError as exc:
            raise ProfileLoadError(
                f"YAML profile '{profile_path.name}' requires PyYAML. "
                "Use JSON profiles or install PyYAML."
            ) from exc

        with profile_path.open("r", encoding="utf-8") as handle:
            data = yaml.safe_load(handle)
    else:
        raise ProfileLoadError(f"Unsupported profile format: {profile_path.suffix}")

    if not isinstance(data, dict):
        raise ProfileLoadError(f"Profile '{profile_path.name}' must contain a top-level object")

    return data