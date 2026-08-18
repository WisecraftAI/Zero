import { FlawItem } from '@/components/ui/FlawItem';
import { Note } from '@/components/ui/Note';

export function Smell() {
  return (
    <section className="section" id="v3-smell">
      <h2>How do you know it doesn&apos;t smell?</h2>
      <p className="sub">
        Ten enforceable gates. Each is a command that returns non-zero on regression. If they&apos;re
        not in CI, the split rots inside a month.
      </p>

      <FlawItem severity="gate" tag="GATE-1" title="API image contains no browser">
        <code>docker run --rm zero-api ls -R node_modules | grep -E &apos;playwright|chromium&apos; &amp;&amp; exit 1 || true</code>.
        Prevents Chromium from silently re-entering the stateless tier.
      </FlawItem>
      <FlawItem severity="gate" tag="GATE-2" title="No cross-service imports">
        <code>npx depcruise services/api --config .dependency-cruiser.js</code> with a rule that
        forbids <code>services/*</code> importing anything under a sibling <code>services/*</code>. Services
        talk via queue only.
      </FlawItem>
      <FlawItem severity="gate" tag="GATE-3" title="Domain code doesn't know AWS/GCP/Azure exist">
        <code>rg &quot;from &apos;@aws-sdk|@google-cloud|@azure/&quot; services packages -g &apos;!packages/cloud/**&apos; &amp;&amp; exit 1</code>.
      </FlawItem>
      <FlawItem severity="gate" tag="GATE-4" title="No circular deps">
        <code>npx madge --circular packages services</code>. First circular import is where the split
        starts leaking.
      </FlawItem>
      <FlawItem severity="gate" tag="GATE-5" title="API package size budget">
        <code>docker image inspect zero-api --format &apos;&#123;&#123;.Size&#125;&#125;&apos;</code> stays under 250 MB.
      </FlawItem>
      <FlawItem severity="p1" tag="GATE-6" title="No process.env outside config.js">
        <code>rg &quot;process\\.env\\.&quot; services -g &apos;!**/config.js&apos; -g &apos;!**/*.test.js&apos;</code>. Every
        service reads env exactly once at boot.
      </FlawItem>
      <FlawItem severity="p1" tag="GATE-7" title="No console.log in shipped code">
        <code>rg &quot;console\\.(log|error|warn)&quot; services packages -g &apos;!**/*.test.js&apos;</code>. Use the
        structured <code>logger</code> from <code>@zero/observability</code>.
      </FlawItem>
      <FlawItem severity="p1" tag="GATE-8" title="No secrets in artifacts">
        Test that greps run artifacts for known secret shapes (JWT, AWS key, bearer) and fails
        the build.
      </FlawItem>
      <FlawItem severity="p2" tag="GATE-9" title="Contract tests on adapters">
        Every provider under <code>packages/cloud/*</code> passes the same conformance suite —
        one test file, four fixtures.
      </FlawItem>
      <FlawItem severity="p2" tag="GATE-10" title="Migrations forward-only + reversible">
        <code>packages/db/migrate.js up &amp;&amp; migrate.js down &amp;&amp; migrate.js up</code>{' '}
        succeeds in CI.
      </FlawItem>

      <Note tone="info">
        <strong>Wire order:</strong> gates 1–5 in a required pre-merge job (block merge); gates
        6–8 in a nightly job that files issues; gates 9–10 in the release job.
      </Note>
    </section>
  );
}
