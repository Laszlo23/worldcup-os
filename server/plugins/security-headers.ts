import { definePlugin } from "nitro";
import { applySecurityHeaders } from "@/server/middleware/security";

function applyDocumentCacheHeaders(headers: Headers): void {
  const contentType = headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    headers.set("Cache-Control", "no-store, must-revalidate");
  }
}

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("response", (response) => {
    if (response?.headers) {
      applySecurityHeaders(response.headers);
      applyDocumentCacheHeaders(response.headers);
    }
  });
  nitroApp.hooks.hook("beforeResponse", (event, response) => {
    if (response?.headers) {
      applySecurityHeaders(response.headers);
      applyDocumentCacheHeaders(response.headers);
    }
  });
  nitroApp.hooks.hook("render:response", (_id, response) => {
    if (response?.headers) {
      applySecurityHeaders(response.headers);
      applyDocumentCacheHeaders(response.headers);
    }
  });
});
