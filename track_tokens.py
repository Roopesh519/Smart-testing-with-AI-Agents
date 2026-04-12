#!/usr/bin/env python3
"""
Automation Agent — Context Engineering Token Tracker  v2
─────────────────────────────────────────────────────────
COMMANDS
  start      Capture /context snapshot before automation begins
  phase      Capture a mid-run phase snapshot (optional, repeat freely)
  end        Capture /context snapshot after dry-run + compute full delta
  report     Generate 3×3 analytics PNG + text table
  session    Print a live session summary table
  snapshots  List every raw JSON snapshot on disk
  export     Export run data to CSV or JSON
  compare    Side-by-side comparison of two or more cards

QUICK EXAMPLE
  python3 track_tokens.py start --card QE-89 --total 16200 --free 150800 \\
      --system 6300 --tools 8500 --model claude-sonnet-4-6

  python3 track_tokens.py phase --card QE-89 --name gherkin_generation \\
      --total 35000 --messages 24000 --mcp 1200

  python3 track_tokens.py end --card QE-89 --total 76900 --free 89800 \\
      --messages 59400 --mcp 1700 --skills 1400 --system 6300 --tools 8500

  python3 track_tokens.py report
  python3 track_tokens.py session
  python3 track_tokens.py export --format csv
  python3 track_tokens.py compare --cards QE-89 QE-90

STORAGE
  ~/.claude/token_usage_log.json                              ← master log (all runs)
  ~/.claude/token_snapshots/<card>_<runid>_start.json         ← raw /context before
  ~/.claude/token_snapshots/<card>_<runid>_phase_NN_<name>.json ← mid-run checkpoint
  ~/.claude/token_snapshots/<card>_<runid>_end.json           ← raw /context after
  ~/.claude/token_analytics.png                               ← analytics chart
  ~/.claude/token_export.csv / .json                          ← export output
"""

import argparse
import csv
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# ── Constants ─────────────────────────────────────────────────────────────────

SCHEMA_VERSION = "2.0"
LOG_FILE       = Path.home() / ".claude" / "token_usage_log.json"
SNAPSHOTS_DIR  = Path.home() / ".claude" / "token_snapshots"
MAX_TOKENS     = 200_000

# USD per token (approximate list prices — update as needed)
MODEL_PRICING = {
    "claude-sonnet-4-6": {
        "input": 3e-6, "output": 15e-6,
        "cache_read": 3e-7, "cache_write": 3.75e-6,
    },
    "claude-opus-4-6": {
        "input": 15e-6, "output": 75e-6,
        "cache_read": 1.5e-6, "cache_write": 18.75e-6,
    },
    "claude-haiku-4-5": {
        "input": 0.25e-6, "output": 1.25e-6,
        "cache_read": 0.025e-6, "cache_write": 0.3e-6,
    },
    "claude-haiku-4-5-20251001": {
        "input": 0.25e-6, "output": 1.25e-6,
        "cache_read": 0.025e-6, "cache_write": 0.3e-6,
    },
    "default": {
        "input": 3e-6, "output": 15e-6,
        "cache_read": 3e-7, "cache_write": 3.75e-6,
    },
}

PHASE_NAMES = [
    "jira_fetch", "playwright_execution",
    "gherkin_generation", "step_definitions",
    "pom_generation", "dry_run",
]


# ── Pure helpers ──────────────────────────────────────────────────────────────

def pressure_level(pct: float) -> str:
    if pct < 25:   return "low"
    if pct < 50:   return "medium"
    if pct < 75:   return "high"
    return "critical"


def duration_human(seconds) -> str:
    if seconds is None:
        return "—"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h:  return f"{h}h {m}m {s}s"
    if m:  return f"{m}m {s}s"
    return f"{s}s"


def estimate_cost(model: str, consumed: int, cache_read: int = 0, cache_write: int = 0) -> float:
    """Cost estimate assuming 80 % input / 20 % output split for consumed tokens."""
    p = MODEL_PRICING.get(model, MODEL_PRICING["default"])
    return round(
        int(consumed * 0.80) * p["input"]  +
        int(consumed * 0.20) * p["output"] +
        cache_read  * p["cache_read"]      +
        cache_write * p["cache_write"],
        5,
    )


def dominant_category(breakdown: dict) -> str:
    relevant = {k: v for k, v in breakdown.items() if k not in ("cache_read", "cache_write")}
    if not any(relevant.values()):
        return "—"
    return max(relevant, key=relevant.get)


def cache_efficiency_pct(breakdown: dict) -> float:
    cr, cw = breakdown.get("cache_read", 0), breakdown.get("cache_write", 0)
    total = cr + cw
    return round(cr / total * 100, 1) if total > 0 else 0.0


# ── Log I/O ───────────────────────────────────────────────────────────────────

def load_log() -> dict:
    if LOG_FILE.exists():
        with open(LOG_FILE) as f:
            return json.load(f)
    return {"schema_version": SCHEMA_VERSION, "runs": []}


def save_log(data: dict):
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    data["schema_version"] = SCHEMA_VERSION
    with open(LOG_FILE, "w") as f:
        json.dump(data, f, indent=2)


def find_open_run(log: dict, card: str) -> dict | None:
    """Return the most recent in-progress run for a card."""
    for run in reversed(log["runs"]):
        if run["card"] == card and run.get("status") == "in_progress":
            return run
    return None


# ── Snapshot builder ──────────────────────────────────────────────────────────

