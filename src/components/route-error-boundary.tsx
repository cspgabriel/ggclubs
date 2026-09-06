import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { activeLanguage } from '@/i18n';
import { LANGUAGE_BASENAME } from '@/i18n/language';
import { checkForNewerBuild, isStaleChunkError } from '@/lib/app-version';

/**
 * **A camada 3 da pendência 193** · quando o chunk de uma rota não vem, esta
 * tela explica e oferece recarregar, em vez de a página quebrar sem palavra
 * nenhuma.
 *
 * ## Por que ela é a camada obrigatória
 *
 * As outras duas cobrem o caso comum e **não cobrem todos**: reter os assets
 * antigos resolve o deploy da web, e a faixa depende de a pessoa ter trocado de
 * aba ou de o canal ter caído · nem todo mundo tem canal (a landing, a página
 * aberta do club e a do campeonato rodam **sem** `RealtimeProvider`, e são
 * justamente as de quem chega de fora). Import dinâmico também falha por rede,
 * por bucket incompleto e por um asset que alguém apagou à mão.
 *
 * **Aqui não há hipótese: alguma coisa já quebrou, e a tela precisa ter saída.**
 *
 * ## Ela mora no `Under`, e por isso cobre as 29 rotas de uma vez
 *
 * Cada `lazy()` do `pages/router.tsx` renderiza dentro de um `Under`, e os
 * `Suspense` internos das duas cascas (`AppLayout` e `AdminLayout`) sobem até
 * ele · uma peça, todos os caminhos. É a pergunta do "por quantos caminhos se
 * chega aqui" respondida no lugar onde eles se encontram, em vez de um limite
 * por tela.
 *
 * **O preço, escrito porque é real:** o limite fica **acima** da casca, então a
 * tela de erro aparece sem header. É o certo pra uma tela terminal e é o motivo
 * de ela carregar as próprias saídas.
 *
 * ## Reconhecer "chunk velho" é heurística, e ela sabe disso
 *
 * Não existe tipo de erro pra isto (ver `lib/app-version.ts`) · a conferência é
 * por texto de navegador. **Errar custa a frase, não o conserto**: os dois
 * ramos oferecem recarregar, e o que muda é o que a tela explica.
 */
type Props = { children: ReactNode };
type State = { error: Error | null };

export class RouteErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    /**
     * **O console é o único coletor que existe** · não há relatório de erro no
     * produto, e desde o Vite 8 o `forwardConsole` traz isto pro terminal de
     * quem está com o `pnpm dev` aberto. Sem esta linha, um erro engolido pelo
     * limite some sem deixar rastro em lugar nenhum.
     */
    console.error('[route] a tela quebrou', error, info.componentStack);
    /**
     * **Confere a versão mesmo quando o erro não parece de chunk**, e de
     * propósito: a heurística de texto erra pra menos, e se houver mesmo um
     * build novo lá fora, quem estiver com a faixa na tela em seguida entende o
     * que aconteceu. `force` pula o piso de um minuto · aqui a pergunta não é
     * "será que mudou", é "por que quebrou".
     */
    void checkForNewerBuild({ force: true });
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return <RouteErrorScreen stale={isStaleChunkError(this.state.error)} />;
  }
}

/**
 * A tela terminal · **duas saídas, sempre**, que é a regra do `CLAUDE.md` pra
 * tela de erro.
 *
 * O desenho é o da irmã em `components/protected-route.tsx` (conta não
 * carregada) · mesma centralização, mesmo `min-h-screen`, mesmo par de botões.
 */
function RouteErrorScreen({ stale }: { stale: boolean }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg font-semibold">
        {stale ? t('siteVersion.staleTitle') : t('siteVersion.crashTitle')}
      </p>
      <p className="max-w-sm text-muted-foreground">
        {stale ? t('siteVersion.staleBody') : t('siteVersion.crashBody')}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* **Recarregar é o conserto de verdade do caso de chunk velho** · o
            `index.html` é `no-cache`, então a recarga já traz o bundle novo.
            Por isso ele é o `cta` quando a causa é essa, e só mais um botão
            quando não é · repetir a mesma coisa não muda o resultado de um erro
            que não veio de versão. */}
        <Button variant={stale ? 'cta' : 'outline'} onClick={() => window.location.reload()}>
          {t('siteVersion.staleCta')}
        </Button>
        {/* **A segunda saída é obrigatória**, e ela é a que sobra quando
            recarregar não resolve · `assign` e não `<Link>` de propósito: o
            que quebrou foi o render, e navegar por dentro do router manteria a
            árvore doente de pé. Carga inteira zera tudo.

            O prefixo do idioma entra aqui porque este caminho **não** passa
            pelo `basename` do router. */}
        <Button
          variant="ghost"
          onClick={() => window.location.assign(LANGUAGE_BASENAME[activeLanguage])}
        >
          {t('siteVersion.crashHome')}
        </Button>
      </div>
    </div>
  );
}
