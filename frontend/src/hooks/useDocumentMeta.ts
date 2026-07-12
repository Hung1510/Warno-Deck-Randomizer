import { useEffect } from 'react';

interface MetaOptions {
  title: string;
  description: string;
  canonicalPath: string; // e.g. "/division/us-3ad" or "/"
}

const SITE_ORIGIN = 'https://warno-deck-randomizer.vercel.app';

function setMetaTag(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

// Sets document.title + description + canonical + OG/Twitter tags on mount, and
// restores the site-wide defaults on unmount so navigating back to "/" (or any
// route without its own useDocumentMeta call) doesn't keep a stale page's tags.
// Client-side only: this does NOT change what a non-JS crawler sees in the
// initial HTML response (Vercel still serves the same static index.html for
// every route). Googlebot's renderer executes this and will see the distinct
// tags; other crawlers won't. Real per-URL static output would need a
// prerender/SSG build step, which this does not attempt.
export function useDocumentMeta({ title, description, canonicalPath }: MetaOptions): void {
  useEffect(() => {
    const prevTitle = document.title;
    const url = `${SITE_ORIGIN}${canonicalPath}`;

    document.title = title;
    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', url);
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    const prevCanonical = canonical.getAttribute('href') || `${SITE_ORIGIN}/`;
    canonical.setAttribute('href', url);

    return () => {
      document.title = prevTitle;
      canonical!.setAttribute('href', prevCanonical);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, canonicalPath]);
}