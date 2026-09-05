/**
 * MetadataProcessor.ts - EXIF & DPI Metadata Injection and Stripping Engine
 * Injects JFIF DPI headers into JPEG blobs and pHYs chunks into PNG blobs.
 */

export class MetadataProcessor {
  /**
   * Inject requested DPI metadata into a JPEG or PNG Blob
   */
  public static async injectDpiMetadata(
    blob: Blob,
    format: string,
    dpi: number = 300
  ): Promise<Blob> {
    if (dpi <= 0 || (format !== 'jpeg' && format !== 'png')) {
      return blob;
    }

    try {
      const buffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      if (format === 'jpeg') {
        const withJfif = this.injectJpegJfifDpi(uint8, dpi);
        return new Blob([withJfif.buffer as unknown as BlobPart], { type: 'image/jpeg' });
      } else if (format === 'png') {
        const withPhys = this.injectPngPhysDpi(uint8, dpi);
        return new Blob([withPhys.buffer as unknown as BlobPart], { type: 'image/png' });
      }
    } catch {
      // If injection encounters an anomaly, return original blob safely
      return blob;
    }

    return blob;
  }

  /**
   * Injects or overwrites standard JFIF APP0 (0xFF 0xE0) segment in JPEG with target DPI
   */
  private static injectJpegJfifDpi(bytes: Uint8Array, dpi: number): Uint8Array {
    // Standard JFIF 18-byte APP0 marker segment
    // [0xFF, 0xE0, lengthHi, lengthLo, 'J', 'F', 'I', 'F', 0, majorVer, minorVer, unit, xHi, xLo, yHi, yLo, thumbW, thumbH]
    const jfifSegment = new Uint8Array([
      0xff, 0xe0,
      0x00, 0x10, // Length = 16 bytes
      0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
      0x01, 0x02, // Version 1.2
      0x01,       // Density unit: 1 = dots per inch (DPI)
      (dpi >> 8) & 0xff, dpi & 0xff, // X density
      (dpi >> 8) & 0xff, dpi & 0xff, // Y density
      0x00, 0x00  // No thumbnail
    ]);

    // Check if JPEG starts with SOI 0xFF 0xD8
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      return bytes;
    }

    // Check if an existing APP0 JFIF segment is at index 2
    if (bytes[2] === 0xff && bytes[3] === 0xe0) {
      const app0Length = (bytes[4] << 8) | bytes[5];
      // In standard JPEG, app0Length is the length of the APP0 payload including length bytes (2)
      // So the entire APP0 segment is 2 (marker) + app0Length bytes.
      const remaining = bytes.slice(2 + app0Length);
      const out = new Uint8Array(2 + jfifSegment.length + remaining.length);
      out[0] = 0xff;
      out[1] = 0xd8;
      out.set(jfifSegment, 2);
      out.set(remaining, 2 + jfifSegment.length);
      return out;
    } else {
      // Insert APP0 right after SOI (index 2)
      const remaining = bytes.slice(2);
      const out = new Uint8Array(2 + jfifSegment.length + remaining.length);
      out[0] = 0xff;
      out[1] = 0xd8;
      out.set(jfifSegment, 2);
      out.set(remaining, 2 + jfifSegment.length);
      return out;
    }
  }

  /**
   * Injects pHYs chunk into PNG byte array for physical print DPI
   */
  private static injectPngPhysDpi(bytes: Uint8Array, dpi: number): Uint8Array {
    // 1 meter = 39.3700787 inches
    const pixelsPerMeter = Math.round(dpi / 0.0254);

    // PNG pHYs chunk data: 9 bytes
    // 4 bytes: X pixels per unit
    // 4 bytes: Y pixels per unit
    // 1 byte:  Unit specifier (1 = meter)
    const chunkData = new Uint8Array(9);
    chunkData[0] = (pixelsPerMeter >> 24) & 0xff;
    chunkData[1] = (pixelsPerMeter >> 16) & 0xff;
    chunkData[2] = (pixelsPerMeter >> 8) & 0xff;
    chunkData[3] = pixelsPerMeter & 0xff;

    chunkData[4] = (pixelsPerMeter >> 24) & 0xff;
    chunkData[5] = (pixelsPerMeter >> 16) & 0xff;
    chunkData[6] = (pixelsPerMeter >> 8) & 0xff;
    chunkData[7] = pixelsPerMeter & 0xff;
    chunkData[8] = 0x01; // Unit = meter

    // Compute CRC-32 for chunk
    const chunkType = [0x70, 0x48, 0x59, 0x73]; // "pHYs"
    const crc = this.computePngCrc(new Uint8Array([...chunkType, ...chunkData]));

    const fullChunk = new Uint8Array(12 + 9);
    // Length (9)
    fullChunk[0] = 0x00; fullChunk[1] = 0x00; fullChunk[2] = 0x00; fullChunk[3] = 0x09;
    fullChunk.set(chunkType, 4);
    fullChunk.set(chunkData, 8);
    // CRC
    fullChunk[17] = (crc >> 24) & 0xff;
    fullChunk[18] = (crc >> 16) & 0xff;
    fullChunk[19] = (crc >> 8) & 0xff;
    fullChunk[20] = crc & 0xff;

    // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (bytes[0] !== 0x89 || bytes[1] !== 0x50) {
      return bytes;
    }

    // Insert pHYs right after IHDR chunk (IHDR length is at bytes[8..11], typically 13 + 12 = 25 bytes)
    const ihdrLength = (bytes[8] << 24) | (bytes[9] << 16) | (bytes[10] << 8) | bytes[11];
    const insertPos = 8 + 4 + 4 + ihdrLength + 4; // Signature (8) + IHDR length (4) + Type (4) + Data + CRC (4)

    const out = new Uint8Array(bytes.length + fullChunk.length);
    out.set(bytes.slice(0, insertPos), 0);
    out.set(fullChunk, insertPos);
    out.set(bytes.slice(insertPos), insertPos + fullChunk.length);

    return out;
  }

  /**
   * Fast PNG CRC32 table calculation
   */
  private static computePngCrc(buf: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        if ((crc ^ byte) & 1) {
          crc = (crc >>> 1) ^ 0xedb88320;
        } else {
          crc = crc >>> 1;
        }
        byte = byte >>> 1;
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
}
