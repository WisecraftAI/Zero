import type { TabDef } from './components/layout/Tabs';

export const TABS = [
  { id: 'overview', num: '01', label: 'Overview', short: 'Overview' },
  { id: 'architecture', num: '02', label: 'Architecture', short: 'Arch' },
  { id: 'tech-stack', num: '03', label: 'Tech Stack', short: 'Tech' },
  { id: 'packages', num: '04', label: 'Packages', short: 'Packages' },
  { id: 'deployment', num: '05', label: 'Deployment', short: 'Deploy' },
  { id: 'make-real', num: '06', label: 'Make it Real', short: 'Workflow' },
  { id: 'checklist', num: '07', label: 'Ship Checklist', short: 'Checklist' },
  { id: 'next-milestone', num: '08', label: 'Next Milestone', short: 'Next' },
] as const satisfies readonly TabDef[];

export type TabId = (typeof TABS)[number]['id'];

export const DEFAULT_TAB: TabId = 'overview';

/** Old tab / section hashes + sub-tab deep links → their parent tab. */
export const TAB_ALIASES: Readonly<Record<string, string>> = {
  v3: 'architecture',
  blueprint: 'architecture',
  'why-change': 'architecture',
  tiers: 'architecture',
  sequence: 'architecture',
  providers: 'architecture',
  adapters: 'architecture',
  milestones: 'architecture',
  // Any `#tech-<workspace>` (and legacy topic ids) deep-links into the Tech tab.
  tech: 'tech-stack',
  'tech-backend': 'tech-stack',
  'tech-frontend': 'tech-stack',
  'tech-llm': 'tech-stack',
  'tech-data': 'tech-stack',
  'tech-modules': 'tech-stack',
  'tech-schema': 'tech-stack',
  'tech-domain': 'packages',
  'tech-db': 'packages',
  'tech-locators': 'packages',
  'tech-builders': 'packages',
  'tech-analyzer': 'packages',
  // Any `#pkg-<package>` deep-links into the Packages tab (analyse → analyzer live doc).
  pkg: 'packages',
  'pkg-analyzer': 'packages',
  'pkg-domain': 'packages',
  'pkg-db': 'packages',
  'pkg-locators': 'packages',
  'pkg-builders': 'packages',
  'pkg-cloud': 'packages',
  'deploy-local': 'deployment',
  'deploy-compose': 'deployment',
  'deploy-hybrid': 'deployment',
  'deploy-minio': 'deployment',
  'deploy-demo': 'deployment',
  'deploy-cloud': 'deployment',
  'deploy-cost': 'deployment',
  'deploy-prod': 'deployment',
  'v3-connect': 'deployment',
  // Any `#next-ms-<section>` deep-links into the Next Milestone tab.
  'next-ms': 'next-milestone',
  'next-ms-gap': 'next-milestone',
  'next-ms-taxonomy': 'next-milestone',
  'next-ms-design': 'next-milestone',
  'next-ms-plan': 'next-milestone',
  'next-ms-wiring': 'next-milestone',
};
