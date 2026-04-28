# Graph Report - .  (2026-04-28)

## Corpus Check
- 15 files · ~84,244 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 124 nodes · 187 edges · 13 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.82)
- Token cost: 1,200 input · 650 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Test Charter Registry|Test Charter Registry]]
- [[_COMMUNITY_QE-89 Login Bug Report|QE-89 Login Bug Report]]
- [[_COMMUNITY_Distributor Transaction View|Distributor Transaction View]]
- [[_COMMUNITY_Login Page UI|Login Page UI]]
- [[_COMMUNITY_Empty Fields Validation Test|Empty Fields Validation Test]]
- [[_COMMUNITY_Admin Dashboard OTP Test|Admin Dashboard OTP Test]]
- [[_COMMUNITY_OTP Verification Flow|OTP Verification Flow]]
- [[_COMMUNITY_Context Snapshot Tool|Context Snapshot Tool]]
- [[_COMMUNITY_AI Testing Skills Suite|AI Testing Skills Suite]]
- [[_COMMUNITY_Invalid OTP Test Case|Invalid OTP Test Case]]
- [[_COMMUNITY_Auction Checkout Feature|Auction Checkout Feature]]
- [[_COMMUNITY_Token Estimation Code|Token Estimation Code]]
- [[_COMMUNITY_ZooPay Platform Navigation|ZooPay Platform Navigation]]

