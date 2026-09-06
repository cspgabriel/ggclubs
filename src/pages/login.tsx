import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { authCopy, type AuthMode } from '@/components/auth/auth-copy';
import { AuthLayout } from '@/components/auth/auth-layout';
import { SignInForm } from '@/components/auth/sign-in-form';
import { SeoHead } from '@/components/seo-head';

/**
 * **`?criar=1` abre direto no cadastro.** Quem chega por um botão escrito
 * "criar conta" não pode aterrissar no formulário de entrar · a página pública
 * do club tem três caminhos de cadastro e os três apontavam pro `/login` cru.
 *
 * É query e não rota nova de propósito: sobrevive a copiar o endereço e a um
 * F5, e não precisa entrar no mapa de idioma nem no `public-twin`. A palavra
 * segue a das outras rotas públicas (`/termos`, `/privacidade`), que são em
 * português.
 *
 * **`?recuperar=1` abre direto em "esqueci minha senha"** · 24/08/2026, e ele
 * existe pelo mesmo motivo do irmão. Quem chega de um link **vencido** de
 * recuperação precisa pedir outro, e mandar essa pessoa pro formulário de
 * entrar (onde ela já provou que não consegue entrar) obrigaria a achar sozinha
 * o "esqueci minha senha" · é a porta fechada que a pendência 118 custou uma vez.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(
    params.get('criar') ? 'sign-up' : params.get('recuperar') ? 'forgot-password' : 'sign-in',
  );

  return (
    <AuthLayout title={t(authCopy[mode].title)} subtitle={t(authCopy[mode].subtitle)}>
      {/* Sem isto, `/login` e `/es/login` eram conteudo duplicado pro Google
          em vez de traducoes uma da outra. O canonical descreve a tela de
          entrar mesmo quando ela abre no cadastro · e um so endereco, senao
          `?criar=1` viraria uma segunda pagina indexavel do mesmo conteudo. */}
      <SeoHead
        title={t(authCopy['sign-in'].title)}
        description={t(authCopy['sign-in'].subtitle)}
      />
      <SignInForm onModeChange={setMode} initialMode={mode} />
    </AuthLayout>
  );
}
