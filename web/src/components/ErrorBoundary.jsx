import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Main view render failed', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="app-main-error" role="alert">
        <h2>This view could not be displayed</h2>
        <p>Navigate to another section or retry this view.</p>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => this.setState({ error: null })}
        >
          Retry
        </button>
      </div>
    );
  }
}
