# Product Context Store

Each subfolder here is named after a product (e.g. `INDY/`, `POZYTRON/`, `ZOODPAY_ADMIN/`).

The QA Agent writes to `{PRODUCT}/context.md` automatically at the end of every run.

## Folder naming rules
- Uppercase, no spaces — use `_` instead
- Derived from the Jira project name (not the card key)
- Examples:
  - "Indy Auction" → `INDY/`
  - "Pozytron Radiologia" → `POZYTRON/`
  - "ZoodPay Admin" → `ZOODPAY_ADMIN/`

## What context.md contains
- Runs log (one row per QA session)
- Known bugs accumulated across all runs
- Covered test flows
- Environment notes (URLs, credentials format, quirks)
