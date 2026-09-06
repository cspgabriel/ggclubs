import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Wordmark } from '@/components/brand';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';

/**
 * O header de **todas** as telas · a casca é dele, o miolo vem de fora.
 *
 * ## Por que ele existe
 *
 * Eram **cinco headers escritos à mão**, e eles já tinham divergido em quatro
 * pontos: na landing a marca não era link e na do club era; o 404 não tinha nem
 * idioma nem porta de entrada; e **só o app e o admin grudavam no topo**, então
 * rolar a landing levava a marca embora enquanto rolar o app não. Ninguém
 * decidiu nada disso · cada tela nasceu copiando a que estava por perto, que é
 * como apareceram três tamanhos de título em quatro páginas antes do
 * `PageHeader`.
 *
 * **Eu tinha proposto dois componentes, um pra fora e um pra dentro, e estava
 * errado** · o Eduardo apontou. A diferença entre as telas é o que vai **no
 * meio** e **na direita**; tudo que é moldura (altura, borda, container, grudar
 * no topo, a marca à esquerda) é igual nas cinco. Dois componentes garantiriam
 * que a próxima divergência acontecesse de novo, com metade da chance de
 * alguém perceber.
 *
 * ## Como ele se divide
 *
 * A casca não tem modo nem `variant`: ela recebe `nav` e `actions` como nós. É
 * composição, não configuração · header novo não precisa de mais um valor no
 * enum, e o componente não cresce a cada tela.
 *
 * `PublicHeaderActions` é o par padrão de quem está de fora (idioma e a porta
 * de entrada), e existe pra que landing, club público e 404 **não** repitam a
 * mesma dupla três vezes · era exatamente isso que fazia o 404 ficar pra trás.
 */
export function SiteHeader({
  /** Pra onde a marca leva · o app volta pro feed, o público volta pra landing. */
  brandHref = '/',
  /**
   * Substitui o bloco da marca inteiro.
   *
   * Existe por um caso só, e ele é legítimo: o admin põe **selo ao lado da
   * marca** e troca o logotipo pelo símbolo abaixo de 380px, tudo dentro do
   * mesmo link. Isso não é "mais um modo" da casca · é outro conteúdo no mesmo
   * lugar, e é por isso que entra como nó em vez de virar `variant="admin"`.
   */
  brand,
  /** Navegação do meio · só as telas de dentro têm. */
  nav,
  actions,
}: {
  brandHref?: string;
  brand?: ReactNode;
  nav?: ReactNode;
  actions: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    // **Gruda no topo em toda tela**, e essa foi a divergência mais visível das
    // quatro: a landing levava a marca embora ao rolar e o app não. Num produto
    // que se apresenta pelo link público, a marca sumir justo na tela de
    // apresentação é o pior lugar pra ela sumir.
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      {/* A altura vem do token, e não de um número cravado na classe: a faixa do jogo e as
          colunas de prévia do `/app` grudam **abaixo** desta linha, e enquanto
          o número morava aqui em classe as três contas fechavam por
          coincidência. Ver `--app-header-row-h` em `index.css`. */}
      <div className="container flex h-[var(--app-header-row-h)] items-center gap-3 sm:gap-6">
        {brand ?? (
          <Link to={brandHref} aria-label={t('common.brandName')}>
            <Wordmark />
          </Link>
        )}
        {nav}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">{actions}</div>
      </div>
    </header>
  );
}

/**
 * Idioma e porta de entrada · o par das telas abertas.
 *
 * **Ele não olha a sessão, e isso é decisão de 06/08/2026.** O botão dizia
 * "abrir app" pra quem já tinha entrado, e o preço disso era o SDK do Firebase
 * (164 kB, 34 kB gzip) no caminho crítico da **landing** · a única tela que um
 * desconhecido vê antes de decidir se o produto interessa, carregando um SDK de
 * autenticação pra escolher entre duas palavras.
 *
 * "Entrar" resolve os dois casos porque o destino resolve: quem já tem sessão
 * cai no `/login` e o `GuestRoute` o leva pro app antes do render. Ninguém vê a
 * tela de entrada, e ninguém espera a sessão pra ver o cabeçalho.
 *
 * ## `withSignUp` · e por que ele **não** vale na landing
 *
 * Na página do club, medido em 06/08/2026, o único caminho acima da dobra era o
 * "Entrar" · e "entrar" fala com quem **já tem conta**. Quem chega ali veio de
 * um link do Discord e nunca ouviu falar do produto: o convite pra criar conta
 * estava a 1523px, com a página tendo 1977. Como o header gruda no topo, um
 * segundo botão aqui é o único lugar que acompanha a pessoa a página inteira.
 *
 * **Na landing isto seria uma regressão, não uma melhoria**, e ela já foi
 * cometida uma vez: o hero da landing já carrega o `cta` da tela, e um segundo
 * botão do mesmo peso no header foi exatamente o que derrubava a conversão lá
 * antes da escada de botões existir (ver `docs/design.md`, "Escada de botões").
 * **Landing e texto legal continuam com um botão só** · quem for propor o
 * contrário, meça o hero antes.
 *
 * Por isso o cadastro entra como `ctaOutline` e o "Entrar" desce pra `ghost`: a
 * regra de **um `cta` sólido por tela** continua valendo, e o sólido da página
 * do club é o do fim, que aparece depois do elenco.
 */
export function PublicHeaderActions({ withSignUp = false }: { withSignUp?: boolean }) {
  const { t } = useTranslation();

  return (
    <>
      {/* Abaixo de 380px marca, idioma e CTA não cabem na mesma linha · o idioma
          é a escolha mais rara das três e desce pro rodapé. Com o cadastro
          junto, são quatro peças, então ele sobe pro `sm`. */}
      <LanguageSwitcher
        className={withSignUp ? 'hidden sm:inline-flex' : 'hidden min-[380px]:inline-flex'}
      />
      <Button asChild variant={withSignUp ? 'ghost' : 'ctaOutline'} size="sm">
        <Link to="/login">{t('landing.signIn')}</Link>
      </Button>
      {withSignUp && (
        <Button asChild variant="ctaOutline" size="sm">
          {/* `?criar=1` abre o formulário já no cadastro · sem isso o botão
              promete uma coisa e entrega a tela de entrar. */}
          <Link to="/login?criar=1">{t('common.createAccount')}</Link>
        </Button>
      )}
    </>
  );
}
