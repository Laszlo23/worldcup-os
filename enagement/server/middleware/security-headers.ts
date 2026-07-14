import { defineMiddleware } from "nitro";
import { applySecurityHeaders } from "@shared/server/middleware/security";

export default defineMiddleware((event) => {
  const original = event.res.headers;
  if (original) applySecurityHeaders(original);
});
