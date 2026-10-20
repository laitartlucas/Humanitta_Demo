import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Button, EmptyState } from '@ds/components';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Muda para reiniciar a área (ex.: pathname da rota). */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/**
 * Isola falhas de renderização por módulo: um erro na tela de um agente não derruba o shell.
 * Usado pelo roteador em volta de cada rota.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Humanittá] Erro de renderização:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Não foi possível carregar esta área"
        description="Algo não saiu como esperado. Os seus dados estão preservados; tente carregar a área novamente."
        action={
          <Button variant="secondary" leftIcon={RefreshCw} onClick={() => this.setState({ error: null })}>
            Tentar novamente
          </Button>
        }
      />
    );
  }
}
