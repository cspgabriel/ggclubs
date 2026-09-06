import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Título de seção dentro de uma tela · elenco, vitrine, e o que vier.
 *
 * Traz um traço verde curto antes do texto. Não é ornamento: com fundo quase
 * preto e tudo em caixa alta, seção sem marcador vira mais uma linha de texto e
 * a página perde o ritmo. O traço é o mesmo vocabulário do marquee e custa um
 * elemento · a regra da marca é gastar ousadia num lugar só.
 *
 * ---
 *
 * **O vão abaixo do título é dele, e de mais ninguém** · 19/08/2026, achado do
 * Eduardo: *"dá pra ver claramente a diferença de espaçamento do título dos
 * melhores terceiros pro card, comparado com o dos confrontos"* · e a frase que
 * importa vinha depois: *"isso não é só aí, mas em vários lugares do projeto"*.
 *
 * Ele estava certo, e o defeito era o mesmo em quatro telas: **quem precisava
 * de mais alguma coisa no cabeçalho embrulhava o título num `div` com margem
 * própria**, e as duas se somavam · 16 + 12 nos melhores terceiros, 16 + 16 na
 * vitrine de clubs, 16 + 16 no texto legal. Num lugar a soma foi **desfeita à
 * mão** com `-mb-4`, que é a mesma dívida com o sinal trocado.
 *
 * Por isso os três slots abaixo. Eles não são configuração: são **os três
 * lugares onde alguém já pendurou coisa num cabeçalho**, e tê-los aqui é o que
 * deixa a medida do vão existir uma vez só. `pnpm scan:spacing` reprova quem
 * voltar a embrulhar.
 */
export function SectionTitle({
  children,
  hint,
  meta,
  aside,
  flush = false,
  as: Tag = 'h2',
}: {
  children: ReactNode;
  /** A linha de baixo · explica a seção pra quem chegou nela. */
  hint?: ReactNode;
  /** Ao lado do título, na mesma linha · contagem, prazo, o que a seção **é**. */
  meta?: ReactNode;
  /** À direita do cabeçalho · legenda, filtro, o controle que é da seção. */
  aside?: ReactNode;
  /**
   * **Quem controla o vão é o container, e não o título.**
   *
   * A saída existe pra **um** caso, e ele é o acordeão: lá o cabeçalho é um
   * gatilho, e a margem de baixo do título vira 16px de área clicável morta
   * **dentro do botão** · com a seção fechada aquilo é vão fantasma entre ela e
   * a de baixo, e o Eduardo viu isso na seleção do texto em 19/08/2026.
   *
   * Não é atalho pra pendurar margem no pai · pra isso existem os slots acima,
   * e o `scan:spacing` continua reprovando.
   */
  flush?: boolean;
  /**
   * O elemento do título · `h2` por padrão.
   *
   * **Existe por causa da seção expansível** (19/08/2026): lá o cabeçalho já é
   * um `h2` que embrulha o gatilho do acordeão, e um segundo `h2` dentro dele
   * seria título dentro de título · quem usa leitor de tela ouve dois.
   */
  as?: 'h2' | 'span';
}) {
  const heading = (
    <div className="min-w-0">
      <Tag className="flex items-start gap-2.5 font-display text-lg uppercase tracking-tight">
        {/**
         * **O traço se alinha à PRIMEIRA linha, e não ao bloco** · 19/08/2026,
         * achado do Eduardo no celular, onde "QUEM JÁ ESTÁ DENTRO" quebra em
         * duas linhas.
         *
         * Com `items-center` ele ia parar no meio das duas, flutuando ao lado
         * de nada · o marcador de seção tem que apontar pro começo dela. O
         * recuo é em `em` de propósito: ele é metade do respiro da linha
         * (`leading` 1.5 menos a altura do traço), então ele acompanha o corpo
         * da fonte em vez de virar um número certo numa largura só.
         */}
        <span aria-hidden className="mt-[0.25em] h-4 w-1 shrink-0 rounded-full bg-primary" />
        {/*
          **O texto vem embrulhado, e o embrulho não é enfeite.** Todo filho de
          um container flex vira item, inclusive trecho de texto solto · um
          título com destaque no meio (`<0>` do i18next, por exemplo) virava
          três itens e o `gap-2.5` aparecia **dos dois lados da palavra
          destacada**, alargando o espaço só ali. Com um filho só, o gap separa
          o traço do texto e mais nada.

          Medido no título da prévia de documento legal, onde o idioma e a
          versão são destacados em verde.
        */}
        <span className="min-w-0">
          {children}
          {/*
            **O `meta` mora dentro da linha do título, e é isso que alinha ele.**
            Enquanto era irmão do título num flex de fora, ele se alinhava
            contra a **caixa** do título · que carrega a margem de baixo, então
            a base dele nunca batia com a do texto. Aqui os dois dividem a mesma
            linha e o alinhamento sai de graça.
          */}
          {meta && (
            <span className="mt-0.5 block whitespace-nowrap text-[11px] font-normal uppercase tracking-widest text-muted-foreground sm:ml-2 sm:mt-0 sm:inline">
              {meta}
            </span>
          )}
        </span>
      </Tag>
      {hint && (
        <p className="ml-[calc(0.25rem+0.625rem)] mt-1 text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        !flush && 'mb-4',
        aside && 'flex flex-wrap items-center justify-between gap-x-6 gap-y-2',
      )}
    >
      {heading}
      {aside}
    </div>
  );
}
