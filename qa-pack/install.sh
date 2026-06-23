#!/usr/bin/env bash
# install.sh — drop the QA agent pack into any product repo
# Usage: run from inside the target repo root:
#   bash path/to/qa-pack/install.sh

set -euo pipefail

PACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-$(pwd)}"

echo "Installing QA agent pack into: $TARGET_DIR"
echo ""

# ── 1. .claude/ skills + commands ────────────────────────────────────────────
if [ -d "$TARGET_DIR/.claude" ]; then
  echo "✓ .claude/ exists — merging skills and commands (existing files kept)"
  cp -rn "$PACK_DIR/.claude/skills" "$TARGET_DIR/.claude/" 2>/dev/null || true
  cp -rn "$PACK_DIR/.claude/commands" "$TARGET_DIR/.claude/" 2>/dev/null || true
else
  echo "✓ Copying .claude/ (skills, commands, settings)"
  cp -r "$PACK_DIR/.claude" "$TARGET_DIR/"
fi

# ── 2. settings.json (MCP Playwright) ────────────────────────────────────────
if [ ! -f "$TARGET_DIR/.claude/settings.json" ]; then
  cp "$PACK_DIR/.claude/settings.json" "$TARGET_DIR/.claude/settings.json"
  echo "✓ .claude/settings.json created"
else
  echo "  .claude/settings.json already exists — skipped (review manually)"
fi

# ── 3. settings.local.json.example ───────────────────────────────────────────
cp "$PACK_DIR/.claude/settings.local.json.example" "$TARGET_DIR/.claude/settings.local.json.example"
echo "✓ .claude/settings.local.json.example copied"
if [ ! -f "$TARGET_DIR/.claude/settings.local.json" ]; then
  cp "$PACK_DIR/.claude/settings.local.json.example" "$TARGET_DIR/.claude/settings.local.json"
  echo "✓ .claude/settings.local.json created from example"
fi

# ── 4. .mcp.json ─────────────────────────────────────────────────────────────
if [ ! -f "$TARGET_DIR/.mcp.json" ]; then
  cp "$PACK_DIR/.mcp.json" "$TARGET_DIR/.mcp.json"
  echo "✓ .mcp.json created"
else
  echo "  .mcp.json already exists — skipped"
fi

# ── 5. CLAUDE.md ─────────────────────────────────────────────────────────────
if [ ! -f "$TARGET_DIR/CLAUDE.md" ]; then
  cp "$PACK_DIR/CLAUDE.md" "$TARGET_DIR/CLAUDE.md"
  echo "✓ CLAUDE.md created — fill in the TODO fields before committing"
else
  echo "  CLAUDE.md already exists — skipped (review $PACK_DIR/CLAUDE.md for QA section to add)"
fi

# ── 6. cucumber.cjs ──────────────────────────────────────────────────────────
if [ ! -f "$TARGET_DIR/cucumber.cjs" ]; then
  cp "$PACK_DIR/cucumber.cjs" "$TARGET_DIR/cucumber.cjs"
  echo "✓ cucumber.cjs created"
else
  echo "  cucumber.cjs already exists — skipped"
fi

# ── 7. npm dependencies ───────────────────────────────────────────────────────
if [ -f "$TARGET_DIR/package.json" ]; then
  echo ""
  echo "Merging QA npm dependencies into existing package.json …"
  if command -v node &>/dev/null; then
    node - "$TARGET_DIR/package.json" "$PACK_DIR/qa-package.json" <<'EOF'
const fs = require('fs');
const [, , targetPath, packPath] = process.argv;
const target = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));

// All QA tools are dev-only — never touch dependencies
const existing = {
  ...(target.dependencies || {}),
  ...(target.devDependencies || {}),
};

// QA packages: everything from both dep buckets in qa-package.json
const qaPackages = {
  ...(pack.dependencies || {}),
  ...(pack.devDependencies || {}),
};

// Only add packages that don't already exist in the target
const toAdd = {};
const skipped = [];
for (const [pkg, version] of Object.entries(qaPackages)) {
  if (existing[pkg]) {
    skipped.push(pkg);
  } else {
    toAdd[pkg] = version;
  }
}

if (Object.keys(toAdd).length) {
  target.devDependencies = { ...(target.devDependencies || {}), ...toAdd };
  console.log('  Added to devDependencies:', Object.keys(toAdd).join(', '));
}
if (skipped.length) {
  console.log('  Already present, skipped:', skipped.join(', '));
}

// QA scripts: add with qa: prefix, skip if key already exists
const qaScripts = pack.scripts || {};
const scriptsAdded = [];
const scriptsSkipped = [];
target.scripts = target.scripts || {};
for (const [name, cmd] of Object.entries(qaScripts)) {
  const key = `qa:${name}`;
  if (target.scripts[key]) {
    scriptsSkipped.push(key);
  } else {
    target.scripts[key] = cmd;
    scriptsAdded.push(key);
  }
}
if (scriptsAdded.length) console.log('  Scripts added:', scriptsAdded.join(', '));
if (scriptsSkipped.length) console.log('  Scripts already exist, skipped:', scriptsSkipped.join(', '));

fs.writeFileSync(targetPath, JSON.stringify(target, null, 2) + '\n');
console.log('✓ package.json updated');
EOF
  else
    echo "  node not found — copy deps from $PACK_DIR/qa-package.json manually"
  fi
else
  cp "$PACK_DIR/qa-package.json" "$TARGET_DIR/package.json"
  echo "✓ package.json created from qa-package.json"
fi

# ── 8. outputs/ in .gitignore ────────────────────────────────────────────────
if [ -f "$TARGET_DIR/.gitignore" ]; then
  if ! grep -q "^outputs/" "$TARGET_DIR/.gitignore"; then
    echo "" >> "$TARGET_DIR/.gitignore"
    echo "# QA agent outputs" >> "$TARGET_DIR/.gitignore"
    echo "outputs/" >> "$TARGET_DIR/.gitignore"
    echo "✓ outputs/ added to .gitignore"
  fi
else
  printf "# QA agent outputs\noutputs/\n" > "$TARGET_DIR/.gitignore"
  echo "✓ .gitignore created"
fi

# ── 9. Install node deps ──────────────────────────────────────────────────────
echo ""
if command -v npm &>/dev/null; then
  echo "Running npm install in $TARGET_DIR …"
  (cd "$TARGET_DIR" && npm install)
  echo "✓ npm install complete"
else
  echo "npm not found — run 'npm install' manually in $TARGET_DIR"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "QA agent pack installed."
echo ""
echo "Next steps:"
echo "  1. Edit CLAUDE.md — fill in Jira project key, app URL, credentials"
echo "  2. Open the repo in Claude Code"
echo "  3. Type: run qa PROJ-123"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
