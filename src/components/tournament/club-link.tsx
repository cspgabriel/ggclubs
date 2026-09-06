import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ClubDirectory } from './tournament-shared.js';

/**
 * O link pro club dentro da página do campeonato · **arquivo próprio porque
 * componente mora com componente.**
 *
 * Ele saiu do `tournament-shared` em 01/09/2026 · aquele arquivo é o
 * vocabulário (tipos e funções puras), e misturar componente ali quebra o Fast
 * Refresh do `pnpm dev` · a regra está no `CLAUDE.md`, e desde 26/08 ela
 * **reprova** a bateria.
 */
/**
 * O nome de um club na chave · **link quando ele existe, texto quando não.**
 *
 * Pendência 107, fechada em 19/08/2026. O club que **jogou** e saiu depois
 * (encerrado pelo dono, reembolsado pela organização) continua na chave, porque
 * a partida aconteceu e apagá-la reescreveria a história do campeonato · o que
 * ele perde é o link, porque a página pública recusa club que não está ativo e
 * o clique caía num 404 nosso.
 *
 * **Ele nasce como componente e não como condição repetida** · são três lugares
 * que desenham nome de club (a tabela do grupo, a linha do confronto e a grade),
 * e a regra da casa manda extrair quando a segunda cópia aparece.
 */
export function ClubLink({
  tag,
  clubs,
  clubHref,
  className,
  children,
}: {
  tag: string;
  clubs: ClubDirectory;
  clubHref: (tag: string) => string;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const gone = clubs.get(tag)?.active === false;

  if (gone) {
    // **`title` e `sr-only`, e não um selo** · a linha do confronto já disputa
    // largura com placar, prova e desfecho, e "encerrado" ali empurraria o nome
    // que é o dado que importa.
    return (
      <span className={className} title={t('tournament.clubClosed')}>
        {children}
        <span className="sr-only">{t('tournament.clubClosed')}</span>
      </span>
    );
  }
  /**
   * **`data-club-tag` é o que faz o menu de contexto do desktop existir aqui** ·
   * a regra está em `docs/auth-e-desktop.md`, e é a que apodrece em silêncio: o
   * `resolveTarget` acha o alvo pelo atributo, então superfície nova que desenha
   * um club sem marcar cai em "aqui não tem nada" · foi assim com a vitrine e a
   * página do player em 08/08/2026. A chave e a tabela do campeonato eram os
   * dois últimos lugares sem marca.
   *
   * **A marca fica só neste ramo, e não no do club encerrado** · lá não há
   * âncora, e "abrir club" e "copiar link" levariam pra uma página que a API
   * recusa. Sem link, o resolvedor não monta o alvo · é o mesmo desenho do item
   * de favoritar, que só existe onde a estrela existe.
   */
  return (
    <Link data-club-tag={tag} to={clubHref(tag)} className={className}>
      {children}
    </Link>
  );
}
