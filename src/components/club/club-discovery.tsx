import { ShieldQuestion } from 'lucide-react';
import { crossplayPool, type CrossplayPool } from '@ggclubs/schemas';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClubCard } from '@/components/club/club-card';
import { ClubCardSkeletonGrid } from '@/components/club/club-card-skeleton';
import { ShowcaseList } from '@/components/showcase-list';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchField } from '@/components/ui/search-field';
import { SelectField } from '@/components/ui/select-field';
import { SectionTitle } from '@/components/ui/section-title';
import { api, type PublicClubCard } from '@/lib/api';
import { POOL_KEY } from '@/lib/clubs';
import { useAuth } from '@/lib/use-auth';
import { useShowcase } from '@/lib/use-showcase';

/**
 * A vitrine de clubs · busca, carregamento sob demanda e esqueleto.
 *
 * Ela é o que responde por quem **chega sozinho**, que é o caso mais difícil
 * de atender numa rede de times: quem já tem club vem pelo link, quem não tem
 * precisa achar um. Por isso a busca não é enfeite de lista longa · é a função
 * principal da seção assim que passar de uma tela de clubs.
 *
 * Três decisões que valem registro:
 *
 * - **A próxima página entra sozinha**, por observador de interseção, e o
 *   botão existe como reserva pra quem navega por teclado ou está com o
 *   observador indisponível. Rolagem infinita sem saída de teclado é armadilha
 *   de acessibilidade.
 * - **A busca espera a digitação parar** e cancela a anterior. Sem o
 *   `AbortController` a resposta de "fu" pode chegar depois da de "furia" e
 *   sobrescrever a lista com o resultado errado · é corrida, não lentidão.
 * - **Esqueleto em vez de indicador giratório.** A tela já sabe o formato do
 *   que vem, e mostrar a silhueta certa evita o salto de layout quando os
 *   cards chegam.
 */
export function ClubDiscovery({ hide }: { hide: Set<string> }) {
  const { t } = useTranslation();
  /**
   * **A plataforma de quem olha sai da sessão, nunca de um `GET`** · é o mesmo
   * caminho do `PlayerView`, e ela existe aqui só pra o selo de plataforma
   * dizer se dá pra jogar junto.
   *
   * **Só a vitrine passa isso, e "Meus clubs" não** · lá a pergunta já está
   * respondida (você está dentro), e uma ressalva âmbar no seu próprio club lê
   * como erro em vez de informação.
   */
  const { account } = useAuth();
  const [query, setQuery] = useState('');
  const [pool, setPool] = useState<CrossplayPool | ''>('');

  const load = useCallback(
    async (args: { q?: string; cursor?: string }, init?: RequestInit) => {
      const r = await api.discoverClubs({ ...args, ...(pool ? { pool } : {}) }, init);
      return { items: r.clubs, cursor: r.cursor };
    },
    [pool],
  );

  const {
    items,
    cursor,
    pending,
    failed,
    refresh,
    loadingMore,
    sentinel,
    loadMore,
    searching,
    term,
  } = useShowcase<PublicClubCard>({ term: query, filterKey: pool, load });

  /**
   * **O servidor já exclui os seus desde 08/08/2026**, e este filtro sobra como
   * rede de segurança pro instante entre entrar num club e a lista recarregar.
   *
   * Ele era o mecanismo principal, e estava errado: a página vinha com 12, a
   * tela mostrava 9 e o cursor avançava 12 · a paginação ficava com buracos e
   * quem está em três clubs via páginas encurtando sem explicação.
   */
  const list = (items ?? []).filter((c) => !hide.has(c.tag));

  return (
    <section id="descobrir">
      {/* **`items-center`, e não `items-end`.** Com o alinhamento pela base, o
          campo de busca era pendurado pelo rodapé do bloco de título+legenda:
          ele descia e passava a ler como parte da legenda, que é só uma
          caption. Centralizado contra o bloco inteiro, ele volta a pertencer à
          **seção**, que é de quem ele é. */}
      <SectionTitle
        hint={searching ? undefined : t('club.discoverSubtitle')}
        aside={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {/* **Geração, e não plataforma** · club de PS5 e club de Xbox Series
              são o mesmo pool, então filtrar por plataforma esconderia
              justamente quem **pode** te receber. Mesma decisão da vitrine de
              players, e é a razão de o filtro de **vaga** não existir aqui: o
              teto de 3 do produto é por pessoa, e club não tem elenco máximo em
              lugar nenhum · o `memberCount` fica no card pra quem quiser julgar
              o tamanho. */}
            <SelectField
              label={t('club.filterPool')}
              value={pool}
              onChange={(v) => setPool(v as CrossplayPool | '')}
              options={crossplayPool.options.map((value) => ({
                value,
                label: t(POOL_KEY[value]),
              }))}
              allLabel={t('club.filterAllPools')}
              className="w-full sm:w-44"
            />
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder={t('club.searchPlaceholder')}
              label={t('club.searchPlaceholder')}
              className="w-full sm:w-64"
              inputClassName="h-11"
            />
          </div>
        }
      >
        {t('club.discoverTitle')}
      </SectionTitle>

      {/* **Silhueta só enquanto ainda pode chegar** · com a busca falhando a
          lista fica `null` pra sempre, e a silhueta viraria eterna. Pendência
          170, e é o mesmo defeito que a prova social teve em 02/09/2026. */}
      {items === null && !failed && <ClubCardSkeletonGrid count={6} />}

      {failed && items === null && (
        <EmptyState
          icon={ShieldQuestion}
          title={t('club.discoverFailed')}
          action={{ onClick: refresh, label: t('common.retry') }}
        />
      )}

      {items !== null && !pending && list.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          {searching ? t('club.searchEmpty', { term }) : t('club.discoverEmpty')}
        </p>
      )}

      <ShowcaseList
        items={list}
        keyOf={(club) => club.tag}
        renderItem={(club) => (
          <ClubCard
            tag={club.tag}
            name={club.name}
            crestUrl={club.crestUrl}
            platform={club.platform}
            memberCount={club.memberCount}
            viewerPlatform={account?.platform ?? null}
          />
        )}
        pending={pending}
        loadingMore={loadingMore}
        cursor={cursor}
        sentinel={sentinel}
        onLoadMore={loadMore}
        nextPageSkeleton={<ClubCardSkeletonGrid count={3} className="mt-3" />}
        loadMoreLabel={t('club.loadMore')}
      />
    </section>
  );
}
