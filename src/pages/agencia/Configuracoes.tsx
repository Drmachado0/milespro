import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Upload, Trash2, Loader2, Save, Globe, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { useAgencySettings, useUpdateAgencySettings } from '@/hooks/travel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { validateAvatarFile, getSafeFileExtension } from '@/lib/fileValidation';
import { getSafeErrorMessage } from '@/lib/errorSanitizer';
import { formatCNPJ, formatPhone, formatCEP } from '@/lib/formatters';
import { GoogleCalendarSettings } from '@/components/settings/GoogleCalendarSettings';

export default function AgenciaConfiguracoes() {
  const { user } = useAuth();
  const { data: settings, isLoading } = useAgencySettings();
  const updateSettings = useUpdateAgencySettings();

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name || '',
        cnpj: settings.cnpj || '',
        address: settings.address || '',
        city: settings.city || '',
        state: settings.state || '',
        zip_code: settings.zip_code || '',
        phone: settings.phone || '',
        email: settings.email || '',
        website: settings.website || '',
        logo_url: settings.logo_url || '',
      });
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file using our validation utility
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // Get safe file extension
    const fileExt = getSafeFileExtension(file.name);
    if (!fileExt) {
      toast.error('Tipo de arquivo inválido');
      return;
    }

    setUploading(true);
    try {
      // Use user-specific folder structure for RLS compliance
      const fileName = `agency-logo.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('milhas')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Since bucket is private, create a signed URL for access
      const { data: signedData, error: signedError } = await supabase.storage
        .from('milhas')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

      if (signedError) throw signedError;

      setFormData(prev => ({ ...prev, logo_url: signedData.signedUrl }));
      toast.success('Logo carregado com sucesso!');
    } catch (error: unknown) {
      toast.error(getSafeErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings.mutateAsync(formData);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Configurações da Agência">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configurações da Agência">
      <div className="space-y-6 max-w-3xl">
        <PageHeader
          eyebrow="Agência"
          icon={<Building2 className="h-5 w-5" />}
          title="Configurações da Agência"
          subtitle="Dados da empresa exibidos em orçamentos, faturas e comprovantes"
        />
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo e Nome */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados da Agência
            </CardTitle>
            <CardDescription>
              Estas informações serão exibidas em orçamentos, faturas e comprovantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={formData.logo_url} alt="Logo da agência" />
                <AvatarFallback className="bg-primary/10">
                  <Building2 className="h-10 w-10 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Label>Logo da Agência</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Carregar Logo
                  </Button>
                  {formData.logo_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover
                    </Button>
                  )}
                </div>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <p className="text-xs text-muted-foreground">PNG, JPG até 2MB</p>
              </div>
            </div>

            {/* Nome e CNPJ */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Agência *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da sua agência"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData(prev => ({ ...prev, cnpj: formatCNPJ(e.target.value) }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                    placeholder="(11) 99999-9999"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contato@agencia.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="www.suaagencia.com.br"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Rua, número, complemento"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="São Paulo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">CEP</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip_code: formatCEP(e.target.value) }))}
                  placeholder="00000-000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pré-visualização do Cabeçalho
            </CardTitle>
            <CardDescription>
              Assim aparecerá nos seus documentos PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo" loading="lazy" className="h-12 w-12 rounded-lg object-cover bg-white" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-white/20 flex items-center justify-center">
                      <Building2 className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg">{formData.name || 'Minha Agência'}</h3>
                    <p className="text-sm opacity-80">Agência de Viagem</p>
                  </div>
                </div>
                <div className="text-right text-sm opacity-80">
                  {formData.phone && <p>{formData.phone}</p>}
                  {formData.email && <p>{formData.email}</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button type="submit" disabled={updateSettings.isPending} className="w-full">
          {updateSettings.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>

        {/* Google Calendar Integration */}
        <GoogleCalendarSettings />
      </form>
      </div>
    </DashboardLayout>
  );
}