def _breakdown(args) -> dict:
    return {
        "messages":    getattr(args, "messages",    0) or 0,
        "mcp":         getattr(args, "mcp",         0) or 0,
        "skills":      getattr(args, "skills",      0) or 0,
        "system":      getattr(args, "system",      0) or 0,
        "tools":       getattr(args, "tools",       0) or 0,
        "cache_read":  getattr(args, "cache_read",  0) or 0,
        "cache_write": getattr(args, "cache_write", 0) or 0,
    }


def build_snapshot(card, phase, run_id, args, phase_name=None, phase_index=None) -> dict:
    total_used   = args.total
    free         = getattr(args, "free", 0) or 0
    model        = getattr(args, "model", "claude-sonnet-4-6") or "claude-sonnet-4-6"
    inferred_max = (total_used + free) if free else MAX_TOKENS
    pct_used     = round(total_used / inferred_max * 100, 2) if inferred_max else 0.0
    bd           = _breakdown(args)

    return {
        "schema_version": SCHEMA_VERSION,
        "card":         card,
        "phase":        phase,           # "start" | "phase" | "end"
        "phase_name":   phase_name,      # e.g. "gherkin_generation"
        "phase_index":  phase_index,
        "run_id":       run_id,
        "captured_at":  datetime.now().isoformat(),
        "model":        model,
        "notes":        getattr(args, "notes", "") or "",
        "context_window": {
            "max_tokens":   inferred_max,
            "total_used":   total_used,
            "free":         free,
            "pct_used":     pct_used,
            "pressure":     pressure_level(pct_used),
            "breakdown":    bd,
        },
        "metrics": {
            "estimated_cost_usd":   estimate_cost(model, total_used,
                                                  bd["cache_read"], bd["cache_write"]),
            "cache_efficiency_pct": cache_efficiency_pct(bd),
            "dominant_category":    dominant_category(bd),
            "context_pressure":     pressure_level(pct_used),
        },
    }


def save_snapshot(snap: dict) -> str:
    SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    idx  = snap.get("phase_index")
    name = snap.get("phase_name") or snap["phase"]
    if idx is not None:
        fname = f"{snap['card']}_{snap['run_id']}_phase_{idx:02d}_{name}.json"
    else:
        fname = f"{snap['card']}_{snap['run_id']}_{snap['phase']}.json"
    path = SNAPSHOTS_DIR / fname
    with open(path, "w") as f:
        json.dump(snap, f, indent=2)
    return str(path)


# ── Commands ──────────────────────────────────────────────────────────────────

def cmd_start(args):
    log    = load_log()
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    snap   = build_snapshot(args.card, "start", run_id, args)
    path   = save_snapshot(snap)
    cw     = snap["context_window"]
    m      = snap["metrics"]

    run = {
        "schema_version": SCHEMA_VERSION,
        "card":           args.card,
        "card_title":     getattr(args, "card_title", "") or "",
        "run_id":         run_id,
        "model":          snap["model"],
        "status":         "in_progress",
        "started_at":     snap["captured_at"],
        "ended_at":       None,
        "duration_seconds": None,
        "context": {
            "max_tokens": cw["max_tokens"],
            "start":      cw,
            "phases":     [],
            "end":        None,
            "delta":      None,
        },
        "metrics": {
            "token_velocity_per_sec": None,
            "estimated_cost_usd":     m["estimated_cost_usd"],
            "context_pressure_start": m["context_pressure"],
            "context_pressure_end":   None,
            "cache_efficiency_pct":   m["cache_efficiency_pct"],
            "dominant_category":      m["dominant_category"],
            "efficiency_ratio_pct":   None,
            "mcp_overhead_pct":       None,
            "skills_overhead_pct":    None,
        },
        "files": {
            "start_json":  path,
            "phase_jsons": [],
            "end_json":    None,
        },
        "notes": getattr(args, "notes", "") or "",
    }
    log["runs"].append(run)
    save_log(log)

    print(f"[START]  {args.card}  (run {run_id})")
    print(f"         Tokens used      : {args.total:,}  ({cw['pct_used']}% of window)")
    print(f"         Context pressure : {m['context_pressure']}")
    print(f"         Model            : {snap['model']}")
    print(f"         Raw JSON → {path}")


def cmd_phase(args):
    """Capture an optional mid-run phase checkpoint."""
    log = load_log()
    run = find_open_run(log, args.card)
    if not run:
        print(f"[ERROR]  No in-progress run for {args.card}. Run 'start' first.")
        sys.exit(1)

    phase_index = len(run["context"]["phases"])
    snap = build_snapshot(
        args.card, "phase", run["run_id"], args,
        phase_name=args.name, phase_index=phase_index,
    )
    path = save_snapshot(snap)

    # Tokens consumed since last checkpoint
    checkpoints = [run["context"]["start"]] + [p["context_window_snapshot"]
                   for p in run["context"]["phases"] if "context_window_snapshot" in p]
    prev_total  = (checkpoints[-1].get("total_used", 0) if checkpoints
                   else run["context"]["start"]["total_used"])
    phase_consumed = snap["context_window"]["total_used"] - prev_total

    run["context"]["phases"].append({
        "name":                  args.name,
        "index":                 phase_index,
        "captured_at":           snap["captured_at"],
        "tokens_at_checkpoint":  snap["context_window"]["total_used"],
        "pct_used":              snap["context_window"]["pct_used"],
        "pressure":              snap["context_window"]["pressure"],
        "phase_tokens_consumed": phase_consumed,
        "context_window_snapshot": snap["context_window"],
        "file":                  path,
    })
    run["files"]["phase_jsons"].append(path)
    save_log(log)

    print(f"[PHASE]  {args.card} → {args.name}  (index {phase_index})")
    print(f"         Tokens at checkpoint : {args.total:,} ({snap['context_window']['pct_used']}%)")
    print(f"         Phase consumed       : {phase_consumed:,} tokens")
    print(f"         Context pressure     : {snap['context_window']['pressure']}")
    print(f"         Raw JSON → {path}")


