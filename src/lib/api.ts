import type { TournamentProofTotals } from '@ggclubs/schemas';
import { ApiError } from './api-error';
import type {
  AdminUpdateUserInput,
  AdminEmailView,
  AdminUserRow,
  EmailStatus,
  InboxMessageView,
  ClubPublicView,
  CreateClubInput,
  CreateMyAccountInput,
  JoinClubInput,
  ClubInviteView,
  JoinRequestView,
  ManageSquadMember,
  MembershipRole,
  Platform,
  InviteTargets,
  PlayerCard,
  PlayerPosition,
  PlayerSearchResult,
  SquadMember,
  UpdateClubInput,
  ErrorCode,
  DiffLine,
  LegalDocumentView,
  LegalKind,
  NotificationView,
  PresignedUploadRequest,
  PresignedUploadResponse,
  PublicProfileView,
  PublishLegalInput,
  SaveTacticInput,
  TacticView,
  UpdateProfileInput,
  User,
  ClubTournamentTie,
  CourtesyGrantView,
  CreateTournamentInput,
  GrantCourtesyInput,
  EligibleClub,
  MatchCard,
  PaymentMethod,
  PaymentStatus,
  PaymentView,
  DisputedMatchView,
  PendingMatchView,
  CloseMatchInput,
  DecideMatchInput,
  RefundPaymentInput,
  ReportMatchInput,
  ChatMode,
  MatchChatView,
  MyChatsView,
  ReportWalkoverInput,
  SendMessageInput,
  TournamentChatRow,
  Language,
  ResolveMatchInput,
  CorrectMatchInput,
  MatchCorrectionView,
  RegistrationCard as RegistrationCardView,
  SetTournamentStatusInput,
  TournamentClubCard,
  TournamentPublicView,
  UpdateTournamentInput,
} from '@ggclubs/schemas';
import { getAuthHeader } from './auth-header.js';
import { markClientTooOld } from './client-blocked.js';
import { appVersion } from './desktop.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Rota `/public/*` **não leva token**, e isso não é economia de bytes.
 *
 * O header sai do `getAuthHeader`, que carrega o SDK do Firebase sob demanda
 * desde 06/08/2026 · então anexar identidade numa rota que não a usa fazia
 * **qualquer tela que chame a API** puxar o SDK. Foi assim que o texto legal
 * continuou pedindo o `accounts:lookup` do Google depois de a landing já estar
 * limpa: ele busca o próprio documento, e a busca arrastava o resto.
 *
 * Do lado do servidor não muda nada · `/public` não tem `requireAuth` e o
 * limite de lá é por IP, não por conta.
 */
const PUBLIC_PATH = /^\/public\//;

/**
 * A query de uma chamada, **sem os campos vazios**.
 *
 * **Existe porque a segunda query opcional chegou** · o papel do chat, em
 * 28/08/2026. Com uma só, o ternário dentro da interpolação cabia; com duas ele
 * vira quatro casos escritos à mão em cada método, e o que sai errado é sempre
 * o mesmo: o segundo `?` que devia ser `&`.
 */
function queryOf(params: Record<string, string | null | undefined>): string {
  const pairs = Object.entries(params).filter(([, value]) => value != null && value !== '');
  if (pairs.length === 0) return '';
  const query = pairs
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `?${query}`;
}

/**
 * A versão do app instalado, em **toda** requisição · é ela que o servidor
 * compara com o piso de atualização obrigatória.
 *
 * **Vai daqui porque daqui passa tudo.** Pôr o cabeçalho por chamada seria a
 * mesma armadilha do rate limiting, que nasceu declarado em cada rota e chegou
 * a treze rotas sem · o que não depende de alguém lembrar não é esquecido.
 *
 * Na web devolve `null` e o cabeçalho não é escrito: lá a última versão é sempre
 * a servida, então não há frota velha pra medir.
 */
async function clientVersionHeader(): Promise<Record<string, string>> {
  const version = await appVersion();
  return version ? { 'X-Client-Version': version } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = PUBLIC_PATH.test(path) ? {} : await getAuthHeader();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...auth,
      ...(await clientVersionHeader()),
      ...(init?.headers ?? {}),
    },
  });
  // **426 é a única resposta que a tela não trata sozinha.** Ela não é falha
  // daquela chamada, é a sessão inteira que acabou · quem reage é a casca, e
  // avisar aqui é o que garante que **toda** chamada leve à mesma tela. O erro
  // continua sendo lançado, pra quem chamou não seguir com dado que não veio.
  if (res.status === 426) markClientTooOld();
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { code?: ErrorCode; message?: string; retryAfterSeconds?: number };
    };
    throw new ApiError(
      res.status,
      body.error?.code ?? 'INTERNAL',
      body.error?.message ?? `HTTP ${res.status}`,
      body.error?.retryAfterSeconds,
    );
  }
  return (await res.json()) as T;
}

/** Dates arrive as strings on the wire. */
type WireDates<T> = Omit<T, 'createdAt' | 'updatedAt' | 'desktopSeenAt'> & {
  createdAt: string;
  updatedAt: string;
  desktopSeenAt?: string;
};

export type UserRecord = WireDates<User>;

/**
 * A listagem de admin não recebe `firebaseUid` · o backend não projeta.
 *
 * **E ela vem com o contexto da pessoa desde 28/08/2026** (`clubs`,
 * `tournaments`) · ver o `adminUserRow` no schema.
 */
export type AdminUserRecord = WireDates<AdminUserRow>;
/** Toda data chega como string no wire · é a regra do cliente inteiro. */
export type AdminEmailRecord = WireDates<AdminEmailView>;
export type InboxMessageRecord = WireDates<InboxMessageView>;

/** Uma partida em disputa na mesa do admin · o `scheduledAt` chega como string. */
export type DisputedMatchRecord = Omit<DisputedMatchView, 'scheduledAt'> & {
  scheduledAt: string;
};

