import type { TFunction } from 'i18next';

/**
 * O que a ficha da EA sabe sobre um club · **só função pura, tipo e constante**.
 *
 * **Mora fora do componente por causa do Fast Refresh** · o arquivo do card
 * exportava o `unitLabel` junto dos componentes, e o Vite avisava em toda
 * edição: *"Could not Fast Refresh (unitLabel export is incompatible)"*. O lint
 * `react-refresh/only-export-components` já dizia isso e eu tinha deixado
 * passar como aviso · o preço apareceu no `pnpm dev` do Eduardo, recarregando a
 * página inteira a cada mudança.
 *
 * A regra vale pro repositório e mora no `CLAUDE.md` · **arquivo de componente
 * exporta componente**, e constante e função vão pra um módulo ao lado.
 */

/**
 * A ficha de um club vindo da API interna de Pro Clubs do EA FC.
 *
 * **É desenho sobre dado de terceiro, e continua sendo levantamento** · nada
 * daqui é gravado nem consumido por tela de produto.
 *
 * ## O número da busca NÃO é a história do club
 *
 * A primeira versão desta ficha tirava tudo de `/allTimeLeaderboard/search`, e
 * o Eduardo apontou que *"o Pipokets na teoria tem muito mais que 275 jogos"*.
 * Ele estava certo, e medir os dois endpoints no mesmo club mostrou o tamanho
 * do erro:
 *
 * | | busca | `overallStats` |
 * |---|---|---|
 * | jogos | 275 | **1563** |
 * | vitórias | 121 | **706** |
 * | gols | 837 | **4506** |
 * | acessos | 6 | **56** |
 *
 * As duas contas fecham internamente (121+42+112 = 275, 706+225+632 = 1563),
 * então a busca devolve **uma janela** e não o acumulado. Qual janela a EA não
 * diz, e por isso esses números **não aparecem aqui**: número que não dá pra
 * rotular com honestidade é pior que número ausente.
 *
 * **A busca serve pra achar o club (nome → `clubId`) e pra ler o kit.** Todo
 * acumulado vem do `overallStats`.
 *
 * ## E é pior que uma janela: os números dela são inválidos
 *
 * Medido depois, e é o achado que fecha o assunto · o **mesmo club, no mesmo
 * minuto**, em duas fontes:
 *
 * | club | leaderboard | busca por nome |
 * |---|---|---|
 * | Gimme 20p FC | divisão 2, 466 jogos | divisão **0**, **0** jogos |
 * | swqaasdc | divisão 4, 485 jogos | divisão **8**, 68 jogos |
 * | UNDATEABLES | divisão 4, 722 jogos | divisão **0**, **0** jogos |
 *
 * **8 de 8 clubs do topo divergem.** A escala real de `currentDivision` é
 * **1 a 6** (o Clubs League tem seis) e a de `reputationtier` é **0 a 3** · a
 * busca devolve 8, 9, 12 e 6. O `/allTimeLeaderboard` e o `/clubs/overallStats`
 * batem entre si em 100 de 100 clubs; a busca não bate com ninguém.
 *
 * > **Isto me fez corrigir o Eduardo errado.** Ele disse que não existe divisão
 * > 9, eu medi de 1 a 12 e afirmei que existia · a amostra maior só confirmou o
 * > lixo com mais casas. Amostra grande de campo quebrado não vira verdade.
 *
 * Por isso o tipo `EaClubRow` **não declara nenhum número** · o que não está no
 * tipo ninguém desenha por engano.
 *
 * ## O escudo é o de verdade, e o do uniforme é a reserva
 *
 * As cinco primeiras URLs que eu tentei erravam host e raiz · `custombadges` em
 * `media.contentapi.ea.com` não existe (aquele host serve arte de marketing), e
 * a família do CDN é `eafcNN`, não `fifaNN`. A que funciona é **a que a própria
 * página de Clubs da EA pede**, e ela está em `CREST_BASE` abaixo.
 *
 * **Qual identificador entra na URL depende do `selectedKitType`**, e isso foi
 * conferido em quatro clubs:
 *
 * | `selectedKitType` | usa | o que é |
 * |---|---|---|
 * | `0` | `clubInfo.teamId` | escudo licenciado · o club escolheu um time real |
 * | `1` | `customKit.crestAssetId` | escudo do catálogo de badges da EA |
 *
 * O Pipokets tem tipo `0` e `teamId 110374` · o escudo dele é o da Fiorentina, e
 * **não** o `crestAssetId`. Os dois carregam; só um é o que o jogo mostra, e
 * quem confirmou qual foi o Eduardo.
 *
 * **O controle que valida a medição:** id inventado (`l999999999`, `l0`) devolve
 * 404 · ou seja, "carregou" significa conteúdo real e não placeholder do CDN.
 * Sem esse controle, qualquer URL "funcionaria".
 *
 * **A reserva é necessária, não decorativa** · nem todo `teamId` tem escudo (o
 * club `123762` dá 404), e aí entra o disco com as cores do kit. É a regra do
 * `docs/design.md` · reserva é design, não degradação.
 */

