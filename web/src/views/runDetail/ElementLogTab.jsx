export default function ElementLogTab({ onNavigate }) {
  return (
    <section className="element-log-info" aria-labelledby="element-log-title">
      <div className="element-log-info__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 3 4.5 6.6 12 10.2l7.5-3.6L12 3Z" />
          <path d="m4.5 11.3 7.5 3.6 7.5-3.6M4.5 16l7.5 3.6 7.5-3.6" />
        </svg>
      </div>
      <div className="element-log-info__content">
        <span className="element-log-info__eyebrow">Locator intelligence</span>
        <h3 id="element-log-title">Build more reliable selectors</h3>
        <p>
          Submit captured element data to the shared locator registry. Future runs can reuse
          these selectors to generate more accurate, resilient automation.
        </p>
        <ol className="element-log-info__steps" aria-label="How to submit an element log">
          <li><span>1</span>Open Locators</li>
          <li><span>2</span>Add the page URL and element log JSON</li>
          <li><span>3</span>Submit to update the registry</li>
        </ol>
        <button type="button" className="btn btn-primary" onClick={() => onNavigate?.('locators')}>
          Open Locators
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
