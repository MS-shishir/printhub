/**
 * DeformationEngine.ts
 * Enterprise-Grade 2D Moving Least Squares (MLS) & Triangular Mesh Deformation Engine.
 * 
 * Implements:
 * 1. Schaefer et al. (SIGGRAPH 2006) Moving Least Squares:
 *    - Rigid Deformation (Preserves local scale & aspect ratio, ideal for portraits/limbs)
 *    - Similarity Deformation (Angles preserved, isotropic scaling permitted)
 *    - Affine Deformation (General elastic stretch/shear)
 * 2. Triangular Mesh Generation (Configurable Density Grid + Outer Padding)
 * 3. Hardware-Accelerated Piecewise-Affine Canvas 2D / Sub-Pixel Texture Resampling
 */

export type DeformMode = 'rigid' | 'similarity' | 'affine';
export type MeshDensity = 'low' | 'medium' | 'high';

export interface DeformPin {
  id: string;
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  isLocked?: boolean;
  isPivot?: boolean;
  label?: string;
  depth?: number;
}

export interface MeshPoint {
  x: number;
  y: number;
  u: number; // Normalized texture coordinate [0, 1]
  v: number; // Normalized texture coordinate [0, 1]
}

export interface MeshTriangle {
  p0: number; // Index into vertices array
  p1: number;
  p2: number;
}

export interface DeformMesh {
  width: number;
  height: number;
  vertices: MeshPoint[];
  triangles: MeshTriangle[];
  gridCols: number;
  gridRows: number;
}

export interface DeformationOptions {
  mode: DeformMode;
  alpha: number; // Weight exponent (1 or 2)
  renderWireframe?: boolean;
  wireframeColor?: string;
  wireframeAlpha?: number;
}

