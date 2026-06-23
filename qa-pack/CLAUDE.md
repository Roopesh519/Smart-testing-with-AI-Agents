# QA Agent — Project Configuration

<!-- Fill in the sections marked TODO before committing. -->

## Project

- **Jira Project Key**: `TODO: e.g. PROJ`
- **App URL**: `TODO: e.g. https://app.example.com`
- **Login URL**: `TODO: e.g. https://app.example.com/login` (or same as App URL)
- **Environment**: `TODO: staging | dev | prod`
- **Auth Method**: `TODO: form_login | SSO | token | none`
- **OTP Required**: `TODO: yes (always use 999999) | no`

## Test credentials (dev/staging only — use env vars in CI)

- **Username**: `TODO`
- **Password**: `TODO`

---

## QA Skills available

This project has the full QA agent skill pack installed. Invoke any skill from Claude Code:

| What you want | How to trigger |
|---|---|
| Full QA on a Jira card | `run qa PROJ-123` |
| Manual testing only | `manual test PROJ-123` |
| Write BDD automation | `automate PROJ-123` |
| Accessibility audit | `accessibility test PROJ-123` |
| UI vs Figma diff | `ui test PROJ-123` |
| File a bug | `file a bug` |
| Write acceptance criteria | `/write-acceptance-criteria PROJ-123` |
| Clean up outputs | `delete files` |

## Conventions

- Test files live in `test/` — feature files in `test/features/`, step definitions in `test/step-definations/`
- BDD runner: CucumberJS with `cucumber.cjs` config
- Screenshots and reports go to `outputs/` (gitignored)
- Product context (persistent QA memory) lives in `.claude/skills/qa-agent/product_context/{PROJECT_KEY}/context.md`
