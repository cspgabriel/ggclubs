import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { type AuthMode } from '@/components/auth/auth-copy';
import { PasswordStrengthMeter } from '@/components/auth/password-strength';
import {
  MIN_PASSWORD_LENGTH,
  passwordRejection,
  passwordRejectionKey,
} from '@/lib/password-strength';
import { GoogleIcon } from '@/components/icons/google';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { asLanguage } from '@/i18n/language';
import { api } from '@/lib/api';
import { authErrorKey, isUserCancelledAuth } from '@/lib/auth-errors';
import { cancelGoogleSignIn, isGoogleSignInAvailable } from '@/lib/google-signin';
import { useAuth } from '@/lib/use-auth';

/**
 * Entrar na conta ou criar uma. Mora fora da página porque existem duas portas:
 * o `/login` do site e a tela de entrada do app desktop · e login duplicado é
 * como as duas começam a divergir em silêncio.
 *
 * Ele não decide pra onde ir depois de entrar: quem faz isso é o `GuestRoute`
 * que envolve as duas portas. Formulário sabe autenticar, rota sabe quem pode
 * estar ali.
 *
 * `onModeChange` existe pra quem envolve o formulário poder trocar o próprio
 * título · o modo é estado daqui, mas o cabeçalho é de quem chama.
 *
 * `initialMode` existe porque **quem clica em "criar conta" não pode cair no
 * formulário de entrar** · era o que acontecia com os três caminhos de cadastro
 * da página pública do club, os três apontando pro `/login` cru. A pessoa lia
 * "Criar conta", chegava numa tela escrita "Entrar" e tinha que achar sozinha o
 * link de trocar. Numa página de aquisição, isso é o funil vazando no último
 * passo.
 */
