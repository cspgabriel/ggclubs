import {
  crossplayPool,
  playerPosition,
  type CrossplayPool,
  type PlayerPosition,
} from '@ggclubs/schemas';
import { Search, Shield, UserX } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PlatformMark } from '@/components/club/platform-mark';
import { PositionMark } from '@/components/player/position-mark';
import { ShowcaseList } from '@/components/showcase-list';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { PageStack } from '@/components/ui/page-stack';
import { SearchField } from '@/components/ui/search-field';
import { SelectField } from '@/components/ui/select-field';
import { SkeletonBar, SkeletonGroup } from '@/components/ui/skeleton';
import { api, type PlayerCard } from '@/lib/api';
import { POOL_KEY } from '@/lib/clubs';
import { appPlayerPath } from '@/lib/paths';
import { positionKey } from '@/lib/position';
import { useAuth } from '@/lib/use-auth';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useShowcase } from '@/lib/use-showcase';
import { cn } from '@/lib/utils';

/**
 * A vitrine de players · a aba que faltava no produto.
 *
 * **O produto tinha diretório de clubs e não tinha diretório de gente**, o que
 * é estranho numa rede social de Pro Clubs: dava pra achar um time e não dava
 * pra achar alguém pra jogar. A busca de player existia desde 04/08 e vivia
 * **escondida dentro do campo de convite** de um club · quem não gerenciasse
 * club nenhum não tinha como procurar ninguém.
 *
 * **É a mesma consulta da busca, com o termo opcional** · sem `q` ela lista
 * (quem procura club primeiro), com `q` ela busca. Duas telas seriam duas
 * listas capazes de discordar sobre quem aparece.
 */
