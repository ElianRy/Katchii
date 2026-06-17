import { Component, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { crashed: boolean; error: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { crashed: false, error: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { crashed: true, error: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.crashed) {
      return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-6 px-6 text-center">
          <div style={{ fontSize: 64 }}>💥</div>
          <div className="text-white font-black text-xl">Oups, quelque chose a planté</div>
          <div className="text-slate-400 text-sm max-w-xs">{this.state.error}</div>
          <button
            onClick={() => { this.setState({ crashed: false, error: '' }); window.location.reload(); }}
            className="px-8 py-3 rounded-2xl font-black text-black text-base"
            style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }}
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
