export const UX_MILESTONE = {
  id: 'U2',
  track: 'ux',
  name: 'Ultra-low-friction canvas',
  spec: 'milestones/U2-low-friction-canvas.md',
  status: 'done',
  state: 'closed',
  dependsOn: 'U1 tokens and landmarks · S7 SPA split',
  objective:
    'Paste a URL and start a run from one canvas. Advanced options stay disclosed in-place; chrome is a hover rail, not a dashboard.',
} as const;
