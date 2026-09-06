import { formatCents, formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Um valor em dinheiro grande · **o símbolo colado no número, e não em
 * `Archivo Black`.**
 *
 * ## Quatro tentativas no mesmo ponto, e o que estava errado nas três primeiras
 *
 * O defeito original é do **glifo**: em `Archivo Black` o `$` tem o mesmo peso
 * do algarismo e as duas barras cortam a haste, então num corpo grande ele lê
 * como parte da palavra em vez de anunciar o número.
 *
 * Eu tentei **encolher** o símbolo, depois **espaçá-lo em caixa alta**, e então
 * **tirá-lo de perto do número** e pôr como legenda. As duas primeiras eram
 * ajuste de valor num problema de modelo; a terceira trocou o modelo, e trocou
 * pro lado errado · **o Eduardo quis o símbolo com a mesma atenção do número**,
 * como era no começo, e ele está certo: `R$ 550` é uma coisa só, e separar
 * transforma o valor em rodapé de si mesmo.
 *
 * **O que resolve é trocar a família só do símbolo.** O `R$` fica colado e
 * grande, em `Plus Jakarta Sans` (a outra família da marca, já servida), onde o
 * cifrão tem haste fina e uma barra só; o número continua em `font-display` com
 * `tabular-nums`, e **os dois dividem o mesmo gradiente**, porque o recorte de
 * fundo do `.text-brand-gradient` atravessa os filhos.
 *
 * **Nenhuma família nova**, e essa é a decisão de PO que não muda: fonte custa
 * download na tela que é o funil de aquisição, e a identidade do produto são
 * duas famílias (`docs/design.md`). O que faltava era usar **a que já existe**
 * no caractere em que a de display é ruim.
 */
/**
 * **`exact` escreve os centavos mesmo quando eles são zero** · pedido do Eduardo
 * em 05/09/2026, olhando a premiação: `R$ 500` virou `R$ 500,00`.
 *
 * Ele é opcional porque os dois casos existem de verdade: **prêmio é dinheiro
 * que alguém vai receber** e se escreve por extenso, enquanto a prova social
 * ("R$ 3 mil em prêmios") lê melhor redonda. A régua é a mesma do `formatPrice`,
 * que já existia pra o que vira cobrança.
 */
export function Money({
  cents,
  className,
  exact = false,
}: {
  cents: number;
  className?: string;
  exact?: boolean;
}) {
  const { symbol, amount } = splitCurrency(exact ? formatPrice(cents) : formatCents(cents));

  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      {/*
        `0.72em` e não `1em`: a `Plus Jakarta` tem caixa-alta mais alta que a
        `Archivo Black` no mesmo corpo, então em tamanho igual o símbolo passaria
        do topo do algarismo. Medido nos três corpos em que o valor aparece (card,
        capa e prova social).
      */}
      <span className="font-sans text-[0.72em] font-extrabold">{symbol}</span>
      <span className="tabular-nums">{amount}</span>
    </span>
  );
}

/**
 * Separa "R$ 550" em símbolo e número.
 *
 * **Pelo formatador e não por `replace('R$','')`** · o `Intl` decide onde a
 * moeda fica e qual espaço usa (ele emite um espaço estreito, não um espaço
 * comum), e cravar a string quebraria no dia em que a moeda mudar.
 */
export function splitCurrency(formatted: string): { symbol: string; amount: string } {
  const match = /^(\D+)\s*(.+)$/.exec(formatted.trim());
  if (!match?.[1] || !match[2]) return { symbol: '', amount: formatted };
  return { symbol: match[1].trim(), amount: match[2] };
}
