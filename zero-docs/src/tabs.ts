import type { TabDef } from './components/layout/Tabs';

export const TABS = [
  { id: 'overview',     num: '01', label: 'Overview',       short: 'Overview' },
  { id: 'architecture', num: '02', label: 'Architecture',   short: 'Arch' },
  { id: 'make-real',    num: '03', label: 'Make it Real',   short: 'Workflow' },
  { id: 'checklist',    num: '04', label: 'Ship Checklist', short: 'Checklist' },
] as const satisfies readonly TabDef[];

export type TabId = (typeof TABS)[number]['id'];

export const DEFAULT_TAB: TabId = 'overview';

/** Old tab / section hashes → Architecture */
export const TAB_ALIASES: Readonly<Record<string, string>> = {
  v3: 'architecture',
  blueprint: 'architecture',
  'why-change': 'architecture',
  tiers: 'architecture',
  sequence: 'architecture',
  providers: 'architecture',
  adapters: 'architecture',
  milestones: 'architecture',
};