export function SignInForm({
  onModeChange,
  initialMode = 'sign-in',
}: {
  onModeChange?: (mode: AuthMode) => void;
  initialMode?: AuthMode;
}) {
  const { t, i18n } = useTranslation();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const signingUp = mode === 'sign-up';

  function switchMode(next: AuthMode) {
    setMode(next);
    setError(null);
    setInfo(null);
    onModeChange?.(next);
  }

  // Não zera `submitting` no sucesso de propósito: a sessão resolve logo em
  // seguida e o GuestRoute troca de tela · devolver o botão antes disso convida
  // a um segundo envio no meio do caminho.
  async function onSubmitCredentials(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    // Só no cadastro: em quem já tem conta, recusar a senha existente seria
    // trancar a pessoa do lado de fora por uma regra criada depois dela.
    const rejection = signingUp ? passwordRejection(password, email) : null;
    if (rejection) {
      setError(t(passwordRejectionKey(rejection)));
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'sign-up') await signUp(email, password);
      else await signIn(email, password);
    } catch (err) {
      setError(t(`authErrors.${authErrorKey(err)}`));
      setSubmitting(false);
    }
  }

  // O Firebase leva alguns segundos pra perceber que o popup foi fechado. Sem
  // este contador, a rejeição atrasada de uma tentativa abandonada voltaria a
  // mexer na tela depois que a pessoa já seguiu em frente.
  const googleAttempt = useRef(0);

  async function onGoogle() {
    setError(null);
    setInfo(null);
    const attempt = ++googleAttempt.current;
    setGooglePending(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (googleAttempt.current !== attempt) return;
      if (!isUserCancelledAuth(err)) setError(t(`authErrors.${authErrorKey(err)}`));
    } finally {
      if (googleAttempt.current === attempt) setGooglePending(false);
    }
  }

  async function onResetPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email) {
      setError(t('auth.resetMissingEmail'));
      return;
    }
    setSubmitting(true);
    try {
      /**
       * **Quem manda o e-mail é a nossa API, e não o Firebase** · desde
       * 24/08/2026.
       *
       * Até aqui era `sendPasswordResetEmail` do SDK, direto do navegador, e o
       * que chegava na caixa da pessoa era o oposto de tudo que o resto do
       * produto cuida: remetente `noreply@gg-clubs.firebaseapp.com`, layout
       * genérico, **em inglês** e um link pra uma página que não é nossa.
       *
       * **E a troca conserta um vazamento junto** · o `catch` de antes jogava
       * `authErrors.<código do Firebase>` na tela, e um deles é
       * `auth/user-not-found`: a tela **contava** se aquele e-mail tem conta
       * aqui. Hoje a rota responde 200 em tudo e a mensagem é uma só, que é a
       * mesma régua do erro de senha errada.
       */
      await api.requestPasswordReset(email, asLanguage(i18n.language));
      setInfo(t('auth.resetSent', { email }));
    } catch {
      // **Falha aqui é de rede, e só ela** · a rota responde 200 exista ou não
      // a conta. Repetir pode mudar o resultado, então a frase convida a isso.
      setError(t('auth.resetFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === 'forgot-password') {
    return (
      <form onSubmit={(e) => void onResetPassword(e)} className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('auth.forgotHint')}</p>
        <div className="space-y-2">
          <Label htmlFor="email-reset">{t('auth.emailLabel')}</Label>
          <Input
            id="email-reset"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
            required
          />
        </div>
        {/* **`role="alert"` porque ninguém rola até o erro** · ele nasce embaixo do
            botão que a pessoa acabou de apertar, e sem o papel o leitor de tela
            não anuncia nada · quem usa leitor aperta ENTRAR e recebe silêncio.
            Achado em 22/08/2026 por um probe que procurava o erro **pelo papel**
            e não o achou · a tela dizia, mas só pra quem enxerga. */}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {info && (
          <p className="inline-flex items-start gap-2 rounded-md bg-primary/10 px-3 py-2.5 text-sm text-primary">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {info}
          </p>
        )}
        {/* `Button` nasce `whitespace-nowrap`, e num botão de largura total isso
            não corta o rótulo: empurra a página inteira. Foi assim que o CTA
            desta tela vazou a 320px em espanhol, enquanto o português cabia por
            um fio. Largura total quebra linha, por isso `min-h` em vez de `h` ·
            altura fixa cortaria a segunda linha em vez de crescer. */}
        <Button
          type="submit"
          variant="cta"
          className="min-h-11 w-full whitespace-normal py-2.5 text-base"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('auth.resetLoading')}
            </>
          ) : (
            t('auth.resetCta')
          )}
        </Button>
        <button
          type="button"
          onClick={() => switchMode('sign-in')}
          className="inline-flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('auth.backToSignIn')}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {isGoogleSignInAvailable() && (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => void onGoogle()}
            disabled={submitting || googlePending}
            className="h-11 w-full text-base font-semibold"
          >
            {googlePending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                {/* Botão é `whitespace-nowrap` por padrão: rótulo comprido não
                    quebra linha, ele empurra a página inteira · a 320px o texto
                    antigo desta espera vazava pra fora da tela. Cortar dentro do
                    botão é feio, vazar é defeito. */}
                <span className="truncate">{t('auth.googleLoading')}</span>
              </>
            ) : (
              <>
                <GoogleIcon className="mr-2 h-5 w-5" />
                {t(signingUp ? 'auth.googleSignUpCta' : 'auth.googleCta')}
              </>
            )}
          </Button>
          {/* **Esta saída continua existindo, e o texto acima dela mudou de
              razão em 26/08/2026.** Ele dizia que "não existe evento pra isso em
              nenhuma das duas plataformas", e isso é verdade **só no desktop**:
              o loopback nunca sabe que a pessoa desistiu (RFC 8252 não tem
              resposta pra isso).

              Na web existe sinal · a janela principal recupera o foco quando o
              popup morre, e o `google-signin.ts` usa isso pra cancelar sozinho
              em ~3,5s. O `signInWithPopup` deveria cobrir o caso e não cobre de
              forma confiável · o porquê, com o trecho do SDK, está lá.

              Então a saída não é mais a única coisa que a pessoa pode fazer na
              web · ela é a rede pra quando o foco não vier (outra aba assumiu, a
              pessoa foi pro navegador fazer outra coisa) e **é a resposta
              inteira no app instalado**. Segue com o maior contraste do bloco
              pelo mesmo motivo de antes. */}
          {googlePending && (
            <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('auth.googleWaitingHint')}</p>
              <button
                type="button"
                onClick={() => {
                  googleAttempt.current++;
                  setGooglePending(false);
                  // Não basta soltar a tela: sem avisar o shell, a porta de
                  // loopback continuava escutando e aceitaria um código que
                  // chegasse depois da desistência.
                  void cancelGoogleSignIn();
                }}
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                {t('auth.googleCancel')}
              </button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase text-muted-foreground">{t('auth.separator')}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={(e) => void onSubmitCredentials(e)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.emailLabel')}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('auth.passwordLabel')}</Label>
            {!signingUp && (
              <button
                type="button"
                onClick={() => switchMode('forgot-password')}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t('auth.forgotLink')}
              </button>
            )}
          </div>
          <PasswordInput
            id="password"
            autoComplete={signingUp ? 'new-password' : 'current-password'}
            // O piso é do Firebase · sem isto o erro só aparece depois do envio.
            // Nunca no login: quem criou conta antes da regra continua entrando.
            minLength={signingUp ? MIN_PASSWORD_LENGTH : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11"
            required
          />
          {/* Um substitui o outro, nunca empilham: a dica só serve enquanto o
              campo está vazio, e a partir da primeira tecla quem fala é o
              medidor. Assim a altura do bloco não muda e nada empurra o botão
              de criar conta pra baixo enquanto a pessoa digita. */}
          {signingUp &&
            (password ? (
              <PasswordStrengthMeter password={password} email={email} />
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('auth.signUpHint', { min: MIN_PASSWORD_LENGTH })}
              </p>
            ))}
        </div>
        {/* **`role="alert"` porque ninguém rola até o erro** · ele nasce embaixo do
            botão que a pessoa acabou de apertar, e sem o papel o leitor de tela
            não anuncia nada · quem usa leitor aperta ENTRAR e recebe silêncio.
            Achado em 22/08/2026 por um probe que procurava o erro **pelo papel**
            e não o achou · a tela dizia, mas só pra quem enxerga. */}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {/* Mesma regra do CTA de recuperar senha, acima: largura total quebra
            linha em vez de empurrar a página. */}
        <Button
          type="submit"
          variant="cta"
          className="min-h-11 w-full whitespace-normal py-2.5 text-base"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t(signingUp ? 'auth.signUpLoading' : 'auth.signInLoading')}
            </>
          ) : (
            t(signingUp ? 'auth.signUpCta' : 'auth.signInCta')
          )}
        </Button>
      </form>

      {/* Criar conta é a segunda coisa mais importante desta tela, e estava com
          o mesmo cinza da pergunta · ninguém enxergava o que dava pra clicar.
          Em vez de somar elemento, só a **ação** ganha cor e peso: a pergunta
          continua sendo contexto. */}
      <button
        type="button"
        onClick={() => switchMode(signingUp ? 'sign-in' : 'sign-up')}
        disabled={submitting || googlePending}
        className="group w-full text-center text-sm text-muted-foreground transition-colors disabled:opacity-50"
      >
        <Trans i18nKey={signingUp ? 'auth.signInSwitch' : 'auth.signUpSwitch'}>
          <span className="font-semibold text-primary underline-offset-4 group-hover:underline" />
        </Trans>
      </button>
    </div>
  );
}
