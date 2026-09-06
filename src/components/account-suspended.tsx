import { ShieldOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

/**
 * A tela de quem foi suspenso · **e ela precisa se resolver sozinha.**
 *
 * **O comentário que estava aqui dizia o contrário**, e ele envelheceu: *"conta
 * suspensa não se resolve recarregando"*. Resolve · quem suspende é o admin, e
 * quem **reativa** é o admin também.
 *
 * **E o reativar não tem como avisar esta tela.** Suspender derruba a conexão de
 * tempo real (`dropAccount`), e é por isso que a suspensão aparece na hora ·
 * mas conta suspensa **não consegue abrir** conexão nova (o hub recusa o
 * bilhete), então quando o admin reativa **não existe canal por onde a notícia
 * chegue**. Achado pelo Eduardo em 21/08/2026, olhando os dois lados.
 *
 * Por isso a tela **pergunta sozinha**, de tempos em tempos, e oferece o botão ·
 * é o único caminho que existe pra ela sair daqui sem a pessoa adivinhar que
 * precisa recarregar.
 *
 * **E ela carrega saída**, que é a regra da casa pra tela terminal: sair, e o
 * endereço de quem pode reverter isso. Sem o contato, "fale com o admin" manda a
 * pessoa procurar uma porta que ela não sabe onde fica.
 */
/**
 * Quanto o botão fica desligado depois de um clique.
 *
 * **Não há poll**, e essa é a decisão do Eduardo: com o botão na tela, perguntar
 * de 20 em 20 segundos é uma requisição por conta bloqueada para uma coisa que
 * muda quando **uma pessoa** decide. Quem sabe que resolveu é quem clica.
 *
 * O trinco existe porque `GET /me` sai da faixa `read` da **conta**, e uma
 * conta suspensa apertando o botão em sequência gastaria o balde dela contra
 * uma resposta que não vai mudar em três segundos.
 */
const COOLDOWN_MS = 10_000;

/** As duas ações que a tela oferece · tipo fora da assinatura porque o
 *  `pnpm scan:strings` lê a união como se fosse texto de tela. */
type SuspendedProps = {
  onRecheck: () => Promise<void>;
  onSignOut: () => Promise<void>;
};

export function AccountSuspended({ onRecheck, onSignOut }: SuspendedProps) {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);

  /** Quando o botão volta a aceitar clique · `0` é agora. */
  const [readyAt, setReadyAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  // O relógio só corre **enquanto o botão está trancado** · sem isso seria um
  // timer vivo pra sempre numa tela que quase sempre está parada.
  useEffect(() => {
    if (readyAt <= now) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [readyAt, now]);

  const waiting = Math.max(0, Math.ceil((readyAt - now) / 1000));

  async function recheck(): Promise<void> {
    setChecking(true);
    try {
      await onRecheck();
    } finally {
      setChecking(false);
      setReadyAt(Date.now() + COOLDOWN_MS);
      setNow(Date.now());
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        {/* O selo não usa verde · verde é a marca e a ação, e aqui nada é
            positivo. Âmbar é o mesmo tom da lista de pendência do painel. */}
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">
          <ShieldOff className="size-6 text-amber-400" aria-hidden />
        </div>

        <h1 className="mt-5 font-display text-2xl uppercase text-foreground">
          {t('suspended.title')}
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t('suspended.body')}
        </p>

        {/* **O endereço, escrito** · "fale com o admin" sem dizer onde é a mesma
            porta fechada que o `noreply` era no rodapé do e-mail. */}
        <a
          href={`mailto:${t('suspended.contactEmail')}`}
          className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4"
        >
          {t('suspended.contactEmail')}
        </a>

        <div className="mt-7 flex flex-col gap-2">
          {/* **Botão desligado diz por que está desligado** · é a regra da casa,
              e sem o contador ele lê como tela quebrada. */}
          <Button onClick={() => void recheck()} disabled={checking || waiting > 0}>
            {checking
              ? t('common.loading')
              : waiting > 0
                ? t('suspended.recheckWait', { seconds: waiting })
                : t('suspended.recheck')}
          </Button>
          <Button variant="ghost" onClick={() => void onSignOut()}>
            {t('nav.signOut')}
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">{t('suspended.hint')}</p>
      </div>
    </div>
  );
}
