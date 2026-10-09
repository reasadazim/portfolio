import { seo } from "../src/data/seo.js";

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );

export function seoPlugin() {
  const canonical = new URL(seo.url).href;
  const image = new URL(seo.image, canonical).href;
  const meta = (attribute, key, value) => ({
    tag: "meta",
    attrs: { [attribute]: key, content: String(value) },
    injectTo: "head",
  });

  return {
    name: "portfolio-seo",
    transformIndexHtml() {
      const tags = [
        { tag: "title", children: escapeHtml(seo.title), injectTo: "head" },
        meta("name", "description", seo.description),
        meta("name", "author", seo.name),
        meta("name", "robots", "index, follow, max-image-preview:large"),
        meta("name", "theme-color", seo.themeColor),
        {
          tag: "link",
          attrs: { rel: "canonical", href: canonical },
          injectTo: "head",
        },
        meta("property", "og:type", "website"),
        meta("property", "og:site_name", seo.name),
        meta("property", "og:title", seo.title),
        meta("property", "og:description", seo.description),
        meta("property", "og:url", canonical),
        meta("property", "og:locale", seo.locale),
        meta("property", "og:image", image),
        meta("property", "og:image:type", seo.imageType),
        meta("property", "og:image:width", seo.imageWidth),
        meta("property", "og:image:height", seo.imageHeight),
        meta("property", "og:image:alt", seo.imageAlt),
        meta("name", "twitter:card", "summary_large_image"),
        meta("name", "twitter:title", seo.title),
        meta("name", "twitter:description", seo.description),
        meta("name", "twitter:image", image),
        meta("name", "twitter:image:alt", seo.imageAlt),
        {
          tag: "script",
          attrs: { type: "application/ld+json" },
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                "@id": `${canonical}#website`,
                url: canonical,
                name: seo.name,
                description: seo.description,
                inLanguage: seo.language,
                author: { "@id": `${canonical}#person` },
              },
              {
                "@type": "Person",
                "@id": `${canonical}#person`,
                name: seo.name,
                url: canonical,
                image,
                email: seo.email,
                jobTitle: seo.jobTitle,
                sameAs: seo.profiles,
              },
            ],
          }).replace(/</g, "\\u003c"),
          injectTo: "head",
        },
      ];
      if (seo.googleSiteVerification) {
        tags.push(
          meta("name", "google-site-verification", seo.googleSiteVerification),
        );
      }
      return tags;
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: `User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap.xml", canonical).href}\n`,
      });
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${escapeHtml(canonical)}</loc></url>\n</urlset>\n`,
      });
    },
  };
}