def cmd_end(args):
    log = load_log()
    run = find_open_run(log, args.card)
    if not run:
        print(f"[ERROR]  No in-progress run for {args.card}. Run 'start' first.")
        sys.exit(1)

    snap  = build_snapshot(args.card, "end", run["run_id"], args)
    path  = save_snapshot(snap)

    # Duration
    started = datetime.fromisoformat(run["started_at"])
    ended   = datetime.fromisoformat(snap["captured_at"])
    dur_sec = round((ended - started).total_seconds(), 1)

    s  = run["context"]["start"]
    e  = snap["context_window"]
    consumed = e["total_used"] - s["total_used"]

    # Per-category deltas
    bd_delta = {k: e["breakdown"].get(k, 0) - s["breakdown"].get(k, 0)
                for k in e["breakdown"]}

    cr_d = bd_delta.get("cache_read",  0)
    cw_d = bd_delta.get("cache_write", 0)
    msg_d = bd_delta.get("messages",   0)
    mcp_d = bd_delta.get("mcp",        0)
    sk_d  = bd_delta.get("skills",     0)

    run["status"]            = "complete"
    run["ended_at"]          = snap["captured_at"]
    run["duration_seconds"]  = dur_sec
    run["context"]["end"]    = e
    run["context"]["delta"]  = {
        "total_consumed":  consumed,
        "pct_of_window":   round(consumed / MAX_TOKENS * 100, 2),
        "breakdown_delta": bd_delta,
    }
    run["files"]["end_json"] = path

    run["metrics"].update({
        "token_velocity_per_sec": round(consumed / dur_sec, 1) if dur_sec > 0 else 0,
        "estimated_cost_usd":     estimate_cost(run["model"], consumed, cr_d, cw_d),
        "context_pressure_end":   e["pressure"],
        "cache_efficiency_pct":   round(cr_d / (cr_d + cw_d) * 100, 1) if (cr_d + cw_d) > 0 else 0,
        "dominant_category":      dominant_category(bd_delta),
        "efficiency_ratio_pct":   round(msg_d / consumed * 100, 1) if consumed > 0 else 0,
        "mcp_overhead_pct":       round(mcp_d / consumed * 100, 1) if consumed > 0 else 0,
        "skills_overhead_pct":    round(sk_d  / consumed * 100, 1) if consumed > 0 else 0,
    })
    save_log(log)

    d = run["context"]["delta"]
    m = run["metrics"]
    bd = d["breakdown_delta"]

    print(f"[END]    {args.card}  (run {run['run_id']})")
    print(f"")
    print(f"         Consumed         : {consumed:,}  ({d['pct_of_window']}% of 200k window)")
    print(f"         Duration         : {duration_human(dur_sec)}")
    print(f"         Velocity         : {m['token_velocity_per_sec']:,.1f} tok/s")
    print(f"         Est. Cost        : ${m['estimated_cost_usd']:.5f}")
    print(f"         Pressure (end)   : {m['context_pressure_end']}")
    print(f"")
    print(f"         ┌─ Breakdown delta ─────────────────────────")
    print(f"         │  Messages    : {bd.get('messages', 0):>10,}  ({m['efficiency_ratio_pct']}% of total)")
    print(f"         │  MCP tools   : {bd.get('mcp', 0):>10,}  ({m['mcp_overhead_pct']}% overhead)")
    print(f"         │  Skills      : {bd.get('skills', 0):>10,}  ({m['skills_overhead_pct']}% overhead)")
    print(f"         │  System      : {bd.get('system', 0):>10,}")
    print(f"         │  Tools       : {bd.get('tools', 0):>10,}")
    print(f"         │  Cache read  : {bd.get('cache_read', 0):>10,}")
    print(f"         │  Cache write : {bd.get('cache_write', 0):>10,}")
    print(f"         └───────────────────────────────────────────")
    if run["context"]["phases"]:
        print(f"\n         Phases captured: {len(run['context']['phases'])}")
        for ph in run["context"]["phases"]:
            print(f"           [{ph['index']}] {ph['name']:<22} +{ph['phase_tokens_consumed']:,} tok  "
                  f"@ {ph['pct_used']}%  ({ph['pressure']})")
    print(f"\n         Raw JSON → {path}")
    print(f"\nRun: python3 track_tokens.py report    to generate the analytics chart.")


def cmd_snapshots(args):
    if not SNAPSHOTS_DIR.exists():
        print("No snapshots saved yet.")
        return
    files = sorted(SNAPSHOTS_DIR.glob("*.json"))
    card  = getattr(args, "card", None)
    if card:
        files = [f for f in files if f.name.startswith(card + "_")]
    if not files:
        print("No matching snapshot files.")
        return

    print(f"\n{'PHASE':<8} {'CARD':<12} {'PRESSURE':<10} {'TOK USED':>10} {'%':>6}  CAPTURED")
    print("─" * 80)
    for f in files:
        try:
            with open(f) as fh:
                d = json.load(fh)
            cw = d["context_window"]
            print(f"{d['phase']:<8} {d['card']:<12} {cw.get('pressure','—'):<10} "
                  f"{cw['total_used']:>10,} {cw['pct_used']:>5.1f}%  {d['captured_at']}")
        except Exception:
            print(f"  (unreadable) {f.name}")


