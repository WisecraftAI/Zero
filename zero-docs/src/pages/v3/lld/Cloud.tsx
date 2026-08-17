import { Diagram } from '@/components/ui/Diagram';
import { Honesty } from '@/components/ui/Honesty';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { ProvidersTable } from '@/components/ui/ProvidersTable';
import { RepoIdentity } from '@/components/ui/RepoIdentity';
import styles from './Lld.module.scss';

export function LldCloud() {
  return (
    <>
      <h3 className={styles.subhead}>Cloud adapters · provider switch</h3>
      <RepoIdentity id="cloud" />
      <p className={styles.purpose}>
        The only place that knows AWS/GCP/Azure/Vercel exist. Every other workspace imports{' '}
        <code>@zero/cloud</code> and calls one of four interfaces.
      </p>

      <Honesty
        worksTitle="on disk now (packages/cloud/)"
        stubTitle="not implemented yet"
        works={[
          { label: 'Contract', detail: <><code>index.d.ts</code> declares ObjectStore · Queue · Secrets · Cache</> },
          { label: 'Provider selection', detail: <><code>packages/cloud/index.js</code> switches on <code>ZERO_CLOUD</code></> },
          { label: 'local provider (full)', detail: 'objectStore (fs + HMAC signed URLs), queue (in-proc pub/sub), secrets, cache' },
          { label: 'aws + gcp', detail: 'S3/SQS/Secrets Manager/Redis · GCS/Pub/Sub/Secret Manager/Redis' },
          { label: 'Wired in HTTP API (M2)', detail: 'presign uploads, commit, screenshots, run.json; /artifacts static removed' },
        ]}
        stub={[
          { label: 'azure/, vercel/', detail: 'not implemented' },
          { label: 'Conformance suite', detail: 'no GATE-9 Vitest suite run against every provider' },
        ]}
      />

      <h3>Module map</h3>
      <Diagram ariaLabel="packages/cloud module map">
{`packages/cloud/
├─ package.json           name: "@zero/cloud" · peer: none
├─ index.d.ts             ObjectStore · Queue · Secrets · Cache · CloudBundle
└─ src/
   ├─ index.js            switch(ZERO_CLOUD) · exports bundle
   ├─ errors.js           NotFound · Conflict · Throttled · Unauthorized
   ├─ local/              (working today)
   ├─ aws/                (M7)  storage · queue · secrets · cache
   ├─ gcp/ · azure/ · vercel/     parallel structure
   └─ conformance/        Vitest suite run against every provider
      ├─ objectStore.spec.js
      ├─ queue.spec.js
      ├─ secrets.spec.js
      └─ cache.spec.js`}
      </Diagram>

      <h3>Interface (source: index.d.ts)</h3>
      <CodeBlock lang="ts" label="packages/cloud/index.d.ts">
{`export interface ObjectStore {
  presignPut(key: string, ttlSec?: number): Promise<string>;
  presignGet(key: string, ttlSec?: number): Promise<string>;
  put(key: string, body: Buffer | Readable, meta?: object): Promise<void>;
  get(key: string): Promise<Readable>;
  remove(key: string): Promise<void>;
}
export interface Queue<T> {
  publish(topic: string, msg: T, opts?: { dedupId?: string; groupId?: string }): Promise<void>;
  subscribe(topic: string, handler: (msg: T) => Promise<void>): Unsubscribe;
}
export interface Secrets { get(name: string): Promise<string>; put(name: string, val: string): Promise<void> }
export interface Cache {
  get<T>(k: string): Promise<T | null>;
  set<T>(k: string, v: T, ttlSec?: number): Promise<void>;
  publish(ch: string, m: unknown): Promise<void>;
  subscribe(ch: string, cb: (m: unknown) => void): Unsubscribe;
}`}
      </CodeBlock>

      <h3>Error taxonomy (typed, vendor-agnostic)</h3>
      <ProvidersTable
        headers={['Error', 'When', 'Domain reaction']}
        rows={[
          ['NotFound',     'key or topic missing',            '404 or skip'],
          ['Conflict',     'duplicate dedupId',                'treat as success'],
          ['Throttled',    'vendor 429 · SQS throttling',      'backoff + retry'],
          ['Unauthorized', 'expired credentials / IAM',        'alert · refuse to serve'],
          ['Transient',    'network / 5xx',                    'backoff + retry'],
        ]}
      />

      <h3>Conformance test — same suite, every provider</h3>
      <CodeBlock lang="ts" label="packages/cloud/conformance/objectStore.spec.js">
{`export function testObjectStore(makeStore) {
  const s = makeStore();
  test('put → get round-trip', async () => {
    await s.put('k/a.txt', Buffer.from('hi'));
    const r = await streamToBuf(await s.get('k/a.txt'));
    expect(r.toString()).toBe('hi');
  });
  test('presignPut → HTTP PUT works', async () => { /* ... */ });
  test('remove is idempotent', async () => { /* ... */ });
  test('get missing throws NotFound', async () => { /* ... */ });
}
// packages/cloud/local/__tests__/store.spec.js
testObjectStore(() => require('../src/local').objectStore);
// packages/cloud/aws/__tests__/store.spec.js  (against LocalStack)
testObjectStore(() => require('../src/aws').objectStore);`}
      </CodeBlock>
    </>
  );
}
