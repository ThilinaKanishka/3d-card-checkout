/**
 * Reusable 3D credit card. Used live on the checkout page and as decoration
 * in the auth scene.
 *
 * Structure: .card-scene (perspective) → .card-ground (shadow)
 *                                       → .card-tilt (mouse tilt, see tilt.ts)
 *                                           → .card (CVV flip) → front / back faces
 */

import type { CardBrand } from '../cardType';
import { getBrandBadge } from '../badge';
import { createElement, query } from '../dom';

export type CardRegion = 'number' | 'holder' | 'expiry';

export interface CardOptions {
  brand?: CardBrand;
  number?: string;
  holder?: string;
  expiry?: string;
  cvv?: string;
  /** Classes for the scene element (sizing). */
  className?: string;
  /** Hide from assistive tech (for purely decorative cards). */
  decorative?: boolean;
}

export interface CardHandle {
  /** The scene element to insert into the page (and to attach tilt to). */
  root: HTMLElement;
  setBrand(brand: CardBrand): void;
  setNumber(text: string): void;
  setHolder(text: string): void;
  setExpiry(text: string): void;
  setCvv(text: string): void;
  /** Glows the region matching the focused form field (or none). */
  setActiveRegion(region: CardRegion | null): void;
  setFlipped(flipped: boolean): void;
}

/** Each card needs its own SVG gradient id. */
let instanceCount = 0;

function template(chipId: string, className: string): string {
  return `
<div class="card-scene @container relative ${className}">
  <div class="card-ground" aria-hidden="true"></div>

  <div class="card-tilt">
    <div class="card" data-part="card" data-brand="unknown">
      <!-- ───── Front ───── -->
      <div class="card-face flex flex-col justify-between px-[6.5cqw] pt-[5.5cqw] pb-[5cqw]">
        <div class="card-texture" aria-hidden="true"></div>

        <!-- Bank name + tier -->
        <div class="relative flex items-baseline justify-between">
          <span class="font-bank text-[4.4cqw] font-extrabold tracking-[0.2em] text-white/90">
            NOVA<span class="font-medium text-white/60"> BANK</span>
          </span>
          <span class="font-bank text-[2.5cqw] font-bold tracking-[0.3em] text-white/50 uppercase">Platinum</span>
        </div>

        <!-- Chip, contactless, hologram -->
        <div class="relative flex items-center justify-between">
          <div class="flex items-center gap-[2.5cqw]">
            <svg class="card-chip h-auto w-[12.5cqw]" viewBox="0 0 50 38" aria-hidden="true">
              <defs>
                <linearGradient id="${chipId}" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#fbeab0" />
                  <stop offset="0.3" stop-color="#d8ad52" />
                  <stop offset="0.55" stop-color="#f5d889" />
                  <stop offset="0.8" stop-color="#c39338" />
                  <stop offset="1" stop-color="#9c7027" />
                </linearGradient>
              </defs>
              <rect x="0.5" y="0.5" width="49" height="37" rx="6" fill="url(#${chipId})" stroke="#7d5a1c" stroke-opacity="0.7" />
              <!-- Contact pads -->
              <g fill="none" stroke="#6f4d16" stroke-opacity="0.6" stroke-width="0.9" stroke-linecap="round">
                <rect x="17" y="10" width="16" height="18" rx="3.5" />
                <path d="M0.5 13H17M0.5 25H17M33 13H49.5M33 25H49.5M25 0.5V10M25 28V37.5" />
                <path d="M17 19H11Q9 19 9 17V0.5M33 19H39Q41 19 41 21V37.5" />
              </g>
              <!-- Bevel highlight -->
              <rect x="1.6" y="1.6" width="46.8" height="34.8" rx="5" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="0.8" />
            </svg>
            <svg class="h-auto w-[6cqw] fill-none stroke-white/80 stroke-2 [stroke-linecap:round]" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17" />
            </svg>
          </div>
          <div class="card-holo h-[8cqw] w-[11.5cqw] rounded-[1.4cqw]" aria-hidden="true"></div>
        </div>

        <!-- Number -->
        <div data-region="number" class="card-region relative -m-[1.5cqw] self-start rounded-[2cqw] p-[1.5cqw]">
          <span data-part="number" class="emboss font-ocr text-[6.7cqw] tracking-[0.08em] whitespace-pre">#### #### #### ####</span>
        </div>

        <!-- Holder, expiry, brand -->
        <div class="relative flex items-end gap-[4cqw]">
          <div data-region="holder" class="card-region -m-[1.5cqw] flex min-w-0 flex-1 flex-col gap-[0.8cqw] rounded-[2cqw] p-[1.5cqw]">
            <span class="card-label">Card Holder</span>
            <span data-part="holder" class="emboss truncate font-ocr text-[4.3cqw] tracking-[0.06em] uppercase">FULL NAME</span>
          </div>
          <div data-region="expiry" class="card-region -m-[1.5cqw] flex shrink-0 flex-col gap-[0.8cqw] rounded-[2cqw] p-[1.5cqw]">
            <span class="card-label">Valid Thru</span>
            <span data-part="expiry" class="emboss font-ocr text-[4.3cqw] tracking-[0.06em]">MM/YY</span>
          </div>
          <div data-part="badge-front" class="flex h-[8cqw] shrink-0 items-end"></div>
        </div>

        <div class="card-glare" aria-hidden="true"></div>
      </div>

      <!-- ───── Back ───── -->
      <div class="card-face card-back flex flex-col">
        <div class="card-texture" aria-hidden="true"></div>

        <div class="card-stripe relative mt-[7cqw] h-[14cqw]" aria-hidden="true"></div>

        <div class="relative mt-[5cqw] px-[6.5cqw]">
          <div class="mb-[1cqw] flex justify-between">
            <span class="card-label">Authorized Signature</span>
            <span class="card-label pr-[2cqw]">CVV</span>
          </div>
          <div class="flex items-stretch gap-[2cqw]">
            <div class="card-signature h-[10cqw] flex-1 rounded-[0.8cqw]" aria-hidden="true"></div>
            <div class="flex w-[15cqw] items-center justify-center rounded-[0.8cqw] bg-white shadow-[inset_0_1px_3px_rgb(0_0_0/0.25)]">
              <span data-part="cvv" class="font-ocr text-[4.4cqw] font-bold tracking-[0.12em] text-slate-900 italic"></span>
            </div>
          </div>
        </div>

        <div class="relative mt-auto flex items-end justify-between gap-[4cqw] px-[6.5cqw] pb-[5cqw]">
          <p class="max-w-[62%] font-bank text-[2.1cqw] leading-snug text-white/55">
            This card is issued by Nova Bank for demonstration only. No real payment
            information is processed or stored. If found, please return to any branch.
          </p>
          <div data-part="badge-back" class="flex h-[8cqw] shrink-0 items-end"></div>
        </div>

        <div class="card-glare card-glare-back" aria-hidden="true"></div>
      </div>
    </div>
  </div>
</div>`;
}

