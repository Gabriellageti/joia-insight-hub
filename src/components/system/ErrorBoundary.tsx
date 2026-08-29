import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Production monitoring can collect this sanitized event without rendering
    // stack traces or application data to the user.
    console.error("Erro de renderização capturado", {
      name: error.name,
      componentStack: info.componentStack,
    });
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private retry = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-[60vh] p-4 flex items-center justify-center" role="alert">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Não foi possível exibir esta área</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O restante do sistema continua protegido. Tente novamente ou retorne ao início.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={this.retry}>Tentar novamente</Button>
              <Button type="button" variant="outline" onClick={() => window.location.assign('/')}>
                Voltar ao início
              </Button>
              <Button type="button" variant="ghost" onClick={() => window.location.reload()}>
                Recarregar página
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }
}
