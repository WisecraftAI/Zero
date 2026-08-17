---
name: zero-cloud
description: >-
  Code ZER0 cloud adapters (packages/cloud local/aws/gcp). Use when the user asks to
  update ZERO_CLOUD, S3, SQS, GCS, Pub/Sub, adapters, or @zero/cloud.
---

# @zero/cloud

1. Read `agent-workflow/prompts/repos/cloud.md`
2. Keep `index.d.ts` contracts stable
3. Vendor SDKs only under `packages/cloud/**`
4. Do not invent Azure/Vercel adapters unless asked — they are not-done
