import { MarkdownEditor } from '@/components/markdown-editor';
import {
  canEditTournament,
  displayStatusOf,
  capacityOf,
  effectiveSize,
  crossplayPool,
  groupCount,
  isPlayableBracket,
  qualifiedCount,
  teamsInEdition,
  TOURNAMENT_NAME_MAX,
  TOURNAMENT_RULES_MAX,
  type BracketSize,
  type CrossplayPool,
  type TournamentStatus,
} from '@ggclubs/schemas';
import { ExternalLink, Pencil, Plus, Settings2, Trash2, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chamfer } from '@/components/ui/chamfer';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DateField } from '@/components/ui/date-field';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { EditionRail } from '@/components/tournament/edition-rail';
import { nextStepOf } from '@/lib/edition-steps';
import { SectionTitle } from '@/components/ui/section-title';
import { SelectField } from '@/components/ui/select-field';
import { api, type TournamentRecord } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { POOL_KEY } from '@/lib/clubs';
import { cancelBrakeFor } from '@/lib/tournament-cancel';
import { formatCents, formatPrice, parseCentsFromBrl } from '@/lib/format';
import { formatMatchTime, fromZonedInput, toZonedInput } from '@/lib/tournament-format';
import { tournamentPath } from '@/lib/paths';
import { cn } from '@/lib/utils';
import { useResource } from '@/lib/use-resource';

/**
 * Montar campeonato · **e é um formulário de números, não um montador de fases
 * arrastável.**
 *
 * A decisão do Eduardo em 10/08/2026 é o que derruba o custo desta tela: existe
 * **um formato padrão da casa** (grupos seguidos de mata-mata), e nos
 * campeonatos daqui **só mudam os números**. O que sobrou é validar que cada
 * degrau da escada forma uma chave que dá pra jogar, e isso é função pura.
 *
 * **A conta aparece enquanto a pessoa digita**, e ela é o que faz o formulário
 * ser usável: sem ver "12 grupos, 32 no mata-mata" na hora, escolher 8 melhores
 * terceiros é adivinhação.
 */
/**
 * Os três grupos da lista, na ordem da urgência · **e não na ordem do banco.**
 *
 * `live` é o que tem gente dentro ou está prestes a ter; `draft` é o que ainda
 * não é promessa; `done` é consulta, e por isso ele vem fechado.
 *
 * **`cancelled` mora junto de `finished` de propósito** · pra quem opera, as
 * duas respondem a mesma coisa (não há o que fazer aqui), e separar em quatro
 * grupos numa lista de cinco itens é organização que custa mais do que rende.
 */
const GROUPS = [
  {
    key: 'live',
    has: (s: TournamentStatus) => s !== 'draft' && s !== 'finished' && s !== 'cancelled',
  },
  { key: 'draft', has: (s: TournamentStatus) => s === 'draft' },
  { key: 'done', has: (s: TournamentStatus) => s === 'finished' || s === 'cancelled' },
] as const;

