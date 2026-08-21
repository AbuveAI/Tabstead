#!/usr/bin/env python3
"""Build a clean, loadable Tabstead release archive without dependencies."""

from __future__ import annotations

import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = PROJECT_ROOT / "src"
DIST_DIR = PROJECT_ROOT / "dist"
REQUIRED_FILES = (
    "manifest.json",
    "background.js",
    "sidepanel.html",
    "sidepanel.css",
    "sidepanel.js",
    "theme-init.js",
)
PUBLIC_FILES = ("README.md", "LICENSE")
ICON_SUFFIXES = {".png"}


def package_entries() -> list[tuple[Path, str]]:
    files = [SOURCE_DIR / relative_path for relative_path in REQUIRED_FILES]
    missing = [path.name for path in files if not path.is_file()]
    if missing:
        raise SystemExit(f"Missing required extension files: {', '.join(missing)}")

    entries = [(path, path.relative_to(SOURCE_DIR).as_posix()) for path in files]
    entries.extend(
        (path, path.name) for relative_path in PUBLIC_FILES
        if (path := PROJECT_ROOT / relative_path).is_file()
    )

    icons_dir = SOURCE_DIR / "icons"
    if icons_dir.is_dir():
        entries.extend(
            (path, path.relative_to(SOURCE_DIR).as_posix())
            for path in sorted(icons_dir.iterdir())
            if path.is_file() and path.suffix.lower() in ICON_SUFFIXES
        )
    return entries


def main() -> None:
    manifest = json.loads((SOURCE_DIR / "manifest.json").read_text(encoding="utf-8"))
    version = manifest.get("version")
    if not isinstance(version, str) or not version:
        raise SystemExit("manifest.json does not contain a valid version")

    DIST_DIR.mkdir(exist_ok=True)
    archive_path = DIST_DIR / f"Tabstead-v{version}.zip"
    for stale_archive in DIST_DIR.glob("Tabstead-v*.zip"):
        stale_archive.unlink()

    with ZipFile(archive_path, "w", compression=ZIP_DEFLATED) as archive:
        for path, archive_name in package_entries():
            archive.write(path, archive_name)

    with ZipFile(archive_path) as archive:
        names = set(archive.namelist())
        if "manifest.json" not in names:
            raise SystemExit("Release archive is invalid: manifest.json is not at its root")
        bad_names = [name for name in names if name.startswith((".github/", "docs/", "scripts/"))]
        if bad_names:
            raise SystemExit(f"Release archive contains development files: {', '.join(bad_names)}")

    print(f"Created {archive_path.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
