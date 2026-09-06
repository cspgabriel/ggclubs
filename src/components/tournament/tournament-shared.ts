import { countsForStandings, standingsOf } from '@ggclubs/schemas';
import { type MatchCard, type TournamentClubCard } from '@ggclubs/schemas';
import type { RegistrationCard } from '@/lib/api';

/**
 * O que a página do campeonato compartilha. · **O vocabulário da página · os tipos e as peças que todo bloco usa.**
 *
 * **A base existe porque quase todo bloco precisa dos tipos de callback**
 * (`ClubDirectory`, `MatchChatting`, `MatchReporting`) e das funções de grupo ·
 * sem tirá-los do lugar o corte fecharia em ciclo.
 *
 * **O `ClubLink` NÃO mora aqui** · ele é componente, e componente num arquivo de
 * função pura quebra o Fast Refresh. Ele está no `club-link.tsx` ao lado, e foi
 * pra lá em 01/09/2026 justamente por isso.
 *
 * > **Era um arquivo de 4.118 linhas até 01/09/2026** · o corte é a fase 2 do
 * > [arquitetura.md](../../../../docs/arquitetura.md), e o motivo dele está escrito
 * > lá: arquivo que ninguém lê inteiro é arquivo onde a exceção se esconde.
 */

/**
 * Lançar placar · **ausente na moldura aberta, e é por isso que o botão não
 * aparece lá.** Declarar exige sessão e papel no club, então quem não pode agir
 * não vê a ação · é a mesma divisão do `join`.
 *
 * **As tags andam junto do gatilho de propósito**, e não como duas props: elas
 * não são "os meus clubs" (esse é o `myClubTags`, que só acende a linha), são
 * **aqueles em que eu mando**. Separadas, a próxima tela passaria uma e
 * esqueceria a outra, e o botão apareceria pra quem é só membro · oferecendo
 * uma ação que a rota recusa.
 */
/**
 * **O club como a chave o desenha** · nome, escudo, e se ele ainda tem página.
 *
 * `active: false` é o club encerrado que **jogou** · ele continua na chave,
 * porque a partida aconteceu, e o nome dele deixa de ser link porque a página
 * pública recusa club que não está ativo.
 */
export type DirectoryEntry = RegistrationCard['club'] & { active: boolean };

export type ClubDirectory = Map<string, DirectoryEntry>;

/**
 * **O dicionário da chave, e ele não é a grade** · pendência 107, 19/08/2026.
 *
 * A grade lista quem **ocupa vaga**; a chave mostra quem **jogou**, e os dois
 * deixaram de ser o mesmo conjunto no dia em que encerrar club soltou a vaga e o
 * reembolso passou a existir. Montado só com `registrations`, o club que saiu
 * depois de jogar aparecia como a **tag em maiúsculas** com um link pra um 404.
 *
 * O `directory` vem da mesma resposta e cobre **todos** os clubs da chave · a
 * grade entra por baixo pra o caso de a chave nem existir ainda.
 */
export function directoryOf(
  registrations: RegistrationCard[],
  directory: TournamentClubCard[],
): ClubDirectory {
  return new Map([
    ...registrations.map(
      (row) => [row.club.tag, { ...row.club, active: true }] as [string, DirectoryEntry],
    ),
    ...directory.map((club) => [club.tag, club] as [string, DirectoryEntry]),
  ]);
}

/**
 * **A conversa, do ponto de vista da tela da edição.**
 *
 * `unread` chega de fora porque ele é dado de sessão · a chave é pública e não
 * sabe quem está olhando. Ele existe pra a sala **não ficar escondida**: o
 * número aparece no confronto antes de alguém abrir nada.
 */
export type MatchChatting = {
  /** Quantas mensagens novas em cada partida · ausência é zero. */
  unread: Record<string, number>;
  /**
   * **Por quais clubs EU falo** · e não em quais eu jogo.
   *
   * Quem entra na sala é dono ou gerente (é o `SPEAKING_ROLES` do servidor), e
   * sem esta lista o jogador do elenco via o botão e levava "não autorizado" ·
   * controle inerte sem explicação, que é a regra que este produto mais
   * persegue.
   */
  tags: string[];
  open: (match: MatchCard) => void;
};

export type MatchReporting = {
  /**
   * Onde quem olha é **dono** · desde 18/08/2026, e como a posse é uma por
   * pessoa, isto tem no máximo um item.
   */
  tags: string[];
  open: (match: MatchCard, clubTag: string) => void;
};