## God Nodes (most connected - your core abstractions)
1. `QE-89 Test Execution Report — Super Admin Login` - 12 edges
2. `Test Charter Section` - 12 edges
3. `Murali R (Reviewer)` - 10 edges
4. `Status: Proposed` - 10 edges
5. `QE-89 Test Charter — Pozytron Super Admin Login` - 8 edges
6. `List of Transactions Page` - 8 edges
7. `Shreyas Bapat (User)` - 8 edges
8. `FF-525 Test Charter — SSF Auction Checkout & Email Suppression` - 7 edges
9. `OTP Verification Screen` - 7 edges
10. `OTP Verification Screen` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Smart Testing with AI Agents — Project` --references--> `context_snapshot.py — Context Window Estimator`  [INFERRED]
  README.md → context_snapshot.py
- `Automation Skill — Generate Gherkin & test code` --conceptually_related_to--> `Playwright Browser Automation — Test execution engine`  [INFERRED]
  README.md → outputs/test-execution-QE-89-2026-04-21.md
- `Manual Testing Skill — Structured test execution` --references--> `QE-89 Test Execution Report — Super Admin Login`  [INFERRED]
  README.md → outputs/test-execution-QE-89-2026-04-21.md
- `Test Charter Skill — Generate test charters from reports` --references--> `Test Charter Template — Markdown template for test charters`  [INFERRED]
  README.md → templates/test-charter.md
- `Test Charter Template — Markdown template for test charters` --references--> `QE-89 Test Charter — Pozytron Super Admin Login`  [INFERRED]
  templates/test-charter.md → outputs/charters/qe-89-super-admin-login.md

## Hyperedges (group relationships)
- **QE-89 Full Test Pipeline — Charter, Execution, and Bugs for ZoodPay Super Admin Login** — jira_card_qe89, qe89_charter, qe89_execution_report, bug_qe89_01, bug_qe89_02, bug_qe89_03 [EXTRACTED 1.00]
- **FF-525 Test Pipeline — Charter and Sample for SSF Auction Email Suppression** — jira_card_ff525, ff525_charter, sample_charter, ssf_auction_email_suppression [INFERRED 0.85]
- **AI Testing Skill Ecosystem — Claude Code Skills, Templates, and Outputs** — claude_code_skills, template_test_charter, template_bug_report, skill_automation, skill_bug_reporting, skill_manual_testing, skill_test_charter [INFERRED 0.80]

## Communities

### Community 0 - "Test Charter Registry"
Cohesion: 0.31
Nodes (17): Test Charter Card-Number Jira Card Name, Test Charter FF-525 SSF Auction Checkout, Test Charter KK-1297 Zood Pay - Phase 2 (Apr 10), Test Charter KK-1397 Zood Pay - Create AP (Apr 13), Test Charter KK-1402 Zood Pay - Stock Tra (Apr 14), Test Charter KK-1402 Zood Pay - Stock Tra (Apr 13), Test Charter KK-1403 Zood Pay - Pay Advance, Test Charter MM-2749 Zood Pay - Phase 2 (+9 more)

### Community 1 - "QE-89 Login Bug Report"
Cohesion: 0.24
Nodes (13): AWS AppConfig — Remote configuration service (403 Forbidden issue), BUG-01 — Resend OTP timer starts at ~116s instead of 60s (Medium), BUG-02 — No mandatory field asterisks on login form (Low), BUG-03 — 403 Forbidden on AWS AppConfig /configurationsessions (Medium), Jira Card QE-89 — Pozytron Super Admin/Admin Login, OTP MFA Login Flow — 6-digit OTP verification for admin login, Playwright Browser Automation — Test execution engine, QA Environment — https://qa.zood-pay.net/ (+5 more)

### Community 2 - "Distributor Transaction View"
Cohesion: 0.23
Nodes (13): Opening and Closing Balance Summary, Breadcrumb Navigation, Dell Joe Purdy (MDST3098), Distributor Management Section, eTop Up Wallet, Filter and Export Controls, List of Transactions Page, Sidebar Navigation (+5 more)

### Community 3 - "Login Page UI"
Cohesion: 0.29
Nodes (10): Application Logo (ZebPay-style), User Authentication Flow, Credential Validation Instruction Text, Email Address Input Field, Forgot Password Link, Language Selector Dropdown (English), Login Submit Button, Login Form (+2 more)

### Community 4 - "Empty Fields Validation Test"
Cohesion: 0.31
Nodes (10): Application Logo (7edge / EuroDay), Email Address Input Field, Test Case T-08 Empty Fields Submission, Forgot Password Link, Language Selector Dropdown, Login Button, Login Screen UI, Password Input Field (+2 more)

### Community 5 - "Admin Dashboard OTP Test"
Cohesion: 0.36
Nodes (9): Admin Sidebar Navigation Menu, OTP Login Flow, Platform Geographic Map View, T-05 Valid OTP Login Test, User Role Filter Legend, Users On The Platform Widget, Welcome Toast Notification, ZoodPay Admin Panel (+1 more)

### Community 6 - "OTP Verification Flow"
Cohesion: 0.31
Nodes (9): OTP Email Delivery (roopesh.bayari-superadmin@7edge.com), Login Authentication Flow, OTP Input Field (6-digit), Resend OTP Link, OTP Sent Toast Notification, OTP Verification Screen, T-03 Valid Login Test Case, Verify Button (+1 more)

### Community 7 - "Context Snapshot Tool"
Cohesion: 0.25
Nodes (8): ~/.claude/history.jsonl — Claude conversation history file, build_snapshot() — Assembles context snapshot dict, chars_to_tokens() — Estimates token count from character count, estimate_from_history() — Reads ~/.claude/history.jsonl, main() — CLI entrypoint for context_snapshot.py, context_snapshot.py — Context Window Estimator, Phase Additive Token Model — Cumulative context token estimates per test phase, track_tokens.py — Token Tracker

### Community 8 - "AI Testing Skills Suite"
Cohesion: 0.29
Nodes (8): Claude Code Skills — AI-assisted testing automation skills, Automation Skill — Generate Gherkin & test code, Bug Reporting Skill — AI-assisted Jira bug creation, Manual Testing Skill — Structured test execution, Test Charter Skill — Generate test charters from reports, UI Test Figma Skill — Compare web pages against Figma designs, Smart Testing with AI Agents — Project, Bug Report Template — Markdown template for bug reports

### Community 9 - "Invalid OTP Test Case"
Cohesion: 0.39
Nodes (8): Invalid OTP Error State, OTP Input Field (6 Digit Boxes), OTP Verification Screen, Resend OTP Link, T-12 Invalid OTP Test Screenshot, Test Case T-12: Invalid OTP, Verify Button, ZZ App Logo (Branding)

### Community 10 - "Auction Checkout Feature"
Cohesion: 0.48
Nodes (7): FF-525 Test Charter — SSF Auction Checkout & Email Suppression, Jira Card FF-525 — SSF Auction Checkout & Email Suppression, Sample Test Charter — SSF Auction Checkout & Email Suppression, SSF Auction Email Suppression Feature — Checkout & Payment Email Control for Credit Card Registration Auctions, Stripe Payment — Manual charge via stored cards, Test Charter Template — Markdown template for test charters, Roopesh — QA Tester

### Community 11 - "Token Estimation Code"
Cohesion: 0.47
Nodes (4): build_snapshot(), estimate_from_history(), main(), Read ~/.claude/history.jsonl (user-side messages) and estimate total context.

### Community 12 - "ZooPay Platform Navigation"
Cohesion: 0.33
Nodes (6): API Contract Navigation, Test Charters Published List UI, Dashboard Navigation, Decision Records Navigation, Design Charter Navigation, ZooPay Platform

## Knowledge Gaps
- **25 isolated node(s):** `Read ~/.claude/history.jsonl (user-side messages) and estimate total context.`, `track_tokens.py — Token Tracker`, `main() — CLI entrypoint for context_snapshot.py`, `chars_to_tokens() — Estimates token count from character count`, `~/.claude/history.jsonl — Claude conversation history file` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `QE-89 Test Execution Report — Super Admin Login` connect `QE-89 Login Bug Report` to `AI Testing Skills Suite`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `Smart Testing with AI Agents — Project` connect `AI Testing Skills Suite` to `Context Snapshot Tool`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `QE-89 Test Execution Report — Super Admin Login` (e.g. with `QE-89 Test Charter — Pozytron Super Admin Login` and `Manual Testing Skill — Structured test execution`) actually correct?**
  _`QE-89 Test Execution Report — Super Admin Login` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `QE-89 Test Charter — Pozytron Super Admin Login` (e.g. with `QE-89 Test Execution Report — Super Admin Login` and `Test Charter Template — Markdown template for test charters`) actually correct?**
  _`QE-89 Test Charter — Pozytron Super Admin Login` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Read ~/.claude/history.jsonl (user-side messages) and estimate total context.`, `track_tokens.py — Token Tracker`, `main() — CLI entrypoint for context_snapshot.py` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._