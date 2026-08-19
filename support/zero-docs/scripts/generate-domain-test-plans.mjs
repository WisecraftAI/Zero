#!/usr/bin/env node
/**
 * generate-domain-test-plans.mjs — one reference test plan per domain.
 *
 * Reads the live taxonomy (`WEBSITE_TYPES` + `SUB_DOMAINS`) and runs the real
 * `generateMajorFunctionalCases` with crawl input withheld, so every plan below
 * is exactly what a site receives from classification alone — the cases every
 * site in that domain shares before its own pages contribute anything.
 *
 *   node support/zero-docs/scripts/generate-domain-test-plans.mjs
 *   npm run taxonomy-doc
 *
 * Nothing is hand-written: change a `testPriorities` list and the doc changes.
 */
import { writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const ANALYZER = resolve(REPO_ROOT, 'packages/analyzer/lib');
const OUT_FILE = resolve(REPO_ROOT, 'support/zero-docs/docs/v1/DOMAIN_TEST_PLANS.md');

const { WEBSITE_TYPES } = require(resolve(ANALYZER, 'constants.js'));
const { SUB_DOMAINS } = require(resolve(ANALYZER, 'classify/domainTaxonomy.js'));
const { scoreSubDomains } = require(resolve(ANALYZER, 'classify/subDomain.js'));
const { matchesUrlPattern } = require(resolve(ANALYZER, 'classify/indicatorMatch.js'));
const { generateMajorFunctionalCases } = require(resolve(ANALYZER, 'generate/majorFunctionalCases.js'));

const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ');
const code = (list) => (list.length === 0 ? '—' : list.map((v) => `\`${v}\``).join(' · '));
const anchor = (domainKey) => `#${domainKey.toLowerCase().replace(/_/g, '-')}`;

/**
 * The plan classification alone produces. No `userFlows`, `crawledPages`, or
 * `elements` are passed, so the crawl-derived cases (search, cart, auth,
 * multi-page navigation) are deliberately absent — they vary per site and are
 * not part of what a domain prescribes.
 */
function planFor(domainKey, subKey = null) {
  const domain = WEBSITE_TYPES[domainKey];
  const sub = subKey === null ? null : SUB_DOMAINS[domainKey][subKey];
  return generateMajorFunctionalCases({
    websiteType: {
      type: domainKey,
      typeName: domain.name,
      testPriorities: domain.testPriorities,
      criticalFlows: domain.criticalFlows,
    },
    subDomain: sub === null ? null : { key: subKey, name: sub.name, ...sub },
  });
}

function planTable(cases) {
  const rows = cases.map(
    (tc) =>
      `| \`${tc.id}\` | ${cell(tc.priority)} | ${cell(tc.type)} | ${cell(tc.module)} | ` +
      `${cell(tc.scenario)} | ${cell(tc.expectedResult)} |`,
  );
  return [
    '| ID | Priority | Type | Module | Scenario | Expected result |',
    '|----|----------|------|--------|----------|-----------------|',
    ...rows,
  ].join('\n');
}

const modulesOf = (cases) => new Set(cases.map((tc) => String(tc.module).toLowerCase()));

/** Which domain a bare hostname resolves to, following `detectWebsiteType` order. */
function resolveDomainByHost(host) {
  for (const [key, config] of Object.entries(WEBSITE_TYPES)) {
    if (matchesUrlPattern(host, config.urlPatterns)) return key;
  }
  return null;
}

/** Every hostname fragment the taxonomy names, and where it is declared. */
function collectSites() {
  const sites = new Map();
  const add = (fragment, declaredIn) => {
    if (!sites.has(fragment)) sites.set(fragment, { fragment, declaredIn: [] });
    sites.get(fragment).declaredIn.push(declaredIn);
  };

  for (const [domainKey, config] of Object.entries(WEBSITE_TYPES)) {
    for (const fragment of config.urlPatterns) add(fragment, domainKey);
    for (const [subKey, sub] of Object.entries(SUB_DOMAINS[domainKey] ?? {})) {
      for (const fragment of sub.urlPatterns ?? []) add(fragment, `${domainKey}/${subKey}`);
    }
  }

  return [...sites.values()]
    .map((site) => {
      const domain = resolveDomainByHost(site.fragment);
      const sub =
        domain === null ? null : scoreSubDomains({ domainKey: domain, hostname: site.fragment }).subDomain;
      return { ...site, resolvedDomain: domain, resolvedSubDomain: sub?.key ?? null };
    })
    .sort((a, b) => a.fragment.localeCompare(b.fragment));
}

function domainSection(domainKey) {
  const config = WEBSITE_TYPES[domainKey];
  const subKeys = Object.keys(SUB_DOMAINS[domainKey] ?? {});
  const baseline = planFor(domainKey);
  const baselineModules = modulesOf(baseline);
  const lines = [];

  lines.push(`## ${domainKey} · ${config.name}`, '');
  lines.push(`**Sites in it** — hostname fragments that select this domain: ${code(config.urlPatterns)}`, '');
  lines.push(`**Landing-page indicators**: ${code(config.indicators)}`, '');
  lines.push(
    `**Plan** — ${baseline.length} case${baseline.length === 1 ? '' : 's'} shared by every site above ` +
      `and by every site that reaches \`${domainKey}\` on page text.`,
    '',
  );
  lines.push(planTable(baseline), '');

  if (subKeys.length === 0) {
    lines.push(
      '_No sub-domains declared. Every site in this domain receives the plan above verbatim._',
      '',
    );
    return lines.join('\n');
  }

  lines.push(`### Sub-domain variants · ${subKeys.length}`, '');
  lines.push(
    'Each variant replaces the domain priorities with its own, so only the differences from the plan above are listed.',
    '',
  );

  for (const subKey of subKeys) {
    const sub = SUB_DOMAINS[domainKey][subKey];
    const plan = planFor(domainKey, subKey);
    const planModules = modulesOf(plan);
    const added = plan.filter((tc) => !baselineModules.has(String(tc.module).toLowerCase()));
    const dropped = baseline
      .filter((tc) => !planModules.has(String(tc.module).toLowerCase()))
      .map((tc) => tc.module);

    lines.push(`#### ${subKey} · ${sub.name}`, '');
    lines.push(`Sites: ${code(sub.urlPatterns ?? [])}`, '');
    lines.push(
      `${plan.length} case${plan.length === 1 ? '' : 's'} — ${added.length} unique to this sub-domain, ` +
        `${dropped.length} domain case${dropped.length === 1 ? '' : 's'} displaced.`,
      '',
    );
    if (added.length > 0) lines.push(planTable(added), '');
    if (dropped.length > 0) lines.push(`Displaced: ${code(dropped)}`, '');
  }

  return lines.join('\n');
}

function main() {
  const domainKeys = Object.keys(WEBSITE_TYPES);
  const sites = collectSites();
  const unresolvable = sites.filter((s) => s.resolvedDomain === null);

  const summary = domainKeys.map((key) => {
    const subKeys = Object.keys(SUB_DOMAINS[key] ?? {});
    return {
      key,
      name: WEBSITE_TYPES[key].name,
      sites: WEBSITE_TYPES[key].urlPatterns.length,
      subDomains: subKeys.length,
      cases: planFor(key).length,
      subCases: subKeys.map((subKey) => planFor(key, subKey).length),
    };
  });

  const doc = [
    '<!-- AUTO-GENERATED by support/zero-docs/scripts/generate-domain-test-plans.mjs — do not edit by hand. -->',
    '<!-- Run `npm run taxonomy-doc` to refresh from the live taxonomy. -->',
    '',
    '# Domain test plans',
    '',
    'One reference test plan per domain in the analyzer taxonomy, and the sites each plan covers.',
    '',
    'Every plan here is produced by calling the shipped `generateMajorFunctionalCases` with the',
    'domain (and sub-domain) attached and **no crawl input**. That isolates the part of a plan that',
    'comes from classification: it is identical for every site that lands on the same key. A real run',
    'adds site-specific cases on top from `userFlows`, `crawledPages`, and detected element categories',
    '(`SEARCH`, `CART`, `AUTH`), and caps the total at 20 cases.',
    '',
    `Sources: \`packages/analyzer/lib/constants.js\` (${domainKeys.length} domains) ·`,
    '`packages/analyzer/lib/classify/domainTaxonomy.js` (sub-domains) ·',
    '`packages/analyzer/lib/generate/majorFunctionalCases.js` (case generation).',
    '',
    '## Coverage',
    '',
    '| Domain | Name | Sites | Sub-domains | Cases | Cases per sub-domain |',
    '|--------|------|-------|-------------|-------|----------------------|',
    ...summary.map(
      (row) =>
        `| [\`${row.key}\`](${anchor(row.key)}) | ${cell(row.name)} | ${row.sites} | ` +
        `${row.subDomains} | ${row.cases} | ${row.subCases.length === 0 ? '—' : row.subCases.join(', ')} |`,
    ),
    '',
    `Totals: ${domainKeys.length} domains · ${summary.reduce((n, r) => n + r.subDomains, 0)} sub-domains · ` +
      `${sites.length} named site fragments · ` +
      `${summary.reduce((n, r) => n + r.cases + r.subCases.reduce((m, c) => m + c, 0), 0)} plan cases in total.`,
    '',
    '## Site index',
    '',
    'Every hostname fragment the taxonomy names, and the plan it actually reaches. `Resolved domain`',
    'is what `detectWebsiteType` returns for a hostname containing that fragment, following the same',
    'first-match order; `Resolved sub-domain` is what `scoreSubDomains` then returns on the hostname alone.',
    '',
    '| Site fragment | Declared under | Resolved domain | Resolved sub-domain |',
    '|---------------|----------------|-----------------|---------------------|',
    ...sites.map(
      (site) =>
        `| \`${site.fragment}\` | ${code(site.declaredIn)} | ` +
        `${site.resolvedDomain === null ? '— _(page text only)_' : `\`${site.resolvedDomain}\``} | ` +
        `${site.resolvedSubDomain === null ? '—' : `\`${site.resolvedSubDomain}\``} |`,
    ),
    '',
    `Domain \`urlPatterns\` are the only hostname source \`detectWebsiteType\` consults, so ${unresolvable.length}`,
    'of the fragments above are declared solely under a sub-domain and cannot be resolved from the hostname —',
    'those sites depend entirely on landing-page text to reach their domain.',
    '',
    ...domainKeys.map((key) => `${domainSection(key)}\n`),
  ].join('\n');

  writeFileSync(OUT_FILE, `${doc.replace(/\n{3,}/g, '\n\n')}`, 'utf8');
  process.stdout.write(
    `taxonomy-doc: wrote ${relative(REPO_ROOT, OUT_FILE)} — ${domainKeys.length} domains, ` +
      `${summary.reduce((n, r) => n + r.subDomains, 0)} sub-domains, ${sites.length} sites\n`,
  );
}

main();
