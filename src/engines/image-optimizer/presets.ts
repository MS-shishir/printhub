/**
 * presets.ts - Real-world Shop, Job Application, Admission & Web Image Processing Presets
 * Pre-calibrated configurations for Government Job applications, College/Varsity Admissions,
 * Social media & E-commerce, and strict KB/MB target file sizes.
 */

import { StudioPreset } from './types';

export const STUDIO_PRESETS: StudioPreset[] = [
  // ── 1. সরকারি চাকরি ও আবেদন (Government Job & Circulars) ───────────────────
  {
    id: 'gov_form_300',
    name: 'Govt Job Photo (300×300px ≤100KB)',
    nameBn: 'সরকারি চাকরির ছবি (৩০০×৩০০ ≤১০০KB)',
    description: 'Standard Teletalk / BPSC / Ministry job application photo (300x300 px ≤ 100 KB).',
    category: 'official',
    mode: 'target_size',
    targetMaxBytes: 100 * 1024,
    targetWidth: 300,
    targetHeight: 300,
    format: 'jpeg',
    qualityLevel: 'high',
    keepAspectRatio: true,
    smartSharpen: true,
    targetDpi: 300
  },
  {
    id: 'gov_sig_300x80',
    name: 'Govt Signature (300×80px ≤60KB)',
    nameBn: 'সরকারি চাকরির স্বাক্ষর (৩০০×৮০ ≤৬০KB)',
    description: 'Standard Teletalk / Ministry signature specification (300x80 px ≤ 60 KB).',
    category: 'official',
    mode: 'target_size',
    targetMaxBytes: 60 * 1024,
    targetWidth: 300,
    targetHeight: 80,
    format: 'jpeg',
    qualityLevel: 'high',
    keepAspectRatio: true,
    smartSharpen: true,
    targetDpi: 300
  },
  {
    id: 'ntrca_photo',
    name: 'NTRCA / BCS Form Photo',
    nameBn: 'এনটিআরসিএ / বিসিএস ছবি (৩০০×৩০০)',
    description: 'Standard 300x300 px form photo for teacher registration & BCS application.',
    category: 'official',
    mode: 'target_size',
    targetMaxBytes: 100 * 1024,
    targetWidth: 300,
    targetHeight: 300,
    format: 'jpeg',
    qualityLevel: 'high',
    keepAspectRatio: true,
    smartSharpen: true,
    targetDpi: 300
  },

  // ── 2. ভর্তি ও রেজিস্ট্রেশন (Admission & Registration) ────────────────────
  {
    id: 'admission_uni',
    name: 'University Admission (300×300px)',
    nameBn: 'বিশ্ববিদ্যালয় ভর্তি আবেদন (৩০০×৩০০)',
    description: 'Standard DU, RU, GST university admission application photo (≤ 150 KB).',
    category: 'official',
    mode: 'target_size',
    targetMaxBytes: 150 * 1024,
    targetWidth: 300,
    targetHeight: 300,
    format: 'jpeg',
    qualityLevel: 'high',
    keepAspectRatio: true,
    smartSharpen: true,
    targetDpi: 300
  },
  {
    id: 'admission_med',
    name: 'Medical Admission Photo',
    nameBn: 'মেডিকেল ভর্তি পরীক্ষা (৩০০×৩০০ ≤১০০KB)',
    description: 'DGHS Medical and Dental admission circular requirement (300x300 px ≤ 100 KB).',
    category: 'official',
    mode: 'target_size',
    targetMaxBytes: 100 * 1024,
    targetWidth: 300,
    targetHeight: 300,
    format: 'jpeg',
    qualityLevel: 'high',
    keepAspectRatio: true,
    smartSharpen: true,
    targetDpi: 300
  },
  {
    id: 'admission_hsc',
    name: 'College XI Admission (120×150px)',
    nameBn: 'একাদশ শ্রেণি ভর্তি (১২০×১৫০ ≤৫০KB)',
    description: 'XI Class college admission online portal photo requirement (120x150 px ≤ 50 KB).',
    category: 'official',
    mode: 'target_size',
    targetMaxBytes: 50 * 1024,
    targetWidth: 120,
    targetHeight: 150,
    format: 'jpeg',
    qualityLevel: 'high',
    keepAspectRatio: true,
    smartSharpen: true,
    targetDpi: 300
  },

  // ── 3. সোশ্যাল মিডিয়া ও ই-কমার্স (Social Media & E-Commerce) ───────────────
  {
    id: 'fb_post_square',
    name: 'Facebook Square Post (1080×1080)',
    nameBn: 'ফেসবুক স্কয়ার পোস্ট (১০৮০×১০৮০)',
    description: 'High definition 1:1 square ratio for social media feeds & promotions.',
    category: 'web',
    mode: 'resize',
    targetWidth: 1080,
    targetHeight: 1080,
    format: 'jpeg',
    qualityLevel: 'high',
    keepAspectRatio: true,
    smartSharpen: true
  },
  {
    id: 'fb_cover',
    name: 'Facebook Page Cover (820×312)',
    nameBn: 'ফেসবুক পেজ কভার (৮২০×৩১২)',
    description: 'Optimized header banner dimensions for desktop and mobile displays.',
    category: 'web',
    mode: 'resize',
    targetWidth: 820,
    targetHeight: 312,
    format: 'jpeg',
    qualityLevel: 'high',
    keepAspectRatio: true,
    smartSharpen: true
  },
  {
    id: 'yt_thumbnail',
    name: 'YouTube Thumbnail HD (1280×720)',
    nameBn: 'ইউটিউব থাম্বনেইল (১২৮০×৭২০)',
    description: 'Crisp 16:9 widescreen HD thumbnail with enhanced color contrast.',
    category: 'web',
    mode: 'resize',
    targetWidth: 1280,
    targetHeight: 720,
    format: 'jpeg',
    qualityLevel: 'high',
    keepAspectRatio: true,
    smartSharpen: true
  },
  {
    id: 'ecommerce_product',
    name: 'E-Commerce Product (1000×1000 ≤500KB)',
    nameBn: 'ই-কমার্স প্রোডাক্ট ফটো (১০০০×১০০০)',
    description: 'Square product photography for Daraz, WooCommerce and online shops.',
    category: 'web',
    mode: 'target_size',
    targetMaxBytes: 500 * 1024,
    targetWidth: 1000,
    targetHeight: 1000,
    format: 'webp',
    qualityLevel: 'high',
    keepAspectRatio: true,
    smartSharpen: true
  },

  // ── 4. ফাইল সাইজ কম্প্রেশন ও ইমেইল (Target Size Compression & Email) ───────
  {
    id: 'strict_50kb',
    name: 'Strict Under 50 KB',
    nameBn: '৫০ KB সাইজ লিমিট (≤৫০KB)',
    description: 'Compress image strictly under 50 KB while preserving facial legibility.',
    category: 'general',
    mode: 'target_size',
    targetMaxBytes: 50 * 1024,
    format: 'jpeg',
    qualityLevel: 'balanced',
    keepAspectRatio: true,
    smartSharpen: true
  },
  {
    id: 'strict_100kb',
    name: 'Strict Under 100 KB',
    nameBn: '১০০ KB সাইজ লিমিট (≤১০০KB)',
    description: 'Compress image strictly under 100 KB for portals and web forms.',
    category: 'general',
    mode: 'target_size',
    targetMaxBytes: 100 * 1024,
    format: 'jpeg',
    qualityLevel: 'high',
    keepAspectRatio: true,
    smartSharpen: true
  },
  {
    id: 'strict_200kb',
    name: 'Strict Under 200 KB',
    nameBn: '২০০ KB সাইজ লিমিট (≤২০০KB)',
    description: 'Standard 200 KB ceiling for high clarity web document uploads.',
    category: 'general',
    mode: 'target_size',
    targetMaxBytes: 200 * 1024,
    format: 'jpeg',
    qualityLevel: 'high',
    keepAspectRatio: true,
    smartSharpen: true
  },
  {
    id: 'email_attachment',
    name: 'Email Attachment (≤1MB)',
    nameBn: 'ইমেইল এটাচমেন্ট (≤১MB)',
    description: 'Optimized for fast email sending under 1 MB file size boundary.',
    category: 'general',
    mode: 'target_size',
    targetMaxBytes: 1024 * 1024,
    format: 'jpeg',
    qualityLevel: 'high',
    keepAspectRatio: true,
    smartSharpen: true
  },
  {
    id: 'balanced',
    name: 'Balanced Smart (Recommended)',
    nameBn: 'ব্যালেন্সড স্মার্ট (সেরা পছন্দ)',
    description: 'High visual quality with significant size reduction (75-90% smaller).',
    category: 'general',
    mode: 'smart',
    format: 'auto',
    qualityLevel: 'balanced',
    keepAspectRatio: true,
    smartSharpen: true
  },
  {
    id: 'max_quality',
    name: 'Maximum Quality (Lossless)',
    nameBn: 'ম্যাক্সিমাম কোয়ালিটি (লসলেস)',
    description: 'Virtually lossless image fidelity with safe non-destructive compression.',
    category: 'general',
    mode: 'compress',
    format: 'auto',
    qualityLevel: 'maximum',
    keepAspectRatio: true,
    smartSharpen: false
  }
];
