'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const VITE = path.join(ROOT, 'node_modules', '.bin', 'vite');

// `--outDir` is resolved against the Vite root (web/), so the scratch build
// lands beside dist/web without clobbering the operator's real bundle.
const OUT_REL = '../dist/.seo-test';
const OUT_ABS = path.join(ROOT, 'dist', '.seo-test');

/** Build the SPA with the given SEO env and read back what shipped. */
function build(env) {
  execFileSync(VITE, ['build', '--outDir', OUT_REL, '--emptyOutDir', '--logLevel', 'error'], {
    cwd: WEB,
    env: { ...process.env, VITE_PUBLIC_SITE_URL: '', VITE_SEO_INDEX: '', ...env },
    stdio: 'pipe',
  });
  const read = (name) => {
    const file = path.join(OUT_ABS, name);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  };
  return { html: read('index.html'), robots: read('robots.txt'), sitemap: read('sitemap.xml') };
}

function routeMetadata() {
  const moduleUrl = pathToFileURL(path.join(WEB, 'src', 'lib', 'seo.js')).href;
  const script = `
    import { seoForRoute } from ${JSON.stringify(moduleUrl)};
    const views = ['home', 'dashboard', 'runs', 'new-run', 'locators', 'apikeys', 'agents', 'integrations'];
    const tabs = ['webAnalysis', 'requirements', 'manual', 'automation', 'execution', 'accessibility', 'performance', 'security', 'manager', 'recording', 'element-log', 'flow'];
    console.log(JSON.stringify({
      pages: views.map((view) => ({ view, ...seoForRoute({ view }, true) })),
      tabs: tabs.map((tab) => ({ tab, ...seoForRoute({ view: 'run-detail', tab }, true) })),
    }));
  `;
  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
      encoding: 'utf8',
    })
  );
}

