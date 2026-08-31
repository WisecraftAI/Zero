'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('U3 RTK Query store', () => {
  it('boots one configured store and provides it to React', () => {
    const pkg = JSON.parse(read('web/package.json'));
    const store = read('web/src/store/index.js');
    const main = read('web/src/main.jsx');

    expect(pkg.dependencies).toHaveProperty('@reduxjs/toolkit');
    expect(pkg.dependencies).toHaveProperty('react-redux');
    expect(store).toMatch(/configureStore/);
    expect(store).toMatch(/runsApi\.middleware/);
    expect(store).toMatch(/settingsApi\.middleware/);
    expect(store).toMatch(/opsApi\.middleware/);
    expect(main).toMatch(/<Provider store=\{store\}>/);
  });

  it('models run lifecycle requests with query caching and optimistic stop', () => {
    const api = read('web/src/store/runsApi.js');

    expect(api).toMatch(/getRuns:\s*builder\.query/);
    expect(api).toMatch(/getRun:\s*builder\.query/);
    expect(api).toMatch(/createRun:\s*builder\.mutation/);
    expect(api).toMatch(/body:\s*formData/);
    expect(api).not.toMatch(/Content-Type/);
    expect(api).toMatch(/stopRun:\s*builder\.mutation/);
    expect(api).toMatch(/status\s*=\s*'stopping'/);
    expect(api).toMatch(/rerunFailed:\s*builder\.mutation/);
    expect(api).toMatch(/keepUnusedDataFor:\s*300/);
  });

  it('patches run detail cache from the existing SSE merge contract', () => {
    const bridge = read('web/src/store/RunStreamBridge.jsx');

    expect(bridge).toMatch(/useRunStream/);
    expect(bridge).toMatch(/updateQueryData\('getRun'/);
    expect(bridge).toMatch(/mergeRunStreamState/);
    expect(bridge).toMatch(/invalidateTags\(\[\{ type: 'Run', id: runId \}\]\)/);
    expect(read('web/src/App.jsx')).not.toMatch(/useRunStream|mergeRunStreamState/);
  });

  it('keeps route, wizard, theme, and elapsed state outside Redux', () => {
    const storeSources = [
      read('web/src/store/index.js'),
      read('web/src/store/runsApi.js'),
      read('web/src/store/settingsApi.js'),
      read('web/src/store/opsApi.js'),
    ].join('\n');

    expect(storeSources).not.toMatch(/currentRoute|pathForRoute|readStoredTheme|testCaseMode|setInterval/);
    expect(read('web/src/App.jsx')).toMatch(/useState\(currentRoute\)/);
    expect(read('web/src/views/NewRunView.jsx')).toMatch(/useState\('auto'\)/);
    expect(read('web/src/components/RunElapsed.jsx')).toMatch(/setInterval/);
  });

  it('migrates owned resources away from view-level fetch calls', () => {
    const consumers = [
      'web/src/App.jsx',
      'web/src/views/AgentsView.jsx',
      'web/src/views/ApiKeysView.jsx',
      'web/src/views/LocatorsView.jsx',
      'web/src/views/NewRunView.jsx',
      'web/src/data/useAiSetup.js',
      'web/src/components/RunForm.jsx',
    ].map(read).join('\n');

    expect(consumers).not.toMatch(/fetch\(apiUrl\(`?\/(?:runs|agent-settings|provider-keys|locators|element-log|recordings)/);
    expect(read('web/src/store/settingsApi.js')).toMatch(/agent-settings/);
    expect(read('web/src/store/settingsApi.js')).toMatch(/provider-keys/);
    expect(read('web/src/store/opsApi.js')).toMatch(/locators|element-log|recordings/);
  });

  it('loads views lazily and polls the run list through RTK Query options', () => {
    const app = read('web/src/App.jsx');
    const dashboard = read('web/src/views/DashboardView.jsx');
    const list = read('web/src/views/RunsListView.jsx');

    expect(app.match(/lazy\(\(\) => import\(/g)).toHaveLength(9);
    expect(dashboard).toMatch(/pollingInterval:\s*liveRunIds\.length > 0 \? 4000 : 0/);
    expect(list).toMatch(/pollingInterval:\s*liveRunIds\.length > 0 \? 4000 : 0/);
    expect(`${dashboard}\n${list}`).not.toMatch(/setInterval/);
  });

  it('keeps run detail composition thin with stable mutable-list keys', () => {
    const detail = read('web/src/views/RunDetailView.jsx');
    const panel = read('web/src/views/runDetail/RunDetailTabPanel.jsx');
    const requirements = read('web/src/views/runDetail/RequirementsTab.jsx');
    const manual = read('web/src/views/runDetail/ManualTab.jsx');
    const execution = read('web/src/views/runDetail/ExecutionTab.jsx');
    const accessibility = read('web/src/views/runDetail/AccessibilityTab.jsx');

    expect(detail.split('\n').length).toBeLessThan(200);
    expect(panel).toMatch(/RequirementsTab|ManualTab|ExecutionTab/);
    for (const source of [requirements, manual, execution, accessibility]) {
      expect(source).not.toMatch(/key=\{(?:index|i|j)\}/);
    }
  });
});
