/**
 * FastAPI Backend AI Background Removal & 4K Image Enhancement Client Service
 * Pipeline: GFPGAN / CodeFormer (Face Restoration) -> Real-ESRGAN (Super Resolution) -> SUPIR (Detail Enhancement)
 */

const DEFAULT_BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:8000';

export interface FastAPIBgRemoveOptions {
  model?: 'birefnet' | 'rmbg';
  refine?: boolean;
  enhance?: boolean;
  backendUrl?: string;
}

export interface FastAPIEnhanceOptions {
  scaleFactor?: number;
  backendUrl?: string;
}

export async function removeBackgroundViaFastAPI(
  imageSource: string | File | Blob,
  options: FastAPIBgRemoveOptions = {}
): Promise<string> {
  const {
    model = 'birefnet',
    refine = true,
    enhance = true,
    backendUrl = DEFAULT_BACKEND_URL
  } = options;

  let blobToUpload: Blob;

  if (typeof imageSource === 'string') {
    const res = await fetch(imageSource);
    blobToUpload = await res.blob();
  } else {
    blobToUpload = imageSource;
  }

  const formData = new FormData();
  formData.append('file', blobToUpload, 'passport_photo.png');
  formData.append('model', model);
  formData.append('refine', String(refine));
  formData.append('enhance', String(enhance));

  const endpoint = `${backendUrl}/api/v1/passport/remove-bg`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FastAPI Background Removal Error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  if (!json.success || !json.data_url) {
    throw new Error(json.message || 'FastAPI service returned invalid data');
  }

  return json.data_url;
}

export async function enhanceImageViaFastAPI(
  imageSource: string | File | Blob,
  options: FastAPIEnhanceOptions = {}
): Promise<string> {
  const {
    scaleFactor = 2.0,
    backendUrl = DEFAULT_BACKEND_URL
  } = options;

  let blobToUpload: Blob;

  if (typeof imageSource === 'string') {
    const res = await fetch(imageSource);
    blobToUpload = await res.blob();
  } else {
    blobToUpload = imageSource;
  }

  const formData = new FormData();
  formData.append('file', blobToUpload, 'passport_photo.png');
  formData.append('scale_factor', String(scaleFactor));

  const endpoint = `${backendUrl}/api/v1/passport/enhance`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FastAPI Image Enhancement Error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  if (!json.success || !json.data_url) {
    throw new Error(json.message || 'FastAPI service returned invalid data');
  }

  return json.data_url;
}

export interface FastAPIRetouchOptions {
  preset?: string;
  smoothingStrength?: number;
  shineReduction?: number;
  shadowSoftening?: number;
  toneBalance?: number;
  sharpenFeatures?: number;
  backendUrl?: string;
}

export interface FilterPreviewItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  data_url: string;
}

import {
  applyLocalPortraitFilter,
  generateLocalPipelineSteps,
  generateLocalFilterPreviews
} from '../passport-studio/services/image-processing.service';

export async function fetchPortraitFilterPreviews(
  imageSource: string | File | Blob,
  backendUrl = DEFAULT_BACKEND_URL
): Promise<Record<string, FilterPreviewItem>> {
  try {
    let blobToUpload: Blob;

    if (typeof imageSource === 'string') {
      const res = await fetch(imageSource);
      blobToUpload = await res.blob();
    } else {
      blobToUpload = imageSource;
    }

    const formData = new FormData();
    formData.append('file', blobToUpload, 'passport_photo.png');

    const response = await fetch(`${backendUrl}/api/v1/passport/retouch-previews`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch retouch previews: ${response.statusText}`);
    }

    const json = await response.json();
    if (!json.success || !json.previews) {
      throw new Error('Invalid preview response format');
    }

    return json.previews;
  } catch (err) {
    console.warn('[FastAPI Filter Previews Error / Offline Fallback]', err);
    return await generateLocalFilterPreviews(imageSource);
  }
}

export interface PipelineStepItem {
  name: string;
  data_url: string;
}

export async function fetchPipelineStepThumbnails(
  imageSource: string | File | Blob,
  backendUrl = DEFAULT_BACKEND_URL
): Promise<Record<string, PipelineStepItem>> {
  try {
    let blobToUpload: Blob;

    if (typeof imageSource === 'string') {
      const res = await fetch(imageSource);
      blobToUpload = await res.blob();
    } else {
      blobToUpload = imageSource;
    }

    const formData = new FormData();
    formData.append('file', blobToUpload, 'passport_photo.png');

    const response = await fetch(`${backendUrl}/api/v1/passport/retouch-pipeline-steps`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pipeline steps: ${response.statusText}`);
    }

    const json = await response.json();
    if (!json.success || !json.steps) {
      throw new Error('Invalid pipeline step response format');
    }

    return json.steps;
  } catch (err) {
    console.warn('[FastAPI Pipeline Steps Error / Offline Fallback]', err);
    return await generateLocalPipelineSteps(imageSource);
  }
}

export async function retouchPassportPhotoViaFastAPI(
  imageSource: string | File | Blob,
  options: FastAPIRetouchOptions = {}
): Promise<string> {
  const {
    preset = 'natural',
    smoothingStrength = 0.5,
    shineReduction = 0.6,
    shadowSoftening = 0.4,
    toneBalance = 0.5,
    sharpenFeatures = 0.35,
    backendUrl = DEFAULT_BACKEND_URL
  } = options;

  try {
    let blobToUpload: Blob;

    if (typeof imageSource === 'string') {
      const res = await fetch(imageSource);
      blobToUpload = await res.blob();
    } else {
      blobToUpload = imageSource;
    }

    const formData = new FormData();
    formData.append('file', blobToUpload, 'passport_photo.png');
    if (preset) {
      formData.append('preset', preset);
    }
    formData.append('smoothing_strength', String(smoothingStrength));
    formData.append('shine_reduction', String(shineReduction));
    formData.append('shadow_softening', String(shadowSoftening));
    formData.append('tone_balance', String(toneBalance));
    formData.append('sharpen_features', String(sharpenFeatures));

    const endpoint = `${backendUrl}/api/v1/passport/retouch`;

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FastAPI Portrait Retouching Error (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    if (!json.success || !json.data_url) {
      throw new Error(json.message || 'FastAPI retouch service returned invalid data');
    }

    return json.data_url;
  } catch (err) {
    console.warn('[FastAPI Retouch Error / Local Canvas Fallback]', err);
    return await applyLocalPortraitFilter(imageSource, preset);
  }
}

export async function checkFastAPIBackendHealth(backendUrl = DEFAULT_BACKEND_URL): Promise<boolean> {
  try {
    const res = await fetch(`${backendUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}


