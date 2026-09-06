import type { Language } from '@ggclubs/schemas';
import es from '../../../../docs/novidades.es.md?raw';
import ptBR from '../../../../docs/novidades.pt-BR.md?raw';

/**
 * As novidades do produto · **dois markdowns versionados, e mais nada.**
 *
 * O texto entra no bundle em tempo de build (`?raw`), pela mesma razão que o
 * legal recusou uma API: não há dado a persistir, e o que muda passa por diff
 * antes de ir ao ar. **Quem importa este módulo carrega os dois idiomas**, então
 * ele só pode ser importado de chunk que já é `lazy` · a página, e a casca do
 * app. As faixas de versão nova, que vivem no bundle de entrada, leem só o
 * caminho, em `lib/paths.ts`.
 *
 * ## A forma do arquivo
 *
 * Cada entrada é um `## DD/MM/YYYY · Título`, da mais recente pra mais antiga,
 * e o corpo dela é o markdown que o `LegalDocument` já entende.
 *
 * **O contrato é o ID da entrada, e a data é a parte estável dele.** A página
 * sabe o que é novo comparando IDs, e não datas · com data sozinha, a segunda
 * novidade de um mesmo dia nascia lida. Quem responde pela idade do arquivo no
 * `deploy:web` é a data, porque lá a pergunta é outra: **há quantos dias
 * ninguém escreve aqui**.
 *
 * O teste em `changelog.test.ts` cobra a forma nos dois idiomas, inclusive a
 * sincronia das datas entre eles.
 */

export type ChangelogEntry = {
  /** Âncora estável da entrada · data ISO mais o título em kebab-case. */
  id: string;
  /** `YYYY-MM-DD` · ordenável por comparação de string. */
  date: string;
  title: string;
  /** O corpo, sem o título · é o que vai pro `LegalDocument`. */
  body: string;
};

const SOURCES: Record<Language, string> = { 'pt-BR': ptBR, es };

/**
 * **A data vem antes do título, e o separador é o da casa.** Título sem data
 * não é entrada · ele cai no corpo da anterior, e o teste do arquivo reprova.
 */
const ENTRY_HEADING = /^## (\d{2})\/(\d{2})\/(\d{4}) · (.+)$/;

/** Título vira âncora · sem acento, sem pontuação, e sem `·` no meio. */
function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseChangelog(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;
  const body: string[] = [];

  const close = () => {
    if (!current) return;
    entries.push({ ...current, body: body.join('\n').trim() });
    body.length = 0;
  };

  // O `\r` sai antes de qualquer regex, pelo mesmo motivo do `parseBlocks`: o
  // arquivo chega com o fim de linha da máquina de quem clonou.
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = ENTRY_HEADING.exec(line);
    if (heading) {
      close();
      const [, d, m, y, title] = heading;
      const date = `${y}-${m}-${d}`;
      current = { id: `${date}-${slug(title ?? '')}`, date, title: (title ?? '').trim(), body: '' };
      continue;
    }
    if (current) body.push(line);
  }
  close();

  return entries;
}

const parsed = new Map<Language, ChangelogEntry[]>();

export function changelogEntries(lang: Language): ChangelogEntry[] {
  let entries = parsed.get(lang);
  if (!entries) {
    entries = parseChangelog(SOURCES[lang]);
    parsed.set(lang, entries);
  }
  return entries;
}

