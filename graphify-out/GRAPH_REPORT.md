# Graph Report - /home/user/projects/Smart-testing-with-AI-Agents  (2026-06-02)

## Corpus Check
- 26 files · ~132,084 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 198 nodes · 313 edges · 13 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 65 edges (avg confidence: 0.83)
- Token cost: 3,200 input · 1,850 output

## Community Hubs (Navigation)
- [[_COMMUNITY_UI States & Navigation|UI States & Navigation]]
- [[_COMMUNITY_Bug Reports & Config|Bug Reports & Config]]
- [[_COMMUNITY_Login Form UI|Login Form UI]]
- [[_COMMUNITY_Test Charters & Skills|Test Charters & Skills]]
- [[_COMMUNITY_QE-89 Bugs & Tracking|QE-89 Bugs & Tracking]]
- [[_COMMUNITY_Authentication Flow|Authentication Flow]]
- [[_COMMUNITY_Admin Panel Features|Admin Panel Features]]
- [[_COMMUNITY_Empty Fields Test|Empty Fields Test]]
- [[_COMMUNITY_OTP Login & Dashboard|OTP Login & Dashboard]]
- [[_COMMUNITY_OTP Screen Flow|OTP Screen Flow]]
- [[_COMMUNITY_Context Tracking Utils|Context Tracking Utils]]
- [[_COMMUNITY_Token Snapshot Code|Token Snapshot Code]]
- [[_COMMUNITY_Isolated Observations|Isolated Observations]]

