import path from "node:path";
import type { Plugin } from "vite";

/** Engagement UI uses `@/`; Nitro API bundle pulls parent `../src` which also uses `@/`. */
export function matchmindAliasPlugin(engagementSrc: string, sharedSrc: string): Plugin {
  return {
    name: "matchmind-env-alias",
    enforce: "pre",
    configEnvironment(name, config) {
      if (name !== "nitro") return;
      config.resolve ??= {};
      const alias = config.resolve.alias ?? {};
      const next =
        Array.isArray(alias) ? [...alias] : typeof alias === "object" ? { ...alias } : {};
      if (!Array.isArray(next)) {
        next["@"] = sharedSrc;
        next["@shared"] = sharedSrc;
      }
      config.resolve.alias = next;
    },
    resolveId(source, importer) {
      if (source.startsWith("@shared/")) {
        const resolved = path.join(sharedSrc, source.slice("@shared/".length));
        return this.resolve(resolved, undefined, { skipSelf: true }).then((r) => r?.id ?? resolved);
      }
      if (!source.startsWith("@/")) return null;

      const rel = source.slice(2);
      const envName = (this as { environment?: { name?: string } }).environment?.name;
      const importerNorm = importer?.replace(/\\/g, "/") ?? "";
      const fromSharedServer =
        envName === "nitro" ||
        importerNorm.includes("/server/api/") ||
        importerNorm.includes("/src/server/") ||
        importerNorm.includes("/superform/src/server/");

      const root = fromSharedServer ? sharedSrc : engagementSrc;
      const resolved = path.join(root, rel);
      return this.resolve(resolved, undefined, { skipSelf: true }).then((r) => r?.id ?? resolved);
    },
  };
}
