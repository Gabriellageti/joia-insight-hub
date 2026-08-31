import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});
  const [signupErrors, setSignupErrors] = useState<{ name?: string; email?: string; password?: string; confirm?: string }>({});
  const loginEmailRef = useRef<HTMLInputElement>(null);
  const loginPasswordRef = useRef<HTMLInputElement>(null);
  const signupNameRef = useRef<HTMLInputElement>(null);
  const signupEmailRef = useRef<HTMLInputElement>(null);
  const signupPasswordRef = useRef<HTMLInputElement>(null);
  const signupConfirmRef = useRef<HTMLInputElement>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = {
      ...(!loginEmail.trim() ? { email: 'Informe seu e-mail.' } : {}),
      ...(!loginPassword ? { password: 'Informe sua senha.' } : {}),
    };
    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) {
      (errors.email ? loginEmailRef : loginPasswordRef).current?.focus();
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Por favor, confirme seu email antes de fazer login');
      } else {
        toast.error('Não foi possível entrar. Tente novamente.');
      }
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = {
      ...(!signupName.trim() ? { name: 'Informe seu nome completo.' } : {}),
      ...(!signupEmail.trim() ? { email: 'Informe seu e-mail.' } : {}),
      ...(!signupPassword ? { password: 'Informe uma senha.' } : signupPassword.length < 8 ? { password: 'Use pelo menos 8 caracteres.' } : {}),
      ...(!signupConfirmPassword ? { confirm: 'Confirme sua senha.' } : signupPassword !== signupConfirmPassword ? { confirm: 'As senhas não coincidem.' } : {}),
    };
    setSignupErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstInvalid = errors.name
        ? signupNameRef
        : errors.email
          ? signupEmailRef
          : errors.password
            ? signupPasswordRef
            : signupConfirmRef;
      firstInvalid.current?.focus();
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setIsLoading(false);

    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Não foi possível criar a conta. Tente novamente.');
      }
    } else {
      toast.success('Conta criada! Verifique seu email para confirmar o cadastro.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Joia Labs</h1>
          <p className="text-muted-foreground mt-2">
            Não é sobre gastar mais. É sobre parar de perder.
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger className="text-foreground/80 data-[state=active]:text-foreground" value="login">Entrar</TabsTrigger>
              <TabsTrigger className="text-foreground/80 data-[state=active]:text-foreground" value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardHeader>
                  <CardTitle>Bem-vindo de volta</CardTitle>
                  <CardDescription>
                    Entre com suas credenciais para acessar o sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      ref={loginEmailRef}
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      autoComplete="email"
                      aria-invalid={Boolean(loginErrors.email)}
                      aria-describedby={loginErrors.email ? 'login-email-error' : undefined}
                    />
                    {loginErrors.email && <p id="login-email-error" className="text-sm text-destructive">{loginErrors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      ref={loginPasswordRef}
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      autoComplete="current-password"
                      aria-invalid={Boolean(loginErrors.password)}
                      aria-describedby={loginErrors.password ? 'login-password-error' : undefined}
                    />
                    {loginErrors.password && <p id="login-password-error" className="text-sm text-destructive">{loginErrors.password}</p>}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup}>
                <CardHeader>
                  <CardTitle>Criar conta</CardTitle>
                  <CardDescription>
                    Preencha os dados para criar sua conta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input
                      ref={signupNameRef}
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      disabled={isLoading}
                      required
                      autoComplete="name"
                      aria-invalid={Boolean(signupErrors.name)}
                      aria-describedby={signupErrors.name ? 'signup-name-error' : undefined}
                    />
                    {signupErrors.name && <p id="signup-name-error" className="text-sm text-destructive">{signupErrors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      ref={signupEmailRef}
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      autoComplete="email"
                      aria-invalid={Boolean(signupErrors.email)}
                      aria-describedby={signupErrors.email ? 'signup-email-error' : undefined}
                    />
                    {signupErrors.email && <p id="signup-email-error" className="text-sm text-destructive">{signupErrors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      ref={signupPasswordRef}
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      aria-invalid={Boolean(signupErrors.password)}
                      aria-describedby={signupErrors.password ? 'signup-password-error' : undefined}
                    />
                    {signupErrors.password && <p id="signup-password-error" className="text-sm text-destructive">{signupErrors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmar senha</Label>
                    <Input
                      ref={signupConfirmRef}
                      id="signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      aria-invalid={Boolean(signupErrors.confirm)}
                      aria-describedby={signupErrors.confirm ? 'signup-confirm-error' : undefined}
                    />
                    {signupErrors.confirm && <p id="signup-confirm-error" className="text-sm text-destructive">{signupErrors.confirm}</p>}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar conta'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
