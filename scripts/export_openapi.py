"""Export and verify the committed FastAPI OpenAPI schema."""

from __future__ import annotations

import argparse
import difflib
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.main import app  # noqa: E402

DEFAULT_OUTPUT = REPO_ROOT / "docs" / "openapi.json"


def serialize_openapi() -> str:
    """Serialize the live FastAPI OpenAPI schema deterministically."""
    schema = app.openapi()
    return json.dumps(schema, indent=2, sort_keys=True) + "\n"


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Export or verify the FastAPI OpenAPI schema JSON.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Target OpenAPI JSON path (default: {DEFAULT_OUTPUT}).",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify that the target OpenAPI JSON matches the live FastAPI app.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    """CLI entrypoint for exporting or checking the OpenAPI schema."""
    args = _build_parser().parse_args(argv)
    output_path: Path = args.output
    expected = serialize_openapi()

    if args.check:
        if not output_path.is_file():
            print(
                f"OpenAPI schema file not found: {output_path}\n"
                "Regenerate it with: python scripts/export_openapi.py",
                file=sys.stderr,
            )
            return 1

        existing = output_path.read_text(encoding="utf-8")
        if existing != expected:
            diff_lines = list(
                difflib.unified_diff(
                    existing.splitlines(),
                    expected.splitlines(),
                    fromfile=str(output_path),
                    tofile="live app.openapi()",
                    lineterm="",
                )
            )
            preview = "\n".join(diff_lines[:80])
            if len(diff_lines) > 80:
                preview += f"\n... ({len(diff_lines) - 80} more diff lines omitted)"
            print(
                f"OpenAPI schema is out of date: {output_path}\n"
                f"{preview}\n"
                "Regenerate it with: python scripts/export_openapi.py",
                file=sys.stderr,
            )
            return 1

        print(f"OpenAPI schema is up to date: {output_path}")
        return 0

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(expected, encoding="utf-8", newline="\n")
    route_count = len(app.openapi().get("paths", {}))
    print(f"Wrote OpenAPI schema ({route_count} routes) to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
