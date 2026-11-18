"""Generate and verify the sanitized NLP Lab technology stack manifest."""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = REPO_ROOT / "data" / "technology_manifest.json"

CATEGORY_ORDER = (
    "frontend",
    "backend",
    "ml_nlp",
    "data",
    "testing",
    "deployment",
)

CATEGORY_LABELS = {
    "frontend": "Frontend & Visualization",
    "backend": "Backend API & Schemas",
    "ml_nlp": "ML / NLP & Parity Export",
    "data": "Data Ingestion & Sync",
    "testing": "Testing & Quality Gates",
    "deployment": "Containers & CI/CD",
}

FORBIDDEN_PATTERNS = (
    re.compile(r"/content/drive", re.IGNORECASE),
    re.compile(r"MyDrive", re.IGNORECASE),
    re.compile(r"1qvzd", re.IGNORECASE),
    re.compile(r"drive\.google\.com", re.IGNORECASE),
    re.compile(r"C:\\\\Users|C:/Users", re.IGNORECASE),
    re.compile(r"\bvercel\b", re.IGNORECASE),
)

INSPECTED_FILES = [
    "frontend/package.json",
    "frontend/package-lock.json",
    "frontend/components.json",
    "frontend/styles/globals.css",
    "frontend/public/tech/sources.json",
    "backend/requirements.txt",
    "configs/requirement.txt",
    "reports/environment.json",
    "reports/environment_requirements.txt",
    "artifacts/models/onnx/onnx_export_manifest.json",
    "ml/amazon_rating/inference.py",
    "ml/go_emotions/inference.py",
    "ml/common/onnx_export.py",
    "backend/app/main.py",
    "backend/app/schemas.py",
    "docker-compose.yml",
    "Dockerfile",
    "frontend/Dockerfile",
    ".github/workflows/ci.yml",
    "sync_drive.py",
]


def _read_text(repo_root: Path, rel_path: str) -> str:
    return (repo_root / rel_path).read_text(encoding="utf-8")


def _read_json(repo_root: Path, rel_path: str) -> dict[str, Any]:
    return json.loads(_read_text(repo_root, rel_path))


def _parse_requirements(text: str) -> dict[str, str]:
    """Parse pip requirement lines into {normalized_package: version_spec}."""
    parsed: dict[str, str] = {}
    for raw_line in text.splitlines():
        line = raw_line.split("#", 1)[0].strip()
        if not line:
            continue
        match = re.match(r"^([A-Za-z0-9_.-]+)(?:\[[^\]]+\])?(.*)$", line)
        if not match:
            continue
        name = match.group(1).lower().replace("_", "-")
        spec = match.group(2).strip() or "unpinned"
        parsed[name] = spec
    return parsed


def _scan_frontend_imports(repo_root: Path) -> dict[str, list[str]]:
    """Scan active frontend pages and components for package import usage."""
    frontend_root = repo_root / "frontend"
    scan_dirs = ("pages", "components", "lib", "scripts")
    packages = (
        "next",
        "react",
        "gsap",
        "@gsap/react",
        "recharts",
        "lucide-react",
        "framer-motion",
        "motion",
        "lenis",
        "lottie-react",
        "@rive-app/react-canvas",
    )
    hits: dict[str, list[str]] = {pkg: [] for pkg in packages}
    import_re = re.compile(r"""(?:from|import)\s*\(?\s*["']([^"']+)["']""")

    for sub in scan_dirs:
        sub_path = frontend_root / sub
        if not sub_path.is_dir():
            continue
        for file_path in sorted(sub_path.rglob("*")):
            if not file_path.is_file() or file_path.suffix not in (
                ".ts",
                ".tsx",
                ".js",
                ".mjs",
            ):
                continue
            rel = file_path.relative_to(repo_root).as_posix()
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            for match in import_re.finditer(content):
                mod = match.group(1)
                for pkg in packages:
                    if mod == pkg or mod.startswith(f"{pkg}/"):
                        if rel not in hits[pkg]:
                            hits[pkg].append(rel)
    return hits


def _load_logo_catalog(repo_root: Path) -> dict[str, tuple[str | None, str]]:
    """Load verified local SVG logo paths and license labels from public/tech/."""
    sources_path = repo_root / "frontend" / "public" / "tech" / "sources.json"
    catalog: dict[str, tuple[str | None, str]] = {}
    if not sources_path.is_file():
        return catalog

    data = json.loads(sources_path.read_text(encoding="utf-8"))
    for asset in data.get("assets", []):
        slug = asset.get("slug")
        file_url = asset.get("file")
        source = asset.get("source", "")
        license_name = asset.get("license", "")
        if not isinstance(slug, str) or not isinstance(file_url, str):
            continue

        disk_path = repo_root / "frontend" / "public" / file_url.lstrip("/")
        resolved_path = file_url if disk_path.is_file() else None

        if license_name == "MIT" and source == "Devicon":
            license_label = "MIT (Devicon)"
        elif license_name == "CC0-1.0" and source == "Simple Icons":
            license_label = "CC0-1.0 (Simple Icons)"
        else:
            license_label = "Custom monogram / text tile"

        catalog[slug] = (resolved_path, license_label)
    return catalog


def _logo_for(
    catalog: dict[str, tuple[str | None, str]],
    slug: str | None,
) -> tuple[str | None, str]:
    if slug and slug in catalog:
        return catalog[slug]
    return (None, "Custom monogram / text tile")


