import { SUPPORTED_LANGUAGES } from './languages.js';

/**
 * Endereços públicos que ninguém pode tomar · `@handle` e tag de club.
 *
 * **Isto é a primeira das quatro fatias da pendência 32**, e a única com prazo.
 * As outras (ofensivo, enganoso por parecença) são lista de termos e
 * normalização por confundíveis, e nenhuma das duas fica pronta · esta é lista
 * **fechada**, e o que ela protege é concreto.
 *
 * **Por que agora e não depois:** `@handle` e tag são endereço público e
 * **imutáveis na prática**. Se um dia o perfil virar `ggclubs.com.br/@nick` sem
 * prefixo, um nick igual ao nome de uma rota vira colisão de URL · e consertar
 * depois é pedir pra pessoa trocar de endereço, que é o pior pedido que existe
 * num produto onde o endereço é a identidade.
 *
 * **Não adianta atacar isto subindo o mínimo de caracteres**, e já foi tentado:
 * `es` e `pt` têm dois, mas `api`, `app` e `adm` têm três · o mínimo não separa
 * reservado de nome legítimo em tamanho nenhum. Quem separa é a lista.
 *
 * **Vale pros dois endereços de propósito.** Tag de club é o mesmo tipo de
 * coisa que o handle, e tinha o mesmo zero de proteção.
 */

/**
 * Rotas de primeiro nível que o produto já serve, mais as que ele vai servir.
 *
 * **Copiadas do `pages/router.tsx`, e essa é a parte que envelhece** · rota
 * nova de primeiro nível precisa entrar aqui. É o preço de a lista ser
 * estática, e ele é menor que o de descobrir a colisão com gente dentro.
 */
const ROUTES = [
  'app',
  'admin',
  'club',
  'clubs',
  'login',
  'logout',
  'onboarding',
  'termos',
  'privacidade',
  'terminos',
  'privacidad',
  // O caminho que a página pública do club usaria sem prefixo, e o plural dela.
  'perfil',
  'player',
  'players',
  /**
   * A terceira família de endereço público, e ela entrou **antes de existir
   * campeonato** · é a regra do `cdn.ggclubs.com.br`, que virou subdomínio antes
   * do primeiro upload. Agora custa esta linha; depois custaria pedir pra alguém
   * trocar de endereço, que é o pior pedido que existe aqui.
   *
   * **"Campeonato" é a mesma palavra em português e em espanhol**, então o
   * caminho é um só nos dois idiomas · o prefixo de idioma faz o resto. Os
   * sinônimos entram junto porque quem quisesse se passar pela organização
   * pegaria `@torneio` ou a tag `torneio`, e nenhum dos dois é caminho servido.
   */
  'campeonato',
  'campeonatos',
  'torneio',
  'torneios',
  'torneo',
  'torneos',
];

/** Nome de subdomínio e de caminho de infraestrutura · colidem de outro jeito. */
const INFRA = ['api', 'cdn', 'www', 'assets', 'static', 'mail', 'ftp', 'ns', 'mx', 'desktop'];

/**
 * Quem se passaria pelo produto ou por quem cuida dele.
 *
 * **Esta é a fatia de "falsa identidade"**, e ela é lista fechada como a de
 * cima · o dano dela não é técnico, é alguém acreditar que está falando com o
 * suporte.
 */
const IDENTITY = [
  'ggclubs',
  'gg',
  'ggclub',
  'suporte',
  'soporte',
  'support',
  'moderador',
  'moderator',
  'mod',
  'staff',
  'equipe',
  'equipo',
  'oficial',
  'official',
  'admin',
  'administrador',
  'root',
  'sistema',
  'system',
  'seguranca',
  'security',
  'ajuda',
  'ayuda',
  'help',
  'contato',
  'contacto',
  'contact',
];

/**
 * A lista inteira, já normalizada.
 *
 * Os códigos de idioma entram **do `languages.ts`**, e não escritos à mão · eles
 * viram prefixo de primeiro nível (`/es/...`) e a lista mora num lugar só de
 * propósito. Idioma novo passa a ser reservado sem ninguém lembrar · e o
 * `pt-br` vira `pt` junto, porque é a parte que aparece na URL.
 */
export const RESERVED_ADDRESSES: ReadonlySet<string> = new Set([
  ...ROUTES,
  ...INFRA,
  ...IDENTITY,
  ...SUPPORTED_LANGUAGES.map((l) => l.toLowerCase()),
  ...SUPPORTED_LANGUAGES.map((l) => l.split('-')[0]?.toLowerCase() ?? ''),
]);

/**
 * O endereço está reservado?
 *
 * **Comparação exata, nunca por substring**, e isso é deliberado: casar pedaço
 * recusaria `admiral`, `gustavo` e `staffordshire` · é o problema Scunthorpe, e
 * quem sofre com ele é sempre quem tem nome incomum, sem entender o erro. A
 * fatia de termo ofensivo, que é onde substring tentaria ajudar, continua fora
 * de escopo pelo mesmo motivo.
 */
export function isReservedAddress(value: string): boolean {
  return RESERVED_ADDRESSES.has(value.trim().toLowerCase());
}
