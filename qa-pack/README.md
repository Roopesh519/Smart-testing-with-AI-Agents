# QA Agent Pack

Drop-in AI-powered QA suite for any product repo. Built on Claude Code + Playwright + CucumberJS.

## What's included

| Skill | What it does |
|---|---|
| **qa-agent** | Master orchestrator — routes to manual or automation branch |
| **manual-testing** | Drives Playwright, captures bugs, writes test charter |
| **automation** | Generates BDD Gherkin → step definitions → POM from a Jira card |
| **accessibility-testing** | WCAG 2.1 A/AA audit with axe-core + manual checks |
| **ui-test-figma** | Compares live app against Figma design |
| **bug-reporting** | Files bugs to Jira via MCP |
| **test-charter** | Writes structured exploratory test charter |
| **delete-files** | Cleans up `outputs/` after a session |

---

## Install

**Option A — run the installer from inside the target repo:**

```bash
# Copy this qa-pack folder into your target repo, then:
bash qa-pack/install.sh
```

**Option B — manual:**

```bash
# 1. Copy the Claude config
cp -r qa-pack/.claude your-repo/

# 2. Copy the project config files
cp qa-pack/CLAUDE.md your-repo/CLAUDE.md
cp qa-pack/.mcp.json your-repo/.mcp.json
cp qa-pack/cucumber.cjs your-repo/cucumber.cjs

# 3. Merge npm deps into your package.json (or create one)
#    Copy dependencies from qa-pack/qa-package.json

# 4. Install
cd your-repo && npm install
```

---

## First-time setup (after install)

1. **Fill in `CLAUDE.md`** — add your Jira project key, app URL, credentials
2. **Open the repo in Claude Code**
3. Type one of the trigger phrases below

---

## Usage

Open Claude Code in your product repo and type:

```
run qa PROJ-123          # full QA — prompts you to choose branch
manual test PROJ-123     # manual testing only
automate PROJ-123        # generate BDD automation
accessibility test PROJ-123
ui test PROJ-123
file a bug
/write-acceptance-criteria PROJ-123
```

---

## How persistent context works

After every QA run the agent writes a `context.md` to:

```
.claude/skills/qa-agent/product_context/{PROJECT_KEY}/context.md
```

This file accumulates known bugs, covered flows, element selectors, and environment notes across runs. Commit it to share QA memory across the team.

---

## File layout after install

```
your-repo/
├── CLAUDE.md                                  ← fill in project details
├── .mcp.json                                  ← Playwright MCP config
├── cucumber.cjs                               ← BDD runner config
├── package.json                               ← merged with QA deps
└── .claude/
    ├── settings.json                          ← Playwright MCP enabled
    ├── settings.local.json                    ← local permissions (gitignore this)
    ├── commands/
    │   ├── bug-report.md
    │   ├── qa-agent.md
    │   └── write-acceptance-criteria.md
    └── skills/
        ├── SKILLS_CONTEXT.md
        ├── qa-agent/
        │   ├── SKILL.md
        │   └── product_context/
        │       ├── README.md
        │       └── CONTEXT_SCHEMA.md          ← template for context.md
        ├── automation/
        ├── manual-testing/
        ├── accessibility-testing/
        ├── ui-test-figma/
        ├── bug-reporting/
        ├── test-charter/
        └── delete-files/
```

---

## Requirements

- **Claude Code** CLI (`npm i -g @anthropic-ai/claude-code`)
- **Node.js** 18+
- **Atlassian MCP** connected in Claude Code (for Jira integration)
- **Playwright** — installed automatically via `npm install`

## Gitignore recommendations

Add to `.gitignore`:
```
outputs/
.claude/settings.local.json
```

Commit `.claude/skills/qa-agent/product_context/` — it's your shared QA memory.
