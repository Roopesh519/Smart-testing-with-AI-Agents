# Locator Patterns — Hard-Won Lessons

> Load this file before Phase 2 (Step Definitions) and Phase 3 (POM).
> These rules are learned from real QE-89 failures. Apply every one before writing any locator.

---

### 1. Floating-label UI — never use `getByPlaceholder()`

Floating-label inputs look like they have placeholder text but the visible text is a
**CSS `<label>` element** that moves upward on focus. There is **no actual HTML `placeholder`
attribute** on the input.

```javascript
// ❌ WRONG — times out because there is no placeholder attr
this.emailInput = page.getByPlaceholder('Adres e-mail');

// ✅ CORRECT — positional selector, confirmed via Playwright MCP / screenshot
this.emailInput    = page.locator('input').nth(0);
this.passwordInput = page.locator('input').nth(1);
```

**How to detect:** Open DevTools → inspect input → if there is no `placeholder="..."` attr,
you are on a floating-label form.

---

### 2. Custom password field — never use `input[type="password"]`

Password inputs with a show/hide eye icon are often rendered with a **custom component**
that does not use `type="password"` on the native input element.

```javascript
// ❌ WRONG — element never found
this.passwordInput = page.locator('input[type="password"]');

// ✅ CORRECT
this.passwordInput = page.locator('input').nth(1);
```

---

### 3. `navigate()` must use an absolute URL

Playwright throws `"Cannot navigate to invalid URL"` when you pass a relative path without
a `baseURL` configured in `playwright.config`. Always compose the full URL:

```javascript
// ❌ WRONG
await this.page.goto('/login');

// ✅ CORRECT
const baseUrl = process.env.BASE_URL || 'https://qa.loopay.com.pl';
await this.page.goto(`${baseUrl}/login`);
```

---

### 4. Post-login redirect — don't assume `/dashboard` in the URL

After a successful login+OTP the app may redirect to `/home`, `/overview`, or any route.
Do **not** use `waitForURL(/dashboard/)` unless you have confirmed the exact redirect path.

```javascript
// ❌ WRONG — times out if redirect URL is /home or /overview
await this.page.waitForURL(/dashboard/, { timeout: 30000 });

// ✅ CORRECT — generic "we left the login page" check
await this.page.waitForFunction(
  () => !window.location.href.includes('/login'),
  { timeout: 30000 }
);
```

---

### 5. Invalid-credentials error is inline text, not `role="alert"`

Error messages shown below a form field (e.g. "Błędny e-mail lub hasło.") are plain
`<span>` or `<p>` elements. `getByRole('alert')` returns nothing and times out.

```javascript
// ❌ WRONG
await expect(page.getByRole('alert')).toBeVisible();

// ✅ CORRECT — match the actual inline error text
this.credentialsErrorText = page.getByText(/błędny e-mail lub hasło/i);
await this.credentialsErrorText.waitFor({ state: 'visible', timeout: 10000 });
```

---

### 6. Multiple toast alerts — strict-mode violation

When a wrong OTP is submitted the app may fire **two** alert toasts at once
(e.g. "Code sent" + "New code sent"). `getByRole('alert')` then throws a strict-mode
violation because it resolves to 2 elements.

```javascript
// ❌ WRONG — strict mode violation when 2 alerts are present
await expect(page.getByRole('alert')).toBeVisible();

// ✅ CORRECT — use .first() or filter by hasText
await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 10000 });
```

---

### 7. 6-box OTP PIN component — use `keyboard.type()`, not `fill()`

The OTP screen uses a PIN component with 6 individual boxes. Calling `.fill()` on the
first box only populates one digit and the component does not auto-advance.

```javascript
// ❌ WRONG — only fills box 1, leaves 5 empty
await this.otpInput.fill('999999');

// ✅ CORRECT — click first box to focus, then type digit-by-digit
await this.otpInput.waitFor({ state: 'visible', timeout: 15000 });
await this.otpInput.click();
await this.page.keyboard.type(otp);   // component auto-advances on each digit
```

---

### 8. Resend OTP state — inspect before assuming

The Resend OTP feature can behave differently across environments:
- **Some envs:** countdown text "Wróć ponownie po X:XX" shown for 60 s, then replaced by clickable link.
- **QA env (qa.loopay.com.pl):** the countdown is skipped; "Wyślij kod ponownie" is shown immediately.

**Always use Playwright MCP or failure screenshots** to confirm the exact text before writing the locator.

```javascript
// ❌ FRAGILE — countdown may not appear in this environment
this.resendCountdown = page.getByText(/wróć ponownie po/i);

// ✅ CONFIRMED against QA env screenshot
this.resendOtpLink = page.getByText(/wyślij kod ponownie/i);
```

---

### 9. Read failure screenshots before every locator decision

Every failed scenario saves a screenshot to:
```
test/step-definations/failed_scenarios/<uuid>_<scenario-name>.png
```

**Always read the latest screenshot for a failing scenario** using the `Read` tool.
The screenshot shows exactly what the browser sees and prevents guessing:
- What text is rendered
- Which elements are present
- Whether a toast/alert is shown

---

### 10. Submit-button locator — use the exact visible button text

The login submit button text is in the UI language (Polish: "Zaloguj się").
The OTP verify button is "Zweryfikuj". These are confirmed from screenshots.

```javascript
this.submitButton = page.getByRole('button', { name: 'Zaloguj się' });
this.otpSubmit    = page.getByRole('button', { name: /zweryfikuj|zatwierdź|verify|potwierdź/i });
```

Use a regex when the exact label might vary by role or locale.
