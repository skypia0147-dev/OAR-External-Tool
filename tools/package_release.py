"""Package a release ZIP from the Release build, taking only the files the app needs.

    dotnet build -c Release
    python tools/package_release.py 2.0.0

Output: release/<version>/OAR External Tool <version>.zip (+ .sha256)
Layout:
    OAR External Tool/                 the app (exe, dlls, web/, READMEs)
    OARExternalTool_LICENSE/           LICENSE.txt, THIRD_PARTY_NOTICES.txt
An existing package for the same version is moved to <version>.unreleased-<time>, never deleted.
"""
from __future__ import annotations

import hashlib
import shutil
import sys
import time
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "bin" / "Release" / "net9.0-windows"
APP_DIR = "OAR External Tool"
LICENSE_DIR = "OARExternalTool_LICENSE"

APP_FILES = [
    "OAR External Tool.exe",
    "OAR External Tool.dll",
    "OAR External Tool.deps.json",
    "OAR External Tool.runtimeconfig.json",
    "Microsoft.Web.WebView2.Core.dll",
    "Microsoft.Web.WebView2.Wpf.dll",
    "app_icon.ico",
    "runtimes/win-x64/native/WebView2Loader.dll",
    "runtimes/win-x86/native/WebView2Loader.dll",
    "runtimes/win-arm64/native/WebView2Loader.dll",
]
DOCS = ["README_EN.md", "README_KO.md"]
LICENSES = ["LICENSE.txt", "THIRD_PARTY_NOTICES.txt"]


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest().upper()


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    version = sys.argv[1]
    exe = BUILD / "OAR External Tool.exe"
    if not exe.exists():
        print(f"missing {exe} — run dotnet build -c Release first")
        return 1

    entries: list[tuple[Path, str]] = []
    for rel in APP_FILES:
        src = BUILD / rel
        if not src.exists():
            print(f"missing {src}")
            return 1
        entries.append((src, f"{APP_DIR}/{rel}"))
    web = BUILD / "web"
    for f in sorted(web.rglob("*")):
        if f.is_file():
            entries.append((f, f"{APP_DIR}/web/{f.relative_to(web).as_posix()}"))
    for d in DOCS:
        entries.append((ROOT / d, f"{APP_DIR}/{d}"))
    for d in LICENSES:
        entries.append((ROOT / d, f"{LICENSE_DIR}/{d}"))

    # the build output must be newer than every web/source file it copies
    newest_src = max((ROOT / "web").rglob("*"), key=lambda p: p.stat().st_mtime).stat().st_mtime
    if exe.stat().st_mtime + 1 < newest_src:
        print("Release build is older than web/ sources — rebuild first")
        return 1

    out_dir = ROOT / "release" / version
    if out_dir.exists() and any(out_dir.iterdir()):
        moved = out_dir.with_name(f"{version}.unreleased-{time.strftime('%Y%m%d-%H%M%S')}")
        shutil.move(str(out_dir), str(moved))
        print(f"previous package moved to {moved.name}")
    out_dir.mkdir(parents=True, exist_ok=True)
    zip_path = out_dir / f"OAR External Tool {version}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for src, arc in entries:
            z.write(src, arc)
    digest = sha256(zip_path)
    (out_dir / f"{zip_path.name}.sha256").write_text(f"{digest}  {zip_path.name}\n", encoding="ascii")
    print(f"{len(entries)} files -> {zip_path}")
    print(f"SHA-256 {digest}")
    print(f"exe {sha256(exe)}  dll {sha256(BUILD / 'OAR External Tool.dll')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
