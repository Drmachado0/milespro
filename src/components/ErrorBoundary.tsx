import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { sanitizeError } from '@/lib/errorSanitizer';
import { logger } from '@/lib/logger';
import { ReactNode } from 'react';

interface ErrorFallbackProps extends FallbackProps {
  title?: string;
  showHomeButton?: boolean;
}

function ErrorFallback({ 
  error, 
  resetErrorBoundary,
  title = 'Algo deu errado',
  showHomeButton = true
}: ErrorFallbackProps) {
  const navigate = useNavigate();
  const safeMessage = sanitizeError(error);

  // Log error for debugging (only in development)
  logger.error('[ErrorBoundary]', 'Caught error:', error);

  const handleGoHome = () => {
    resetErrorBoundary();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {safeMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={resetErrorBoundary} 
            className="w-full"
            variant="default"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
          {showHomeButton && (
            <Button 
              onClick={handleGoHome} 
              className="w-full"
              variant="outline"
            >
              <Home className="mr-2 h-4 w-4" />
              Voltar ao início
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface AppErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  showHomeButton?: boolean;
  onReset?: () => void;
}

export function AppErrorBoundary({ 
  children, 
  fallbackTitle,
  showHomeButton = true,
  onReset
}: AppErrorBoundaryProps) {
  const handleError = (error: unknown, info: { componentStack?: string | null }) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[ErrorBoundary]', 'Error caught:', {
      error: message,
      componentStack: info.componentStack
    });
  };

  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => (
        <ErrorFallback 
          {...props} 
          title={fallbackTitle} 
          showHomeButton={showHomeButton}
        />
      )}
      onError={handleError}
      onReset={onReset}
    >
      {children}
    </ReactErrorBoundary>
  );
}

// Simplified version for sections (without navigation)
interface SectionErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

export function SectionErrorBoundary({ 
  children, 
  fallbackTitle = 'Erro ao carregar seção',
  onReset
}: SectionErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
            <p className="font-medium text-foreground mb-1">{fallbackTitle}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {sanitizeError(error)}
            </p>
            <Button 
              onClick={resetErrorBoundary} 
              size="sm" 
              variant="outline"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}
      onReset={onReset}
    >
      {children}
    </ReactErrorBoundary>
  );
}

export default AppErrorBoundary;
