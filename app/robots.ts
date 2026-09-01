import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/panel",
          "/login",
          "/logout",
          "/crear-contrasena",
          "/api",
          "/oauth",
          "/mcp",
          "/.well-known"
        ]
      }
    ],
    sitemap: [absoluteUrl("/sitemap.xml"), absoluteUrl("/news-sitemap.xml")],
    host: siteUrl.origin
  };
}