/**
 * As partidas de uma fase, repartidas por grupo.
 *
 * **`?? -1` continua aqui de propósito, e agora ele é inalcançável na fase de
 * grupos** · quem tem `groupIndex` nulo é partida de mata-mata, e ela já foi
 * separada uma camada acima. O fallback fica como rede: partida de grupo sem
 * índice é dado incoerente, e cair num balde é melhor que sumir da tela.
 */
export function groupsOf(matches: MatchCard[]): [number, MatchCard[]][] {
  const groups = new Map<number, MatchCard[]>();
  for (const match of matches) {
    const key = match.groupIndex ?? -1;
    groups.set(key, [...(groups.get(key) ?? []), match]);
  }
  return [...groups.entries()].sort(([a], [b]) => a - b);
}

/**
 * A letra do grupo · **e ela nunca mais recebe um índice negativo.**
 *
 * `String.fromCharCode(64)` é `@`, e era o que a tela pública desenharia na
 * primeira partida de mata-mata gravada, porque ela tem `groupIndex` nulo e o
 * agrupamento caía num balde `-1`. Hoje quem separa é a **fase**, uma camada
 * acima.
 */
export function groupLetter(index: number): string {
  /**
   * **A guarda contra o índice negativo, que voltou a ser alcançável.**
   *
   * `groupsOf` reparte por `groupIndex ?? -1`, e ele roda **dentro de cada
   * fase** · a fase separa a lista, não o agrupamento de dentro dela. Numa
   * partida de mata-mata (que tem `groupIndex: null`) o `-1` chega aqui e
   * `String.fromCharCode(64)` desenha **"@"** em display no cabeçalho.
   *
   * O texto abaixo afirmava que isso não era mais possível · era mentira, e o
   * `revisor` pegou em 19/08/2026. **A guarda é mais barata que a promessa.**
   */
  if (index < 0) return '';
  return String.fromCharCode(65 + index);
}

/**
 * **Veio do `tournament-standings` em 01/09/2026** · função pura em arquivo de
 * componente quebra o Fast Refresh, e desde 26/08 o `pnpm lint` **reprova** por
 * isso. A regra está no `CLAUDE.md`: arquivo de componente exporta componente.
 */
/**
 * Um grupo · **a lista primeiro, os jogos depois.**
 *
 * A ordem responde a pergunta do dia do sorteio (*"com quem eu caí"*) antes da
 * pergunta do dia do jogo (*"contra quem, e quando"*). **A lista é a
 * classificação nascendo** · hoje ela mostra quem está no grupo, e ganha as
 * colunas (PJ, V, E, D, saldo, pontos) no bloco do resultado, sem mudar de
 * forma.
 *
 * **A letra do grupo não é bloco verde chapado**, e a recusa é regra da casa: o
 * chapado é reservado (é o `PositionMark`), e doze blocos verdes numa tela
 * matariam o destaque que o verde existe pra dar. Aqui ele é **acento** ·
 * contorno e texto.
 */
/**
 * A tabela de um grupo, a partir das partidas dele.
 *
 * **Ela saiu de dentro do `GroupCard` em 19/08/2026** e o motivo não é estético:
 * a repescagem dos melhores da posição seguinte compara **os grupos entre si**,
 * então alguém acima dos cards precisa das tabelas todas. Calcular lá em cima e
 * passar pronto é mais barato e, sobretudo, garante que a tabela desenhada é a
 * mesma que decidiu a zona.
 */
export function groupStandings(matches: MatchCard[]) {
  // Quem está no grupo sai das próprias partidas · a ordem é a de aparição, que
  // é a do sorteio, e é ela que desempata quando tudo mais empata.
  const tags: string[] = [];
  for (const match of matches) {
    for (const tag of [match.homeTag, match.awayTag]) if (!tags.includes(tag)) tags.push(tag);
  }

  /**
   * **A tabela é calculada aqui, e nunca vem gravada** · a fonte é uma só (as
   * partidas fechadas), e um contador no documento divergiria dela no dia em
   * que o admin corrigisse um placar numa disputa.
   */
  const played = matches.flatMap((m) =>
    // **O W.O. duplo não entra na tabela** · nem ponto, nem gol, nem jogo. A
    // pergunta é a mesma que o servidor faz pra decidir quem classifica, e por
    // isso ela mora em `countsForStandings` e não numa condição escrita aqui.
    m.score && countsForStandings(m) ? [{ homeTag: m.homeTag, awayTag: m.awayTag, ...m.score }] : [],
  );

  return {
    tags,
    anyPlayed: played.length > 0,
    table: standingsOf(
      tags,
      played.map((p) => ({
        homeTag: p.homeTag,
        awayTag: p.awayTag,
        homeGoals: p.home,
        awayGoals: p.away,
      })),
    ),
  };
}
