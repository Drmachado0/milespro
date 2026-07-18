import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePromotions } from '@/hooks/usePromotions';
import { useFetchPromotions } from '@/hooks/useFetchPromotions';
import { PromotionType, Promotion } from '@/types/promotion';
import { useLocalization } from '@/hooks/useLocalization';
import { useAlertSettings } from '@/hooks/useAlertSettings';
import { useUnifiedAlertCount } from '@/hooks/useUnifiedAlertCount';
import { AlertStatusBadge } from '@/components/alerts/AlertStatusBadge';
import { AlertSettingsDialog } from '@/components/alerts/AlertSettingsDialog';
import { PauseAlertsButton } from '@/components/alerts/PauseAlertsButton';
import { NotificationPermissionBanner } from '@/components/alerts/NotificationPermissionBanner';
import { PriceAlertsTab } from '@/components/alerts/PriceAlertsTab';
import { ExpirationAlertsTab } from '@/components/alerts/ExpirationAlertsTab';
import {
  RefreshCw,
  Download,
  ExternalLink,
  Clock,
  Loader2,
  AlertTriangle,
  Check,
  Gift,
  CheckCircle,
  Star,
  Filter,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  CheckCheck,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

const typeFilters: { value: PromotionType | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'Todos', icon: Filter },
  { value: 'promo', label: 'Promoções', icon: Gift },
  { value: 'bonus', label: 'Bônus', icon: Star },
  { value: 'warning', label: 'Alertas', icon: AlertTriangle },
  { value: 'income', label: 'Rendimentos', icon: CheckCircle },
];

const iconConfigs: Record<
  PromotionType,
  {
    bgColor: string;
    iconColor: string;
    Icon: React.ElementType;
  }
> = {
  warning: {
    bgColor: 'bg-warning/10',
    iconColor: 'text-warning',
    Icon: AlertTriangle,
  },
  promo: {
    bgColor: 'bg-success/10',
    iconColor: 'text-success',
    Icon: Gift,
  },
  income: {
    bgColor: 'bg-info/10',
    iconColor: 'text-info',
    Icon: CheckCircle,
  },
  bonus: {
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
    Icon: Star,
  },
};