export class DeformationEngine {
  /**
   * Generates a regular triangular mesh across the given dimensions or subject bounds.
   */
  public static generateMesh(
    width: number,
    height: number,
    density: MeshDensity = 'medium',
    padding: number = 0,
    bounds?: { x: number; y: number; width: number; height: number }
  ): DeformMesh {
    let cols = 20;
    let rows = 20;

    if (density === 'low') {
      cols = 12;
      rows = 12;
    } else if (density === 'high') {
      cols = 32;
      rows = 32;
    }

    const bX = bounds ? bounds.x : 0;
    const bY = bounds ? bounds.y : 0;
    const bW = bounds ? bounds.width : width;
    const bH = bounds ? bounds.height : height;

    const minX = Math.max(0, bX - padding);
    const maxX = Math.min(width, bX + bW + padding);
    const minY = Math.max(0, bY - padding);
    const maxY = Math.min(height, bY + bH + padding);

    const stepX = (maxX - minX) / cols;
    const stepY = (maxY - minY) / rows;

    const vertices: MeshPoint[] = [];
    const triangles: MeshTriangle[] = [];

    // Generate grid vertices
    for (let r = 0; r <= rows; r++) {
      const y = minY + r * stepY;
      const v = y / height;
      for (let c = 0; c <= cols; c++) {
        const x = minX + c * stepX;
        const u = x / width;
        vertices.push({ x, y, u, v });
      }
    }

    // Generate Delaunay / regular triangles
    const stride = cols + 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i0 = r * stride + c;
        const i1 = r * stride + (c + 1);
        const i2 = (r + 1) * stride + c;
        const i3 = (r + 1) * stride + (c + 1);

        // Split quad into 2 triangles with alternating diagonal for uniform elasticity
        if ((r + c) % 2 === 0) {
          triangles.push({ p0: i0, p1: i1, p2: i2 });
          triangles.push({ p0: i1, p1: i3, p2: i2 });
        } else {
          triangles.push({ p0: i0, p1: i1, p2: i3 });
          triangles.push({ p0: i0, p1: i3, p2: i2 });
        }
      }
    }

    return {
      width,
      height,
      vertices,
      triangles,
      gridCols: cols,
      gridRows: rows,
    };
  }

  /**
   * Solve Moving Least Squares (MLS) for all mesh vertices.
   * Returns a new array of deformed {x, y} vertices.
   */
  public static solveMLS(
    mesh: DeformMesh,
    pins: DeformPin[],
    options: DeformationOptions
  ): { x: number; y: number }[] {
    const { vertices } = mesh;
    const count = vertices.length;
    const numPins = pins.length;

    // If no pins, return original positions
    if (numPins === 0) {
      return vertices.map((v) => ({ x: v.x, y: v.y }));
    }

    // Check if any pins actually moved
    let hasMovement = false;
    for (let i = 0; i < numPins; i++) {
      if (
        Math.abs(pins[i].x - pins[i].originalX) > 0.001 ||
        Math.abs(pins[i].y - pins[i].originalY) > 0.001
      ) {
        hasMovement = true;
        break;
      }
    }

    if (!hasMovement) {
      return vertices.map((v) => ({ x: v.x, y: v.y }));
    }

    const { mode, alpha } = options;
    const deformedVertices: { x: number; y: number }[] = new Array(count);

    // Pre-extract pin positions
    const Px = new Float32Array(numPins);
    const Py = new Float32Array(numPins);
    const Qx = new Float32Array(numPins);
    const Qy = new Float32Array(numPins);

    for (let i = 0; i < numPins; i++) {
      Px[i] = pins[i].originalX;
      Py[i] = pins[i].originalY;
      Qx[i] = pins[i].x;
      Qy[i] = pins[i].y;
    }

    const EPSILON = 1e-6;

    // Process each mesh vertex
    for (let vi = 0; vi < count; vi++) {
      const vx = vertices[vi].x;
      const vy = vertices[vi].y;

      let sumW = 0;
      let exactMatchIdx = -1;

      // Allocate weights
      const weights = new Float32Array(numPins);
      for (let i = 0; i < numPins; i++) {
        const dx = Px[i] - vx;
        const dy = Py[i] - vy;
        const distSq = dx * dx + dy * dy;

        if (distSq < EPSILON) {
          exactMatchIdx = i;
          break;
        }

        const w = alpha === 1 ? 1 / distSq : 1 / (distSq * distSq);
        weights[i] = w;
        sumW += w;
      }

      // If vertex is exactly on a control pin, snap directly to deformed pin position
      if (exactMatchIdx !== -1) {
        deformedVertices[vi] = {
          x: Qx[exactMatchIdx],
          y: Qy[exactMatchIdx],
        };
        continue;
      }

      if (sumW < EPSILON) {
        deformedVertices[vi] = { x: vx, y: vy };
        continue;
      }

      const invSumW = 1 / sumW;

      // Weighted centroids p* and q*
      let pStarX = 0;
      let pStarY = 0;
      let qStarX = 0;
      let qStarY = 0;

      for (let i = 0; i < numPins; i++) {
        const w = weights[i];
        pStarX += w * Px[i];
        pStarY += w * Py[i];
        qStarX += w * Qx[i];
        qStarY += w * Qy[i];
      }

      pStarX *= invSumW;
      pStarY *= invSumW;
      qStarX *= invSumW;
      qStarY *= invSumW;

      // Relative positions
      const vMinusPStarX = vx - pStarX;
      const vMinusPStarY = vy - pStarY;

      if (mode === 'rigid') {
        // --- RIGID MLS DEFORMATION ---
        // Formula: Schaefer et al. Eq. (8)
        let mu00 = 0;
        let mu01 = 0;

        for (let i = 0; i < numPins; i++) {
          const w = weights[i];
          const pCapX = Px[i] - pStarX;
          const pCapY = Py[i] - pStarY;
          const qCapX = Qx[i] - qStarX;
          const qCapY = Qy[i] - qStarY;

          // A_i * B_i matrix components
          mu00 += w * (pCapX * qCapX + pCapY * qCapY);
          mu01 += w * (pCapX * qCapY - pCapY * qCapX);
        }

        const normM = Math.sqrt(mu00 * mu00 + mu01 * mu01);
        if (normM < EPSILON) {
          deformedVertices[vi] = { x: vx, y: vy };
          continue;
        }

        const invNormM = 1 / normM;
        const r00 = mu00 * invNormM;
        const r01 = mu01 * invNormM;

        // Rigid transformation preserving length of (v - p*)
        const rotX = vMinusPStarX * r00 - vMinusPStarY * r01;
        const rotY = vMinusPStarX * r01 + vMinusPStarY * r00;

        deformedVertices[vi] = {
          x: rotX + qStarX,
          y: rotY + qStarY,
        };
      } else if (mode === 'similarity') {
        // --- SIMILARITY MLS DEFORMATION ---
        // Formula: Schaefer et al. Eq. (6)
        let mu00 = 0;
        let mu01 = 0;
        let sumPsq = 0;

        for (let i = 0; i < numPins; i++) {
          const w = weights[i];
          const pCapX = Px[i] - pStarX;
          const pCapY = Py[i] - pStarY;
          const qCapX = Qx[i] - qStarX;
          const qCapY = Qy[i] - qStarY;

          mu00 += w * (pCapX * qCapX + pCapY * qCapY);
          mu01 += w * (pCapX * qCapY - pCapY * qCapX);
          sumPsq += w * (pCapX * pCapX + pCapY * pCapY);
        }

        if (sumPsq < EPSILON) {
          deformedVertices[vi] = { x: vx, y: vy };
          continue;
        }

        const invPsq = 1 / sumPsq;
        const s00 = mu00 * invPsq;
        const s01 = mu01 * invPsq;

        const simX = vMinusPStarX * s00 - vMinusPStarY * s01;
        const simY = vMinusPStarX * s01 + vMinusPStarY * s00;

        deformedVertices[vi] = {
          x: simX + qStarX,
          y: simY + qStarY,
        };
      } else {
        // --- AFFINE MLS DEFORMATION ---
        // Formula: Schaefer et al. Eq. (4)
        let m00 = 0, m01 = 0, m10 = 0, m11 = 0;
        for (let i = 0; i < numPins; i++) {
          const w = weights[i];
          const pCapX = Px[i] - pStarX;
          const pCapY = Py[i] - pStarY;
          m00 += w * pCapX * pCapX;
          m01 += w * pCapX * pCapY;
          m11 += w * pCapY * pCapY;
        }
        m10 = m01;

        const det = m00 * m11 - m01 * m10;
        if (Math.abs(det) < EPSILON) {
          deformedVertices[vi] = { x: vx, y: vy };
          continue;
        }

        const invDet = 1 / det;
        const invM00 = m11 * invDet;
        const invM01 = -m01 * invDet;
        const invM10 = -m10 * invDet;
        const invM11 = m00 * invDet;

        const gammaX = vMinusPStarX * invM00 + vMinusPStarY * invM10;
        const gammaY = vMinusPStarX * invM01 + vMinusPStarY * invM11;

        let resX = qStarX;
        let resY = qStarY;

        for (let i = 0; i < numPins; i++) {
          const w = weights[i];
          const pCapX = Px[i] - pStarX;
          const pCapY = Py[i] - pStarY;
          const qCapX = Qx[i] - qStarX;
          const qCapY = Qy[i] - qStarY;

          const dot = gammaX * pCapX + gammaY * pCapY;
          const coeff = w * dot;
          resX += coeff * qCapX;
          resY += coeff * qCapY;
        }

        deformedVertices[vi] = { x: resX, y: resY };
      }
    }

    return deformedVertices;
  }

  /**
   * Fast Hardware-Accelerated Piecewise Affine Canvas 2D Rendering.
   * Renders the deformed source image onto target canvas in real-time.
   */
  public static renderDeformedCanvas(
    sourceCanvasOrImage: HTMLCanvasElement | HTMLImageElement,
    mesh: DeformMesh,
    deformedVertices: { x: number; y: number }[],
    targetCanvas: HTMLCanvasElement,
    options?: { renderWireframe?: boolean; wireframeColor?: string; wireframeAlpha?: number }
  ): void {
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const { width, height, vertices, triangles } = mesh;
    if (targetCanvas.width !== width || targetCanvas.height !== height) {
      targetCanvas.width = width;
      targetCanvas.height = height;
    }

    // 1. Draw pristine original base image first
    ctx.drawImage(sourceCanvasOrImage, 0, 0);

    // 2. Render deformed triangles with sub-pixel padding to eliminate antialiasing stitching gaps
    for (let t = 0; t < triangles.length; t++) {
      const tri = triangles[t];

      // Original coordinates
      const u0 = vertices[tri.p0].x;
      const v0 = vertices[tri.p0].y;
      const u1 = vertices[tri.p1].x;
      const v1 = vertices[tri.p1].y;
      const u2 = vertices[tri.p2].x;
      const v2 = vertices[tri.p2].y;

      // Deformed coordinates
      const x0 = deformedVertices[tri.p0].x;
      const y0 = deformedVertices[tri.p0].y;
      const x1 = deformedVertices[tri.p1].x;
      const y1 = deformedVertices[tri.p1].y;
      const x2 = deformedVertices[tri.p2].x;
      const y2 = deformedVertices[tri.p2].y;

      // Check if triangle actually moved
      const isMoved =
        Math.abs(x0 - u0) > 0.01 ||
        Math.abs(y0 - v0) > 0.01 ||
        Math.abs(x1 - u1) > 0.01 ||
        Math.abs(y1 - v1) > 0.01 ||
        Math.abs(x2 - u2) > 0.01 ||
        Math.abs(y2 - v2) > 0.01;

      if (!isMoved) continue; // Skip unchanged triangles

      // Calculate Affine Transformation Matrix mapping (u, v) -> (x, y)
      // [x, y, 1]^T = [a, c, e; b, d, f; 0, 0, 1] * [u, v, 1]^T
      const denom = u0 * (v1 - v2) - v0 * (u1 - u2) + (u1 * v2 - u2 * v1);
      if (Math.abs(denom) < 1e-6) continue;

      const invDenom = 1 / denom;

      const a = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) * invDenom;
      const b = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) * invDenom;
      const c = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) * invDenom;
      const d = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) * invDenom;
      const e = (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) * invDenom;
      const f = (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) * invDenom;

      // Expand triangle vertices outward slightly (0.8px) from centroid to overlap subpixel antialiasing seams
      const cx = (x0 + x1 + x2) / 3;
      const cy = (y0 + y1 + y2) / 3;
      const d0x = x0 - cx, d0y = y0 - cy;
      const d1x = x1 - cx, d1y = y1 - cy;
      const d2x = x2 - cx, d2y = y2 - cy;
      const l0 = Math.sqrt(d0x * d0x + d0y * d0y) || 1;
      const l1 = Math.sqrt(d1x * d1x + d1y * d1y) || 1;
      const l2 = Math.sqrt(d2x * d2x + d2y * d2y) || 1;
      const pad = 0.85;
      const ex0 = x0 + (d0x / l0) * pad;
      const ey0 = y0 + (d0y / l0) * pad;
      const ex1 = x1 + (d1x / l1) * pad;
      const ey1 = y1 + (d1y / l1) * pad;
      const ex2 = x2 + (d2x / l2) * pad;
      const ey2 = y2 + (d2y / l2) * pad;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ex0, ey0);
      ctx.lineTo(ex1, ey1);
      ctx.lineTo(ex2, ey2);
      ctx.closePath();
      ctx.clip();

      // Apply transform and draw source image
      ctx.transform(a, b, c, d, e, f);
      ctx.drawImage(sourceCanvasOrImage, 0, 0);
      ctx.restore();
    }

    // Optional Wireframe rendering
    if (options?.renderWireframe) {
      ctx.save();
      ctx.strokeStyle = options.wireframeColor || '#38bdf8';
      ctx.globalAlpha = options.wireframeAlpha ?? 0.35;
      ctx.lineWidth = 0.8;

      for (let t = 0; t < triangles.length; t++) {
        const tri = triangles[t];
        const x0 = deformedVertices[tri.p0].x;
        const y0 = deformedVertices[tri.p0].y;
        const x1 = deformedVertices[tri.p1].x;
        const y1 = deformedVertices[tri.p1].y;
        const x2 = deformedVertices[tri.p2].x;
        const y2 = deformedVertices[tri.p2].y;

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * Helper to create an offscreen canvas snapshot.
   */
  public static createSnapshot(source: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = (source as HTMLImageElement).naturalWidth || source.width || 800;
    canvas.height = (source as HTMLImageElement).naturalHeight || source.height || 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(source, 0, 0);
    }
    return canvas;
  }
}
