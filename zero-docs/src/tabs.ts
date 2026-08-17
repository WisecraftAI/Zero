import type { TabDef } from './components/layout/Tabs';

export const TABS = [
  { id: 'overview',  num: '01', label: 'Overview',              short: 'Overview' },
  { id: 'today',     num: '02', label: 'Runtime Today',         short: 'Today' },
  { id: 'blueprint', num: '03', label: 'Production Blueprint',  short: 'Blueprint' },
  { id: 'checklist', num: '04', label: 'Ship Checklist',        short: 'Checklist' },
  { id: 'v3',        num: '05', label: 'Target V3 · Structure & Docker', short: 'V3' },
] as const satisfies readonly TabDef[];

export type TabId = (typeof TABS)[number]['id'];

export const DEFAULT_TAB: TabId = 'overview';
