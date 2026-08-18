import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Note } from '@/components/ui/Note';

export function Tests() {
  return (
    <section className="section" id="v3-tests">
      <h2>Test strategy · per workspace</h2>
      <p className="sub">
        Pyramid, not iceberg. Fast unit tests where possible, one honest end-to-end that boots
        the compose stack. Root runner today is <strong>Jest</strong> (
        <code>npm test</code> / <code>npm run test:smoke</code>).
      </p>

      <ProvidersTable
        headers={['Workspace', 'Tier', 'Tool', 'Coverage floor', 'Runs in']}
        rows={[
          ['packages/domain',     'unit',           'jest',                'test/domain.test.js', 'node'],
          ['packages/locators',   'unit',           'jest',                'test/locators.test.js', 'node'],
          ['packages/builders',   'unit',           'jest',                'test/builders.test.js', 'node'],
          ['packages/analyzer',   'unit',           'jest',                'test/analyzer.test.js · proFlows', 'node'],
          ['packages/db',         'unit + integration','jest + pg',       'test/db.config · db.persist', 'compose (postgres)'],
          ['packages/cloud',      'contract',       'jest',                'test/cloud.*.test.js', 'node'],
          ['services/api',            'integration',    'jest',                'HTTP / health / runs smoke', 'node + fakes'],
          ['services/orchestrator',   'integration',    'jest',                'pipeline / processRun paths', 'node'],
          ['services/executor',       'integration',    'jest + playwright',   'job kinds / minimal mode', 'node / compose'],
          ['web',                 'component',      'manual + build',      'views & forms (Vite build)', 'browser'],
          ['e2e',                 'smoke',          'bash + curl + jq',    '1 run start→completed (target)', 'docker compose'],
        ]}
      />

      <h3>Fake adapters — why services stay fast</h3>
      <CodeBlock lang="ts" label="test helpers · fake cloud shape">
{`const store = new Map();
const subs  = new Map();
module.exports = {
  objectStore: {
    put:  async (k, b) => store.set(k, Buffer.from(b)),
    get:  async (k)    => store.get(k),
    presignPut: async (k) => \`fake://put/\${k}\`,
    presignGet: async (k) => \`fake://get/\${k}\`,
    remove: async (k)     => store.delete(k),
  },
  queue: {
    async publish(t, m) { (subs.get(t) || []).forEach((h) => h(m)); },
    subscribe(t, h) { subs.set(t, [...(subs.get(t) || []), h]); return () => {}; },
  },
};`}
      </CodeBlock>

      <h3>Golden e2e (target · S7 ports)</h3>
      <CodeBlock lang="bash" label="e2e/smoke.sh">
{`set -euo pipefail
API=http://localhost:3001

runId=$(curl -sf -X POST $API/runs \\
  -F 'url=https://example.com' -F 'profile=Generic' \\
  -F 'tcFile=@fixtures/tiny.csv' | jq -r .runId)

for _ in $(seq 1 60); do
  status=$(curl -sf $API/runs/$runId | jq -r .status)
  [ "$status" = completed ] && break
  [ "$status" = failed    ] && { echo "run failed"; exit 1; }
  sleep 2
done
[ "$status" = completed ] || { echo "timed out"; exit 1; }

curl -sfI "$(curl -sf "$API/runs/$runId/download?format=json&url=1" | jq -r .url)" | head -1`}
      </CodeBlock>

      <Note tone="info">
        Apps get a cloud bundle injected in tests — no <code>ZERO_CLOUD</code> switch, no real
        network. Root smoke today is <code>npm run test:smoke</code>; a Compose{' '}
        <code>e2e/smoke.sh</code> against four app services is still a Ship Checklist gap.
      </Note>
    </section>
  );
}
