import { type PlayerClub, type Platform, type PublicProfileView } from '@ggclubs/schemas';
import { Crown, Search, Shield, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BrandWatermark } from '@/components/brand';
import { Badge } from '@/components/ui/badge';
import { ClubCrest } from '@/components/club/club-crest';
import { CrossplayBadge } from '@/components/club/crossplay-badge';
import { InfoTip } from '@/components/ui/tooltip';
import { StatStrip } from '@/components/ui/stat-strip';
import { PlatformMark } from '@/components/club/platform-mark';
import { PlayerIdentity } from '@/components/player/player-identity';
import { SectionTitle } from '@/components/ui/section-title';
import { PAGE_STACK_GAP } from '@/components/ui/page-stack';
import { MAX_CLUBS_PER_PLAYER, ROLE_KEY } from '@/lib/clubs';
import { cn } from '@/lib/utils';

/**
 * O conteúdo da página de um player · identidade e onde ele joga.
 *
 * **Uma versão só, duas molduras**, como o `ClubView` desde 03/08. Quem chegou
 * pelo link vê na moldura pública, com convite pra criar conta; quem tem sessão
 * vê a mesma coisa dentro do app, com a navegação em volta. Nasceu assim de
 * propósito: a página do club levou uma rodada inteira pra descobrir que duas
 * cópias divergem sem ninguém decidir nada, e não há razão pra repetir o
 * caminho.
 *
 * **O destino dos links vem de fora** (`clubHref`), e não de um `if` aqui
 * dentro. Quem sabe em que espaço de endereços a tela está é a página, e é a
 * mesma decisão que o `guestGoesTo` e o `publicTwinOf` já tomam: declarar, nunca
 * inferir. As funções moram em `lib/paths.ts`.
 */
