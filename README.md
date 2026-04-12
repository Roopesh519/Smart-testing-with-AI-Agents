# Smart Testing with AI Agents

## Project Structure

```
SMART-TESTING-WTIH-AI-AGENTS
├── .claude/
│   ├── skills/                      # Claude Code AI skills
│   │   ├── automation/              # Generate Gherkin & test code
│   │   ├── bug-reporting/           # AI-assisted bug reporting
│   │   ├── manual-testing/          # Structured manual testing
│   │   ├── test-charter/            # Generate test charters
│   │   └── ui-test-figma/           # UI vs Figma design comparison
│   └── commands/                    # Claude Code command shortcuts
├── templates/
│   ├── test-charter.md              # Test charter template
│   └── bug-report.md                # Bug report template
├── outputs/                         # Test reports and sample outputs
├── cucumber.cjs                     # Root Cucumber configuration
├── package.json                     # Dependencies and scripts
├── .env                             # Environment configuration (BASE_URL, API_BASE_URL)
└── README.md                        # This file
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Smart-testing-with-AI-Agents
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## AI-Assisted Testing with Claude Code

This project integrates with [Claude Code](https://claude.com/claude-code) for intelligent test automation. Available skills:

### 1. **Automation** - Generate Test Code
Automatically generate:
- Gherkin feature files
- Cucumber step definitions
- Playwright Page Object Model classes

### 2. **Bug Reporting** - AI-Powered Issue Creation
Create Jira bugs with:
- Automatic screenshot capture
- AI-enhanced descriptions
- Reproduction steps from test execution

### 3. **Manual Testing** - Structured Test Execution
Execute manual tests with:
- Structured test charters
- Browser-based test execution
- Automatic bug filing from findings

### 4. **Test Charter Generation** - Document Test Plans
Generate comprehensive test charters from:
- Manual test execution reports
- Markdown formatted documentation
- Team decision records

### 5. **UI Testing vs Figma** - Design Consistency
Compare live web pages against Figma designs:
- Automatic visual comparison
- Detection of UI inconsistencies
- Design specification validation

## Copilot App

This repo now includes a local copilot layer that can run as a CLI, a lightweight web app, or a desktop app. All three modes use the same routing, execution planning, and Claude handoff.

### Run the desktop app

```bash
npm install
npm run copilot:desktop
```

The desktop app:
- starts the local copilot server in the background
- opens the copilot UI in a native window
- shuts the server down when the app exits
- supports in-app voice mode with the wake phrase `Hey Claude`
- can stay resident in the system tray with a hidden background voice listener

Note: the desktop shell uses Electron, so `npm install` must complete successfully before `npm run copilot:desktop` will work.

### Voice mode

Inside the desktop app:
- click `Start listening`, or enable `Auto-listen`
- say `Hey Claude` followed by your request
- the app detects the wake phrase and auto-submits the remaining command

Example:

```text
Hey Claude generate acceptance criteria for FF-543
```

Current scope:
- wake phrase detection works inside the desktop app window
- microphone permission is requested through Electron

### Background assistant mode

The desktop app now supports a tray-resident background assistant:
- closing the main window hides it to the tray instead of quitting
- a hidden voice listener window can keep listening in the background
- saying `Hey Claude ...` while the app is running can wake the assistant and reopen the main window
- choosing `Quit` from the tray exits the app completely

This is the practical "always-listening while the app is running" mode. It is not yet a separate OS-level daemon that runs before you launch the app or after you fully quit it.

### Build an installable desktop app

```bash
npm install
npm run dist:desktop
```

Linux-specific packages:

```bash
npm run dist:linux
```

Artifacts are written to:

```text
dist/
```

Current packaging targets:
- `AppImage`
- `deb`

The packaged app seeds a writable workspace on first launch under the user's app data directory, then copies in the bundled `.claude`, `templates`, `outputs`, `test`, and config files so the copilot can work after installation.

### Run the web app

```bash
npm run copilot:web
```

Then open:

```text
http://127.0.0.1:3210
```

The web app includes:
- a prompt composer
- preview-only mode
- a compact response panel
- a debug panel with route, execution files, and raw JSON

### Run the CLI

```bash
npm run copilot
```

That starts an interactive prompt using the configured wake phrase:

```text
Hey Claude>
```

You can also invoke it with a one-shot request:

```bash
npm run copilot -- "full QA for PROJ-123 https://staging.example.com"
npm run copilot -- "generate gherkin for PROJ-456"
npm run copilot -- "compare design https://app.example.com https://www.figma.com/file/abc123"
```

### What it does today

- Detects intent from natural language
- Extracts Jira card IDs and URLs when present
- Routes requests to the matching QA skill or to the `qa-agent` orchestrator
- Reads the actual `.claude` command and skill files from the repo
- Invokes Claude automatically for executable requests when required inputs are present
- Tells you what inputs are still missing for the selected flow
- Keeps normal output focused on Claude's answer
- Supports `--debug` when you want routing details and execution internals
- Exposes the same behavior through a local HTTP API used by the web app
- Wraps the web experience in an Electron desktop window
- Supports a `--json` mode for future UI or voice integrations

### Current scope

This is a text-first copilot shell. It does **not** yet provide:
- wake word detection
- speech-to-text
- text-to-speech

Those pieces can be added later as a separate app layer on top of this router.

### Preview mode

If you want routing without invoking Claude, run:

```bash
npm run copilot -- --preview "generate acceptance criteria for FF-543"
```

### Debug mode

If you want to inspect routing, execution files, and the exact Claude handoff, run:

```bash
npm run copilot -- --debug "generate acceptance criteria for FF-543"
```

### Files

- `src/copilot/index.cjs` — CLI entrypoint and interactive shell
- `src/copilot/catalog.cjs` — loads `.claude` commands and skills from disk
- `src/copilot/server.cjs` — local HTTP server and web app entrypoint
- `src/copilot/service.cjs` — shared request handling for CLI and web
- `src/desktop/main.cjs` — Electron desktop shell
- `src/desktop/workspace.cjs` — seeds a writable desktop workspace on first launch
- `src/copilot/executor.cjs` — builds an execution brief from the selected skill
- `src/copilot/router.cjs` — natural-language intent routing
- `src/copilot/skills.cjs` — skill catalog and required inputs
- `src/copilot/web/` — browser UI assets
- `copilot.config.json` — copilot configuration

## Contributing

This project uses Claude Code skills for intelligent test generation and quality workflows. To contribute:

1. Create feature files describing the test scenarios
2. Use the `/automation` skill to generate step definitions and page objects
3. Use the `/bug-report` skill to file issues found during testing
4. Use the `/test-charter` skill to document test plans
5. Use the `/manual-testing` skill to execute manual tests
6. Use the `/ui-test-figma` skill to Compare live web pages against Figma designs