/**
 * Só existe **256x256** · varri 16 tamanhos e os outros 15 dão 404. Reduzir no
 * CSS é o caminho.
 *
 * **Os três hosts servem bytes idênticos** · `eafc24`, `eafc25` e `eafc26`
 * respondem 200 com o mesmo sha1 e os mesmos 6154 B. Medido.
 *
 * **Fica o `eafc26`, o do jogo atual**, e a escolha tem história: chegou aqui
 * como `eafc24` na base de que *"é o que a página da EA pede hoje"* · isso veio
 * de uma captura de rede que **eu não consegui reproduzir** (a página da EA não
 * abre desta máquina, mesmo bloqueio por IP que dá 403 na API). Sem essa prova,
 * sobra o argumento do Eduardo, que é o mais defensável: a árvore de asset é por
 * edição do jogo, e a do ano corrente é a que tem menos chance de ser congelada.
 *
 * > **A camisa não foi encontrada** · varri 58 caminhos irmãos (`kits`, `shirts`,
 * > `jerseys`, `teamkits`… em três tamanhos e três ids) e nenhum respondeu 200.
 * > Não é prova de que não existe, é o que a varredura por caminho alcança.
 */
export const CREST_BASE =
  'https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256';

/**
 * Os dois ids possíveis, **na ordem que o jogo usa**.
 *
 * A EA devolve dois escudos e eles são coisas diferentes, não alternativas:
 * `crestAssetId` é o **brasão do catálogo** que o club escolheu, e `teamId` é o
 * **escudo do time licenciado** cujo uniforme ele veste. No Pipokets os dois são
 * roxos: o brasão diz "ASSIDUE PUGNARE" e o `teamId` é a Fiorentina.
 *
 * **Quem manda é o `selectedKitType`**, e quem confirmou foi o Eduardo olhando o
 * jogo: com tipo `0` o club adota o time licenciado, escudo incluído · é a
 * Fiorentina que aparece, não o brasão.
 *
 * > **Eu tinha invertido isto.** Medi que `crestAssetId` nunca falha (0 de 14) e
 * > `teamId` falha 3 de 14, e deixei o brasão na frente **por robustez** · o
 * > problema é que robustez não é correção. A ordem certa é a do jogo, e o que a
 * > medição resolve é a **queda**, não a escolha.
 *
 * Então: o do tipo primeiro, o outro como queda, disco do uniforme por último.
 */
export function crestUrlsOf(club: EaClubRow): string[] {
  const kit = club.clubInfo?.customKit ?? {};
  const licensed = club.clubInfo?.teamId;
  const ordered =
    String(kit.selectedKitType) === '1'
      ? [kit.crestAssetId, licensed]
      : [licensed, kit.crestAssetId];
  return ordered.filter(Boolean).map((id) => `${CREST_BASE}/l${String(id)}.png`);
}

