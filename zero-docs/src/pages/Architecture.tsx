import { JumpNav } from '@/components/layout/JumpNav';
import { BlueprintPage } from './Blueprint';
import { V3Page } from './v3';

const JUMP = [
  { href: '#why-change',  label: 'Why' },
  { href: '#tiers',       label: 'Tiers' },
  { href: '#blueprint',   label: 'Target' },
  { href: '#sequence',    label: 'Sequence', hot: true },
  { href: '#providers',   label: 'Providers' },
  { href: '#milestones',  label: 'M1–M7' },
  { href: '#v3-layout',   label: 'Folders' },
  { href: '#v3-repos',    label: 'Workspaces' },
  { href: '#v3-lld',      label: 'LLD' },
  { href: '#v3-docker',   label: 'Docker' },
  { href: '#v3-order',    label: 'S0–S6' },
  { href: '#v3-connect',  label: 'Cloud' },
  { href: '#v3-smell',    label: 'Gates' },
] as const;

export function ArchitecturePage() {
  return (
    <>
      <JumpNav links={JUMP} ariaLabel="Architecture jump" />
      <BlueprintPage />
      <V3Page />
    </>
  );
}
