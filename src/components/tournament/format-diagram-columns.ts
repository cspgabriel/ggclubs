/**
 * **Quantas colunas o diagrama do formato usa** · e a conta é de distribuição,
 * não de largura.
 *
 * O defeito que criou este módulo é de 03/09/2026, achado do Eduardo olhando a
 * Copa de Estreia: com **8 grupos** a grade tinha teto de 6 colunas, então ela
 * quebrava em **6 na primeira linha e 2 na segunda** · uma fileira cheia e uma
 * fileira quase vazia, com o vão morto ao lado dos dois. *"No mobile já fica
 * diferente e com mais espaço vazio/estranho/mal aproveitado."*
 *
 * **A causa não era o teto estar errado, era o teto ser a resposta.** Teto fixo
 * só acerta quando a contagem é múltipla dele, e a contagem aqui é dado: os
 * degraus da Copa de Estreia (32/24/16 em grupos de 4) dão **8, 6 e 4** grupos,
 * e uma edição de 48 daria 12.
 *
 * A conta tem dois passos, e a ordem deles é o desenho:
 *
 * 1. **as menos linhas que cabem no teto** · `ceil(grupos / teto)`;
 * 2. **as colunas que enchem essas linhas por igual** · `ceil(grupos / linhas)`.
 *
 * O segundo passo é o que conserta o 6+2: com teto 6 e 8 grupos, duas linhas
 * bastam, e duas linhas de **4** leem melhor que uma de 6 e uma de 2.
 *
 * | grupos | teto 4 | teto 6 |
 * |---|---|---|
 * | 4 | 4 | 4 |
 * | 6 | 3+3 | 6 |
 * | 8 | 4+4 | 4+4 |
 * | 12 | 4+4+4 | 6+6 |
 *
 * **A garantia é exatamente esta, e nem uma palavra a mais:** dadas as menos
 * linhas possíveis, ela é a escolha que deixa a **última linha mais cheia** ·
 * como o resto é `n - (linhas-1) * colunas`, ele só cresce quando as colunas
 * encolhem, e `ceil(n / linhas)` já é o menor número de colunas que cabe. Não é
 * o mesmo que prometer última linha sempre cheia: 10 grupos com teto 4 dão
 * 4+4+2 e 13 dão 4+4+4+1, e nenhuma grade de linhas iguais faz melhor sem
 * gastar mais uma linha. É o "degradar com dignidade" · o caso que o produto
 * tem hoje é 4, 6, 8 e 12.
 */

/**
 * **Quatro é o teto do celular**, e ele é preferência de leitura, não de espaço:
 * a 430px caberiam seis, e o Eduardo pediu o contrário · *"12 em 4+4+4 melhor
 * que 6+6 no celular"*. Coluna alta e estreita lê como grupo; fileira de seis
 * lê como régua.
 *
 * Ele também é o teto de `sm` e `md` de propósito, porque **a largura do
 * diagrama não cresce em linha reta com a da tela**: a partir de `sm` ele passa
 * a dividir a linha com a frase, e a caixa dele a 768px é mais estreita do que
 * era a 700 empilhada.
 */
export const DIAGRAM_COLUMN_CAP = 4;

/**
 * **Seis a partir de `lg`**, onde a coluna do diagrama passa de ~360px · é o que
 * poupa uma linha inteira em 12 grupos (6+6 em vez de 4+4+4) na largura em que
 * a altura do painel é o que sobra.
 */
export const DIAGRAM_COLUMN_CAP_LG = 6;

/**
 * As colunas pra `groups` caixinhas sem deixar a última linha órfã · ver o
 * cabeçalho deste arquivo pra a conta e pra o que ela garante.
 */
export function balancedColumns(groups: number, cap: number): number {
  if (groups < 1) return 1;
  const rows = Math.ceil(groups / cap);
  return Math.ceil(groups / rows);
}