def cmd_session(args):
    log      = load_log()
    complete = [r for r in log["runs"] if r["status"] == "complete"]
    in_prog  = [r for r in log["runs"] if r["status"] == "in_progress"]

    if not log["runs"]:
        print("No runs recorded yet.")
        return

    print(f"\n{'─'*98}")
    print(f"  SESSION SUMMARY   {len(complete)} complete · {len(in_prog)} in-progress"
          f"   window: {MAX_TOKENS:,} tokens")
    print(f"{'─'*98}")
    hdr = (f"{'CARD':<12} {'STATUS':<12} {'CONSUMED':>10} {'%WIN':>6} "
           f"{'COST':>9} {'VEL tok/s':>10} {'DURATION':<12} {'EFF%':>5} {'PRESSURE'}")
    print(hdr)
    print("─" * 98)

    total_consumed = 0
    total_cost     = 0.0
    for r in log["runs"]:
        if r["status"] == "complete":
            d  = r["context"]["delta"]
            m  = r["metrics"]
            total_consumed += d["total_consumed"]
            total_cost     += m.get("estimated_cost_usd", 0) or 0
            print(f"{r['card']:<12} {r['status']:<12} {d['total_consumed']:>10,} "
                  f"{d['pct_of_window']:>5.1f}% ${m.get('estimated_cost_usd',0):>8.4f} "
                  f"{m.get('token_velocity_per_sec',0) or 0:>9.0f}/s "
                  f"{duration_human(r.get('duration_seconds')):<12} "
                  f"{m.get('efficiency_ratio_pct',0) or 0:>4.0f}%  "
                  f"{m.get('context_pressure_end','—')}")
        else:
            s = r["context"]["start"]
            print(f"{r['card']:<12} {'in_progress':<12} {'(running)':>10} "
                  f"{s['pct_used']:>5.1f}%  {'—':>9}  {'—':>10}   {'—':<12} {'—':>5}  {s['pressure']}")

    print("─" * 98)
    remaining = MAX_TOKENS - total_consumed
    avg       = total_consumed // len(complete) if complete else 0
    left      = int(remaining / avg) if avg else 0
    print(f"{'TOTAL':<12} {'':<12} {total_consumed:>10,}  {'':>6} ${total_cost:>8.4f}")
    print(f"\n  Remaining in 200k window : {remaining:,} tokens ({remaining/MAX_TOKENS*100:.1f}%)")
    if avg:
        print(f"  Avg per card : {avg:,}   Est. cards remaining : {left}")


