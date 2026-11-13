/**
 * The "NOVA PAY" wordmark used in page headers.
 */

export function brandMarkTemplate(): string {
  return `
<span class="flex items-center gap-2.5">
  <span class="grid size-8 place-items-center rounded-lg bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-900/40" aria-hidden="true">
    <svg viewBox="0 0 24 24" class="size-4 fill-none stroke-white stroke-2"><rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18" /></svg>
  </span>
  <span class="font-bank text-sm font-extrabold tracking-[0.22em] text-white">NOVA<span class="font-medium text-white/60"> PAY</span></span>
</span>`;
}