export function PlayerView({
  profile,
  clubHref,
  action,
  identityNotice,
  variant = 'page',
  viewerPlatform,
  viewerClubTags,
}: {
  profile: PublicProfileView;
  /** Pra onde cada club aponta · `/club/:tag` fora do app, `/app/clubs/:tag` dentro. */
  clubHref: (tag: string) => string;
  /**
   * Ação de quem olha · convidar pro meu club, ou editar quando o perfil é o
   * seu. Quem decide qual é a página, como no `ClubView`.
   */
  action?: React.ReactNode;
  /** Entra abaixo da identidade · hoje o selo de "este é você". */
  identityNotice?: React.ReactNode;
  /**
   * `page` é a pública, dona da largura da janela: a capa sangra de borda a
   * borda. `embedded` é dentro do app, onde já existe container em volta e a
   * capa vira cartão. Mesmo par do `ClubView`, e pela mesma razão · peça filha
   * não desfaz o layout do pai na mão.
   */
  variant?: 'page' | 'embedded';
  /**
   * A plataforma de **quem está olhando** · é ela que faz o selo de crossplay
   * responder em vez de só informar a geração. A página pública não passa (não
   * há sessão), e aí ele volta a ser neutro · mesmo desenho do `ClubView`.
   */
  viewerPlatform?: Platform | null | undefined;
  /**
   * As tags dos clubs de **quem está olhando** · é o que permite marcar, na
   * própria linha, o club que os dois dividem.
   *
   * **Vem por tag e não por id** porque a lista de clubs de um perfil é dado
   * aberto e não carrega id interno · é a mesma regra da escalação pública.
   *
   * A página pública não passa (não há sessão) e o próprio perfil também não ·
   * ali todo club seria "com você" e o selo deixaria de informar.
   */
  viewerClubTags?: ReadonlySet<string>;
}) {
  const { t, i18n } = useTranslation();
  const embedded = variant === 'embedded';

  return (
    <div className={embedded ? PAGE_STACK_GAP : undefined}>
      <section
        // **O alvo do menu de contexto do app**, na capa inteira · o
        // `resolveTarget` procura este atributo, e ele só existia na linha do
        // elenco. A página do player nasceu depois do menu.
        data-player-handle={profile.handle}
        className={cn(
          'relative overflow-hidden py-8 sm:py-12',
          embedded ? 'rounded-2xl border' : 'border-b',
        )}
      >
        <BrandWatermark />
        <div className={cn('relative', embedded ? 'px-5 sm:px-8' : 'container')}>
          {/* As duas medidas vêm da capa do club, e as duas foram medidas lá:
              `flex-1` a partir de `sm` dá ao nome uma largura pra respeitar, e
              `w-full` abaixo disso é o que impede a coluna de encolher até o
              nome virar duas letras quando houver algo ao lado. */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex w-full min-w-0 flex-col items-start gap-3 sm:w-auto sm:flex-1">
              <PlayerIdentity
                className="w-full"
                displayName={profile.displayName}
                handle={profile.handle}
                avatarUrl={profile.avatarUrl}
                position={profile.position}
              />
              {/* **O selo de procurando club fica na identidade**, e não numa
                  seção lá embaixo · ele é o que muda o que o visitante faz com
                  a página, e informação que muda ação não pode estar abaixo da
                  dobra. É o mesmo lugar do selo de vínculo na página do club. */}
              {profile.lookingForClub && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                  <Search className="h-3.5 w-3.5" aria-hidden />
                  {t('player.lookingForClub')}
                </span>
              )}
              {identityNotice}
            </div>
            {action}
          </div>

          {/* A frase é a única coisa da página que a pessoa escreve com as
              próprias palavras · sem ela o perfil é uma ficha de seletores. */}
          {profile.bio && (
            <p className="mt-5 max-w-2xl text-base text-foreground">{profile.bio}</p>
          )}
        </div>
      </section>

      <div className={cn(PAGE_STACK_GAP, embedded ? '' : 'container pt-6 pb-8 sm:pb-10')}>
        {/* **A faixa de números responde se dá pra confiar**, que é a segunda
            pergunta de quem abre o perfil de um estranho · a primeira é quem a
            pessoa é, e a capa responde. Sem ela a página era só identidade, e
            identidade sem contexto é ficha de cadastro.

            Os três são o que o produto **tem hoje** e não inventa: quantos
            clubs (com o teto, que é regra do jogo), a geração de crossplay (que
            responde *dá pra jogar comigo*) e desde quando a pessoa está aqui. */}
        <StatStrip
          items={[
            {
              label: t('player.statClubs'),
              value: `${profile.clubs.length}/${MAX_CLUBS_PER_PLAYER}`,
            },
            {
              label: t('player.statPlatform'),
              // **O mesmo `CrossplayBadge` da página do club** · aqui a geração
              // era desenhada à mão, num selo cinza que só dizia o nome dela ·
              // a mesma faixa com dois desenhos, e só um respondia *dá pra jogar
              // comigo*. Com a plataforma de quem olha ele responde nas duas.
              value: profile.platform ? (
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <PlatformMark platform={profile.platform} withLabel />
                  <CrossplayBadge platform={profile.platform} viewerPlatform={viewerPlatform} />
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
            },
            {
              label: t('player.statSince'),
              // Dia exato e com a dica ao lado, como na página do club · a
              // faixa era a mesma peça e só uma das duas explicava o número.
              value: (
                <span className="inline-flex items-center gap-1.5">
                  {new Date(profile.createdAt).toLocaleDateString(i18n.language, {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                  <InfoTip label={t('player.statSinceHint')} />
                </span>
              ),
            },
          ]}
        />

        <section>
          <SectionTitle>{t('player.clubs')}</SectionTitle>
          {profile.clubs.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              {t('player.clubsEmpty')}
            </p>
          ) : (
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {profile.clubs.map((club) => (
                <li key={club.tag}>
                  <ClubLine
                    club={club}
                    href={clubHref(club.tag)}
                    shared={viewerClubTags?.has(club.tag) ?? false}
                  />
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
 * Uma linha da lista de clubs · **o card inteiro é o link**.
 *
 * Dá pra fazer porque aqui não há ação dentro do card, ao contrário do elenco,
 * onde quem gerencia recebe botões por linha · botão dentro de link é o par que
 * o navegador resolve de um jeito e o teclado de outro. Se um dia entrar ação
 * aqui, o link volta a ser só o nome.
 */
function ClubLine({ club, href, shared }: { club: PlayerClub; href: string; shared: boolean }) {
  const { t } = useTranslation();

  return (
    // **`h-full` porque selo desce de linha nas larguras estreitas**, e sem ele
    // o card que tem selo fica mais alto que os irmãos · a fileira desalinha e
    // lê como erro. Achado pelo Eduardo em 08/08/2026, numa captura onde o card
    // do club principal era o único torto · hoje quem pode descer é o selo de
    // club em comum, e o motivo de manter a linha é o mesmo.
    <Link
      to={href}
      className="flex h-full items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
    >
      <ClubCrest tag={club.tag} crestUrl={club.crestUrl} className="h-10 w-10 text-sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {/* **Nome de identidade quebra, não corta** · o `line-clamp` continua
              cortando o caso absurdo, mas só depois de usar o espaço que existe.
              Medido a 320px: com o selo dividindo esta linha, um nome de duas
              palavras curtas perdia a segunda pras reticências enquanto sobrava
              folga no card · e reticências escondem justamente o que identifica
              o club. */}
          <span className="line-clamp-2 min-w-0 break-words font-semibold">{club.name}</span>
          {/* **O favorito é uma estrela ao lado do nome, e isso não é escolha
              nova: é o card de club desde 09/08/2026**, onde o selo escrito
              comia largura e truncava justamente o nome. Esta linha era a cópia
              que não recebeu o recado · com o selo de club em comum ao lado,
              a palavra passou a custar uma terceira linha a 390.

              O glifo carrega a frase inteira no `title` e no rótulo acessível,
              como a braçadeira de capitão logo ao lado · **e é `title`, não a
              dica interativa do produto**, porque o card inteiro é um link e
              gatilho de dica é um `button`. */}
          {club.isPrimary && (
            // A frase mora no invólucro, e não no ícone · o `title` de um `svg`
            // do lucide não é prop aceita, e um `<title>` dentro dele não
            // aparece como dica em todo navegador.
            <span
              title={t('player.primaryClubHint')}
              aria-label={t('player.primaryClubHint')}
              className="inline-flex shrink-0"
            >
              <Star className="h-3.5 w-3.5 fill-current text-primary" aria-hidden />
            </span>
          )}
        </span>
        {/* **A segunda linha é da relação de quem olha**, e só dela · a tag
            identifica o club e o selo diz que ele é de vocês dois. O que é da
            outra pessoa (o favorito dela) subiu pra estrela ao lado do nome. */}
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs uppercase tracking-widest text-muted-foreground">
          {club.tag}
          {/* **O club em comum se marca na linha dele, e não no topo da
              página** · com o teto de três clubs a lista é curta, e um selo
              global afirmaria que os dois jogam juntos deixando a pessoa caçar
              em qual. Pendência 72, pedida pelo Eduardo em 09/08/2026 olhando o
              perfil de alguém do mesmo club.

              **Escudo e verde cheio, iguais aos da vitrine** · quem viu o selo
              no card e clicou tem que reencontrar o mesmo sinal aqui, senão são
              duas telas dizendo a mesma coisa de dois jeitos. */}
          {shared && (
            <Badge variant="success" size="sm" icon={Shield}>
              {t('player.sharedClubHere')}
            </Badge>
          )}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-right">
        {/* A braçadeira aparece **junto** do papel, nunca no lugar dele · o
            capitão pode ser gerente, e como valor de papel um apagaria o outro.
            Mesma regra do elenco. */}
        {club.isCaptain && (
          <span
            title={t('club.roleCaptain')}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary"
          >
            C
          </span>
        )}
        {club.role === 'owner' && <Crown className="h-3.5 w-3.5 text-primary" aria-hidden />}
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {t(ROLE_KEY[club.role])}
        </span>
      </span>
    </Link>
  );
}
