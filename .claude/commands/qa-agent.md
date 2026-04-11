---
name: qa-agent
description: Launch the QA Agent — presents the skill menu and dispatches to the right skill based on your input.
argument-hint: "[Jira card ID | 'full QA' | skill name | plain description]"
user-invocable: true
---

Invoke the `qa-agent` skill.

If the user provided an argument (e.g. a Jira card ID or the phrase "full QA for PROJ-123"),
pass it directly into the skill as the initial intent so the agent does not re-ask for input
it has already received.