/**
 * Uma partida parada na mesa do admin · as três datas viram string.
 *
 * **`claim` é nulo quando NINGUÉM declarou**, e esse é o caso que trava uma
 * edição · ver `pendingMatchView`.
 */
export type PendingMatchRecord = Omit<PendingMatchView, 'scheduledAt' | 'claim' | 'deadline'> & {
  scheduledAt: string;
  claim: (Omit<NonNullable<PendingMatchView['claim']>, 'at'> & { at: string }) | null;
  deadline: string;
};

/**
 * Um club da lista da pessoa. Sai da **view pública** mais o papel dela · a API
 * não manda `ownerId` nem `searchTokens`, e tipar como `Club` inteiro fazia a
 * tela acreditar que tinha campo que nunca chegou.
 */
export type ClubRecord = WireDates<ClubPublicView> & {
  role: MembershipRole;
  isPrimary: boolean;
};
export type PublicClubCard = WireDates<ClubPublicView> & { memberCount: number };
export type PublicClub = WireDates<ClubPublicView>;

/** Um pedido na fila do dono · o `requestedAt` chega como string, como toda data. */
export type JoinRequestRecord = Omit<JoinRequestView, 'requestedAt'> & { requestedAt: string };

/**
 * Um pedido meu, esperando resposta. Só o club e a data · o resto a tela que
 * pergunta já tem em mãos.
 */
export type MyJoinRequest = { clubId: string; requestedAt: string };

/** Um convite que o club mandou · a fila de quem gerencia. */
export type ClubInviteRecord = Omit<ClubInviteView, 'invitedAt'> & { invitedAt: string };

/**
 * Um convite recebido · **com o club junto**, ao contrário do pedido.
 *
 * Quem foi convidada não estava olhando nada quando ele chegou, então a tela
 * precisa dizer de qual club é · sem isso o convite não é informação.
 */
export type MyInviteRecord = {
  clubId: string;
  tag: string;
  name: string;
  crestUrl: string | null;
  platform: Platform;
  memberCount: number;
  invitedAt: string;
};

/**
 * Uma oferta de **posse** esperando resposta.
 *
 * Mesma forma do convite de propósito · as duas respondem "um club está
 * esperando você", e formas diferentes fariam a tela ensinar que são coisas
 * distintas quando a diferença está no que se aceita, não em como se vê.
 */
export type OwnershipOfferRecord = Omit<MyInviteRecord, 'invitedAt'> & { offeredAt: string };

/**
 * Um convite pra ser **gerente** esperando resposta · 03/09/2026, pendência 185.
 *
 * Mesma forma da oferta de posse pelo mesmo motivo dela: as duas respondem "um
 * club está esperando você", e o que muda é **o que se aceita**, não como se vê.
 */
export type ManagerOfferRecord = OwnershipOfferRecord;

export type TacticRecord = Omit<TacticView, 'updatedAt'> & { updatedAt: string };

/**
 * Uma linha da caixa do sininho.
 *
 * **O texto não vem do servidor** · vêm a chave (`club.invited`) e os
 * parâmetros, e quem escreve a frase é o catálogo de i18n. É o que faz a caixa
 * inteira mudar de idioma junto com a pessoa, em vez de guardar o português de
 * quando ela chegou.
 */
export type NotificationRecord = Omit<NotificationView, 'createdAt'> & { createdAt: string };

export type LegalDocumentRecord = Omit<LegalDocumentView, 'publishedAt'> & { publishedAt: string };
export type LegalVersionRecord = { version: number; publishedAt: string };

/**
 * Uma edição, como ela chega pelo fio · **as quatro datas viram string**, como
 * toda data deste cliente.
 *
 * Elas são quatro e não duas porque a edição tem prazo de inscrição, sorteio e
 * começo · e o sorteio é o instante em que tudo congela, então ele nunca pode
 * ser derivado de outro.
 */
export type TournamentRecord = WireDates<TournamentPublicView> & {
  registrationOpensAt: string;
  registrationClosesAt: string;
  drawAt: string;
  startsAt: string;
};

/**
 * Um pagamento na mesa da organização · **as datas vêm como string do fio.**
 *
 * Sem `clubId`: a rota devolve a **tag**, que é o identificador que o resto do
 * painel usa · dado que a tela mostra não carrega id interno.
 */
export type AdminPaymentRecord = {
  paymentId: string;
  clubTag: string;
  clubName: string;
  method: PaymentMethod;
  amountCents: number;
  paidAt: string | null;
  status: PaymentStatus;
};

export type RegistrationCard = Omit<RegistrationCardView, 'reservedUntil'> & {
  reservedUntil: string | null;
};

/**
 * Uma vaga que a organização deu · **pendência 191**, e a data vem como string.
 *
 * Ela chega **na mesma resposta dos pagamentos**, e o porquê está na rota: a
 * conta do excedente do teto precisa das duas listas no mesmo instante.
 */
export type AdminCourtesyRecord = Omit<CourtesyGrantView, 'grantedAt'> & {
  grantedAt: string;
};

/**
 * O catálogo da API interna de Pro Clubs do EA FC · **estudo, não integração**.
 *
 * A forma vem do servidor de propósito: é lá que mora a lista branca de
 * endpoints, e a tela só desenha o que ela recebe.
 */
export type EaCatalog = {
  endpoints: {
    key: string;
    path: string;
    params: { name: string; required: boolean }[];
  }[];
  platforms: string[];
  matchTypes: string[];
};

/** A resposta crua de uma chamada, com o custo dela · é a forma que interessa. */
export type EaCall = { status: number; ms: number; bytes: number; body: unknown };

