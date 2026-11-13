/**
 * Mouse-driven 3D tilt with a cursor-following glare.
 *
 * The values are written as CSS custom properties on the scene element, and
 * card.css turns them into transforms and gradients:
 *   --rx / --ry  rotation in degrees (unitless numbers)
 *   --gx / --gy  glare centre (percentages)
 *   --glare      glare opacity (0–1)
 *
 * The tilt lives on a wrapper around the flipping card, so the two transforms
 * compose instead of overwriting each other.
 */

export interface TiltOptions {
  /** Maximum rotation on each axis, in degrees. */
  maxTilt?: number;
  /** Fraction of the remaining distance covered each frame (0–1). Lower is smoother. */
  smoothing?: number;
}

interface TiltState {
  rx: number;
  ry: number;
  gx: number;
  gy: number;
  glare: number;
}

const KEYS: readonly (keyof TiltState)[] = ['rx', 'ry', 'gx', 'gy', 'glare'];
const REST: TiltState = { rx: 0, ry: 0, gx: 50, gy: 50, glare: 0 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Enables the tilt effect on a scene element.
 *
 * @returns A cleanup function that removes the listeners and resets the card.
 */
export function attachTilt(scene: HTMLElement, { maxTilt = 12, smoothing = 0.12 }: TiltOptions = {}): () => void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const current: TiltState = { ...REST };
  const target: TiltState = { ...REST };
  let frame = 0;

  /** Writes the current state to the CSS variables. */
  function apply(): void {
    scene.style.setProperty('--rx', current.rx.toFixed(2));
    scene.style.setProperty('--ry', current.ry.toFixed(2));
    scene.style.setProperty('--gx', `${current.gx.toFixed(1)}%`);
    scene.style.setProperty('--gy', `${current.gy.toFixed(1)}%`);
    scene.style.setProperty('--glare', current.glare.toFixed(3));
  }

  /** Eases `current` toward `target`, one animation frame at a time, and stops when settled. */
  function tick(): void {
    let settled = true;
    for (const key of KEYS) {
      const delta = target[key] - current[key];
      if (Math.abs(delta) > 0.01) {
        current[key] += delta * smoothing;
        settled = false;
      } else {
        current[key] = target[key];
      }
    }
    apply();
    frame = settled ? 0 : requestAnimationFrame(tick);
  }

  function start(): void {
    if (frame === 0) frame = requestAnimationFrame(tick);
  }

  /** Jumps straight to the resting position (used when motion is reduced). */
  function snapToRest(): void {
    cancelAnimationFrame(frame);
    frame = 0;
    Object.assign(target, REST);
    Object.assign(current, REST);
    apply();
  }

  function onPointerMove(event: PointerEvent): void {
    // Touch drags should scroll the page, not tilt the card.
    if (reducedMotion.matches || event.pointerType === 'touch') return;

    const rect = scene.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);

    // The edge under the cursor dips away from the viewer.
    target.rx = (0.5 - y) * 2 * maxTilt;
    target.ry = (x - 0.5) * 2 * maxTilt;
    target.gx = x * 100;
    target.gy = y * 100;
    target.glare = 1;
    start();
  }

  function onPointerLeave(): void {
    Object.assign(target, { rx: 0, ry: 0, glare: 0 });
    start();
  }

  function onMotionPreferenceChange(): void {
    if (reducedMotion.matches) snapToRest();
  }

  scene.addEventListener('pointermove', onPointerMove);
  scene.addEventListener('pointerleave', onPointerLeave);
  reducedMotion.addEventListener('change', onMotionPreferenceChange);
  apply();

  return () => {
    scene.removeEventListener('pointermove', onPointerMove);
    scene.removeEventListener('pointerleave', onPointerLeave);
    reducedMotion.removeEventListener('change', onMotionPreferenceChange);
    snapToRest();
  };
}
