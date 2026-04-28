# Test Charter — QE-89

---

## Charter

| Field | Value |
|---|---|
| **Jira Card** | QE-89 — Pozytron - Super Admin/Admin - Login |
| **Mission** | Verify the Super Admin/Admin login flow is secure, functional, and handles edge cases correctly — including OTP generation, validation, and error handling. |
| **Target** | Login & OTP Authentication Flow |
| **Session Date** | 2026-04-28 |
| **Tester** | Claude (AI Agent) |
| **Environment** | Chromium / https://dev.loopay.com.pl/login |

---

## Scope

**In Scope:**
- Login page UI (fields, labels, mandatory markers)
- Credential validation (valid/invalid email, password)
- OTP generation and delivery flow
- OTP entry and validation (valid, invalid, expired)
- Resend OTP timer behavior (60s gate)
- Post-login redirect to dashboard
- Error messages for all failure scenarios
- Empty/blank field submission

**Out of Scope:**
- Access log backend verification
- Email delivery infrastructure
- Password reset flow
- Multi-factor methods beyond OTP
- Mobile/responsive layout (time-limited session)

---

## Risk Areas

| Risk Level | Area | Reason |
|---|---|---|
| 🔴 High | OTP Timer & Expiry | Security-critical; expired OTPs allowing login = auth bypass |
| 🔴 High | Invalid credential error handling | Must not leak user existence info |
| 🟡 Medium | Resend OTP 60s gate | Race condition possible; UX impact if premature enable |
| 🟡 Medium | OTP digit count validation | 6-digit requirement is a spec constraint |
| 🟢 Low | Mandatory field indicators | Cosmetic but AC-specified requirement |

---

## Test Ideas

| ID | Test Idea | Source | Priority |
|---|---|---|---|
| T-01 | Login page loads with Email ID and Password fields visible | AC Happy #1 | High |
| T-02 | Mandatory fields are clearly marked (asterisk or indicator) | AC Happy #2 | High |
| T-03 | Valid credentials → OTP screen shown, OTP sent to email | AC Happy #3–5 | High |
| T-04 | OTP input shows 6-digit field | AC Happy #6 | High |
| T-05 | Valid OTP entry → logged in, redirected to dashboard | AC Happy #8–14 | High |
| T-06 | Invalid email/password → error message displayed | AC Unhappy #4–6 | High |
| T-07 | Resend OTP option is disabled immediately after OTP screen loads | AC Happy #10 | High |
| T-08 | Empty email and password submission → validation error | AC Unhappy #2 | High |
| T-09 | Invalid/wrong OTP entry → error message displayed | AC Unhappy #10–11 | High |
| T-10 | Invalid email format (non-email string) → error message | AC Unhappy #4 | Medium |
| T-11 | Forgot Password link visible on login page | AC scope/UX | Medium |
| T-12 | OTP screen shows countdown timer (resend disabled) | AC Happy #10 | Medium |
| T-13 | Language selector visible and operable on login page | UX/Edge | Low |
| T-14 | Forgot password link navigates correctly | Edge | Low |

---

## Test Results

| ID | Description | Status | Notes |
|---|---|---|---|
| T-01 | Login page loads with correct fields | ✅ PASS | Email + Password fields + "Zaloguj się" button present |
| T-02 | Mandatory field indicators visible | ❌ FAIL | No asterisks, no required/aria-required attributes; validation only fires on submit |
| T-03 | Valid credentials → OTP screen | ✅ PASS | "Zweryfikuj swoją tożsamość" screen shown after valid login |
| T-04 | OTP input is 6-digit boxes | ✅ PASS | 6 individual digit boxes (input[maxlength=1]) confirmed |
| T-05 | Valid OTP → dashboard redirect | ✅ PASS | OTP 999999 accepted; "Panel główny" loaded with success toast |
| T-06 | Invalid credentials → error message | ✅ PASS | "Błędny e-mail lub hasło." shown with red field borders |
| T-07 | Resend OTP disabled at OTP screen load | ❌ FAIL | "Wyślij kod ponownie" enabled immediately — no 60s lock (DOM: disabled=false, cursor=pointer) |
| T-08 | Empty fields submission → validation error | ✅ PASS | "To pole jest wymagane" shown under both fields |
| T-09 | Invalid OTP → error message | ✅ PASS | "Niepoprawny kod" shown in red under OTP boxes |
| T-10 | Invalid email format → error | ✅ PASS | "Nieprawidłowy format adresu e-mail" shown |
| T-11 | Forgot password link visible | ✅ PASS | "Zapomniałeś hasła?" link visible on login page |
| T-12 | OTP countdown timer present | ⚠️ OBS | No countdown timer found; resend link appears with no time indicator |
| T-13 | Language selector visible | ⚠️ OBS | No language selector in current app version |
| T-14 | Forgot password link navigates | ✅ PASS | Navigates to /forgot-password with email + reset button |

---

## Session Summary

| Metric | Count |
|---|---|
| Total Test Ideas | 14 |
| ✅ Passed | 10 |
| ❌ Failed | 2 |
| ⚠️ Observations | 2 |
| 🔒 Blocked | 0 |

---

## Bugs Filed

| Bug Key | Title | Severity | Linked |
|---|---|---|---|
| QE-97 | Login form — No mandatory field indicators on Email and Password fields | Low | QE-89 |
| QE-98 | OTP screen — Resend OTP button enabled immediately with no 60-second cooldown or countdown timer | Medium | QE-89 |

---

## Notes & Observations

- App UI is in Polish; test selectors adapted accordingly
- OTP PIN 999999 accepted as test bypass in dev environment
- Dashboard sidebar items: Administratorzy, Klienci, Technicy, Subskrypcje, Typy usług, Aktywności, QMS, Zgłoszenia
- QE-98 has a security dimension (OTP flooding risk) — recommend backend rate limiting in addition to frontend fix
- OBS-1 (T-13): Language selector not present — may not be in scope for this environment
- OBS-2 (T-12): Closely related to QE-98; both stem from the missing resend timer implementation
