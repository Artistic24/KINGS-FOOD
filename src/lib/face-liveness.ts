/**
 * Lightweight, dependency-free liveness helpers.
 *
 * Each camera frame is downscaled to a tiny bitmap and scanned for skin-tone
 * pixels. From that we derive a rich sample that is sensitive enough to catch
 * *slight* movements on cheap Android phones:
 *
 *  - `mass`       how much of the frame looks like a face (0..1)
 *  - `cx`, `cy`   centroid of the face, normalised 0..1
 *  - `asym`       left/right skin balance (-1..1). Turning the head shifts
 *                 this strongly even when the centroid barely moves, which is
 *                 what makes small turns detectable.
 *  - `mouth`      texture energy in the lower third of the face box; rises
 *                 when the person smiles (teeth + shadow lines)
 *  - `bright`     mean luminance of the mouth band, used as a second smile cue
 *
 * It is intentionally simple so it runs on low-end devices.
 */

export type FaceSample = {
  mass: number;
  cx: number;
  cy: number;
  asym: number;
  mouth: number;
  bright: number;
};

const W = 64;
const H = 64;

function isSkin(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Deliberately permissive so darker skin tones and dim rooms still register.
  return r > 45 && g > 25 && b > 12 && r >= g && g >= b - 12 && max - min > 8;
}

export function sampleFace(video: HTMLVideoElement, canvas: HTMLCanvasElement): FaceSample | null {
  if (!video.videoWidth) return null;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);

  let count = 0;
  let sx = 0;
  let sy = 0;
  let left = 0;
  let right = 0;
  let minY = H;
  let maxY = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (isSkin(data[i], data[i + 1], data[i + 2])) {
        count++;
        sx += x;
        sy += y;
        if (x < W / 2) left++;
        else right++;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const mass = count / (W * H);
  if (count < 40) return { mass, cx: 0.5, cy: 0.5, asym: 0, mouth: 0, bright: 0 };

  const cx = sx / count / W;
  const cy = sy / count / H;
  const asym = (right - left) / count;

  // Mouth band: lower third of the detected face box, centred horizontally.
  const y0 = Math.round(minY + (maxY - minY) * 0.58);
  const y1 = Math.min(H - 1, maxY);
  const x0 = Math.max(0, Math.round(cx * W - 13));
  const x1 = Math.min(W - 1, Math.round(cx * W + 13));
  let energy = 0;
  let lum = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      const j = (y * W + x + 1) * 4;
      const l1 = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const l2 = (data[j] + data[j + 1] + data[j + 2]) / 3;
      energy += Math.abs(l1 - l2);
      lum += l1;
      n++;
    }
  }

  return {
    mass,
    cx,
    cy,
    asym,
    mouth: n ? energy / n : 0,
    bright: n ? lum / n : 0,
  };
}

/** Exponential smoothing so jitter doesn't hide a real, slow movement. */
export function blendSample(prev: FaceSample | null, next: FaceSample, alpha = 0.45): FaceSample {
  if (!prev) return next;
  const mix = (a: number, b: number) => a + (b - a) * alpha;
  return {
    mass: mix(prev.mass, next.mass),
    cx: mix(prev.cx, next.cx),
    cy: mix(prev.cy, next.cy),
    asym: mix(prev.asym, next.asym),
    mouth: mix(prev.mouth, next.mouth),
    bright: mix(prev.bright, next.bright),
  };
}