/** O que a `Date` do navegador precisa pra formatar no idioma da pessoa. */
export function changelogDate(entry: ChangelogEntry): Date {
  const [y, m, d] = entry.date.split('-').map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

const SEEN_KEY = 'ggclubs:changelog-seen';

/**
 * **A marca é o ID da entrada, e não a data dela** · e a diferença não é
 * teórica: o arquivo já nasceu com **dois pares de entradas na mesma data**, e
 * o fluxo normal é escrever a novidade e subir no mesmo dia.
 *
 * Guardando só a data, quem abriu a página de manhã e voltou à tarde comparava
 * `"2026-09-03" > "2026-09-03"` · **falso**, e a entrada da tarde nascia lida:
 * sem ponto no menu, sem selo, sem contagem. A pessoa só a encontraria por
 * acaso.
 *
 * O ID começa pela data (`YYYY-MM-DD-titulo`), então ele continua ordenável e
 * ainda serve de data quando o título muda · ver o `seenDate`.
 */
const MARK = /^\d{4}-\d{2}-\d{2}(-|$)/;

/**
 * **A memória de quando o armazenamento não existe** · guia anônima com dados
 * do site bloqueados, ou navegador que nega.
 *
 * Sem ela, `changelogSeenUntil()` devolvia `null` pra sempre e o ponto do menu
 * **nunca apagava**: a pessoa lia as novidades, voltava pro `/app` e o ponto
 * continuava lá, em toda tela logada. O argumento escrito pra não usar o
 * sininho foi *"treinar quem usa a ignorá-lo custa o próximo aviso"* · um ponto
 * que não apaga é exatamente esse treino.
 *
 * Ela vale enquanto a aba viver, que é o que dá pra prometer sem armazenamento.
 */
let markInMemory: string | null = null;

/**
 * Até onde a pessoa já leu · `null` quando nunca abriu a página.
 *
 * **É conveniência de um navegador só, e não estado do produto.** Guardar no
 * servidor exigiria conta, e as novidades são públicas · quem lê sem sessão
 * também merece saber o que é novo desde a última vez. O preço é o combinado:
 * outro navegador começa do zero.
 *
 * **Valor fora da forma vira `null`**, e não silêncio: qualquer coisa que não
 * comece por uma data (um formato futuro com hora, um `"null"` gravado por
 * engano, uma extensão que mexeu na chave) fazia toda comparação dar falso e
 * apagava ponto, selo e contagem de uma vez · o `null` o resto do módulo já
 * trata bem.
 */
export function changelogSeenUntil(): string | null {
  let raw: string | null;
  try {
    // **O `?? markInMemory` é o que faz a reserva existir de verdade.** O
    // navegador que ela mira (aba anônima, dados bloqueados) lança no
    // `setItem` e devolve `null` no `getItem` **sem lançar** · lendo só o
    // `catch`, a marca gravada em memória nunca era lida de volta e o ponto
    // das novidades não apagava nunca, que é o oposto do que o docblock acima
    // promete. Achado no CR de 06/09/2026, junto do gêmeo em `app-invite.ts`.
    raw = localStorage.getItem(SEEN_KEY) ?? markInMemory;
  } catch {
    raw = markInMemory;
  }
  return raw && MARK.test(raw) ? raw : null;
}

/** A data dentro da marca · é o que sobrevive a alguém corrigir um título. */
function seenDate(mark: string | null): string | null {
  return mark ? mark.slice(0, 10) : null;
}

/** A página foi lida · a partir daqui, nada do que existe hoje é novo. */
export function markChangelogSeen(): void {
  const newest = changelogEntries('pt-BR')[0]?.id;
  if (!newest) return;
  markInMemory = newest;
  try {
    localStorage.setItem(SEEN_KEY, newest);
  } catch {
    // Sem armazenamento a marca vale só enquanto a aba viver · ver o `markInMemory`.
  }
}

/**
 * Há entrada que a pessoa ainda não viu · é o que acende o ponto no menu.
 *
 * **Quem nunca abriu a página conta como "não viu"**, de propósito: o ponto é o
 * convite pra primeira visita, e ele apaga na primeira leitura.
 */
export function hasUnreadChangelog(): boolean {
  const entries = changelogEntries('pt-BR');
  const newest = entries[0];
  if (!newest) return false;
  const mark = changelogSeenUntil();
  if (mark === null) return true;
  // Marca que ainda existe na lista responde exato; título corrigido depois da
  // leitura cai na data, que é a parte estável do ID.
  if (entries.some((entry) => entry.id === mark)) return newest.id !== mark;
  return newest.date > (seenDate(mark) ?? '');
}

/** Quantas entradas vieram depois da última leitura · zero sem leitura anterior. */
export function unreadChangelogCount(entries: ChangelogEntry[], seenUntil: string | null): number {
  if (!seenUntil) return 0;
  const at = entries.findIndex((entry) => entry.id === seenUntil);
  // A lista vai da mais recente pra mais antiga, então o que está **antes** da
  // marca é o que chegou depois dela.
  if (at !== -1) return at;
  const date = seenDate(seenUntil) ?? '';
  return entries.filter((entry) => entry.date > date).length;
}
