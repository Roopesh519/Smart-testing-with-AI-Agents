# SSF Auction — Checkout & Automated Payment Email Suppression for Credit Card Registration Auctions

* Status: Proposed
* Reviewer: Murali
* Number of Bugs: 0
* Duration: 30m
* Date: 4/13/2026

## CHARTER

**Scope:** SSF Auction — Checkout & Automated Payment Email Suppression for Credit Card Registration Auctions

**Objectives:** Validate that when a seller configures an auction with "Register with credit card", the platform correctly disables automated checkout and payment request emails, removes the Checkout button from the cart icon, and ensures payments are processed only manually via stored Stripe cards — while leaving all other auction registration types completely unaffected.

## AREAS

| Testing Area   | Focus                                                            |
|----------------|------------------------------------------------------------------|
| Functional     | Validate core features work as specified                         |
| UI/UX          | Verify visual consistency, layout, and usability                 |
| Navigation     | Confirm user flows, links, and routing behave correctly          |
| Security       | Check for common vulnerabilities and access control              |
| Error Handling | Validate error messages, edge cases, and graceful failure states |

## TESTER

**Name:** Roopesh

## TASK BREAKDOWN

1. Review application against charter objectives
2. Execute functional test cases
3. Explore UI/UX and navigation paths
4. Probe security touchpoints
5. Trigger and verify error-handling scenarios
6. Log bugs and observations
7. Summarise findings and flag risks

## DURATION

**Session Length:** 30m

## BUG INVESTIGATION & REPORTING

**Time Allocated:** 30m

## CHARTER VS. OPPORTUNITY

**Ratio:** 90/10

## TEST NOTES

### Functional
- Confirm automated payment request emails are suppressed when auction type is "Register with credit card"
- Confirm the "congratulations/auction results" email is still dispatched to the winning bidder
- Verify the Checkout button does not appear in the cart icon for this auction type
- Verify direct URL access to the checkout flow is still functional for bidders
- Run a parallel test on a standard registration auction to confirm no regression in email or checkout behaviour

### UI / UX
- Cart icon must not display a Checkout button for "Register with credit card" auctions
- No broken layout, empty button containers, or placeholder elements where the button was removed
- Bidder-facing UI should remain clean and navigable without the Checkout button
- Check that the absence of the Checkout button does not create confusion (e.g., no tooltip or message explaining why it is missing)

### Navigation
- Direct URL to the checkout flow must load correctly for an eligible bidder
- Bidder should not encounter a 404, 403, or error page when accessing checkout via URL
- Navigation back from the checkout URL should work as expected
- No redirect loops or dead-end states for any persona

### Security
- Direct URL checkout access must be authorised — unauthenticated users should not be able to access the checkout flow
- Verify that suppressing the Checkout button does not inadvertently expose any unprotected checkout endpoints
- Confirm that payment request email suppression is enforced server-side, not just via UI toggle (i.e., cannot be bypassed by direct API call)

### Error Handling
- If a bidder somehow reaches a checkout state they should not be in, the system should handle it gracefully with a clear message
- No raw server errors or stack traces should be visible to any persona
- Verify behaviour when the auction ends without a registered card on file for the winner

## TEST CASES

| Test Case ID | Steps | Expected Outcome | Actual Outcome | Status (Pass/Fail) |
|---|---|---|---|---|
| TC-01 | Configure auction with "Register with credit card". Complete auction. Check seller inbox for payment emails. | No automated payment request email is sent. | | |
| TC-02 | Configure auction with "Register with credit card". Complete auction. Check winner's inbox. | "Congratulations/auction results" email is received by the winning bidder. | | |
| TC-03 | Log in as a bidder. Navigate to cart icon for a "Register with credit card" auction. | Checkout button is not present in the cart icon. | | |
| TC-04 | As a bidder, access the checkout flow for a "Register with credit card" auction via direct URL. | Checkout page loads successfully. Bidder can view the flow. | | |
| TC-05 | As an unauthenticated user, attempt to access the checkout URL for the auction. | User is redirected to login or shown an authorisation error. Checkout is not accessible. | | |
| TC-06 | Configure auction with a standard (non-credit card) registration type. Complete auction. | Automated payment request email IS sent. Checkout button IS visible in cart icon. | | |
| TC-07 | Inspect the cart icon UI for a "Register with credit card" auction in browser DevTools. | No empty containers, orphaned elements, or console errors where the Checkout button was removed. | | |
| TC-08 | As a seller, manually process payment via stored Stripe card for a "Register with credit card" auction. | Payment is processed successfully. No errors encountered. | | |
| TC-09 | Configure multiple auction types simultaneously. Verify email behaviour for each. | Only "Register with credit card" auctions suppress payment emails. All others behave as normal. | | |
| TC-10 | Complete a "Register with credit card" auction where the winner has no stored card on file. | System handles the edge case gracefully. No unhandled errors or broken states. | | |

## POTENTIAL RISKS