export function AdminTournamentsPage() {
  const { t } = useTranslation();

  // Falha de rede não é "nenhuma edição" · ver o `catch` abaixo.

  const [editing, setEditing] = useState<TournamentRecord | 'new' | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  /**
   * A edição que espera confirmação pra ser cancelada.
   *
   * **Cancelar era um botão fantasma que disparava no clique** · e é a única
   * ação daqui que não tem volta: ela avisa o elenco inscrito inteiro, tira a
   * edição de toda lista, não reabre, e numa edição paga deixa dinheiro cobrado
   * do lado de fora (o reembolso é na mão, pelo painel do Mercado Pago).
   *
   * A guarda entrou em 19/08/2026, por um pedido do Eduardo que é sobre gente:
   * o painel vai ser de **mais de uma pessoa**, e nem todas terão o contexto de
   * quem construiu isto.
   */
  const [cancelling, setCancelling] = useState<TournamentRecord | null>(null);
  const brake = cancelBrakeFor(cancelling);
  /** A falha do cancelamento vive na janela, não na página · ver o `onConfirm`. */
  const [cancelFailure, setCancelFailure] = useState<string | null>(null);

  const { data, error, reload } = useResource(
    (signal) => api.adminListTournaments({ signal }).then((r) => r.tournaments),
    [],
  );
  /**
   * **Falha de rede não é "nenhuma edição"** · aqui o custo é o do painel de
   * disputa que o revisor pegou em 18/08: o admin fecha a aba achando que não
   * há nada, com edições vivas do outro lado.
   *
   * **E o cartão de erro some sozinho quando a volta chega** · o `useResource`
   * limpa o `error` a cada busca, o que resolve de graça o defeito de 19/08:
   * "tentar de novo" trazia a lista e deixava o cartão por cima dela afirmando
   * que nada carregou, até um F5.
   */
  /**
   * **Só é falha quando não há o que mostrar.**
   *
   * O `reload()` de uma ação (publicar, cancelar, editar) mantém a lista na
   * tela de propósito · se essa recarga cair, `error` acende com `data` cheio e
   * a tela desenharia o cartão "não deu pra carregar" **por cima da lista
   * completa**. É o mesmo defeito de 19/08 pelo outro lado, e foi achado por
   * revisão em 01/09/2026.
   */
  const tournaments = data;
  const failed = Boolean(error) && tournaments === null;

  async function setStatus(id: string, status: Exclude<TournamentStatus, 'draft'>) {
    setFailure(null);
    try {
      await api.adminSetTournamentStatus(id, status);
      reload();
    } catch (err) {
      setFailure(apiErrorMessage(err, t));
    }
  }

  /**
   * Um cartão de edição · **extraído porque a lista deixou de ser uma só.**
   *
   * A tela desenha três grupos (em jogo, rascunho e encerradas), e o cartão
   * é o mesmo nos três · repetir o JSX por grupo é a segunda cópia que
   * diverge no primeiro ajuste.
   */
  function card(tournament: TournamentRecord) {
    // A chave já saiu · não é derivável do status, porque a edição segue `open`
    // até alguém fechar. Ver `EditionRail`.
    const drawn = tournament.drawnAt !== null && tournament.drawnAt !== undefined;
    const mostra = displayStatusOf(tournament);
    return (
      /**
       * **O chanfro chega no painel** · 19/08/2026. O cartão público
       * ganhou a geometria da marca no dia anterior e este ficou pra trás,
       * e foi olhando exatamente este que o Eduardo disse que o rebrand
       * não tinha acontecido. As duas camadas moram no `<Chamfer>`.
       */
      <li key={tournament._id}>
        <Chamfer
          border={tournament.status === 'open' ? 'bg-primary/25' : 'bg-border'}
          innerClassName="bg-card p-4"
        >
          {/**
           * **O estado sobe pra cima do nome, e o nome fica com a linha
           * inteira** · lado a lado, o selo comia largura e **todo nome
           * truncava a 390**: a captura de 18/08/2026 mostrava
           * "COPA DEMO D…", "REDE DE SEGURAN…" e "PILOTO DE PAGAM…" na
           * mesma tela. Nome de edição vai a 40 caracteres por schema, e é
           * ele que perde a disputa em silêncio.
           */}
          <div className="flex flex-wrap items-center gap-2">
            {/* **O selo pergunta ao relógio, não ao status** · ver
                `displayStatusOf`. E o verde acompanha, porque verde só quando
                ativo é a regra do design. */}
            <Badge variant={mostra === 'open' ? 'success' : 'default'} size="sm">
              {t(`tournament.status.${mostra}`)}
            </Badge>
            {/* A geração era uma das quatro métricas · ela é **atributo**,
                    não número, e ao lado do estado ela custa uma linha em vez
                    de um quarto da grade. */}
            <Badge variant="outline" size="sm">
              {t(POOL_KEY[tournament.pool])}
            </Badge>
            <Badge variant="outline" size="sm">
              {tournament.priceCents === 0
                ? t('tournament.free')
                : t('admin.tournaments.perSpot', { price: formatPrice(tournament.priceCents) })}
            </Badge>
          </div>

          <p className="mt-2 font-display text-lg uppercase leading-tight text-foreground sm:text-xl">
            {tournament.name}
          </p>
          <p className="text-xs text-muted-foreground">/campeonato/{tournament.slug}</p>

          {/* **A régua diz onde a edição está** · e ela existe pro admin que
                  não construiu o produto. Ver o comentário do componente. */}
          <EditionRail className="mt-3" status={tournament.status} drawn={drawn} />

          {/**
           * **O que acontece agora, e QUEM faz** · escrito, e não deduzido
           * do conjunto de botões disponíveis.
           *
           * A frase mais valiosa pra quem chegou agora é a que diz o que
           * **não** precisa ser feito: a varredura sorteia sozinha quando a
           * edição **lota**, e depois da chave são os clubs que declaram o
           * placar. Sem isso, o admin novo ou antecipa o que não devia, ou
           * espera por algo que ninguém vai fazer · e a segunda metade é a
           * pior, porque a edição fica parada em silêncio.
           */}
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {t(
              `admin.tournaments.next.${nextStepOf({
                status: tournament.status,
                drawn,
                drawAt: tournament.drawAt,
                registrationOpensAt: tournament.registrationOpensAt,
              })}`,
            )}
          </p>

          {/**
           * **Duas métricas, e as duas mudam sozinhas** · eram quatro, e
           * três delas eram **configuração** (geração, preço, prêmio), que
           * não muda depois de a edição existir e que o admin acabou de
           * digitar. Elas viraram selos na linha de cima.
           *
           * O que o admin confere de relance é **quanto encheu** e **quanto
           * a edição paga** · o resto é leitura de formulário.
           */}
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <Stat
              label={t('admin.tournaments.statSpots')}
              value={`${teamsInEdition(tournament)}/${capacityOf(tournament)}`}
            />
            {/**
             * **Prêmio zerado não vira métrica**, e a regra é a mesma que o
             * `docs/design.md` já escreve pro pódio da página pública:
             * gastar um dos dois lugares de destaque pra anunciar zero é a
             * tela dizendo nada com ênfase.
             *
             * **Numa edição grátis o que o admin precisa é a data** · é ela
             * que decide se ele espera a varredura ou antecipa o sorteio.
             */}
            {(effectiveSize(tournament)?.prize.first ?? 0) > 0 ? (
              <Stat
                label={t('admin.tournaments.statPrize')}
                value={formatCents(effectiveSize(tournament)?.prize.first ?? 0)}
              />
            ) : (
              <Stat
                label={t('admin.tournaments.statDraw')}
                // **Com hora** · é ela que diz ao admin se ele espera ou antecipa.
                value={formatMatchTime(tournament.drawAt)}
              />
            )}
          </dl>

          {/* **A barra é a leitura de relance** · dois números lado a lado
                  dizem o mesmo, mas quem opera quer saber se a edição vai
                  fechar o degrau, e isso é uma forma e não uma conta. */}
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={teamsInEdition(tournament)}
            aria-valuemin={0}
            aria-valuemax={capacityOf(tournament)}
            aria-label={t('admin.tournaments.statSpots')}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{
                width: `${Math.min(
                  Math.round(
                    (teamsInEdition(tournament) / Math.max(capacityOf(tournament), 1)) * 100,
                  ),
                  100,
                )}%`,
              }}
            />
          </div>

          {/**
           * **A ação destrutiva sai da fileira** · ela era um botão fantasma
           * no meio dos outros, do mesmo tamanho e do mesmo peso de "ver
           * página". A `ml-auto` empurra ela pro fim da linha, longe do
           * clique acidental, e a janela pergunta antes.
           */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* **As ações seguras andam juntas, num item só da linha** ·
                    soltas, elas viram itens irmãos do cancelar, e a `ml-auto`
                    dele consome a folga entre um par qualquer delas. Com três
                    botões (rascunho, e inscrição aberta) o desfecho é a fileira
                    quebrando em duas linhas com o destrutivo no meio. */}
            <div className="flex flex-wrap items-center gap-2">
              {/* **Rascunho não tem página**, então o link só existe depois de
                    publicar · oferecê-lo antes levaria o admin a um 404 nosso. */}
              {tournament.status !== 'draft' && (
                <Button asChild variant="ghost" size="sm">
                  <Link to={tournamentPath(tournament.slug)}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    {t('admin.tournaments.open')}
                  </Link>
                </Button>
              )}
              {tournament.status === 'draft' && (
                <Button
                  variant="cta"
                  size="sm"
                  onClick={() => void setStatus(tournament._id, 'open')}
                >
                  {t('admin.tournaments.publish')}
                </Button>
              )}
              {/**
               * **Editar acompanha "ninguém dentro", e não "é rascunho"** ·
               * 22/08/2026. Quem publicava com a data de abertura errada ficava
               * sem porta: a inscrição responde `closed`, e nem esta lista nem o
               * painel de operar ofereciam data. Sobrava cancelar e recriar,
               * perdendo o endereço. O servidor decide igual (`updateTournament`).
               */}
              {canEditTournament(tournament) && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(tournament)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {t('admin.tournaments.edit')}
                </Button>
              )}
              {tournament.status === 'open' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void setStatus(tournament._id, 'closed')}
                >
                  {t('admin.tournaments.close')}
                </Button>
              )}
              {/**
               * **Operar não é escolher, e por isso mora noutra tela** ·
               * pendência 103, fechada em 19/08/2026.
               *
               * Sortear, gerar o mata-mata, acompanhar a chave, resolver
               * disputa e destravar partida viviam **aqui dentro**, num item
               * de lista · com três painéis empilhados e cinco botões, a
               * lista deixava de ser lista, e a chave (que é o que a
               * organização mais precisa olhar) não existia em tela nenhuma
               * do painel.
               *
               * **Rascunho não abre** · não há o que operar antes de existir
               * página, e o botão levaria a uma tela vazia.
               */}
              {tournament.status !== 'draft' && (
                <Button asChild variant="cta" size="sm">
                  <Link to={`/admin/campeonatos/${tournament.slug}`}>
                    <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                    {t('admin.tournaments.manage')}
                  </Link>
                </Button>
              )}
            </div>
            {tournament.status !== 'cancelled' && tournament.status !== 'finished' && (
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-destructive hover:text-destructive"
                onClick={() => setCancelling(tournament)}
              >
                {t('admin.tournaments.cancel')}
              </Button>
            )}
          </div>
        </Chamfer>
      </li>
    );
  }
  return (
    <div>
      <PageHeader
        title={t('admin.tournaments.title')}
        subtitle={t('admin.tournaments.subtitle')}
        action={
          <Button onClick={() => setEditing((v) => (v ? null : 'new'))}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t('admin.tournaments.new')}
          </Button>
        }
      />

      {failure && <p className="mb-4 text-sm text-destructive">{failure}</p>}

      {editing && (
        <TournamentForm
          key={editing === 'new' ? 'new' : editing._id}
          editing={editing === 'new' ? null : editing}
          onDone={() => {
            setEditing(null);
            reload();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* **Falha não é ausência** · com a lista vazia o admin fecha a aba
          achando que não há nada, com edições vivas do outro lado. É o mesmo
          falso-verde que o painel de disputa pagou em 18/08. */}
      {failed && (
        <EmptyState
          icon={Trophy}
          title={t('tournament.failureTitle')}
          description={t('tournament.listFailureBody')}
          action={{ onClick: reload, label: t('tournament.retry') }}
        />
      )}

      {!failed && tournaments?.length === 0 && (
        <EmptyState
          icon={Trophy}
          title={t('admin.tournaments.emptyTitle')}
          description={t('admin.tournaments.emptyBody')}
        />
      )}

      {/**
       * **A edição viva não pode ter o mesmo peso do resíduo de teste**, e
       * essa era a leitura da tela em 18/08/2026: **cinco** edições
       * canceladas desenhadas exatamente como a única que estava
       * acontecendo, cada uma com quatro métricas e a fileira inteira de
       * ações.
       *
       * **Documento de teste não se apaga aqui** · a `rede-sandbox` existe
       * como registro de uma prova, e o `estado.md` diz isso. O que ele não
       * pode é disputar atenção com a edição que tem gente dentro.
       *
       * **A ordem é a da urgência**, e não a do banco · o que está em jogo,
       * o que ainda é rascunho, e por último o que acabou. Este último vem
       * **fechado**, porque ele é consulta e não trabalho.
       */}
      {tournaments && tournaments.length > 0 && (
        <div>
          {GROUPS.map(({ key, has }) => {
            const rows = tournaments.filter((x) => has(x.status));
            if (rows.length === 0) return null;
            const list = <ul className="space-y-3">{rows.map(card)}</ul>;

            return (
              <section key={key} className="mt-6 first:mt-0">
                {key === 'done' ? (
                  // **Fechado por padrão**, e com o `details` nativo · ele é
                  // o único caminho que funciona sem estado, sem tecla e sem
                  // biblioteca, e já sabe ser acessível.
                  <details className="rounded-xl border border-border bg-card/40">
                    <summary className="cursor-pointer list-none p-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {t('admin.tournaments.groupDone', { count: rows.length })}
                    </summary>
                    <div className="px-4 pb-4">{list}</div>
                  </details>
                ) : (
                  <>
                    <SectionTitle>{t(`admin.tournaments.group.${key}`)}</SectionTitle>
                    {list}
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/**
       * **A única ação daqui que não tem volta.**
       *
       * Ela avisa o elenco inscrito inteiro, tira a edição de toda lista, não
       * reabre, e numa edição paga deixa dinheiro cobrado do lado de fora · o
       * reembolso é na mão, pelo painel do Mercado Pago. Até 19/08/2026 tudo
       * isso saía de **um clique**, num botão fantasma do mesmo tamanho de
       * "ver página".
       *
       * **O freio é proporcional**, como o de remover club: rascunho sem
       * ninguém dentro cancela no sim, e edição com club inscrito exige
       * digitar o apelido dela. Exigir digitação sempre ensina a copiar sem
       * ler, e aí o freio deixa de existir justamente onde importa.
       */}
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(next) => {
          if (!next) {
            setCancelling(null);
            setCancelFailure(null);
          }
        }}
        tone="destructive"
        title={t('admin.tournaments.cancelTitle')}
        description={
          <>
            {t(brake.bodyKey, { count: brake.count })}
            {/* A falha mora **dentro** da janela, como na de encerrar club ·
                fora dela ninguém vê. */}
            {cancelFailure && <span className="mt-3 block text-destructive">{cancelFailure}</span>}
          </>
        }
        confirmLabel={t('admin.tournaments.cancel')}
        dismissLabel={t('admin.tournaments.cancelKeep')}
        confirmPhrase={brake.phrase}
        confirmPhraseLabel={t('admin.tournaments.cancelType', {
          // **Em caixa alta, porque o campo mostra em caixa alta** · a dica em
          // minúscula fazia a pessoa achar que digitou errado. A comparação é
          // insensível a caixa, então nada trava · é só o susto. Mesmo motivo
          // do `tag.toUpperCase()` na janela de encerrar club.
          slug: (cancelling?.slug ?? '').toUpperCase(),
        })}
        onConfirm={async (typed) => {
          if (!cancelling) return;
          // **O `throw` é o contrato da janela** · sem ele o `ConfirmDialog`
          // fecha no caminho da falha e o erro aparece atrás dela, no topo da
          // página, fora da tela. O admin sairia achando que cancelou uma
          // edição que segue viva. O `setStatus` engole o erro de propósito
          // (os outros botões vivem na página), então quem cancela usa a rota
          // direto. Achado pelo `revisor` em 19/08/2026.
          setFailure(null);
          try {
            // **Vai o que a pessoa digitou**, e não `cancelling.slug` · a
            // conferência do servidor (pendência 102) só vale pro caminho da
            // tela se o texto que chega lá for o dela. Sem freio na janela o
            // campo nem existe, e o servidor também não pede nada.
            await api.adminSetTournamentStatus(cancelling._id, 'cancelled', typed);
            reload();
          } catch (err) {
            setCancelFailure(apiErrorMessage(err, t));
            throw err;
          }
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}

type SizeDraft = {
  slots: string;
  groupSize: string;
  qualifiersPerGroup: string;
  bestThirds: string;
  first: string;
  second: string;
  third: string;
};

const EMPTY_SIZE: SizeDraft = {
  slots: '48',
  groupSize: '4',
  qualifiersPerGroup: '2',
  bestThirds: '8',
  first: '550',
  second: '300',
  third: '200',
};

/**
 * O formulário · **cria sempre em rascunho, e edita enquanto ninguém está
 * dentro** (`canEditTournament`, no schema · o servidor decide pela mesma).
 *
 * A separação não é cerimônia: o endereço é imutável e a premiação é promessa,
 * então a diferença entre **montar** e **prometer** precisa de um ato próprio ·
 * e com club inscrito, mudar formato ou prazo é mudar a promessa embaixo de
 * quem entrou. **Publicar sozinho não prometeu nada a ninguém**, e essa foi a
 * correção de 22/08/2026 · antes disso o admin que errava a data de abertura
 * não tinha porta nenhuma na tela.
 */
function TournamentForm({
  editing,
  onDone,
  onCancel,
}: {
  editing: TournamentRecord | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(editing?.name ?? '');
  const [slug, setSlug] = useState(editing?.slug ?? '');
  const [pool, setPool] = useState<CrossplayPool>(editing?.pool ?? 'current');
  const [price, setPrice] = useState(
    editing ? String((editing.priceCents / 100).toFixed(2)).replace('.', ',') : '0',
  );
  const [rules, setRules] = useState(editing?.rules ?? '');
  /**
   * **A disputa de terceiro passou a ser uma escolha** · 20/08/2026.
   *
   * O campo existe no schema desde o começo e este formulário gravava `true`
   * **fixo**, com **nenhuma linha de código lendo** · toda edição criada
   * prometia, no dado, um jogo que nunca ia acontecer. Agora ela acontece de
   * verdade (ver `advanceKnockout`), e por isso ela precisa ser perguntada.
   *
   * **Ligada por padrão** · é o que a maioria dos campeonatos faz, e é o que
   * todas as edições já criadas dizem que fazem.
   */
  const [thirdPlace, setThirdPlace] = useState(editing?.format.thirdPlaceMatch ?? true);
  const [opensAt, setOpensAt] = useState(day(editing?.registrationOpensAt) ?? todayAt(12));
  /**
   * **Abrir a inscrição no instante em que a edição for publicada** · pedido do
   * Eduardo em 22/08/2026.
   *
   * O campo de data tem granularidade de dia e o `noon()` crava meio-dia, então
   * "hoje" de manhã significa *"abre ao meio-dia"* e de tarde significa *"já
   * abriu"* · duas coisas diferentes no mesmo valor. Com isto ligado a abertura
   * é **agora**, e não um horário que a pessoa não escolheu.
   *
   * **Ligada por padrão só em edição nova** · quem está editando uma que já
   * existe tem uma data escrita, e sobrescrevê-la em silêncio seria mudar o que
   * já foi decidido.
   */
  const [openNow, setOpenNow] = useState(!editing);
  const [closesAt, setClosesAt] = useState(day(editing?.registrationClosesAt) ?? inDays(14, 20));
  const [drawAt, setDrawAt] = useState(day(editing?.drawAt) ?? inDays(15, 20));
  const [startsAt, setStartsAt] = useState(day(editing?.startsAt) ?? inDays(16, 21));
  const [sizes, setSizes] = useState<SizeDraft[]>(
    editing ? editing.format.sizes.map(toDraft) : [EMPTY_SIZE],
  );
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const parsed = sizes.map(toBracket);
  const allPlayable = parsed.every((size) => size !== null && isPlayableBracket(size));
  /**
   * O que impede gravar, **na ordem em que a pessoa resolve** · a escada
   * primeiro porque é o trabalho, o nome depois porque é um campo.
   */
  const blocked = !allPlayable
    ? ('admin.tournaments.bracketBad' as const)
    : !name || !slug
      ? ('admin.tournaments.needsNameAndSlug' as const)
      : null;

  async function submit() {
    setSaving(true);
    setFailure(null);
    const body = {
      name,
      pool,
      format: {
        sizes: parsed.filter((s): s is BracketSize => s !== null),
        thirdPlaceMatch: thirdPlace,
      },
      priceCents: parseCentsFromBrl(price) ?? 0,
      rules: rules.trim() || null,
      crestUrl: null,
      bannerUrl: null,
      registrationOpensAt: openNow ? new Date() : fromZonedInput(opensAt),
      registrationClosesAt: fromZonedInput(closesAt),
      drawAt: fromZonedInput(drawAt),
      startsAt: fromZonedInput(startsAt),
    };
    try {
      if (editing) await api.adminUpdateTournament(editing._id, body);
      else await api.adminCreateTournament({ ...body, slug });
      onDone();
    } catch (err) {
      setFailure(apiErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-primary/25 bg-card p-5 sm:p-6">
      <SectionTitle>
        {editing ? t('admin.tournaments.editTitle') : t('admin.tournaments.new')}
      </SectionTitle>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="t-name" label={t('admin.tournaments.name')}>
          <Input
            id="t-name"
            value={name}
            maxLength={TOURNAMENT_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field
          id="t-slug"
          label={t('admin.tournaments.slug')}
          hint={editing ? t('admin.tournaments.slugLocked') : `/campeonato/${slug || '...'}`}
        >
          {/* **O endereço não se edita depois de criado**, como a tag do club ·
              trocar quebraria todo link já colado no Discord. */}
          <Input
            id="t-slug"
            value={slug}
            disabled={Boolean(editing)}
            onChange={(e) => setSlug(e.target.value)}
          />
        </Field>
        <Field
          id="t-pool"
          label={t('admin.tournaments.pool')}
          hint={t('admin.tournaments.poolHint')}
        >
          <SelectField
            id="t-pool"
            label={t('admin.tournaments.pool')}
            value={pool}
            onChange={(value) => setPool(value as CrossplayPool)}
            options={crossplayPool.options.map((option) => ({
              value: option,
              label: t(POOL_KEY[option]),
            }))}
          />
        </Field>
        <Field
          id="t-price"
          label={t('admin.tournaments.price')}
          hint={t('admin.tournaments.priceHint')}
        >
          <Input id="t-price" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>

        <Field id="t-opens" label={t('tournament.registrationOpens')}>
          {/* **Desligado, e dizendo por que** · controle inerte sem explicação
              lê como tela quebrada, e a explicação é a linha abaixo. */}
          <DateField
            id="t-opens"
            label={t('tournament.registrationOpens')}
            withTime
            value={opensAt}
            onChange={setOpensAt}
            disabled={openNow}
          />
          <label className="mt-2 flex cursor-pointer items-start gap-2">
            <Checkbox
              id="t-open-now"
              checked={openNow}
              onCheckedChange={(v) => setOpenNow(v === true)}
              className="mt-0.5"
            />
            <span className="block text-xs text-muted-foreground">
              {t('admin.tournaments.openNow')}
            </span>
          </label>
        </Field>
        <Field id="t-closes" label={t('tournament.registrationCloses')}>
          <DateField
            id="t-closes"
            label={t('tournament.registrationCloses')}
            withTime
            value={closesAt}
            onChange={setClosesAt}
            min={opensAt}
          />
        </Field>
        <Field id="t-draw" label={t('tournament.draw')} hint={t('tournament.drawHint')}>
          <DateField
            id="t-draw"
            label={t('tournament.draw')}
            withTime
            value={drawAt}
            onChange={setDrawAt}
            min={closesAt}
          />
        </Field>
        <Field id="t-starts" label={t('tournament.starts')}>
          <DateField
            id="t-starts"
            label={t('tournament.starts')}
            withTime
            value={startsAt}
            onChange={setStartsAt}
            min={drawAt}
          />
        </Field>
      </div>

      <div className="mt-4">
        <MarkdownEditor
          id="t-rules"
          label={t('admin.tournaments.rules')}
          value={rules}
          onChange={setRules}
          maxLength={TOURNAMENT_RULES_MAX}
          rows={6}
        />
      </div>

      {/* **Uma pergunta, e não um número** · ela mora aqui e não na escada
          porque vale pra edição inteira · a escada é por degrau. */}
      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <Checkbox
          checked={thirdPlace}
          onCheckedChange={(v) => setThirdPlace(v === true)}
          className="mt-0.5"
        />
        <span className="space-y-1">
          <span className="block text-sm font-medium">{t('admin.tournaments.thirdPlace')}</span>
          <span className="block text-xs text-muted-foreground">
            {t('admin.tournaments.thirdPlaceHint')}
          </span>
        </span>
      </label>

      <h3 className="mt-6 font-display text-sm uppercase tracking-wide text-foreground">
        {t('admin.tournaments.ladder')}
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">{t('admin.tournaments.ladderHint')}</p>

      <ul className="space-y-3">
        {sizes.map((size, index) => {
          const bracket = parsed[index] ?? null;
          const playable = bracket !== null && isPlayableBracket(bracket);
          return (
            <li
              key={index}
              className={cn(
                'rounded-lg border p-3',
                playable ? 'border-border/60' : 'border-destructive/40',
              )}
            >
              <div className="grid gap-2 sm:grid-cols-4">
                {(
                  [
                    ['slots', 'admin.tournaments.slots'],
                    ['groupSize', 'admin.tournaments.groupSize'],
                    ['qualifiersPerGroup', 'admin.tournaments.qualifiers'],
                    ['bestThirds', 'admin.tournaments.bestThirds'],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} id={`t-${key}-${index}`} label={t(label)}>
                    <Input
                      id={`t-${key}-${index}`}
                      inputMode="numeric"
                      value={size[key]}
                      onChange={(e) => patch(setSizes, index, key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ['first', 'tournament.prizeFirst'],
                    ['second', 'tournament.prizeSecond'],
                    ['third', 'tournament.prizeThird'],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} id={`t-${key}-${index}`} label={t(label)}>
                    <Input
                      id={`t-${key}-${index}`}
                      inputMode="numeric"
                      value={size[key]}
                      onChange={(e) => patch(setSizes, index, key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>

              {/* **A conta na tela é o que torna o formulário usável** · sem ela
                  a pessoa escolhe 8 melhores terceiros no escuro e descobre no
                  erro do servidor. */}
              <p
                className={cn(
                  'mt-2 text-xs',
                  playable ? 'text-muted-foreground' : 'text-destructive',
                )}
              >
                {bracket && playable
                  ? t('admin.tournaments.bracketOk', {
                      groups: groupCount(bracket),
                      knockout: qualifiedCount(bracket),
                    })
                  : t('admin.tournaments.bracketBad')}
              </p>

              {sizes.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setSizes((all) => all.filter((_, i) => i !== index))}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {t('admin.tournaments.removeSize')}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => setSizes((all) => [...all, EMPTY_SIZE])}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {t('admin.tournaments.addSize')}
      </Button>

      {failure && <p className="mt-4 text-sm text-destructive">{failure}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="cta" disabled={saving || blocked !== null} onClick={() => void submit()}>
          {saving
            ? t('admin.tournaments.saving')
            : editing
              ? t('admin.tournaments.save')
              : t('admin.tournaments.create')}
        </Button>
        {/* Toda tela precisa de saída, e formulário aberto também. */}
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        {/* **Botão desligado diz por que está desligado** · controle inerte sem
            explicação lê como tela quebrada. */}
        {blocked && <span className="text-xs text-muted-foreground">{t(blocked)}</span>}
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function patch(
  set: React.Dispatch<React.SetStateAction<SizeDraft[]>>,
  index: number,
  key: keyof SizeDraft,
  value: string,
) {
  set((all) => all.map((size, i) => (i === index ? { ...size, [key]: value } : size)));
}

/** O rascunho da tela vira degrau, ou `null` quando algum número não fecha. */
function toBracket(draft: SizeDraft): BracketSize | null {
  const slots = Number(draft.slots);
  const groupSize = Number(draft.groupSize);
  const qualifiersPerGroup = Number(draft.qualifiersPerGroup);
  const bestThirds = Number(draft.bestThirds);
  const prize = {
    first: parseCentsFromBrl(draft.first),
    second: parseCentsFromBrl(draft.second),
    third: parseCentsFromBrl(draft.third),
  };

  // O `every` com `>=` em vez de `some` com `<` não é estilo: o
  // `pnpm scan:strings` lê `<` como abertura de tag e acusa o resto da linha
  // como texto de tela fora do catálogo.
  const numbers = [slots, groupSize, qualifiersPerGroup, bestThirds];
  if (!numbers.every((n) => Number.isInteger(n) && n >= 0)) return null;
  if (prize.first === null || prize.second === null || prize.third === null) return null;

  return {
    slots,
    groupSize,
    qualifiersPerGroup,
    bestThirds,
    prize: { first: prize.first, second: prize.second, third: prize.third },
  };
}

function toDraft(size: BracketSize): SizeDraft {
  return {
    slots: String(size.slots),
    groupSize: String(size.groupSize),
    qualifiersPerGroup: String(size.qualifiersPerGroup),
    bestThirds: String(size.bestThirds),
    first: String(size.prize.first / 100),
    second: String(size.prize.second / 100),
    third: String(size.prize.third / 100),
  };
}

/**
 * `yyyy-mm-dd` no meio-dia local.
 *
 * **Meio-dia e não meia-noite**, e isso não é gosto: com `T00:00` qualquer fuso
 * negativo joga a data pro dia anterior ao converter pra UTC, e o prazo que o
 * admin digitou aparece um dia antes na página. Doze horas de folga cobrem o
 * planeta inteiro.
 */
/**
 * O que o formulário guarda e devolve · **sempre em horário de Brasília.**
 *
 * Até 22/08/2026 os campos eram só de dia e o servidor cravava **meio-dia**, o
 * que dava um campeonato começando ao meio-dia · e o "hoje" era calculado com
 * `toISOString()`, que responde em **UTC**: depois das 21h em Brasília ele
 * sugeria **amanhã**. As duas metades pensavam em fusos diferentes.
 *
 * Agora quem manda é o `TOURNAMENT_TIME_ZONE` · ver o porquê lá.
 */
function day(value: string | undefined): string | null {
  return value ? toZonedInput(value) : null;
}

function todayAt(hour: number): string {
  return `${toZonedInput(new Date()).slice(0, 10)}T${String(hour).padStart(2, '0')}:00`;
}

function inDays(days: number, hour: number): string {
  const when = new Date(Date.now() + days * 24 * 3_600_000);
  return `${toZonedInput(when).slice(0, 10)}T${String(hour).padStart(2, '0')}:00`;
}
