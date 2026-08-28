'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('operator URL routing', () => {
  it('maps every navigable view to a path', () => {
    const routes = read('web/src/lib/routes.js');
    for (const view of [
      'home',
      'dashboard',
      'runs',
      'new-run',
      'locators',
      'apikeys',
      'agents',
      'integrations',
    ]) {
      expect(routes).toContain(`'${view}'`);
    }
    expect(routes).toMatch(/\/runs\/new/);
    expect(routes).toMatch(/run-detail/);
  });

  it('makes each run-detail tab linkable', () => {
    const routes = read('web/src/lib/routes.js');
    for (const slug of [
      'web-analysis',
      'requirements',
      'manual-tc',
      'automation',
      'execution',
      'manager-report',
      'element-log',
      'flow-diagram',
    ]) {
      expect(routes).toContain(`'${slug}'`);
    }
    expect(routes).toMatch(/runTabForSlug/);

    const view = read('web/src/views/RunDetailView.jsx');
    expect(view).toMatch(/onTabChange/);
    // The first visible tab wins, so Web Analysis opens ahead of Requirements.
    expect(view).toMatch(/visibleTabs\[0\]/);
  });

  it('drives view state from the address bar', () => {
    const app = read('web/src/App.jsx');
    expect(app).toMatch(/currentRoute/);
    expect(app).toMatch(/pushState/);
    expect(app).toMatch(/replaceState/);
    expect(app).toMatch(/addEventListener\(['"]popstate['"]/);
  });

  it('keeps the marketing home linked to the two operator entry points', () => {
    const app = read('web/src/App.jsx');
    const home = read('web/src/views/MarketingHomeView.jsx');
    const sidebar = read('web/src/components/Sidebar.jsx');

    expect(app).toMatch(/case ['"]home['"]/);
    expect(home).toMatch(/onNewRun/);
    expect(home).toMatch(/onDashboard/);
    expect(home).toMatch(/ZeroLogoFull/);
    expect(sidebar).toMatch(/id:\s*['"]home['"]/);
  });

  it('keeps promotional AI onboarding on Home, not the operational dashboard', () => {
    const home = read('web/src/views/MarketingHomeView.jsx');
    const dashboard = read('web/src/views/DashboardView.jsx');

    expect(home).toMatch(/AiSetupBanner/);
    expect(home).toMatch(/onGoApiKeys/);
    expect(dashboard).not.toMatch(/AiSetupBanner/);
    expect(dashboard).not.toMatch(/All pipelines idle/);
  });

  it('keeps the SPA fallback that makes deep links reloadable', () => {
    const conf = read('web/nginx.conf');
    expect(conf).toMatch(/try_files \$uri \$uri\/ \/index\.html/);
  });
});
