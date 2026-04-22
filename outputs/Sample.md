## CHARTER

**Objective:**
Validate that when a seller configures an auction with "Register with credit card", the platform
correctly disables automated checkout and payment request emails, removes the Checkout button
from the cart icon, and ensures payments are processed only manually via stored Stripe cards —
while leaving all other auction registration types completely unaffected.

**Feature Under Test:**
SSF Auction — Checkout & Automated Payment Email Suppression for Credit Card Registration Auctions

**Condition of Scope (COS):**
Disable Checkout & Auto Payment Emails for Credit Card Registration Auctions.

**Job Story:**
When a seller configures an auction with "Register with credit card", I want the platform to
disable automated checkout and payment request emails, so that payments are processed only
manually via stored Stripe cards.

**Conditions of Satisfaction:**
1. Automated payment request emails are NOT triggered for "Register with credit card" auctions.
2. The automated "congratulations/auction results" email IS still sent.
3. The Checkout button is removed from the cart icon for such auctions.
4. Bidders CAN access the general checkout flow via direct URL for these auctions.
5. All other registration types retain existing checkout and email behaviour unchanged.

---

## AREAS

| # | Testing Area   | Description                                                                              |
|---|----------------|------------------------------------------------------------------------------------------|
| 1 | Functional     | Verify email suppression and checkout button removal for credit card registration auctions|
| 2 | UI / UX        | Confirm Checkout button is absent from cart icon; no broken or orphaned UI elements      |
| 3 | Navigation     | Validate direct URL access to checkout flow works; no dead-end states for bidders        |
| 4 | Security       | Ensure direct URL checkout access is properly authorised and does not expose unintended data|
| 5 | Error Handling | Verify graceful handling if a bidder attempts a restricted action or an edge case is hit  |

---

## TESTER

**Name:** Roopesh
**Session Recording:** Not provided

---

## TASK BREAKDOWN

1. Configure a test auction with "Register with credit card" as the registration type
2. Complete the auction and verify automated payment request emails are suppressed
3. Confirm the "congratulations/auction results" email is still sent to the winning bidder
4. Inspect the cart icon UI — verify the Checkout button is not present
5. Attempt to access the checkout flow via direct URL — confirm access is permitted
6. Configure a second auction with a different registration type (e.g., standard registration)
7. Complete that auction and confirm existing email and checkout behaviour is unchanged
8. Check for any residual UI elements, broken states, or console errors after the button removal
9. Validate that manual payment via stored Stripe card is still operable by the seller
10. Document all findings, observations, and test case outcomes

---

## DURATION

**Session Length:** Short — 30 minutes
**Type:** Structured (Charter) with light exploratory allowance

---

## BUG INVESTIGATION & REPORTING

**Time Allocated:** To be determined
**Scope:** Document any defects found during the session, including severity, steps to reproduce,
and current status. Link bugs to relevant test cases where applicable.

---

## CHARTER VS. OPPORTUNITY

| Mode        | Allocation | Description                                                           |
|-------------|------------|-----------------------------------------------------------------------|
| Charter     | 90%        | Structured testing against defined COS and test cases                 |
| Opportunity | 10%        | Exploratory investigation of adjacent or unexpected behaviour          |

---

## TEST NOTES

### Feature Validation
- Confirm automated payment request emails are suppressed when auction type is
  "Register with credit card"
- Confirm the "congratulations/auction results" email is still dispatched to the winning bidder
- Verify the Checkout button does not appear in the cart icon for this auction type
- Verify direct URL access to the checkout flow is still functional for bidders
- Run a parallel test on a standard registration auction to confirm no regression in email
  or checkout behaviour

### UI / UX
- Cart icon must not display a Checkout button for "Register with credit card" auctions
- No broken layout, empty button containers, or placeholder elements where the button was removed
- Bidder-facing UI should remain clean and navigable without the Checkout button
- Check that the absence of the Checkout button does not create confusion (e.g., no tooltip
  or message explaining why it is missing)

### Navigation
- Direct URL to the checkout flow must load correctly for an eligible bidder
- Bidder should not encounter a 404, 403, or error page when accessing checkout via URL
- Navigation back from the checkout URL should work as expected
- No redirect loops or dead-end states for any persona

### Security
- Direct URL checkout access must be authorised — unauthenticated users should not
  be able to access the checkout flow
- Verify that suppressing the Checkout button does not inadvertently expose any
  unprotected checkout endpoints
