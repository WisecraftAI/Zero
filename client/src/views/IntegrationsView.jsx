import { useState } from 'react';
import './IntegrationsView.css';

const INTEGRATIONS = [
  {
    id: 'supabase',
    name: 'Supabase',
    category: 'Database',
    desc: 'Sync production database schemas and capture snapshot artifacts.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Notifications',
    desc: 'Broadcast deployment signals and execution alerts to your workspace.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    id: 'figma',
    name: 'Figma',
    category: 'Design',
    desc: 'Verify visual UI elements against designs and extract CSS specs.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"/>
        <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"/>
        <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"/>
        <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"/>
        <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"/>
      </svg>
    ),
  },
  {
    id: 'drive',
    name: 'Google Drive',
    category: 'Storage',
    desc: 'Archive high-definition video execution traces and QA reports.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19H2" />
        <path d="M20.37 4.91l-8.19 14.09-8.19-14.09h16.38z" />
      </svg>
    ),
  },
  {
    id: 'jira',
    name: 'Jira',
    category: 'Management',
    desc: 'Automatically publish identified defect reports as Jira issues.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
        <line x1="16" y1="5" x2="22" y2="5" />
        <line x1="19" y1="2" x2="19" y2="8" />
      </svg>
    ),
  },
];

export default function IntegrationsView() {
  const [activeGuide, setActiveGuide] = useState(null); // 'supabase' or null
  const [guideStep, setGuideStep] = useState(1);

  const [config, setConfig] = useState({
    supabaseUrl: '',
    supabaseAnonKey: '',
    supabaseServiceKey: '',
  });

  const [saving, setSaving] = useState(false);

  const startGuide = (id) => {
    if (id === 'supabase') {
      setActiveGuide('supabase');
      setGuideStep(1);
    } else {
      alert(`${id} configuration functionality coming soon.`);
    }
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setActiveGuide(null);
      alert('Supabase integration configurations saved locally for this session.');
    }, 1000);
  };

  return (
    <div className="view integrations-view">
      <div className="view-header">
        <div>
          <h1 className="view-title">Integrations</h1>
          <p className="view-subtitle">Connect external services and tools to enhance platform intelligence.</p>
        </div>
      </div>

      {!activeGuide ? (
        <div className="int-grid">
          {INTEGRATIONS.map((item) => (
            <div key={item.id} className="int-card card">
              <div className="int-icon-wrap">
                {item.icon}
              </div>
              <div className="int-meta">
                <div className="int-header">
                  <span className="int-category">{item.category}</span>
                  <span className="int-status-badge">Available</span>
                </div>
                <h3 className="int-name">{item.name}</h3>
                <p className="int-desc">{item.desc}</p>
              </div>
              <div className="int-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => startGuide(item.id)}>
                  Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="int-guide-container card card-padded">
          <div className="guide-header">
            <button className="btn btn-ghost btn-sm" onClick={() => setActiveGuide(null)}>
              ← Back to Integrations
            </button>
            <div className="guide-title-row">
              <div className="guide-icon-small">{INTEGRATIONS.find(i => i.id === activeGuide).icon}</div>
              <h2>Supabase Setup Guide</h2>
            </div>
          </div>

          <div className="guide-steps-indicator">
            {[1, 2, 3].map((num) => (
              <div key={num} className={`guide-dot-step ${guideStep === num ? 'active' : guideStep > num ? 'done' : ''}`}>
                <div className="guide-dot">{num}</div>
                <span className="guide-dot-lbl">{num === 1 ? 'Create Project' : num === 2 ? 'Find Keys' : 'Connect'}</span>
              </div>
            ))}
          </div>

          <div className="guide-content">
            {guideStep === 1 && (
              <div className="guide-panel fade-in">
                <h3>Step 1: Create a Supabase Project</h3>
                <p>Go to the Supabase dashboard and create a new project if you don't have one yet.</p>
                <div className="instruction-list">
                  <div className="instr-item">
                    <span className="num">A</span>
                    <div className="instr-txt">Log in to <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">supabase.com</a></div>
                  </div>
                  <div className="instr-item">
                    <span className="num">B</span>
                    <div className="instr-txt">Click <strong>"New project"</strong> and choose your organization.</div>
                  </div>
                  <div className="instr-item">
                    <span className="num">C</span>
                    <div className="instr-txt">Fill in the project name and set a strong <strong>database password</strong>.</div>
                  </div>
                </div>
                <div className="guide-actions">
                  <button className="btn btn-primary" onClick={() => setGuideStep(2)}>Next: Locate Credentials</button>
                </div>
              </div>
            )}

            {guideStep === 2 && (
              <div className="guide-panel fade-in">
                <h3>Step 2: Find API Credentials</h3>
                <p>Retrieve the API URL and Keys from your project's settings panel.</p>
                <div className="instruction-list">
                  <div className="instr-item">
                    <span className="num">A</span>
                    <div className="instr-txt">Navigate to the <strong>Settings (Gear icon)</strong> in your Supabase sidebar.</div>
                  </div>
                  <div className="instr-item">
                    <span className="num">B</span>
                    <div className="instr-txt">Click on the <strong>"API"</strong> tab under Project Settings.</div>
                  </div>
                  <div className="instr-item">
                    <span className="num">C</span>
                    <div className="instr-txt">Locate your <strong>Project URL</strong> and the <code>anon / public</code> & <code>service_role</code> keys.</div>
                  </div>
                </div>
                <div className="guide-actions">
                  <button className="btn btn-secondary" onClick={() => setGuideStep(1)}>Back</button>
                  <button className="btn btn-primary" onClick={() => setGuideStep(3)}>Next: Enter Credentials</button>
                </div>
              </div>
            )}

            {guideStep === 3 && (
              <div className="guide-panel fade-in">
                <h3>Step 3: Link to ZERO</h3>
                <p>Enter your retrieved Supabase credentials below to authorize integration.</p>
                
                <div className="guide-form">
                  <div className="form-group">
                    <label>Project URL</label>
                    <input 
                      type="text" 
                      className="int-input" 
                      placeholder="https://xxxxxxxxxxxx.supabase.co"
                      value={config.supabaseUrl}
                      onChange={e => setConfig({...config, supabaseUrl: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Anon Public Key</label>
                    <input 
                      type="password" 
                      className="int-input" 
                      placeholder="eyJhbG..."
                      value={config.supabaseAnonKey}
                      onChange={e => setConfig({...config, supabaseAnonKey: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Service Role Key (Optional)</label>
                    <input 
                      type="password" 
                      className="int-input" 
                      placeholder="For database sync access"
                      value={config.supabaseServiceKey}
                      onChange={e => setConfig({...config, supabaseServiceKey: e.target.value})}
                    />
                  </div>
                </div>

                <div className="guide-actions">
                  <button className="btn btn-secondary" onClick={() => setGuideStep(2)}>Back</button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSave}
                    disabled={saving || !config.supabaseUrl || !config.supabaseAnonKey}
                  >
                    {saving ? 'Connecting...' : 'Finalize Connection'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
