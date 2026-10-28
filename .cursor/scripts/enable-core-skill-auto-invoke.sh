#!/usr/bin/env bash
# Réapplique disable-model-invocation après un rsync upstream (cœur MSK).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
python3 - "$ROOT" <<'PY'
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]) / ".cursor" / "skills"
CORE = {
    "using-agent-skills",
    "interview-me",
    "idea-refine",
    "planning-and-task-breakdown",
    "incremental-implementation",
    "test-driven-development",
    "frontend-ui-engineering",
    "browser-testing-with-devtools",
    "security-and-hardening",
    "debugging-and-error-recovery",
    "code-review-and-quality",
    "source-driven-development",
}
ON_DEMAND = {
    "spec-driven-development",
    "constraint-driven-development",
    "context-engineering",
    "doubt-driven-development",
    "api-and-interface-design",
    "code-simplification",
    "performance-optimization",
    "observability-and-instrumentation",
    "documentation-and-adrs",
    "deprecation-and-migration",
    "git-workflow-and-versioning",
    "ci-cd-and-automation",
    "shipping-and-launch",
}


def fix(path: Path, value: str) -> None:
    text = path.read_text()
    if not text.startswith("---"):
        raise SystemExit(f"no frontmatter: {path}")
    end = text.find("\n---", 3)
    fm = text[3:end].strip("\n")
    rest = text[end + 4 :]
    if rest.startswith("\n"):
        rest = rest[1:]
    lines = [
        ln
        for ln in fm.splitlines()
        if ln.strip() and not ln.startswith("disable-model-invocation:")
    ]
    lines.append(f"disable-model-invocation: {value}")
    path.write_text("---\n" + "\n".join(lines) + "\n---\n" + rest)
    print(f"{path}: {value}")


for d in sorted(ROOT.iterdir()):
    if not d.is_dir() or d.name.startswith("prisma-"):
        continue
    skill = d / "SKILL.md"
    if not skill.exists():
        continue
    if d.name in CORE:
        fix(skill, "false")
    elif d.name in ON_DEMAND:
        fix(skill, "true")
PY
