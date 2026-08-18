import { SEQUENCE, seqBoundaryCounts, type SeqStep } from '@/data/sequence';
import styles from './SequenceTable.module.scss';

/** Renders the 36-hop run contract grouped into its four phases. */
export function SequenceTable({ showWhy = false }: { showWhy?: boolean }) {
  const counts = seqBoundaryCounts();

  return (
    <>
      <div className={styles.legend} aria-label="Boundary crossings by type">
        {counts.map(({ boundary, count }) => (
          <span key={boundary} className={styles.chip}>
            <b>{count}</b> {boundary}
          </span>
        ))}
        <span className={styles.chip}>
          <b>0</b> in-memory handoffs
        </span>
      </div>

      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Hop</th>
              <th scope="col">{showWhy ? 'Why this hop exists' : 'Operation'}</th>
              <th scope="col">Crosses</th>
              <th scope="col">Owner</th>
            </tr>
          </thead>
          {SEQUENCE.map((phase) => (
            <tbody key={phase.id}>
              <tr className={styles.group}>
                <th colSpan={5} scope="colgroup">
                  {phase.id} · {phase.title}
                  <span className={styles.range}>{phase.range}</span>
                  <span className={styles.goal}>{phase.goal}</span>
                </th>
              </tr>
              {phase.steps.map((step) => (
                <SequenceRow key={step.n} step={step} showWhy={showWhy} />
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </>
  );
}

function SequenceRow({ step, showWhy }: { step: SeqStep; showWhy: boolean }) {
  if (step.crosses === 'control') {
    return (
      <tr className={styles.loop}>
        <td className={styles.n}>{step.n}</td>
        <td colSpan={4}>{step.op}</td>
      </tr>
    );
  }

  return (
    <tr>
      <td className={styles.n}>{step.n}</td>
      <td className={styles.hop}>
        {step.from} <span className={styles.arrow}>→</span> {step.to}
      </td>
      <td className={showWhy ? undefined : styles.op}>{showWhy ? step.why : step.op}</td>
      <td className={styles.crosses}>{step.crosses}</td>
      <td className={styles.owner}>
        <code>{step.owner}</code>
      </td>
    </tr>
  );
}
