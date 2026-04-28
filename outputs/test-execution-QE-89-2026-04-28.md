# Test Execution Report — QE-89

**Card:** QE-89 — Pozytron - Super Admin/Admin - Login  
**Date:** 2026-04-28  
**Tester:** Claude (AI Agent)  
**Environment:** Chromium / https://dev.loopay.com.pl/login  
**Credentials:** swasthik@7edge.com / Admin@1234 / OTP: 999999  

---

## Test Results

| ID | Description | Status | Expected | Actual | Screenshot |
|---|---|---|---|---|---|
| T-01 | Login page loads with Email ID and Password fields | ✅ PASS | Email + Password fields + Login button visible | Fields visible, "Zaloguj się" button present | T-01-login-page.png |
| T-02 | Mandatory fields clearly marked (asterisk / required) | ❌ FAIL | Asterisks or required indicators on Email & Password | No asterisks, no required attribute, no aria-required; validation only fires on submit | T-02-mandatory-markers.png |
| T-03 | Valid credentials → OTP screen shown | ✅ PASS | OTP verification screen displayed after valid login | "Zweryfikuj swoją tożsamość" screen with 6-box OTP input | T-03-valid-login-otp-screen.png |
| T-04 | OTP input shows 6 individual digit boxes | ✅ PASS | 6 individual digit input boxes | 6 individual input[maxlength=1] boxes present | T-03-valid-login-otp-screen.png |
| T-05 | Valid OTP → logged in, redirected to dashboard | ✅ PASS | Dashboard page loaded after OTP 999999 | "Panel główny" loaded, toast "Weryfikacja zakończona pomyślnie" | T-05-valid-otp-login.png |
| T-06 | Invalid email/password → error message displayed | ✅ PASS | Error message for wrong credentials | "Błędny e-mail lub hasło." shown with red field borders | T-06-invalid-credentials.png |
| T-07 | Resend OTP disabled at OTP screen load | ❌ FAIL | "Wyślij kod ponownie" disabled for 60 seconds | Button is fully enabled immediately (disabled=false, cursor=pointer, opacity=1) | T-07-resend-initial-state.png |
| T-08 | Empty fields submission → validation error | ✅ PASS | "This field is required" for both fields | "To pole jest wymagane" shown under both fields with red icons | T-08-empty-fields.png |
| T-09 | Invalid OTP entry → error message | ✅ PASS | Error shown for wrong OTP | "Niepoprawny kod" shown in red under OTP boxes | T-09-invalid-otp.png |
| T-10 | Invalid email format → error message | ✅ PASS | Format validation error | "Nieprawidłowy format adresu e-mail" shown with red border | T-10-invalid-email.png |
| T-11 | Forgot password link visible on login page | ✅ PASS | "Forgot Password?" link present | "Zapomniałeś hasła?" link visible above Login button | T-01-login-page.png |
| T-12 | OTP countdown timer present (resend disabled countdown) | ⚠️ OBS | Timer showing seconds remaining before resend enables | No countdown timer shown; "Wyślij kod ponownie" appears without any time indicator | T-07-resend-initial-state.png |
| T-13 | Language selector visible on login page | ⚠️ OBS | Language selector (e.g. English/Polish) present | No language selector found in current app version | T-01-login-page.png |
| T-14 | Forgot password link navigates correctly | ✅ PASS | Navigates to password reset page | Navigates to /forgot-password — "Nie pamiętasz hasła?" form with email field and reset button | T-14-forgot-password.png |

---

## Session Summary

| Metric | Count |
|---|---|
| Total Tests | 14 |
| ✅ Passed | 10 |
| ❌ Failed | 2 |
| ⚠️ Observations | 2 |
| 🔒 Blocked | 0 |

---

## Bugs Found

### BUG-A — No mandatory field indicators on login form
- **Severity:** Low
- **AC Violated:** Happy Path #2 — "All mandatory fields (Email ID and Password) are clearly marked."
- **Steps:** Load https://dev.loopay.com.pl/login
- **Expected:** Asterisks or "required" markers visible on Email and Password fields
- **Actual:** No asterisks, no `required` attribute, no `aria-required`. Fields appear optional until submission.
- **Screenshot:** T-02-mandatory-markers.png

### BUG-B — Resend OTP enabled immediately (no 60-second lock)
- **Severity:** Medium
- **AC Violated:** Happy Path #10 — "The Resend OTP option is disabled initially and becomes enabled after 60 seconds."  
  Unhappy Path #13 — "The Resend OTP option is enabled before 60 seconds."
- **Steps:** Login with valid credentials → reach OTP verification screen → observe "Wyślij kod ponownie" (Resend code) button
- **Expected:** Resend button disabled for 60 seconds with countdown timer
- **Actual:** "Wyślij kod ponownie" is immediately enabled (verified via DOM: disabled=false, cursor=pointer, pointerEvents=auto, opacity=1). No countdown timer present.
- **Security Impact:** Allows unlimited OTP generation without cooldown — potential for OTP flooding/brute-force
- **Screenshot:** T-07-resend-initial-state.png

---

## Observations

### OBS-1 — No language selector
- The login page has no language/locale selector. Previous test environment screenshots showed an "English" dropdown. Not confirmed as a bug without clarity on whether multilingual is in scope.

### OBS-2 — No OTP countdown timer UI
- Related to BUG-B. Not only is resend enabled immediately, but there is no visible timer at all. AC implies a countdown should show remaining time before resend is available.

---

## Notes
- OTP PIN 999999 accepted as valid in dev environment (test bypass)
- All tests run headless Chromium 1280x800
- App is in Polish language
- Dashboard ("Panel główny") accessible with sidebar: Administratorzy, Klienci, Technicy, Subskrypcje, Typy usług, Aktywności, QMS, Zgłoszenia
