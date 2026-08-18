import type { ReactNode } from 'react';
import { LldWeb } from './lld/Web';
import { LldApi } from './lld/Api';
import { LldOrchestrator } from './lld/Orchestrator';
import { LldExecutor } from './lld/Executor';
import styles from './WorkspaceTech.module.scss';

const LLD_BY_ID: Record<string, () => ReactNode> = {
  web: LldWeb,
  api: LldApi,
  orchestrator: LldOrchestrator,
  executor: LldExecutor,
};

export function WorkspaceLld({ id }: { id: string }) {
  const render = LLD_BY_ID[id];
  if (render === undefined) return null;

  return (
    <>
      <h4 className={styles.h4}>Low-level design</h4>
      {render()}
    </>
  );
}
