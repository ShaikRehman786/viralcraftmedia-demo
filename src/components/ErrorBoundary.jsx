import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error in Component:", errorInfo.componentStack);
    console.error("Exact Exception:", error.toString());
    console.error("Stack Trace:", error.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B0B0C',
          color: '#FFF',
          fontFamily: 'var(--font), sans-serif',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px', color: '#EF4444' }}>
            React Crash Caught
          </h2>
          <p style={{ color: '#A1A1AA', fontSize: '0.9rem', marginBottom: '16px', maxWidth: '600px' }}>
            An unexpected error occurred in the component hierarchy. See diagnostics below:
          </p>
          <pre style={{
            background: '#18181B',
            color: '#F4F4F5',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            textAlign: 'left',
            overflowX: 'auto',
            maxWidth: '90%',
            marginBottom: '24px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            border: '1px solid rgba(239,68,68,0.2)'
          }}>
            <strong>Error:</strong> {this.state.error && this.state.error.toString()}
            {"\n\n"}
            <strong>Stack Trace:</strong> {this.state.error && this.state.error.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#F97316',
              color: '#FFF',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
