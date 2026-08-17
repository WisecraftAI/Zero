import { Diagram } from '@/components/ui/Diagram';
import { Note } from '@/components/ui/Note';

export function Sequence() {
  return (
    <section className="section" id="v3-sequence">
      <h2>Sequence · which repo owns each hop</h2>
      <p className="sub">
        The architectureV2 start-to-report flow, mapped onto package names. S2 placed the
        code in these workspaces; S5 turns the orchestrator hop into a process boundary.
      </p>
      <Diagram ariaLabel="Sequence mapped to target repos">
{` @zero/web          @zero/api           @zero/cloud        @zero/db
  POST /api/runs  →  validate + auth
                     presignPut     →   object store
                     INSERT qa_runs                    →   Postgres
                     publish runs.requested → queue
                     SSE subscribe  →   cache pub/sub

                    @zero/orchestrator
  queue delivers runs.requested
    SELECT run / GET inputs / secrets.get
    BA · Manual · Automation  (@zero/domain stageKeys, @zero/locators, @zero/builders)
    optional @zero/analyzer crawl
    publish execution.requested

                    @zero/executor
  queue delivers execution.requested
    secrets.get(login) · chromium · objectStore.put(shots)
    upsert element_locators → @zero/db
    publish execution.completed

                    @zero/orchestrator
  aggregate · Manager · Delivery · status=completed · cache.publish

 @zero/web  GET download → @zero/api presignGet → object store`}
      </Diagram>
      <Note tone="info">
        Full numbered list (steps 1–36) is <a href="#sequence">above</a>. This section only
        answers &quot;which repo codes that hop?&quot;
      </Note>
    </section>
  );
}
