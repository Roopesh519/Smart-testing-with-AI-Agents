# Test Execution Report — QE-89: Pozytron - Super Admin/Admin - Login

## Session Metadata

| Field | Value |
|---|---|
| **Tester** | Shreyas Bapat |
| **Reviewer** | Murali (murali.r@7edge.com) |
| **Date** | 4/21/2026 |
| **Environment** | QA — https://qa.zood-pay.net/ |
| **Jira Card** | QE-89 |
| **Session Duration** | 1h |
| **Session Recording** | Not provided |
| **Persona** | Super Admin — full platform access, technically proficient user managing the ZoodPay admin panel |

---

## Test Results

| Test ID | Title | Status | Expected | Actual | Screenshot |
|---|---|---|---|---|---|
| T-01 | Login page shows Email + Password fields | ✅ PASS | Email Address and Password fields visible | Both fields present with labels and placeholders | T-01-login-page.png |
| T-02 | Mandatory fields clearly marked | ⚠️ OBSERVATION | Asterisks or markers on required fields | No asterisk markers shown; validation only triggers on submit with red borders | T-01-login-page.png |
| T-03 | Valid credentials → OTP sent | ✅ PASS | OTP sent to registered email with toast confirmation | Toast: "OTP has been sent to shreyas.bapat+superadmin-qa@7edge.com" | T-03-valid-login-otp-screen.png |
| T-04 | OTP is exactly 6 digits | ✅ PASS | 6 input boxes on OTP screen | 6 separate digit input boxes rendered | T-03-valid-login-otp-screen.png |
| T-05 | Valid OTP → successful login + dashboard redirect | ✅ PASS | Logged in, redirected to /dashboard | "Welcome to ZoodPay Admin Panel" toast; URL = /dashboard | T-05-valid-otp-login.png |
| T-06 | Resend OTP disabled initially, enabled after 60s | ❌ FAIL | Resend enabled after 60 seconds | Resend countdown starts at ~1:56 (~116 seconds), not 60 seconds | T-03-valid-login-otp-screen.png |
| T-07 | New OTP request invalidates previous OTP | 🔒 BLOCKED | Previous OTP becomes invalid after resend | Cannot verify without live email access to compare two OTP emails | — |
| T-08 | Empty Email → error shown | ✅ PASS | "This field is required" on Email | Red border + "This field is required" under Email field | T-08-empty-fields.png |
| T-09 | Empty Password → error shown | ✅ PASS | "This field is required" on Password | Red border + "This field is required" under Password field | T-08-empty-fields.png |
| T-10 | Invalid/unregistered email → error shown | ✅ PASS | Error message shown for invalid email | "Invalid email address" shown with red border | T-10-invalid-credentials.png |
| T-11 | Incorrect password → error shown | ✅ PASS | Error message for wrong password | "Invalid credentials" shown under Password field | T-11-wrong-password.png |
| T-12 | Invalid OTP → error shown | ✅ PASS | "Invalid OTP" error displayed | "Invalid OTP" shown in red under OTP boxes with red borders | T-12-invalid-otp.png |
| T-13 | Resend OTP not enabled before 60s | ✅ PASS | Resend button disabled initially | Button shows "Resend in X:XX" and is `disabled` | T-03-valid-login-otp-screen.png |
| T-14 | Forgot Password link visible and clickable | ✅ PASS | Navigates to Forgot Password page | Navigates to /forgot-password with email + Send Link form | T-14-forgot-password.png |
| T-15 | No console errors on login flow | ⚠️ OBSERVATION | Clean console | Persistent 403 Forbidden on AWS AppConfig `/configurationsessions` on every page | — |

---

## Summary

| Status | Count |
|---|---|
| ✅ Pass | 11 |
| ❌ Fail | 1 |
| ⚠️ Observation | 2 |
| 🔒 Blocked | 1 |
| **Total** | **15** |

---

## Bugs

### BUG-01 — Resend OTP timer exceeds specified 60-second threshold
- **Severity:** Medium
- **Description:** The Resend OTP countdown timer starts at approximately 1 minute 56 seconds (~116 seconds) instead of the 60 seconds specified in the Acceptance Criteria.
- **Steps to Reproduce:**
  1. Navigate to https://qa.zood-pay.net/
  2. Enter valid email and password → click Login
  3. OTP Verification screen appears
  4. Observe the Resend OTP countdown timer
- **Expected:** Timer counts down from 60 seconds
- **Actual:** Timer counts down from ~1:56 (116 seconds)
- **Screenshot:** T-03-valid-login-otp-screen.png

### BUG-02 — No mandatory field indicators shown on login form
- **Severity:** Low
- **Description:** The Email Address and Password fields do not display asterisks (*) or any visual indicator that they are mandatory before the user attempts to submit the form. Validation only surfaces on submit.
- **Steps to Reproduce:**
  1. Navigate to https://qa.zood-pay.net/
  2. Observe the login form without interacting
- **Expected:** Mandatory fields marked with asterisk or "required" label
- **Actual:** No mandatory markers visible; fields appear optional until submit is clicked
- **Screenshot:** T-01-login-page.png

### BUG-03 — Persistent 403 Forbidden console error on every page
- **Severity:** Medium
- **Description:** Every page load triggers a 403 Forbidden error from `https://appconfigdata.ap-south-1.amazonaws.com/configurationsessions`. This suggests an AWS AppConfig integration is misconfigured or the QA environment lacks the correct IAM permissions.
- **Steps to Reproduce:**
  1. Open browser dev tools → Console
  2. Navigate to https://qa.zood-pay.net/
  3. Observe console error on every page
- **Expected:** No console errors
- **Actual:** `Failed to load resource: 403 Forbidden @ https://appconfigdata.ap-south-1.amazonaws.com/configurationsessions`
- **Screenshot:** Not captured (console-only)

---

## Potential Risks

- OTP email delivery depends on external mail service — delays could cause false OTP expiry failures
- AWS AppConfig 403 may indicate missing feature flags or config values that could affect app behavior in untested ways
- T-07 (OTP invalidation on resend) is unverified — a security gap if previous OTPs remain valid

---

## Observations

- Login form UX is clean and responsive
- Error messages are clear and contextually placed under the relevant field
- OTP screen shows the email address the OTP was sent to, which is good UX
- Forgot Password flow navigates correctly to a dedicated page

---

## Enhancements

- Add asterisk (*) indicators on mandatory fields upfront rather than only on submit
- Align Resend OTP timer to the 60-second spec in the AC
- Investigate and resolve AWS AppConfig 403 errors in QA environment
- Consider showing a character counter or format hint on OTP inputs

---

## Test Execution Notes

All tests executed via Playwright browser automation on 4/21/2026.
T-07 blocked due to inability to access incoming email programmatically during session.
OTP value used for happy path testing: `999999` (QA environment static OTP).
