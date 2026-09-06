import { createCheckGate } from './check-gate.js';

/**
 * **Saber que saiu uma versão nova do site, e reconhecer a tela que quebrou por
 * causa disso.** É a segunda e a terceira camadas da pendência 193.
 *
 * ## O problema, em uma linha
 *
 * A aba fica aberta com um bundle em memória, o `pnpm deploy:web` publica outro,
 * e as 29 rotas com `lazy()` continuam pedindo os chunks **do build que carregou
 * a página**. Reter os arquivos no bucket (o `--delete` saiu do sync) faz esses
 * pedidos continuarem funcionando · **é a rede de segurança, não a
 * atualização.** Quem atualiza de fato é a pessoa recarregar, e pra isso ela
 * precisa saber.
 *
 * ## Quem é a fonte da verdade, e por que não é a API
 *
 * É o `version.json` que o próprio build da web emite. **A API não sabe qual
 * bundle está no CloudFront** · ela sobe por um comando e a web por outro, com
 * minutos entre os dois, e no intervalo qualquer coisa que o servidor afirmasse
 * sobre a web seria plausível e errada. O raciocínio inteiro, com o caminho
 * recusado, está no `vite-build-id.ts`.
 *
 * ## Quando a conferência acontece · três gatilhos, nenhum relógio
 *
 * | gatilho | o que ele cobre |
 * |---|---|
 * | a aba **volta a ficar visível** | o caso comum · quem troca de aba é quem vai ver a faixa |
 * | o canal **volta depois de um `1001`** | a API foi trocada, e num deploy os dois comandos andam juntos · o sinal é de graça, o `RealtimeClient` já lê o código de fechamento |
 * | um **import dinâmico falhou** | o desfecho que a pendência descreve · aí a conferência não avisa, ela **explica** |
 *
 * **Não há polling, e a ausência é decisão.** Quem fica horas na mesma tela com
 * a aba em foco não recebe a faixa · e também não quebra, porque os chunks do
 * build dele continuam no bucket. Timer pra um caso que a camada 1 já tornou
 * inofensivo é peça sem defeito atrás dela.
 *
 * ## O que ele NÃO faz
 *
 * **Nunca recarrega sozinho.** A regra do formulário aberto (`CLAUDE.md`) vale
 * inteira aqui: recarregar debaixo de quem está declarando um placar é perder o
 * que foi digitado, e a espera custa nada. Este módulo só levanta a mão.
 */

/**
 * Quem é este bundle.
 *
 * **`null` é o estado normal fora de um build de produção** · o `pnpm dev` não
 * injeta o valor (o `version.json` nem existe lá) e a suíte roda por outra
 * config. Sem ele não há comparação possível, e **a resposta certa é não
 * conferir nada em vez de chutar**.
 *
 * É função e não constante de módulo porque o valor entra por `define`, e a
 * suíte precisa poder trocá-lo entre casos · uma constante avaliada no import
 * congelaria o primeiro que aparecesse.
 */
export function localBuildId(): string | null {
  return import.meta.env.VITE_BUILD_ID || null;
}

/** Onde o build da web deixa a própria identidade · ver `vite-build-id.ts`. */
const VERSION_URL = '/version.json';

/**
 * Piso entre duas conferências · a aba voltando a ficar visível é um gesto que
 * se repete, e a resposta não muda de segundo em segundo. A guarda (uma em
 * voo, o piso, o `force`) é a mesma do updater do desktop · `lib/check-gate.ts`.
 */
const MIN_INTERVAL_MS = 60_000;

/**
 * **O que um import dinâmico que sumiu diz, em cada motor.**
 *
 * Não existe tipo de erro pra isto: o `ChunkLoadError` é invenção do webpack, e
 * o Vite deixa subir o erro cru do navegador. Então a conferência é por texto, e
 * texto muda de versão em versão · por isso ela é **heurística e sabe disso**.
 *
 * **Errar aqui custa a frase, não o conserto**, e é o que torna a heurística
 * aceitável: os dois lados do `RouteErrorBoundary` oferecem recarregar, e o que
 * muda entre eles é só o que a tela explica. Um motor novo que invente outra
 * frase cai no texto genérico, e a pessoa continua com a saída na mão.
 *
 * O segundo item é o caso medido da pendência 193 e o mais traiçoeiro: o chunk
 * não dá 404, dá **200 com `text/html`**, porque o fallback de SPA devolve o
 * `index.html` no lugar do JavaScript.
 */
const STALE_CHUNK_SIGNS = [
  // Chromium e Firefox, quando o módulo não vem.
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  // Chromium, quando ele vem e é HTML · o desfecho medido em 04/09/2026.
  'expected a javascript-or-wasm module script',
  'mime type is not executable',
  // Safari.
  'importing a module script failed',
  'module script failed',
];

export function isStaleChunkError(error: unknown): boolean {
  // Só `Error` e string · qualquer outra coisa lançada não carrega mensagem de
  // motor, e `String(objeto)` daria `[object Object]` pra comparar com nada.
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const lower = message.toLowerCase();
  return STALE_CHUNK_SIGNS.some((sign) => lower.includes(sign));
}

let newerBuild: string | null = null;
/** A última queda do canal foi troca de servidor · ver `noteServerReplaced`. */
let serverReplaced = false;
const listeners = new Set<(build: string) => void>();
const deployListeners = new Set<() => void>();