/** As cores do kit chegam como decimal (`15921906`) · viram `#f2f2f2`. */
export function kitColor(raw: string | undefined, fallback: string): string {
  // **String vazia vira 0 e passa nas guardas** · `Number('')` é 0 e é finito,
  // então kit sem cor pintava PRETO em vez de cair na reserva. O teste de
  // ausência vem antes da conversão.
  if (raw === undefined || raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return `#${(value & 0xffffff).toString(16).padStart(6, '0')}`;
}

/** Duas letras · é o que cabe legível num disco de 56px (piso do design.md). */
export function monogramOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

/**
 * O que a busca devolve por club · **tudo string**, inclusive número, e é assim
 * que a EA manda. Converter no consumo em vez de confiar no tipo declarado é o
 * que impede `"121" + "42"` virar `"12142"`.
 */
export type EaClubRow = {
  clubId: string;
  clubName: string;
  platform: string;
  clubInfo?: { name?: string; teamId?: number | string; customKit?: Record<string, string> };
};

/**
 * O acumulado do club · `/clubs/overallStats`.
 *
 * **`lastMatch0..4` é a forma dos últimos cinco jogos**, e o código foi
 * decodificado medindo: `1` vitória, `2` derrota, `3` empate, `-1` sem partida.
 * A prova é um club com **zero empates** que nunca mostra `3` · os índices 5 a 9
 * existem no JSON e vieram `-1` em toda amostra, então são cinco e não dez.
 */
export type EaClubOverall = {
  gamesPlayed: number;
  wins: number;
  ties: number;
  losses: number;
  goals: number;
  goalsAgainst: number;
  promotions: number;
  relegations: number;
  bestDivision: number;
  skillRating: number;
  wstreak: number;
  unbeatenstreak: number;
  leagueAppearances: number;
} & Record<string, unknown>;

/**
 * Uma linha do elenco · `/members/stats`, e **não** `/members/career/stats`.
 *
 * ## Os dois trazem coisas diferentes, e o nome engana
 *
 * A ficha nasceu usando `career`, e a tela precisava avisar em maiúscula que os
 * números eram da vida inteira da pessoa · um membro aparecia com 1024 jogos num
 * club que tem 1563. **`/members/stats` é POR CLUB**, e isso foi conferido:
 *
 * | jogador | neste club | carreira |
 * |---|---|---|
 * | `xScott-_h` | **5** | 2265 |
 * | `Colucciaa` | **140** | 3990 |
 *
 * O teste que fecha a leitura: **nenhum membro tem mais jogos que o club
 * inteiro**, em dois clubs de tamanhos bem diferentes. E `career` **não tem um
 * único campo exclusivo** · é subconjunto puro, então trocar não perde nada.
 *
 * O que se ganha de graça: `proOverall` (o OVR do Virtual Pro, que é a primeira
 * coisa que alguém pergunta antes de aceitar você no club) e `winRate`.
 *
 * > **`prevGoals1..10` fica de fora de propósito** · não é gols por partida
 * > (aparecem valores como 42) e a unidade é incerta. Dez números por jogador
 * > cujo rótulo ninguém sabe escrever é exatamente o que esta ficha não faz.
 */
export type EaMember = {
  name: string;
  /**
   * **O nome do Pro dentro do jogo** · `taticoroleplay` é "V. Profeta" na súmula.
   *
   * Achado do Eduardo olhando a tela: a ficha mostrava a gamertag, que é como a
   * EA chama a conta, e não como a pessoa aparece em campo. Os dois valem, e é
   * por isso que os dois ficam · o do jogo em cima, a gamertag embaixo.
   */
  proName: string;
  proHeight: string;
  gamesPlayed: string;
  goals: string;
  assists: string;
  ratingAve: string;
  favoritePosition: string;
  proOverall: string;
  winRate: string;
};

/**
 * Uma partida · `/clubs/matches`.
 *
 * **`clubs` é chaveado por `clubId`**, com os dois lados · não há mandante nem
 * visitante, então quem identifica é o id e nunca a ordem da chave.
 *
 * **`winnerByDnf` separa W.O. de derrota jogada**, e quem joga liga sabe que é
 * outra coisa · levar 0x3 porque o adversário caiu não é ter perdido de 3.
 */
/** O que a partida conta do club de cada lado · **traz o kit junto**. */
export type EaMatchClubDetails = {
  name?: string;
  clubId?: string;
  teamId?: number | string;
  customKit?: Record<string, string>;
};

export type EaMatch = {
  matchId: string;
  timestamp?: string | number;
  /** Posto por nós ao juntar as listas · a EA não manda isto. */
  kind?: 'league' | 'friendly' | 'playoff';
  timeAgo?: { number: number; unit: string };
  clubs: Record<
    string,
    {
      score: string;
      wins: string;
      ties: string;
      losses: string;
      winnerByDnf: string;
      details?: EaMatchClubDetails;
    }
  >;
  players?: Record<string, Record<string, unknown>>;
};

/** Uma temporada · `/club/playoffAchievements`, o mais barato do catálogo. */
export type EaSeason = {
  seasonId: string;
  seasonName: string;
  bestDivision: string;
  bestFinishGroup: string;
};

/**
 * **Doze, e não seis** · o Eduardo pediu o máximo, e o teto da EA é 10 por tipo.
 * Com os três tipos juntos dá até 30, e doze é o que cabe sem a lista virar
 * página. O amistoso vem primeiro dentro do mesmo instante, porque é ele que o
 * campeonato do GGClubs usa.
 */
/**
 * Quantas partidas a lista mostra antes do "ver mais".
 *
 * **Eram doze, e isso tornava a paginação código morto** · a lista é filtrada
 * **por aba** e a busca pede `maxResultCount: '10'` por tipo, então nunca há
 * mais de 10 numa aba · `10 > 12` é falso, o botão nunca aparecia e as chaves
 * de i18n dele eram catálogo inalcançável. Seis faz a paginação existir de
 * verdade nos clubs ativos.
 */
export const MATCHES_SHOWN = 6;

/** Cinco por padrão · o resto sai no "ver todos". */
export const SQUAD_SHOWN = 5;

/** A ordem das abas · o amistoso primeiro, e é de propósito. */
export const MATCH_TABS = ['friendly', 'league', 'playoff'] as const;

/**
 * A unidade de `timeAgo` chega em inglês (`hours`, `days`) · traduz aqui.
 *
 * Unidade que a gente não conhece **volta como veio**, em vez de sumir ou virar
 * chute · o desfecho ruim seria a tela dizer "há 20" sem dizer 20 de quê.
 */
export function unitLabel(t: TFunction, unit: string, n: number): string {
  switch (unit.toLowerCase().replace(/s$/, '')) {
    case 'second':
      return t('admin.eaUnitSecond', { count: n });
    case 'minute':
      return t('admin.eaUnitMinute', { count: n });
    case 'hour':
      return t('admin.eaUnitHour', { count: n });
    case 'day':
      return t('admin.eaUnitDay', { count: n });
    case 'week':
      return t('admin.eaUnitWeek', { count: n });
    case 'month':
      return t('admin.eaUnitMonth', { count: n });
    default:
      return unit;
  }
}

/**
 * **`currentDivision` 1 é ELITE, e o número que o jogo mostra é `N - 1`.**
 *
 * O Clubs League tem seis degraus: Elite, 1, 2, 3, 4 e 5. A API numera de 1 a 6
 * com 1 no topo, então `bestDivision: 3` é **Divisão 2** no jogo, não "3ª".
 * Confirmado pelo asset `divisioncrest{N}.png` da própria EA: o `1` é o escudo
 * roxo com leão coroado e **sem número**, o `2` traz "1", o `3` traz "2".
 *
 * Isto estava errado na tela e o Eduardo pegou · a ficha dizia "div 4" e
 * "melhor divisão 3ª" com um degrau de diferença.
 */
export function divisionLabel(t: TFunction, raw: unknown): string {
  const n = Number(raw);
  // Fora da escala conhecida a gente não inventa rótulo · devolve o traço, e
  // nunca o valor cru, que pode ser objeto e stringificar como `[object Object]`.
  if (!Number.isFinite(n) || n < 1 || n > 6) return '-';
  return n === 1 ? t('admin.eaDivisionElite') : t('admin.eaDivisionN', { n: n - 1 });
}



/** A posição vem em inglês da EA · a chave é literal, o catálogo é tipado. */
export function positionLabel(t: TFunction, raw: string): string {
  switch (raw?.toLowerCase()) {
    case 'goalkeeper':
      return t('admin.eaPosGoalkeeper');
    case 'defender':
      return t('admin.eaPosDefender');
    case 'midfielder':
      return t('admin.eaPosMidfielder');
    case 'forward':
      return t('admin.eaPosForward');
    default:
      return raw;
  }
}

export const toNumber = (raw: unknown): number => {
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
};

/**
 * `1` vitória, `2` derrota, `3` empate · qualquer outra coisa não é partida.
 *
 * **A chave do `t()` é literal e não montada** · o catálogo é tipado, e
 * `admin.eaForm${...}` uniria os parâmetros de todas as chaves do i18next · é a
 * mesma armadilha que a prévia do documento legal e o método de pagamento já
 * registram.
 */
export const FORM_TONE: Record<number, string> = {
  1: 'bg-primary/20 text-primary',
  2: 'bg-destructive/20 text-destructive',
  3: 'bg-muted text-muted-foreground',
};


/**
 * **O pulso do club** · a resposta de *"esse time está vivo?"*.
 *
 * A ficha respondia bem *"esse time é bom?"* (1.568 jogos, 50% de aproveitamento)
 * e não respondia a outra metade da pergunta de quem procura adversário. Um club
 * com 1.568 jogos pode estar parado há seis meses, e o acumulado esconde isso.
 *
 * **Sai todo de dado que já baixamos** · nenhuma chamada nova. As partidas
 * trazem `players[clubId]`, que é **só quem é humano** · a IA que completa o
 * time não aparece, e é justamente por isso que a conta significa alguma coisa.
 *
 * O que ele diz, e por que cada um importa:
 *
 * - **quando foi a última** · a diferença entre ativo e abandonado
 * - **quantos entram juntos** · o Pipokets tem 11 no elenco e joga de 2 a 3 · é
 *   o número que decide se vale pedir pra entrar
 * - **quantos do elenco apareceram** · elenco de 35 com 7 que nunca jogaram é um
 *   número que mente, e este desmente
 */
export type EaPulse = {
  lastAt: number | null;
  /** Mediana de humanos por partida · mediana e não média, por causa do W.O. */
  perMatch: number;
  /** Quantas pessoas distintas apareceram nas partidas que a gente tem. */
  distinct: number;
  /** Sobre quantas partidas a conta foi feita · sem isso o número não se lê. */
  over: number;
};

export function pulseOf(matches: EaMatch[] | null, clubId: string): EaPulse | null {
  if (!matches || matches.length === 0) return null;

  const counts: number[] = [];
  const people = new Set<string>();
  for (const match of matches) {
    const side = match.players?.[clubId];
    if (!side) continue;
    const names = Object.values(side)
      .map((p) => (p as { playername?: string }).playername)
      .filter((n): n is string => Boolean(n));
    counts.push(names.length);
    for (const n of names) people.add(n);
  }
  if (counts.length === 0) return null;

  // **Mediana, não média** · uma partida abandonada entra com 1 humano e puxa a
  // média pra baixo · a mediana ignora o caso raro, que é o que se quer aqui.
  const sorted = counts.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const perMatch =
    sorted.length % 2 === 0 ? Math.round((sorted[middle - 1]! + sorted[middle]!) / 2) : sorted[middle]!;

  const stamps = matches.map((m) => toNumber(m.timestamp)).filter((n) => n > 0);

  return {
    lastAt: stamps.length > 0 ? Math.max(...stamps) : null,
    perMatch,
    distinct: people.size,
    over: counts.length,
  };
}

/**
 * A reputação do club, com o nome que o jogo usa.
 *
 * `reputationtier` vai de **0 a 3** e é a faixa grossa do `reputationlevel`
 * (1 a 10) · a correspondência bate em 299 de 299 clubs medidos, pelas bandas
 * 1-3, 4-6, 7-8 e 9-10.
 *
 * **Os nomes são do jogo, não inventados** · o topo é "Renome Mundial". A chave
 * do `t()` é literal porque o catálogo é tipado.
 */
export function reputationLabel(t: TFunction, tier: unknown): string | null {
  // Mesma armadilha do `kitColor` · `Number(null)` é 0, e um tier ausente
  // virava "Heróis Locais" afirmado na tela.
  if (tier === undefined || tier === null || tier === '') return null;
  const n = Number(tier);
  switch (n) {
    case 0:
      return t('admin.eaRep0');
    case 1:
      return t('admin.eaRep1');
    case 2:
      return t('admin.eaRep2');
    case 3:
      return t('admin.eaRep3');
    default:
      return null;
  }
}


/**
 * A partida acabou antes da hora? · **o detector de abandono do amistoso**.
 *
 * No amistoso o `winnerByDnf` vem **sempre zero** · medido em 320 lados. O que
 * sobra é a duração: partida inteira dá 5.400 a 5.658 segundos de relógio de
 * jogo, e abaixo de 4.800 quase sempre é abandono · na liga, onde o campo de
 * W.O. existe pra comparar, isso acerta 129 de 144 partidas com abandono e erra
 * 1 de 306 sem.
 *
 * **É indício, não veredito**, e o rótulo da tela diz isso · dizer "abandonou"
 * com 90% de recall seria acusar alguém pelo que quase sempre é verdade.
 */
export const FULL_MATCH_SECONDS = 4800;

export function looksAbandoned(match: EaMatch): boolean {
  const played = Object.values(match.players ?? {}).flatMap((side) =>
    Object.values(side ?? {}).map((p) => toNumber((p as { secondsPlayed?: string }).secondsPlayed)),
  );
  const longest = played.length > 0 ? Math.max(...played) : 0;
  if (longest <= 0) return false;
  return longest < FULL_MATCH_SECONDS;
}

/**
 * O escudo do adversário · **de graça, e ninguém estava usando**.
 *
 * A partida traz `clubs[id].details` inteiro, `customKit` incluído · o mesmo
 * lugar de onde sai o escudo do club aberto. Uma lista de partidas com nome
 * solto do outro lado é a tela jogando fora dado que já baixou.
 */
export function rivalCrestOf(details: EaMatchClubDetails | undefined): string | null {
  if (!details) return null;
  const kit = details.customKit ?? {};
  const id = String(kit.selectedKitType) === '1' ? kit.crestAssetId : details.teamId;
  return id ? `${CREST_BASE}/l${String(id)}.png` : null;
}
