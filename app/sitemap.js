import { categories, localities } from "../lib/catalog.js";
import { siteOrigin } from "../lib/seo.js";

export default function sitemap() {
  const origin = siteOrigin();
  const paths = [
    "",
    "/services",
    ...categories.map((category) => `/services/${category}`),
    ...categories.flatMap((category) =>
      localities.map((locality) => `/services/${category}/${locality}`),
    ),
  ];
  return ["en", "hi"].flatMap((locale) =>
    paths.map((path) => ({
      url: `${origin}/${locale}${path}`,
      changeFrequency: path ? "weekly" : "daily",
      priority: path ? 0.7 : 1,
      alternates: {
        languages: { en: `${origin}/en${path}`, hi: `${origin}/hi${path}` },
      },
    })),
  );
}
