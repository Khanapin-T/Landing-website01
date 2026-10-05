// Shared procedural textures. Later tasks extend this file (soft sprites, fabric, ...).
import { CanvasTexture, SRGBColorSpace } from 'three';

let blob = null;

// Soft white radial blob (alpha falls off to 0), used as a fake contact shadow: put it on a
// transparent plane/sprite with a black material colour. Created once and shared.
export function blobTexture() {
  if (blob) return blob;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  blob = new CanvasTexture(c);
  blob.colorSpace = SRGBColorSpace;
  return blob;
}