- Confirm that payment request email suppression is enforced server-side, not just
  via UI toggle (i.e., cannot be bypassed by direct API call)

### Error Handling
- If a bidder somehow reaches a checkout state they should not be in, the system
  should handle it gracefully with a clear message
- No raw server errors or stack traces should be visible to any persona
- Verify behaviour when the auction ends without a registered card on file for the winner

---

## TEST CASES

| Test Case ID | Steps                                                                                                         | Expected Outcome                                                                                      | Actual Outcome | Status      |
|--------------|---------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|----------------|-------------|
| TC-01        | Configure auction with "Register with credit card". Complete auction. Check seller inbox for payment emails.  | No automated payment request email is sent.                                                           | TBD            | Pass / Fail |
| TC-02        | Configure auction with "Register with credit card". Complete auction. Check winner's inbox.                   | "Congratulations/auction results" email is received by the winning bidder.                            | TBD            | Pass / Fail |
| TC-03        | Log in as a bidder. Navigate to cart icon for a "Register with credit card" auction.                          | Checkout button is not present in the cart icon.                                                      | TBD            | Pass / Fail |
| TC-04        | As a bidder, access the checkout flow for a "Register with credit card" auction via direct URL.               | Checkout page loads successfully. Bidder can view the flow.                                           | TBD            | Pass / Fail |
| TC-05        | As an unauthenticated user, attempt to access the checkout URL for the auction.                               | User is redirected to login or shown an authorisation error. Checkout is not accessible.              | TBD            | Pass / Fail |
| TC-06        | Configure auction with a standard (non-credit card) registration type. Complete auction.                      | Automated payment request email IS sent. Checkout button IS visible in cart icon.                     | TBD            | Pass / Fail |
| TC-07        | Inspect the cart icon UI for a "Register with credit card" auction in browser DevTools.                       | No empty containers, orphaned elements, or console errors where the Checkout button was removed.      | TBD            | Pass / Fail |
| TC-08        | As a seller, manually process payment via stored Stripe card for a "Register with credit card" auction.       | Payment is processed successfully. No errors encountered.                                             | TBD            | Pass / Fail |
| TC-09        | Configure multiple auction types simultaneously. Verify email behaviour for each.                             | Only "Register with credit card" auctions suppress payment emails. All others behave as normal.       | TBD            | Pass / Fail |
| TC-10        | Complete a "Register with credit card" auction where the winner has no stored card on file.                   | System handles the edge case gracefully. No unhandled errors or broken states.                        | TBD            | Pass / Fail |

---

## POTENTIAL RISKS

| # | Risk                                                                                  | Impact | Mitigation                                                                          |
|---|---------------------------------------------------------------------------------------|--------|-------------------------------------------------------------------------------------|
| 1 | Email suppression logic applied globally, affecting non-credit card auction types     | High   | Run regression tests on standard registration auctions in every session             |
| 2 | Checkout button removal leaves broken UI elements or empty containers in the cart     | Medium | Inspect DOM and console for orphaned elements after button suppression              |
| 3 | Direct URL checkout access inadvertently blocked for eligible bidders                 | High   | Explicitly test TC-04 on every run; confirm URL routing is not overly restrictive   |
| 4 | "Congratulations" email also suppressed unintentionally alongside payment emails      | High   | Treat TC-02 as a critical test case; do not mark session complete without this pass |
| 5 | Manual Stripe payment by seller fails if stored card details are incomplete or stale  | Medium | Test with a valid, up-to-date stored Stripe card in QA environment                 |
| 6 | QA environment email delivery may be unreliable, making email suppression hard to verify | Medium | Use a monitored test inbox or email logging tool to confirm send/no-send behaviour |

---

## BUGS

| Bug ID | Severity | Description          | Steps to Reproduce | Status   |
|--------|----------|----------------------|--------------------|----------|
| —      | —        | No bugs reported during this session | —     | —        |

---

## ISSUES & CLARIFICATIONS

1. **Checkout button absence — buyer communication** — Should the UI display any message or
   tooltip explaining to the bidder why the Checkout button is not available, or is silent
   removal the intended behaviour? Confirm with product/design.
2. **Direct URL checkout — full or restricted flow?** — When a bidder accesses checkout via
   direct URL, do they see the full standard checkout flow, or a restricted/read-only view?
   Clarify scope of access.
3. **Seller manual payment trigger** — What is the exact mechanism for the seller to manually
   charge the stored Stripe card? Is this a button in the seller dashboard? Confirm so the
   correct flow can be tested.
