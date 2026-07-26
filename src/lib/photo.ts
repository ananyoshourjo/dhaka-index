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
