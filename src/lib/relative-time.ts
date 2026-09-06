import { activeLanguage } from '@/i18n';
/**
 * **A data absoluta sai daqui, e não de um `Intl` local** · desde 03/09/2026.
 *
 * Os dois ramos de "mais de uma semana" formatavam com `Intl.DateTimeFormat`
 * **sem `timeZone`**, ou seja, no relógio de quem lê · e a Copa de Estreia
 * começa 04/09 às 21h de Brasília, que é **05/09 em UTC**. Quem abrisse a
 * página com o relógio em UTC leria "5 de set" pra um campeonato do dia 4.
 *
 * É a marca de sempre: a regra do fuso mora no `tournament-format`, e o segundo
 * formatador nasceu noutro arquivo sem herdá-la. Delegar impede o terceiro.
 */
import { formatShortDate } from '@/lib/tournament-format';

/**
 * "agora", "há 5 minutos", "há 2 horas", "5 de ago" · o carimbo de uma linha de
 * lista.
 *
 * **Usa `Intl.RelativeTimeFormat`, e não chave por plural no catálogo**, pela
 * mesma razão do `humanWait` em `lib/api-error.ts`: ele resolve plural e
 * preposição nos dois idiomas sozinho, e a alternativa seria quatro chaves por
 * unidade, escritas à mão e capazes de divergir.
 *
 * > **Este arquivo já existiu com as palavras em português cravadas** ("agora",
 * > "min", "h") e **sem um chamador sequer** · ou seja, uma tela em espanhol que
 * > o usasse mostraria português e nenhum dos cinco checks veria, porque
 * > `pnpm scan:strings` olha texto de tela e não biblioteca. Consertado em
 * > 11/08/2026, ao nascer o primeiro chamador de verdade.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function relativeTime(input: Date | string, language = activeLanguage): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';

  const diff = Date.now() - date.getTime();

  /**
   * **Data no futuro tem caminho próprio, e a ausência dele era defeito.**
   *
   * Esta função nasceu pro passado (o carimbo de uma linha de lista), e com
   * `diff` negativo toda data futura caía no `< MINUTE` e virava **"agora"** ·
   * a página do campeonato dizia *"as inscrições fecham agora"* com **catorze
   * dias** de prazo. Achado em 12/08/2026 pelo probe de tempo real, que leu o
   * painel na tela.
   *
   * O `Intl.RelativeTimeFormat` já resolve o futuro com valor positivo ("em 14
   * dias", "amanhã") · o que faltava era chamá-lo. **Acima de uma semana vira
   * data**, como no passado, e pelo mesmo motivo: "em 23 dias" obriga quem lê a
   * fazer a conta.
   */
  if (diff < 0) {
    const ahead = -diff;
    if (ahead >= WEEK) {
      return formatShortDate(date.toISOString());
    }
    const fmt = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
    if (ahead < MINUTE) return fmt.format(0, 'second');
    if (ahead < HOUR) return fmt.format(Math.ceil(ahead / MINUTE), 'minute');
    if (ahead < DAY) return fmt.format(Math.ceil(ahead / HOUR), 'hour');
    return fmt.format(Math.ceil(ahead / DAY), 'day');
  }

  // **Uma semana é o corte**, e a partir dele vira data: "há 23 dias" obriga
  // quem lê a fazer a conta pra saber quando foi.
  if (diff >= WEEK) {
    return formatShortDate(date.toISOString());
  }

  const fmt = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  // Negativo porque é passado · `numeric: 'auto'` é o que devolve "ontem" em
  // vez de "há 1 dia".
  if (diff < MINUTE) return fmt.format(0, 'second');
  if (diff < HOUR) return fmt.format(-Math.floor(diff / MINUTE), 'minute');
  if (diff < DAY) return fmt.format(-Math.floor(diff / HOUR), 'hour');
  return fmt.format(-Math.floor(diff / DAY), 'day');
}
