import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
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
          background: '#0a0d14',
          color: '#ffffff',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '540px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#ef4444',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>!</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Application Error</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              An unexpected error occurred while rendering this view.
            </p>
            {this.state.error && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '1.5rem'
              }}>
                {this.state.error.toString()}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  window.location.href = '/finance/?tab=dashboard';
                }}
                style={{
                  background: '#2563eb',
                  border: 'none',
                  color: 'white',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
