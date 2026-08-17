import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RepoIdentity } from '@/components/ui/RepoIdentity';
import { REPOS, repoTreeLabel } from '@/data/repos';
import { MILESTONES, PACKAGING } from '@/data/migration';

describe('StatusBadge', () => {
  it('renders the done label', () => {
    render(<StatusBadge status="done" />);
    expect(screen.getByText('done')).toBeInTheDocument();
  });

  it('renders the not-done label', () => {
    render(<StatusBadge status="not-done" />);
    expect(screen.getByText('not done')).toBeInTheDocument();
  });
});

describe('catalogs', () => {
  it('lists ten workspaces with explicit folder, npm package, and Cursor skill', () => {
    expect(REPOS).toHaveLength(10);
    const names = new Set<string>();
    for (const r of REPOS) {
      names.add(r.name);
      expect(r.name.length).toBeGreaterThan(3);
      expect(r.pkg).toBe(`@zero/${r.id}`);
      expect(r.skill).toBe(`/zero-${r.id}`);
      expect(r.path.endsWith('/')).toBe(true);
      expect(r.prompt).toContain(`agent-workflow/prompts/repos/${r.id}.md`);
    }
    expect(names.size).toBe(10);
  });

  it('labels each workspace with npm package and Cursor skill in the folder tree', () => {
    const api = REPOS.find((r) => r.id === 'api');
    expect(api).toEqual(expect.objectContaining({
      name: 'HTTP API',
      pkg: '@zero/api',
      path: 'apps/api/',
      skill: '/zero-api',
    }));
    expect(api && repoTreeLabel(api)).toBe(
      'HTTP API  ·  npm package @zero/api  ·  Cursor skill /zero-api',
    );
  });

  it('renders folder, npm package, and Cursor skill for a workspace', () => {
    const { container } = render(<RepoIdentity id="api" />);
    expect(container.textContent).toContain('HTTP API');
    expect(screen.getByText('apps/api/')).toBeInTheDocument();
    expect(screen.getByText('@zero/api')).toBeInTheDocument();
    expect(screen.getByText('/zero-api')).toBeInTheDocument();
  });

  it('scores M1–M4 done, S0–S4 done, S5 not-done', () => {
    expect(MILESTONES.filter((m) => m.id === 'M1' || m.id === 'M4').every((m) => m.status === 'done')).toBe(true);
    expect(PACKAGING.find((s) => s.id === 'S2')?.status).toBe('done');
    expect(PACKAGING.find((s) => s.id === 'S3')?.status).toBe('done');
    expect(PACKAGING.find((s) => s.id === 'S4')?.status).toBe('done');
    expect(PACKAGING.find((s) => s.id === 'S5')?.status).toBe('not-done');
    expect(PACKAGING.find((s) => s.id === 'S0')?.status).toBe('done');
  });
});
