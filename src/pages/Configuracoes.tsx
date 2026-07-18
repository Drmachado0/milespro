import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useThemeSync } from '@/hooks/useThemeSync';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateAvatarFile, getSafeFileExtension } from '@/lib/fileValidation';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import {
  useLocalization,
  CURRENCY_OPTIONS,
  NUMBER_FORMAT_OPTIONS,
  DATE_FORMAT_OPTIONS,
  LANGUAGE_OPTIONS,
  TIMEZONE_OPTIONS,
  type Currency,
  type NumberFormat,
  type DateFormat,
  type Language,
} from '@/hooks/useLocalization';
import { TranslationKeys } from '@/locales';
import {
  User,
  Bell,
  Moon,
  Sun,
  Save,
  LogOut,
  Shield,
  Loader2,
  Key,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  Upload,
  X,
  Globe,
  Calendar,
  DollarSign,
  Clock,
  Languages,
  Download,
  Mail,
} from 'lucide-react';
import { logger } from '@/lib/logger';

export default function Configuracoes() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { settings, updateSettings, getPreviewCurrency, getPreviewDate, t } = useLocalization();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Profile state
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Notification preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const stored = localStorage.getItem('milespro-notifications');
    return stored === 'true';
  });
  const [emailNotifications, setEmailNotifications] = useState(() => {
    const stored = localStorage.getItem('milespro-email-notifications');
    return stored !== 'false';
  });
  
  // Browser notification permission state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  
  // Check browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);
  
  // Theme preference — read/write via next-themes (canonical source-of-truth
  // shared with Header dropdown and useThemeSync DB persistence). Previously
  // this component owned its own darkMode state via a parallel localStorage
  // key ('milespro-theme'), so the toggle showed "off" while next-themes had
  // already applied dark mode from system/profile preference — sas.txt P2.
  const { resolvedTheme, setTheme } = useThemeSync();
  const darkMode = resolvedTheme === 'dark';
  const setDarkMode = (next: boolean) => setTheme(next ? 'dark' : 'light');

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Delete data state (LGPD Art. 18 VI — exclusion request via email confirmation)
  const [deletingData, setDeletingData] = useState(false);

  // Export data state (LGPD Art. 18 II + V — access + portability)
  const [exportingData, setExportingData] = useState(false);
  
  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setFullName(data.full_name || '');
          setAvatarUrl(data.avatar_url || '');
        }
      } catch (err) {
        logger.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [user]);

  // Theme apply + persistence handled by next-themes (via useThemeSync).

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast({
        title: t('settings.profileSaved'),
        description: t('success.settingsSaved'),
      });
    } catch (err) {
      logger.error('Error saving profile:', err);
      toast({
        title: t('common.error'),
        description: t('errors.generic'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'denied') {
        toast({
          title: 'Permissão negada',
          description: 'Clique no ícone de cadeado 🔒 na barra de endereço para permitir notificações.',
          variant: 'destructive',
        });
        return;
      }
      
      if (permission !== 'granted') {
        return;
      }
    }
    
    setNotificationsEnabled(enabled);
    localStorage.setItem('milespro-notifications', enabled.toString());
    
    toast({
      title: enabled ? 'Notificações ativadas' : 'Notificações desativadas',
      description: enabled 
        ? 'Você receberá alertas de novas promoções.'
        : 'Você não receberá mais notificações push.',
    });
  };

  const handleEmailNotificationsToggle = (enabled: boolean) => {
    setEmailNotifications(enabled);
    localStorage.setItem('milespro-email-notifications', enabled.toString());
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    // Validate file using our validation utility
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      toast({
        title: 'Arquivo inválido',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    // Get safe file extension
    const fileExt = getSafeFileExtension(file.name);
    if (!fileExt) {
      toast({
        title: 'Tipo inválido',
        description: 'Por favor, selecione uma imagem válida.',
        variant: 'destructive',
      });
      return;
    }
    
    setUploadingAvatar(true);
    try {
      const fileName = `${user.id}/avatar.${fileExt}`;
      
      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setAvatarUrl(publicUrl);
      toast({
        title: 'Avatar atualizado',
        description: 'Sua foto foi salva com sucesso.',
      });
    } catch (err: unknown) {
      logger.error('Error uploading avatar:', err);
      toast({
        title: 'Erro ao enviar',
        description: getSafeErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    
    setUploadingAvatar(true);
    try {
      // List and delete files in user folder
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(user.id);
      
      if (files && files.length > 0) {
        const filesToRemove = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToRemove);
      }
      
      // Update profile
      await supabase
        .from('profiles')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      
      setAvatarUrl('');
      toast({
        title: 'Avatar removido',
        description: 'Sua foto foi removida.',
      });
    } catch (err: unknown) {
      logger.error('Error removing avatar:', err);
      toast({
        title: 'Erro ao remover',
        description: getSafeErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast({
        title: 'Senha atual obrigatória',
        description: 'Digite sua senha atual para confirmar a alteração.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A nova senha deve ter pelo menos 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);
    try {
      // Reauthenticate user before password change
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (reauthError) {
        toast({
          title: 'Senha atual incorreta',
          description: 'Verifique sua senha atual e tente novamente.',
          variant: 'destructive',
        });
        setChangingPassword(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });


      if (error) throw error;

      toast({
        title: t('settings.passwordChanged'),
        description: t('success.settingsSaved'),
      });
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err: unknown) {
      logger.error('Error changing password:', err);
      toast({
        title: 'Erro ao alterar senha',
        description: getSafeErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  /**
   * LGPD Art. 18 II + V — Data access + portability (COMPL-01).
   * Calls the lgpd-export edge function and downloads the user's data
   * bundle as a JSON file. Rate-limited 1/hour/user server-side.
   */
  const handleExportData = async () => {
    if (!user) return;

    setExportingData(true);
    try {
      const { data, error } = await supabase.functions.invoke('lgpd-export', {
        method: 'POST',
      });

      if (error) throw error;
      if (!data) throw new Error('Resposta vazia do servidor');

      const filename = `milespro-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Dados exportados',
        description: 'Seu arquivo foi baixado. Limite: 1 exportação por hora.',
      });
    } catch (err: unknown) {
      logger.error('[lgpd-export] failed', err);
      toast({
        title: 'Erro ao exportar dados',
        description: getSafeErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setExportingData(false);
    }
  };

  /**
   * LGPD Art. 18 VI — Account deletion request (COMPL-02 / D-18).
   * Invokes the lgpd-delete edge function with action=request, which:
   *  1. Marks profiles.deletion_requested_at = now()
   *  2. Sends a confirmation email with an HMAC-signed token
   *  3. Opens a 7-day cancellation window after the user clicks the link
   *
   * Replaces the previous client-side bulk DELETE that bypassed the audit
   * trail (deletion_audit row), the email double-confirmation, and the 7-day
   * reversal window — all of which are required by COMPL-02.
   */
  const handleRequestAccountDeletion = async () => {
    if (!user) return;

    setDeletingData(true);
    try {
      const { error } = await supabase.functions.invoke('lgpd-delete?action=request', {
        method: 'POST',
      });

      if (error) throw error;

      toast({
        title: 'Confirmação enviada por e-mail',
        description:
          'Enviamos um link de confirmação para o seu e-mail. Você tem 24h para confirmar. Após a confirmação, ainda há uma janela de 7 dias para reverter pelo dpo@milespro.net.br.',
      });
    } catch (err: unknown) {
      logger.error('[lgpd-delete request] failed', err);
      toast({
        title: 'Erro ao solicitar exclusão',
        description: getSafeErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setDeletingData(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title={t('settings.title')}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('settings.title')}>
      <div className="space-y-6 max-w-2xl">
        <PageHeader
          eyebrow="Sistema"
          title={t('settings.title')}
          subtitle="Perfil, preferências e integrações"
          icon={<User className="h-4 w-4" />}
        />

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('settings.profile')}
            </CardTitle>
            <CardDescription>
              Nome de exibição, e-mail e foto de perfil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('settings.email')}</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('settings.fullName')}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('settings.avatar')}</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div className="flex-1">
                  <Label
                    htmlFor="avatar-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingAvatar ? t('common.loading') : t('settings.uploadPhoto')}
                  </Label>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG ou GIF. Máximo 2MB.
                  </p>
                </div>
              </div>
            </div>
            
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {t('settings.saveProfile')}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {t('settings.notifications')}
            </CardTitle>
            <CardDescription>
              Como você prefere receber avisos de vencimento e promoções.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">{t('settings.pushNotifications')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.pushDescription')}
                </p>
                {notificationPermission === 'denied' && (
                  <div className="mt-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive font-medium">
                      Notificações bloqueadas pelo navegador
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Para reativar, clique no ícone de cadeado 🔒 na barra de endereço do navegador
                      e altere a permissão de notificações para "Permitir".
                    </p>
                  </div>
                )}
                {notificationPermission === 'unsupported' && (
                  <p className="text-xs text-destructive mt-1">
                    Seu navegador não suporta notificações push.
                  </p>
                )}
              </div>
              <Switch
                id="push-notifications"
                checked={notificationsEnabled && notificationPermission === 'granted'}
                onCheckedChange={handleToggleNotifications}
                disabled={notificationPermission === 'denied' || notificationPermission === 'unsupported'}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">{t('settings.emailNotifications')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.emailDescription')}
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={handleEmailNotificationsToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              {t('settings.appearance')}
            </CardTitle>
            <CardDescription>
              Tema claro ou escuro do MilesPro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">{t('settings.darkTheme')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.theme')}
                </p>
              </div>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
          </CardContent>
        </Card>

        {/* Localization Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t('settings.localization')}
            </CardTitle>
            <CardDescription>
              Idioma, moeda, formato de número e data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Currency Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <Label>{t('settings.currency')}</Label>
              </div>
              <Select
                value={settings.currency}
                onValueChange={(value: Currency) => updateSettings({ currency: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a moeda" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground">{option.symbol}</span>
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Símbolo e código ISO serão aplicados em todos os valores monetários
              </p>
            </div>

            <Separator />

            {/* Number Format */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-muted-foreground" />
                <Label>{t('settings.numberFormat')}</Label>
              </div>
              <Select
                value={settings.numberFormat}
                onValueChange={(value: NumberFormat) => updateSettings({ numberFormat: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o formato" />
                </SelectTrigger>
                <SelectContent>
                  {NUMBER_FORMAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-3">
                        <span>{option.label}</span>
                        <span className="text-muted-foreground font-mono text-xs">{option.example}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <span className="text-xs text-muted-foreground">{t('settings.preview')}:</span>
                <span className="font-mono text-sm">{getPreviewCurrency()}</span>
              </div>
            </div>

            <Separator />

            {/* Date Format */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Label>{t('settings.dateFormat')}</Label>
              </div>
              <Select
                value={settings.dateFormat}
                onValueChange={(value: DateFormat) => updateSettings({ dateFormat: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o formato" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-3">
                        <span>{option.label}</span>
                        <span className="text-muted-foreground font-mono text-xs">{option.example}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <span className="text-xs text-muted-foreground">Data atual:</span>
                <span className="font-mono text-sm">{getPreviewDate()}</span>
              </div>
            </div>

            <Separator />

            {/* Language */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <Label>{t('settings.language')}</Label>
              </div>
              <Select
                value={settings.language}
                onValueChange={(value: Language) => updateSettings({ language: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o idioma" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span>{option.flag}</span>
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Afeta pluralização dinâmica (ex: "1 assinatura", "2 assinaturas")
              </p>
            </div>

            <Separator />

            {/* Timezone */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Label>{t('settings.timezone')}</Label>
              </div>
              <Select
                value={settings.timezone}
                onValueChange={(value) => updateSettings({ timezone: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o fuso horário" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span>{option.label}</span>
                        <span className="text-muted-foreground text-xs">({option.offset})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Usado para exibição e agendamento de dados
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t('settings.security')}
            </CardTitle>
            <CardDescription>
              {t('settings.security')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Password Change */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    {t('settings.changePassword')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.changePassword')}
                  </p>
                </div>
                {!showPasswordForm && (
                  <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
                    Alterar
                  </Button>
                )}
              </div>
              
              {showPasswordForm && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Senha Atual</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Digite sua senha atual"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('settings.newPassword')}</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('settings.confirmPassword')}</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                    >
                      {changingPassword ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Key className="w-4 h-4 mr-2" />
                      )}
                      {t('settings.savePassword')}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Current Session */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Sessão atual</p>
                <p className="text-sm text-muted-foreground">
                  Conectado como {user?.email}
                </p>
              </div>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                {t('settings.logout')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* LGPD — Seus dados pessoais (Art. 18) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Seus dados pessoais (LGPD)
            </CardTitle>
            <CardDescription>
              Você pode exportar uma cópia completa dos seus dados ou solicitar a
              exclusão definitiva da sua conta a qualquer momento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export — Art. 18 II + V */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <p className="font-medium">Exportar meus dados</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Baixe um arquivo JSON com perfil, assinatura, operações,
                  programas e histórico de consentimento. Limite: 1 por hora.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleExportData}
                disabled={exportingData}
              >
                {exportingData ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Exportar
              </Button>
            </div>

            <Separator />

            {/* Delete — Art. 18 VI (email-confirmation flow, D-18) */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                  <p className="font-medium">Excluir minha conta</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enviamos um e-mail de confirmação. Após confirmar, sua conta é
                  excluída em 7 dias — você pode reverter dentro desse prazo
                  escrevendo para dpo@milespro.net.br.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deletingData}>
                    {deletingData ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Solicitar exclusão
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Solicitar exclusão da conta
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>
                        Vamos enviar um link de confirmação para o seu e-mail
                        cadastrado. O processo é:
                      </p>
                      <ol className="list-decimal list-inside text-sm space-y-1 mt-2">
                        <li>Você recebe o e-mail (válido por 24h)</li>
                        <li>Clica no link e confirma a exclusão</li>
                        <li>Janela de 7 dias para reverter via dpo@milespro.net.br</li>
                        <li>Após 7 dias, todos os dados são removidos definitivamente</li>
                      </ol>
                      <p className="text-xs text-muted-foreground pt-2">
                        Sua assinatura paga (se houver) será cancelada na Asaas.
                        Recomendamos exportar seus dados antes.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRequestAccountDeletion}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Enviar e-mail de confirmação
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">MilesPro</p>
              <p>Versão 1.0.0</p>
              <p className="mt-2">
                Gerencie suas milhas e pontos de fidelidade com inteligência
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
