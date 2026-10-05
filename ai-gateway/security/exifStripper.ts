/**
 * exifStripper.ts - Non-Destructive In-Memory EXIF & Metadata Scrubber
 * Removes sensitive metadata (GPS coordinates, camera serial, creator name)
 * before sending images to third-party cloud AI APIs.
 */

export class ExifMetadataStripper {
  /**
   * Strips EXIF/metadata from buffer based on file signature
   */
  public static strip(buffer: Buffer): Buffer {
    if (!buffer || buffer.length < 16) return buffer;

    // Detect JPEG (0xFF, 0xD8, 0xFF)
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return this.stripJpegExif(buffer);
    }

    // Detect PNG (89 50 4E 47 0D 0A 1A 0A)
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return this.stripPngMetadata(buffer);
    }

    // Other formats returned as-is
    return buffer;
  }

  /**
   * Scans JPEG segments and strips APP1 (0xFFE1, EXIF/XMP) and APP2 (0xFFE2) markers
   */
  private static stripJpegExif(buffer: Buffer): Buffer {
    try {
      const chunks: Buffer[] = [];
      chunks.push(buffer.subarray(0, 2)); // SOI marker (0xFF, 0xD8)

      let offset = 2;
      while (offset < buffer.length - 1) {
        if (buffer[offset] !== 0xff) {
          // If we reached compressed scan data (SOS has been encountered), copy rest
          chunks.push(buffer.subarray(offset));
          break;
        }

        const marker = buffer[offset + 1];

        // End of image (EOI) or standalone marker with no length
        if (marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
          chunks.push(buffer.subarray(offset, offset + 2));
          offset += 2;
          continue;
        }

        // Start of Scan (SOS - 0xDA): all following bytes up to EOI are entropy-coded image data
        if (marker === 0xda) {
          chunks.push(buffer.subarray(offset));
          break;
        }

        if (offset + 4 > buffer.length) break;
        const length = buffer.readUInt16BE(offset + 2);
        const segmentEnd = offset + 2 + length;

        if (segmentEnd > buffer.length) {
          chunks.push(buffer.subarray(offset));
          break;
        }

        // Omit APP1 (EXIF 0xE1), APP2 (FlashPix 0xE2), APP13 (Photoshop 0xED), COM (Comment 0xFE)
        const isMetadata = marker === 0xe1 || marker === 0xe2 || marker === 0xed || marker === 0xfe;
        if (!isMetadata) {
          chunks.push(buffer.subarray(offset, segmentEnd));
        }

        offset = segmentEnd;
      }

      return Buffer.concat(chunks);
    } catch {
      // Fallback: return original buffer safely if parser encounters non-standard byte stream
      return buffer;
    }
  }

  /**
   * Strips non-critical PNG text & EXIF chunks (eXIf, tEXt, zTXt, iTXt)
   */
  private static stripPngMetadata(buffer: Buffer): Buffer {
    try {
      const chunks: Buffer[] = [];
      // 8-byte PNG signature
      chunks.push(buffer.subarray(0, 8));

      let offset = 8;
      const strippedTypes = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

      while (offset + 8 <= buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
        const totalChunkLength = 12 + length; // 4 len + 4 type + data + 4 crc

        if (offset + totalChunkLength > buffer.length) {
          chunks.push(buffer.subarray(offset));
          break;
        }

        if (!strippedTypes.has(chunkType)) {
          chunks.push(buffer.subarray(offset, offset + totalChunkLength));
        }

        if (chunkType === 'IEND') break;
        offset += totalChunkLength;
      }

      return Buffer.concat(chunks);
    } catch {
      return buffer;
    }
  }
}
