import { FORMATION_VARIANT, formationBase, type FormationId } from '@ggclubs/schemas';
import type { FormationVariant } from '@ggclubs/schemas';
import { useTranslation } from 'react-i18next';

/**
 * O nome da formação, partido em número e variante · `4-2-3-1-wide` vira
 * `{ base: '4-2-3-1', variant: 'wide' }`.
 *
 * **A variante vem da tabela do schema, não mais do sufixo do id.** Ela era
 * recortada do próprio slug, e isso descrevia a verdade enquanto três esquemas
 * eram exceção · a leitura do jogo em 04/08/2026 mostrou seis, dois deles sem
 * irmão pra desambiguar. O slug ficou como está, porque trocar valor gravado
 * seria migração pra ganhar uma palavra que hoje vem de outro lugar.
 *
 * O valor gravado é slug e o rótulo tem espaço, caixa e idioma, então ele é
 * montado na tela em vez de virar segundo campo no documento.
 */
export function formationParts(id: FormationId): {
  base: string;
  variant: FormationVariant | null;
} {
  return { base: formationBase(id), variant: FORMATION_VARIANT[id] };
}

/**
 * O rótulo pronto · `4-2-3-1-wide` vira `4-2-3-1 Aberto`.
 *
 * **Hook e não função solta** porque `t` só existe depois de o componente
 * montar · constante de módulo não pode chamar `t`, que é a armadilha
 * registrada no `docs/i18n.md`.
 *
 * **Mora aqui porque tem dois donos**: quem escolhe a formação e quem só a lê,
 * na página de quem não edita. Ele já esteve escrito nos dois, e duas cópias do
 * mesmo rótulo é como nasceram os três tamanhos de título em quatro páginas.
 */
export function useFormationLabel(): (id: FormationId) => string {
  const { t } = useTranslation();
  return (id) => {
    const { base, variant } = formationParts(id);
    return variant ? `${base} ${t(`formationVariant.${variant}`)}` : base;
  };
}

export type { FormationVariant };
