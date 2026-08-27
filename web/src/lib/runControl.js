export function isStoppableStatus(status) {
  return status === 'queued' || status === 'running' || status === 'stopping';
}

export function isLiveRunStatus(status) {
  return status === 'running' || status === 'stopping';
}

export function isTerminalRunStatus(status) {
  return status === 'completed' || status === 'failed' || status === 'stopped';
}
