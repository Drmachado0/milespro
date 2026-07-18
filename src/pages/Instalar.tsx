import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Wifi, WifiOff, CheckCircle, Bell } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Instalar() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    {
      icon: WifiOff,
      title: 'Acesso Offline',
      description: 'Visualize seus saldos e operações mesmo sem internet',
    },
    {
      icon: Smartphone,
      title: 'App Nativo',
      description: 'Experiência de aplicativo nativo na sua tela inicial',
    },
    {
      icon: Bell,
      title: 'Notificações',
      description: 'Receba alertas de promoções e vencimento de milhas',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <img src="/pwa-192x192.png" alt="MilesPro" className="w-20 h-20 mx-auto rounded-2xl shadow-lg" />
          <h1 className="text-2xl font-bold text-foreground">Instalar MilesPro</h1>
          <p className="text-muted-foreground">
            Tenha acesso rápido ao MilesPro direto da sua tela inicial
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4 text-success" />
              <span className="text-success font-mono uppercase tracking-[0.14em] text-xs">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-warning" />
              <span className="text-warning font-mono uppercase tracking-[0.14em] text-xs">Offline</span>
            </>
          )}
        </div>

        <div className="space-y-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border/50">
              <CardContent className="flex items-start gap-4 p-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isInstalled ? (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle className="h-6 w-6 text-success" />
              <div>
                <p className="font-medium text-foreground">App instalado</p>
                <p className="text-sm text-muted-foreground">
                  O MilesPro já está na sua tela inicial
                </p>
              </div>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Button onClick={handleInstall} className="w-full" size="lg">
            <Download className="h-5 w-5 mr-2" />
            Instalar Aplicativo
          </Button>
        ) : (
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Como instalar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">iPhone/iPad:</p>
                <p>Toque em Compartilhar → "Adicionar à Tela de Início"</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Android:</p>
                <p>Toque no menu (⋮) → "Instalar aplicativo"</p>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-muted-foreground">
          O aplicativo será instalado localmente e funcionará mesmo offline
        </p>
      </div>
    </div>
  );
}
