/**
 * fileValidator.ts - Multi-Layer Magic Bytes & Signature File Security Validator
 */

import { SupportedImageFormat } from '../types/capabilities';
import { AIErrorCode, AIGatewayError } from '../types/errors';

export interface FileValidationResult {
  valid: boolean;
  detectedFormat: SupportedImageFormat | null;
  mimeType: string;
  sizeBytes: number;
}

export class FileSecurityValidator {
  /**
   * Magic bytes signatures for supported document/image formats
   */
  private static readonly SIGNATURES: {
    format: SupportedImageFormat;
    mime: string;
    check: (buf: Buffer) => boolean;
  }[] = [
    {
      format: 'png',
      mime: 'image/png',
      check: (b) =>
        b.length >= 8 &&
        b[0] === 0x89 &&
        b[1] === 0x50 &&
        b[2] === 0x4e &&
        b[3] === 0x47 &&
        b[4] === 0x0d &&
        b[5] === 0x0a &&
        b[6] === 0x1a &&
        b[7] === 0x0a,
    },
    {
      format: 'jpeg',
      mime: 'image/jpeg',
      check: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    },
    {
      format: 'webp',
      mime: 'image/webp',
      check: (b) =>
        b.length >= 12 &&
        b[0] === 0x52 &&
        b[1] === 0x49 &&
        b[2] === 0x46 &&
        b[3] === 0x46 &&
        b[8] === 0x57 &&
        b[9] === 0x45 &&
        b[10] === 0x42 &&
        b[11] === 0x50,
    },
    {
      format: 'bmp',
      mime: 'image/bmp',
      check: (b) => b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d,
    },
    {
      format: 'tiff',
      mime: 'image/tiff',
      check: (b) =>
        b.length >= 4 &&
        ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) ||
          (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a)),
    },
    {
      format: 'pdf',
      mime: 'application/pdf',
      check: (b) =>
        b.length >= 4 &&
        b[0] === 0x25 &&
        b[1] === 0x50 &&
        b[2] === 0x44 &&
        b[3] === 0x46, // %PDF
    },
  ];

  /**
   * Validates file buffer integrity, magic bytes, and size restrictions
   */
  public static validate(
    buffer: Buffer,
    allowedFormats: SupportedImageFormat[],
    maxSizeBytes: number
  ): FileValidationResult {
    if (!buffer || buffer.length === 0) {
      throw new AIGatewayError('Empty or invalid file buffer provided.', AIErrorCode.INVALID_FILE);
    }

    if (buffer.length > maxSizeBytes) {
      const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
      throw new AIGatewayError(
        `File size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of ${maxMb}MB.`,
        AIErrorCode.FILE_TOO_LARGE
      );
    }

    // Minimum buffer size check to prevent corrupt truncated files
    if (buffer.length < 16) {
      throw new AIGatewayError('File is too small or corrupt.', AIErrorCode.INVALID_FILE);
    }

    // Detect format via magic bytes
    let matchedSig = null;
    for (const sig of this.SIGNATURES) {
      if (sig.check(buffer)) {
        matchedSig = sig;
        break;
      }
    }

    if (!matchedSig) {
      throw new AIGatewayError(
        'Unsupported or unrecognized file format. Magic bytes verification failed.',
        AIErrorCode.UNSUPPORTED_FORMAT
      );
    }

    // Check if detected format is within provider's allowed formats
    const normalizedDetected = matchedSig.format === 'jpeg' ? 'jpg' : matchedSig.format;
    const isAllowed = allowedFormats.some((fmt) => {
      const normalizedAllowed = fmt === 'jpeg' ? 'jpg' : fmt;
      return normalizedAllowed === normalizedDetected || (fmt === 'jpg' && matchedSig?.format === 'jpeg');
    });

    if (!isAllowed) {
      throw new AIGatewayError(
        `File format '${matchedSig.format.toUpperCase()}' is not supported by this operation (Allowed: ${allowedFormats.join(', ')}).`,
        AIErrorCode.UNSUPPORTED_FORMAT
      );
    }

    return {
      valid: true,
      detectedFormat: matchedSig.format,
      mimeType: matchedSig.mime,
      sizeBytes: buffer.length,
    };
  }
}