export function PlayersPage() {
  const { t } = useTranslation();
  const { account } = useAuth();
  useDocumentTitle(t('player.directoryTitle'));

  const [term, setTerm] = useState('');
  const [position, setPosition] = useState<PlayerPosition | ''>('');
  const [pool, setPool] = useState<CrossplayPool | ''>('');
  const [onlyLooking, setOnlyLooking] = useState(false);
  /**
   * **Só quem está num club seu** · pedido do Eduardo em 10/08/2026.
   *
   * É o par do selo verde que o card já mostra: a tela sabia dizer *este divide
   * club com você* e não sabia **listar só eles**. Quem responde é o servidor,
   * porque a página vem por cursor · filtrar no front tiraria card de uma página
   * já contada e furaria a paginação, que é o defeito que a vitrine de clubs já
   * teve uma vez.
   */
  const [onlyShared, setOnlyShared] = useState(false);

  const load = useCallback(
    async (args: { q?: string; cursor?: string }, init?: RequestInit) => {
      const r = await api.listPlayers(
        {
          ...args,
          ...(position ? { position } : {}),
          ...(pool ? { pool } : {}),
          ...(onlyLooking ? { lookingForClub: true } : {}),
          ...(onlyShared ? { sharedClub: true } : {}),
        },
        init,
      );
      return { items: r.players, cursor: r.cursor };
    },
    [position, pool, onlyLooking, onlyShared],
  );

  const {
    items: players,
    cursor,
    pending,
    failed,
    refresh,
    loadingMore,
    sentinel,
    loadMore,
  } = useShowcase<PlayerCard>({
    term,
    // Trocar de filtro refaz a primeira página · o hook não conhece os filtros
    // desta tela de propósito, então quem diz que eles mudaram é a chave.
    filterKey: `${position}|${pool}|${onlyLooking}|${onlyShared}`,
    load,
  });
  return (
    <PageStack>
      <PageHeader title={t('player.directoryTitle')} subtitle={t('player.directorySubtitle')} />

      <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label htmlFor="player-search">{t('player.searchLabel')}</Label>
            <SearchField
              id="player-search"
              value={term}
              onChange={setTerm}
              placeholder={t('player.searchPlaceholder')}
              label={t('player.searchLabel')}
              inputClassName="h-11"
            />
          </div>

          <Filter
            id="player-position"
            label={t('player.filterPosition')}
            value={position}
            onChange={(v) => setPosition(v as PlayerPosition | '')}
            // A lista sai do enum, nunca escrita à mão · posição nova entra aqui
            // sozinha, e o teste que trava enum e catálogo junto cuida do resto.
            options={playerPosition.options.map((p) => ({ value: p, label: t(positionKey(p)) }))}
            allLabel={t('player.filterAll')}
          />

          {/* **Geração, e não plataforma** · no Clubs do EA FC só joga junto
              quem está na mesma geração, então filtrar por PS5 esconderia o
              Xbox Series que **pode** entrar no seu club. Decisão do Eduardo em
              08/08/2026, e ele está certo: o filtro estava trabalhando contra a
              pergunta que a tela responde. */}
          <Filter
            id="player-pool"
            label={t('player.filterPool')}
            value={pool}
            onChange={(v) => setPool(v as CrossplayPool | '')}
            options={crossplayPool.options.map((value) => ({
              value,
              label: t(POOL_KEY[value]),
            }))}
            allLabel={t('player.filterAll')}
          />
        </div>

        {/* **Os filtros que dão função à tela ficam soltos e visíveis**, e não
            escondidos num seletor · procurar quem está disponível é a pergunta
            que traz alguém aqui, e filtro que precisa ser encontrado não é
            usado. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyLooking}
              onChange={(e) => setOnlyLooking(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            {t('player.filterLooking')}
          </label>

          {/* **A chave do club em comum** · quem responde é o servidor, com os
              clubs de quem pediu saindo do token.

              **Ela aparece pra todo mundo, inclusive pra quem não está em club
              nenhum**, e a escolha é medida: esconder exigiria uma consulta a
              mais só pra saber se desenha um controle, e a tela já paga uma. O
              que segura o caso é o **vazio**, que diz o que a chave faz e como
              sair dela · é a regra de botão desligado dizer por quê, cumprida
              no único lugar que consegue dizer a verdade nos dois casos. */}
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyShared}
              onChange={(e) => setOnlyShared(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            {t('player.filterShared')}
          </label>
        </div>
      </section>

      {failed && players === null ? (
        /* **Falha não é ausência, e ela vem ANTES da silhueta** · pendência 170.
           Sem isto a API fora do ar dizia que o produto não tem player nenhum ·
           e com a ordem trocada este ramo ficava inalcançável, porque a lista
           também é `null` na falha. */
        <EmptyState
          icon={UserX}
          title={t('player.directoryFailed')}
          action={{ onClick: refresh, label: t('common.retry') }}
        />
      ) : players === null ? (
        // **A silhueta repete a geometria do card**, e não um retângulo genérico
        // · avatar redondo, duas linhas de identidade e a linha de rodapé. É a
        // mesma peça que a página seguinte usa, pelo mesmo motivo do
        // `ClubCardSkeletonGrid`: uma silhueta por lugar diverge no segundo uso.
        <SkeletonGroup className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <PlayerRowSkeleton key={i} />
          ))}
        </SkeletonGroup>
      ) : players.length === 0 ? (
        <EmptyState
          icon={UserX}
          title={t('player.directoryEmpty')}
          // **O vazio da chave de club em comum é outro**, e é ele que carrega o
          // caso de quem não está em club nenhum · ali "tire um filtro" não
          // explica nada, e a frase certa diz o que a chave faz.
          description={t(onlyShared ? 'player.filterSharedEmpty' : 'player.directoryEmptyHint')}
        />
      ) : (
        <div className="space-y-3">
          <ShowcaseList
            items={players}
            keyOf={(player) => player.handle}
            renderItem={(player) => (
              <PlayerRow player={player} isMe={player.handle === account?.handle} />
            )}
            pending={pending}
            loadingMore={loadingMore}
            cursor={cursor}
            sentinel={sentinel}
            onLoadMore={loadMore}
            nextPageSkeleton={
              <SkeletonGroup className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <PlayerRowSkeleton key={i} />
                ))}
              </SkeletonGroup>
            }
            loadMoreLabel={t('player.directoryMore')}
          />
        </div>
      )}
    </PageStack>
  );
}

