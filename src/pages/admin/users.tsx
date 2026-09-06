import { accountStatus, role as roleEnum } from '@ggclubs/schemas';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Eye,
  EyeOff,
  MoreVertical,
  ShieldCheck,
  ShieldOff,
  User,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { PageHeader } from '@/components/ui/page-header';
import { PageStack } from '@/components/ui/page-stack';
import { SearchField } from '@/components/ui/search-field';
import { api, type AdminUserRecord } from '@/lib/api';
import { phoneLabel } from '@/lib/phone-countries';
import { apiErrorMessage } from '@/lib/api-error';
import { adminTournamentPath, appClubPath, appPlayerPath } from '@/lib/paths';
import { formatShortDate } from '@/lib/tournament-format';
import { useDebounced } from '@/lib/use-debounced';
import { useDocumentTitle } from '@/lib/use-document-title';
import { cn } from '@/lib/utils';
import { useResource } from '@/lib/use-resource';

/**
 * As contas, do lado de quem administra · **e ela ganhou o que sempre lhe
 * faltou em 19/08/2026.**
 *
 * A rota `PATCH /admin/users/:id` existe desde o começo e escreve nos **dois**
 * lugares (o Mongo e o custom claim do Firebase, senão o painel mente) · e a
 * tela **não oferecia nada disso**. A única ferramenta de moderação do produto
 * não tinha interface: promover, rebaixar e suspender só aconteciam por chamada
 * direta à API.
 *
 * **Junto veio a busca**, e o motivo é aritmético: eram 148 contas numa lista de
 * 50. O painel existe pra agir sobre **uma** pessoa, e sem busca a ação dependia
 * de ela estar entre as cinquenta mais novas.
 *
 * **E o total aparece.** A lista cortava em silêncio, o que é o mesmo que
 * afirmar "estes são os usuários" mostrando um terço deles.
 */
const PAGE = 50;