/** O que a faixa lê · `null` enquanto não se souber de nada mais novo. */
export function newerBuildId(): string | null {
  return newerBuild;
}

export function onNewerBuild(listener: (build: string) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * **A comparação é `>` e não `!==`**, e os dois casos que isso fecha são reais:
 * uma borda do CDN devolvendo um `version.json` anterior não vira alarme falso,
 * e um **rollback** deixa em paz quem já está com o bundle mais novo · os chunks
 * dele continuam no bucket, porque o `--delete` saiu do sync.
 *
 * O valor é o relógio do build, então "mais novo" é comparação de número. Se um
 * dia ele deixar de ser ordenável, esta linha volta a ser `!==` e os dois casos
 * acima voltam a existir.
 */
function isNewer(remote: string, local: string): boolean {
  const a = Number(remote);
  const b = Number(local);
  if (Number.isFinite(a) && Number.isFinite(b)) return a > b;
  return remote !== local;
}

/**
 * Pergunta ao servidor qual é o build de agora · devolve o id mais novo, ou
 * `null` quando não há novidade **e** quando não deu pra saber.
 *
 * **Falha é silêncio, de propósito.** Rede caindo, `version.json` que ainda não
 * existe (deploy anterior à pendência 193) e o fallback de SPA devolvendo HTML
 * caem todos aqui · nenhum deles é notícia pra quem está usando o produto, e
 * levantar a mão por qualquer um deles seria pedir recarga sem motivo.
 *
 * `force` pula o piso de tempo · é o caminho do import que falhou, onde a
 * pergunta não é "será que mudou" e sim "por que quebrou".
 */
export async function checkForNewerBuild({ force = false } = {}): Promise<string | null> {
  // Sem saber quem eu sou não há comparação · é a suíte, e é o `pnpm dev`, onde
  // o `version.json` nem é gerado.
  if (!localBuildId()) return null;
  // Já sabemos · perguntar de novo não muda nada, e a faixa já está de pé.
  if (newerBuild) return newerBuild;
  return gate.check({ force });
}

async function fetchNewerBuild(): Promise<string | null> {
  const local = localBuildId();
  if (!local) return null;
  try {
    // **`no-store`, e não um `?t=` na URL** · o cabeçalho diz o que se quer
    // sem inventar um endereço por conferência, que é o que enche log e
    // métrica de CDN de caminhos que não existem.
    const res = await fetch(VERSION_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const build =
      typeof body === 'object' && body !== null && 'build' in body ? body.build : null;
    if (typeof build !== 'string' || !build) return null;
    if (!isNewer(build, local)) return null;

    newerBuild = build;
    for (const listener of listeners) listener(build);
    return build;
  } catch {
    // Rede, JSON inválido (o fallback de SPA devolvendo HTML), arquivo
    // ausente · nada disso é notícia.
    return null;
  }
}

const gate = createCheckGate(fetchNewerBuild, MIN_INTERVAL_MS);

/**
 * **A API foi trocada** · o `RealtimeClient` avisa quando o servidor fecha com
 * `1001 going away`, que é o que o `closeRealtimeHub` manda no `SIGTERM`.
 *
 * Isto não diz que a web mudou · diz que **um deploy está acontecendo**, e é o
 * único sinal instantâneo e honesto que o produto tem disso. A conferência sai
 * na volta do canal, quando o `version.json` já pode ter mudado · perguntar no
 * fechamento seria perguntar cedo demais, porque a web sobe **depois** da API.
 */
export function noteServerReplaced(): void {
  serverReplaced = true;
}

/**
 * O canal voltou · confere **só** se ele tinha caído por troca de servidor.
 *
 * Reconexão comum (wi-fi, notebook que dormiu) não é notícia sobre versão, e
 * conferir nela seria uma requisição por oscilação de rede.
 *
 * **E o sinal é repassado a quem mais quiser ouvir** (`onDeployDetected`) · no
 * app instalado quem confere versão é o updater, não o `version.json`, e a
 * distinção entre queda comum e troca de servidor mora aqui. Deixar cada lado
 * ler o código de fechamento por conta própria seria a segunda cópia.
 */
export function noteRealtimeReopened(): void {
  if (!serverReplaced) return;
  serverReplaced = false;
  void checkForNewerBuild();
  for (const listener of deployListeners) listener();
}

/**
 * Avisa que **a API foi trocada e o canal voltou** · um deploy aconteceu. É o
 * gatilho do updater do desktop (`components/desktop/update-watch.ts`).
 */
export function onDeployDetected(listener: () => void): () => void {
  deployListeners.add(listener);
  return () => deployListeners.delete(listener);
}

/**
 * Liga o gatilho da aba · chamado uma vez pela faixa, e ela é montada uma vez
 * por aplicativo.
 */
export function watchVisibility(): () => void {
  const onVisible = () => {
    if (document.visibilityState === 'visible') void checkForNewerBuild();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => document.removeEventListener('visibilitychange', onVisible);
}

/** Só pros testes · o estado é de módulo. */
export function resetAppVersion(): void {
  newerBuild = null;
  gate.reset();
  serverReplaced = false;
  listeners.clear();
  deployListeners.clear();
}