/** O retrato que abre o painel de admin · números e o que pede ação. */
export type AdminOverview = {
  users: { total: number; suspended: number; lastWeek: number };
  clubs: { active: number; deleted: number };
  legal: Record<'terms' | 'privacy', LegalVersionRecord | null>;
  /**
   * O canal de tempo real · **opcional de propósito**, porque a API pode estar
   * numa versão anterior a ele. Sem isto, a tela quebraria contra uma imagem
   * velha em vez de simplesmente não mostrar a linha.
   */
  realtime?: { connections: number; accounts: number };
  /**
   * As edições que estão esperando a organização · **opcional pelo mesmo motivo
   * do `realtime`**, que é a API poder estar numa versão anterior a ela.
   */
  attention?: {
    slug: string;
    name: string;
    disputes: number;
    awaitingDraw: boolean;
    /**
     * Partidas travadas · ninguém declarou e o prazo venceu (28/08/2026).
     *
     * **`?? 0` na tela**, porque a API pode estar numa versão anterior a este
     * campo · é a mesma razão do `attention` inteiro ser opcional.
     */
    stuck?: number;
  }[];
  /**
   * A saúde do canal de e-mail · **opcional pelo mesmo motivo dos dois de
   * cima**: a API pode estar numa imagem anterior a ele, e a tela não pode
   * quebrar por isso · ela simplesmente não mostra a linha.
   */
  email?: {
    sent: number;
    bounced: number;
    complained: number;
    bounceRate: number;
    complaintRate: number;
  };
};

/**
 * O perfil aberto de um player · **derivado do schema**, como todo o resto.
 *
 * Ele já foi escrito à mão aqui, e o preço apareceu ao ligar a primeira tela:
 * dizia `platform: 'ps5' | 'xbox' | 'pc'`, sendo que **`xbox` não existe** no
 * enum (são `xbox-series` e `xbox-one`) e faltavam três plataformas. O tipo
 * estava errado desde que foi escrito e nada reclamou, porque a função não tinha
 * um chamador sequer · é o mesmo buraco da rota órfã, um nível acima.
 */
export type PublicProfile = PublicProfileView;

export type { InviteTargets, PlayerCard };

export { ApiError };

/** A resposta da página de uma edição · ver `getTournament`. */
type TournamentPage = {
  tournament: TournamentRecord;
  registrations: RegistrationCard[];
  matches: MatchCard[];
  /** Os clubs que a chave menciona · ver `tournamentClubCard`. */
  clubs: TournamentClubCard[];
};

