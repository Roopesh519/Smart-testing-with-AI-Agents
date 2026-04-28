# Graph Report - .claude/skills  (2026-04-28)

## Corpus Check
- Corpus is ~11,809 words - fits in a single context window. You may not need a graph.

## Summary
- 25 nodes · 48 edges · 4 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_MCP Tool Integrations|MCP Tool Integrations]]
- [[_COMMUNITY_Automation Testing Layer|Automation Testing Layer]]
- [[_COMMUNITY_Test Charter & Reporting|Test Charter & Reporting]]
- [[_COMMUNITY_Pipeline Orchestration|Pipeline Orchestration]]

## God Nodes (most connected - your core abstractions)
1. `Automation Agent Skill` - 13 edges
2. `Manual Testing Skill` - 12 edges
3. `QA Agent Skill` - 7 edges
4. `Test Charter Skill` - 6 edges
5. `UI Test Figma Skill` - 6 edges
6. `Bug Reporting Skill` - 6 edges
7. `Jira Card Input` - 4 edges
8. `Atlassian MCP` - 4 edges
9. `Playwright MCP` - 4 edges
10. `Test Charter Document` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Manual Testing Pipeline` --dispatches_to--> `Manual Testing Skill`  [INFERRED]
  .claude/skills/qa-agent/SKILL.md → .claude/skills/manual-testing/SKILL.md
- `Manual Testing Skill` --semantically_similar_to--> `Automation Agent Skill`  [INFERRED] [semantically similar]
  .claude/skills/manual-testing/SKILL.md → .claude/skills/automation/SKILL.md
- `Automation Pipeline` --dispatches_to--> `Automation Agent Skill`  [INFERRED]
  .claude/skills/qa-agent/SKILL.md → .claude/skills/automation/SKILL.md
- `Manual Testing Skill` --references--> `Test Charter Document`  [INFERRED]
  .claude/skills/manual-testing/SKILL.md → .claude/skills/test-charter/SKILL.md
- `Bug Reporting Skill` --semantically_similar_to--> `UI Comparison Report`  [INFERRED] [semantically similar]
  .claude/skills/bug-reporting/SKILL.md → .claude/skills/ui-test-figma/SKILL.md

## Hyperedges (group relationships)
- **QA Pipeline Full Orchestration** — qa_agent_skill, manual_testing_skill, automation_skill [EXTRACTED 1.00]
- **Manual Testing Branch Flow** — manual_testing_skill, ui_test_figma_skill, bug_reporting_skill, test_charter_skill [EXTRACTED 1.00]
- **Automation Artifact Generation Chain** — gherkin_feature_file, step_definitions, page_object_model [EXTRACTED 1.00]

## Communities

### Community 0 - "MCP Tool Integrations"
Cohesion: 0.4
Nodes (10): Atlassian MCP, Bug Report, Bug Reporting Skill, Figma MCP, Jira Card Input, Manual Testing Skill, Playwright MCP, QA Agent Skill (+2 more)

### Community 1 - "Automation Testing Layer"
Cohesion: 0.36
Nodes (8): Automation Agent Skill, BDD Utilities, CucumberJS, Faker.js, Gherkin Feature File, Page Object Model (POM), Step Definitions, Token Tracking

### Community 2 - "Test Charter & Reporting"
Cohesion: 0.83
Nodes (4): Decision Record API, Test Charter Document, Test Charter Skill, Test Execution Report

### Community 3 - "Pipeline Orchestration"
Cohesion: 0.67
Nodes (3): Automation Pipeline, Full E2E Pipeline, Manual Testing Pipeline

## Knowledge Gaps
- **5 isolated node(s):** `Figma MCP`, `Bug Report`, `Token Tracking`, `Faker.js`, `CucumberJS`
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Automation Agent Skill` connect `Automation Testing Layer` to `MCP Tool Integrations`, `Pipeline Orchestration`?**
  _High betweenness centrality (0.546) - this node is a cross-community bridge._
- **Why does `Manual Testing Skill` connect `MCP Tool Integrations` to `Automation Testing Layer`, `Test Charter & Reporting`, `Pipeline Orchestration`?**
  _High betweenness centrality (0.357) - this node is a cross-community bridge._
- **Why does `QA Agent Skill` connect `MCP Tool Integrations` to `Automation Testing Layer`, `Test Charter & Reporting`, `Pipeline Orchestration`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Automation Agent Skill` (e.g. with `Automation Pipeline` and `Manual Testing Skill`) actually correct?**
  _`Automation Agent Skill` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `Manual Testing Skill` (e.g. with `Manual Testing Pipeline` and `UI Comparison Report`) actually correct?**
  _`Manual Testing Skill` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Figma MCP`, `Bug Report`, `Token Tracking` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._