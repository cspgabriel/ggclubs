const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const brlWithCents = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/**
 * Dinheiro **redondo quando é redondo**, pra comunicação · premiação,
 * faturamento, placar.
 *
 * **Não use pra valor que alguém paga** · pra isso existe o `formatPrice`, que
 * sempre escreve os centavos, como um recibo.
 *
 * **Ele arredondava SEMPRE até 04/09/2026**, e isso mordeu duas vezes: em 13/08
 * a inscrição de R$ 39,90 virou *"R$ 40"* na tela, e a regra foi escrita aqui ·
 * em 04/09 o Eduardo achou o mesmo defeito no **painel de pagamentos do admin**,
 * com oito cobranças de R$ 49,90 listadas como **R$ 50**. Ou seja: a regra
 * existia, estava escrita, e o defeito voltou por outro caminho.
 *
 * **Por isso ele deixou de esconder centavo que existe.** Um prêmio de R$ 500
 * continua saindo *"R$ 500"* (que é o ponto desta função), e um de R$ 598,80
 * passa a sair inteiro em vez de virar *"R$ 599"*. **O arredondamento só é
 * inofensivo quando não há o que arredondar** · fora disso ele é a tela dizendo
 * um número e o dinheiro sendo outro.
 */
export function formatCents(cents: number): string {
  return (cents % 100 === 0 ? brl : brlWithCents).format(cents / 100);
}

/**
 * Dinheiro **exato**, pro que a pessoa paga · inscrição, cobrança, reembolso.
 *
 * **Existe porque a tela mostrava `R$ 40` numa inscrição de R$ 39,90**, achado
 * em 13/08/2026 olhando a captura · e ele estava escrito aqui desde sempre, sem
 * nenhum chamador, enquanto o arredondado servia os dois casos.
 *
 * A regra é curta: **valor que vira cobrança nunca arredonda.** Prometer menos
 * do que se cobra é o desfecho pior, e prometer mais é dinheiro perdido.
 */
export function formatPrice(cents: number): string {
  return brlWithCents.format(cents / 100);
}

/** Parse "R$ 3.500,00" or "3500,50" or "3500" into integer cents. Returns null on garbage. */
export function parseCentsFromBrl(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
