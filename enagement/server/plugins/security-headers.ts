import { definePlugin } from "nitro";
import { applySecurityHeaders } from "@shared/server/middleware/security";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("response", (response) => {
    if (response?.headers) applySecurityHeaders(response.headers);
  });
  nitroApp.hooks.hook("beforeResponse", (_event, response) => {
    if (response?.headers) applySecurityHeaders(response.headers);
  });
  nitroApp.hooks.hook("render:response", (_id, response) => {
    if (response?.headers) applySecurityHeaders(response.headers);
  });
});