export const api = {
  getPublicProfile: (handle: string, init?: RequestInit) =>
    request<{ profile: PublicProfile }>(`/public/profile/${encodeURIComponent(handle)}`, init),

  /**
   * Quais dos meus clubs podem chamar esta pessoa · a pergunta que a página do
   * perfil não tinha como fazer, porque ela é por `@handle` e o perfil não
   * carrega id interno.
   */
  inviteTargets: (handle: string, init?: RequestInit) =>
    request<InviteTargets>(`/me/players/${encodeURIComponent(handle)}/invite-targets`, init),

  /**
   * A vitrine de players · sem `q` ela lista, com `q` ela busca.
   *
   * Autenticada de propósito · é a superfície que expõe pessoas, e pública ela
   * seria a base inteira num `curl`.
   */
  listPlayers: (
    params: {
      q?: string;
      position?: string;
      pool?: string;
      lookingForClub?: boolean;
      /** Só quem joga num club seu · quais são os seus, quem diz é o servidor. */
      sharedClub?: boolean;
      limit?: number;
      cursor?: string;
    },
    init?: RequestInit,
  ) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.position) query.set('position', params.position);
    if (params.pool) query.set('pool', params.pool);
    if (params.lookingForClub) query.set('lookingForClub', 'true');
    if (params.sharedClub) query.set('sharedClub', 'true');
    if (params.limit) query.set('limit', String(params.limit));
    if (params.cursor) query.set('cursor', params.cursor);
    const suffix = query.toString();
    return request<{ players: PlayerCard[]; cursor: string | null }>(
      `/me/players${suffix ? `?${suffix}` : ''}`,
      init,
    );
  },

  handleAvailable: (handle: string, init?: RequestInit) =>
    request<{ available: boolean }>(
      `/public/handle-available?handle=${encodeURIComponent(handle)}`,
      init,
    ),

  /**
   * Desligar o e-mail sem sessão · **o token no caminho é a autorização.**
   *
   * A rota responde **200 em tudo**, inclusive em token desconhecido, porque do
   * outro lado do cabeçalho `List-Unsubscribe` tem uma máquina que reage a
   * não-200 voltando a oferecer "denunciar spam". A tela daqui trata igual: ela
   * confirma sem contar história, e é isso que a regra da casa pede em rota
   * aberta.
   */
  unsubscribe: (token: string, init?: RequestInit) =>
    request<{ ok: true }>(`/public/unsubscribe/${encodeURIComponent(token)}`, {
      ...init,
      method: 'POST',
    }),

  /**
   * O estado daquele token · **só lê, e por isso é `GET`.**
   *
   * Sem ela um F5 na página de descadastro devolve o botão de "parar de
   * receber" a quem já parou. Token desconhecido responde `off: false`, igual a
   * token ligado · a resposta não conta se ele existe.
   */
  unsubscribeState: (token: string, init?: RequestInit) =>
    request<{ off: boolean }>(`/public/unsubscribe/${encodeURIComponent(token)}`, init),

  /**
   * O caminho de volta · **religa pelo mesmo token, e sem login.**
   *
   * **Rota separada, e não um parâmetro no descadastro** · aquele é o que o
   * servidor do Gmail chama, com corpo próprio, e um validador de corpo ali
   * responde 400 a ele. **Medido** · o porquê inteiro está no comentário da rota.
   */
  resubscribe: (token: string, init?: RequestInit) =>
    request<{ ok: true }>(`/public/resubscribe/${encodeURIComponent(token)}`, {
      ...init,
      method: 'POST',
    }),

  /**
   * Pedir uma senha nova · **e a resposta é sempre a mesma.**
   *
   * A rota responde 200 exista ou não a conta, e a tela **precisa** tratar assim
   * · dizer "esse e-mail não está cadastrado" transformaria a tela de login num
   * verificador de quem tem conta aqui, que é o que ela já evita ao não revelar
   * isso no erro de senha errada.
   *
   * O `locale` viaja porque **o servidor não tem URL pra perguntar** · é a mesma
   * razão do cadastro, e aqui ela pesa mais: quem pede senha pode não ter
   * `locale` gravado ainda.
   */
  requestPasswordReset: (email: string, locale: Language, init?: RequestInit) =>
    request<{ ok: true }>('/public/password-reset', {
      ...init,
      method: 'POST',
      body: JSON.stringify({ email, locale }),
    }),

  /**
   * A edição para acompanhar, numa ida só. Com clubs inclui inscrição e espera;
   * sem filtro mantém a edição global em jogo.
   *
   * Mesma forma da página de uma edição, e `tournament: null` quando não há
   * nenhuma · "não tem campeonato agora" é resposta, e não falha.
   */
  getLiveTournament: (init?: RequestInit, clubs?: string) =>
    request<TournamentPage>(
      `/public/live-tournament${clubs ? `?clubs=${encodeURIComponent(clubs)}` : ''}`,
      init,
    ),

  getPublicClub: (tag: string, init?: RequestInit) =>
    request<{ club: PublicClub; squad: SquadMember[]; tactic: TacticRecord | null }>(
      `/public/club/${encodeURIComponent(tag)}`,
      init,
    ),

  /**
   * Documentos legais · abertos, e o idioma vai na consulta porque quem sabe
   * qual está ativo é o cliente. `document: null` quer dizer "ninguém publicou
   * ainda", que é diferente de 404.
   */
  getLegal: (kind: LegalKind, locale: string, init?: RequestInit) =>
    request<{ document: LegalDocumentRecord | null }>(
      `/public/legal/${kind}?locale=${encodeURIComponent(locale)}`,
      init,
    ),
  getLegalVersions: (kind: LegalKind, init?: RequestInit) =>
    request<{ versions: LegalVersionRecord[] }>(`/public/legal/${kind}/versions`, init),
  getLegalVersion: (kind: LegalKind, version: number, locale: string, init?: RequestInit) =>
    request<{ document: LegalDocumentRecord }>(
      `/public/legal/${kind}/${version}?locale=${encodeURIComponent(locale)}`,
      init,
    ),
  getLegalDiff: (kind: LegalKind, from: number, to: number, locale: string, init?: RequestInit) =>
    request<{
      from: number;
      to: number;
      lines: DiffLine[];
      stat: { added: number; removed: number };
    }>(`/public/legal/${kind}/${to}/diff?from=${from}&locale=${encodeURIComponent(locale)}`, init),

  getAdminOverview: (init?: RequestInit) => request<AdminOverview>('/admin/overview', init),

  /**
   * O catálogo da API de Pro Clubs do EA FC · **levantamento, não integração**.
   *
   * A tela não conhece caminho nem host: ela pede a lista e desenha o formulário
   * a partir dela. Endpoint novo entra no servidor e aparece aqui sozinho.
   */
  getEaEndpoints: (init?: RequestInit) => request<EaCatalog>('/admin/ea/endpoints', init),

  /**
   * Dispara um endpoint do catálogo. **A `key` é o que a gente manda**, nunca a
   * URL · rota que busca endereço vindo do cliente é SSRF, e admin autenticado
   * não muda isso.
   */
  callEa: (params: Record<string, string>, init?: RequestInit) =>
    request<EaCall>(`/admin/ea/call?${new URLSearchParams(params).toString()}`, init),

  /** Publicar é sempre versão nova · não existe editar, por decisão. */
  publishLegal: (input: PublishLegalInput) =>
    request<{ version: number; publishedAt: string }>('/admin/legal', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  clubTagAvailable: (tag: string) =>
    request<{ available: boolean }>(`/public/club-tag-available?tag=${encodeURIComponent(tag)}`),

  /**
   * A vitrine de clubs, e desde 08/08/2026 ela é a única · a pública
   * (`GET /public/clubs`) foi apagada, e descobrir club é de quem tem conta.
   *
   * A exclusão dos seus é do servidor: com o filtro no front, a página vinha com
   * 12, a tela mostrava 9 e o cursor avançava 12 · a paginação ficava com buracos
   * e a lista piscava.
   */
  discoverClubs: (
    options: { q?: string; cursor?: string; pool?: string } = {},
    init?: RequestInit,
  ) => {
    const search = new URLSearchParams();
    if (options.q) search.set('q', options.q);
    if (options.pool) search.set('pool', options.pool);
    if (options.cursor) search.set('cursor', options.cursor);
    const query = search.toString();
    return request<{ clubs: PublicClubCard[]; cursor: string | null }>(
      `/me/clubs/discover${query ? `?${query}` : ''}`,
      init,
    );
  },

  listMyClubs: (init?: RequestInit) => request<{ clubs: ClubRecord[] }>('/me/clubs', init),

  /**
   * O bilhete de abertura do canal de tempo real · **uso único e 30s**.
   *
   * Ele existe porque o navegador **não manda cabeçalho ao abrir um
   * WebSocket** · a identidade se prova aqui, numa chamada que já leva o token.
   */
  realtimeTicket: () =>
    request<{ ticket: string; expiresInMs: number }>('/me/realtime/ticket', { method: 'POST' }),

  /**
   * A caixa do sininho · **lista e contador na mesma resposta.**
   *
   * É a única chamada que o sininho faz por carregamento do app: depois dela
   * quem atualiza o número é o canal de tempo real, porque o evento da
   * notificação **carrega o contador novo**.
   */
  listNotifications: (limit?: number, init?: RequestInit) =>
    request<{ notifications: NotificationRecord[]; unread: number }>(
      `/me/notifications${limit ? `?limit=${limit}` : ''}`,
      init,
    ),

  /** Sem `ids`, marca todas · é o botão da caixa. */
  markNotificationsRead: (ids?: string[]) =>
    request<{ unread: number }>('/me/notifications/read', {
      method: 'POST',
      body: JSON.stringify(ids ? { ids } : {}),
    }),
  createClub: (input: CreateClubInput) =>
    request<{ club: ClubRecord }>('/me/clubs', { method: 'POST', body: JSON.stringify(input) }),
  updateClub: (id: string, input: UpdateClubInput) =>
    request<{ ok: true }>(`/me/clubs/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteClub: (id: string, tag: string) =>
    request<{ ok: true }>(`/me/clubs/${id}`, { method: 'DELETE', body: JSON.stringify({ tag }) }),
  setPrimaryClub: (id: string) =>
    request<{ ok: true }>(`/me/clubs/${id}/primary`, { method: 'PUT' }),

  joinClub: (id: string, input: JoinClubInput = {}) =>
    request<{ status: 'pending' }>(`/me/clubs/${id}/join`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  cancelJoinRequest: (id: string) =>
    request<{ ok: true }>(`/me/clubs/${id}/join`, { method: 'DELETE' }),
  // `/membership` e não `/join`: retirar pedido e sair do club moram na mesma
  // URL base e fazem coisas diferentes · a de cima some com um documento que
  // nunca foi vínculo, esta vira histórico e mexe no elenco.
  leaveClub: (id: string) =>
    request<{ ok: true }>(`/me/clubs/${id}/membership`, { method: 'DELETE' }),
  /**
   * Largar o cargo de gerente **continuando no elenco** · o irmão do
   * `leaveClub`, um degrau acima: lá o vínculo acaba, aqui só o poder acaba.
   *
   * `already-member` é sucesso · a rota é idempotente, ver o comentário dela.
   */
  stepDownFromLead: (id: string) =>
    request<{ status: 'stepped-down' | 'already-member' }>(`/me/clubs/${id}/role`, {
      method: 'DELETE',
    }),
  // Gestão do elenco · quem pode o quê é decidido no servidor. A tela esconde
  // o que não se aplica, e esconder é UX: as rotas recusam de qualquer jeito.
  inviteToClub: (id: string, handle: string) =>
    request<{ status: 'invited' | 'active' }>(`/me/clubs/${id}/invites`, {
      method: 'POST',
      body: JSON.stringify({ handle }),
    }),
  listClubInvites: (id: string, init?: RequestInit) =>
    request<{ invites: ClubInviteRecord[] }>(`/me/clubs/${id}/invites`, init),
  /**
   * Busca de player por prefixo de @nick · autenticada, nunca pública.
   *
   * O `clubId` é o que traz a relação de cada um com aquele club, e o servidor
   * só responde com ele pra quem gerencia · sem isso a fila do club sairia pra
   * qualquer conta logada.
   */
  searchPlayers: (prefix: string, clubId: string, init?: RequestInit) =>
    request<{ players: PlayerSearchResult[]; hasMore: boolean }>(
      `/me/players/search?q=${encodeURIComponent(prefix)}&clubId=${encodeURIComponent(clubId)}`,
      init,
    ),
  cancelClubInvite: (id: string, userId: string) =>
    request<{ ok: true }>(`/me/clubs/${id}/invites/${userId}`, { method: 'DELETE' }),
  listMyInvites: (init?: RequestInit) =>
    request<{ invites: MyInviteRecord[] }>('/me/invites', init),
  decideInvite: (clubId: string, decision: 'accept' | 'decline') =>
    request<{ status: 'active' | 'rejected' }>(`/me/invites/${clubId}`, {
      method: 'PATCH',
      body: JSON.stringify({ decision }),
    }),

  setMemberPosition: (id: string, userId: string, position: PlayerPosition | null) =>
    request<{ ok: true }>(`/me/clubs/${id}/members/${userId}/position`, {
      method: 'PATCH',
      body: JSON.stringify({ position }),
    }),

  listOwnershipOffers: (init?: RequestInit) =>
    request<{ offers: OwnershipOfferRecord[] }>('/me/ownership-offers', init),
  decideOwnership: (clubId: string, decision: 'accept' | 'decline') =>
    request<{ status: 'accepted' | 'declined' }>(`/me/clubs/${clubId}/ownership`, {
      method: 'PATCH',
      body: JSON.stringify({ decision }),
    }),
  offerOwnership: (clubId: string, memberId: string) =>
    request<{ ok: true }>(`/me/clubs/${clubId}/ownership`, {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    }),
  cancelOwnership: (clubId: string) =>
    request<{ ok: true }>(`/me/clubs/${clubId}/ownership`, { method: 'DELETE' }),

  /**
   * As edições que o club está jogando · **o que passa junto com a posse.**
   *
   * Lida pelos dois lados da transferência, e por isso ela é do elenco e não do
   * dono. Sem data no corpo, então não precisa de `WireDates`.
   */
  clubTournaments: (clubId: string, init?: RequestInit) =>
    request<{ tournaments: ClubTournamentTie[] }>(`/me/clubs/${clubId}/tournaments`, init),

  /**
   * A escalação do club · **sem os players junto**, de propósito.
   *
   * Quem chama já carregou o elenco, e é ele que dá nome e avatar a cada slot ·
   * ver o comentário do `tacticView`. Slot que aponta pra quem não está mais no
   * elenco simplesmente não acha ninguém, e desenha vazio.
   */
  getClubTactic: (id: string, init?: RequestInit) =>
    request<{ tactic: TacticRecord | null }>(`/me/clubs/${id}/tactic`, init),
  saveClubTactic: (id: string, input: SaveTacticInput) =>
    request<{ ok: true }>(`/me/clubs/${id}/tactic`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  listManageableSquad: (id: string, init?: RequestInit) =>
    request<{
      squad: ManageSquadMember[];
      pendingOwnerId: string | null;
      /** Quem está esperando responder sobre a gerência · é lista, e a posse é um id só. */
      pendingManagerIds: string[];
    }>(`/me/clubs/${id}/squad`, init),
  /**
   * **`'manager'` OFERECE, e `'member'` aplica na hora** · a assimetria é de
   * 03/09/2026 (pendência 185), e por isso a resposta diz qual dos dois foi.
   * Ver o `setClubRole` da API.
   *
   * **`'member'` também é a desistência do convite pendente** · não há rota de
   * cancelar.
   */
  setClubRole: (id: string, userId: string, role: 'manager' | 'member') =>
    request<{ status: 'offered' | 'applied' }>(`/me/clubs/${id}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  listManagerOffers: (init?: { signal?: AbortSignal }) =>
    request<{ offers: ManagerOfferRecord[] }>('/me/manager-offers', init),
  decideManagerOffer: (id: string, decision: 'accept' | 'decline') =>
    request<{ status: string }>(`/me/clubs/${id}/manager`, {
      method: 'PATCH',
      body: JSON.stringify({ decision }),
    }),
  removeClubMember: (id: string, userId: string) =>
    request<{ ok: true }>(`/me/clubs/${id}/members/${userId}`, { method: 'DELETE' }),
  setClubCaptain: (id: string, userId: string) =>
    request<{ ok: true }>(`/me/clubs/${id}/captain/${userId}`, { method: 'PUT' }),
  clearClubCaptain: (id: string) =>
    request<{ ok: true }>(`/me/clubs/${id}/captain`, { method: 'DELETE' }),

  listMyJoinRequests: (init?: RequestInit) =>
    request<{ requests: MyJoinRequest[] }>('/me/join-requests', init),
  listJoinRequests: (id: string, init?: RequestInit) =>
    request<{ requests: JoinRequestRecord[] }>(`/me/clubs/${id}/requests`, init),
  decideJoinRequest: (id: string, userId: string, decision: 'approve' | 'reject') =>
    request<{ status: 'active' | 'rejected' }>(`/me/clubs/${id}/requests/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ decision }),
    }),

  /** `user: null` = autenticado no Firebase, sem conta aqui ainda. */
  getMe: () => request<{ user: UserRecord | null; role: 'player' | 'admin' }>('/me'),
  createMyAccount: (input: CreateMyAccountInput) =>
    request<{ user: UserRecord }>('/me', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateMyProfile: (input: UpdateProfileInput) =>
    request<{ ok: true }>('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  presignUpload: (input: PresignedUploadRequest) =>
    request<PresignedUploadResponse>('/me/uploads/presigned-url', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /**
   * Os campeonatos abertos · **aberta a visitante deslogado**, ao contrário das
   * duas vitrines.
   *
   * Descobrir club é de quem tem conta (decisão de 08/08/2026); o campeonato é o
   * contrário porque ele **é** a porta de entrada. Premiação e regras precisam
   * estar visíveis antes de qualquer login, senão o funil vaza na parte que
   * convence.
   */
  listTournaments: (params: { pool?: string; limit?: number; offset?: number } = {}, init?: RequestInit) => {
    const query = new URLSearchParams();
    if (params.pool) query.set('pool', params.pool);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    const suffix = query.toString();
    return request<{ tournaments: TournamentRecord[]; nextOffset: number | null; total: number; proof: TournamentProofTotals }>(
      `/public/tournaments${suffix ? `?${suffix}` : ''}`,
      init,
    );
  },

  /**
   * A página de uma edição · **os inscritos e a chave vêm junto**, e não numa
   * segunda ida. Antes do sorteio a chave é uma lista vazia.
   *
   * ---
   *
   * **Já teve dedupe de requisição em voo aqui, e ele durou uma medição** ·
   * 20/08/2026. A ideia era juntar duas peças pedindo a mesma edição no mesmo
   * instante; o que ela produziu foi a **tela de erro**.
   *
   * A causa é o `StrictMode`: ele monta, desmonta e remonta · a primeira
   * montagem entra no mapa e é **abortada** no desmonte, e a segunda recebe
   * aquela promessa morta em vez de fazer a própria chamada. O risco estava
   * escrito no comentário do helper e mordeu na primeira execução do probe.
   *
   * **Não repita sem resolver o abort** · compartilhar requisição exige que o
   * cancelamento de um assinante não cancele os outros, e isso é um cliente de
   * dados, não três linhas.
   */
  getTournament: (slug: string, init?: RequestInit) =>
    request<TournamentPage>(`/public/tournaments/${encodeURIComponent(slug)}`, init),

  /**
   * Quais dos meus clubs podem entrar, e por que os outros não · **a pergunta
   * respondida antes do clique.**
   */
  tournamentEligibility: (slug: string, init?: RequestInit) =>
    request<{ clubs: EligibleClub[] }>(
      `/me/tournaments/${encodeURIComponent(slug)}/eligibility`,
      init,
    ),

  registerForTournament: (id: string, clubId: string) =>
    request<{ ok: true }>(`/me/tournaments/${id}/register`, {
      method: 'POST',
      body: JSON.stringify({ clubId }),
    }),

  cancelTournamentRegistration: (id: string, clubId: string) =>
    request<{ ok: true }>(`/me/tournaments/${id}/registration/${clubId}`, { method: 'DELETE' }),

  /**
   * Começa a cobrança de uma vaga já reservada.
   *
   * **O valor não vai no corpo** · ele é lido da edição no servidor. Mandá-lo
   * daqui seria deixar o cliente escolher quanto paga.
   */
  startTournamentPayment: (id: string, clubId: string, method: PaymentMethod) =>
    request<{ payment: PaymentView }>(`/me/tournaments/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify({ clubId, method }),
    }),

  /** O placar declarado por um dos dois clubs · o servidor casa as duas pontas. */
  reportMatch: (matchId: string, input: ReportMatchInput) =>
    request<{ ok: true }>(`/me/matches/${matchId}/report`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /**
   * **"O adversário não apareceu"** · a declaração de W.O.
   *
   * É uma declaração como a de placar, e corre pelo mesmo caminho no servidor ·
   * o que muda é que **o placar não vem daqui** (é fixo, e derivado lá) e o
   * print é **opcional**: não se fotografa a ausência de alguém.
   */
  reportWalkover: (matchId: string, input: ReportWalkoverInput) =>
    request<{ ok: true }>(`/me/matches/${matchId}/walkover`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /**
   * A sala de um confronto · **abrir é ler**, então este `GET` marca a leitura.
   *
   * O `before` é o `_id` da mensagem mais antiga que a tela já tem · pedir
   * página antiga **não** marca leitura, porque rolar pra cima não é ler o que
   * chegou depois.
   */
  /**
   * **O `as` diz por qual papel a pessoa entrou** · 28/08/2026.
   *
   * A mesma conta pode ser a organização e um dos dois clubs; quem escolhe é o
   * lugar de onde a sala foi aberta (a mesa do `/admin` ou o `/app`), e o
   * servidor confere que ela é mesmo da organização antes de dar o papel. Ver
   * o `chatMode` no schema.
   */
  matchChat: (matchId: string, before?: string | null, init?: RequestInit, as?: ChatMode) =>
    request<{ chat: MatchChatView }>(`/me/matches/${matchId}/chat${queryOf({ before, as })}`, init),
  /** Chamar a organização · idempotente, o aviso sai uma vez por conversa. */
  callChatAdmin: (matchId: string) =>
    request<{ ok: true }>(`/me/matches/${matchId}/chat/call-admin`, { method: 'POST' }),
  /** Travar e destravar · só a organização, conferido no servidor. */
  setChatLock: (matchId: string, locked: boolean) =>
    request<{ ok: true }>(`/admin/matches/${matchId}/chat/lock`, {
      method: 'POST',
      body: JSON.stringify({ locked }),
    }),
  /** A mesa de conversas da edição · todas, e não só as que chamaram. */
  adminTournamentChats: (tournamentId: string, init?: RequestInit) =>
    request<{ chats: TournamentChatRow[] }>(`/admin/tournaments/${tournamentId}/chats`, init),

  /** Apagar uma mensagem · o documento fica, com a lápide. */
  reactToChatMessage: (matchId: string, messageId: string, emoji: string, as?: ChatMode) =>
    request<{ on: boolean }>(`/me/matches/${matchId}/chat/${messageId}/reaction`, {
      method: 'POST',
      body: JSON.stringify({ emoji, as }),
    }),
  deleteChatMessage: (matchId: string, messageId: string, as?: ChatMode) =>
    request<{ ok: true }>(`/me/matches/${matchId}/chat/${messageId}${queryOf({ as })}`, {
      method: 'DELETE',
    }),

  /**
   * *"Estou escrevendo"* · não grava nada e não devolve nada.
   *
   * **Falha em silêncio no cliente também** · o sinal é dispensável, e um erro
   * aqui não pode virar aviso vermelho numa tela onde a pessoa só digitou.
   */
  signalTyping: (matchId: string) =>
    request<void>(`/me/matches/${matchId}/chat/typing`, { method: 'POST' }).catch(() => undefined),

  /** Onde há conversa nova · **quem avisa é o canal**, e o relógio é rede de 60s. */
  myChats: (init?: RequestInit) => request<MyChatsView>('/me/chats', init),
  adminChats: (init?: RequestInit) => request<{ chats: TournamentChatRow[] }>('/admin/chats', init),
  tournamentChatUnread: (tournamentId: string, init?: RequestInit) =>
    request<{ unread: Record<string, number> }>(
      `/me/tournaments/${tournamentId}/chat-unread`,
      init,
    ),
  sendMatchMessage: (matchId: string, input: SendMessageInput) =>
    request<{ ok: true }>(`/me/matches/${matchId}/chat`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  adminListTournaments: (init?: RequestInit) =>
    request<{ tournaments: TournamentRecord[] }>('/admin/tournaments', init),
  adminCreateTournament: (input: CreateTournamentInput) =>
    request<{ tournament: TournamentRecord }>('/admin/tournaments', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  adminUpdateTournament: (id: string, input: UpdateTournamentInput) =>
    request<{ ok: true }>(`/admin/tournaments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  /**
   * O `confirm` é o apelido da edição digitado de novo · **obrigatório pra
   * cancelar quando ela tem club inscrito**, e quem confere é o servidor.
   *
   * Vai o que a pessoa **digitou**, e não uma cópia que o código já tinha em
   * mãos · a conferência de lá só vale pro caminho da tela assim.
   */
  adminSetTournamentStatus: (
    id: string,
    status: SetTournamentStatusInput['status'],
    confirm?: string,
  ) =>
    request<{ ok: true }>(`/admin/tournaments/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, confirm }),
    }),
  /** Antecipa o sorteio · o normal é a varredura fazer sozinha no `drawAt`. */
  adminDrawTournament: (id: string) =>
    request<{ groups: number; matches: number; slots: number }>(`/admin/tournaments/${id}/draw`, {
      method: 'POST',
    }),
  /** Tira um club da edição · é o que destrava a escada quando sobra gente. */
  adminRemoveRegistration: (id: string, tag: string) =>
    request<{ ok: true }>(`/admin/tournaments/${id}/registrations/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
    }),

  /** As partidas em disputa, com as duas declarações e os dois prints. */
  adminListDisputes: (id: string, init?: RequestInit) =>
    request<{ matches: DisputedMatchRecord[] }>(`/admin/tournaments/${id}/disputes`, init),
  /**
   * As partidas esperando a segunda declaração · **leitura, e não decisão.**
   * Quem fecha é a varredura no prazo, e o admin não antecipa.
   */
  adminListPendingMatches: (id: string, init?: RequestInit) =>
    request<{ matches: PendingMatchRecord[] }>(`/admin/tournaments/${id}/pending`, init),
  /**
   * Gera a primeira rodada do mata-mata · **as seguintes saem sozinhas.**
   *
   * Ela recusa com partida de grupo em aberto ou em disputa · a trava é da
   * rota, e a tela só mostra a mensagem.
   */
  adminGenerateKnockout: (tournamentId: string) =>
    request<{ ok: true }>(`/admin/tournaments/${tournamentId}/knockout`, { method: 'POST' }),
  /**
   * A organização **encerra** a partida que ficou esperando · vale o placar que
   * foi declarado, e o motivo é obrigatório.
   *
   * Ela não crava número · pra isso existe a de resolver, logo abaixo, que só
   * vale onde há **duas** declarações.
   */
  adminCloseMatch: (matchId: string, input: CloseMatchInput) =>
    request<{ ok: true }>(`/admin/matches/${matchId}/close`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  /**
   * **A partida que ninguém declarou** · a terceira mesa.
   *
   * Ela crava placar **e** exige motivo · as duas irmãs fazem uma coisa só, e é
   * porque aqui não há declaração pra valer nem prova pra ler.
   */
  adminDecideMatch: (matchId: string, input: DecideMatchInput) =>
    request<{ ok: true }>(`/admin/matches/${matchId}/decide`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  /**
   * Quem pagou o quê nesta edição · **e o que já voltou.**
   *
   * Só `approved` e `refunded` · tentativa pendente ou recusada não é dinheiro,
   * e não pede decisão nenhuma de quem organiza.
   */
  adminListPayments: (id: string, init?: RequestInit) =>
    request<{ payments: AdminPaymentRecord[]; courtesies: AdminCourtesyRecord[] }>(
      `/admin/tournaments/${id}/payments`,
      init,
    ),
  /**
   * Dá uma vaga sem passar pelo Mercado Pago · **pendência 191**.
   *
   * Quem concedeu sai do token no servidor · o corpo leva só o club e o motivo.
   */
  adminGrantCourtesy: (id: string, input: GrantCourtesyInput) =>
    request<{ ok: true }>(`/admin/tournaments/${id}/courtesies`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  /**
   * Pede o estorno total · **o motivo é obrigatório.**
   *
   * `refunded: false` não é falha · quer dizer que o provedor aceitou o pedido
   * e o dinheiro ainda não consta devolvido na releitura. O webhook fecha.
   */
  adminRefundPayment: (paymentId: string, input: RefundPaymentInput) =>
    request<{ ok: true; refunded: boolean }>(`/admin/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  /** A organização decide o placar · só vale em partida em disputa. */
  adminMatchCorrection: (id: string, signal?: AbortSignal) => request<MatchCorrectionView>(`/admin/matches/${id}/correction`, { signal }),
  adminCorrectMatch: (id: string, input: CorrectMatchInput) => request<{ ok: true }>(`/admin/matches/${id}/correction`, { method: 'POST', body: JSON.stringify(input) }),
  adminResolveMatch: (matchId: string, input: ResolveMatchInput) =>
    request<{ ok: true }>(`/admin/matches/${matchId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /**
   * A lista do painel · **com busca e com o total.**
   *
   * O total não é enfeite: a lista corta em 50, e sem ele a tela dizia "estes
   * são os usuários" mostrando um terço deles.
   */
  adminListUsers: (params?: { limit?: number; skip?: number; q?: string }, init?: RequestInit) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.skip) qs.set('skip', String(params.skip));
    if (params?.q) qs.set('q', params.q);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ users: AdminUserRecord[]; total: number }>(`/admin/users${suffix}`, init);
  },
  adminUpdateUser: (id: string, input: AdminUpdateUserInput) =>
    request<{ ok: true }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  /**
   * O que o produto mandou · **com o desfecho, que é a metade que importa.**
   *
   * O `counts` vem junto porque a pergunta que abre esta tela é *"quanto
   * quicou?"*, e ela não se responde contando linha na página.
   */
  adminListEmails: (
    params?: { limit?: number; skip?: number; status?: EmailStatus },
    init?: RequestInit,
  ) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.skip) qs.set('skip', String(params.skip));
    if (params?.status) qs.set('status', params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{
      emails: AdminEmailRecord[];
      total: number;
      counts: Record<string, number>;
    }>(`/admin/emails${suffix}`, init);
  },

  /** A caixa do `contato@` · **sem corpo**, que só vem no detalhe. */
  adminListInbox: (init?: RequestInit) =>
    request<{ messages: InboxMessageRecord[] }>('/admin/inbox', init),

  adminReadInboxMessage: (id: string, init?: RequestInit) =>
    request<{ message: InboxMessageRecord }>(`/admin/inbox/${encodeURIComponent(id)}`, init),

  /**
   * Responder quem escreveu · **sem destinatário**, e isso é o desenho.
   *
   * O destino é quem já mandou a mensagem · um campo "para quem" aqui seria o
   * nosso domínio autenticado atrás de um input aberto.
   */
  adminReplyToInboxMessage: (id: string, text: string) =>
    request<{ ok: true }>(`/admin/inbox/${encodeURIComponent(id)}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  /** Um e-mail escrito pela organização · **com destinatário**, ao contrário da resposta. */
  adminSendEmail: (input: { to: string; subject: string; text: string }) =>
    request<{ ok: true }>('/admin/emails/send', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
