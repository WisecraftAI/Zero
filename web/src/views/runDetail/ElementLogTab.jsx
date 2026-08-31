export default function ElementLogTab() {
  return (
    <div className="element-log-info">
      <p>To submit element logs, use the <strong>Locators</strong> section in the sidebar.</p>
      <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: 8 }}>
        Element logs improve selector accuracy across runs by building a persistent locator registry.
      </p>
    </div>
  );
}
