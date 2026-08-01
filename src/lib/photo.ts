const MAX_PHOTO_DATA_URL_LENGTH = 1_500_000;
const LOCAL_PHOTO_PATTERN =
  /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\r\n]+$/i;

export function sanitizeLocalPhoto(value: string) {
  if (
    value.length <= MAX_PHOTO_DATA_URL_LENGTH &&
    LOCAL_PHOTO_PATTERN.test(value)
  ) {
    return value;
  }

  return "";
}

export function decodeLocalPhoto(value: string) {
  const sanitized = sanitizeLocalPhoto(value);

  if (!sanitized) {
    return null;
  }

  const separator = sanitized.indexOf(",");
  const contentType = sanitized.slice(5, sanitized.indexOf(";"));

  return {
    bytes: Uint8Array.from(Buffer.from(sanitized.slice(separator + 1), "base64"))
      .buffer,
    contentType,
  };
}

export function getWebpDimensions(bytes: Uint8Array) {
  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + length));

  if (
    bytes.length < 30 ||
    ascii(0, 4) !== "RIFF" ||
    ascii(8, 4) !== "WEBP"
  ) {
    return null;
  }

  const chunk = ascii(12, 4);

  if (chunk === "VP8X" && bytes.length >= 30) {
    return {
      width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
      height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
    };
  }

  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    return {
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height:
        1 +
        (bytes[22] >> 6) +
        (bytes[23] << 2) +
        ((bytes[24] & 0x0f) << 10),
    };
  }

  if (
    chunk === "VP8 " &&
    bytes.length >= 30 &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  ) {
    return {
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff,
    };
  }

  return null;
}
