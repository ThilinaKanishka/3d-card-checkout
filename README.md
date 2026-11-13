# 3D Smart Credit Card Checkout

A checkout form with a live, 3D-flipping credit card preview. Built with **Vite**, **TypeScript** (vanilla, no framework) and **Tailwind CSS v4**.

> This is a UI demo only. No payment is processed and no card data leaves the browser.

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

## Features

- **Live card preview**: the number, holder name, expiry and CVV appear on the card as you type, with `#### #### #### ####` / `FULL NAME` / `MM/YY` placeholders.
- **Input formatting**:
  - Card number accepts digits only and is grouped as `1234 5678 9012 3456` (Amex uses `3782 822463 10005`). The caret stays in place when you edit mid-number.
  - Card holder accepts letters and spaces only, and is shown in uppercase on the card.
  - Expiry inserts the `/` for you (`MM/YY`). Backspace removes it as expected.
  - CVV accepts 3 digits, or 4 for Amex.
- **Brand detection**: Visa (`4`), Mastercard (`51–55`, `2221–2720`) and Amex (`34`, `37`). Each brand has its own logo and card gradient.
- **3D flip**: focusing the CVV field rotates the card 180° to show the back (`perspective`, `preserve-3d`, `backface-visibility: hidden`).
- **Focus highlight**: the part of the card that matches the focused field (number, name or expiry) gets a soft glowing border.
- **Validation**:
  - Card numbers are checked with the Luhn algorithm.
  - Expiry month must be 01–12, and the date can't be in the past.
  - Errors appear under each invalid field, and **Pay Now** stays disabled until every field is valid.
- **Success state**: after a short simulated delay, a confirmation shows the brand and the last four digits.
- **Responsive**: the card stacks above the form on small screens. Card text scales with the card using container query units.
- **Accessibility**: the page respects `prefers-reduced-motion`.

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
index.html        Page markup (card faces + payment form)
src/
  main.ts         Wires inputs to the card preview, validation, flip & submit
  cardType.ts     Brand detection and per-brand metadata (length, grouping, CVV length)
  format.ts       Input sanitising/formatting helpers
  validate.ts     Luhn check and field validators
  logos.ts        Inline brand marks
  style.css       Tailwind import, form component classes and 3D card styles
```