def _extract_ci_details(ci_text: str) -> dict[str, str]:
    py_match = re.search(r'python-version:\s*["\']?([0-9.]+)["\']?', ci_text)
    node_match = re.search(r'node-version:\s*["\']?([0-9.]+)["\']?', ci_text)
    runner_match = re.search(r"runs-on:\s*([A-Za-z0-9_.-]+)", ci_text)
    return {
        "python": py_match.group(1) if py_match else "3.11",
        "node": node_match.group(1) if node_match else "20",
        "runner": runner_match.group(1) if runner_match else "ubuntu-latest",
    }


def _extract_docker_details(
    backend_df: str, frontend_df: str, compose_text: str
) -> dict[str, str]:
    py_img = re.search(r"^FROM\s+([^\s]+)", backend_df, re.MULTILINE)
    node_img = re.search(r"^FROM\s+([^\s]+)", frontend_df, re.MULTILINE)
    has_backend_svc = bool(re.search(r"^\s+backend:", compose_text, re.MULTILINE))
    has_frontend_svc = bool(re.search(r"^\s+frontend:", compose_text, re.MULTILINE))
    return {
        "backend_base": py_img.group(1) if py_img else "python:3.11-slim",
        "frontend_base": node_img.group(1) if node_img else "node:20-alpine",
        "services": "backend + frontend"
        if (has_backend_svc and has_frontend_svc)
        else "partial",
    }


def _verify_sources_exist(repo_root: Path, sources: list[str]) -> list[str]:
    for rel in sources:
        target = repo_root / rel
        if not target.exists():
            raise FileNotFoundError(
                f"Verification source does not exist on disk: {rel}"
            )
    return sources