## God Nodes (most connected - your core abstractions)
1. `Pozytron Radiologia Medyczna — Login Page` - 19 edges
2. `QE-89 Test Execution Report — Super Admin Login` - 12 edges
3. `Test Charter Section` - 12 edges
4. `Test Execution Report — QE-89` - 11 edges
5. `Murali R (Reviewer)` - 10 edges
6. `Status: Proposed` - 10 edges
7. `Pozytron — OTP Identity Verification Screen` - 10 edges
8. `Dashboard Sidebar Navigation Menu` - 10 edges
9. `QE-89 Test Charter — Pozytron Super Admin Login` - 8 edges
10. `List of Transactions Page` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Smart Testing with AI Agents — Project` --references--> `context_snapshot.py — Context Window Estimator`  [INFERRED]
  README.md → context_snapshot.py
- `OTP Authentication Flow` --conceptually_related_to--> `Credential Validation Instruction Text`  [INFERRED]
  outputs/test-execution-QE-89-2026-04-28.md → outputs/T-01-login-page.png
- `Automation Skill — Generate Gherkin & test code` --conceptually_related_to--> `Playwright Browser Automation — Test execution engine`  [INFERRED]
  README.md → outputs/test-execution-QE-89-2026-04-21.md
- `Bug Reporting Skill — AI-assisted Jira bug creation` --references--> `Bug Report Template — Markdown template for bug reports`  [INFERRED]
  README.md → templates/bug-report.md
- `Manual Testing Skill — Structured test execution` --references--> `QE-89 Test Execution Report — Super Admin Login`  [INFERRED]
  README.md → outputs/test-execution-QE-89-2026-04-21.md

## Hyperedges (group relationships)
- **AI Testing Skill Ecosystem — Claude Code Skills, Templates, and Outputs** — claude_code_skills, template_test_charter, template_bug_report, skill_automation, skill_bug_reporting, skill_manual_testing, skill_test_charter [INFERRED 0.80]
- **QE-89 Full Test Pipeline — Charter, Execution, and Bugs for ZoodPay Super Admin Login** — jira_card_qe89, qe89_charter, qe89_execution_report, bug_qe89_01, bug_qe89_02, bug_qe89_03 [EXTRACTED 1.00]
- **FF-525 Test Pipeline — Charter and Sample for SSF Auction Email Suppression** — jira_card_ff525, ff525_charter, sample_charter, ssf_auction_email_suppression [INFERRED 0.85]
- **OTP Security: Bug QE-98, No Countdown Timer, and OTP Flooding Risk** — bug_qe98, obs2_no_otp_countdown_timer, security_risk_otp_flooding, enhancement_resend_cooldown [EXTRACTED 0.95]
- **QE-89 Test Artifacts: Execution Report, Test Charter, and Proposed Charter** — test_execution_qe89, test_charter_qe89, charter_qe89_super_admin [INFERRED 0.90]
- **End-to-End Login Flow: Credential Validation, OTP Auth, Dashboard Redirect** — credential_validation, otp_authentication_flow, dashboard_panel_glowny [INFERRED 0.88]

## Communities

### Community 0 - "UI States & Navigation"
Cohesion: 0.11
Nodes (29): Back to Login Link (Powrót do logowania), Dashboard Sidebar Navigation Menu, Email Input Field — Invalid Format Error State, Error Message: Nieprawidłowy format adresu e-mail (Invalid email format), Error Message: Niepoprawny kod (Incorrect code), Login Authentication Flow, Masked Email Display (sw***@7e***.com), Nav Item: Administratorzy (Administrators) (+21 more)

### Community 1 - "Bug Reports & Config"
Cohesion: 0.11
Nodes (27): AWS AppConfig — Remote configuration service (403 Forbidden issue), BUG-01 — Resend OTP timer starts at ~116s instead of 60s (Medium), BUG-02 — No mandatory field asterisks on login form (Low), BUG-03 — 403 Forbidden on AWS AppConfig /configurationsessions (Medium), Claude Code Skills — AI-assisted testing automation skills, FF-525 Test Charter — SSF Auction Checkout & Email Suppression, Jira Card FF-525 — SSF Auction Checkout & Email Suppression, OTP MFA Login Flow — 6-digit OTP verification for admin login (+19 more)

### Community 2 - "Login Form UI"
Cohesion: 0.12
Nodes (27): Login Form — Credentials Filled (swasthik@7edge.com), Login Form — Email Field (Adres e-mail), Login Form — Forgot Password Link (Zapomniałeś hasła?), Login Form — Empty State (No Input, No Errors), Login Form — Loading State (After Valid Credentials Submitted), Login Form — Validation Error State (Both Fields Empty on Submit), Login Button Loading State (Logowanie...), Login Form — Password Field (Hasło) (+19 more)

### Community 3 - "Test Charters & Skills"
Cohesion: 0.19
Nodes (23): API Contract Navigation, Test Charter Card-Number Jira Card Name, Test Charter FF-525 SSF Auction Checkout, Test Charter KK-1297 Zood Pay - Phase 2 (Apr 10), Test Charter KK-1397 Zood Pay - Create AP (Apr 13), Test Charter KK-1402 Zood Pay - Stock Tra (Apr 14), Test Charter KK-1402 Zood Pay - Stock Tra (Apr 13), Test Charter KK-1403 Zood Pay - Pay Advance (+15 more)

### Community 4 - "QE-89 Bugs & Tracking"
Cohesion: 0.16
Nodes (20): Bug QE-97 — No Mandatory Field Indicators, Bug QE-98 — Resend OTP Enabled Immediately (No 60s Cooldown), QE-89 Super Admin Login Charter (Proposed), Dashboard — Panel Glowny, Enhancement — Mandatory Field Asterisk Indicators, Enhancement — 60s Resend OTP Cooldown, Forgot Password Flow, Jira Card QE-89 — Pozytron Super Admin/Admin Login (+12 more)

### Community 5 - "Authentication Flow"
Cohesion: 0.17
Nodes (17): Application Logo (ZebPay-style), User Authentication Flow, Credential Validation Instruction Text, Email Address Input Field, Forgot Password Link, Invalid OTP Error State, Language Selector Dropdown (English), Login Submit Button (+9 more)

### Community 6 - "Admin Panel Features"
Cohesion: 0.23
Nodes (13): Opening and Closing Balance Summary, Breadcrumb Navigation, Dell Joe Purdy (MDST3098), Distributor Management Section, eTop Up Wallet, Filter and Export Controls, List of Transactions Page, Sidebar Navigation (+5 more)

### Community 7 - "Empty Fields Test"
Cohesion: 0.31
Nodes (10): Application Logo (7edge / EuroDay), Email Address Input Field, Test Case T-08 Empty Fields Submission, Forgot Password Link, Language Selector Dropdown, Login Button, Login Screen UI, Password Input Field (+2 more)

### Community 8 - "OTP Login & Dashboard"
Cohesion: 0.36
Nodes (9): Admin Sidebar Navigation Menu, OTP Login Flow, Platform Geographic Map View, T-05 Valid OTP Login Test, User Role Filter Legend, Users On The Platform Widget, Welcome Toast Notification, ZoodPay Admin Panel (+1 more)

### Community 9 - "OTP Screen Flow"
Cohesion: 0.31
Nodes (9): OTP Email Delivery (roopesh.bayari-superadmin@7edge.com), Login Authentication Flow, OTP Input Field (6-digit), Resend OTP Link, OTP Sent Toast Notification, OTP Verification Screen, T-03 Valid Login Test Case, Verify Button (+1 more)

### Community 10 - "Context Tracking Utils"
Cohesion: 0.29
Nodes (7): ~/.claude/history.jsonl — Claude conversation history file, build_snapshot() — Assembles context snapshot dict, chars_to_tokens() — Estimates token count from character count, estimate_from_history() — Reads ~/.claude/history.jsonl, main() — CLI entrypoint for context_snapshot.py, context_snapshot.py — Context Window Estimator, Phase Additive Token Model — Cumulative context token estimates per test phase

### Community 11 - "Token Snapshot Code"
Cohesion: 0.47
Nodes (4): build_snapshot(), estimate_from_history(), main(), Read ~/.claude/history.jsonl (user-side messages) and estimate total context.

### Community 12 - "Isolated Observations"
Cohesion: 1.0
Nodes (1): Observation OBS-1 — No Language Selector

## Knowledge Gaps
- **43 isolated node(s):** `Read ~/.claude/history.jsonl (user-side messages) and estimate total context.`, `main() — CLI entrypoint for context_snapshot.py`, `chars_to_tokens() — Estimates token count from character count`, `~/.claude/history.jsonl — Claude conversation history file`, `UI Test Figma Skill — Compare web pages against Figma designs` (+38 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Isolated Observations`** (1 nodes): `Observation OBS-1 — No Language Selector`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Pozytron Radiologia Medyczna — Login Page` connect `Login Form UI` to `UI States & Navigation`, `Authentication Flow`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **Why does `Test Execution Report — QE-89` connect `QE-89 Bugs & Tracking` to `Login Form UI`, `Authentication Flow`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Why does `Jira Card QE-89 — Pozytron Super Admin/Admin Login` connect `QE-89 Bugs & Tracking` to `Bug Reports & Config`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `QE-89 Test Execution Report — Super Admin Login` (e.g. with `Manual Testing Skill — Structured test execution` and `QE-89 Test Charter — Pozytron Super Admin Login`) actually correct?**
  _`QE-89 Test Execution Report — Super Admin Login` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Read ~/.claude/history.jsonl (user-side messages) and estimate total context.`, `main() — CLI entrypoint for context_snapshot.py`, `chars_to_tokens() — Estimates token count from character count` to the rest of the system?**
  _43 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI States & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Bug Reports & Config` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._