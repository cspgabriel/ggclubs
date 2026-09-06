import { activeLanguage } from '@/i18n';

/**
 * A data de um documento · a versão publicada, ou a entrada das novidades.
 *
 * **Um formatador por idioma e por forma, guardado** · `toLocaleDateString`
 * com objeto de opções monta um `Intl.DateTimeFormat` novo a cada chamada, e
 * as duas páginas faziam isso no corpo do render, uma vez por entrada e uma vez
 * por versão do histórico. A máquina de idioma é a mesma do `relativeTime`.
 *
 * **Sem `timeZone`, de propósito, e por dois motivos diferentes:** a entrada
 * das novidades já chega como dia de calendário (o `changelogDate` monta meia
 * noite local), e forçar São Paulo nela mudaria o dia pra quem lê de outro
 * fuso. A data de publicação legal é carimbo, e segue no relógio de quem lê
 * como sempre foi · a regra do fuso do produto (`tournament-format`) é de
 * evento com hora marcada, e aqui não há hora.
 */
const FORMATS = {
  /** `05/09/2026` · o padrão do `toLocaleDateString` sem opções. */
  numeric: { day: 'numeric', month: 'numeric', year: 'numeric' },
  /** `5 de setembro de 2026`. */
  long: { day: 'numeric', month: 'long', year: 'numeric' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

const cache = new Map<string, Intl.DateTimeFormat>();

export function formatDate(
  value: Date | string,
  format: keyof typeof FORMATS = 'numeric',
  language = activeLanguage,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const key = `${language}:${format}`;
  let fmt = cache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(language, FORMATS[format]);
    cache.set(key, fmt);
  }
  return fmt.format(date);
}
