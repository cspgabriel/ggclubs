import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { SectionTitle } from '@/components/ui/section-title';
import { cn } from '@/lib/utils';

/**
 * Uma seção que abre e fecha · **o remédio da página que ficou longa.**
 *
 * Ela nasce em 19/08/2026, no cenário de 48 clubs: a página da edição passava
 * de dezessete mil pixels no celular, e a maior parte disso é **consulta**
 * (setenta e dois confrontos, quarenta e oito inscritos, o regulamento) numa
 * tela que é **superfície de venda**. Quem chega pelo link do Discord precisa
 * decidir se entra, e rolar doze telas de tabela antes disso é o funil vazando.
 *
 * **O que ela NÃO é:** uma forma de esconder conteúdo. Cada seção diz no
 * cabeçalho o que tem dentro (a contagem), e o estado inicial é decisão de
 * produto · o regulamento abre **aberto**, porque quem paga tem de ler antes.
 *
 * ---
 *
 * **É o `Accordion` do Radix, e não um `useState` com `{open && ...}`** ·
 * pedido do Eduardo no mesmo dia: *"precisa trabalhar bem nas animações"*.
 *
 * Altura não se anima em CSS sem saber o valor final, e o Radix resolve isso
 * medindo o conteúdo e publicando `--radix-accordion-content-height` · as duas
 * keyframes (`accordion-down` e `accordion-up`) **já existiam** no tema da
 * casa, usadas pelo FAQ da landing. Fazer na mão daria um corte seco, que é
 * pior que não ter animação: o conteúdo aparece do nada e o olho perde o lugar.
 *
 * **Fechada, ela não renderiza o conteúdo** · o Radix desmonta, e numa chave de
 * 72 confrontos isso é a árvore de React inteira que deixa de existir.
 */
export function CollapsibleSection({
  title,
  meta,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  /** O que tem dentro · contagem, prazo, o que responder antes de abrir. */
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AccordionPrimitive.Root
      type="single"
      collapsible
      defaultValue={defaultOpen ? 'aberta' : undefined}
      asChild
    >
      <section className={className}>
        <AccordionPrimitive.Item value="aberta">
          <AccordionPrimitive.Header asChild>
            {/**
             * **O cabeçalho inteiro é o alvo** · um chevron de 16px como única
             * área de clique fura a regra dos 44px, e o título já está ali.
             */}
            <h2 className="flex">
              <AccordionPrimitive.Trigger className="group flex w-full items-center gap-3 text-left [&[data-state=open]>svg]:rotate-180">
                <span className="min-w-0 flex-1">
                  <SectionTitle as="span" flush meta={meta}>
                    {title}
                  </SectionTitle>
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    'group-hover:text-foreground',
                  )}
                />
              </AccordionPrimitive.Trigger>
            </h2>
          </AccordionPrimitive.Header>

          <AccordionPrimitive.Content
            className={cn(
              'overflow-hidden',
              'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
              // **Quem tem `motion-reduce` não recebe salto de altura** · a
              // regra da casa vale aqui como vale nos diálogos.
              'motion-reduce:animate-none',
            )}
          >
            {/**
             * **O vão entre o cabeçalho e o conteúdo mora AQUI DENTRO** ·
             * 19/08/2026, achado do Eduardo na seleção do texto.
             *
             * Enquanto ele era a margem do título, ele existia também com a
             * seção **fechada** · 16px de nada entre o gatilho e a seção
             * seguinte, somando com o vão da página. Dentro do conteúdo ele
             * some junto com ele, e ainda anima junto.
             */}
            <div className="pt-4">{children}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      </section>
    </AccordionPrimitive.Root>
  );
}
