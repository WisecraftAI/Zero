import { useEffect } from 'react';
import { pathForRoute } from '../lib/routes';
import {
  SEO_IMAGE_PATH,
  SEO_IMAGE_SIZE,
  SITE_NAME,
  resolvePublicOrigin,
  seoForRoute,
} from '../lib/seo';

const PUBLIC_ORIGIN = resolvePublicOrigin(import.meta.env.VITE_PUBLIC_SITE_URL);
const ALLOW_INDEXING = /^(1|true|yes|on)$/i.test(
  String(import.meta.env.VITE_SEO_INDEX ?? '').trim()
);

function upsertMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonical(href) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export default function PageMetadata({ route }) {
  useEffect(() => {
    const metadata = seoForRoute(route, ALLOW_INDEXING);
    const routePath = pathForRoute(route.view, route.runId, route.tab);
    const canonicalUrl = PUBLIC_ORIGIN
      ? new URL(routePath, PUBLIC_ORIGIN).href
      : '';
    const imageUrl = PUBLIC_ORIGIN
      ? new URL(SEO_IMAGE_PATH, PUBLIC_ORIGIN).href
      : '';

    document.title = metadata.title;
    upsertMeta('name', 'description', metadata.description);
    upsertMeta('name', 'robots', metadata.robots);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:title', metadata.title);
    upsertMeta('property', 'og:description', metadata.description);
    upsertMeta('property', 'og:locale', 'en');
    upsertMeta('name', 'twitter:card', 'summary');
    upsertMeta('name', 'twitter:title', metadata.title);
    upsertMeta('name', 'twitter:description', metadata.description);
    upsertCanonical(canonicalUrl);

    if (canonicalUrl) {
      upsertMeta('property', 'og:url', canonicalUrl);
      upsertMeta('property', 'og:image', imageUrl);
      upsertMeta('property', 'og:image:width', String(SEO_IMAGE_SIZE));
      upsertMeta('property', 'og:image:height', String(SEO_IMAGE_SIZE));
      upsertMeta('property', 'og:image:alt', `${SITE_NAME} logo`);
      upsertMeta('name', 'twitter:image', imageUrl);
    }
  }, [route]);

  return null;
}
