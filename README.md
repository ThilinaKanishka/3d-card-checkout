# Nova Pay: 3D Smart Credit Card Checkout

A demo checkout with a live, 3D-flipping credit card preview, plus Login and Sign Up pages. Built with **Vite**, **TypeScript** (vanilla, no framework) and **Tailwind CSS v4**.

> This is a UI demo only. No payment is processed, and accounts exist only in your browser's storage. See [Auth (demo only)](#auth-demo-only).

## Getting started

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

| Script            | Description                                   |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start the dev server with hot reload          |
| `npm run build`   | Type-check with `tsc`, then build to `dist/`  |
| `npm run preview` | Serve the production build locally            |

Password hashing uses the Web Crypto API, which browsers only expose on `https://` or `localhost`. Opening the dev server through a LAN IP over plain http won't work for sign-up or login.

## Pages and routing

The app uses a small typed hash router (`src/router.ts`):

| Route        | Page                                                       |
| ------------ | ---------------------------------------------------------- |
| `#/login`    | Login (default route)                                      |
| `#/signup`   | Sign Up                                                    |
| `#/checkout` | Checkout. Signed-out users are redirected to `#/login`.    |

Signed-in users who open `#/login` or `#/signup` go to checkout. Unknown routes go to the default page.

## Demo test flow

1. Open the app. It starts on **#/login**. Try opening `#/checkout` directly: you're sent back to login.
2. Click **Create an account**. The glass panel flips to **Sign Up**, and the URL changes to `#/signup`.
3. Click **Create account** with empty fields. Every field shows an error and shakes.
4. Fill in the form:
   - Name: `Ada Lovelace`
   - Email: `ada@example.com`
   - Password: `Sup3r$ecret`. Watch the strength meter go from Weak to Very strong.
   - Confirm the password, and tick the terms box.
5. Submit. You'll see a loading spinner, then a checkmark animation, then **#/checkout** with your name in the header.
6. Pay with test card `4242 4242 4242 4242`, any future expiry and any 3-digit CVV.
7. Click your name in the header to open the profile menu, choose **Log out**, then **hold** the Log out button for about a second, or press Enter. The card slides into a wallet, and you land back on the login page. Now log in with a wrong password. You'll see **"Incorrect email or password"**.
8. Try signing up again with the same email. You'll see **"Email already registered"**.
9. Log in with **Remember me** ticked, close the tab, and reopen it. You're still signed in. Without Remember me, the session lasts for that tab only.

To reset the demo, clear the site's storage in DevTools (Application → Storage), or remove the `novapay.users` and `novapay.session` keys.

## Features

### Login and Sign Up

- **Split screen**: on desktop, an animated 3D scene sits on the left and the auth form on the right. They stack on mobile.
- **Floating cards**: three cards, built from the same card component and brand themes as checkout, float and rotate at different depths. Moving the mouse tilts them with depth parallax and a cursor-following glare. Blurred gradient blobs drift in the background, behind the tagline "Pay smarter. Checkout in seconds."
- **Flipping glass panel**: Login is on the front and Sign Up on the back. Switching flips the panel 180° in 3D, in the same style as the card's CVV flip, and updates the URL. The hidden face is made `inert`, so Tab and screen readers skip it.
- **Login form**:
  - Email and password fields, with a show/hide eye toggle on the password
  - A "Remember me" checkbox
  - A "Forgot password?" link that shows a demo toast
- **Sign Up form**:
  - Full name, email, password and confirm-password fields
  - An "I agree to the terms" checkbox
  - A live strength meter (weak / fair / strong / very strong) with an animated coloured bar
  - A checklist: 8+ characters, uppercase letter, number, symbol
- **Form details**:
  - Floating labels
  - A brand-gradient focus glow on inputs
  - Inline errors announced through `aria-live`, with a shake on invalid submit
  - Loading spinners on the submit buttons
  - A drawn-checkmark success animation before redirecting
  - Generic "Continue with Google / GitHub" buttons (simple icons, not the official logos) that only show a "demo only" toast

### Log out

- **Profile menu**: a chip with the user's initials on a brand-gradient avatar, plus their name. Clicking it opens a glass dropdown that scales and fades in, showing the name, the email and a red **Log out** item.
  - It closes on an outside click or Escape.
  - It sets `aria-expanded`, moves focus into the menu, and supports the arrow keys.
- **Confirmation modal**: "Leaving so soon?" in a glass dialog over a blurred, dimmed page, with a floating mini card that carries the user's name.
  - **Stay**, Escape or a backdrop click cancels.
  - Focus is trapped inside the dialog, and the page behind is `inert`.
- **Hold to confirm**: hold **Log out** for about 1 second while a fill sweeps across the button. Releasing early cancels. Enter confirms instantly, and holding Space also works.
- **Exit animation**: the mini card slides into a wallet, the flap closes with a particle burst in the brand colours, and the modal fades out. A toast says "Logged out. See you soon, *name*!", and the login panel slides up into view.
  - With `prefers-reduced-motion`, the wallet and particles are skipped and the modal simply fades.
