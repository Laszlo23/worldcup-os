import type { MetadataRoute } from "next";

const SITE = "https://agentx.buildingcultureid.space";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/matches", "/signals", "/arena", "/portfolio", "/chat", "/more"];
  return routes.map((path) => ({
    url: `${SITE}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "hourly" : "daily",
    priority: path === "" ? 1 : 0.7,
  }));
}