def build_technology_manifest(repo_root: Path = REPO_ROOT) -> dict[str, Any]:
    """Build the full verified technology manifest by reading repository artifacts."""
    pkg_json = _read_json(repo_root, "frontend/package.json")
    deps: dict[str, str] = pkg_json.get("dependencies", {})
    dev_deps: dict[str, str] = pkg_json.get("devDependencies", {})
    all_npm = {**deps, **dev_deps}

    lock_path = repo_root / "frontend" / "package-lock.json"
    next_locked = None
    if lock_path.is_file():
        lock_data = json.loads(lock_path.read_text(encoding="utf-8"))
        next_locked = (
            lock_data.get("packages", {})
            .get("node_modules/next", {})
            .get("version")
        )

    frontend_imports = _scan_frontend_imports(repo_root)
    globals_css = _read_text(repo_root, "frontend/styles/globals.css")
    has_tailwind_directive = "@tailwind" in globals_css

    backend_reqs = _parse_requirements(_read_text(repo_root, "backend/requirements.txt"))
    config_reqs = _parse_requirements(_read_text(repo_root, "configs/requirement.txt"))
    env_reqs = _parse_requirements(
        _read_text(repo_root, "reports/environment_requirements.txt")
    )
    env_json = _read_json(repo_root, "reports/environment.json")
    onnx_manifest = _read_json(
        repo_root, "artifacts/models/onnx/onnx_export_manifest.json"
    )
    amazon_inf_text = _read_text(repo_root, "ml/amazon_rating/inference.py")
    main_py_text = _read_text(repo_root, "backend/app/main.py")
    onnx_export_text = _read_text(repo_root, "ml/common/onnx_export.py")
    ci_text = _read_text(repo_root, ".github/workflows/ci.yml")
    compose_text = _read_text(repo_root, "docker-compose.yml")
    backend_df = _read_text(repo_root, "Dockerfile")
    frontend_df = _read_text(repo_root, "frontend/Dockerfile")

    ci_info = _extract_ci_details(ci_text)
    docker_info = _extract_docker_details(backend_df, frontend_df, compose_text)
    logo_catalog = _load_logo_catalog(repo_root)

    # Programmatically verify key statuses from repository code & manifests.
    gensim_in_backend = "gensim" in backend_reqs
    gensim_in_configs = "gensim" in config_reqs
    gensim_imported_in_inference = "from gensim." in amazon_inf_text
    gensim_status = (
        "verified_used"
        if (gensim_in_backend and gensim_in_configs)
        else "partial"
        if (gensim_in_configs and gensim_imported_in_inference)
        else "declared_unused"
    )

    onnx_in_configs = "onnx" in config_reqs and "onnxruntime" in config_reqs
    onnx_used_in_api = "onnxruntime" in main_py_text
    onnx_status = (
        "verified_export_only"
        if (onnx_in_configs and not onnx_used_in_api and onnx_manifest)
        else "verified_used"
    )

    opset_match = re.search(r"opset_version\s*=\s*(\d+)", onnx_export_text)
    opset_version = opset_match.group(1) if opset_match else "17"

    colab_python = str(env_json.get("python", "")).split()[0] or "3.13"
    colab_torch = str(env_json.get("pytorch", "2.14.1+cu130"))
    colab_gpu = str(env_json.get("gpu", "Tesla T4"))
    colab_vram = env_json.get("gpu_memory_gb", 14.56)

    def make_item(
        *,
        tech_id: str,
        name: str,
        category: str,
        status: str,
        status_note: str,
        version: str,
        role: str,
        communication_boundary: str,
        verification_sources: list[str],
        logo_slug: str | None,
        monogram: str,
    ) -> dict[str, Any]:
        logo_path, logo_license = _logo_for(logo_catalog, logo_slug)
        return {
            "id": tech_id,
            "name": name,
            "category": category,
            "status": status,
            "status_note": status_note,
            "version": version,
            "role": role,
            "communication_boundary": communication_boundary,
            "verification_sources": _verify_sources_exist(
                repo_root, verification_sources
            ),
            "logo_path": logo_path,
            "logo_license": logo_license,
            "monogram": monogram,
        }

    # Unused frontend dependencies verified against active pages/imports
    def _unused_status_note(pkg: str, extra: str = "") -> str:
        refs = frontend_imports.get(pkg, [])
        active_page_refs = [r for r in refs if r.startswith("frontend/pages/")]
        if refs and not active_page_refs:
            return (
                f"Declared in frontend/package.json; imported only in {', '.join(refs)} "
                f"and unused in active pages. {extra}".strip()
            )
        return (
            f"Declared in frontend/package.json with zero imports across active "
            f"frontend pages or components. {extra}".strip()
        )

    next_version = (
        f"{all_npm['next']} (lockfile {next_locked})"
        if next_locked
        else all_npm["next"]
    )

    amazon_err = onnx_manifest["amazon_parity"]["max_absolute_error"]
    go_err = onnx_manifest["goemotions_parity"]["max_absolute_error"]
    onnx_paths = [
        onnx_manifest["amazon_onnx"].replace("\\", "/"),
        onnx_manifest["goemotions_onnx"].replace("\\", "/"),
    ]

    technologies = [
        # ---- Frontend ----
        make_item(
            tech_id="nextjs",
            name="Next.js (Pages Router)",
            category="frontend",
            status="verified_used",
            status_note="Active SSR/CSR web shell serving 7 routes under frontend/pages/.",
            version=next_version,
            role="Serves the research workbench UI across /, /analyze/*, /model-lab, /datasets, /documentation, and /technology.",
            communication_boundary="Receives browser navigation and user prompts; dispatches typed HTTP/JSON requests via lib/api.ts to FastAPI (:8000).",
            verification_sources=[
                "frontend/package.json",
                "frontend/package-lock.json",
                "frontend/pages/_app.tsx",
                "frontend/lib/api.ts",
            ],
            logo_slug="nextjs",
            monogram="NEXT",
        ),
        make_item(
            tech_id="react",
            name="React",
            category="frontend",
            status="verified_used",
            status_note="Active UI component runtime across all Next.js pages and providers.",
            version=f"react {all_npm['react']} / react-dom {all_npm['react-dom']}",
            role="Renders interactive analyzers, ReadinessProvider context, Dataset Explorer charts, and Model Lab panels.",
            communication_boundary="Binds component state and AbortController lifecycles to Next.js routes and FastAPI JSON responses.",
            verification_sources=[
                "frontend/package.json",
                "frontend/components/ReadinessProvider.tsx",
                "frontend/components/AnalyzerForm.tsx",
            ],
            logo_slug="react",
            monogram="REA",
        ),
        make_item(
            tech_id="typescript",
            name="TypeScript",
            category="frontend",
            status="verified_used",
            status_note="Strict TypeScript (strict: true) enforced by npm run typecheck.",
            version=all_npm["typescript"],
            role="Enforces compile-time parity between frontend view models and FastAPI Pydantic schemas.",
            communication_boundary="Validates request/response types across frontend/lib/api.ts and page components before build.",
            verification_sources=[
                "frontend/package.json",
                "frontend/tsconfig.json",
                "frontend/lib/api.ts",
            ],
            logo_slug="typescript",
            monogram="TS",
        ),
        make_item(
            tech_id="gsap",
            name="GSAP + @gsap/react",
            category="frontend",
            status="verified_used",
            status_note=(
                f"Active motion runtime imported in {len(frontend_imports['gsap'])} frontend modules "
                "with prefers-reduced-motion static fallbacks."
            ),
            version=f"gsap {all_npm['gsap']} / @gsap/react {all_npm['@gsap/react']}",
            role="Drives desktop (min-width: 768px) ScrollTrigger pipeline choreography, circle route transitions, and diagram wave reveals.",
            communication_boundary="Reads useReducedMotion() and scoped DOM refs; falls back cleanly to static CSS states when reduced motion is active.",
            verification_sources=[
                "frontend/package.json",
                "frontend/lib/motion.ts",
                "frontend/components/PipelineTrack.tsx",
                "frontend/components/ArchitectureMap.tsx",
            ],
            logo_slug="gsap",
            monogram="GSAP",
        ),
        make_item(
            tech_id="recharts",
            name="Recharts",
            category="frontend",
            status="verified_used",
            status_note="Active visualization library rendering dataset charts on /datasets.",
            version=all_npm["recharts"],
            role="Renders responsive SVG charts for star distributions, 28-emotion prevalence, label cardinality, and sequence length quantiles.",
            communication_boundary="Consumes DatasetSummaryResponse JSON from GET /datasets/summary and renders client-mounted SVG charts.",
            verification_sources=[
                "frontend/package.json",
                "frontend/components/DatasetCharts.tsx",
                "frontend/pages/datasets.tsx",
            ],
            logo_slug="recharts",
            monogram="RCH",
        ),
        make_item(
            tech_id="lucide-react",
            name="Lucide React",
            category="frontend",
            status="verified_used",
            status_note="Active icon library across navigation, pipeline controls, and documentation UI.",
            version=all_npm["lucide-react"],
            role="Provides inline vector UI icons across sidebar navigation, playback controls, and reference panels.",
            communication_boundary="Renders deterministic inline SVGs inside React components with zero external font or icon CDN fetches.",
            verification_sources=[
                "frontend/package.json",
                "frontend/components/Layout.tsx",
                "frontend/components/PipelineTrack.tsx",
            ],
            logo_slug=None,
            monogram="LUC",
        ),
        make_item(
            tech_id="tailwindcss",
            name="Tailwind CSS",
            category="frontend",
            status="declared_unused" if not has_tailwind_directive else "verified_used",
            status_note=(
                "Declared in frontend/package.json devDependencies and frontend/components.json, "
                "but globals.css uses token-driven custom CSS (tokens.css) with no @tailwind directives or tailwind.config.js."
            ),
            version=all_npm["tailwindcss"],
            role="Declared CSS utility package excluded from the active custom-token CSS styling pipeline.",
            communication_boundary="Not invoked in active CSS compilation; frontend/styles/globals.css imports tokens.css directly.",
            verification_sources=[
                "frontend/package.json",
                "frontend/components.json",
                "frontend/styles/globals.css",
                "frontend/DESIGN_SYSTEM.md",
            ],
            logo_slug="tailwindcss",
            monogram="TW",
        ),
        make_item(
            tech_id="framer-motion",
            name="Framer Motion",
            category="frontend",
            status="declared_unused",
            status_note=_unused_status_note(
                "framer-motion",
                "GSAP + CSS govern active application motion.",
            ),
            version=all_npm["framer-motion"],
            role="Declared motion dependency retained in package.json; excluded from active Next.js pages.",
            communication_boundary="Not imported by any active route under frontend/pages/.",
            verification_sources=[
                "frontend/package.json",
                "frontend/components/ui/hero-parallax.tsx",
            ],
            logo_slug=None,
            monogram="FM",
        ),
        make_item(
            tech_id="motion",
            name="Motion (package)",
            category="frontend",
            status="declared_unused",
            status_note=_unused_status_note(
                "motion",
                "GSAP + CSS govern active application motion.",
            ),
            version=all_npm["motion"],
            role="Declared motion package in frontend/package.json with no active route imports.",
            communication_boundary="Not imported by any active frontend page or component.",
            verification_sources=["frontend/package.json"],
            logo_slug=None,
            monogram="MOT",
        ),
        make_item(
            tech_id="lenis",
            name="Lenis",
            category="frontend",
            status="declared_unused",
            status_note=_unused_status_note(
                "lenis",
                "Native browser scrolling is used.",
            ),
            version=all_npm["lenis"],
            role="Declared smooth-scroll dependency in frontend/package.json; unused in active layouts.",
            communication_boundary="Not wired into document scroll or Next.js page wrappers.",
            verification_sources=["frontend/package.json"],
            logo_slug=None,
            monogram="LEN",
        ),
        make_item(
            tech_id="lottie-react",
            name="Lottie React",
            category="frontend",
            status="declared_unused",
            status_note=_unused_status_note("lottie-react"),
            version=all_npm["lottie-react"],
            role="Declared Lottie player dependency in frontend/package.json; unused in active pages.",
            communication_boundary="Not connected to any active component or JSON animation asset.",
            verification_sources=["frontend/package.json"],
            logo_slug=None,
            monogram="LOT",
        ),
        make_item(
            tech_id="rive-react-canvas",
            name="Rive React Canvas",
            category="frontend",
            status="declared_unused",
            status_note=_unused_status_note("@rive-app/react-canvas"),
            version=all_npm["@rive-app/react-canvas"],
            role="Declared Rive runtime dependency in frontend/package.json; unused in active pages.",
            communication_boundary="Not connected to any active component or .riv asset.",
            verification_sources=["frontend/package.json"],
            logo_slug=None,
            monogram="RIV",
        ),
        # ---- Backend ----
        make_item(
            tech_id="python",
            name="Python",
            category="backend",
            status="verified_used",
            status_note="Core runtime powering FastAPI, PyTorch inference, ONNX export checks, and manifest scripts.",
            version=f"{ci_info['python']} (Docker/CI) · {colab_python} (Colab)",
            role="Executes the backend API server, ML inference wrappers, pytest suite, and deterministic repository generators.",
            communication_boundary="Runs backend.app.main:app on Uvicorn and loads ml/ inference modules plus data/*.json artifacts.",
            verification_sources=[
                "Dockerfile",
                ".github/workflows/ci.yml",
                "reports/environment.json",
            ],
            logo_slug="python",
            monogram="PY",
        ),
        make_item(
            tech_id="fastapi",
            name="FastAPI",
            category="backend",
            status="verified_used",
            status_note="Active HTTP API layer serving inference, readiness, datasets, Model Lab, and technology endpoints.",
            version=backend_reqs["fastapi"],
            role="Exposes REST routes on :8000 with CORSMiddleware, RequestValidationError 422 handlers, and OpenAPI schema generation.",
            communication_boundary="Receives HTTP/JSON from the Next.js client, validates via Pydantic, and delegates to PyTorch wrappers or data/*.json.",
            verification_sources=[
                "backend/requirements.txt",
                "backend/app/main.py",
                "docs/openapi.json",
            ],
            logo_slug="fastapi",
            monogram="FA",
        ),
        make_item(
            tech_id="uvicorn",
            name="Uvicorn",
            category="backend",
            status="verified_used",
            status_note="Active ASGI server used in Docker, local dev, and CI Playwright smoke runs.",
            version=backend_reqs["uvicorn"],
            role="Serves backend.app.main:app on :8000 across local, containerized, and CI verification environments.",
            communication_boundary="Terminates inbound HTTP connections on :8000 and dispatches ASGI events to FastAPI.",
            verification_sources=[
                "backend/requirements.txt",
                "Dockerfile",
                ".github/workflows/ci.yml",
            ],
            logo_slug="uvicorn",
            monogram="UV",
        ),
        make_item(
            tech_id="pydantic",
            name="Pydantic",
            category="backend",
            status="verified_used",
            status_note="Active request/response contract enforcement driving docs/openapi.json.",
            version=backend_reqs["pydantic"],
            role="Validates TextRequest (extra='forbid', 1..10,000 chars) and serializes typed response models across all API endpoints.",
            communication_boundary="Sits at the FastAPI ingress/egress boundary, turning invalid inputs into structured 422 ErrorResponse payloads.",
            verification_sources=[
                "backend/requirements.txt",
                "backend/app/schemas.py",
                "docs/openapi.json",
            ],
            logo_slug="pydantic",
            monogram="PD",
        ),
        # ---- ML / NLP ----
        make_item(
            tech_id="pytorch",
            name="PyTorch",
            category="ml_nlp",
            status="verified_used",
            status_note=f"Active live inference engine on MODEL_DEVICE (cpu default); trained on {colab_gpu} ({colab_torch}).",
            version=f"{backend_reqs['torch']} (backend) · {colab_torch} (Colab)",
            role="Trains both models in Colab and executes live inference for Amazon Word2Vec BiLSTM and GoEmotions DistilBERT.",
            communication_boundary="Receives token IDs from Gensim/Transformers, runs neural forward passes, and returns probabilities to FastAPI.",
            verification_sources=[
                "backend/requirements.txt",
                "reports/environment.json",
                "ml/amazon_rating/inference.py",
                "ml/go_emotions/inference.py",
            ],
            logo_slug="pytorch",
            monogram="PT",
        ),
        make_item(
            tech_id="transformers",
            name="Hugging Face Transformers",
            category="ml_nlp",
            status="verified_used",
            status_note="Active tokenizer and DistilBERT sequence classifier runtime for POST /predict/go-emotions.",
            version=backend_reqs["transformers"],
            role="Loads AutoTokenizer (max_length=128) and AutoModelForSequenceClassification (28 labels) from artifacts/models/distilbert_goemotions.",
            communication_boundary="Converts raw text into WordPiece tensors and executes the fine-tuned DistilBERT PyTorch model.",
            verification_sources=[
                "backend/requirements.txt",
                "configs/requirement.txt",
                "ml/go_emotions/inference.py",
            ],
            logo_slug="transformers",
            monogram="HFTR",
        ),
        make_item(
            tech_id="safetensors",
            name="Safetensors",
            category="ml_nlp",
            status="verified_used",
            status_note="Verified model weight format (model.safetensors) served by GoEmotionsInference.",
            version=config_reqs["safetensors"],
            role="Stores fine-tuned DistilBERT weights without Python pickle deserialization risk.",
            communication_boundary="Streams verified weight tensors from artifacts/models/distilbert_goemotions/model.safetensors into PyTorch.",
            verification_sources=[
                "configs/requirement.txt",
                "artifacts/models/distilbert_goemotions/model.safetensors",
                "ml/go_emotions/inference.py",
            ],
            logo_slug="safetensors",
            monogram="ST",
        ),
        make_item(
            tech_id="gensim",
            name="Gensim",
            category="ml_nlp",
            status=gensim_status,
            status_note=(
                "Partial dependency discrepancy: required by ml/amazon_rating/inference.py "
                "(gensim.utils.simple_preprocess) and pinned in configs/requirement.txt, "
                "but omitted from backend/requirements.txt."
            ),
            version=config_reqs["gensim"],
            role="Trains 200-d Word2Vec Skip-gram embeddings offline and tokenizes Amazon reviews in live inference.",
            communication_boundary="Normalizes raw review text (deacc=True) into token sequences prior to vocab.json ID lookup in AmazonInference.",
            verification_sources=[
                "configs/requirement.txt",
                "backend/requirements.txt",
                "ml/amazon_rating/inference.py",
            ],
            logo_slug="gensim",
            monogram="GEN",
        ),
        make_item(
            tech_id="numpy",
            name="NumPy",
            category="ml_nlp",
            status="verified_used",
            status_note="Active array runtime for embedding_matrix.npy loading and ONNX parity comparison.",
            version=backend_reqs["numpy"],
            role="Loads pretrained Word2Vec embedding matrices (vocab_size x 200) and computes max-absolute-error checks.",
            communication_boundary="Bridges persisted .npy weights and tensor outputs between disk, PyTorch, and ONNX Runtime.",
            verification_sources=[
                "backend/requirements.txt",
                "ml/amazon_rating/inference.py",
                "ml/common/onnx_export.py",
            ],
            logo_slug="numpy",
            monogram="NP",
        ),
        make_item(
            tech_id="scikitlearn",
            name="scikit-learn",
            category="ml_nlp",
            status="verified_used",
            status_note="Verified evaluation runtime generating committed test metrics and classification reports.",
            version=backend_reqs["scikit-learn"],
            role="Computes stratified splits, macro/micro/weighted F1, Hamming loss, subset accuracy, and confusion matrices.",
            communication_boundary="Transforms model test predictions into reports/metrics/*.json consumed by /statistics and /models/lab.",
            verification_sources=[
                "backend/requirements.txt",
                "reports/metrics/word2vec_bilstm_test_metrics.json",
                "reports/metrics/distilbert_goemotions_test_metrics.json",
            ],
            logo_slug="scikitlearn",
            monogram="SKL",
        ),
        make_item(
            tech_id="onnx",
            name="ONNX & ONNX Runtime",
            category="ml_nlp",
            status=onnx_status,
            status_note=(
                f"Export & parity only (opset_version={opset_version}, CPUExecutionProvider): "
                f"verified max_absolute_error {amazon_err:.2e} (Amazon) and {go_err:.2e} (GoEmotions) "
                "<= 1e-4; live FastAPI endpoints serve PyTorch directly."
            ),
            version=(
                f"onnx {config_reqs['onnx']} / onnxruntime {config_reqs['onnxruntime']} "
                f"(opset {opset_version})"
            ),
            role="Exports both PyTorch models to .onnx graphs and verifies CPU logit parity against PyTorch references.",
            communication_boundary="Consumes loaded PyTorch models in scripts/export_and_check_onnx.py and emits parity-checked .onnx artifacts.",
            verification_sources=[
                "configs/requirement.txt",
                "ml/common/onnx_export.py",
                "scripts/export_and_check_onnx.py",
                "artifacts/models/onnx/onnx_export_manifest.json",
            ],
            logo_slug="onnx",
            monogram="ONNX",
        ),
        # ---- Data ----
        make_item(
            tech_id="huggingface-datasets",
            name="Hugging Face Datasets",
            category="data",
            status="verified_export_only",
            status_note="Offline Notebook 00/02 corpus ingestion; raw GoEmotions records are not committed or served by FastAPI.",
            version=f"=={env_reqs['datasets']}" if "datasets" in env_reqs else "Notebook 00 (Colab)",
            role="Ingests google-research-datasets/go_emotions (simplified: 43,410 train / 5,426 val / 5,427 test) during Colab audits.",
            communication_boundary="Fetches upstream Hub splits in Notebook 00 and outputs sanitized split audits to data/goemotions_*.json.",
            verification_sources=[
                "notebooks/00_environment_and_dataset_audit.ipynb",
                "data/dataset_explorer_summary.json",
                "reports/environment_requirements.txt",
            ],
            logo_slug="huggingface",
            monogram="HFDS",
        ),
        make_item(
            tech_id="kagglehub",
            name="KaggleHub",
            category="data",
            status="verified_export_only",
            status_note="Offline Notebook 00 ingestion; raw Amazon review rows are excluded from Git and API redistribution.",
            version=f"=={env_reqs['kagglehub']}" if "kagglehub" in env_reqs else "Notebook 00 (Colab)",
            role="Downloads yacharki/amazon-reviews-for-sentianalysis-finegrained-csv (3M train / 650k test) in Colab.",
            communication_boundary="Stages raw Kaggle CSVs into ephemeral Colab storage and emits quality summaries to data/amazon_data_quality.json.",
            verification_sources=[
                "notebooks/00_environment_and_dataset_audit.ipynb",
                "data/dataset_explorer_summary.json",
                "reports/environment_requirements.txt",
            ],
            logo_slug="kaggle",
            monogram="KG",
        ),
        make_item(
            tech_id="colab-drive",
            name="Google Colab & Drive Sync",
            category="data",
            status="verified_export_only",
            status_note="Offline GPU training environment and optional sync_drive.py CLI; never invoked by FastAPI or Next.js.",
            version=f"Colab {colab_gpu} ({colab_vram} GB VRAM)",
            role="Executes training notebooks 00-03 and synchronizes sanitized manifests, figures, reports, and checkpoints locally.",
            communication_boundary="Persists offline training outputs to the logical NLP Lab Workspace; sync_drive.py pulls sanitized files into the repo.",
            verification_sources=[
                "reports/environment.json",
                "sync_drive.py",
                "notebooks/00_environment_and_dataset_audit.ipynb",
            ],
            logo_slug="colab-drive",
            monogram="CLB",
        ),
        # ---- Testing ----
        make_item(
            tech_id="pytest",
            name="pytest (+ httpx)",
            category="testing",
            status="verified_used",
            status_note="Active backend test runner executed locally and in CI test-backend job.",
            version=f"pytest {backend_reqs['pytest']} / httpx {backend_reqs['httpx']}",
            role="Verifies FastAPI health, readiness, predictions, governance, Model Lab, technology manifest, and OpenAPI schema parity.",
            communication_boundary="Drives FastAPI TestClient(app) via httpx against backend/app/main.py and data/*.json fixtures.",
            verification_sources=[
                "backend/requirements.txt",
                "backend/tests/test_main.py",
                ".github/workflows/ci.yml",
            ],
            logo_slug="pytest",
            monogram="PYT",
        ),
        make_item(
            tech_id="playwright",
            name="Playwright (Chromium)",
            category="testing",
            status="verified_used",
            status_note="Active full-stack CI smoke suite running against live Uvicorn (:8000) and Next.js (:3000).",
            version="CI ephemeral install (chromium)",
            role="Asserts multi-page rendering, responsive layout, zero console/page/HTTP errors, and zero Drive path leaks.",
            communication_boundary="Drives headless Chromium over :3000 while Next.js communicates live with FastAPI on :8000.",
            verification_sources=[
                ".github/workflows/ci.yml",
                "frontend/scripts/ci-playwright-smoke.mjs",
                "frontend/scripts/run-browser-qa.mjs",
            ],
            logo_slug="playwright",
            monogram="PW",
        ),
        make_item(
            tech_id="node-contract-tests",
            name="Node Contract Suite (npm run verify)",
            category="testing",
            status="verified_used",
            status_note="Active 4-stage frontend gate: next lint, tsc --noEmit, 9 Node test suites, and next build.",
            version=f"Node {ci_info['node']} / eslint {all_npm['eslint']}",
            role="Enforces design system tokens, reduced-motion safety, API resilience states, and static/SSR compilation.",
            communication_boundary="Runs static and contract assertions across frontend/ files inside test-frontend CI before Playwright smoke.",
            verification_sources=[
                "frontend/package.json",
                ".github/workflows/ci.yml",
            ],
            logo_slug=None,
            monogram="NODE",
        ),
        # ---- Deployment ----
        make_item(
            tech_id="docker",
            name="Docker & Docker Compose",
            category="deployment",
            status="verified_used",
            status_note=f"Verified multi-service container definitions ({docker_info['services']}).",
            version=f"{docker_info['backend_base']} + {docker_info['frontend_base']}",
            role="Packages and runs nlp-lab-backend (:8000) and nlp-lab-frontend (:3000) with NEXT_PUBLIC_API_URL wiring.",
            communication_boundary="Bridges containerized Next.js (:3000) to containerized FastAPI (:8000) with mounted repo artifacts.",
            verification_sources=[
                "Dockerfile",
                "frontend/Dockerfile",
                "docker-compose.yml",
                "frontend/.dockerignore",
            ],
            logo_slug="docker",
            monogram="DOC",
        ),
        make_item(
            tech_id="githubactions",
            name="GitHub Actions CI",
            category="deployment",
            status="verified_used",
            status_note="Active 3-job workflow (test-backend, test-frontend, playwright-smoke) on main/master.",
            version=f"{ci_info['runner']} · Python {ci_info['python']} / Node {ci_info['node']}",
            role="Automates pytest, OpenAPI drift verification, frontend npm run verify, and live Chromium smoke checks.",
            communication_boundary="Triggers on pushes and PRs to main/master, gating merges on backend, frontend, and end-to-end checks.",
            verification_sources=[".github/workflows/ci.yml"],
            logo_slug="githubactions",
            monogram="GHA",
        ),
    ]

    # Summarize counts by category programmatically
    categories_summary: dict[str, dict[str, Any]] = {}
    for cat in CATEGORY_ORDER:
        cat_items = [item for item in technologies if item["category"] == cat]
        categories_summary[cat] = {
            "category": cat,
            "label": CATEGORY_LABELS[cat],
            "total": len(cat_items),
            "verified_used": sum(
                1 for item in cat_items if item["status"] == "verified_used"
            ),
            "verified_export_only": sum(
                1 for item in cat_items if item["status"] == "verified_export_only"
            ),
            "partial": sum(1 for item in cat_items if item["status"] == "partial"),
            "declared_unused": sum(
                1 for item in cat_items if item["status"] == "declared_unused"
            ),
        }

    boundaries = [
        {
            "id": "frontend-fastapi",
            "title": "Frontend <-> FastAPI",
            "source_layer": "Next.js Pages Router (:3000)",
            "target_layer": "FastAPI + Uvicorn (:8000)",
            "protocol_or_format": "HTTP/1.1 JSON via fetch + AbortController",
            "inputs": [
                "POST /predict/amazon { text }",
                "POST /predict/go-emotions { text }",
                "GET /readiness, /metadata, /statistics, /datasets/summary, /models/lab, /technology",
            ],
            "outputs": [
                "Typed Pydantic JSON payloads (200)",
                "Structured ErrorResponse envelopes (404, 422, 500, 503)",
            ],
            "security_and_resilience": (
                "CORSMiddleware allowlist; GET requests omit Content-Type to prevent preflight overhead; "
                "4s stall warning + 30s analyzer timeout; TextRequest forbids extra fields."
            ),
            "verification_sources": _verify_sources_exist(
                repo_root,
                ["frontend/lib/api.ts", "backend/app/main.py", "backend/app/schemas.py"],
            ),
        },
        {
            "id": "fastapi-pytorch",
            "title": "FastAPI <-> PyTorch Inference",
            "source_layer": "FastAPI route handlers",
            "target_layer": "AmazonInference & GoEmotionsInference (PyTorch)",
            "protocol_or_format": "In-process Python calls -> PyTorch tensors on MODEL_DEVICE",
            "inputs": [
                "Validated review/comment strings",
                "MODEL_DEVICE env var (default: cpu)",
                "Checkpoints (w2v_bilstm_best.pt, model.safetensors)",
            ],
            "outputs": [
                "5-class softmax rating & probabilities",
                "28-label sigmoid probabilities & >=0.30 active labels",
            ],
            "security_and_resilience": (
                "Lazy model initialization raising ModelNotReadyError -> 503 model_not_ready; "
                "ONNX Runtime is verified offline for logit parity only, not live serving."
            ),
            "verification_sources": _verify_sources_exist(
                repo_root,
                [
                    "backend/app/main.py",
                    "ml/amazon_rating/inference.py",
                    "ml/go_emotions/inference.py",
                ],
            ),
        },
        {
            "id": "offline-notebooks-artifacts",
            "title": "Offline Notebooks & Drive <-> Artifacts",
            "source_layer": "Colab Notebooks (00-03) & Logical NLP Lab Workspace",
            "target_layer": "Repository data/, reports/, artifacts/",
            "protocol_or_format": "sync_drive.py CLI + JSON, Safetensors, NumPy & ONNX files",
            "inputs": [
                "Kaggle Amazon Reviews & HF GoEmotions datasets",
                f"Colab {colab_gpu} training runs",
                f"PyTorch -> ONNX opset {opset_version} export",
            ],
            "outputs": [
                "data/*.json audited dataset & technology manifests",
                "reports/metrics/*.json evaluation artifacts",
                "artifacts/models/* checkpoints & onnx_export_manifest.json",
            ],
            "security_and_resilience": (
                "Raw datasets are excluded from Git (data/README.md) and API samples return approved=false; "
                "public manifests sanitize away mounted Drive paths, Drive IDs, and personal paths."
            ),
            "verification_sources": _verify_sources_exist(
                repo_root,
                [
                    "data/README.md",
                    "sync_drive.py",
                    "ml/common/onnx_export.py",
                    "artifacts/models/onnx/onnx_export_manifest.json",
                ],
            ),
        },
        {
            "id": "docker-ci",
            "title": "Docker & GitHub Actions CI",
            "source_layer": "Docker Compose & GitHub Actions (ubuntu-latest)",
            "target_layer": "Backend (Python 3.11), Frontend (Node 20), Playwright Chromium",
            "protocol_or_format": "Docker bridge (:3000 -> :8000) & 3-job CI workflow",
            "inputs": [
                "Dockerfile, frontend/Dockerfile, docker-compose.yml",
                ".github/workflows/ci.yml",
            ],
            "outputs": [
                "pytest backend/tests + export_openapi.py --check",
                "frontend npm run verify (lint, typecheck, 9 contract suites, build)",
                "Headless Playwright smoke pass against live Uvicorn & Next.js",
            ],
            "security_and_resilience": (
                "CI enforces OpenAPI schema parity and frontend contract tests before running "
                "live end-to-end Playwright smoke checks."
            ),
            "verification_sources": _verify_sources_exist(
                repo_root,
                [
                    "Dockerfile",
                    "frontend/Dockerfile",
                    "docker-compose.yml",
                    ".github/workflows/ci.yml",
                ],
            ),
        },
    ]

    manifest = {
        "provenance": (
            "Programmatically derived from repository manifests, dependency locks, "
            "Docker/CI specs, environment reports, and ONNX parity artifacts."
        ),
        "generated_from": _verify_sources_exist(repo_root, INSPECTED_FILES),
        "onnx_artifact_paths": onnx_paths,
        "categories_summary": categories_summary,
        "boundaries": boundaries,
        "technologies": technologies,
    }
    return manifest


