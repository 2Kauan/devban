import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

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
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-background p-8">
          <h2 className="text-xl font-bold text-foreground mb-2">Algo deu errado</h2>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <pre className="text-sm text-red-500 mb-4 max-w-lg text-center bg-muted/50 p-4 rounded-lg overflow-auto">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