/** Creates a card element and returns a handle for updating it. */
export function createCard(options: CardOptions = {}): CardHandle {
  instanceCount += 1;
  const root = createElement(template(`chip-gold-${instanceCount}`, options.className ?? 'w-full max-w-[400px]'));
  if (options.decorative) root.setAttribute('aria-hidden', 'true');

  const card = query(root, '[data-part="card"]');
  const number = query(root, '[data-part="number"]');
  const holder = query(root, '[data-part="holder"]');
  const expiry = query(root, '[data-part="expiry"]');
  const cvv = query(root, '[data-part="cvv"]');
  const badgeFront = query(root, '[data-part="badge-front"]');
  const badgeBack = query(root, '[data-part="badge-back"]');
  const regions = Array.from(root.querySelectorAll<HTMLElement>('[data-region]'));

  let currentBrand: CardBrand | null = null;

  const handle: CardHandle = {
    root,
    setBrand(brand) {
      if (brand === currentBrand) return;
      currentBrand = brand;
      card.dataset.brand = brand;
      const badge = getBrandBadge(brand);
      badgeFront.innerHTML = badge;
      badgeBack.innerHTML = badge;
    },
    setNumber(text) {
      number.textContent = text;
    },
    setHolder(text) {
      holder.textContent = text;
    },
    setExpiry(text) {
      expiry.textContent = text;
    },
    setCvv(text) {
      cvv.textContent = text;
    },
    setActiveRegion(region) {
      for (const el of regions) el.classList.toggle('is-active', el.dataset.region === region);
    },
    setFlipped(flipped) {
      card.classList.toggle('is-flipped', flipped);
    },
  };

  handle.setBrand(options.brand ?? 'unknown');
  if (options.number !== undefined) handle.setNumber(options.number);
  if (options.holder !== undefined) handle.setHolder(options.holder);
  if (options.expiry !== undefined) handle.setExpiry(options.expiry);
  if (options.cvv !== undefined) handle.setCvv(options.cvv);
  return handle;
}