- **Email suppression logic applied globally, affecting non-credit card auction types** — Impact: High — Run regression tests on standard registration auctions in every session
- **Checkout button removal leaves broken UI elements or empty containers in the cart** — Impact: Medium — Inspect DOM and console for orphaned elements after button suppression
- **Direct URL checkout access inadvertently blocked for eligible bidders** — Impact: High — Explicitly test TC-04 on every run; confirm URL routing is not overly restrictive
- **"Congratulations" email also suppressed unintentionally alongside payment emails** — Impact: High — Treat TC-02 as a critical test case; do not mark session complete without this pass
- **Manual Stripe payment by seller fails if stored card details are incomplete or stale** — Impact: Medium — Test with a valid, up-to-date stored Stripe card in QA environment
- **QA environment email delivery may be unreliable, making email suppression hard to verify** — Impact: Medium — Use a monitored test inbox or email logging tool to confirm send/no-send behaviour

## BUGS

| Bug ID | Severity | Description | Steps to Reproduce | Status |
|---|---|---|---|---|
| — | — | No bugs reported during this session | — | — |

## ISSUES & CLARIFICATIONS

- **Checkout button absence — buyer communication** — Should the UI display any message or tooltip explaining to the bidder why the Checkout button is not available, or is silent removal the intended behaviour? Confirm with product/design.
- **Direct URL checkout — full or restricted flow?** — When a bidder accesses checkout via direct URL, do they see the full standard checkout flow, or a restricted/read-only view? Clarify scope of access.
- **Seller manual payment trigger** — What is the exact mechanism for the seller to manually charge the stored Stripe card? Is this a button in the seller dashboard? Confirm so the correct flow can be tested.
- **"Congratulations" email timing** — Is the auction results email sent immediately on auction close, or is there a delay? Clarify to avoid false negatives during testing.
- **Multiple winners / lots** — If an auction has multiple lots and winners, is email suppression applied per lot or per auction? Clarify expected behaviour for multi-lot auctions.
- **Session Recording** — Not provided for this session. Confirm whether recording is required for sign-off or if test case documentation is sufficient.
- **Bug Investigation time** — Listed as "To be determined". Agree a fixed allocation before the next session to ensure consistent time-boxing.

## ENHANCEMENTS

- **Buyer-facing messaging** — Rather than silently removing the Checkout button, consider displaying a contextual message such as: *"Payment for this auction will be arranged by the seller directly."* This reduces bidder confusion and support queries.
- **Seller dashboard confirmation** — Add a clear visual indicator in the seller's auction setup confirming that automated emails and checkout are disabled for "Register with credit card" auctions, reducing accidental misconfiguration.
- **Email audit log** — Introduce a per-auction email dispatch log visible to the seller, showing which emails were sent, suppressed, and when — improving transparency and debuggability.
- **Automated regression suite** — Given the risk of cross-auction-type email bleed, add automated tests that assert email suppression is scoped correctly per registration type on every deployment.
- **Stored card validity check** — Before auction close, proactively warn the seller if a registered bidder's stored Stripe card is expired or invalid, so manual payment does not fail post-auction.

## PERSONA

**Seller:** An auction house or individual seller who configures auctions. Chooses "Register with credit card" to ensure bidder intent is captured upfront. Expects to manually charge winners after auction close via stored Stripe cards. Does not want automated emails disrupting the payment flow.

**Buyer:** A bidder who registers with a credit card to participate. May not be aware their card will be charged manually post-auction. Expects to receive a results email but may be surprised by the absence of the Checkout button.

**Tester:** QA engineer validating the feature in a controlled environment. Requires access to a seller account capable of configuring auction types, a monitored test inbox for email validation, and the ability to simulate auction completion in QA.

## TEST EXECUTION NOTES

**Session Recording:** Not provided

### Important — Read before starting the session:

- **Confirm QA email delivery is functional before starting.** Email suppression cannot be validated if the QA environment does not reliably send or log emails. Use a monitored test inbox or an email logging tool (e.g., Mailtrap) to observe send/no-send behaviour.
- **Test both auction types in the same session** — a "Register with credit card" auction AND a standard registration auction — to catch any regression in unaffected flows (TC-06, TC-09).
- **Do not mark TC-02 as skipped.** The "congratulations" email must be confirmed as still sending. This is a Condition of Satisfaction and a critical regression risk.
- **Inspect the cart icon at the DOM level** (browser DevTools) after the Checkout button is removed — look for empty `<div>` containers, hidden elements, or console errors (TC-07).
- **For direct URL checkout testing (TC-04 and TC-05),** obtain the correct checkout URL format from the development team before the session. Do not construct URLs by guesswork.
- **For manual Stripe payment testing (TC-08),** confirm with the seller account that a valid stored test card is on file in the QA Stripe sandbox before the session begins.
- **Session recording was not provided.** Ensure detailed written test notes and screenshots are captured to compensate, particularly for UI and email validation steps.
- All test cases should be executed in sequence: functional email tests first (TC-01, TC-02), then UI (TC-03, TC-07), then navigation and security (TC-04, TC-05), then regression (TC-06, TC-09), then edge cases (TC-08, TC-10).

## RESOURCES

**Test Environment:** QA
**Date:** 4/13/2026
