import { lazy, Suspense } from 'react';
import {
  buildJourneyCoverageSankey,
  journeysFromRun,
  flowDiagramSourceLabel,
  systemNodesForRun
} from '../lib/flowDiagram';
import './FlowDiagram.scss';

// Recharts is loaded only when this page has enough varied journey outcomes
// to make a coverage chart informative.
const FlowCoverageSankey = lazy(() => import('./FlowCoverageSankey'));

export default function FlowDiagram({ run }) {
  const journeys = journeysFromRun(run);
  const lanes = systemNodesForRun(run);
  const source = flowDiagramSourceLabel(journeys);
  const coverage = buildJourneyCoverageSankey(journeys);
  const host = hostFromUrl(run?.input?.ottUrl);

  return (
    <div className="flow-diagram">
      <section className="fd-system" aria-labelledby="fd-system-title">
        <div className="fd-section-head">
          <h3 id="fd-system-title">Pipeline</h3>
          <p>Intake → agents → Playwright → reports. Optional stages appear only when this run enabled them.</p>
        </div>
        <div className="fd-lanes">
          {lanes.map((lane, laneIndex) => (
            <div key={lane.id} className="fd-lane-wrap">
              {laneIndex > 0 && <div className="fd-lane-join" aria-hidden="true" />}
              <div className="fd-lane">
                <div className="fd-lane-label">{lane.label}</div>
                <ol className="fd-lane-nodes">
                  {lane.nodes.map((node, nodeIndex) => (
                    <li key={node.id} className="fd-lane-item">
                      {nodeIndex > 0 && <span className="fd-arrow" aria-hidden="true" />}
                      <SystemNode node={node} />
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
      </section>

      {coverage ? (
        <Suspense fallback={<div className="fd-chart-loading" role="status">Loading journey coverage chart…</div>}>
          <FlowCoverageSankey data={coverage} />
        </Suspense>
      ) : null}

      <section className="fd-journeys" aria-labelledby="fd-journeys-title">
        <div className="fd-section-head">
          <h3 id="fd-journeys-title">Site journeys</h3>
          <p>
            {journeys.length
              ? `${journeys.length} flow${journeys.length === 1 ? '' : 's'}${host ? ` on ${host}` : ''}${source ? ` · ${source}` : ''}`
              : 'Journeys appear after Web Analyzer or Manual QA produces steps.'}
          </p>
        </div>
        {journeys.length === 0 ? (
          <div className="fd-empty">No discovered flows yet. The pipeline diagram above is the path this run is walking.</div>
        ) : (
          <div className="fd-journey-list">
            {journeys.map((journey) => (
              <JourneyCard key={journey.id} journey={journey} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SystemNode({ node }) {
  const optional = Boolean(node.optional);
  return (
    <div className={`fd-sys-node fd-sys-node--${node.status}${optional ? ' fd-sys-node--optional' : ''}`}>
      <span className="fd-sys-name">{node.label}</span>
      <span className="fd-sys-detail">{node.detail}</span>
    </div>
  );
}

function JourneyCard({ journey }) {
  const priority = String(journey.priority || '').toLowerCase();
  return (
    <article className={`fd-journey fd-journey--${journey.status}`}>
      <header className="fd-journey-head">
        <h4 className="fd-journey-name">{journey.name}</h4>
        <div className="fd-journey-meta">
          {journey.priority && (
            <span className={`fd-priority fd-priority--${priority}`}>{journey.priority}</span>
          )}
          {journey.status && journey.status !== 'queued' && (
            <span className={`fd-status fd-status--${journey.status}`}>{statusLabel(journey.status)}</span>
          )}
        </div>
      </header>
      {journey.description && <p className="fd-journey-desc">{journey.description}</p>}
      <ol className="fd-steps">
        {journey.steps.map((step, index) => (
          <li key={`${journey.id}-${index}`} className="fd-step">
            {index > 0 && <span className="fd-step-join" aria-hidden="true" />}
            <div className={`fd-step-node fd-step-node--${step.action || 'verify'}`}>
              <span className="fd-step-action">{step.action}</span>
              <span className="fd-step-label">{step.label}</span>
              {step.target && step.target !== step.label && (
                <span className="fd-step-target">{step.target}</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

function hostFromUrl(url) {
  if (!url) return '';
  try {
    return new URL(url).host;
  } catch {
    return String(url).replace(/^https?:\/\//, '').split('/')[0];
  }
}

function statusLabel(status) {
  return {
    passed: 'Passed',
    failed: 'Failed',
    running: 'Running',
    queued: 'Queued',
    skipped: 'Skipped',
    completed: 'Done',
    pending: 'Pending',
    fixed: ''
  }[status] || status;
}
