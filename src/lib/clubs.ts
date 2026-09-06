import { leadsClub, type CrossplayPool, type MembershipRole, type Platform } from '@ggclubs/schemas';
/**
 * **Quem lidera um club** · reexportado, e não redefinido.
 *
 * O conjunto mora em `packages/schemas` desde 03/09/2026 (pendência 187), que é
 * o único lugar que a API e o front alcançam · aqui ele estava escrito à mão
 * como `LEAD_ROLES`, e divergir do servidor não daria erro em canto nenhum: a
 * tela ofereceria inscrever a quem a rota recusa, ou esconderia de quem pode.
 * **Nunca ponha o `['owner', 'manager']` de volta.**
 */
export { CLUB_LEAD_ROLES, leadsClub } from '@ggclubs/schemas';

export function ledClubTags(clubs: readonly { tag: string; role: MembershipRole }[] | null): string[] {
  return (clubs ?? []).filter((club) => leadsClub(club.role)).map((club) => club.tag);
}

/**
 * O teto de clubs por player · **reexportado, e não redefinido**.
 *
 * O número mora em `packages/schemas` desde 01/09/2026, que é o único lugar que
 * o front e a API alcançam. Isto aqui é conveniência de import pros cinco
 * chamadores desta pasta · **nunca ponha o `3` de volta**.
 */
export { MAX_CLUBS_PER_PLAYER } from '@ggclubs/schemas';

/**
 * A tag é guardada em minúscula e mostrada em caixa alta · a tipografia de
 * display é caixa alta e normalizar é o que impede `FCX` e `fcx` de virarem
 * dois clubs. Existe como função pra que o lugar dessa decisão seja um só.
 *
 * **A URL sai em minúscula**, mesmo quando quem chama tem a tag em caixa alta.
 * A rota aceita as duas, então isto não é sobre funcionar · é sobre existir um
 * endereço só. Link compartilhado em duas grafias vira duas URLs pro mesmo
 * club, e buscador trata como conteúdo duplicado.
 */
export function clubUrl(tag: string): string {
  return `/club/${tag.toLowerCase()}`;
}

/**
 * Rótulo de plataforma e chave de papel · moram aqui porque a página pública, a
 * lista e a prévia do formulário mostram os mesmos, e três cópias é como elas
 * começam a divergir.
 *
 * Nome de plataforma **não vai pro catálogo de i18n**: "PlayStation" é nome
 * próprio e é igual nos dois idiomas.
 */
export const PLATFORM_LABEL: Record<Platform, string> = {
  ps5: 'PS5',
  'xbox-series': 'Xbox Series X|S',
  pc: 'PC',
  ps4: 'PS4',
  'xbox-one': 'Xbox One',
  switch2: 'Switch 2',
  switch: 'Switch',
};

/**
 * Rótulo da geração. **Este vai pro catálogo** e o da plataforma não: nome de
 * console é nome próprio e é igual nos dois idiomas, mas "geração anterior" é
 * frase.
 */
export const POOL_KEY = {
  current: 'club.poolCurrent',
  legacy: 'club.poolLegacy',
  switch2: 'club.poolSwitch2',
  switch1: 'club.poolSwitch1',
} as const satisfies Record<CrossplayPool, string>;

/**
 * O papel é **poder**; a braçadeira é outra coisa e tem chave própria.
 *
 * `captain` saiu daqui quando saiu do enum: o capitão é ilustrativo, não tem
 * poder nenhum e **pode ser gerente ao mesmo tempo** · como valor de papel, ele
 * apagaria o outro na tela. Quem mostra a braçadeira é o `isCaptain` do vínculo.
 */
export const ROLE_KEY = {
  owner: 'club.roleOwner',
  manager: 'club.roleManager',
  member: 'club.roleMember',
} as const;

/**
 * **Por que esta pessoa não consegue pôr um club num campeonato?**
 *
 * `null` é "consegue" · ela é dona de um club, e daí em diante quem responde é
 * a **elegibilidade do servidor**, que já sabe de geração, prazo e vaga.
 *
 * **Existe porque a pergunta estava escrita em dois arquivos**, com duas
 * derivações e dois pares de frase: a tela inicial olhava `clubs.length === 0`
 * e o painel de inscrever olhava `myClubs.length > 0`, cada um chegando ao
 * mesmo lugar por um caminho. A segunda cópia nasceu em 18/08/2026, no mesmo
 * dia em que a primeira · que é exatamente quando a regra da casa manda
 * extrair, e não depois da terceira.
 *
 * **Ela NÃO é um gêmeo do `eligibilityFor`**, e essa é a linha que ela não
 * cruza. O servidor responde *"este club pode entrar nesta edição?"* · aqui a
 * pergunta é anterior e é sobre a **pessoa**: *ela tem um club pra inscrever?*.
 * Reimplementar geração, prazo e vaga no cliente seria criar um segundo lugar
 * capaz de discordar do primeiro, e a discordância apareceria como um botão que
 * o servidor recusa.
 *
 * **`null` também é a resposta enquanto não se sabe**, pela régua do
 * `ledClub`: quem decide de verdade é o servidor, e bloquear por ausência de
 * resposta trancaria quem tem vaga.
 */
/**
 * **`not-lead` era `not-owner` até 03/09/2026** · o gerente passou a inscrever,
 * pagar e declarar (ver o `CLUB_LEAD_ROLES` na API), e este filtro ficou pra
 * trás por algumas horas · o servidor aceitava e a tela não oferecia.
 *
 * **A mensagem antiga era pior que o botão faltando:** ela mandava criar o
 * próprio club, e a trava de liderança do mesmo dia **recusa** isso pra quem já
 * é gerente. O produto negava, no clique seguinte, o que a frase acabara de
 * mandar fazer.
 */
export type EntryBlocker = 'no-club' | 'not-lead';

export function entryBlockerFor(clubs: { role: MembershipRole }[] | null): EntryBlocker | null {
  if (clubs === null) return null;
  if (clubs.some((club) => leadsClub(club.role))) return null;
  return clubs.length === 0 ? 'no-club' : 'not-lead';
}
