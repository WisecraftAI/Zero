export const UX_MILESTONE = {
  id: 'U3',
  track: 'ux',
  name: 'Redux Toolkit store (RTK Query)',
  spec: 'milestones/U3-redux-store.md',
  status: 'done',
  state: 'complete',
  dependsOn: 'U1 tokens and landmarks · U2 canvas · S7 SPA split',
  objective:
    'RTK Query owns runs/settings/locators. App only routes. SSE patches the cache. Route, theme, wizard, and elapsed ticks stay out of Redux.',
} as const;
