/**
 * Onde o instalador do app mora, e o que a tela conta sobre ele.
 *
 * **O endereço é estável de propósito** · o `pnpm desktop:publish` sobe a mesma
 * imagem duas vezes: uma com a versão no nome (imutável, é a que o **updater**
 * assina e consome) e outra com este nome fixo, cache curto. Sem a segunda, a
 * landing teria que buscar o `latest.json` antes de desenhar um botão · um
 * fetch no caminho de um link, que quebra sem JS e falha calado.
 *
 * **Ele NÃO passa pela nossa API.** É link direto pro CDN, então baixar não
 * depende do container estar de pé · o que quebra num deploy ruim é o produto,
 * e não a porta de entrada dele.
 */

/** O CDN de assets · o mesmo `ASSETS_PUBLIC_BASE_URL` que serve escudo e avatar. */
const ASSETS_BASE = 'https://cdn.ggclubs.com.br';

export const DESKTOP_INSTALLER_URL = `${ASSETS_BASE}/desktop/GGClubs-setup.exe`;

/**
 * O tamanho aproximado do instalador, em MB · a tela formata a partir daqui.
 *
 * **É um número, e não a frase pronta**, por dois motivos: a frase é do
 * catálogo (o `pnpm scan:strings` reprova texto de tela solto no código) e o
 * número precisa existir **num lugar só** · escrito nos dois idiomas, ele
 * divergiria no primeiro release que engordasse o app.
 *
 * **É aproximado de propósito** · o valor exato vive no CDN, e buscá-lo custaria
 * uma requisição `HEAD` antes de pintar o botão pra ganhar precisão de décimo
 * de MB. Quem lê quer saber se são 5 MB ou 500.
 *
 * **Remedir quando o instalador crescer** · medido em 03/09/2026 o CDN serve 5.145.707 bytes, e a versão é a 1.0.0
 * (4,89 MB), medida em 28/08/2026 contra o arquivo que o CDN devolve.
 */
export const DESKTOP_INSTALLER_MB = 5;
