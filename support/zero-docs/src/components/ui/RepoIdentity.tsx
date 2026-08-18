import { REPOS } from '@/data/repos';
import styles from './RepoIdentity.module.scss';

export function RepoIdentity({ id }: { id: string }) {
  const repo = REPOS.find((r) => r.id === id);
  if (repo === undefined) {
    throw new Error(`Unknown workspace id: ${id}`);
  }
  return (
    <p className={styles.line}>
      <strong>Workspace:</strong> {repo.name}
      {' · '}
      <strong>Folder:</strong> <code>{repo.path}</code>
      {' · '}
      <strong>npm package:</strong> <code>{repo.pkg}</code>
      {' · '}
      <strong>Cursor skill:</strong> <code>{repo.skill}</code>
    </p>
  );
}

export function RepoIdentityList({ ids }: { ids: readonly string[] }) {
  return (
    <div className={styles.list}>
      {ids.map((id) => (
        <RepoIdentity key={id} id={id} />
      ))}
    </div>
  );
}
