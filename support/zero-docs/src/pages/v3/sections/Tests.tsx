import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Note } from '@/components/ui/Note';

export function Tests() {
  return (
    <section className="section" id="v3-tests">
      <h2>Test strategy · per workspace</h2>
      <p className="sub">
        Pyramid, not iceberg. Fast unit tests where possible, one honest end-to-end that boots
        the compose stack.
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
          ['services/api',            'integration',    'vitest + supertest',  '75 % routes',       'node + fakes'],
          ['services/orchestrator',   'integration',    'vitest + fake queue', 'DAG paths',         'node'],
          ['services/executor',       'integration',    'playwright test',     '3 golden flows',    'compose (playwright img)'],
          ['web',                 'component + a11y','vitest + testing-library + axe','views & forms', 'jsdom'],
          ['e2e',                 'smoke',          'bash + curl + jq',    '1 run start→completed', 'docker compose'],
        ]}
      />

      <h3>Fake adapters — why services stay fast</h3>
      <CodeBlock lang="ts" label="services/api/test/helpers/fakeCloud.js">
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

      <h3>Golden e2e</h3>
      <CodeBlock lang="bash" label="e2e/smoke.sh">
{`set -euo pipefail
API=http://localhost:3000

runId=$(curl -sf -X POST $API/api/runs \\
  -F 'url=https://example.com' -F 'profile=Generic' \\
  -F 'tcFile=@fixtures/tiny.csv' | jq -r .runId)

for _ in $(seq 1 60); do
  status=$(curl -sf $API/api/runs/$runId | jq -r .status)
  [ "$status" = completed ] && break
  [ "$status" = failed    ] && { echo "run failed"; exit 1; }
  sleep 2
done
[ "$status" = completed ] || { echo "timed out"; exit 1; }

curl -sfI "$(curl -sf $API/api/runs/$runId/download | jq -r .url)" | head -1`}
      </CodeBlock>

      <Note tone="info">
        Apps get a cloud bundle injected in tests — no <code>ZERO_CLOUD</code> switch, no real
        network. That&apos;s why the api integration suite finishes in seconds.
      </Note>
    </section>
  );
}
