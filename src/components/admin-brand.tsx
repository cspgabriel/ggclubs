import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BrandSymbol, Wordmark } from '@/components/brand';
import { cn } from '@/lib/utils';

/**
 * A marca com o selo de admin · o mesmo bloco no `/app` e no `/admin`.
 *
 * **Ele existe porque as duas telas mostram a mesma coisa e mostravam de
 * jeitos diferentes.** O selo nasceu só no admin; quando ele passou a existir
 * no app também, duas cópias teriam divergido na primeira vez que alguém
 * mexesse numa · é a mesma razão do header único.
 *
 * ## O selo é acesso, não aviso
 *
 * No `/app` ele **leva pro admin**; no `/admin` ele é estado, e não link ·
 * link pra onde você já está não é navegação, é ruído. Quem decide é o
 * `badgeTo`.
 *
 * **Ele chama atenção uma vez e cala.** O pedido original era um pisca
 * contínuo, e eu recusei: piscar sem parar é linguagem de alerta ("tem coisa
 * pra resolver"), e o selo não é alerta, é porta. Alerta que nunca acaba a
 * pessoa aprende a ignorar, e de quebra ele brigaria com a regra de um verde
 * chamativo por tela. O que ficou é o anel abrindo **duas vezes na entrada**,
 * mais um hover de verdade · pega o olho de quem chegou e some.
 *
 * ## Os 380px
 *
 * Abaixo disso não cabem marca, selo, idioma e conta na mesma linha: sobram
 * 150px pro bloco da marca e ele precisa de 158, medido nos dois idiomas.
 * Entra o símbolo no lugar do logotipo, que é o que o `docs/design.md` manda
 * pra espaço pequeno · e os dois nunca aparecem juntos, porque o símbolo **é**
 * o GG e lado a lado a inicial apareceria duas vezes.
 */
export function AdminBrand({ badgeTo }: { badgeTo?: string }) {
  const { t } = useTranslation();

  const badge = (
    <span
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/25',
        // Aqui o verde carrega significado, que é a condição pra ele ser usado ·
        // ver docs/design.md.
        badgeTo &&
          'animate-ring-once transition-colors motion-reduce:animate-none hover:bg-primary/20 hover:ring-primary/50',
      )}
    >
      <ShieldCheck className="h-4 w-4" aria-hidden />
    </span>
  );

  return (
    // **`min-w-0` aqui também, e não só no `Link`** · a primeira tentativa
    // soltou só o filho e a medida voltou **idêntica**, byte por byte: um pai
    // `shrink-0` mantém a largura intrínseca por mais que o filho ceda. É a
    // mesma assinatura da tentativa que falhou na linha da chave, no mesmo
    // bloco · **conserto que não muda o número não entrou.**
    <div className="flex min-w-0 shrink items-center gap-2">
      {/* A marca leva pro `/app` nas duas telas · no admin ela é a única saída
          da área, e no app ela é a volta pro feed. */}
      {/**
       * **A marca CEDE, e é isso que impede o header de vazar** · conserto de
       * 29/08/2026, achado quando o `scan:overflow` passou a enxergar.
       *
       * Ela era `shrink-0` como todo o resto da fileira, e o `min-[380px]`
       * abaixo foi calibrado quando as ações tinham **três** peças (154px). A
       * bandeja de conversas virou a quarta em 28/08 (**198px**, +44), o número
       * aqui não foi revisitado, e o header do admin passou a vazar **41px a
       * 390** e 1px a 430 · a faixa do celular mais comum.
       *
       * **Ajustar o número seria a terceira rodada do mesmo defeito** · o `nav`
       * já teve que descer de `sm` pra `lg` pelo mesmo motivo (pendência 80).
       * Com todos os filhos `shrink-0`, cada peça nova exige recalibrar à mão um
       * valor que ninguém lembra que existe · e o header do **player**, ao lado,
       * nunca teve o problema porque a marca dele encolhe (medida: 106px a 320,
       * 161px a 430, e zero vazamento em sete larguras).
       *
       * **O degrau fica**, e ele resolve outra coisa: abaixo de 380 o símbolo
       * lê melhor que um wordmark espremido. O que muda é o wordmark **poder**
       * ceder acima dele, em vez de empurrar a fileira pra fora da tela.
       */}
      <Link
        to="/app"
        className="flex min-w-0 shrink items-center"
        aria-label={t('common.brandName')}
      >
        <BrandSymbol className="h-7 w-7 shrink-0 min-[380px]:hidden" />
        <Wordmark className="hidden min-[380px]:block" />
      </Link>

      {badgeTo ? (
        <Link
          to={badgeTo}
          title={t('admin.badge')}
          aria-label={t('admin.badge')}
          className="flex shrink-0 rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {badge}
        </Link>
      ) : (
        // Sem link, mas com nome: leitor de tela precisa saber que esta área tem
        // poder, e é o selo que diz isso.
        <span role="img" title={t('admin.badge')} aria-label={t('admin.badge')}>
          {badge}
        </span>
      )}
    </div>
  );
}