export default function Alertas() {
  const { promotions, loading, error, lastUpdate, refresh, isLive, markAsRead, markAllAsRead, readPromotionIds } = usePromotions();
  const { fetchPromotions, isFetching } = useFetchPromotions();
  const { formatDate, formatDateShort } = useLocalization();
  const { settings } = useAlertSettings();
  const alertCounts = useUnifiedAlertCount();
  const [selectedType, setSelectedType] = useState<PromotionType | 'all'>('all');
  const [showRead, setShowRead] = useState(false);
  const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('promotions');

  // Filter promotions: by type and optionally hide read ones.
  // No slice cap — clients with large unread queues used to silently lose
  // promotions past index 20 with no "show more" affordance.
  const filteredPromotions = promotions
    .filter((p) => selectedType === 'all' || p.type === selectedType)
    .filter((p) => showRead || !readPromotionIds.has(p.id));

  // Count unread promotions
  const unreadCount = promotions.filter(p => !readPromotionIds.has(p.id)).length;

  const handleAlertClick = async (promotion: Promotion) => {
    // Start fade-out animation
    setFadingOutIds(prev => new Set([...prev, promotion.id]));
    
    // Open link if available
    if (promotion.link) {
      window.open(promotion.link, '_blank', 'noopener,noreferrer');
    }
    
    // Wait for animation to complete, then mark as read
    setTimeout(async () => {
      await markAsRead(promotion.id);
      setFadingOutIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(promotion.id);
        return newSet;
      });
    }, 300);
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return '';
    const dateStr = formatDateShort(date);
    const timeStr = date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dateStr} ${timeStr}`;
  };

  return (
    <DashboardLayout title="Central de Alertas">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Central"
          icon={<Bell className="h-5 w-5" />}
          title="Central de Alertas"
          subtitle="Oportunidades, expirações e promoções de programas em um só lugar"
        />

        {/* Notification Permission Banner */}
        <NotificationPermissionBanner />

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Alert Status Badge */}
            <AlertStatusBadge />

            {/* Live Indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                isLive
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isLive ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  <Wifi className="w-4 h-4" />
                  <span>Ao vivo</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {lastUpdate && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDateTime(lastUpdate)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap" data-tour="alerts-settings">
            {/* Alert Controls */}
            <PauseAlertsButton />
            <AlertSettingsDialog />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3" data-tour="alerts-tabs">
            <TabsTrigger value="promotions" className="gap-2">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Todos</span>
              {alertCounts.promotions > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                  {alertCounts.promotions > 99 ? '99+' : alertCounts.promotions}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="prices" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Preços</span>
              {alertCounts.priceAlerts > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1">
                  {alertCounts.priceAlerts}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expirations" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Vencimentos</span>
              {alertCounts.expirations > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 animate-pulse">
                  {alertCounts.expirations}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Promotions Tab */}
          <TabsContent value="promotions" className="space-y-6">
            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRead(!showRead)}
                className={showRead ? 'text-muted-foreground' : ''}
              >
                {showRead ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Ocultar Lidos
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Mostrar Lidos
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Marcar Todos
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchPromotions}
                disabled={isFetching}
              >
                <Download className={`w-4 h-4 mr-2 ${isFetching ? 'animate-bounce' : ''}`} />
                Buscar Externas
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>

            {/* Type Filters */}
            <div className="flex flex-wrap gap-2">
              {typeFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={selectedType === filter.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType(filter.value)}
                  className="gap-2"
                >
                  <filter.icon className="w-4 h-4" />
                  {filter.label}
                  {filter.value !== 'all' && (
                    <Badge variant="secondary" className="ml-1">
                      {promotions.filter((p) => p.type === filter.value && !readPromotionIds.has(p.id)).length}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 grid place-items-center">
                      <Gift className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono text-2xl font-bold tabular-nums tracking-tight">{unreadCount}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.14em]">Não Lidos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10 grid place-items-center">
                      <Gift className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-mono text-2xl font-bold tabular-nums tracking-tight">
                        {promotions.filter((p) => p.type === 'promo').length}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.14em]">Promoções</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 grid place-items-center">
                      <Star className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono text-2xl font-bold tabular-nums tracking-tight">
                        {promotions.filter((p) => p.type === 'bonus').length}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.14em]">Bônus</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10 grid place-items-center">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="font-mono text-2xl font-bold tabular-nums tracking-tight">
                        {promotions.filter((p) => p.type === 'warning').length}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.14em]">Alertas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alerts List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {selectedType === 'all' ? 'Alertas' : typeFilters.find(f => f.value === selectedType)?.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{filteredPromotions.length} exibidos</Badge>
                    <Badge variant="secondary">{unreadCount} não lidos</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Loading State */}
                {loading && promotions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                    <p className="text-muted-foreground text-sm">Carregando promoções...</p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-4">
                    <p className="text-destructive text-sm font-medium">Erro ao carregar</p>
                    <p className="text-destructive/80 text-xs mt-1">{error}</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={refresh}
                      className="text-destructive mt-2 p-0 h-auto"
                    >
                      Tentar novamente
                    </Button>
                  </div>
                )}

                {/* Alerts List */}
                <div className="space-y-3">
                  {filteredPromotions.map((promotion, index) => {
                    const config = iconConfigs[promotion.type] || iconConfigs.promo;
                    const { bgColor, iconColor, Icon } = config;

                    return (
                      <div
                        key={promotion.id}
                        onClick={() => handleAlertClick(promotion)}
                        className={`
                          flex items-start gap-4 p-4 rounded-xl
                          ${bgColor} border border-border/40
                          transition-all duration-300
                          ${fadingOutIds.has(promotion.id) 
                            ? 'opacity-0 scale-95 translate-x-4' 
                            : 'opacity-100 scale-100 translate-x-0 hover:shadow-md hover:scale-[1.01]'}
                          cursor-pointer group
                          animate-fade-in
                        `}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className={`${iconColor} mt-0.5 flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-foreground text-sm leading-tight">
                              {promotion.title}
                            </h3>
                            {promotion.link && (
                              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm mt-1">
                            {promotion.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            {promotion.expires_at && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/70">
                                <Clock className="w-3 h-3" />
                                Expira em {formatDate(new Date(promotion.expires_at))}
                              </span>
                            )}
                            {promotion.source && (
                              <Badge variant="secondary" className="text-xs">
                                {promotion.source}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Empty State */}
                {!loading && filteredPromotions.length === 0 && !error && (
                  <EmptyState
                    icon={Gift}
                    title={selectedType === 'all'
                      ? 'Nenhuma promoção não lida'
                      : `Nenhum alerta do tipo "${typeFilters.find(f => f.value === selectedType)?.label}"`}
                    description={showRead
                      ? 'Nenhuma promoção encontrada com os filtros atuais.'
                      : 'Clique em "Mostrar Lidos" para ver todas as promoções.'}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Price Alerts Tab */}
          <TabsContent value="prices">
            <PriceAlertsTab />
          </TabsContent>

          {/* Expiration Alerts Tab */}
          <TabsContent value="expirations">
            <ExpirationAlertsTab />
          </TabsContent>
        </Tabs>

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como funciona?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />
                <strong>Promoções:</strong> Atualizadas automaticamente em tempo real de fontes externas
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />
                <strong>Alertas de Preço:</strong> Configure alvos e seja notificado quando atingidos
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />
                <strong>Vencimentos:</strong> Monitore milhas próximas de expirar e tome ação
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />
                Receba notificações push de novas oportunidades
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
