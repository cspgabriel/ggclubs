import { KeyRound, ShieldCheck, ShieldX } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { PasswordStrengthMeter } from '@/components/auth/password-strength';
import { SeoHead } from '@/components/seo-head';
import { SiteFooter } from '@/components/site-footer';
import { PublicHeaderActions, SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';
import { PasswordInput } from '@/components/ui/password-input';
import { authErrorKey } from '@/lib/auth-errors';
import {
  MIN_PASSWORD_LENGTH,
  passwordRejection,
  passwordRejectionKey,
} from '@/lib/password-strength';

/**
 * Criar uma senha nova · **a página que o nosso e-mail aponta.**
 *
 * Até 24/08/2026 o link do e-mail de recuperação levava pra
 * `gg-clubs.firebaseapp.com/__/auth/action`: domínio que não é nosso, página que
 * não é nossa, em inglês. Quem está trancado do lado de fora da conta encontrava
 * uma tela que não parecia o produto · e esse é o pior momento possível pra
 * alguém duvidar de onde clicou.
 *
 * ## O token continua sendo do Firebase, e isso é decisão
 *
 * O `?code=` é o **`oobCode`** que o Admin SDK gerou · uso único e com prazo,
 * emitido por quem guarda a senha. Um token nosso no Mongo criaria um **segundo
 * caminho pra trocar credencial** e nos obrigaria a reimplementar expiração, uso
 * único e revogação em cima de um dado que continua sendo deles.
 *
 * O que a gente tomou pra si foi tudo o que a pessoa vê: o e-mail, o remetente,
 * o layout, o domínio e esta tela.
 *
 * ## Ela valida o código ANTES de mostrar o formulário
 *
 * `verifyPasswordResetCode` responde de quem é aquele código · com ele a tela
 * mostra o endereço e a pessoa confirma que está mexendo na conta certa. Sem
 * essa ida, um link vencido só falharia **depois** de alguém escolher a senha,
 * digitar duas vezes e apertar o botão · que é a hora mais cara possível pra
 * descobrir que precisa começar de novo.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const code = params.get('code') ?? '';

  const [state, setState] = useState<'checking' | 'ready' | 'saving' | 'done' | 'invalid'>(
    'checking',
  );
  /** De quem é este código · mostrado pra pessoa confirmar a conta. */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setState('invalid');
      return;
    }

    const ctrl = new AbortController();
    void (async () => {
      try {
        // O SDK vem na hora de usar · esta página é pública e o Firebase são
        // 161 kB. É a mesma razão do import tardio no formulário de login.
        const [{ firebaseAuth }, { verifyPasswordResetCode }] = await Promise.all([
          import('@/lib/firebase'),
          import('firebase/auth'),
        ]);
        const address = await verifyPasswordResetCode(firebaseAuth, code);
        if (ctrl.signal.aborted) return;
        setEmail(address);
        setState('ready');
      } catch {
        // **Um desfecho só pros três casos** (vencido, já usado, inventado) e é
        // de propósito: pra quem está aqui os três significam a mesma coisa ·
        // este link não serve mais, peça outro. Distinguir "já usado" de
        // "inventado" só ensinaria alguém testando código alheio.
        if (!ctrl.signal.aborted) setState('invalid');
      }
    })();
    return () => ctrl.abort();
  }, [code]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // A mesma régua do cadastro, na mesma peça · o piso e o "óbvio demais" são
    // recusa, e a faixa do meio é escolha legítima de quem está escolhendo.
    const rejection = passwordRejection(password, email);
    if (rejection) {
      setError(t(passwordRejectionKey(rejection)));
      return;
    }

    setState('saving');
    try {
      const [{ firebaseAuth }, { confirmPasswordReset }] = await Promise.all([
        import('@/lib/firebase'),
        import('firebase/auth'),
      ]);
      await confirmPasswordReset(firebaseAuth, code, password);
      setState('done');
    } catch (err) {
      /**
       * **A política de senha do projeto responde aqui**, e é por isso que o
       * erro do Firebase é traduzido em vez de virar uma frase genérica ·
       * `auth/password-does-not-meet-requirements` cai justamente em quem não
       * consegue entrar, e "não deu certo" deixaria a pessoa sem saber o que
       * mudar. O mapa já existe em `auth-errors`.
       */
      setError(t(`authErrors.${authErrorKey(err)}`));
      setState('ready');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* `noindex` pela mesma razão do descadastro: a URL carrega um segredo, e
          não há nada aqui pra buscar. */}
      <SeoHead title={t('resetPassword.title')} noindex />
      <SiteHeader actions={<PublicHeaderActions />} />
      <main className="container flex flex-1 items-center justify-center py-12">
        {state === 'checking' ? (
          <LoadingState />
        ) : state === 'invalid' ? (
          // **Toda tela terminal carrega uma saída** · aqui a saída é pedir
          // outro link, e ela leva direto pro formulário de recuperação em vez
          // de largar a pessoa no login pra procurar sozinha.
          <EmptyState
            icon={ShieldX}
            size="lg"
            tone="error"
            title={t('resetPassword.invalidTitle')}
            description={t('resetPassword.invalidBody')}
            action={{ label: t('resetPassword.askAgain'), to: '/login?recuperar=1' }}
            secondaryAction={{ label: t('resetPassword.homeCta'), to: '/' }}
          />
        ) : state === 'done' ? (
          <EmptyState
            icon={ShieldCheck}
            size="lg"
            tone="brand"
            title={t('resetPassword.doneTitle')}
            description={t('resetPassword.doneBody')}
            action={{ label: t('resetPassword.signInCta'), to: '/login' }}
          />
        ) : (
          <form onSubmit={(e) => void submit(e)} className="w-full max-w-sm space-y-4">
            <div className="space-y-2 text-center">
              <KeyRound className="mx-auto h-8 w-8 text-primary" aria-hidden />
              <h1 className="font-display text-2xl uppercase">{t('resetPassword.title')}</h1>
              {/* **O endereço aparece, e ele não é enfeite** · quem tem duas
                  contas precisa saber qual delas está mudando de senha antes de
                  escolher uma. */}
              <p className="text-sm text-muted-foreground">
                {t('resetPassword.forAccount', { email })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">{t('resetPassword.newPasswordLabel')}</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
                autoFocus
              />
              {/* Um substitui o outro, como no cadastro: a dica vale enquanto o
                  campo está vazio, e a partir da primeira tecla quem fala é o
                  medidor. A altura não muda e nada empurra o botão. */}
              {password ? (
                <PasswordStrengthMeter password={password} email={email} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('auth.signUpHint', { min: MIN_PASSWORD_LENGTH })}
                </p>
              )}
            </div>

            {/* `role="alert"` porque o erro nasce embaixo do botão que a pessoa
                acabou de apertar · sem o papel, quem usa leitor de tela aperta e
                recebe silêncio. Mesma lição de 22/08/2026 no login. */}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="cta"
              className="h-11 w-full"
              disabled={state === 'saving'}
            >
              {state === 'saving' ? t('resetPassword.saving') : t('resetPassword.submit')}
            </Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