def cmd_export(args):
    log  = load_log()
    runs = [r for r in log["runs"] if r["status"] == "complete"]
    card = getattr(args, "card", None)
    if card:
        runs = [r for r in runs if r["card"] == card]
    if not runs:
        print("No completed runs to export.")
        sys.exit(1)

    fmt      = getattr(args, "format", "csv") or "csv"
    out_arg  = getattr(args, "output", None)
    out_path = Path(out_arg) if out_arg else (
        Path.home() / ".claude" / f"token_export.{fmt}"
    )

    if fmt == "json":
        with open(out_path, "w") as f:
            json.dump({"schema_version": SCHEMA_VERSION, "runs": runs}, f, indent=2)
    else:
        with open(out_path, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow([
                "card", "card_title", "run_id", "model",
                "started_at", "ended_at", "duration_seconds",
                "total_consumed", "pct_of_window",
                "messages_delta", "mcp_delta", "skills_delta",
                "system_delta", "tools_delta",
                "cache_read_delta", "cache_write_delta",
                "token_velocity_per_sec", "estimated_cost_usd",
                "context_pressure_start", "context_pressure_end",
                "efficiency_ratio_pct", "mcp_overhead_pct", "skills_overhead_pct",
                "dominant_category", "cache_efficiency_pct",
                "phases_count", "notes",
            ])
            for r in runs:
                d  = r["context"]["delta"]
                m  = r["metrics"]
                bd = d["breakdown_delta"]
                w.writerow([
                    r["card"], r.get("card_title", ""), r["run_id"], r["model"],
                    r["started_at"], r["ended_at"], r.get("duration_seconds"),
                    d["total_consumed"], d["pct_of_window"],
                    bd.get("messages", 0), bd.get("mcp", 0), bd.get("skills", 0),
                    bd.get("system", 0),  bd.get("tools", 0),
                    bd.get("cache_read", 0), bd.get("cache_write", 0),
                    m.get("token_velocity_per_sec"),
                    m.get("estimated_cost_usd"),
                    m.get("context_pressure_start"),
                    m.get("context_pressure_end"),
                    m.get("efficiency_ratio_pct"),
                    m.get("mcp_overhead_pct"),
                    m.get("skills_overhead_pct"),
                    m.get("dominant_category"),
                    m.get("cache_efficiency_pct"),
                    len(r["context"].get("phases", [])),
                    r.get("notes", ""),
                ])

    print(f"[EXPORT] {len(runs)} run(s) → {out_path}")


def cmd_compare(args):
    log      = load_log()
    complete = {r["card"]: r for r in log["runs"] if r["status"] == "complete"}
    selected = [complete[c] for c in args.cards if c in complete]
    missing  = [c for c in args.cards if c not in complete]

    if missing:
        print(f"[WARN]  Not found (or not complete): {', '.join(missing)}")
    if len(selected) < 2:
        print(f"[ERROR]  Need ≥2 completed cards. Available: {list(complete.keys())}")
        sys.exit(1)

    print(f"\n{'─'*90}")
    print(f"  COMPARISON: {' vs '.join(r['card'] for r in selected)}")
    print(f"{'─'*90}")
    col = 16
    header = f"{'METRIC':<28}" + "".join(f"{r['card']:>{col}}" for r in selected)
    print(header)
    print("─" * len(header))

    def row(label, values):
        return f"{label:<28}" + "".join(f"{str(v):>{col}}" for v in values)

    def safe(r, *keys, default="—"):
        obj = r
        for k in keys:
            if not isinstance(obj, dict):
                return default
            obj = obj.get(k, default)
            if obj is None:
                return default
        return obj

    rows = [
        ("Tokens consumed",    [f"{safe(r,'context','delta','total_consumed'):,}"   for r in selected]),
        ("% of window",        [f"{safe(r,'context','delta','pct_of_window')}%"     for r in selected]),
        ("Messages Δ",         [f"{safe(r,'context','delta','breakdown_delta','messages',default=0):,}" for r in selected]),
        ("MCP Δ",              [f"{safe(r,'context','delta','breakdown_delta','mcp',default=0):,}"      for r in selected]),
        ("Skills Δ",           [f"{safe(r,'context','delta','breakdown_delta','skills',default=0):,}"   for r in selected]),
        ("System Δ",           [f"{safe(r,'context','delta','breakdown_delta','system',default=0):,}"   for r in selected]),
        ("Tools Δ",            [f"{safe(r,'context','delta','breakdown_delta','tools',default=0):,}"    for r in selected]),
        ("Cache read Δ",       [f"{safe(r,'context','delta','breakdown_delta','cache_read',default=0):,}" for r in selected]),
        ("Duration",           [duration_human(r.get("duration_seconds")) for r in selected]),
        ("Velocity (tok/s)",   [f"{safe(r,'metrics','token_velocity_per_sec') or 0:,.1f}" for r in selected]),
        ("Est. cost (USD)",    [f"${safe(r,'metrics','estimated_cost_usd') or 0:.5f}" for r in selected]),
        ("Efficiency % (msg)", [f"{safe(r,'metrics','efficiency_ratio_pct') or 0:.1f}%" for r in selected]),
        ("MCP overhead %",     [f"{safe(r,'metrics','mcp_overhead_pct') or 0:.1f}%" for r in selected]),
        ("Skills overhead %",  [f"{safe(r,'metrics','skills_overhead_pct') or 0:.1f}%" for r in selected]),
        ("Cache efficiency %", [f"{safe(r,'metrics','cache_efficiency_pct') or 0:.1f}%" for r in selected]),
        ("Pressure (end)",     [safe(r, "metrics", "context_pressure_end") for r in selected]),
        ("Dominant category",  [safe(r, "metrics", "dominant_category") for r in selected]),
        ("Phases captured",    [str(len(r["context"].get("phases", []))) for r in selected]),
        ("Model",              [r.get("model", "—") for r in selected]),
    ]
    for label, values in rows:
        print(row(label, values))
    print("─" * len(header))


# ── Report (3 × 3 analytics grid) ────────────────────────────────────────────

def cmd_report(args):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import matplotlib.gridspec as gridspec
        import matplotlib.patches as mpatches
        import numpy as np
    except ImportError:
        print("Installing matplotlib…")
        os.system(f"{sys.executable} -m pip install matplotlib --quiet --break-system-packages")
        import matplotlib; matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import matplotlib.gridspec as gridspec
        import matplotlib.patches as mpatches
        import numpy as np

    log  = load_log()
    runs = [r for r in log["runs"] if r["status"] == "complete"]
    card = getattr(args, "card", None)
    if card:
        runs = [r for r in runs if r["card"] == card]
    if not runs:
        print("No completed runs found. Capture an 'end' snapshot first.")
        sys.exit(1)

    # ── Colour palette ────────────────────────────────────────────────────────
    BG       = "#0f1117"
    CARD_BG  = "#1a1d27"
    ACCENT   = "#7c6af7"
    GREEN    = "#22c55e"
    AMBER    = "#f59e0b"
    CORAL    = "#f87171"
    TEAL     = "#2dd4bf"
    PINK     = "#f472b6"
    ORANGE   = "#fb923c"
    BLUE     = "#60a5fa"
    TEXT     = "#e2e8f0"
    SUBTEXT  = "#94a3b8"
    GRID     = "#2d3148"

    PRESSURE_CLR = {"low": GREEN, "medium": AMBER, "high": ORANGE, "critical": CORAL}
    CAT_CLR      = [ACCENT, TEAL, GREEN, AMBER, CORAL]   # messages, mcp, skills, system, tools
    CAT_NAMES    = ["Messages", "MCP", "Skills", "System", "Tools"]

    # ── Extract series ────────────────────────────────────────────────────────
    labels   = [r["card"] for r in runs]
    consumed = [r["context"]["delta"]["total_consumed"] for r in runs]
    pct_win  = [r["context"]["delta"]["pct_of_window"] for r in runs]
    bd_list  = [r["context"]["delta"]["breakdown_delta"] for r in runs]

    msg_d  = [bd.get("messages",    0) for bd in bd_list]
    mcp_d  = [bd.get("mcp",         0) for bd in bd_list]
    sk_d   = [bd.get("skills",      0) for bd in bd_list]
    sys_d  = [bd.get("system",      0) for bd in bd_list]
    tool_d = [bd.get("tools",       0) for bd in bd_list]
    cr_d   = [bd.get("cache_read",  0) for bd in bd_list]

    costs    = [r["metrics"].get("estimated_cost_usd", 0) or 0 for r in runs]
    velocity = [r["metrics"].get("token_velocity_per_sec", 0) or 0 for r in runs]
    eff      = [r["metrics"].get("efficiency_ratio_pct", 0) or 0 for r in runs]
    pressures= [r["metrics"].get("context_pressure_end", "low") for r in runs]
    p_clrs   = [PRESSURE_CLR.get(p, ACCENT) for p in pressures]

    # ── Figure 3 × 3 ─────────────────────────────────────────────────────────
    fig = plt.figure(figsize=(21, 15), facecolor=BG)
    fig.suptitle(
        "Automation Agent — Context Engineering Analytics  (v2)",
        fontsize=17, fontweight="bold", color=TEXT, y=0.98,
    )
    gs = gridspec.GridSpec(3, 3, figure=fig,
                           hspace=0.52, wspace=0.38,
                           left=0.06, right=0.97, top=0.93, bottom=0.05)
    axs = [fig.add_subplot(gs[r, c]) for r in range(3) for c in range(3)]
    ax1, ax2, ax3, ax4, ax5, ax6, ax7, ax8, ax9 = axs

    for ax in axs:
        ax.set_facecolor(CARD_BG)
        ax.tick_params(colors=SUBTEXT, labelsize=8)
        for sp in ax.spines.values():
            sp.set_color(GRID); sp.set_linewidth(0.5)

    x = np.arange(len(labels))

    def ticks(ax, lab=True):
        ax.set_xticks(x)
        if lab:
            ax.set_xticklabels(labels, color=SUBTEXT, fontsize=8)
        ax.yaxis.grid(True, color=GRID, linewidth=0.4, zorder=0)
        ax.set_axisbelow(True)

    def label_bars(ax, bars, fmt="{:,}", yoff=300, fontsize=7):
        for bar in bars:
            h = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, h + yoff,
                    fmt.format(h), ha="center", va="bottom", color=TEXT, fontsize=fontsize)

    # ── 1. Stacked bar: token breakdown per card ──────────────────────────────
    bottom = np.zeros(len(labels))
    for cat_vals, name, clr in zip([msg_d, mcp_d, sk_d, sys_d, tool_d], CAT_NAMES, CAT_CLR):
        ax1.bar(x, cat_vals, bottom=bottom, label=name, color=clr, width=0.6, zorder=3)
        bottom += np.array(cat_vals)
    ticks(ax1)
    ax1.set_ylabel("Tokens", color=SUBTEXT, fontsize=8)
    ax1.set_title("Token breakdown per card", color=TEXT, fontsize=10, pad=6)
    ax1.legend(fontsize=7, facecolor=CARD_BG, edgecolor=GRID, labelcolor=SUBTEXT,
               loc="upper left", ncol=2)

    # ── 2. Bar: total consumed (pressure-coloured) ────────────────────────────
    bars2 = ax2.bar(x, consumed, color=p_clrs, width=0.6, zorder=3)
    ticks(ax2)
    ax2.set_ylabel("Tokens", color=SUBTEXT, fontsize=8)
    ax2.set_title("Total consumed per card", color=TEXT, fontsize=10, pad=6)
    label_bars(ax2, bars2)
    legend_els = [mpatches.Patch(color=v, label=k) for k, v in PRESSURE_CLR.items()]
    ax2.legend(handles=legend_els, fontsize=6, facecolor=CARD_BG,
               edgecolor=GRID, labelcolor=SUBTEXT, loc="upper right")

    # ── 3. Donut: session context health ─────────────────────────────────────
    total_session = sum(consumed)
    free_session  = max(0, MAX_TOKENS - total_session)
    ring_clr = CORAL if total_session / MAX_TOKENS > 0.5 else (
               AMBER if total_session / MAX_TOKENS > 0.25 else GREEN)
    ax3.pie(
        [total_session, free_session],
        colors=[ring_clr, GRID],
        startangle=90,
        wedgeprops={"width": 0.45, "edgecolor": BG, "linewidth": 2},
    )
    ax3.text(0, 0.05, f"{total_session/MAX_TOKENS*100:.1f}%",
             ha="center", va="center", color=TEXT, fontsize=14, fontweight="bold")
    ax3.text(0, -0.22, "of 200k used",
             ha="center", va="center", color=SUBTEXT, fontsize=8)
    ax3.text(0, -0.80, f"{total_session:,} / {MAX_TOKENS:,}",
             ha="center", va="center", color=SUBTEXT, fontsize=7)
    ax3.set_title("Session context health", color=TEXT, fontsize=10, pad=6)

    # ── 4. Bar: % window per card (threshold lines) ───────────────────────────
    pct_clrs = [GREEN if p < 25 else AMBER if p < 50 else ORANGE if p < 75 else CORAL
                for p in pct_win]
    bars4 = ax4.bar(x, pct_win, color=pct_clrs, width=0.6, zorder=3)
    ticks(ax4)
    ax4.set_ylabel("% of 200k window", color=SUBTEXT, fontsize=8)
    ax4.set_title("Context window % per card", color=TEXT, fontsize=10, pad=6)
    for thr, clr, lbl in [(25, GREEN, "25 %"), (50, AMBER, "50 %"), (75, ORANGE, "75 %")]:
        ax4.axhline(y=thr, color=clr, linewidth=0.7, linestyle="--", alpha=0.5, label=lbl)
    ax4.legend(fontsize=6, facecolor=CARD_BG, edgecolor=GRID, labelcolor=SUBTEXT)
    for bar, val in zip(bars4, pct_win):
        ax4.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
                 f"{val:.1f}%", ha="center", va="bottom", color=TEXT, fontsize=7)

    # ── 5. Scatter: messages vs MCP ───────────────────────────────────────────
    ax5.scatter(msg_d, mcp_d, color=TEAL, s=90, zorder=3, edgecolors=BG, linewidth=0.8)
    for i, lbl in enumerate(labels):
        ax5.annotate(lbl, (msg_d[i], mcp_d[i]),
                     textcoords="offset points", xytext=(6, 4),
                     color=SUBTEXT, fontsize=7)
    ax5.set_xlabel("Message tokens", color=SUBTEXT, fontsize=8)
    ax5.set_ylabel("MCP tokens",     color=SUBTEXT, fontsize=8)
    ax5.set_title("Messages vs MCP per card", color=TEXT, fontsize=10, pad=6)
    ax5.yaxis.grid(True, color=GRID, linewidth=0.4, zorder=0)
    ax5.xaxis.grid(True, color=GRID, linewidth=0.4, zorder=0)
    ax5.set_axisbelow(True)

    # ── 6. Bar: estimated cost per card ──────────────────────────────────────
    bars6 = ax6.bar(x, costs, color=PINK, width=0.6, zorder=3)
    ticks(ax6)
    ax6.set_ylabel("USD ($)", color=SUBTEXT, fontsize=8)
    ax6.set_title("Estimated cost per card", color=TEXT, fontsize=10, pad=6)
    for bar, val in zip(bars6, costs):
        ax6.text(bar.get_x() + bar.get_width()/2, bar.get_height() * 1.03 + 1e-6,
                 f"${val:.4f}", ha="center", va="bottom", color=TEXT, fontsize=7)

    # ── 7. Line: cumulative burn across session ───────────────────────────────
    cumulative = []
    running = 0
    for c in consumed:
        running += c
        cumulative.append(running)
    ax7.plot(range(1, len(runs)+1), cumulative, color=ACCENT,
             linewidth=2, marker="o", markersize=6, zorder=3)
    ax7.fill_between(range(1, len(runs)+1), cumulative, alpha=0.12, color=ACCENT)
    ax7.axhline(y=MAX_TOKENS,        color=CORAL,  linewidth=0.9, linestyle="--",
                alpha=0.8, label="200k limit")
    ax7.axhline(y=MAX_TOKENS * 0.75, color=ORANGE, linewidth=0.7, linestyle=":",
                alpha=0.5, label="75 % warn")
    ax7.set_xticks(range(1, len(runs)+1))
    ax7.set_xticklabels(labels, color=SUBTEXT, fontsize=8)
    ax7.set_ylabel("Cumulative tokens", color=SUBTEXT, fontsize=8)
    ax7.set_title("Cumulative token burn", color=TEXT, fontsize=10, pad=6)
    ax7.yaxis.grid(True, color=GRID, linewidth=0.4, zorder=0)
    ax7.set_axisbelow(True)
    ax7.legend(fontsize=7, facecolor=CARD_BG, edgecolor=GRID, labelcolor=SUBTEXT)

    # ── 8. Bar: token velocity (tok/s) ────────────────────────────────────────
    vel_clrs = [BLUE if v > 0 else SUBTEXT for v in velocity]
    bars8 = ax8.bar(x, velocity, color=vel_clrs, width=0.6, zorder=3)
    ticks(ax8)
    ax8.set_ylabel("tokens / second", color=SUBTEXT, fontsize=8)
    ax8.set_title("Token velocity per card", color=TEXT, fontsize=10, pad=6)
    for bar, val in zip(bars8, velocity):
        if val:
            ax8.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
                     f"{val:.1f}", ha="center", va="bottom", color=TEXT, fontsize=7)

    # ── 9. Bar: context efficiency ratio ─────────────────────────────────────
    eff_clrs = [GREEN if e >= 70 else AMBER if e >= 40 else CORAL for e in eff]
    bars9 = ax9.bar(x, eff, color=eff_clrs, width=0.6, zorder=3)
    ticks(ax9)
    ax9.set_ylabel("% tokens on messages", color=SUBTEXT, fontsize=8)
    ax9.set_title("Context efficiency ratio", color=TEXT, fontsize=10, pad=6)
    ax9.set_ylim(0, 115)
    for thr, clr, lbl in [(70, GREEN, "70 % good"), (40, AMBER, "40 % ok")]:
        ax9.axhline(y=thr, color=clr, linewidth=0.7, linestyle="--", alpha=0.5, label=lbl)
    ax9.legend(fontsize=6, facecolor=CARD_BG, edgecolor=GRID, labelcolor=SUBTEXT)
    for bar, val in zip(bars9, eff):
        ax9.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                 f"{val:.1f}%", ha="center", va="bottom", color=TEXT, fontsize=7)

    # ── Footer ────────────────────────────────────────────────────────────────
    total_cost = sum(costs)
    avg = total_session // len(runs) if runs else 0
    left = int((MAX_TOKENS - total_session) / avg) if avg else 0
    fig.text(
        0.06, 0.01,
        f"Session total: {total_session:,} tokens  |  Avg/card: {avg:,}  |  "
        f"Est. cards remaining in window: {left}  |  Total cost: ${total_cost:.5f}  |  "
        f"Runs: {len(runs)}  |  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        color=SUBTEXT, fontsize=7,
    )

    # ── Save ──────────────────────────────────────────────────────────────────
    out = Path.home() / ".claude" / "token_analytics.png"
    plt.savefig(out, dpi=150, bbox_inches="tight", facecolor=BG)
    print(f"[REPORT] Chart saved → {out}")
    print(f"         View with  : xdg-open {out}")

    # ── Text table ────────────────────────────────────────────────────────────
    W = 100
    print(f"\n{'─'*W}")
    print(f"{'Card':<12} {'Consumed':>10} {'Msg':>9} {'MCP':>8} {'Skills':>7} "
          f"{'Cost':>9} {'Vel/s':>8} {'Eff%':>6} {'MCP%':>6} {'Pressure'}")
    print(f"{'─'*W}")
    for r in runs:
        d  = r["context"]["delta"]
        m  = r["metrics"]
        bd = d["breakdown_delta"]
        print(
            f"{r['card']:<12} {d['total_consumed']:>10,} "
            f"{bd.get('messages',0):>9,} {bd.get('mcp',0):>8,} "
            f"{bd.get('skills',0):>7,} "
            f"${m.get('estimated_cost_usd',0):>8.4f} "
            f"{m.get('token_velocity_per_sec',0) or 0:>7.0f}/s "
            f"{m.get('efficiency_ratio_pct',0) or 0:>5.1f}% "
            f"{m.get('mcp_overhead_pct',0) or 0:>5.1f}% "
            f"{m.get('context_pressure_end','—')}"
        )
    print(f"{'─'*W}")
    print(f"{'TOTAL':<12} {total_session:>10,}   ${total_cost:.5f}")

    if SNAPSHOTS_DIR.exists():
        snaps = sorted(SNAPSHOTS_DIR.glob("*.json"))
        if snaps:
            print(f"\n[RAW JSON SNAPSHOTS] → {SNAPSHOTS_DIR}")
            for s in snaps:
                print(f"  {s.name}")


