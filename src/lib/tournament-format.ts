import { activeLanguage } from '@/i18n';

/**
 * **Toda data de campeonato é mostrada no horário de Brasília**, e não no fuso
 * de quem está olhando · decisão do Eduardo em 22/08/2026.
 *
 * O motivo é o domínio, não a conveniência: *"o campeonato começa 21:00"* é uma
 * frase sobre **um instante só**, combinada entre gente que joga junto. Mostrar
 * no fuso do visitante daria 21:00 pra quem está em São Paulo e 21:00 pra quem
 * está em Buenos Aires · **duas horas diferentes com o mesmo número na tela**, e
 * o produto atende os dois (temos `es` justamente pra América do Sul).
 *
 * **E por isso a tela precisa DIZER o fuso** · e ela passou a dizer só em
 * 03/09/2026: a chave `tournament.timeZone` que este parágrafo citava **não
 * existia em catálogo nenhum**, e o docblock descreveu por semanas um produto
 * que não existia. Hoje ela é escrita uma vez na fita de datas da capa.
 *
 * O texto original, que continua valendo: · número sem fuso é o que faz
 * alguém entrar uma hora atrasado. Quem escreve é a chave `tournament.timeZone`
 * dos catálogos, ao lado de onde a hora aparece.
 *
 * > **O Brasil não tem mais horário de verão desde 2019**, então hoje isto é um
 * > `-03:00` fixo · usar o nome da zona em vez do offset é o que faz o dia em
 * > que ele voltar não virar um bug de uma hora espalhado pelo produto.
 */
export const TOURNAMENT_TIME_ZONE = 'America/Sao_Paulo';

/**
 * A data curta das telas de campeonato · dia e mês por padrão.
 *
 * O ano fica de fora porque toda edição acontece dentro de semanas, e escrevê-lo
 * gasta largura numa linha que já divide espaço com o rótulo. A capa e o card
 * usam a mesma, de propósito. O resumo de edições pede `withYear` para distinguir
 * temporadas no histórico.
 *
 * **Mora aqui e não no componente** porque arquivo que exporta componente **e**
 * função quebra o fast refresh do Vite · o lint cobra, e a regra é a mesma que
 * separou `button-variants.ts` do `button.tsx`.
 */
export function formatShortDate(value: string, withYear = false): string {
  return new Date(value).toLocaleDateString(activeLanguage, {
    day: '2-digit',
    month: 'short',
    ...(withYear ? { year: 'numeric' as const } : {}),
    timeZone: TOURNAMENT_TIME_ZONE,
  });
}

/**
 * O horário de uma rodada · **dia e hora, e a hora é o que a pessoa procura.**
 *
 * As rodadas de uma edição acontecem no mesmo dia, com meia hora entre elas, mas
 * o dia continua aparecendo · a chave é lida dias antes de ser jogada, e "22:30"
 * sozinho obrigaria a pessoa a procurar a data noutro canto da página.
 *
 * **A entrada é `Date | string`** porque este valor faz o caminho todo: no
 * servidor ele é `Date`, e o que chega do JSON é **string** · o `PaymentView` já
 * custou uma tela em branco por essa diferença.
 */
/**
 * Só a hora · **é o número grande da faixa do próximo jogo.**
 *
 * A data completa mora na linha de apoio embaixo · aqui o que se lê de longe é
 * "22:30", que é o dado pelo qual a pessoa abriu a página. É o mesmo papel do
 * contador de vagas na capa: um número, grande, respondendo a pergunta inteira.
 */
export function formatMatchClock(value: Date | string): string {
  return new Date(value).toLocaleTimeString(activeLanguage, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TOURNAMENT_TIME_ZONE,
  });
}

/**
 * Dia, mês e hora · **e o separador é um traço, não a vírgula do locale.**
 *
 * O `pt-BR` monta `04 de set., 22:12` · a vírgula colada no ponto da abreviação
 * vira um borrão (`set.,`) na caixa alta em que a capa desenha isso. Pedido do
 * Eduardo em 05/09/2026, olhando a linha de datas da edição: **`04 DE SET -
 * 22:12`**.
 *
 * **O corte é na vírgula que o locale produz**, e não numa remontagem à mão ·
 * reescrever a data por partes traria de volta o problema que o `toLocaleString`
 * existe pra resolver (mês por idioma, e o fuso de Brasília).
 */
export function formatMatchTime(value: Date | string): string {
  return (
    new Date(value)
      .toLocaleString(activeLanguage, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: TOURNAMENT_TIME_ZONE,
      })
      /**
       * **O ponto da abreviação sai junto** · o `pt-BR` devolve `04 de set.,
       * 22:12`, e em caixa alta `SET.,` vira um borrão de dois sinais colados. A
       * primeira troca pega o par (ponto e vírgula) e a segunda cobre o locale que
       * abrevia sem ponto · o espanhol é um deles.
       */
      .replace('., ', ' - ')
      .replace(', ', ' - ')
  );
}

/**
 * O instante, escrito como o `datetime-local` espera · **já em Brasília**.
 *
 * `toISOString().slice(0, 16)` daria UTC, e `getHours()` daria o fuso de quem
 * está olhando · as duas erram pelo mesmo motivo. Aqui a data é formatada **na
 * zona** e remontada no formato do input.
 *
 * O `sv-SE` não é gosto: é o único locale comum que formata como
 * `AAAA-MM-DD HH:mm:ss`, que é o formato do input com um espaço no lugar do T.
 */
export function toZonedInput(value: Date | string): string {
  const formatted = new Date(value).toLocaleString('sv-SE', { timeZone: TOURNAMENT_TIME_ZONE });
  return formatted.slice(0, 16).replace(' ', 'T');
}

/**
 * O contrário · o que a pessoa digitou, **lido como horário de Brasília**.
 *
 * `new Date('2026-08-24T21:00')` interpreta no fuso do navegador · num admin
 * fora do Brasil isso grava outra hora, em silêncio, e o campeonato começa
 * errado pra todo mundo.
 *
 * A conta: chuta o instante como se fosse UTC, pergunta que horas esse instante
 * é **na zona**, e desconta a diferença. Uma passada basta porque o Brasil não
 * tem horário de verão · numa zona com DST isto precisaria de uma segunda.
 */
export function fromZonedInput(local: string): Date {
  const guess = new Date(`${local}:00Z`);
  const inZone = new Date(
    `${guess.toLocaleString('sv-SE', { timeZone: TOURNAMENT_TIME_ZONE }).replace(' ', 'T')}Z`,
  );
  return new Date(guess.getTime() - (inZone.getTime() - guess.getTime()));
}
