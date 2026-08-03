#!/usr/bin/env python3

from pathlib import Path
import mimetypes

ROOT = Path(".")
OUTPUT_FILE = "combined_code.md"

# Directories to ignore
IGNORE_DIRS = {
    ".git",
    ".github",
    ".next",
    ".turbo",
    ".expo",
    ".expo-shared",
    ".idea",
    ".vscode",
    ".cache",
    "__pycache__",
    ".pytest_cache",

    "node_modules",
    "dist",
    "coverage",
    "vendor",
    "Pods",

    # Build folders
    "build",
    ".gradle",
    ".cxx",
    ".kotlin",

    # Generated
    "generated",
    "tmp",
    "intermediates",
    "outputs",
    "reports",
    "executionHistory",
    "expanded",
    "fileHashes",
    "fileChanges",
    "checksums",
}

# Ignore exact filenames
IGNORE_FILENAMES = {
    ".DS_Store",
    ".gitignore",
    ".gitattributes",
    ".editorconfig",
    ".prettierrc",
    ".prettierignore",
    ".eslintignore",
    ".npmrc",

    ".env",
    ".env.local",
    ".env.production",
    ".env.development",

    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lockb",
    "Cargo.lock",
    "composer.lock",

    "debug.keystore",
}

# Ignore docs
IGNORE_PREFIXES = (
    "README",
    "LICENSE",
    "CHANGELOG",
    "CONTRIBUTING",
    "CODE_OF_CONDUCT",
)

# Allowed source extensions
CODE_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",

    ".go",
    ".py",
    ".java",
    ".kt",
    ".kts",
    ".swift",

    ".xml",
    ".gradle",
    ".properties",

    ".css",
    ".scss",
    ".html",

    ".json",
    ".yaml",
    ".yml",

    ".sql",
    ".graphql",
    ".proto",

    ".sh",
    ".md",
}

# Important config files
ALLOWED_FILES = {
    "package.json",
    "tsconfig.json",
    "turbo.json",
    "pnpm-workspace.yaml",
    "pnpm-workspace.yml",

    "app.json",
    "eas.json",

    "metro.config.js",
    "metro.config.cjs",

    "babel.config.js",
    "babel.config.cjs",

    "next.config.js",
    "next.config.ts",

    "vite.config.js",
    "vite.config.ts",

    "jest.config.js",
    "jest.config.ts",

    "eslint.config.js",
    "eslint.config.mjs",

    "tailwind.config.js",
    "tailwind.config.ts",

    "gradle.properties",
    "settings.gradle",
    "build.gradle",
    "gradle-wrapper.properties",

    "AndroidManifest.xml",
}

LANGUAGE_MAP = {
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".jsx": "jsx",
    ".mjs": "javascript",
    ".cjs": "javascript",

    ".go": "go",
    ".py": "python",
    ".java": "java",
    ".kt": "kotlin",
    ".kts": "kotlin",
    ".swift": "swift",

    ".xml": "xml",
    ".gradle": "gradle",
    ".properties": "properties",

    ".css": "css",
    ".scss": "scss",
    ".html": "html",

    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",

    ".sql": "sql",
    ".graphql": "graphql",
    ".proto": "proto",

    ".sh": "bash",
    ".md": "markdown",
}


def is_binary(path: Path):
    mime, _ = mimetypes.guess_type(path)

    if mime and not mime.startswith("text"):
        return True

    try:
        with open(path, "rb") as f:
            return b"\0" in f.read(2048)
    except Exception:
        return True


def should_skip(path: Path):
    # Ignore directories
    for part in path.parts:
        if part in IGNORE_DIRS:
            return True

    # Ignore filenames
    if path.name in IGNORE_FILENAMES:
        return True

    # Ignore docs
    if path.name.startswith(IGNORE_PREFIXES):
        return True

    # Always allow important config
    if path.name in ALLOWED_FILES:
        return False

    # Only keep desired source files
    return path.suffix.lower() not in CODE_EXTENSIONS


files = []

print("Scanning project...")

for file in ROOT.rglob("*"):
    if not file.is_file():
        continue

    if should_skip(file):
        continue

    if is_binary(file):
        continue

    files.append(file)

files.sort()

with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    out.write("# Combined Source Code\n\n")
    out.write(f"Total Files: {len(files)}\n\n")

    for file in files:
        rel = file.relative_to(ROOT)
        lang = LANGUAGE_MAP.get(file.suffix.lower(), "")

        print(rel)

        out.write(f"# File: {rel}\n\n")
        out.write(f"```{lang}\n")

        try:
            text = file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            text = file.read_text(encoding="latin-1")

        out.write(text)

        if not text.endswith("\n"):
            out.write("\n")

        out.write("```\n\n")

print(f"\n✅ Done!")
print(f"Files included : {len(files)}")
print(f"Output         : {OUTPUT_FILE}")