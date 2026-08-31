import { Awaiting, CodeSection, CollapsibleCodeSection, JsonToggle } from './shared';

export default function AutomationTab({ run }) {
  const data = run.artifacts?.automationBundle;
  if (!data) return <Awaiting />;
  const language = data.metadata?.scriptingLanguage || 'Java';
  const framework = data.metadata?.framework || 'Selenium';

  return (
    <div className="automation-panel">
      <div className="automation-meta">
        <span className="lang-tag">{language}</span>
        <span className="framework-tag">{framework}</span>
      </div>
      {data.generatedSeleniumJava && (
        <CodeSection title="Java / Selenium" code={data.generatedSeleniumJava} />
      )}
      {data.generatedPlaywrightScript && (
        <CollapsibleCodeSection title="Playwright (runtime)" code={data.generatedPlaywrightScript} />
      )}
      <JsonToggle data={data} />
    </div>
  );
}
