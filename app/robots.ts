import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/administration/",
        "/api/",
        "/auth/",
        "/messages/",
        "/organisateur/",
        "/profil/",
      ],
    },
    sitemap: "https://www.nito-nature.fr/sitemap.xml",
    host: "https://www.nito-nature.fr",
  };
}
