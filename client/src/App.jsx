import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import RunForm from './components/RunForm';
import PipelineStatus from './components/PipelineStatus';
import TabContent from './components/TabContent';
import './App.css';

export default function App() {
  const [runId, setRunId] = useState(null);
  const [run, setRun] = useState(null);
  const [activeTab, setActiveTab] = useState('requirements');
  const [placeholder, setPlaceholder] = useState('Upload a CSV (Feature, Scenario, Expected Result) and run the pipeline.');

  const fetchRun = useCallback(async () => {
    if (!runId) return;
    try {
      const res = await fetch(`/api/runs/${runId}`);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setRun(data);
    } catch (e) {
      setPlaceholder(`Polling failed: ${e.message}`);
    }
  }, [runId]);

  useEffect(() => {
    if (!runId) return;
    if (run?.status === 'completed' || run?.status === 'failed') return;
    const t = setInterval(fetchRun, 1200);
    return () => clearInterval(t);
  }, [runId, run?.status, fetchRun]);

  const handleSubmit = async (formData) => {
    setRunId(null);
    setRun(null);
    setPlaceholder('Pipeline started…');
    try {
      const res = await fetch('/api/runs', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start');
      }
      const { runId: id } = await res.json();
      setRunId(id);
    } catch (e) {
      setPlaceholder(`Error: ${e.message}`);
    }
  };

  const handleRerunFailed = async () => {
    if (!runId) return;
    try {
      const res = await fetch(`/api/runs/${runId}/rerun-failed`, { method: 'POST' });
      if (!res.ok) throw new Error('Rerun failed');
      setRun(null);
      fetchRun();
    } catch (e) {
      setPlaceholder(`Error: ${e.message}`);
    }
  };

  const hasFailures = run?.artifacts?.executionReport?.totals?.failed > 0;
  const canDownload = run?.status === 'completed';

  return (
    <div className="app">
      <Header />
      <main className="main">
        <section className="card card-form">
          <h2 className="card-title">New run</h2>
          <p className="card-desc">Upload a CSV with columns <strong>Feature</strong>, <strong>Scenario</strong>, <strong>Expected Result</strong>.</p>
          <RunForm onSubmit={handleSubmit} onRerunFailed={handleRerunFailed} onDownload={() => window.open(`/api/runs/${runId}/download`, '_blank')} runId={runId} run={run} hasFailures={hasFailures} canDownload={canDownload} />
        </section>

        <section className="card">
          <h2 className="card-title">Pipeline status</h2>
          <PipelineStatus run={run} />
        </section>

        <section className="card card-tabs">
          <div className="tabs">
            {['requirements', 'manual', 'automation', 'execution', 
              ...(run?.stages?.accessibility ? ['accessibility'] : []),
              ...(run?.stages?.performance ? ['performance'] : []),
              'manager', 'recording', 'element-log', 'picture'].map((tab) => (
              <button key={tab} type="button" className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab === 'element-log' ? 'Element log' : 
                 tab === 'picture' ? 'Flow' : 
                 tab === 'manual' ? 'Manual TC' : 
                 tab === 'manager' ? 'Manager review' : 
                 tab === 'recording' ? 'Recording' : 
                 tab === 'accessibility' ? 'Accessibility' :
                 tab === 'performance' ? 'Performance' :
                 tab}
              </button>
            ))}
          </div>
          <TabContent run={run} activeTab={activeTab} placeholder={placeholder} />
        </section>
      </main>
    </div>
  );
}
