import React from 'react';
import Dashboard from './components/Dashboard';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Belief Dashboard caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    localStorage.removeItem("belief-theme");
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0B0F19',
          color: '#F1F5F9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '16px',
            padding: '32px 24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.15)',
              color: '#F43F5E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              margin: '0 auto 16px auto'
            }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#FFFFFF' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px', lineHeight: '1.5' }}>
              The application encountered a runtime error. Don't worry, your cloud data on Supabase is completely safe.
            </p>
            {this.state.error && (
              <pre style={{
                background: '#020617',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#FDA4AF',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '20px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                {this.state.error?.toString()}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#000',
                  fontWeight: '600',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Reload Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}

