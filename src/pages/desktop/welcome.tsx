import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authCopy, type AuthMode } from '@/components/auth/auth-copy';
import { AuthLayout } from '@/components/auth/auth-layout';
import { SignInForm } from '@/components/auth/sign-in-form';

/**
 * Porta de entrada do app. **É o próprio login**, não uma apresentação com botão
 * pra ele: quem instalou já decidiu, e toda tela entre abrir e entrar é atrito.
 * É o que Riot, Steam e Discord fazem · cliente é porta, não folheto.
 *
 * O layout e o formulário são os mesmos do site · a diferença entre as duas
 * plataformas aqui é nenhuma, e essa é a intenção.
 */
export function DesktopWelcomePage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>('sign-in');

  return (
    <AuthLayout title={t(authCopy[mode].title)} subtitle={t(authCopy[mode].subtitle)}>
      <SignInForm onModeChange={setMode} />
    </AuthLayout>
  );
}
