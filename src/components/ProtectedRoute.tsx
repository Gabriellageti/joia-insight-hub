import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const {
    user,
    loading,
    authorizationLoading,
    authorizationError,
    activeMembership,
    refreshAuthorization,
    signOut,
  } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (authorizationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" aria-live="polite">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Validando permissões</span>
      </div>
    );
  }

  if (authorizationError || !activeMembership) {
    return (
      <main className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTitle>Acesso ao workspace indisponível</AlertTitle>
          <AlertDescription className="mt-2 space-y-4">
            <p>
              {authorizationError ?? 'Sua conta ainda não foi associada a um workspace. Solicite acesso a um administrador.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {authorizationError && (
                <Button type="button" variant="outline" onClick={() => void refreshAuthorization()}>
                  Tentar novamente
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={() => void signOut()}>
                Sair
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return <>{children}</>;
}
