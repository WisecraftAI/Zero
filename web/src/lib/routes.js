export const DEFAULT_VIEW = 'dashboard';

/* view id → path. Order matters: `/runs/new` must win over `/runs/:runId`. */
const STATIC_ROUTES = [
  ['home', '/'],
  ['home', '/home'],
  ['dashboard', '/dashboard'],
  ['runs', '/runs'],
  ['new-run', '/runs/new'],
  ['locators', '/locators'],
  ['apikeys', '/api-keys'],
  ['agents', '/agents'],
  ['integrations', '/integrations'],
];

/* run-detail tab id → URL slug, so a tab is linkable and survives reload. */
const RUN_TAB_SLUGS = [
  ['webAnalysis', 'web-analysis'],
  ['requirements', 'requirements'],
  ['manual', 'manual-tc'],
  ['automation', 'automation'],
  ['execution', 'execution'],
  ['accessibility', 'accessibility'],
  ['performance', 'performance'],
  ['security', 'security'],
  ['manager', 'manager-report'],
  ['recording', 'recording'],
  ['element-log', 'element-log'],
  ['flow', 'flow-diagram'],
];

export function slugForRunTab(tab) {
  const match = RUN_TAB_SLUGS.find(([id]) => id === tab);
  return match ? match[1] : null;
}

export function runTabForSlug(slug) {
  const match = RUN_TAB_SLUGS.find(([, routeSlug]) => routeSlug === slug);
  return match ? match[0] : null;
}

export function pathForRoute(view, runId = null, tab = null) {
  if (view === 'run-detail') {
    if (!runId) return '/runs';
    const slug = slugForRunTab(tab);
    const base = `/runs/${encodeURIComponent(runId)}`;
    return slug ? `${base}/${slug}` : base;
  }
  const match = STATIC_ROUTES.find(([id]) => id === view);
  return match ? match[1] : '/';
}

export function routeForPath(pathname) {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/';
  const staticMatch = STATIC_ROUTES.find(([, routePath]) => routePath === clean);
  if (staticMatch) return { view: staticMatch[0], runId: null, tab: null };

  const runMatch = clean.match(/^\/runs\/([^/]+)(?:\/([^/]+))?$/);
  if (runMatch) {
    return {
      view: 'run-detail',
      runId: decodeURIComponent(runMatch[1]),
      tab: runMatch[2] ? runTabForSlug(runMatch[2]) : null
    };
  }

  return { view: DEFAULT_VIEW, runId: null, tab: null };
}

export function currentRoute() {
  return routeForPath(typeof window === 'undefined' ? '/' : window.location.pathname);
}
