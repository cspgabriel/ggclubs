import { type Platform, type SquadMember } from '@ggclubs/schemas';
import { BadgeCheck, Crown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BrandWatermark } from '@/components/brand';
import { ClubIdentity } from '@/components/club/club-identity';
import { CrossplayBadge } from '@/components/club/crossplay-badge';
import { StatStrip } from '@/components/ui/stat-strip';
import { PlatformMark } from '@/components/club/platform-mark';
import { Avatar } from '@/components/ui/avatar';
import { SectionTitle } from '@/components/ui/section-title';
import { InfoTip } from '@/components/ui/tooltip';
import type { PublicClub } from '@/lib/api';
import { ROLE_KEY } from '@/lib/clubs';
import { positionKey } from '@/lib/position';
import { PAGE_STACK_GAP } from '@/components/ui/page-stack';
import { cn } from '@/lib/utils';

/**
 * O conteúdo da página de club · identidade, números e elenco.
 *
 * **Uma versão só, duas molduras.** Quem está logado vê isto dentro do app, com
 * a navegação e o botão de configurar; quem chegou pelo link vê a mesma coisa
 * na moldura pública, com convite pra entrar. Duplicar o conteúdo pra ter as
 * duas seria garantir que uma envelheça · foi o argumento que criou o
 * `AuthLayout`, e vale igual aqui.
 */
