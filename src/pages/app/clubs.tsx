import { Plus, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ClubCard } from '@/components/club/club-card';
import { ClubCardSkeletonGrid } from '@/components/club/club-card-skeleton';
import { ClubDiscovery } from '@/components/club/club-discovery';
import { MyInvites } from '@/components/club/my-invites';
import { ManagerOffers } from '@/components/club/manager-offers';
import { OwnershipOffers } from '@/components/club/ownership-offers';
import { SectionTitle } from '@/components/ui/section-title';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { PageStack } from '@/components/ui/page-stack';
import { Hint } from '@/components/ui/tooltip';
import { useFavoriteClub } from '@/components/club/favorite-club';
import { MAX_CLUBS_PER_PLAYER } from '@/lib/clubs';
import { useMyClubs } from '@/lib/use-my-clubs';
import { useAuth } from '@/lib/use-auth';
import { useDocumentTitle } from '@/lib/use-document-title';

/**
 * O CTA de criar club, e o que ele vira quando não há vaga.
 *
 * **O motivo mora no botão, não num parágrafo solto acima dele.** A frase do
 * teto vivia entre o cabeçalho e a primeira seção, com a cor e o tamanho de
 * legenda de página · lia como um segundo subtítulo e repetia o que a dica de
 * "Meus clubs" já diz logo abaixo. Ela é **estática** (o `{{count}}` vem de uma
 * constante), então a repetição nunca teve nem o argumento de estar mostrando
 * outra coisa.
 *
 * **A dica pendura num invólucro, e não no botão.** Botão desabilitado carrega
 * `pointer-events-none`, então ele não recebe hover nem toque · pendurada nele,
 * a explicação só existiria pra quem navega por teclado. É a armadilha clássica
 * de dica em controle desligado.
 */
function CreateClubAction({
  atLimit,
  ledName,
}: {
  atLimit: boolean;
  /**
   * O nome do club de que a pessoa já é dona, ou `null` · **é ele que decide
   * qual dos dois tetos a dica explica.**
   *
   * O de posse vem primeiro porque é o mais específico e o único que sempre
   * vale pra quem já tem um club: dizer "saia de um dos seus clubs" a quem é
   * dono de um e membro de dois é verdade que não resolve, porque sair de um
   * club onde ele é só membro não devolve a vaga de dono.
   */
  ledName: string | null;
}) {
  const { t } = useTranslation();
  const blocked = ledName !== null || atLimit;

  const button = (
    <Button asChild variant="cta" size="sm" disabled={blocked}>
      <Link to="/app/clubs/novo">
        <Plus className="mr-1.5 h-4 w-4" />
        {t('club.create')}
      </Link>
    </Button>
  );

  if (!blocked) return button;

  return (
    <Hint
      label={
        ledName !== null
          ? t('club.ownerBlockedBody', { clubName: ledName })
          : t('club.limitReached', { count: MAX_CLUBS_PER_PLAYER })
      }
    >
      <span className="inline-flex">{button}</span>
    </Hint>
  );
}

/** A vaga tracejada · a mesma casca nos dois destinos, pra elas não divergirem. */
const SLOT_CLASS =
  'group flex h-full min-h-[6.5rem] items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground';

