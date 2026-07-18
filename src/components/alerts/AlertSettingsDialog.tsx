import { useState, useEffect } from 'react';
import { Settings2, Volume2, VolumeX, Clock, Bell, BellOff, Check, ExternalLink, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAlertSettings } from '@/hooks/useAlertSettings';
import { toast } from '@/hooks/use-toast';

const INTERVAL_OPTIONS = [
  { value: '5', label: '5 minutos' },
  { value: '15', label: '15 minutos' },
  { value: '30', label: '30 minutos' },
  { value: '60', label: '1 hora' },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: `${i.toString().padStart(2, '0')}:00`,
  label: `${i.toString().padStart(2, '0')}:00`,
}));

export function AlertSettingsDialog() {
  const { 
    settings, 
    updateSettings, 
    isUpdating,
    AVAILABLE_SOURCES, 
    AVAILABLE_TYPES 
  } = useAlertSettings();
  
  const [open, setOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
    }
  }, [open, settings]);

  const handleSave = () => {
    updateSettings(localSettings);
    toast({ title: 'Configurações salvas', description: 'Suas preferências de alertas foram atualizadas.' });
    setOpen(false);
  };

  const handleDisableAll = () => {
    setLocalSettings({ ...localSettings, alerts_enabled: false });
    toast({ title: 'Alertas desativados', description: 'Todos os alertas foram desligados.' });
  };

  const handleSourceToggle = (source: string) => {
    const current = localSettings.enabled_sources || [];
    const updated = current.includes(source)
      ? current.filter(s => s !== source)
      : [...current, source];
    setLocalSettings({ ...localSettings, enabled_sources: updated });
  };

  const handleTypeToggle = (type: string) => {
    const current = localSettings.enabled_types || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    setLocalSettings({ ...localSettings, enabled_types: updated });
  };

  const handleSelectAllSources = () => {
    setLocalSettings({ ...localSettings, enabled_sources: [...AVAILABLE_SOURCES] });
  };

  const handleDeselectAllSources = () => {
    setLocalSettings({ ...localSettings, enabled_sources: [] });
  };

  const handleSelectAllTypes = () => {
    setLocalSettings({ ...localSettings, enabled_types: AVAILABLE_TYPES.map(t => t.value) });
  };

  const handleDeselectAllTypes = () => {
    setLocalSettings({ ...localSettings, enabled_types: [] });
  };

  const handleSourceUrlChange = (source: string, url: string) => {
    const currentUrls = localSettings.source_urls || {};
    setLocalSettings({
      ...localSettings,
      source_urls: { ...currentUrls, [source]: url }
    });
  };

  const openSourceUrl = (source: string) => {
    const url = localSettings.source_urls?.[source];
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Configurações
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configurações de Alertas
          </DialogTitle>
          <DialogDescription>
            Personalize como e quando você recebe notificações de promoções.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Disable All Alerts Button */}
          {localSettings.alerts_enabled && (
            <Button 
              variant="destructive" 
              className="w-full gap-2"
              onClick={handleDisableAll}
            >
              <Power className="h-4 w-4" />
              Desligar Todos os Alertas
            </Button>
          )}

          {/* Main Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Alertas Ativos</Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações de novas promoções
              </p>
            </div>
            <Switch
              checked={localSettings.alerts_enabled}
              onCheckedChange={(checked) => 
                setLocalSettings({ ...localSettings, alerts_enabled: checked })
              }
            />
          </div>

          <Separator />

          {/* Fetch Interval */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Intervalo de Atualização
            </Label>
            <Select
              value={String(localSettings.fetch_interval)}
              onValueChange={(value) => 
                setLocalSettings({ ...localSettings, fetch_interval: Number(value) })
              }
              disabled={!localSettings.alerts_enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quiet Hours */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <BellOff className="h-4 w-4" />
              Horário Silencioso
            </Label>
            <div className="flex items-center gap-2">
              <Select
                value={localSettings.quiet_hours_start}
                onValueChange={(value) => 
                  setLocalSettings({ ...localSettings, quiet_hours_start: value })
                }
                disabled={!localSettings.alerts_enabled}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">até</span>
              <Select
                value={localSettings.quiet_hours_end}
                onValueChange={(value) => 
                  setLocalSettings({ ...localSettings, quiet_hours_end: value })
                }
                disabled={!localSettings.alerts_enabled}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Notificações não serão enviadas durante este período
            </p>
          </div>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {localSettings.sound_enabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              <Label>Som nas Notificações</Label>
            </div>
            <Switch
              checked={localSettings.sound_enabled}
              onCheckedChange={(checked) => 
                setLocalSettings({ ...localSettings, sound_enabled: checked })
              }
              disabled={!localSettings.alerts_enabled}
            />
          </div>

          <Separator />

          {/* Sources */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fontes de Alertas</Label>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={handleSelectAllSources}
                  disabled={!localSettings.alerts_enabled}
                >
                  Todos
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={handleDeselectAllSources}
                  disabled={!localSettings.alerts_enabled}
                >
                  Nenhum
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {AVAILABLE_SOURCES.map(source => (
                <div key={source} className="space-y-2 p-3 rounded-lg border bg-card">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`source-${source}`}
                      checked={localSettings.enabled_sources?.includes(source)}
                      onCheckedChange={() => handleSourceToggle(source)}
                      disabled={!localSettings.alerts_enabled}
                    />
                    <label
                      htmlFor={`source-${source}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                    >
                      {source}
                    </label>
                  </div>
                  {localSettings.enabled_sources?.includes(source) && (
                    <div className="flex items-center gap-2 pl-6">
                      <Input
                        type="url"
                        placeholder="https://..."
                        value={localSettings.source_urls?.[source] || ''}
                        onChange={(e) => handleSourceUrlChange(source, e.target.value)}
                        className="h-8 text-xs"
                        disabled={!localSettings.alerts_enabled}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => openSourceUrl(source)}
                        disabled={!localSettings.source_urls?.[source]}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Types */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Tipos de Alertas</Label>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={handleSelectAllTypes}
                  disabled={!localSettings.alerts_enabled}
                >
                  Todos
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={handleDeselectAllTypes}
                  disabled={!localSettings.alerts_enabled}
                >
                  Nenhum
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_TYPES.map(type => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={localSettings.enabled_types?.includes(type.value)}
                    onCheckedChange={() => handleTypeToggle(type.value)}
                    disabled={!localSettings.alerts_enabled}
                  />
                  <label
                    htmlFor={`type-${type.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isUpdating} className="gap-2">
            <Check className="h-4 w-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
