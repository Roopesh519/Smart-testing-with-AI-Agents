# QE-89 — Pozytron Super Admin/Admin Login

* Status: Proposed
* Reviewer: Murali R
* Number of Bugs: 2
* Duration: 1h
* Date: 4/28/2026

## CHARTER

**Scope:** Super Admin/Admin Login — Pozytron (dev.loopay.com.pl)

**Objectives:** Verify that the Super Admin/Admin login flow is secure, functional, and handles edge cases correctly — including login page UI validation, credential error handling, OTP generation and verification (6-digit), resend OTP lockout behavior (60s gate), and successful post-login redirect to the Dashboard.

## AREAS

| Testing Area   | Focus                                                            |
|----------------|------------------------------------------------------------------|
| Functional     | Validate core features work as specified                         |
| UI/UX          | Verify visual consistency, layout, and usability                 |
| Navigation     | Confirm user flows, links, and routing behave correctly          |
| Security       | Check OTP cooldown enforcement and credential error handling     |
| Error Handling | Validate error messages, edge cases, and graceful failure states |

## TESTER

**Name:** Roopesh (Claude AI Agent)

## TASK BREAKDOWN

1. Review application against charter objectives
2. Execute functional test cases
3. Explore UI/UX and navigation paths
4. Probe security touchpoints (OTP cooldown, credential error message)
5. Trigger and verify error-handling scenarios
6. Log bugs and observations
7. Summarise findings and flag risks

## DURATION

**Session Length:** 1h

## BUG INVESTIGATION & REPORTING

**Time Allocated:** 30m

## CHARTER VS. OPPORTUNITY

**Ratio:** 90/10

## TEST NOTES

### Functional
- Valid credentials (swasthik@7edge.com / Admin@1234) accepted and OTP screen shown
- OTP verification screen titled "Zweryfikuj swoją tożsamość" with 6 individual digit boxes
- Static OTP `999999` valid in dev environment
- Successful OTP verification redirects to "Panel główny" (Dashboard) with green success toast
- Invalid credentials show "Błędny e-mail lub hasło." with red field borders
- Invalid OTP shows "Niepoprawny kod" in red under OTP boxes

### UI/UX
- Login form is clean, branded with Pozytron Radiologia Medyczna identity
- Error messages appear inline under relevant fields
- OTP screen displays partially masked destination email (sw***@7e***.com)
- No asterisk mandatory markers on Email or Password fields upfront (BUG — QE-97)
- No language selector found in current app version (Observation)

### Navigation
- "Zapomniałeś hasła?" link navigates correctly to /forgot-password
- Forgot password page shows email input with "Wyślij link do resetowania" button
- Back link on OTP screen ("← Powrót do logowania") returns to login

### Security
- "Wyślij kod ponownie" (Resend OTP) button is fully enabled immediately upon OTP screen load — no 60-second lockout (BUG — QE-98)
- No countdown timer displayed; resend appears without any time indicator
- Credential error message ("Błędny e-mail lub hasło.") does not reveal whether email or password is wrong — correct behavior

### Error Handling
- Empty Email → "To pole jest wymagane" with red border and icon
- Empty Password → "To pole jest wymagane" with red border and icon
- Invalid email format ("notanemail") → "Nieprawidłowy format adresu e-mail"
- Invalid credentials → "Błędny e-mail lub hasło."
- Invalid OTP → "Niepoprawny kod"

## TEST CASES

