import type { EligibleClub, PaymentMethod, PaymentView } from '@ggclubs/schemas';
import { Check, Copy, CreditCard, QrCode } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ExternalLink } from '@/components/ui/external-link';
import { SkeletonBar } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { openExternal } from '@/lib/desktop';
import { formatPrice } from '@/lib/format';

/**
 * Pagar a vaga · **e o que ele mostra primeiro é que a vaga está segura.**
 *
 * A ordem da tela é essa de propósito: quem chega aqui já decidiu, e a única
 * dúvida que resta é *"vou perder o lugar enquanto pago?"*. O relógio responde
 * isso sem exigir leitura · ele conta pra baixo a partir do prazo que o servidor
 * gravou, e não de um contador que o cliente inventa.
 *
 * **O Pix é desenhado aqui, e o cartão sai daqui** · decisão do Eduardo em
 * 12/08/2026. O QR já vem pronto do provedor (imagem em base64), então não há
 * biblioteca de QR no bundle.
 */
export function TournamentPaymentPanel({
  tournamentId,
  club,
  priceCents,
  onPaid,
  onCharged,
}: {
  tournamentId: string;
  club: EligibleClub;
  priceCents: number;
  onPaid: () => void;
  /** A cobrança nasceu · quem recarrega a elegibilidade é o pai. */
  onCharged: () => void;
}) {
  const { t } = useTranslation();
  /**
   * **A cobrança vem do servidor, e a tela não é dona dela** · pendência 94.
   *
   * Enquanto ela morava aqui num `useState`, era **a única coisa desta tela que
   * o servidor não conseguia desmentir**: cobrança morta no provedor seguia
   * desenhada até a reserva vencer, e um F5 apagava um QR que continuava
   * pagável. Hoje o evento `tournament.payment` chega, o pai refaz a
   * elegibilidade, e o que existe (ou não) aparece daqui.
   */
  const payment: PaymentView | null = club.payment;
  const [busy, setBusy] = useState<PaymentMethod | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  // **O prazo é o da RESERVA, e não o da cobrança** · são o mesmo instante por
  // construção (o Pix expira junto da vaga), mas só um dos dois existe antes de
  // a pessoa apertar "Pix". Enquanto o relógio saía do pagamento, ele **só
  // aparecia depois da cobrança** e a reserva queimava invisível · duas das três
  // primeiras tentativas da edição piloto venceram assim.
  //
  // **Em milissegundos, e não em `Date`**, porque este valor é dependência de
  // efeito: um `Date` novo a cada render reinicia o relógio a cada render do pai.
  const untilMs = club.reservedUntil
    ? new Date(club.reservedUntil).getTime()
    : payment
      ? new Date(payment.expiresAt).getTime()
      : null;
  const remaining = useCountdown(untilMs, onPaid);

  async function start(method: PaymentMethod) {
    setBusy(method);
    setFailure(null);
    try {
      const { payment: created } = await api.startTournamentPayment(tournamentId, club.id, method);
      // **O cartão sai da nossa tela**, e a aba nova é a forma de não perder o
      // que a pessoa tem aqui · voltar do checkout é uma navegação do provedor,
      // e ela não pode custar o relógio da reserva.
      //
      // **Ele usa a resposta direta, e não a busca que vem depois** · abrir aba
      // é gesto do usuário, e pendurá-lo numa segunda ida ao servidor é o que
      // faz bloqueador de pop-up engolir o checkout.
      //
      // **E `window.open` NÃO serve**, porque o app instalado existe: no
      // WebView2 o pedido de janela nova é engolido sem erro nenhum, e o
      // checkout de dinheiro real simplesmente não abria · com esta mesma tela
      // dizendo logo abaixo que a aba tinha aberto. Quem abre é o navegador do
      // sistema, pelo `openExternal`.
      if (created.checkoutUrl) void openExternal(created.checkoutUrl);
      // **Quem desenha é o servidor** · a resposta já traz a cobrança, mas
      // guardá-la aqui recriaria a segunda fonte que a pendência 94 fechou.
      onCharged();
    } catch (err) {
      setFailure(apiErrorMessage(err, t));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      data-payment-panel
      className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-base uppercase text-foreground sm:text-lg">
          {t('tournament.payTitle', { club: club.name })}
        </h3>
        <span className="font-display text-lg text-primary">{formatPrice(priceCents)}</span>
      </div>

      {/* **`new Date(...)` mesmo o tipo dizendo `Date`** · a resposta da API é
          JSON, e JSON não tem data: o campo chega **string**, o `z.coerce.date()`
          do schema roda no servidor, e o TypeScript acredita no tipo declarado.
          Sem isto o relógio chamava `getTime` numa string, e o React **derrubava
          o painel inteiro** · a pessoa clicava em pagar, a cobrança nascia no
          provedor e a tela ficava em branco. Achado em 13/08/2026 pelo probe. */}
      <ReservationClock remaining={remaining} />

      {/* **A consequência fica FORA do `ReservationClock`**, e isto foi um
          conserto: ela nasceu dentro do `payPitch`, que é o ramo de quando NÃO
          há prazo · com reserva correndo quem aparece é o relógio, então a
          frase que existe pra ser lida antes de pagar era justamente a que
          ninguém via. Os testes passavam e a string estava no bundle · quem
          pegou foi renderizar e olhar. */}
      <p className="mt-1 max-w-prose text-xs text-muted-foreground">
        {t('tournament.payConsequence')}
      </p>

      {/* **Os dois meios ficam de pé até o fim da reserva**, e isso é decisão do
          Eduardo em 13/08/2026 · eu tinha posto um piso que escondia os botões
          nos últimos minutos, e ele apontou a fricção. O argumento que eu usei
          pra justificar o piso não se sustenta: cobrança curta não faz dinheiro
          sumir · o banco recusa o código vencido, e o que entra atrasado o
          webhook confirma. Bloquear trocava uma chance de pagar por nenhuma. */}
      {!payment && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {/* **O sólido da marca é um só, e é o Pix** · é o meio que fecha na
              hora e o que a página promete. O cartão é a segunda via. */}
          <Button
            data-pay-pix
            variant="cta"
            className="h-auto min-h-10 max-w-full whitespace-normal"
            disabled={busy !== null}
            onClick={() => void start('pix')}
          >
            <QrCode className="mr-1.5 h-4 w-4 shrink-0" />
            <span>{busy === 'pix' ? t('tournament.paying') : t('tournament.payPix')}</span>
          </Button>
          <Button
            data-pay-card
            variant="ctaOutline"
            className="h-auto min-h-10 max-w-full whitespace-normal"
            disabled={busy !== null}
            onClick={() => void start('card')}
          >
            <CreditCard className="mr-1.5 h-4 w-4 shrink-0" />
            <span>{busy === 'card' ? t('tournament.paying') : t('tournament.payCard')}</span>
          </Button>
        </div>
      )}

      {busy && !payment && <SkeletonBar className="mt-4 h-48 w-full rounded-lg" />}

      {payment?.pix && <PixCode pix={payment.pix} />}

      {payment?.checkoutUrl && !payment.pix && (
        <p className="mt-4 max-w-prose text-sm text-muted-foreground">
          {t('tournament.payCardOpened')}{' '}
          <ExternalLink
            className="text-primary underline underline-offset-4"
            href={payment.checkoutUrl}
          >
            {t('tournament.payCardReopen')}
          </ExternalLink>
        </p>
      )}

      {failure && <p className="mt-3 text-sm text-destructive">{failure}</p>}
    </section>
  );
}

