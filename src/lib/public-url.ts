import { pathWithLanguage } from '@ggclubs/schemas';
import { activeLanguage } from '@/i18n';
import { CHANGELOG_PATH } from './paths';
import { isDesktop } from './platform';

/**
 * A origem que vai num link **feito pra sair daqui**.
 *
 * Existe por causa de um defeito que só aparece no app instalado: o link
 * público do club era montado com `window.location.origin`, e no Tauri isso é
 * `tauri://localhost` (ou `http://tauri.localhost` no Windows) · quem copiasse
 * o link do próprio club pelo app colava no Discord um endereço que **não abre
 * em lugar nenhum**. E o link é o canal de aquisição do produto inteiro.
 *
 * Por que não apareceu antes: no navegador a origem já é a certa, e o
 * `desktop:dev` serve a página pelo Vite, então lá a origem é `localhost:5173`
 * · o defeito só existe no **empacotado**, que é a validação que ainda não
 * rodou (pendência 12). É a mesma família da CSP, que também só falha no
 * instalador.
 *
 * **Na web continua sendo `window.location.origin`**, de propósito: em produção
 * ele já é o domínio, e em desenvolvimento é o `localhost` que o dev quer
 * abrir. Trocar pelos dois lados faria o botão de copiar, em dev, devolver um
 * link pra um domínio que ainda não existe.
 *
 * É esta função que dá uso ao `VITE_PUBLIC_BASE_DOMAIN`, que estava declarado
 * em três `.env` e no `env.d.ts` sem ninguém ler.
 */
export function publicOrigin(): string {
  if (!isDesktop()) return window.location.origin;
  return `https://${import.meta.env.VITE_PUBLIC_BASE_DOMAIN}`;
}

/**
 * O endereço completo das novidades, no idioma ativo.
 *
 * **Completo, e não caminho**, porque quem o usa sai do router: as duas faixas
 * de versão nova vivem fora dele (e no app instalado abrem o site no navegador
 * do sistema).
 * O prefixo do idioma entra à mão pela mesma razão · fora do router não há
 * `basename` pra pôr o `/es`.
 */
export function changelogUrl(): string {
  const path = pathWithLanguage(CHANGELOG_PATH, activeLanguage);
  return `${publicOrigin()}${path}`;
}