describe('SPA SEO metadata', () => {
  afterAll(() => {
    fs.rmSync(OUT_ABS, { recursive: true, force: true });
  });

  describe('with no public domain configured (the default)', () => {
    let out;
    beforeAll(() => {
      out = build({});
    });

    it('still ships a description and social card titles', () => {
      expect(out.html).toMatch(/<meta name="description" content="Turn any public URL/);
      expect(out.html).toMatch(/<meta property="og:title" content="ZER0 · AI QA Orchestration">/);
      expect(out.html).toMatch(/<meta name="twitter:card" content="summary">/);
    });

    it('keeps the operator console out of search results', () => {
      expect(out.html).toMatch(/<meta name="robots" content="noindex, nofollow">/);
      expect(out.robots).toMatch(/^User-agent: \*\nDisallow: \/$/m);
    });

    it('omits tags that crawlers only honour as absolute URLs', () => {
      expect(out.html).not.toMatch(/rel="canonical"/);
      expect(out.html).not.toMatch(/og:url|og:image|twitter:image/);
      expect(out.html).not.toMatch(/application\/ld\+json/);
      expect(out.sitemap).toBeNull();
    });
  });

  describe('with a domain configured and indexing enabled', () => {
    let out;
    beforeAll(() => {
      // A bare host is accepted and normalised to https.
      out = build({ VITE_PUBLIC_SITE_URL: 'zer0.io', VITE_SEO_INDEX: 'true' });
    });

    it('points canonical and the social card at that origin', () => {
      expect(out.html).toMatch(/<link rel="canonical" href="https:\/\/zer0\.io\/">/);
      expect(out.html).toMatch(/<meta property="og:url" content="https:\/\/zer0\.io\/">/);
      expect(out.html).toMatch(/<meta property="og:image" content="https:\/\/zer0\.io\/zero-icon\.png">/);
    });

    it('declares image dimensions large enough for social scrapers', () => {
      const width = out.html.match(/<meta property="og:image:width" content="(\d+)">/);
      const height = out.html.match(/<meta property="og:image:height" content="(\d+)">/);
      expect(width).not.toBeNull();
      expect(height).not.toBeNull();
      // Facebook and LinkedIn drop images below 200x200.
      expect(Number(width[1])).toBeGreaterThanOrEqual(200);
      expect(Number(height[1])).toBeGreaterThanOrEqual(200);
    });

    it('ships valid structured data for the landing page', () => {
      const block = out.html.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
      );
      expect(block).not.toBeNull();
      // No raw "<" may survive, or the script tag could be closed early.
      expect(block[1]).not.toMatch(/</);
      const data = JSON.parse(block[1].replace(/\\u003c/g, '<'));
      expect(data['@type']).toBe('SoftwareApplication');
      expect(data.url).toBe('https://zer0.io/');
      expect(data.image).toBe('https://zer0.io/zero-icon.png');
    });

    it('opens indexing but keeps tenant run data out of the crawl', () => {
      expect(out.html).toMatch(/<meta name="robots" content="index, follow">/);
      expect(out.robots).toMatch(/Disallow: \/dashboard/);
      expect(out.robots).toMatch(/Disallow: \/runs/);
      expect(out.robots).toMatch(/Disallow: \/api-keys/);
      expect(out.robots).toMatch(/Disallow: \/agents/);
      expect(out.robots).toMatch(/Sitemap: https:\/\/zer0\.io\/sitemap\.xml/);
    });

    it('leaves /home to the redirect instead of blocking the crawler', () => {
      expect(out.robots).not.toMatch(/Disallow: \/home/);
    });

    it('emits the sitemap the robots file advertises', () => {
      expect(out.sitemap).toMatch(/<loc>https:\/\/zer0\.io\/<\/loc>/);
    });
  });

  it('fails the build on a malformed domain rather than shipping a wrong canonical', () => {
    expect(() => build({ VITE_PUBLIC_SITE_URL: 'zer0' })).toThrow(/invalid hostname/);
    expect(() => build({ VITE_PUBLIC_SITE_URL: 'ftp://zer0.io' })).toThrow(/must be http or https/);
  });

  it('gives every SPA page a distinct title and explanation', () => {
    const { pages } = routeMetadata();
    expect(pages).toHaveLength(8);
    expect(new Set(pages.map(({ title }) => title)).size).toBe(pages.length);
    for (const page of pages) {
      expect(page.description.length).toBeGreaterThan(70);
    }
    expect(pages.find(({ view }) => view === 'home').robots).toBe('index, follow');
    expect(
      pages.filter(({ view }) => view !== 'home').every(({ robots }) => robots === 'noindex, nofollow')
    ).toBe(true);
  });

  it('explains every run-detail tab while keeping run data private', () => {
    const { tabs } = routeMetadata();
    expect(tabs).toHaveLength(12);
    expect(new Set(tabs.map(({ title }) => title)).size).toBe(tabs.length);
    for (const tab of tabs) {
      expect(tab.description.length).toBeGreaterThan(60);
      expect(tab.robots).toBe('noindex, nofollow');
    }
  });

  it('serves deep SPA routes with a noindex header and redirects the duplicate root', () => {
    const conf = fs.readFileSync(path.join(WEB, 'nginx.conf'), 'utf8');
    // The shell carries landing-page metadata, so deep routes need a header
    // that does not depend on the crawler running JavaScript.
    expect(conf).toMatch(/location @spa \{[\s\S]*?X-Robots-Tag "noindex, nofollow"/);
    // "/" must stay indexable, so the header cannot live on the parent location.
    expect(conf).toMatch(/location = \/ \{(?:(?!\}|X-Robots-Tag)[\s\S])*\}/);
    expect(conf).toMatch(/location = \/home \{\s*return 301 \/;/);
  });

  it('mounts the route metadata manager in the React app', () => {
    const app = fs.readFileSync(path.join(WEB, 'src', 'App.jsx'), 'utf8');
    const manager = fs.readFileSync(
      path.join(WEB, 'src', 'components', 'PageMetadata.jsx'),
      'utf8'
    );
    expect(app).toMatch(/<PageMetadata route=\{route\}/);
    expect(manager).toMatch(/document\.title = metadata\.title/);
    expect(manager).toMatch(/og:description/);
  });
});
