import type { TFunction } from 'i18next';

export function matchStateText(t: TFunction, status: string): string {
  switch (status) {
    case 'disputed':
      return t('chat.disputed');
    case 'played':
    case 'walkover':
      return t('chat.archivedShort');
    case 'cancelled':
      return t('chat.cancelledMatch');
    default:
      return t('chat.pendingResult');
  }
}

/**
 * As duas frases que a sala formata · **módulo ao lado, e não dentro do
 * componente.**
 *
 * A regra do `CLAUDE.md` é curta: arquivo de componente exporta componente, e
 * função pura no meio deles quebra o Fast Refresh do `pnpm dev`. Estas duas
 * eram usadas em **seis** lugares do `match-chat.tsx` (`timeOf` quatro vezes,
 * `closedText` duas), e sair dali **é o que deixou o compositor extraível** ·
 * ele saiu logo depois, pro `chat-composer.tsx`, que importa as duas daqui.
 */
/** A hora, sem a data · a sala vive uma noite. */
export function timeOf(value: Date | string): string {
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * **A frase do fechamento sai de um `switch`, e não de chave montada** · o
 * catálogo tipado não aceita `chat.closed.${…}`, e a verbosidade é o que faz um
 * motivo novo não compilar sem frase.
 */
export function closedText(t: TFunction, reason: string | null): string {
  switch (reason) {
    case 'locked':
      return t('chat.closed.locked');
    case 'tooEarly':
      return t('chat.closed.tooEarly');
    case 'matchOver':
      return t('chat.closed.matchOver');
    case 'tournamentOver':
      return t('chat.closed.tournamentOver');
    case 'tournamentEnding':
      return t('chat.closed.tournamentEnding');
    default:
      return t('chat.closed.expired');
  }
}
