import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', maxWidth: '520px', margin: '4rem auto', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px', textAlign: 'left', fontFamily: 'sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#991B1B', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            ⚠️ Something went wrong
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#7F1D1D', marginBottom: '1rem', lineHeight: '1.4' }}>
            The application encountered a runtime error. This might be due to outdated cached storage or a mismatch in database records.
          </p>
          <pre style={{ background: '#FFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #F87171', overflowX: 'auto', fontSize: '0.78rem', color: '#B91C1C', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error ? this.state.error.stack || this.state.error.toString() : 'Unknown Error'}
          </pre>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              style={{ padding: '8px 16px', background: '#B91C1C', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              Clear Cache & Reload
            </button>
            <button 
              onClick={() => window.location.reload()}
              style={{ padding: '8px 16px', background: '#FFF', color: '#1F2937', border: '1px solid #D1D5DB', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