/**
 * A contagem regressiva da reserva · **e ela avisa o fim uma vez só.**
 *
 * O prazo é uma data absoluta que veio do servidor, não uma contagem iniciada no
 * cliente: com contador próprio, uma aba deixada aberta e retomada mostraria
 * tempo que não existe mais, o que é a pior mentira possível nesta tela.
 *
 * **O aviso de vencimento disparava a cada segundo, pra sempre**, e isso é
 * conserto de 13/08/2026. O intervalo continuava rodando com `ms <= 0`, e o
 * `onExpired` do painel são **duas** chamadas à API · quem para a repetição é o
 * servidor concordar que venceu e o painel desmontar, e **a varredura dele roda
 * a cada 60 segundos**. Ou seja: até um minuto de duas requisições por segundo,
 * e a reserva inteira se o relógio da máquina estivesse adiantado. É o mesmo
 * defeito que a regra do sininho proíbe · evento não pode virar requisição.
 *
 * **Duas coisas seguram isso, e as duas são necessárias:**
 *
 * - a trava `fired`, que dispara uma vez e **mata o intervalo**;
 * - o prazo entrar como **número**, e não como `Date` · o pai passa um objeto
 *   novo a cada render, então com `Date` na dependência o efeito reiniciava
 *   sozinho e zerava a trava.
 *
 * **A função de aviso mora numa `ref` de propósito** · o pai a declara inline,
 * então ela muda de identidade a cada render dele. Como dependência, ela
 * reiniciaria o efeito pelo mesmo caminho · e um componente compartilhado não
 * pode depender de quem o chama lembrar de memoizar.
 */
