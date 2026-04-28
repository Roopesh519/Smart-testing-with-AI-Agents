# QE-89 — Pozytron Super Admin/Admin Login

* Status: Proposed
* Reviewer: Murali
* Number of Bugs: 3
* Duration: 1h
* Date: 4/21/2026

## CHARTER

**Scope:** Super Admin/Admin Login — Pozytron (ZoodPay QA)

**Objectives:** Verify that the Super Admin/Admin login flow functions correctly end-to-end, including credential validation, 6-digit OTP generation and verification, error handling for invalid inputs, resend OTP behaviour, and successful redirect to the Dashboard page after authentication.

## AREAS

| Testing Area   | Focus                                                            |
|----------------|------------------------------------------------------------------|
| Functional     | Validate core features work as specified                         |
| UI/UX          | Verify visual consistency, layout, and usability                 |
| Navigation     | Confirm user flows, links, and routing behave correctly          |
| Error Handling | Validate error messages, edge cases, and graceful failure states |

## TESTER

**Name:** Shreyas Bapat

## TASK BREAKDOWN

1. Review application against charter objectives
2. Execute functional test cases
3. Explore UI/UX and navigation paths
4. Probe security touchpoints
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
- Valid credentials trigger OTP dispatch with toast confirmation
- OTP is always exactly 6 digits (separate input boxes)
- Static OTP `999999` valid in QA environment
- Successful OTP entry redirects to `/dashboard` with welcome toast
- Resend OTP countdown timer starts at ~1:56 instead of specified 60 seconds (BUG-01)

### UI/UX
- Login form is clean, responsive, and clearly branded
- Error messages appear inline under the relevant field
- OTP screen displays the destination email address — good UX
- Mandatory fields not marked with asterisks upfront (BUG-02)

### Navigation
- Forgot Password link navigates correctly to `/forgot-password`
- Dashboard redirect works after successful OTP verification
- Back link on Forgot Password page returns to login

### Error Handling
- Empty Email → "This field is required" with red border
- Empty Password → "This field is required" with red border
- Invalid email format → "Invalid email address" with red border
- Wrong password → "Invalid credentials" under password field
- Invalid OTP → "Invalid OTP" in red under OTP inputs with red borders

## TEST CASES

| Test Case ID | Steps | Expected Outcome | Actual Outcome | Status |
|---|---|---|---|---|
| T-01 | Navigate to https://qa.zood-pay.net/ | Email + Password fields visible | Both fields present with labels and placeholders | Pass |
| T-02 | Observe login form without interacting | Mandatory asterisks shown on fields | No asterisk markers — validation triggers only on submit | Observation |
| T-03 | Enter valid email + password → click Login | OTP sent, OTP screen shown | Toast: "OTP has been sent to email" — OTP screen rendered | Pass |
| T-04 | Observe OTP input screen | 6-digit input boxes | 6 separate digit input boxes | Pass |
| T-05 | Enter valid OTP (999999) → click Verify | Login success, redirect to /dashboard | Welcome toast shown, URL = /dashboard | Pass |
| T-06 | After OTP screen: observe Resend timer | Timer starts at 60 seconds | Timer starts at ~1:56 (~116 seconds) | Fail |
| T-07 | Request new OTP via Resend; enter previous OTP | Previous OTP rejected | Blocked — no email access to compare OTPs | Blocked |
| T-08 | Click Login with empty Email | "This field is required" on Email | Red border + error message shown | Pass |
| T-09 | Click Login with empty Password | "This field is required" on Password | Red border + error message shown | Pass |
| T-10 | Enter invalid email → click Login | Error for invalid email | "Invalid email address" shown | Pass |
| T-11 | Enter valid email + wrong password → Login | "Invalid credentials" error | "Invalid credentials" under password field | Pass |
| T-12 | Enter wrong OTP (123456) → Verify | "Invalid OTP" error shown | "Invalid OTP" in red with red borders | Pass |
| T-13 | Observe Resend button immediately on OTP screen | Resend disabled until timer expires | Button is `disabled` with countdown | Pass |
| T-14 | Click Forgot Password? link | Navigates to /forgot-password | Forgot Password page with Send Link form shown | Pass |
| T-15 | Open browser console during any page load | No console errors | 403 Forbidden on AWS AppConfig endpoint every page | Observation |

## POTENTIAL RISKS

- OTP email delivery depends on external mail service — delays could cause false OTP expiry failures in production
- AWS AppConfig 403 may suppress feature flags or config values, causing untested behaviour variations
- T-07 (OTP invalidation on resend) is unverified — a security gap if previous OTPs remain valid simultaneously
- Static OTP (`999999`) in QA may mask real OTP delivery or expiry issues

## BUGS

| Bug ID | Severity | Description | Steps to Reproduce | Status |
|---|---|---|---|---|
| BUG-01 | Medium | Resend OTP timer starts at ~116s instead of 60s | Login → valid credentials → observe OTP screen resend countdown | Open |
| BUG-02 | Low | No mandatory field asterisks on login form | Navigate to login page → observe field labels | Open |
| BUG-03 | Medium | 403 Forbidden on AWS AppConfig `/configurationsessions` every page | Open browser console → navigate any page | Open |

## ISSUES & CLARIFICATIONS

- T-07 blocked: OTP invalidation on resend cannot be verified without programmatic email access — needs a dedicated test with inbox tooling or API-level verification
- Clarify whether `999999` is intentionally a bypass OTP for QA or a security misconfiguration

## ENHANCEMENTS

- Add asterisk (*) indicators on mandatory fields upfront rather than only on submit
- Align Resend OTP timer to the 60-second spec in the AC
- Investigate and resolve AWS AppConfig 403 errors in QA environment
- Consider showing a character counter or format hint on OTP inputs
- Add email inbox integration for automated OTP retrieval in future test runs

## PERSONA

Super Admin — technically proficient internal user responsible for managing the ZoodPay admin panel. Expects a fast, error-free login experience with clear feedback on failures. High security expectations around OTP-based MFA.

## TEST EXECUTION NOTES

**Session Recording:** Not provided

All tests executed via Playwright browser automation on 4/21/2026.
T-07 blocked due to inability to access incoming email programmatically during session.
OTP value used for happy path testing: `999999` (QA environment static OTP).

## RESOURCES

**Test Environment:** QA — https://qa.zood-pay.net/
**Date:** 4/21/2026
