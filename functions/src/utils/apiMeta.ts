import { VERSION, type ApiResponseMeta } from "@sleeved-potential/shared";

/**
 * Returns the server version metadata to include in API responses
 */
export function getResponseMeta(): ApiResponseMeta {
  return { serverVersion: VERSION };
}
