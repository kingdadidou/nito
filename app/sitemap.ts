import type { MetadataRoute } from "next";

const baseUrl = "https://www.nito-nature.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "",
    "/explorer",
    "/a-propos",
    "/aide",
    "/contact",
    "/mentions-legales",
    "/conditions",
    "/confidentialite",
    "/cookies",
    "/annulations",
    "/transparence",
    "/signalement-litiges",
    "/securite-sportive",
  ];

  return pages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" || path === "/explorer" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/explorer" ? 0.9 : 0.5,
  }));
}