function Filter({
  id,
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <SelectField
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        options={options}
        allLabel={allLabel}
      />
    </div>
  );
}

/**
 * A silhueta de um card · **uma só, usada na primeira carga e na paginação**.
 *
 * A geometria é a de verdade: avatar redondo à esquerda, nome e @nick, e a linha
 * de rodapé com plataforma e clubs. Silhueta que não repete a forma troca o
 * vazio por um salto de layout, que é o defeito que ela existe pra evitar.
 */
function PlayerRowSkeleton() {
  return (
    <span className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <SkeletonBar className="h-12 w-12 shrink-0 rounded-full" />
      <span className="min-w-0 flex-1 space-y-2">
        <SkeletonBar className="h-4 w-2/3" />
        <SkeletonBar className="h-3 w-1/2 bg-secondary/70" />
        <SkeletonBar className="h-3 w-1/3 bg-secondary/70" />
      </span>
    </span>
  );
}

/**
 * Uma pessoa na vitrine · o card inteiro é link, porque não há ação dentro dele.
 *
 * **Você não aparece na própria vitrine, e aparece na busca** · decisão do
 * Eduardo em 08/08/2026, pedida no servidor (`filter._id = { $ne: viewerId }`,
 * só no ramo sem termo). Ela reverteu o desenho anterior, que marcava quem
 * estava olhando em vez de escondê-lo.
 *
 * **Por isso o `isMe` continua existindo:** com termo você volta, porque sumir
 * de um resultado pedido nominalmente é a tela contradizendo o que foi digitado
 * · e aí o card é o seu e diz isso.
 */