4. **"Congratulations" email timing** — Is the auction results email sent immediately on auction
   close, or is there a delay? Clarify to avoid false negatives during testing.
5. **Multiple winners / lots** — If an auction has multiple lots and winners, is email suppression
   applied per lot or per auction? Clarify expected behaviour for multi-lot auctions.
6. **Session Recording** — Not provided for this session. Confirm whether recording is required
   for sign-off or if test case documentation is sufficient.
7. **Bug Investigation time** — Listed as "To be determined". Agree a fixed allocation before
   the next session to ensure consistent time-boxing.

---

## ENHANCEMENTS

1. **Buyer-facing messaging** — Rather than silently removing the Checkout button, consider
   displaying a contextual message such as: *"Payment for this auction will be arranged by the
   seller directly."* This reduces bidder confusion and support queries.
2. **Seller dashboard confirmation** — Add a clear visual indicator in the seller's auction
   setup confirming that automated emails and checkout are disabled for "Register with credit
   card" auctions, reducing accidental misconfiguration.
3. **Email audit log** — Introduce a per-auction email dispatch log visible to the seller,
   showing which emails were sent, suppressed, and when — improving transparency and
   debuggability.
4. **Automated regression suite** — Given the risk of cross-auction-type email bleed, add
   automated tests that assert email suppression is scoped correctly per registration type
   on every deployment.
5. **Stored card validity check** — Before auction close, proactively warn the seller if a
   registered bidder's stored Stripe card is expired or invalid, so manual payment does not
   fail post-auction.

---

## PERSONA

| Persona | Description                                                                                                                                                                         |
|---------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Seller  | An auction house or individual seller who configures auctions. Chooses "Register with credit card" to ensure bidder intent is captured upfront. Expects to manually charge winners after auction close via stored Stripe cards. Does not want automated emails disrupting the payment flow. |
| Buyer   | A bidder who registers with a credit card to participate. May not be aware their card will be charged manually post-auction. Expects to receive a results email but may be surprised by the absence of the Checkout button. |
| Tester  | QA engineer validating the feature in a controlled environment. Requires access to a seller account capable of configuring auction types, a monitored test inbox for email validation, and the ability to simulate auction completion in QA. |

---

## TEST EXECUTION NOTES

> **Important — Read before starting the session:**

- **Confirm QA email delivery is functional before starting.** Email suppression cannot be
  validated if the QA environment does not reliably send or log emails. Use a monitored
  test inbox or an email logging tool (e.g., Mailtrap) to observe send/no-send behaviour.
- **Test both auction types in the same session** — a "Register with credit card" auction AND
  a standard registration auction — to catch any regression in unaffected flows (TC-06, TC-09).
- **Do not mark TC-02 as skipped.** The "congratulations" email must be confirmed as still
  sending. This is a Condition of Satisfaction and a critical regression risk.
- **Inspect the cart icon at the DOM level** (browser DevTools) after the Checkout button is
  removed — look for empty `<div>` containers, hidden elements, or console errors (TC-07).
- **For direct URL checkout testing (TC-04 and TC-05),** obtain the correct checkout URL format
  from the development team before the session. Do not construct URLs by guesswork.
- **For manual Stripe payment testing (TC-08),** confirm with the seller account that a valid
  stored test card is on file in the QA Stripe sandbox before the session begins.
- **Session recording was not provided.** Ensure detailed written test notes and screenshots
  are captured to compensate, particularly for UI and email validation steps.
- All test cases should be executed in sequence: functional email tests first (TC-01, TC-02),
  then UI (TC-03, TC-07), then navigation and security (TC-04, TC-05), then regression (TC-06,
  TC-09), then edge cases (TC-08, TC-10).

---

## RESOURCES

| Resource            | Detail                                                                 |
|---------------------|------------------------------------------------------------------------|
| Test Environment    | QA                                                                     |
| Platform            | SSF (Seller Storefront) — Auction Module                               |
| Payment Provider    | Stripe (Sandbox — stored card / manual charge flow)                    |
| Email Monitoring    | Test inbox / email logging tool (e.g., Mailtrap) — confirm before session |
| Auction Config      | Seller account with ability to set "Register with credit card" type    |
| Tester              | Roopesh                                                                |
| Session Recording   | Not provided                                                           |
| Ticket Reference    | COS: Disable Checkout & Auto Payment Emails for Credit Card Registration Auctions |