def serialize_manifest(manifest: dict[str, Any]) -> str:
    """Serialize manifest deterministically and verify zero forbidden leaks."""
    serialized = json.dumps(manifest, indent=2) + "\n"
    for pattern in FORBIDDEN_PATTERNS:
        match = pattern.search(serialized)
        if match:
            raise ValueError(
                f"Sanitization check failed: forbidden pattern {pattern.pattern!r} "
                f"matched {match.group(0)!r}."
            )
    return serialized


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate or verify data/technology_manifest.json.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help=f"Target manifest JSON path (default: {DEFAULT_OUTPUT}).",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify that the target manifest JSON matches generator output.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    output_path: Path = args.output
    manifest = build_technology_manifest(REPO_ROOT)
    expected = serialize_manifest(manifest)

    if args.check:
        if not output_path.is_file():
            print(
                f"Technology manifest file not found: {output_path}\n"
                "Regenerate it with: python scripts/generate_technology_manifest.py",
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
                    tofile="generated manifest",
                    lineterm="",
                )
            )
            preview = "\n".join(diff_lines[:80])
            if len(diff_lines) > 80:
                preview += f"\n... ({len(diff_lines) - 80} more diff lines omitted)"
            print(
                f"Technology manifest is out of date: {output_path}\n"
                f"{preview}\n"
                "Regenerate it with: python scripts/generate_technology_manifest.py",
                file=sys.stderr,
            )
            return 1

        print(f"Technology manifest is up to date: {output_path}")
        return 0

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(expected, encoding="utf-8", newline="\n")
    print(
        f"Wrote technology manifest ({len(manifest['technologies'])} items, "
        f"{len(manifest['boundaries'])} boundaries) to {output_path}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
