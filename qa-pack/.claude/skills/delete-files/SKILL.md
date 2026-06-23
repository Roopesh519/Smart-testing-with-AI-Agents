---
name: delete-files
description: >
  Clean up files created in the outputs/ folder during a QA session.
  Asks the user for consent before deleting — remove all, selected ones, or none.
  Invoked automatically at the end of a qa-agent run, or standalone.
user-invocable: true
---

# Delete Files — Session Cleanup

This skill runs **after the QA Agent pipeline completes** (or on demand) to clean
up artifacts written to `outputs/` during the session.

---

## Step 1 — Discover Session Artifacts

List all files currently in the `outputs/` directory tree:

```bash
find outputs/ -type f | sort
```

If `outputs/` is empty or does not exist, print:

> No files found in `outputs/`. Nothing to clean up.

Then stop — do not proceed further.

---

## Step 2 — Present the File List to the User

Display the discovered files as a numbered list:

> **QA Session — Cleanup**
>
> The following files were created in `outputs/` during this session:
>
> | # | File |
> |---|------|
> | 1 | `outputs/test-execution-CARD-2026-05-05.md` |
> | 2 | `outputs/test-charter-CARD-2026-05-05.md` |
> | 3 | `outputs/screenshots/T-01-login.png` |
> | … | … |
>
> What would you like to do?
>
> - **A** — Delete **all** files listed above
> - **S** — Delete **selected** files (you tell me which numbers)
> - **N** — Keep everything, no deletions

Wait for the user's response before taking any action.

---

## Step 3 — Handle User Choice

### Choice A — Delete all

Confirm once before proceeding:

> Deleting all [N] files from `outputs/`. This cannot be undone. Proceed? (yes / no)

If user confirms **yes**: delete every file in the list using the Bash tool:

```bash
find outputs/ -type f -delete
```

Then remove any empty subdirectories:

```bash
find outputs/ -type d -empty -delete
```

Print:

> All [N] files deleted from `outputs/`.

If user says **no**: print:

> Cancelled. No files were deleted.

---

### Choice S — Delete selected

Ask:

> Enter the numbers of the files to delete, separated by commas (e.g. `1, 3, 5`):

Wait for the list. Then confirm:

> Deleting [N] selected file(s):
> - `outputs/file-a.md`
> - `outputs/screenshots/img.png`
>
> Proceed? (yes / no)

If **yes**: delete each named file individually using the Bash tool, then remove
any empty subdirectories left behind:

```bash
find outputs/ -type d -empty -delete
```

Print:

> [N] file(s) deleted.

If **no**: print:

> Cancelled. No files were deleted.

---

### Choice N — Keep all

Print:

> No files deleted. All outputs are preserved in `outputs/`.

---

## Step 4 — Final Report

After any deletion, print a one-line summary:

> Cleanup complete — [N] file(s) deleted, [M] file(s) kept.

---

## Error Handling

| Situation | Action |
|-----------|--------|
| A file cannot be deleted (permissions, locked) | Report which file failed; continue deleting the rest |
| User provides out-of-range numbers in Choice S | Re-display the list, ask again |
| Ambiguous response to A / S / N prompt | Re-display the three options once |