# ── CLI ───────────────────────────────────────────────────────────────────────

def _context_args(p):
    """Shared /context flags for start / phase / end."""
    p.add_argument("--total",        type=int, required=True,
                   help="Total tokens used (read from /context)")
    p.add_argument("--free",         type=int, default=0,
                   help="Free tokens remaining")
    p.add_argument("--messages",     type=int, default=0)
    p.add_argument("--mcp",          type=int, default=0)
    p.add_argument("--skills",       type=int, default=0)
    p.add_argument("--system",       type=int, default=0)
    p.add_argument("--tools",        type=int, default=0)
    p.add_argument("--cache-read",   type=int, default=0, dest="cache_read",
                   help="Cache-read tokens (from /context if shown)")
    p.add_argument("--cache-write",  type=int, default=0, dest="cache_write",
                   help="Cache-write tokens")
    p.add_argument("--model",        default="claude-sonnet-4-6",
                   help="Model ID (default: claude-sonnet-4-6)")
    p.add_argument("--notes",        default="", help="Free-text annotation")


def main():
    parser = argparse.ArgumentParser(
        description="Automation Agent — Context Engineering Token Tracker v2",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = parser.add_subparsers(dest="command")

    # start ───────────────────────────────────────────────────────────────────
    p_s = sub.add_parser("start", help="Capture /context start snapshot")
    p_s.add_argument("--card",       required=True, help="Jira card ID  e.g. QE-89")
    p_s.add_argument("--card-title", default="", dest="card_title",
                     help="Optional Jira card title")
    _context_args(p_s)

    # phase ───────────────────────────────────────────────────────────────────
    p_ph = sub.add_parser("phase", help="Capture a mid-run phase checkpoint")
    p_ph.add_argument("--card", required=True)
    p_ph.add_argument("--name", required=True,
                      choices=PHASE_NAMES + ["custom"],
                      metavar=f"{{{','.join(PHASE_NAMES)},custom}}",
                      help="Phase name")
    _context_args(p_ph)

    # end ─────────────────────────────────────────────────────────────────────
    p_e = sub.add_parser("end", help="Capture /context end snapshot + compute delta")
    p_e.add_argument("--card", required=True)
    _context_args(p_e)

    # report ──────────────────────────────────────────────────────────────────
    p_r = sub.add_parser("report", help="Generate 3×3 analytics PNG + text table")
    p_r.add_argument("--card", default=None, help="Filter to specific card")

    # session ─────────────────────────────────────────────────────────────────
    sub.add_parser("session", help="Print live session summary table")

    # snapshots ───────────────────────────────────────────────────────────────
    p_sn = sub.add_parser("snapshots", help="List all raw JSON snapshot files")
    p_sn.add_argument("--card", default=None)

    # export ──────────────────────────────────────────────────────────────────
    p_ex = sub.add_parser("export", help="Export run data to CSV or JSON")
    p_ex.add_argument("--card",   default=None)
    p_ex.add_argument("--format", default="csv", choices=["csv", "json"])
    p_ex.add_argument("--output", default=None, help="Output file path")

    # compare ─────────────────────────────────────────────────────────────────
    p_c = sub.add_parser("compare", help="Side-by-side comparison of two or more cards")
    p_c.add_argument("--cards", nargs="+", required=True, help="Card IDs to compare")

    # Dispatch ────────────────────────────────────────────────────────────────
    args = parser.parse_args()
    dispatch = {
        "start":     cmd_start,
        "phase":     cmd_phase,
        "end":       cmd_end,
        "report":    cmd_report,
        "session":   cmd_session,
        "snapshots": cmd_snapshots,
        "export":    cmd_export,
        "compare":   cmd_compare,
    }
    if args.command in dispatch:
        dispatch[args.command](args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