export function AdminUsersPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('admin.users'));


  const [failure, setFailure] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  /** A conta que espera confirmação · papel e suspensão não saem de um clique. */
  const [asking, setAsking] = useState<{ user: AdminUserRecord; kind: 'role' | 'status' } | null>(
    null,
  );

  // **A busca espera a digitação parar** · sem isso é uma consulta por tecla, e
  // a resposta antiga chegando depois traz de volta a lista errada.
  const term = useDebounced(query, 300);

  const { data, error, reload } = useResource(
    (signal) => api.adminListUsers({ limit: shown, ...(term ? { q: term } : {}) }, { signal }),
    [shown, term],
    /**
     * **Estas dependências são gatilho, e não identidade** · "mostrar mais 50"
     * e "filtrar por status" perguntam de novo sobre a **mesma** coisa.
     *
     * Sem isto a tabela inteira sumia e virava esqueleto a cada clique em
     * carregar mais, e os contadores dos chips piscavam em zero. Achado por
     * revisão em 01/09/2026 · antes da conversão as listas só eram
     * substituídas na volta, então nada sumia.
     */
    { keepPrevious: true },
  );
  /**
   * **Falha de rede não é "nenhuma conta"** · são dois desfechos diferentes, e
   * a tela desenha coisas distintas pra cada um. O `null` do `useResource` é
   * *"ainda não sei"*, e ele sobrevive à conversão de propósito.
   */
  const failed = Boolean(error);
  const users = failed ? [] : (data?.users ?? null);
  const total = data?.total ?? 0;

  /**
   * Promove, rebaixa ou suspende · **e a tela não confere nada.**
   *
   * Quem recusa é a rota (ela barra mexer na **própria** conta, porque trancar a
   * si mesmo fora do painel é irreversível pela própria interface), e a mensagem
   * sai pelo `apiErrorMessage` como em todo o resto.
   */
  async function apply(user: AdminUserRecord, kind: 'role' | 'status'): Promise<void> {
    setFailure(null);
    try {
      await api.adminUpdateUser(
        user._id,
        kind === 'role'
          ? { role: user.role === 'admin' ? 'player' : 'admin' }
          : { status: user.status === 'suspended' ? 'active' : 'suspended' },
      );
      reload();
    } catch (err) {
      setFailure(apiErrorMessage(err, t));
      throw err;
    }
  }

  /**
   * Esconde ou revela a pessoa na **descoberta** · vitrine, busca, convite e o
   * perfil público, num interruptor só.
   *
   * **É privacidade, e não operação** · ele mexe no `privateProfile`, e nunca no
   * `serviceAccount`, que diz outra coisa sobre a conta (*"isto não é gente"*).
   * Nasceu de um caso concreto em 28/08/2026: parente do Eduardo com conta na
   * plataforma e o perfil exposto pra qualquer um.
   *
   * **Sem confirmação, ao contrário das duas de cima** · isto se desfaz no mesmo
   * botão e não tira sessão de ninguém. E **sem guarda de conta própria**: a
   * rota barra `role` e `status` porque trancar a si mesmo fora do painel é
   * irreversível pela interface, e este não é.
   *
   * **Não é ferramenta de moderação** · quem pune é o `status`. Esconder alguém
   * daqui deixaria a pessoa entrando e jogando com o perfil invisível, que não
   * é punição nem transparência.
   */
  async function togglePrivateProfile(user: AdminUserRecord): Promise<void> {
    setFailure(null);
    try {
      await api.adminUpdateUser(user._id, { privateProfile: !user.privateProfile });
      reload();
    } catch (err) {
      setFailure(apiErrorMessage(err, t));
    }
  }

  return (
    <PageStack>
      <PageHeader
        title={t('admin.users')}
        // **Sem contagem quando não há o que contar** · "mostrando 0 de 0" é a
        // tela repetindo, em números, o que o vazio já diz em palavras.
        subtitle={
          users === null || total === 0
            ? undefined
            : t('admin.usersCount', { shown: users.length, count: total })
        }
      />

      <SearchField
        value={query}
        onChange={(value) => {
          setQuery(value);
          // Buscar de novo recomeça a lista · sem isto a página 3 de uma busca
          // antiga vira o teto da busca nova.
          setShown(PAGE);
        }}
        placeholder={t('admin.usersSearch')}
        label={t('admin.usersSearch')}
        className="max-w-sm"
      />

      {failure && <p className="text-sm text-destructive">{failure}</p>}

      {/* **Falha não é ausência** · com a lista vazia a organização fecha a aba
          achando que não há conta nenhuma. É a mesma regra da lista de edições. */}
      {failed && (
        <EmptyState
          icon={Users}
          title={t('tournament.failureTitle')}
          description={t('tournament.listFailureBody')}
          action={{ onClick: () => reload(), label: t('tournament.retry') }}
        />
      )}

      {/**
       * **Enquanto a lista não chega, a tela dizia nada** · achado ao capturar
       * em 28/08/2026: a captura pegou o instante anterior à resposta e o que
       * apareceu foi o título e a busca, com o corpo em branco e **sem
       * explicação nenhuma**.
       *
       * `users === null` é *"ainda não sei"*, e é diferente de lista vazia (que
       * já tem a sua própria tela) e de falha (que tem a dela). Os três estados
       * existiam no estado interno e só dois chegavam à tela.
       */}
      {users === null && !failed && <LoadingState label={t('admin.users')} />}

      {!failed && users?.length === 0 && (
        <EmptyState
          icon={Users}
          title={term ? t('admin.usersNoMatchTitle') : t('admin.emptyTitle')}
          description={term ? t('admin.usersNoMatchBody', { term }) : t('admin.emptyBody')}
        />
      )}

      {users && users.length > 0 && (
        <>
          {/* Em celular, cartão lê melhor que tabela rolando de lado · a tabela
              continua sendo a visão de trabalho no desktop. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {users.map((user) => (
              <li key={user._id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.displayName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      <ProfileLink user={user} />
                    </p>
                  </div>
                  <RoleBadge role={user.role} />
                </div>
                <p className="mt-3 truncate text-sm text-muted-foreground">{user.email}</p>
                {/* O telefone acompanha o e-mail no cartão pelo mesmo motivo da
                    tabela · são a mesma pergunta. */}
                {user.phone ? (
                  <p className="truncate text-xs text-muted-foreground">{phoneLabel(user.phone)}</p>
                ) : null}
                {/* **O cartão carrega o mesmo que a tabela** · a coluna some no
                    celular, e o que ela dizia não pode sumir junto: quem
                    organiza pelo telefone precisa da mesma resposta. */}
                <div className="mt-2 flex flex-col gap-1">
                  <ClubLinks user={user} />
                  {/**
                   * **Sem campeonato o cartão não desenha nada** · na tabela o
                   * ponto marca a célula vazia e faz sentido na grade; solto
                   * num cartão ele vira um órfão numa linha só pra si.
                   *
                   * Ternário e não `&&` com comparação: o `scan:strings` lê o
                   * que está entre um `>` e um `<` como texto de tela, e a
                   * comparação plantava um falso positivo.
                   */}
                  {user.tournaments.length ? <TournamentLinks user={user} /> : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('admin.sinceLine', { when: formatShortDate(user.createdAt) })}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={user.status} />
                  <HiddenBadge user={user} />
                  <Actions
                    user={user}
                    onAsk={(kind) => setAsking({ user, kind })}
                    onTogglePrivate={() => void togglePrivateProfile(user)}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto overscroll-x-contain rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-secondary/40 text-left">
                <tr>
                  <Th>{t('admin.colName')}</Th>
                  <Th>{t('admin.colHandle')}</Th>
                  <Th>{t('admin.colEmail')}</Th>
                  {/* **Club, campeonato e desde quando** · 28/08/2026, pedido do
                      Eduardo. A tabela respondia *"esta conta existe"*, e o
                      trabalho de quem organiza começa em *"quem é essa
                      pessoa"* · sem isso, cada linha custava três telas. */}
                  <Th>{t('admin.colClubs')}</Th>
                  <Th>{t('admin.colTournaments')}</Th>
                  <Th>{t('admin.colSince')}</Th>
                  <Th>{t('admin.colRole')}</Th>
                  <Th>{t('admin.colStatus')}</Th>
                  {/* A coluna de ação não tem rótulo · o que ela faz está escrito
                      em cada botão, e um cabeçalho "ações" só ocupa largura. */}
                  <Th>{''}</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b last:border-0">
                    {/**
                     * **Nome e nick não quebram** · com oito colunas a tabela
                     * espremia um nome de duas sílabas em duas linhas, e cada
                     * linha passava de 150px de altura. Quem rola aqui procura
                     * uma pessoa numa lista de 92 · linha alta é lista curta.
                     */}
                    <td className="whitespace-nowrap px-4 py-3">{user.displayName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      <ProfileLink user={user} />
                    </td>
                    {/* O e-mail é a coluna mais larga e a menos usada pra
                        identificar (o @handle já faz isso) · trunca, e o inteiro
                        fica no `title`.

                        **O telefone entra AQUI e não numa nona coluna** · são a
                        mesma coisa (como falar com a pessoa), e a tabela já
                        estava apertada com oito. Abrir coluna nova empurraria as
                        de club e campeonato, que é onde o trabalho acontece. */}
                    <td className="max-w-[200px] px-4 py-3 text-muted-foreground">
                      <span className="block truncate" title={user.email}>
                        {user.email}
                      </span>
                      {/* **Sem telefone não desenha nada** · uma linha dizendo
                          "sem telefone" em quase toda linha da tabela vira
                          parede, e a ausência já se lê pela falta. */}
                      {user.phone ? (
                        <span className="mt-0.5 block truncate text-xs" title={phoneLabel(user.phone)}>
                          {phoneLabel(user.phone)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <ClubLinks user={user} />
                    </td>
                    <td className="px-4 py-3">
                      <TournamentLinks user={user} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatShortDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={user.status} />
                        <HiddenBadge user={user} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Actions
                          user={user}
                          onAsk={(kind) => setAsking({ user, kind })}
                          onTogglePrivate={() => void togglePrivateProfile(user)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* **O corte é dito, e tem saída** · lista que para em 50 sem avisar é
              a tela escondendo dois terços das contas. */}
          {users.length < total && (
            <Button variant="outline" size="sm" onClick={() => setShown((n) => n + PAGE)}>
              {t('admin.usersMore', { count: Math.min(PAGE, total - users.length) })}
            </Button>
          )}
        </>
      )}

      {/**
       * **As duas ações perguntam antes**, e não é cerimônia: promover a admin dá
       * a alguém o painel inteiro, e suspender **derruba a sessão da pessoa na
       * hora** (a rota revoga o token). Nenhuma das duas se desfaz sozinha.
       */}
      <ConfirmDialog
        open={asking !== null}
        onOpenChange={(next) => {
          if (!next) setAsking(null);
        }}
        // **Só suspender é destrutivo** · promover e reativar não tiram nada de
        // ninguém, e vermelho em tudo faz o vermelho parar de significar algo.
        tone={
          asking?.kind === 'status' && asking.user.status !== 'suspended'
            ? 'destructive'
            : undefined
        }
        title={t(askTitle(asking))}
        description={t(askBody(asking), { name: asking?.user.displayName ?? '' })}
        confirmLabel={t(askTitle(asking))}
        onConfirm={async () => {
          if (!asking) return;
          await apply(asking.user, asking.kind);
          setAsking(null);
        }}
      />
    </PageStack>
  );
}

/** Qual das quatro perguntas · a chave é literal, porque o catálogo é tipado. */
function askTitle(asking: { user: AdminUserRecord; kind: 'role' | 'status' } | null) {
  if (asking?.kind === 'role') {
    return asking.user.role === 'admin'
      ? ('admin.demoteTitle' as const)
      : ('admin.promoteTitle' as const);
  }
  return asking?.user.status === 'suspended'
    ? ('admin.reinstateTitle' as const)
    : ('admin.suspendTitle' as const);
}

function askBody(asking: { user: AdminUserRecord; kind: 'role' | 'status' } | null) {
  if (asking?.kind === 'role') {
    return asking.user.role === 'admin'
      ? ('admin.demoteBody' as const)
      : ('admin.promoteBody' as const);
  }
  return asking?.user.status === 'suspended'
    ? ('admin.reinstateBody' as const)
    : ('admin.suspendBody' as const);
}

/**
 * O papel no elenco, pro catálogo · **chave literal, porque ele é tipado.**
 *
 * Montar `club.role${x}` por interpolação passaria pelo compilador e falharia
 * na tela, que é o oposto do que o catálogo tipado existe pra fazer.
 */
const ROLE_KEY = {
  owner: 'club.roleOwner',
  manager: 'club.roleManager',
  member: 'club.roleMember',
} as const;

/**
 * O `@handle` vira a porta pro perfil · 28/08/2026.
 *
 * **`/app/players/:handle`, e não a página pública** · quem está no painel está
 * logado, e mandar a organização pra fora do app custaria a volta. É o mesmo
 * critério do elenco do club, que já escolhe o destino pelo lugar de onde é
 * lido.
 *
 * **Conta sem `@handle` não vira link** · ela existe (é quem entrou e não
 * terminou o cadastro), e um link pra um perfil que não existe é o defeito da
 * pendência 148 sendo repetido de propósito.
 */
function ProfileLink({ user }: { user: AdminUserRecord }) {
  if (!user.handle) return <span className="text-muted-foreground">·</span>;
  return (
    <Link to={appPlayerPath(user.handle)} className="hover:text-primary hover:underline">
      @{user.handle}
    </Link>
  );
}

/**
 * Os clubs da pessoa, com **o cargo e a posição** · e cada um é link.
 *
 * **A braçadeira aparece junto do papel, e não no lugar dele** · é a regra do
 * `membershipSchema`: o capitão daqui é ilustrativo e pode ser gerente ao mesmo
 * tempo, então escolher um apagaria o outro.
 */
function ClubLinks({ user }: { user: AdminUserRecord }) {
  const { t } = useTranslation();
  if (user.clubs.length === 0) {
    return <span className="text-xs text-muted-foreground">{t('admin.noClub')}</span>;
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {user.clubs.map((club) => (
        <li key={club.tag} className="text-xs">
          <Link
            to={appClubPath(club.tag)}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {club.name}
          </Link>{' '}
          <span className="text-muted-foreground">
            {t(ROLE_KEY[club.role])}
            {/* A braçadeira **junto** do papel · o capitão pode ser gerente. */}
            {club.isCaptain && ` · ${t('club.roleCaptain')}`}
            {club.position && ` · ${t(`position.${club.position}`)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** As edições vivas em que os clubs da pessoa estão inscritos · ver `adminUserRow`. */
function TournamentLinks({ user }: { user: AdminUserRecord }) {
  const { t } = useTranslation();
  if (user.tournaments.length === 0) {
    return <span className="text-xs text-muted-foreground">{t('admin.noTournament')}</span>;
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {user.tournaments.map((one) => (
        <li key={one.slug} className="text-xs">
          <Link
            to={adminTournamentPath(one.slug)}
            className="hover:text-primary hover:underline"
          >
            {one.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </th>
  );
}

/**
 * **O papel e o status traduzidos** · eles saíam crus do banco (`player`,
 * `active`), em inglês, numa tela em português. É a regra de i18n furada no
 * lugar mais visível do painel.
 */
/**
 * **Selo só no que é exceção** · 19/08/2026, e é a regra da marca aplicada a uma
 * tabela: com "PLAYER" e "ATIVA" em toda linha, a coluna virava uma parede de
 * cor e o que importa (quem é admin, quem está suspenso) deixava de saltar.
 *
 * O normal vira texto apagado; o excepcional vira selo. É "verde marca, branco
 * sustenta" numa lista de 148.
 */
function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation();
  if (!roleEnum.safeParse(role).success) return <Badge variant="muted">{role}</Badge>;
  if (role !== 'admin') {
    return <span className="text-xs text-muted-foreground">{t('admin.rolePlayer')}</span>;
  }
  return <Badge>{t('admin.roleAdmin')}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  if (!accountStatus.safeParse(status).success) return <Badge variant="muted">{status}</Badge>;
  if (status === 'suspended') return <Badge variant="warning">{t('admin.statusSuspended')}</Badge>;
  return <span className="text-xs text-muted-foreground">{t('admin.statusActive')}</span>;
}

/**
 * O selo de conta escondida · **só o excepcional vira selo**, que é a mesma
 * régua do papel e do status nesta tela: "player" e "ativa" viravam parede de
 * cor em 148 linhas.
 */
function HiddenBadge({ user }: { user: AdminUserRecord }) {
  const { t } = useTranslation();

  /**
   * **As duas marcas aparecem, e com nomes diferentes** · o Eduardo perguntou
   * em 28/08/2026 por que as contas `@agent-*` **não** apareciam como
   * escondidas, estando escondidas do produto. Estavam: por `serviceAccount`,
   * que o selo não olhava.
   *
   * Mostrar só uma delas fazia o painel **mentir por omissão** · a organização
   * via uma conta sem marca nenhuma e concluía que ela aparece na vitrine.
   *
   * **E os nomes continuam diferentes de propósito** · o botão só mexe no
   * `privateProfile` (privacidade de uma pessoa), e "de serviço" é o que o
   * `pnpm seed` marca nas contas do projeto. Juntar os rótulos apagaria a
   * distinção que os dois campos existem pra manter.
   */
  if (user.serviceAccount === true) {
    return (
      <Badge variant="muted" title={t('admin.serviceTitle')}>
        {t('admin.serviceBadge')}
      </Badge>
    );
  }
  if (user.privateProfile !== true) return null;
  return (
    <Badge variant="muted" title={t('admin.hiddenTitle')}>
      {t('admin.hiddenBadge')}
    </Badge>
  );
}

/**
 * As ações da linha · **num menu, e não em três botões soltos.**
 *
 * **Eram três botões com texto, e o modelo era o errado.** Quando a tabela
 * ganhou club, campeonato e data em 28/08/2026, eles passaram a custar ~450px
 * de uma linha que agora carrega informação de verdade · o nome quebrava em
 * duas linhas, o club em três, e ainda assim o último botão saía cortado pela
 * direita. **Dois ajustes de medida não resolveram**, que é o sinal de trocar a
 * abordagem em vez de tentar o terceiro.
 *
 * **É o padrão que a casa já usa** onde uma linha tem mais de uma ação · o
 * `squad-member-actions` do elenco faz igual, e pela mesma razão.
 *
 * **O que NÃO mudou é o que decide:** esconder continua sem confirmação (é
 * reversível no mesmo clique), promover e suspender continuam perguntando, e a
 * conta de serviço continua com o item desligado **dizendo por quê**.
 */
function Actions({
  user,
  onAsk,
  onTogglePrivate,
}: {
  user: AdminUserRecord;
  onAsk: (kind: 'role' | 'status') => void;
  onTogglePrivate: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';
  const suspended = user.status === 'suspended';
  const hidden = user.privateProfile === true;
  /** Conta do projeto · ela some do produto por outro campo, e o item não o toca. */
  const isService = user.serviceAccount === true;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t('admin.rowActions', { name: user.displayName })}
        // Marca o gatilho pra a linha ser alcançável de fora, como no elenco ·
        // é o que um probe usa pra abrir o menu de uma conta específica.
        data-user-menu={user.handle ?? user._id}
        className="touch-target grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-52 overflow-hidden rounded-xl border bg-popover p-1 shadow-2xl data-[state=open]:animate-fade-in motion-reduce:animate-none"
        >
          {/* **Ver o perfil abre o menu** · é o único item que não muda nada, e
              quem abre isto costuma querer olhar quem é antes de decidir. É a
              mesma ordem do menu do elenco. */}
          {user.handle && (
            <MenuItem
              icon={User}
              label={t('club.viewProfile')}
              onSelect={() => void navigate(appPlayerPath(user.handle ?? ''))}
            />
          )}
          <MenuItem
            icon={hidden ? Eye : EyeOff}
            label={t(hidden ? 'admin.reveal' : 'admin.hide')}
            disabled={isService}
            hint={isService ? t('admin.serviceTitle') : undefined}
            onSelect={onTogglePrivate}
          />
          <MenuItem
            icon={isAdmin ? UserMinus : UserPlus}
            label={t(isAdmin ? 'admin.demote' : 'admin.promote')}
            onSelect={() => onAsk('role')}
          />
          {/* **O vermelho mora aqui e na confirmação** · na linha ele repetia em
              92 delas, e cor de alerta que aparece sempre deixa de alertar. Num
              menu que só abre quando alguém quer agir, ele volta a significar. */}
          <MenuItem
            icon={suspended ? ShieldCheck : ShieldOff}
            label={t(suspended ? 'admin.reinstate' : 'admin.suspend')}
            tone={suspended ? undefined : 'destructive'}
            onSelect={() => onAsk('status')}
          />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * Um item do menu · a mesma forma do `squad-member-actions`.
 *
 * **Item desligado diz por quê** · é a regra da casa (controle inerte sem
 * explicação lê como tela quebrada), e aqui ela vale pra conta de serviço, que
 * já está escondida por outro campo.
 */
function MenuItem({
  icon: Icon,
  label,
  onSelect,
  tone,
  disabled,
  hint,
}: {
  icon: typeof Eye;
  label: string;
  onSelect: () => void;
  tone?: 'destructive';
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      title={hint}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm outline-hidden',
        'data-[highlighted]:bg-secondary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        tone === 'destructive' ? 'text-destructive' : 'text-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </DropdownMenu.Item>
  );
}