export function ClubView({
  club,
  squad,
  action,
  beforeSquad,
  squadNotice,
  identityNotice,
  renderMemberActions,
  renderMemberNotice,
  playerHref,
  viewerHandle,
  viewerPlatform,
  variant = 'page',
}: {
  club: PublicClub;
  squad: SquadMember[];
  /**
   * Ação de quem olha · configurar pro dono, pedir pra entrar pra quem está de
   * fora. Quem decide qual é a página, que já sabe pelo elenco.
   */
  action?: React.ReactNode;
  /**
   * Bloco que entra **antes do elenco**, hoje a fila de pedidos do dono.
   *
   * Slot em vez de a fila ser renderizada acima do `ClubView`: ela é sobre o
   * elenco e precisa nascer ao lado dele. Acima da identidade, seria a primeira
   * coisa da página do próprio club, na frente do escudo.
   */
  beforeSquad?: React.ReactNode;
  /** Aviso dentro da seção do elenco · hoje o convite a definir capitão. */
  squadNotice?: React.ReactNode;
  /**
   * Entra na coluna da identidade, logo abaixo do selo de vínculo · hoje o
   * favorito.
   *
   * **Slot e não campo**, pela mesma razão do header do produto: o que muda
   * entre as duas telas é o conteúdo, não um modo. E é o que mantém o favorito
   * fora da página pública sem o `ClubView` precisar saber que ele existe.
   */
  identityNotice?: React.ReactNode;
  /**
   * Ações de gestão por linha. Recebe o `@handle` porque é o que o elenco
   * público tem · quem gerencia cruza com a lista que veio da rota autenticada,
   * que é a única com id.
   */
  renderMemberActions?: (handle: string) => React.ReactNode;
  /**
   * Faixa de estado **dentro do card** da pessoa, abaixo da linha · hoje a
   * oferta de posse esperando resposta.
   *
   * **Slot separado do `renderMemberActions` de propósito.** Aquele entrega
   * peças pro fim da linha, e foi ali que a oferta de posse morou até
   * 07/08/2026 · como uma coroa, porque a palavra ao lado do papel espremia o
   * nome na grade de três colunas. O problema não era o espaço: era a coroa
   * apontar pro **membro** enquanto o dono de verdade, no card ao lado, não
   * tinha coroa nenhuma. Faixa própria dá lugar à palavra sem disputar largura.
   */
  renderMemberNotice?: (handle: string) => React.ReactNode;
  /**
   * Pra onde o nome de cada pessoa do elenco aponta.
   *
   * **Sem isto o elenco era um beco** · o visitante chegava pelo link do
   * Discord, via o time, clicava num nome e não ia a lugar nenhum. A função vem
   * de fora porque o destino depende de onde a tela está (`/player/:handle` na
   * pública, `/app/players/:handle` dentro do app), e quem sabe isso é a página
   * · é a mesma decisão do `guestGoesTo`: declarar, nunca inferir.
   *
   * Opcional de propósito: quem não passa mantém o nome como texto, e nenhuma
   * tela ganha link pra uma rota que ela não conhece.
   */
  playerHref?: (handle: string) => string;
  /**
   * O @handle de quem está olhando, quando há sessão.
   *
   * A página não dizia em lugar nenhum que o club era seu · quem tem três
   * clubs abria um e não sabia se estava vendo o próprio ou o de outro. O
   * vínculo sai do cruzamento com o elenco, que já veio do servidor.
   */
  viewerHandle?: string | undefined;
  /**
   * A plataforma de quem está olhando, quando há sessão **e** perfil
   * preenchido. Com ela o selo de crossplay para de informar e passa a
   * responder: *você joga com esse time*, ou *não joga*.
   */
  viewerPlatform?: Platform | null | undefined;
  /**
   * `page` é a página pública, dona da largura da janela: a capa sangra de
   * borda a borda. `embedded` é dentro do app, onde já existe um container em
   * volta e a capa vira cartão.
   *
   * A primeira versão não tinha isto · usava margem negativa pra furar o
   * container do app. Não funcionou e não tinha como funcionar: a página
   * chutava o padding do pai (`-mx-8` contra `1.5rem` de verdade) e sobravam
   * 8px de cada lado, que viravam scroll horizontal em parte das larguras.
   * **Peça filha não desfaz o layout do pai na mão** · ou o pai oferece o
   * modo, ou a peça se acomoda no espaço que recebeu.
   */
  variant?: 'page' | 'embedded';
}) {
  const { t, i18n } = useTranslation();
  const embedded = variant === 'embedded';
  const myRole = viewerHandle
    ? (squad.find((m) => m.handle === viewerHandle)?.role ?? null)
    : null;

  return (
    <div className={embedded ? PAGE_STACK_GAP : undefined}>
      <section
        className={cn(
          'relative overflow-hidden py-8 sm:py-12',
          embedded ? 'rounded-2xl border' : 'border-b',
        )}
      >
        <BrandWatermark />
        <div className={cn('relative', embedded ? 'px-5 sm:px-8' : 'container')}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/*
              Duas medidas, e as duas foram medidas em captura.

              `flex-1` a partir de `sm` é o que dá ao `truncate` do nome uma
              largura pra respeitar: sem ele a coluna vira `max-content`, o `h1`
              cresce além do card e o nome é **cortado seco pelo
              `overflow-hidden` da capa**, sem nem as reticências aparecerem ·
              nome curto cabia e nome comprido não, então o defeito só existia
              em parte dos clubs.

              `w-full` abaixo de `sm` é o par disso. Só com `flex-1`, a coluna
              encolhia até o nome virar duas letras quando havia botão ao lado
              numa tela de 390px · com a largura cheia, o `flex-wrap` do pai
              empurra a ação pra linha de baixo, que é o que já acontecia antes.
            */}
            <div className="flex w-full min-w-0 flex-col items-start gap-3 sm:w-auto sm:flex-1">
              <ClubIdentity
                className="w-full"
                name={club.name}
                tag={club.tag}
                crestUrl={club.crestUrl}
                platform={club.platform}
              />
              {myRole && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  {myRole === 'owner' ? t('club.yours') : t('club.youAreMember')}
                </span>
              )}
              {identityNotice}
            </div>
            {action}
          </div>
          {club.bio && <p className="mt-5 max-w-2xl text-base text-foreground">{club.bio}</p>}
        </div>
      </section>

      {/* **O topo é vão de seção, não respiro de página.** Ele era `py-10` nos
          dois sentidos, e isso deixava a pública com 40px depois da capa contra
          24px do app · a moldura pode diferir (lá a capa sangra, aqui ela é
          cartão), o ritmo não. O rodapé continua respirando mais, porque ali é
          fim de página. */}
      <div className={cn(PAGE_STACK_GAP, embedded ? '' : 'container pt-6 pb-8 sm:pb-10')}>
        <StatStrip
          items={[
            { label: t('club.statMembers'), value: squad.length },
            {
              label: t('club.statPlatform'),
              // A geração vive **dentro** da célula da plataforma, como selo.
              // Célula própria dava a ela o mesmo peso do elenco, e ela não é
              // um dado do club: é uma consequência da plataforma. Aqui ela
              // fica onde a pergunta nasce.
              value: (
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <PlatformMark platform={club.platform} withLabel />
                  <CrossplayBadge platform={club.platform} viewerPlatform={viewerPlatform} />
                </span>
              ),
            },
            {
              label: t('club.statSince'),
              // Dia exato, não mês e ano. A data é curta e a pessoa quer saber
              // se o club é de ontem ou de dois anos atrás · "jul. 2026"
              // esconde justamente a diferença entre "novo" e "novíssimo".
              value: (
                <span className="inline-flex items-center gap-1.5">
                  {new Date(club.createdAt).toLocaleDateString(i18n.language, {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                  <InfoTip label={t('club.statSinceHint')} />
                </span>
              ),
            },
          ]}
        />

        {beforeSquad}

        <section>
          <SectionTitle hint={t('club.squadHint')}>{t('club.squad')}</SectionTitle>
          {squadNotice}
          {squad.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              {t('club.squadEmpty')}
            </p>
          ) : (
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {squad.map((member) => (
                <li
                  key={member.handle}
                  data-player-handle={member.handle}
                  className={cn(
                    'rounded-xl border bg-card',
                    member.handle === viewerHandle && 'border-primary/50 bg-primary/5',
                  )}
                >
                  {/* O recuo saiu do `<li>` e veio pra cá porque o rodapé de
                      estado precisa da borda de ponta a ponta · com o padding
                      no pai, o traço nasceria encolhido dos dois lados. */}
                  <div className="flex items-center gap-3 p-3">
                  <Avatar name={member.displayName} src={member.avatarUrl} className="h-10 w-10" />
                  {/* **O bloco do nome vira link, e não o card inteiro** · quem
                      gerencia recebe botões no fim da linha, e botão dentro de
                      link é o par que o navegador resolve de um jeito e o
                      teclado de outro. Duas linhas dão alvo de toque suficiente
                      sem engolir as ações.

                      Sem `playerHref` ele continua sendo texto · o componente
                      não inventa destino, porque quem sabe em que espaço de
                      endereços a tela está é a página. */}
                  <PlayerLine href={playerHref?.(member.handle)}>
                    <span className="flex items-center gap-1.5">
                      {/* `title` no nome truncado, como no card do club · sem
                          ele o corte é definitivo e a pessoa não tem nenhuma
                          forma de ler o resto. Medido em 04/08/2026: a 320px um
                          nome de doze caracteres perde 10px, e o @nick logo
                          abaixo identifica mas não é o nome. */}
                      <span
                        title={member.displayName}
                        className="min-w-0 truncate text-sm font-semibold"
                      >
                        {member.displayName}
                      </span>
                      {/* **As insígnias de papel ficam ao lado do nome**, não na
                          coluna do papel · elas não substituem o que está
                          escrito lá, e quem acumula precisa mostrar as duas.
                          Coroa antes do "C" porque dono é o papel que manda no
                          club; a braçadeira é do jogo.

                          A coroa **é do dono de fato**, e essa é a decisão do
                          Eduardo em 07/08/2026 · ela não se move enquanto a
                          posse não passou. Antes ela marcava **quem tinha sido
                          convidado a assumir**, o que punha o único elemento
                          coroado da tela num membro enquanto o dono, no card ao
                          lado, não tinha nenhum. Quem responde "estou esperando
                          resposta" é a faixa, que é estado e não papel. */}
                      {member.role === 'owner' && (
                        <RoleBadge label={t('club.roleOwner')}>
                          <Crown className="h-3 w-3" aria-hidden />
                        </RoleBadge>
                      )}
                      {member.isCaptain && (
                        <RoleBadge label={t('club.roleCaptain')}>C</RoleBadge>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      @{member.handle}
                    </span>
                  </PlayerLine>
                  {/* **O marcador de quem está olhando fica fora do link**, e a
                      razão é o que ele é: um estado, não parte do nome da
                      pessoa. Dentro do `<a>` ele virava texto clicável que
                      levava ao próprio perfil de um jeito que ninguém pediu, e
                      o leitor de tela lia o marcador colado no @nick como se
                      fosse o endereço. Apontado pelo Eduardo em 08/08/2026. */}
                  {member.handle === viewerHandle && (
                    <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                      {t('club.you')}
                    </span>
                  )}
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="text-right">
                      {member.position && (
                        <span className="block text-xs font-semibold text-primary">
                          {t(positionKey(member.position))}
                        </span>
                      )}
                      <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
                        {t(ROLE_KEY[member.role])}
                      </span>
                    </span>
                    {renderMemberActions?.(member.handle)}
                  </span>
                  </div>
                  {/* **O estado da pessoa mora numa faixa, não num ícone ao
                      lado do papel.** É o desenho que o convite pendente já
                      usa logo acima, no mesmo ecrã · duas coisas que são o
                      mesmo tipo de estado ("mandei e espero resposta") liam de
                      dois jeitos, e a do elenco lia por um glifo mudo. */}
                  {renderMemberNotice?.(member.handle)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * O nome e o @nick de uma pessoa do elenco · link quando há pra onde ir.
 *
 * **Um componente e não um ternário no meio da lista** porque as duas versões
 * precisam ter exatamente o mesmo layout: qualquer diferença de classe entre a
 * linha com link e a sem faz o elenco mudar de forma conforme a tela, e essa é
 * a divergência que ninguém vê nascer.
 *
 * O sublinhado só no hover, e não sempre: o elenco é uma grade de nomes, e seis
 * sublinhados permanentes viram ruído numa tela que já usa verde pra marcar o
 * que importa.
 */
function PlayerLine({ href, children }: { href?: string | undefined; children: ReactNode }) {
  const className = 'min-w-0 flex-1';
  if (!href) return <span className={className}>{children}</span>;

  return (
    <Link to={href} className={cn(className, 'block hover:[&_.truncate]:underline')}>
      {children}
    </Link>
  );
}

/**
 * Insígnia de papel, ao lado do nome no elenco · hoje a **coroa do dono** e o
 * **"C" do capitão**.
 *
 * **Componente e não duas marcações**, e a razão é a regra do `CLAUDE.md`:
 * quando duas peças fazem a mesma coisa de dois jeitos, o conserto é extrair,
 * não escolher uma. As duas nasceram separadas · o "C" em 30/07 e a coroa em
 * 07/08 · e sem um lugar só a próxima nasce com um terceiro tamanho, que foi
 * exatamente como apareceram três tamanhos de título em quatro páginas.
 *
 * **A palavra vive no `title` e no rótulo acessível**, nunca desenhada: o
 * elenco é grade de três colunas no desktop, e texto ao lado do nome espreme
 * quem tem nome comprido. A coluna do papel continua dizendo por extenso.
 *
 * **O tratamento é verde suave com o glifo em verde**, escolhido pelo Eduardo
 * em 07/08/2026 · o "C" era verde sólido com a letra escura, e a comparação
 * lado a lado com a coroa mostrou que o sólido pesa demais pra uma insígnia que
 * fica ao lado do nome em toda linha do elenco. Padronizar era o ponto: duas
 * insígnias com dois pesos leem como duas categorias de coisa.
 */
function RoleBadge({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold leading-none text-primary"
    >
      {children}
    </span>
  );
}

