import { isDesktop, viewerPlatform, type Viewer } from './platform.js';

/**
 * O convite pro app, pra quem já está logado · **a decisão, separada da tela.**
 *
 * O produto não tem interstício, modal de entrada nem faixa que persegue · a
 * porta é o login e toda tela entre abrir e entrar é atrito (29/07/2026). O que
 * sobra é dizer a frase **onde o fato acontece**: a pessoa abre a sala do
 * confronto e encontra mensagem que chegou **com o navegador fechado**. Os
 * quatro avisos de conversa não saem por e-mail · quem alcança quem está longe
 * da tela é a bandeja do app, e é a única coisa que ela não tem hoje.
 *
 * Cinco condições, e cada uma tira um caso em que a frase mentiria:
 *
 * | condição | o que ela evita |
 * |---|---|
 * | fora do app instalado | oferecer o instalador a quem já instalou |
 * | quem está no Windows | o app não existe pro Mac, pro Linux nem pro celular |
 * | há mensagem não lida | "você perdeu algo" precisa do `unread` provando |
 * | **a última chegou bem antes desta guia abrir** | mensagem que chegou com o site aberto tocou o sininho · ela não foi perdida por falta do app |
 * | ainda não respondida, e menos de três vezes | a nota não persegue: qualquer clique encerra, e sem clique ela para sozinha |
 *
 * **A lacuna que fica escrita:** o produto não sabe quem tem o app instalado
 * noutra máquina (pendência 204), então quem tem o app e abre o site no
 * navegador ouve o convite até dispensar · uma vez por navegador.
 */

const STORAGE_KEY = 'ggclubs:app-invite';

/** Quantas vezes a nota aparece sem resposta antes de parar sozinha. */
export const APP_INVITE_MAX_SHOWINGS = 3;

/**
 * **A folga entre "chegou" e "a guia abriu"** · a mensagem tem carimbo do
 * servidor e a guia tem o relógio da máquina, e os dois não combinam entre si.
 * Máquina dez minutos adiantada faria mensagem que chegou **com a guia aberta**
 * (e que tocou o sininho) parecer anterior a ela, e a nota mentiria no único
 * ponto que a justifica. Com a folga, mentir exige o relógio errar mais do que
 * isto · e o que se perde é só a mensagem dos últimos minutos, que a pessoa
 * nem chegou a sentir falta.
 *
 * A âncora certa seria a marca de leitura da própria sala, em relógio do
 * servidor · o `MatchChatView` não a traz (o `readers` exclui quem lê), e
 * trazê-la é mudança de API.
 */
export const APP_INVITE_MIN_AWAY_MS = 15 * 60_000;

const DISMISSED = 'dismissed';

/**
 * A memória de quando o armazenamento não existe · a mesma do changelog. Sem
 * ela, guia anônima com dados bloqueados veria a nota a cada sala aberta.
 *
 * **E ela cobre a leitura que devolve `null`, não só a que lança** · o
 * navegador com dados bloqueados costuma lançar no `setItem` e responder `null`
 * no `getItem` sem lançar. Cair pra memória só na exceção deixava o contador
 * parado no zero e a dispensa sem efeito · a nota voltava em toda sala.
 */
let inMemory: string | null = null;

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? inMemory;
  } catch {
    return inMemory;
  }
}

function writeRaw(value: string): void {
  inMemory = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Sem armazenamento a marca vale enquanto a aba viver · ver `inMemory`.
  }
}

/** Quantas vezes a nota já apareceu · `null` quando a pessoa a dispensou. */
export function appInviteShowings(): number | null {
  const raw = readRaw();
  if (raw === DISMISSED) return null;
  const count = Number(raw);
  return Number.isInteger(count) && count >= 0 ? count : 0;
}

/**
 * A nota foi **pintada** · quem chama é a tela, no momento em que ela entra na
 * lista, e não a decisão. Contar na decisão gastava exibição que ninguém viu:
 * mensagem chegando entre a resposta e o render escondia a nota com a cota já
 * debitada, e três salas movimentadas esgotavam o convite sem ele aparecer.
 */
export function noteAppInviteShown(): void {
  const showings = appInviteShowings();
  if (showings === null) return;
  writeRaw(String(showings + 1));
}

/** Qualquer clique na nota · baixar ou fechar · encerra o convite neste navegador. */
export function dismissAppInvite(): void {
  writeRaw(DISMISSED);
}

export type AppInviteInput = {
  unread: number;
  /** Quando chegou a última mensagem da sala · é ela que prova a ausência. */
  lastMessageAt: Date | string | null | undefined;
  /** Quando esta guia carregou · `performance.timeOrigin` na tela. */
  tabOpenedAt: number;
  viewer: Viewer;
  desktop: boolean;
  showings: number | null;
};

/** A regra pura · quem lê plataforma, relógio e memória é o `decideAppInvite`. */
export function shouldInviteToApp(input: AppInviteInput): boolean {
  if (input.desktop) return false;
  if (input.viewer !== 'windows') return false;
  if (input.showings === null || input.showings >= APP_INVITE_MAX_SHOWINGS) return false;
  if (input.unread <= 0) return false;
  if (!input.lastMessageAt) return false;
  const arrivedAt = new Date(input.lastMessageAt).getTime();
  if (!Number.isFinite(arrivedAt)) return false;
  return arrivedAt < input.tabOpenedAt - APP_INVITE_MIN_AWAY_MS;
}

/**
 * A pergunta que a sala faz na primeira carga. **Ela não conta a exibição** ·
 * quem conta é a tela, quando a nota entra de fato na lista (`noteAppInviteShown`).
 */
export function decideAppInvite(input: Pick<AppInviteInput, 'unread' | 'lastMessageAt'>): boolean {
  return shouldInviteToApp({
    ...input,
    tabOpenedAt: performance.timeOrigin,
    viewer: viewerPlatform(),
    desktop: isDesktop(),
    showings: appInviteShowings(),
  });
}
