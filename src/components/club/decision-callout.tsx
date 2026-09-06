import type { LucideIcon } from 'lucide-react';
import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/**
 * **Um club está esperando você decidir.**
 *
 * Hoje são dois casos, e eles nasceram em lugares diferentes com o mesmo
 * desenho: o **convite pra entrar** (dentro do `JoinClubButton`) e a **oferta
 * pra assumir o club** (no `OwnershipOfferNotice`). Borda verde, título com
 * ícone, e o par aceitar/recusar · escrito duas vezes.
 *
 * **A cópia durou umas horas e já é a regra da casa que ela não fica:** quando
 * duas telas fazem a mesma coisa de dois jeitos, o conserto é extrair, porque
 * escolher um dos dois só adia até a terceira inventar um quarto jeito. Aqui a
 * terceira é previsível · pedido de entrada, convite pra campeonato, o que
 * vier.
 *
 * **É composição, não configuração:** o que muda entre os dois é ícone, palavra
 * e o que cada botão faz. Nada disso é modo.
 */
export function DecisionCallout({
  icon: Icon,
  title,
  hint,
  acceptLabel,
  declineLabel,
  blockedReason,
  busy,
  error,
  onAccept,
  onDecline,
}: {
  icon: LucideIcon;
  title: string;
  /** Só onde a consequência não é óbvia · o convite pra entrar dispensa. */
  hint?: ReactNode;
  acceptLabel: string;
  declineLabel: string;
  /**
   * Por que **aceitar** está desligado, ou `null` quando não está.
   *
   * **Recusar continua ligado**, e essa é a decisão: a caixa existe pra tirar a
   * pendência da frente da pessoa, e um par de botões inertes deixaria ela sem
   * saída nenhuma. Nasceu com a oferta de posse, quando o teto de posse passou
   * a poder invalidar um aceite que a tela já estava oferecendo.
   *
   * **Botão desligado diz por que está desligado** · a frase entra no `title` e
   * no rótulo acessível, porque `disabled` tira o `hover` e a dica sozinha
   * nunca apareceria.
   */
  blockedReason?: string | null;
  busy?: boolean;
  error?: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    // `items-start` e não `items-end`: dentro da caixa o rótulo é mais curto
    // que a fileira de botões, e alinhar pela direita deixava ele solto no meio
    // do nada enquanto os botões definiam a largura · medido, 52px de sobra à
    // esquerda contra 13px. Quem fica à direita é a caixa inteira, no
    // cabeçalho, e não o conteúdo dela.
    <div className="flex flex-col items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {title}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      {/* `flex-wrap` porque `Button` é `whitespace-nowrap` · a 320px os dois não
          cabem lado a lado e o segundo saía **pra fora da tela**, sem scroll pra
          alcançá-lo. Mesma armadilha do `auth.resetCta`, no `docs/i18n.md`. */}
      <span className="flex flex-wrap items-center gap-2">
        {/* **O motivo mora no `title` e no rótulo acessível**, e não numa dica ·
            `disabled` tira o `hover`, então tooltip em botão desligado é
            explicação que só existe pra quem navega por teclado. É a armadilha
            que o `docs/design.md` registra. */}
        <Button
          variant="ctaOutline"
          size="sm"
          disabled={busy || blockedReason != null}
          title={blockedReason ?? undefined}
          aria-label={blockedReason ? `${acceptLabel} · ${blockedReason}` : undefined}
          onClick={onAccept}
        >
          <Check className="mr-1.5 h-4 w-4" aria-hidden />
          {acceptLabel}
        </Button>
        <Button variant="ghost" size="sm" disabled={busy} onClick={onDecline}>
          <X className="mr-1.5 h-4 w-4" aria-hidden />
          {declineLabel}
        </Button>
      </span>
      {/* **A frase fica visível também**, e não só no `title` · quem lê num
          celular não tem `hover` nenhum, e sem ela o botão inerte lê como tela
          quebrada. */}
      {blockedReason && !error && <p className="text-xs text-muted-foreground">{blockedReason}</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