export function ClubsPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('nav.clubs'));
  // A plataforma de quem olha sai da sessão · é o que faz o selo de plataforma
  // dizer se dá pra jogar junto, nas **duas** listas desta tela.
  const { account } = useAuth();

  /**
   * **A lista é dado de sessão, e sai do provider** · esta tela a mostra, mas
   * não é dona dela: o teto na de criar club, o aviso na da conta, o favorito
   * na do club e o selo "em comum" na de um jogador saem do mesmo documento.
   *
   * **Isso levou junto a assinatura que vivia aqui**, e o comentário dela vale
   * inteiro, um nível acima · o que muda esta lista vem de fora dela (alguém te
   * convidou, o convite foi retirado, você entrou ou saiu, te ofereceram um
   * club, o club acabou), tudo publica `user.membership` na sua caixa, e agora
   * quem escuta é o `MyClubsProvider`, uma vez, em nome das cinco telas.
   *
   * **A vitrine embaixo continua NÃO ouvindo, de propósito** · lista de
   * descoberta que se reordena sozinha embaixo do dedo é o oposto de útil, e a
   * decisão está na varredura do `docs/produto.md`. O que anda aqui é o que é
   * **seu**, e é o que veio pro provider.
   */
  const {
    clubs,
    status: clubsStatus,
    atCap: atLimit,
    ledClub,
    reload: reloadMyClubs,
  } = useMyClubs();
  // Favoritar grava e o resultado é a lista de novo · quem recarrega é o dono
  // do dado, não esta tela.
  const favorite = useFavoriteClub(reloadMyClubs);
  const failed = clubsStatus === 'error';

  const mine = clubs ?? [];
  const myClubTags = new Set(mine.map((c) => c.tag));
  // Descobrir o próprio club não descobre nada · a vitrine recebe a lista do
  // que já é seu e some com esses.
  const hasFavorite = mine.some((c) => c.isPrimary);
  const ledName = ledClub?.name ?? null;
  // Uma vaga por lugar que sobra até o teto do jogo.
  const freeSlots = Array.from({ length: Math.max(0, MAX_CLUBS_PER_PLAYER - mine.length) }, (_, i) => i);

  return (
    // **Sem largura máxima na página.** Chegou a ter, pra o card horizontal não
    // esticar até 1232px · só que isso desalinhava o CTA do cabeçalho em
    // relação ao header do app, e alinhamento de borda é mais visível que
    // largura de card. Quem resolve o esticão é a grade (três colunas a partir
    // de `xl`), não um teto na página.
    //
    // O vão entre as seções não é escolha desta tela · ver `PageStack`. Ela era
    // a única do produto em `space-y-10`, e os 40px custavam metade dos cards
    // da vitrine acima da dobra.
    <PageStack>
      {favorite.dialog}
      {/* A tela é Clubs, e a lista pessoal é uma seção dentro dela · não o
          nome do lugar. Batizar a tela pela primeira seção fecha a porta pra
          vitrine, busca e convite parecerem pertencer ali. */}
      <PageHeader
        title={t('nav.clubs')}
        subtitle={t('club.pageSubtitle')}
        action={
          mine.length > 0 ? (
            // **O motivo mora no botão, não num parágrafo solto acima dele.**
            // A frase do teto vivia entre o cabeçalho e a primeira seção, com a
            // cor e o tamanho de legenda de página · lia como um segundo
            // subtítulo, e repetia o que a dica de "Meus clubs" já diz logo
            // abaixo. Ela é **estática** (o `{{count}}` vem de uma constante),
            // então a repetição nunca teve nem o argumento de estar mostrando
            // outra coisa. Botão desligado diz por que está desligado, e é aí
            // que a informação é útil.
            <CreateClubAction atLimit={atLimit} ledName={ledName} />
          ) : undefined
        }
      />
      {failed && <p className="text-sm text-destructive">{t('common.errorGeneric')}</p>}
      {/* Silhueta da seção que vem, e não um spinner · a tela já sabe o formato
          do que está buscando. São três porque três é o teto do jogo: o que
          aparece aqui é do tamanho do que vai ficar, então nada salta quando os
          cards chegam. */}
      {!clubs && !failed && (
        <section role="status" aria-live="polite" aria-label={t('common.loading')}>
          <SectionTitle>{t('club.mine')}</SectionTitle>
          <ClubCardSkeletonGrid count={MAX_CLUBS_PER_PLAYER} />
        </section>
      )}

      {clubs?.length === 0 && (
        <EmptyState
          icon={Shield}
          tone="brand"
          size="sm"
          title={t('club.mineEmptyTitle')}
          description={t('club.mineEmptyBody')}
          action={{ label: t('club.create'), to: '/app/clubs/novo' }}
        />
      )}

      {/* **Antes de "meus clubs", de propósito.** O convite é o único item
          desta tela que espera resposta de quem está olhando · e é a única
          forma de ele ser encontrado, já que não existe aviso ainda. Some
          quando não há nenhum. */}
      {/* Acima do convite: quem está te passando um club inteiro espera mais
          que quem está te chamando pra entrar num. */}
      <OwnershipOffers onAccepted={reloadMyClubs} />
      {/* **Depois da posse e antes do convite de entrada** · a ordem é por peso
          do que se aceita: pôr o club no seu nome, assumir um cargo nele, e
          entrar no elenco. */}
      <ManagerOffers onAccepted={reloadMyClubs} />

      <MyInvites onAccepted={reloadMyClubs} />

      {mine.length > 0 && (
        <section>
          {/* **Sem dica aqui.** Ela dizia "você pode estar em até 3 clubs, como
              no EA FC 26" e era a **segunda** frase explicativa do topo, 72px
              abaixo do subtítulo da página, na mesma cor e no mesmo tamanho ·
              dois subtítulos empilhados, que é o que fazia o começo da tela
              parecer solto.

              A regra continua dita, e por peças que não custam uma linha de
              texto: as **vagas tracejadas** mostram quanto cabe (dois cards e
              um contorno vazio se explicam sozinhos) e o botão desabilitado diz
              o porquê quando não cabe mais. */}
          <SectionTitle>{t('club.mine')}</SectionTitle>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {mine.map((club) => (
              <li key={club._id}>
                <ClubCard
                  tag={club.tag}
                  name={club.name}
                  crestUrl={club.crestUrl}
                  platform={club.platform}
                  memberCount={club.memberCount}
                  role={club.role}
                  isPrimary={club.isPrimary}
                  viewerPlatform={account?.platform ?? null}
                  onFavorite={() => favorite.ask(club, hasFavorite)}
                />
              </li>
            ))}
            {/* As vagas vazias não são enfeite: o EA FC 26 deixa a pessoa em
                até três clubs, e sem elas a tela não conta que existe espaço
                sobrando. Um card cheio ao lado de dois contornos tracejados diz
                "cabe mais" sem precisar de uma frase explicando. */}
            {/* **O destino depende de quem pode criar**, e isto foi defeito de
                verdade por algumas horas: com o teto de posse, o botão do
                cabeçalho ficou desligado e **esta vaga continuou levando pra
                mesma tela**, que agora recusa. É o "por quantos caminhos se
                chega ali" · consertar o botão e deixar a porta ao lado aberta
                não conserta nada.

                Quem já é dono preenche vaga **entrando** num club dos outros, e
                a vitrine está logo abaixo · então é pra lá que a vaga aponta, e
                a palavra muda junto. */}
            {freeSlots.map((i) => (
              <li key={`vaga-${i}`}>
                {/* **Âncora nativa e não `Link` quando o destino é esta mesma
                    página** · o `Link` do router troca a rota e não rola, então
                    clicar não faria nada visível. Quem sai da tela continua
                    sendo `Link`. */}
                {ledName === null ? (
                  <Link to="/app/clubs/novo" className={SLOT_CLASS}>
                    <Plus className="h-4 w-4 transition-colors group-hover:text-primary" />
                    {t('club.slotEmpty')}
                  </Link>
                ) : (
                  <a href="#descobrir" className={SLOT_CLASS}>
                    <Plus className="h-4 w-4 transition-colors group-hover:text-primary" />
                    {t('club.slotJoin')}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {clubs !== null && <ClubDiscovery hide={myClubTags} />}
    </PageStack>
  );
}