| Test Case ID | Steps | Expected Outcome | Actual Outcome | Status (Pass/Fail) |
|---|---|---|---|---|
| T-01 | Navigate to https://dev.loopay.com.pl/login | Email + Password fields + Login button visible | Both fields present; "Zaloguj się" button present | Pass |
| T-02 | Observe login form without interacting | Mandatory asterisks or required markers on Email and Password | No asterisks, no required attributes; validation only fires on submit | Fail |
| T-03 | Enter valid email + password → click "Zaloguj się" | OTP screen shown | "Zweryfikuj swoją tożsamość" screen shown; OTP sent to email | Pass |
| T-04 | Observe OTP verification screen | 6 individual digit input boxes | 6 individual input[maxlength=1] boxes confirmed | Pass |
| T-05 | Enter valid OTP (999999) → click "Zweryfikuj" | Logged in; redirected to Dashboard | "Panel główny" loaded; green toast "Weryfikacja zakończona pomyślnie" | Pass |
| T-06 | Enter wrong credentials → click "Zaloguj się" | Error message for invalid credentials | "Błędny e-mail lub hasło." shown with red borders | Pass |
| T-07 | On OTP screen immediately after arriving: observe Resend button | "Wyślij kod ponownie" disabled for 60 seconds | Button fully enabled immediately (disabled=false, cursor=pointer) | Fail |
| T-08 | Click "Zaloguj się" with empty Email and Password | "This field is required" for both fields | "To pole jest wymagane" under both fields with red icons | Pass |
| T-09 | Enter wrong OTP (111111) → click "Zweryfikuj" | "Invalid OTP" error shown | "Niepoprawny kod" shown in red under OTP boxes | Pass |
| T-10 | Enter "notanemail" in Email field → click Login | Email format validation error | "Nieprawidłowy format adresu e-mail" shown | Pass |
| T-11 | Observe login page for Forgot Password link | "Forgot Password?" link visible | "Zapomniałeś hasła?" link present above Login button | Pass |
| T-12 | On OTP screen: observe countdown timer for resend | Countdown timer (e.g. "Resend in 58s") visible | No countdown timer found; resend appears without time indicator | Observation |
| T-13 | Observe login page for language selector | Language selector visible (e.g. English/Polish) | No language selector present in current app version | Observation |
| T-14 | Click "Zapomniałeś hasła?" link | Navigates to /forgot-password with reset form | Password reset page shown with email field and "Wyślij link do resetowania" | Pass |

## POTENTIAL RISKS

- Resend OTP has no frontend cooldown — backend rate limiting must be verified separately (QE-98)
- Static OTP `999999` in dev may mask real OTP delivery or expiry issues in production
- No language selector: multilingual support scope unclear for this environment
- AWS AppConfig 403 errors seen in previous QE-89 run — not retested this session

## BUGS

| Bug ID | Severity | Description | Steps to Reproduce | Status |
|---|---|---|---|---|
| QE-97 | Low | No mandatory field indicators on Email and Password fields | Navigate to login page → observe field labels before interaction | Open |
| QE-98 | Medium | Resend OTP enabled immediately with no 60-second cooldown or countdown timer | Login with valid credentials → arrive at OTP screen → observe "Wyślij kod ponownie" button state | Open |

## ISSUES & CLARIFICATIONS

- Is multilingual support (language selector) in scope for this environment? Not present in current build.
- Clarify whether `999999` static OTP is an intentional QA bypass or a security misconfiguration.
- Backend rate limiting for OTP resend (QE-98) — verify server-side enforcement exists even if frontend is bypassed.

## ENHANCEMENTS

- Add asterisk (*) or "required" indicators on mandatory fields upfront (currently only post-submit)
- Implement 60-second resend OTP cooldown with visible countdown timer
- Ensure OTP resend rate limiting is enforced server-side in addition to frontend
- Consider showing email format hint or placeholder in Email field

## PERSONA

Super Admin / Admin — technically proficient internal user of the Pozytron Radiologia Medyczna platform. Requires fast, secure, and error-tolerant login experience. High security expectations around MFA/OTP authentication. Operates in Polish-language environment.

## TEST EXECUTION NOTES

**Session Recording:** Not provided

All tests executed via headless Playwright (Chromium, 1280x800) on 2026-04-28.
OTP value used for happy path: `999999` (dev environment static OTP bypass).
App UI is in Polish; all error messages recorded in Polish as displayed.
Bugs QE-97 and QE-98 filed and linked to QE-89 in Jira.

## RESOURCES

**Test Environment:** Dev — https://dev.loopay.com.pl/login
**Date:** 4/28/2026
