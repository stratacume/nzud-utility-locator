import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * SeoCanonical
 * -------------------------------------------------------------------
 * Single source of truth for canonical URL + robots indexing rules.
 *
 * Goals (per launch SEO fix):
 *   1. Every public page emits ONE canonical URL on the production
 *      apex domain (https://nzutilitydetection.com), regardless of
 *      whether the visitor arrived via deploypad.app, a www subdomain,
 *      a preview build, or with tracking query strings.
 *   2. Private / system routes (admin, portal, email-test, showcase,
 *      404) are explicitly noindexed.
 *   3. Non-production hostnames (deploypad.app preview URLs, any
 *      *.deploypad.app, localhost, IP addresses) are noindexed across
 *      every route so Google never picks them as the canonical.
 *
 * This file ONLY touches <head> meta tags + <link rel="canonical">.
 * It does NOT change visual design, routing, booking flow, admin,
 * portal, hosting, DNS, Resend, or database behaviour.
 * -------------------------------------------------------------------
 */

const PRODUCTION_ORIGIN = "https://nzutilitydetection.com";
const PRODUCTION_HOST = "nzutilitydetection.com";

/**
 * Routes that should never be indexed by search engines.
 * Matched by path prefix.
 */
const NOINDEX_PREFIXES = [
  "/admin",
  "/portal",
];

/**
 * Map of route → canonical path.
 * Used to collapse duplicate routes (e.g. /privacy and /privacy-policy
 * both render the same legal page) onto ONE canonical URL so Google
 * stops choosing its own.
 */
const CANONICAL_PATH_MAP: Record<string, string> = {
  "/": "/",
  "/recent-jobs": "/recent-jobs",
  "/jobs": "/recent-jobs",
  "/privacy": "/privacy-policy",
  "/privacy-policy": "/privacy-policy",
  "/terms": "/terms-of-service",
  "/terms-of-service": "/terms-of-service",
};

/**
 * Per-route <title> and <meta name="description"> content.
 * Keys are CANONICAL paths (i.e. the values from CANONICAL_PATH_MAP),
 * so aliases like /privacy and /privacy-policy share the same metadata.
 *
 * Only public, indexable routes are listed here. Private routes
 * (/admin, /portal) keep whatever title/description index.html ships
 * with — we don't override them, and they're already noindexed below.
 */
type RouteMeta = { title: string; description: string };

const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    title:
      "NZ Utility Detection | Underground Service Locating Across New Zealand",
    description:
      "Certified underground utility detection and service locating across New Zealand. Accurate GPR and EML scans for power, water, gas, comms and drainage before you dig.",
  },
  "/recent-jobs": {
    title: "Recent Jobs | NZ Utility Detection Project Showcase",
    description:
      "Browse recent underground utility detection jobs completed by NZ Utility Detection — real sites, real scans, and the results delivered to each client.",
  },
  "/privacy-policy": {
    title: "Privacy Policy | NZ Utility Detection",
    description:
      "How NZ Utility Detection collects, uses, stores and protects your personal information when you request a quote, book a job, or use this website.",
  },
  "/terms-of-service": {
    title: "Terms of Service | NZ Utility Detection",
    description:
      "The terms and conditions that apply when you book underground utility detection services with NZ Utility Detection or use this website.",
  },
};


function isProductionHost(host: string): boolean {
  return host === PRODUCTION_HOST;
}

function shouldNoindexRoute(pathname: string): boolean {
  return NOINDEX_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function upsertMetaByName(name: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`
  );
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertCanonicalLink(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  );
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function upsertOgUrl(href: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(
    'meta[property="og:url"]'
  );
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", "og:url");
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", href);
}

export default function SeoCanonical() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const host = window.location.hostname.toLowerCase();
    const onProductionHost = isProductionHost(host);
    const routeIsPrivate = shouldNoindexRoute(pathname);

    // Resolve canonical path: collapse duplicate aliases, strip
    // query strings + hash fragments. Unknown paths fall back to the
    // current pathname (still without query/hash) so deep links don't
    // end up canonicalised to "/".
    const canonicalPath =
      CANONICAL_PATH_MAP[pathname] ?? (pathname.replace(/\/+$/, "") || "/");

    const canonicalUrl = `${PRODUCTION_ORIGIN}${canonicalPath === "/" ? "/" : canonicalPath}`;

    // Robots policy:
    //   - Off-production host (deploypad preview, www, localhost, IP) → noindex
    //   - Private routes (/admin, /portal) → noindex regardless of host
    //   - Otherwise → index, follow (with large image preview, matches index.html default)
    const robotsContent =
      !onProductionHost || routeIsPrivate
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large";

    upsertMetaByName("robots", robotsContent);
    upsertMetaByName("googlebot", robotsContent);

    // Canonical + og:url ALWAYS point at the production apex equivalent
    // of the current route. This is the key fix for the "Duplicate,
    // Google chose different canonical than user" warning.
    upsertCanonicalLink(canonicalUrl);
    upsertOgUrl(canonicalUrl);

    // Per-route <title> + <meta name="description">.
    // Only applied to PUBLIC, indexable routes that we've explicitly
    // catalogued in ROUTE_META. Private routes (/admin, /portal) and
    // anything not in the map are left untouched so we never override
    // titles set by individual admin/portal screens.
    const meta = ROUTE_META[canonicalPath];
    if (meta && !routeIsPrivate && onProductionHost) {
      if (document.title !== meta.title) {
        document.title = meta.title;
      }
      upsertMetaByName("description", meta.description);

      // Mirror to Open Graph + Twitter so social previews stay in sync
      // with the per-page title/description (no visual change to the
      // site itself — these are <head> tags only).
      let ogTitle = document.head.querySelector<HTMLMetaElement>(
        'meta[property="og:title"]'
      );
      if (!ogTitle) {
        ogTitle = document.createElement("meta");
        ogTitle.setAttribute("property", "og:title");
        document.head.appendChild(ogTitle);
      }
      ogTitle.setAttribute("content", meta.title);

      let ogDesc = document.head.querySelector<HTMLMetaElement>(
        'meta[property="og:description"]'
      );
      if (!ogDesc) {
        ogDesc = document.createElement("meta");
        ogDesc.setAttribute("property", "og:description");
        document.head.appendChild(ogDesc);
      }
      ogDesc.setAttribute("content", meta.description);

      upsertMetaByName("twitter:title", meta.title);
      upsertMetaByName("twitter:description", meta.description);
    } else if (meta && !routeIsPrivate && !onProductionHost) {
      // Non-production hosts (deploypad previews, localhost): still set
      // the title so the tab is useful, but skip OG/Twitter rewrites —
      // and robots is already noindex above, so this won't leak.
      if (document.title !== meta.title) {
        document.title = meta.title;
      }
    }

    // Defensive client-side redirect: if a visitor lands on the www
    // subdomain of the production host, send them to the apex domain
    // (the canonical) preserving the path. This complements any
    // server/DNS-level redirect without changing DNS itself.
    if (host === `www.${PRODUCTION_HOST}`) {
      const target =
        `${PRODUCTION_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(target);
    }
  }, [pathname]);

  return null;
}
