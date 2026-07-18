import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Link, Unlink, RefreshCw, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/travel/useGoogleCalendar';
import { toast } from 'sonner';

export function GoogleCalendarSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    status,
    isLoadingStatus,
    isConnected,
    connect,
    disconnect,
    isDisconnecting,
    syncAll,
    isSyncingAll,
  } = useGoogleCalendar();

  // Handle OAuth callback
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      toast.success('Google Calendar conectado com sucesso!');
      // Clean URL
      setSearchParams({});
    } else if (error) {
      toast.error('Erro ao conectar Google Calendar. Tente novamente.');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  if (isLoadingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Google Calendar
            </CardTitle>
            <CardDescription className="mt-1">
              Sincronize suas reservas automaticamente com o Google Calendar
            </CardDescription>
          </div>
          {isConnected && (
            <Badge variant="default" className="bg-success/10 text-success border-success">
              <CheckCircle className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <p className="text-sm font-medium">Sincronização ativa</p>
                <p className="text-xs text-muted-foreground">
                  Passagens, hotéis, carros, cruzeiros, seguros, atrações e transfers serão sincronizados
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncAll()}
                  disabled={isSyncingAll}
                >
                  {isSyncingAll ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar Tudo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnect()}
                  disabled={isDisconnecting}
                  className="text-destructive hover:text-destructive"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4 mr-2" />
                  )}
                  Desconectar
                </Button>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-info" />
                <span>Passagens</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-violet-500" />
                <span>Hotéis</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>Carros</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-info" />
                <span>Cruzeiros</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span>Seguros</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-pink-500" />
                <span>Atrações</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span>Transfers</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Não conectado</p>
                <p className="text-xs text-muted-foreground">
                  Conecte seu Google Calendar para sincronizar automaticamente todas as suas reservas como eventos
                </p>
              </div>
            </div>

            <Button onClick={connect} className="w-full">
              <Link className="h-4 w-4 mr-2" />
              Conectar Google Calendar
            </Button>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Ao conectar, você autoriza o MilesPro a:</p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>Criar eventos no seu calendário</li>
                <li>Atualizar eventos de reservas alteradas</li>
                <li>Remover eventos de reservas canceladas</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