function useCountdown(untilMs: number | null, onExpired: () => void): number | null {
  const [remaining, setRemaining] = useState<number | null>(() =>
    untilMs === null ? null : untilMs - Date.now(),
  );
  const expired = useRef(onExpired);
  useEffect(() => {
    expired.current = onExpired;
  }, [onExpired]);

  useEffect(() => {
    if (untilMs === null) {
      setRemaining(null);
      return;
    }
    setRemaining(untilMs - Date.now());

    let fired = false;
    const id = setInterval(() => {
      const ms = untilMs - Date.now();
      setRemaining(ms);
      // **Vencido, quem manda é o servidor** · a tela avisa quem a montou pra
      // rebuscar, em vez de decidir sozinha que a vaga acabou. Uma vez.
      if (ms <= 0 && !fired) {
        fired = true;
        clearInterval(id);
        expired.current();
      }
    }, 1_000);
    return () => clearInterval(id);
  }, [untilMs]);

  return remaining;
}

/** O que sobra da reserva, em `mm:ss` · quem conta é o `useCountdown`. */
function ReservationClock({ remaining }: { remaining: number | null }) {
  const { t } = useTranslation();

  if (remaining === null) {
    return (
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">{t('tournament.payPitch')}</p>
    );
  }

  const total = Math.max(0, Math.floor(remaining / 1_000));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');

  return (
    <p data-reservation-clock className="mt-1 max-w-prose text-sm text-muted-foreground">
      {t('tournament.payClock')}{' '}
      <span className="font-display tabular-nums text-foreground">
        {mm}:{ss}
      </span>
    </p>
  );
}

/** O QR e o copia-e-cola · o segundo existe porque no celular não há o que ler. */
function PixCode({ pix }: { pix: NonNullable<PaymentView['pix']> }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(pix.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      // O código continua visível no campo · erro aqui seria ruído.
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
      {/* Fundo branco e não transparente · QR sobre tema escuro não é lido por
          leitor nenhum, e o nosso tema é escuro sempre. */}
      <img
        data-pix-qr
        src={`data:image/png;base64,${pix.qrBase64}`}
        alt={t('tournament.payQrAlt')}
        className="h-44 w-44 shrink-0 self-center rounded-lg bg-white p-2 sm:self-start"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{t('tournament.payPixHelp')}</p>
        <p
          data-pix-payload
          className="mt-2 max-h-24 overflow-y-auto overscroll-contain break-all rounded-lg border border-border/60 bg-background/40 p-2 font-mono text-xs text-muted-foreground"
        >
          {pix.payload}
        </p>
        <Button variant="ctaOutline" size="sm" className="mt-2" onClick={() => void copy()}>
          {copied ? (
            <Check className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Copy className="mr-1.5 h-3.5 w-3.5" />
          )}
          {copied ? t('tournament.payCopied') : t('tournament.payCopy')}
        </Button>
        {pix.ticketUrl && (
          <ExternalLink
            className="mt-3 block text-xs text-muted-foreground underline underline-offset-4"
            href={pix.ticketUrl}
          >
            {t('tournament.payTicket')}
          </ExternalLink>
        )}
      </div>
    </div>
  );
}