function PlayerRow({ player, isMe }: { player: PlayerCard; isMe: boolean }) {
  const { t } = useTranslation();

  return (
    <Link
      to={appPlayerPath(player.handle)}
      // **O alvo do menu de contexto do app** · o `resolveTarget` procura este
      // atributo, e ele só existia na linha do elenco. A vitrine nasceu depois
      // do menu, então o clique direito aqui caía em "nada aqui" · é o mesmo
      // descuido de sempre, a superfície nova não recebendo o recado.
      data-player-handle={player.handle}
      className={cn(
        'flex h-full items-center gap-3 rounded-xl border bg-card p-4 transition-colors',
        'hover:border-primary/50 hover:bg-primary/5',
        // O mesmo tratamento do card de quem está olhando no elenco · anel
        // discreto, não cor diferente.
        isMe && 'border-primary/50 bg-primary/5',
      )}
    >
      <Avatar name={player.displayName} src={player.avatarUrl} className="h-12 w-12 text-base" />
      <span className="min-w-0 flex-1">
        {/* **O nome divide a linha só com a posição.** O selo de "você" morava
            aqui e empurrava as duas coisas que importam · e ele é redundante,
            porque a borda e o fundo verdes do card já dizem que aquele é o seu.
            Ele desceu pro rodapé, onde é confirmação e não interrupção.
            Apontado pelo Eduardo em 08/08/2026. */}
        <span className="flex items-center gap-1.5">
          <span className="truncate font-semibold">{player.displayName}</span>
          {/* **A posição ganhou caixa em 10/08/2026, a pedido do Eduardo** · como
              texto solto ela perdia até pro `@nick` da linha de baixo, que tem
              selo. O `PositionMark` é a mesma peça da capa do perfil, pra as duas
              telas não voltarem a desenhar isto de dois jeitos.
              **`shrink-0` continua**, e aqui ele é o que faz o nome truncar antes
              da sigla · a posição são três letras e o nome é o que sobra. */}
          {player.position && <PositionMark position={player.position} className="shrink-0" />}
        </span>
        <span className="block truncate text-xs text-muted-foreground">@{player.handle}</span>
        {/* Duas linhas, e não uma · com uma, quase toda frase morria no meio da
            primeira palavra útil. A frase é o que distingue uma pessoa da outra
            numa grade de avatares iguais, e cortá-la cedo demais devolve a
            grade ao anonimato. */}
        {player.bio && (
          <span className="mt-1 line-clamp-2 text-xs text-foreground/80">{player.bio}</span>
        )}
        {/* **O rodapé é onde os selos moram**, e a razão é largura: enquanto o
            de "procurando club" ficava no fim da linha como `shrink-0`, ele
            **reservava espaço em todo card** · inclusive nos de quem não está
            procurando, espremendo nome e frase numa grade de três colunas. */}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          {/* **Um selo verde por card, e ele é o da pergunta que a tela
              responde.** O verde é a marca e o `primary`, então gastá-lo em
              três coisas ao mesmo tempo não destaca nenhuma · está no
              `design.md` e eu furei na primeira versão desta linha. */}
          {/* **`hasRoom` junto, e não só a chave.** Quem está no teto de 3 clubs
              não pode entrar em mais nenhum, então anunciar que procura club é
              a tela afirmando uma coisa que o backend recusa · a pessoa marcou
              a chave e encheu as vagas depois, e ninguém desmarcou por ela.
              Apontado pelo Eduardo em 08/08/2026.
              **Isto conserta o que a tela mostra, e não a ordem nem o filtro** ·
              esses dois continuam tratando quem está no teto como disponível,
              e o porquê de não ter sido resolvido aqui está na pendência 63. */}
          {/* **Lupa, e não radar** · radar não é convenção de procura, e o
              Eduardo não entendeu o desenho. Lupa é o símbolo universal de
              busca, e aqui a pessoa está se oferecendo pra ser achada. */}
          {player.lookingForClub && player.hasRoom && (
            <Badge variant="success" size="sm" icon={Search}>
              {t('player.lookingForClubShort')}
            </Badge>
          )}
          {/* **Marca a exceção, não a regra.** A comparação de geração vem
              pronta do servidor, mas desenhá-la quando ela **combina** põe um
              selo em quase todo card · a geração atual é a maioria da base, e
              selo que aparece em todo mundo ao mesmo tempo deixa de informar.
              Foi o que a captura mostrou em 08/08/2026, e é o mesmo defeito do
              selo `!` da escalação.
              Quem **não** joga com você é raro e é o que muda a decisão · esse
              avisa, em tom neutro, porque é ressalva e não conquista. */}
          {/* **Dividir club é o sinal social mais forte da tela**, então ele
              ganha o destaque · numa grade de estranhos, descobrir que a pessoa
              é do seu elenco muda o que você faz com o card mais do que
              qualquer outra coisa.
              **O nome dos clubs vai no `title`**, e não só a contagem: dividir
              dois clubs com alguém é diferente de dividir um, e a pessoa quer
              saber **quais**. Isto é a metade acessível da pendência 65 · o
              desenho de tooltip de verdade (que precisa funcionar no toque)
              está lá. */}
          {/* **Escudo, porque escudo é club neste produto** · é o símbolo do
              card, da navegação e do próprio `ClubCrest`. Aperto de mão era
              desenho bonito e sem significado firmado aqui. */}
          {/* **Menos no seu próprio card**, e é a mesma regra que o perfil já
              cumpre não recebendo os seus clubs (`viewerClubTags`): ali todo
              club bate por definição, e marcar tudo não informa nada. Aqui o
              card só aparece **na busca**, porque você não entra na própria
              vitrine · foi por isso que a regra chegou a esta cópia depois. */}
          {!isMe && player.sharedClubs.length > 0 && (
            <Badge
              variant="success"
              size="sm"
              icon={Shield}
              title={player.sharedClubs.map((club) => club.name).join(' · ')}
            >
              {player.sharedClubs.length === 1
                ? (player.sharedClubs[0]?.name ?? '')
                : t('player.sharedClubs', { count: player.sharedClubs.length })}
            </Badge>
          )}
          {/* A borda e o fundo verdes do card já dizem que este é o seu · aqui é
              confirmação, e confirmação não compete com o resto. */}
          {isMe && <Badge size="sm">{t('club.you')}</Badge>}
          {/* **Fato vira badge também**, e é a unificação de forma que o Eduardo
              pediu · a linha tinha cinco coisas de três naturezas com pesos
              visuais decididos por acidente. Hoje a **forma** é uma e os
              **tons** são três: destaque pro que a tela responde, neutro pro
              fato, e o mesmo neutro pra ressalva com o porquê no `title`. */}
          {/* **O glifo entra sem a caixa própria dele** · o `PlatformMark`
              traz um quadrado de 22px, e era ele que deixava este selo mais alto
              que os vizinhos. Quem carrega a altura agora é o `Badge`.

              **E é ele que carrega a ressalva de geração desde 10/08/2026**,
              por ideia do Eduardo · eram dois selos vizinhos respondendo a
              **mesma** pergunta (onde joga, e dá pra jogar junto), num rodapé
              que já quebra linha a 320px. A plataforma **é** o que carrega a
              geração, então a informação passou a morar nela.

              **Quem carrega a ressalva é a cor, sem palavra** · decisão do
              Eduardo, reafirmada depois de eu argumentar o contrário. O meu
              argumento era que no toque não há hover, então o âmbar ficaria sem
              explicação · ele preferiu a fileira mais limpa, e a chamada é
              dele. **O que ficou pra segurar isso** é o texto de leitor de tela
              logo abaixo, que não ocupa pixel nenhum e impede que a informação
              seja **só** cor.

              **São três estados, e o terceiro é o que salva a leitura por cor**
              · sem ele, cinza significaria ao mesmo tempo combina e não-avaliado,
              e quem ainda não preencheu a própria plataforma leria a lista
              inteira como compatível.

              | | Selo |
              |---|---|
              | você não disse onde joga | cinza apagado · a tela não tem como responder |
              | mesma geração | branco cheio · o fato confirmado |
              | outra geração | âmbar · a ressalva |

              **O destaque de "mesma geração" é branco e não verde**, a pedido
              dele e pela regra da casa: verde apareceria na maioria dos cards e
              gastaria o acento que já está no selo de procura club e no de club
              em comum. Branco é o par do verde nesta identidade. */}
          {player.platform && (
            <Badge
              size="sm"
              variant={
                player.generationMatch === 'other'
                  ? 'warning'
                  : player.generationMatch === 'same'
                    ? 'strong'
                    : 'default'
              }
              title={
                player.generationMatch === 'other'
                  ? t('player.otherGenerationHint')
                  : player.generationMatch === 'same'
                    ? t('player.sameGenerationHint')
                    : undefined
              }
            >
              <PlatformMark platform={player.platform} withLabel variant="plain" />
              {player.generationMatch !== 'unknown' && (
                <span className="sr-only">
                  {player.generationMatch === 'other'
                    ? t('player.otherGenerationHint')
                    : t('player.sameGenerationHint')}
                </span>
              )}
            </Badge>
          )}
          {/* **A unidade volta escrita, e o ícone sai** · eu tinha trocado
              "em 1 club" por escudo + número, e o Eduardo não entendeu de
              primeira · **número com ícone abstrato é charada**, e um escudo
              sozinho podia ser club, papel ou proteção. O card de club já traz a
              unidade junto do número no selo de elenco, e é a mesma solução. */}
          <Badge
            size="sm"
            variant={player.hasRoom ? 'default' : 'warning'}
            title={player.hasRoom ? undefined : t('player.atCapHint')}
          >
            {player.clubCount === 0
              ? t('player.noClub')
              : t('player.inClubsShort', { count: player.clubCount })}
          </Badge>
        </span>
      </span>
    </Link>
  );
}
