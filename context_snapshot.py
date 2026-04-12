#!/usr/bin/env python3
"""
context_snapshot.py — in-skill context window estimator
─────────────────────────────────────────────────────────
Called automatically by the automation skill at phase boundaries.
Reads whatever Claude Code makes available and returns a JSON object
that track_tokens.py can consume directly.

Usage (internal — called by the skill, not manually):
  python3 context_snapshot.py [--phase start|end|phase] [--card QE-89]

Output (stdout, JSON):
  {
    "total":    42000,
    "free":     158000,
    "messages": 26000,
    "mcp":      1400,
    "skills":   1400,
    "system":   6300,
    "tools":    8500,
    "cache_read":  0,
    "cache_write": 0,
    "source":   "estimated|history",
    "confidence": "low|medium|high"
  }
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime, timezone

# ── Known baselines for this project (measured from dry Claude Code sessions) ─
BASELINE = {
    "system":      6_300,
    "tools":       8_500,
    "mcp":         1_400,
    "skills":      1_400,
    "cache_read":  0,
    "cache_write": 0,
}
BASELINE_TOTAL = sum(BASELINE.values())    # ~17 600
MAX_TOKENS     = 200_000

# ── Token estimation: ~4 chars per token (English/code mix) ──────────────────

def chars_to_tokens(text: str) -> int:
    return max(0, len(text) // 4)


def estimate_from_history() -> dict:
    """
    Read ~/.claude/history.jsonl (user-side messages) and estimate total context.
    This is a lower-bound estimate — Claude's responses add significantly more, so
    we apply a 4× multiplier to account for Claude output + tool results.
    """
    history_file = Path.home() / ".claude" / "history.jsonl"
    if not history_file.exists():
        return {"msg_tokens": 0, "entries": 0, "confidence": "low"}

    entries = []
    try:
        with open(history_file) as f:
            for line in f:
                line = line.strip()
                if line:
                    entries.append(json.loads(line))
    except Exception:
        return {"msg_tokens": 0, "entries": 0, "confidence": "low"}

    user_chars = 0
    for entry in entries:
        display = str(entry.get("display", ""))
        user_chars += len(display)
        # Pasted blocks are usually 3-5× longer than their display summary
        paste_count = len(entry.get("pastedContents", {}))
        user_chars += paste_count * len(display) * 3

    user_tokens = max(0, user_chars // 4)   # user_chars is already an int

    # Claude responses + tool call / result round-trips are typically
    # 3-5× the size of user messages in a busy automation session.
    total_msg_tokens = user_tokens * 4

    confidence = "medium" if len(entries) >= 3 else "low"
    return {
        "msg_tokens": total_msg_tokens,
        "entries":    len(entries),
        "confidence": confidence,
    }


def build_snapshot(phase_hint: str = "") -> dict:
    hist = estimate_from_history()
    msg_tokens = hist["msg_tokens"]

    # Phase-specific additive estimates
    # These represent the CUMULATIVE extra context a given phase typically adds
    PHASE_ADDITIVE = {
        "jira_fetch":           5_000,   # Jira API response + parsing
        "playwright_execution": 12_000,  # DOM snapshots × 3 pages
        "gherkin_generation":   18_000,  # Gherkin LLM generation
        "step_definitions":     28_000,  # Step defs + more Playwright inspection
        "pom_generation":       38_000,  # POM class + Playwright DOM inspection
        "dry_run":              42_000,  # dry-run output + any fix iterations
    }
    phase_add = PHASE_ADDITIVE.get(phase_hint, 0)

    total = BASELINE_TOTAL + msg_tokens + phase_add
    total = min(total, MAX_TOKENS)
    free  = MAX_TOKENS - total

    return {
        "total":       total,
        "free":        free,
        "messages":    msg_tokens + phase_add,
        "mcp":         BASELINE["mcp"],
        "skills":      BASELINE["skills"],
        "system":      BASELINE["system"],
        "tools":       BASELINE["tools"],
        "cache_read":  0,
        "cache_write": 0,
        "source":      "estimated" if hist["confidence"] == "low" else "history+estimated",
        "confidence":  hist["confidence"],
        "history_entries": hist["entries"],
    }


def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--phase",  default="",   help="Phase hint for additive estimate")
    p.add_argument("--card",   default="",   help="Card ID (informational only)")
    p.add_argument("--format", default="args", choices=["args", "json"],
                   help="Output format: 'args' for CLI flags, 'json' for raw dict")
    args = p.parse_args()

    snap = build_snapshot(args.phase)

    if args.format == "json":
        print(json.dumps(snap, indent=2))
    else:
        # Emit ready-to-use CLI flags for track_tokens.py
        print(
            f"--total {snap['total']} "
            f"--free {snap['free']} "
            f"--messages {snap['messages']} "
            f"--mcp {snap['mcp']} "
            f"--skills {snap['skills']} "
            f"--system {snap['system']} "
            f"--tools {snap['tools']} "
            f"--cache-read {snap['cache_read']} "
            f"--cache-write {snap['cache_write']}"
        )


if __name__ == "__main__":
    main()
