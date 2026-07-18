import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Plane, Loader2, Mail, KeyRound, AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRateLimit } from '@/hooks/useRateLimit';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { SupabaseAuthError, AUTH_ERROR_CODES } from '@/types/supabaseErrors';
import { Alert, AlertDescription } from '@/components/ui/alert';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .regex(/[a-z]/, 'A senha deve conter letras minúsculas')
  .regex(/[A-Z]/, 'A senha deve conter letras maiúsculas')
  .regex(/[0-9]/, 'A senha deve conter números')
  .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'A senha deve conter caracteres especiais');
const nameSchema = z.string().min(2, 'O nome deve ter pelo menos 2 caracteres');

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ email: '', password: '', fullName: '' });
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetData, setResetData] = useState({ password: '', confirmPassword: '' });
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { online: isOnline } = useNetworkStatus();
  const { canAttempt, blockedMinutesRemaining, recordAttempt, reset: resetRateLimit } = useRateLimit();

  useEffect(() => {
    if (user && !isResetMode) {
      navigate('/dashboard');
    }
  }, [user, navigate, isResetMode]);

  // Detectar modo de reset de senha
  useEffect(() => {
    const isReset = searchParams.get('reset') === 'true';
    
    if (isReset) {
      setIsResetMode(true);
      // Verificar se há uma sessão de recuperação ativa
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          toast({
            title: 'Link expirado',
            description: 'Solicite um novo link de recuperação de senha.',
            variant: 'destructive',
          });
          setIsResetMode(false);
        }
      });
    }
  }, [searchParams]);

  const switchToLogin = () => {
    setLoginData(prev => ({ ...prev, email: signupData.email }));
    setActiveTab('login');
  };

  const handleGoogleSignIn = async () => {
    if (!isOnline) {
      toast({
        title: 'Sem conexão',
        description: 'Verifique sua conexão com a internet e tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setIsGoogleLoading(false);
      toast({
        title: 'Erro',
        description: 'Não foi possível conectar com o Google. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOnline) {
      toast({
        title: 'Sem conexão',
        description: 'Verifique sua conexão com a internet e tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar rate limit
    if (!canAttempt) {
      toast({
        title: 'Acesso bloqueado',
        description: `Muitas tentativas de login. Tente novamente em ${blockedMinutesRemaining} minutos.`,
        variant: 'destructive',
      });
      return;
    }
    
    try {
      emailSchema.parse(loginData.email);
      passwordSchema.parse(loginData.password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: err.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    setIsLoading(false);

    if (error) {
      // Registrar tentativa falha
      recordAttempt();
      
      let message = 'Erro ao fazer login';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Email ou senha incorretos';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Por favor, confirme seu email antes de fazer login';
      }
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } else {
      // Resetar rate limit após login bem-sucedido
      resetRateLimit();
      // P2 — Greeting without name: the `user` from useAuth() is stale here
      // (AuthProvider state hasn't propagated yet between awaiting signIn and
      // this branch firing), so `user.user_metadata.full_name` was always
      // falling through to the email-local fallback. Dropping the name keeps
      // the greeting honest without depending on cross-render state.
      const hour = new Date().getHours();
      const greeting = hour < 5 ? 'Boa madrugada' : hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
      toast({
        title: `${greeting}!`,
        description: 'Você entrou com sucesso. Que bom ter você de volta!',
      });
      navigate('/dashboard');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOnline) {
      toast({
        title: 'Sem conexão',
        description: 'Verifique sua conexão com a internet e tente novamente.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      nameSchema.parse(signupData.fullName);
      emailSchema.parse(signupData.email);
      passwordSchema.parse(signupData.password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: err.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);
    const { error, data } = await signUp(signupData.email, signupData.password, signupData.fullName);
    setIsLoading(false);

    if (error) {
      const authError = error as SupabaseAuthError;
      let message = 'Erro ao criar conta';
      let shouldSwitchToLogin = false;
      
      // Mapear diferentes tipos de erro do Supabase
      if (error.message.includes('User already registered')) {
        message = 'Este email já está cadastrado.';
        shouldSwitchToLogin = true;
      } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
        message = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
      } else if (error.message.includes('invalid') && error.message.includes('email')) {
        message = 'Email inválido. Verifique o formato do email.';
      } else if (error.message.includes('Password should') || error.message.includes('password') || error.message.includes('weak') || authError.code === AUTH_ERROR_CODES.WEAK_PASSWORD) {
        const reasons = authError.weak_password?.reasons || authError.reasons || [];
        if (reasons.includes('length')) {
          message = 'A senha deve ter pelo menos 8 caracteres.';
        } else if (reasons.includes('characters')) {
          message = 'A senha deve conter maiúsculas, minúsculas, números e símbolos.';
        } else if (reasons.includes('pwned')) {
          message = 'Esta senha é muito comum. Escolha uma senha mais exclusiva.';
        } else {
          message = 'A senha deve ter 8+ caracteres, com maiúsculas, minúsculas, números e símbolos.';
        }
      } else if (authError.status === 422) {
        message = 'Este email já está cadastrado.';
        shouldSwitchToLogin = true;
      } else if (authError.status === 429) {
        message = 'Limite de tentativas excedido. Aguarde alguns minutos.';
      }
      
      toast({
        title: shouldSwitchToLogin ? 'Email já cadastrado' : 'Erro',
        description: shouldSwitchToLogin 
          ? `${message} Tente fazer login ou recuperar sua senha.`
          : message,
        variant: 'destructive',
      });
      
      if (shouldSwitchToLogin) {
        switchToLogin();
      }
    } else if (data?.user && !data?.session) {
      // Usuário criado mas precisa confirmar email
      toast({
        title: 'Quase lá!',
        description: 'Verifique seu email para confirmar sua conta.',
      });
    } else if (data?.session) {
      // Login automático após signup (auto-confirm ativado)
      toast({
        title: 'Conta criada',
        description: 'Bem-vindo ao MilesPro! Vamos começar a configurar sua conta.',
      });
      navigate('/dashboard');
    }
  };

  const handleForgotPassword = async () => {
    if (!isOnline) {
      toast({
        title: 'Sem conexão',
        description: 'Verifique sua conexão com a internet.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!loginData.email) {
      toast({
        title: 'Informe seu email',
        description: 'Digite seu email no campo acima para receber o link de recuperação.',
        variant: 'destructive',
      });
      return;
    }

    try {
      emailSchema.parse(loginData.email);
    } catch {
      toast({
        title: 'Email inválido',
        description: 'Verifique o formato do email.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(loginData.email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o email. Tente novamente.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada para redefinir a senha.',
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOnline) {
      toast({
        title: 'Sem conexão',
        description: 'Verifique sua conexão com a internet.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validar senha
    try {
      passwordSchema.parse(resetData.password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Senha inválida',
          description: err.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }
    
    // Verificar se senhas coincidem
    if (resetData.password !== resetData.confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'Digite a mesma senha nos dois campos.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    const { error } = await supabase.auth.updateUser({
      password: resetData.password,
    });
    
    setIsLoading(false);
    
    if (error) {
      const authError = error as SupabaseAuthError;
      let message = 'Não foi possível atualizar a senha. Tente novamente.';
      if (authError.code === AUTH_ERROR_CODES.WEAK_PASSWORD || error.message.includes('weak')) {
        message = 'A senha deve ter 8+ caracteres, com maiúsculas, minúsculas, números e símbolos.';
      } else if (error.message.includes('same_password')) {
        message = 'A nova senha deve ser diferente da anterior.';
      }
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Senha atualizada!',
        description: 'Sua senha foi alterada com sucesso.',
      });
      setIsResetMode(false);
      setResetData({ password: '', confirmPassword: '' });
      navigate('/dashboard');
    }
  };

  // Formulário de reset de senha
  if (isResetMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">Nova Senha</CardTitle>
            <CardDescription>
              Digite sua nova senha abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password">Nova Senha</Label>
                <PasswordInput
                  id="reset-password"
                  placeholder="••••••••"
                  value={resetData.password}
                  onChange={(e) => setResetData({ ...resetData, password: e.target.value })}
                  required
                />
                <PasswordStrengthIndicator password={resetData.password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm">Confirmar Senha</Label>
                <PasswordInput
                  id="reset-confirm"
                  placeholder="••••••••"
                  value={resetData.confirmPassword}
                  onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar Senha'
                )}
              </Button>
              <Button 
                type="button" 
                variant="link" 
                className="w-full text-muted-foreground"
                onClick={() => {
                  setIsResetMode(false);
                  setResetData({ password: '', confirmPassword: '' });
                  navigate('/auth');
                }}
              >
                Voltar para login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Plane className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">MilesPro</CardTitle>
          <CardDescription>
            Gerencie suas milhas de forma inteligente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <div className="mt-4 space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  Continuar com Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                {!canAttempt && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Muitas tentativas de login. Tente novamente em {blockedMinutesRemaining} minutos.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <PasswordInput
                      id="login-password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading || !canAttempt}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="link" 
                    className="w-full text-muted-foreground"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Esqueceu a senha?
                  </Button>
                </form>
              </div>
            </TabsContent>
            
            <TabsContent value="signup">
              <div className="mt-4 space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  Continuar com Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      value={signupData.fullName}
                      onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <PasswordInput
                      id="signup-password"
                      placeholder="••••••••"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                    />
                    <PasswordStrengthIndicator password={signupData.password} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar Conta'
                    )}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