- **Logic**: only the session is cleared, from both `localStorage` and `sessionStorage`. Registered users are kept, and `#/checkout` redirects to `#/login` again.

### Checkout

- **Header**: the brand mark and the profile menu.
- **Live card preview**: the number, holder name, expiry and CVV appear on the card as you type, with `#### #### #### ####` / `FULL NAME` / `MM/YY` placeholders.
- **Input formatting**:
  - Card number accepts digits only and is grouped as `1234 5678 9012 3456` (Amex uses `3782 822463 10005`). The caret stays in place when you edit mid-number.
  - Card holder accepts letters and spaces only, and is shown in uppercase on the card.
  - Expiry inserts the `/` for you (`MM/YY`). Backspace removes it as expected.
  - CVV accepts 3 digits, or 4 for Amex.
- **Brand detection**: Visa (`4`), Mastercard (`51–55`, `2221–2720`) and Amex (`34`, `37`). Each brand gets a text badge and its own theme:
  - Visa: deep navy to blue
  - Mastercard: charcoal with warm orange/red accents
  - Amex: metallic silver/teal
  - Unknown: graphite / black metal
- **Premium card look**:
  - ISO card proportions with rounded corners
  - Wavy guilloche lines and a film-grain texture (SVG `feTurbulence`)
  - Embossed OCR-style lettering
  - A gold EMV chip, a contactless icon and a holographic patch with a rainbow shimmer
  - A soft shadow under the card
- **Mouse tilt and glare**: the card tilts up to 12° toward the cursor with smooth easing. The tilt sits on a wrapper around the flipping card, so tilt and CVV flip combine.
- **3D flip**: focusing the CVV field rotates the card to show the back.
- **Focus highlight**: the part of the card that matches the focused field (number, name or expiry) glows.
- **Validation**:
  - Card numbers are checked with the Luhn algorithm.
  - Expiry month must be 01–12, and the date can't be in the past.
  - Errors appear inline, and **Pay Now** stays disabled until every field is valid.

### Accessibility

- Every input has a real `<label>`. Errors use `aria-live`, and the eye toggle has an `aria-label` and `aria-pressed`.
- Enter submits each form, and the Tab order follows the visual order.
- After a page change, focus moves to the new page's heading.
- With `prefers-reduced-motion`, the floating cards, blobs, tilt, panel and card flip animations, shimmer, shake and page transitions are all turned off.

## Auth (demo only)

`src/auth.ts` is a **frontend-only demo**. A real app needs a proper backend for auth.

- Users are stored in `localStorage` under `novapay.users`. The plain password is **never** stored: each user gets a random 16-byte salt, and only `SHA-256(salt + password)` is saved, computed with the Web Crypto API.
- The session is stored under `novapay.session`: in `localStorage` with "Remember me", otherwise in `sessionStorage`.
- Login failures show the same "Incorrect email or password" message whether the email or the password is wrong.

Why this isn't production-ready: anything in `localStorage` can be read by any script on the page. A single SHA-256 is also far too fast to resist brute force. Real apps hash passwords on the server with Argon2id, scrypt or bcrypt, and keep sessions in HttpOnly, Secure cookies.

### Test card numbers

| Brand      | Number                |
| ---------- | --------------------- |
| Visa       | `4242 4242 4242 4242` |
| Mastercard | `5555 5555 5555 4444` |
| Mastercard | `2223 0031 2200 3222` |
| Amex       | `3782 822463 10005`   |

Use any future expiry date, any name, and any CVV of the right length.

## Project structure

```
index.html              App shell (#app mount point, fonts, background glow)
src/
  main.ts               Entry: router setup, route guard, mounting pages
  router.ts             Typed hash router (#/login, #/signup, #/checkout)
  auth.ts               Demo auth: salted SHA-256, users + session storage
  passwordStrength.ts   Strength scoring for the sign-up meter
  dom.ts                Small DOM helpers (query, createElement, wait, reduced motion)
  tilt.ts               Mouse tilt + glare (eased with requestAnimationFrame)
  cardType.ts           Brand detection and per-brand metadata
  format.ts             Card input sanitising/formatting helpers
  validate.ts           Luhn check, card validators and account-field validators
  badge.ts              Text-only brand badges (no official logos)
  pages/
    auth.ts             Split-screen auth view: floating-card scene + flipping panel
    login.ts            Login form (panel front)
    signup.ts           Sign Up form with strength meter (panel back)
    checkout.ts         Checkout page with user header
    types.ts            Shared page/form interfaces
  components/
    card.ts             Reusable 3D credit card
    field.ts            Floating-label fields, eye toggle, validation/shake helpers, social buttons
    profileMenu.ts      Profile chip + glass dropdown (header)
    logoutModal.ts      Logout confirmation: hold-to-confirm, wallet + particle exit
    toast.ts            Toast notifications
    success.ts          Checkmark success overlay
    brand.ts            "NOVA PAY" wordmark
  style.css             Tailwind import, theme fonts, form/auth components, UI keyframes
  card.css              Card textures and themes, 3D transforms (card, floating scene, panel flip)
```

The typefaces (Share Tech Mono and Manrope) load from Google Fonts. Offline, the page falls back to system fonts.
