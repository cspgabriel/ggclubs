import * as Dialog from '@radix-ui/react-dialog';
import { Download, Loader2 } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Wordmark } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { isClientBlocked, subscribeClientBlocked } from '@/lib/client-blocked';
import { checkForUpdate } from '@/lib/desktop';

/**
 * A trava de atualização obrigatória · aparece quando a API responde **426**.
 *
 * **Cobre tudo de propósito.** Este é o único estado do produto em que a tela
 * atrás não vale nada: o servidor não vai atender mais nada deste binário, então
 * deixar a pessoa navegar seria mostrar uma casca que falha em cada clique. É a
 * diferença entre "não deu pra carregar" e "este programa acabou".
 *
 * **Ela tem saída, e é a regra da casa aplicada ao pior caso.** O caminho normal
 * é atualizar e reiniciar. Mas se o piso subiu **antes** de o instalador ser
 * publicado (erro nosso de ordem de operação, o que `docs/auth-e-desktop.md`
 * avisa em letra maiúscula), o updater não acha pra onde ir · aí a tela diz
 * isso e oferece tentar de novo, que é justamente o caso em que repetir pode
 * mudar o resultado.
 *
 * **Dois desfechos ruins, duas frases.** "Não achei" (`missing`) e "achei e
 * não consegui instalar" (`failed`) chegavam no mesmo estado, e a frase dizia
 * que a atualização ainda não existia enquanto ela existia e quem falhou foi o
 * download ou o UAC. O `checkForUpdate` ainda junta rede caída, updater que
 * explodiu e "ainda não publicaram" num `null` só · por isso a frase do
 * `missing` diz "não deu pra encontrar", que é verdade pros três.
 */
export function UpdateRequired() {
  const { t } = useTranslation();
  const blocked = useSyncExternalStore(subscribeClientBlocked, isClientBlocked, () => false);
  const [state, setState] = useState<'idle' | 'looking' | 'missing' | 'installing' | 'failed'>(
    'idle',
  );

  if (!blocked) return null;

  async function update() {
    setState('looking');
    const found = await checkForUpdate();
    if (!found) {
      setState('missing');
      return;
    }
    setState('installing');
    try {
      await found.install();
      // Instalar de verdade encerra o processo antes disto · chegar aqui é a
      // instalação ter voltado sem reiniciar, e o botão não pode ficar girando
      // pra sempre num diálogo que bloqueia Escape e clique fora.
      setState('idle');
    } catch {
      setState('failed');
    }
  }

  const busy = state === 'looking' || state === 'installing';
  const retry = state === 'missing' || state === 'failed';

  return (
    // **Começa abaixo da barra de título, e isso é conserto de 07/08/2026.**
    // Com `inset-0` ela cobria os 40px da barra · e como a janela roda com
    // `decorations: false`, a barra **é** o único jeito de minimizar, maximizar
    // e fechar. A trava deixava a pessoa sem controle nenhum da janela, e a
    // única saída virava `Alt+F4` · numa tela que existe pra dizer "faça isto
    // pra continuar", tirar o controle da janela é o oposto do que ela quer.
    //
    // **Só apareceu no app empacotado.** No navegador não há barra, e em
    // `desktop:dev` a trava nem dispara (lá a origem é do Vite, não
    // `tauri://`) · foi preciso instalar, subir o piso em produção e olhar.
    <Dialog.Root open>
      <Dialog.Portal>
        {/* A trava assume foco e ponteiro mesmo se outro dialog já estiver aberto. */}
        <Dialog.Overlay className="dialog-overlay fixed inset-x-0 bottom-0 z-[100] bg-background" />
        <Dialog.Content
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="fixed inset-x-0 bottom-0 top-[var(--desktop-titlebar-h)] z-[100] flex flex-col items-center gap-6 overflow-y-auto overscroll-contain bg-background p-6 text-center outline-hidden"
        >
          <div className="my-auto flex shrink-0 flex-col items-center gap-6">
            <Wordmark size="entry" />

            <div className="max-w-md space-y-2">
              <Dialog.Title asChild>
                <h1 className="font-display text-2xl uppercase tracking-tight sm:text-3xl">
                  {t('desktop.forcedUpdateTitle')}
                </h1>
              </Dialog.Title>
              <Dialog.Description asChild>
                <p className="text-sm text-muted-foreground">{t('desktop.forcedUpdateBody')}</p>
              </Dialog.Description>
            </div>

            <Button size="lg" variant="cta" disabled={busy} onClick={() => void update()}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {state === 'installing'
                    ? t('desktop.updateInstalling')
                    : t('desktop.forcedUpdateLooking')}
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {retry ? t('desktop.forcedUpdateRetry') : t('desktop.updateCta')}
                </>
              )}
            </Button>

            {/* **O caso em que a atualização não foi encontrada, e o em que a
          instalação falhou.** Sem a frase o botão pareceria inerte, e controle
          que não responde é o que a pessoa lê como app quebrado · a mesma
          regra do botão desligado que diz por quê. Citação sem aspas de
          propósito: dentro do JSX elas viram string de tela pro `scan:strings`. */}
            {retry && (
              <p role="alert" className="max-w-md text-sm text-destructive">
                {state === 'failed' ? t('desktop.updateFailed') : t('desktop.forcedUpdateMissing')}
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
