import {
  AlertTriangle,
  FileText,
  Mail,
  MailWarning,
  MessageSquare,
  Scale,
  Shield,
  ShieldOff,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  ADMIN_EVENT,
  ADMIN_REALTIME_TOPIC,
  adminPresenceEvent,
  BOUNCE_ALERT_RATE,
  COMPLAINT_ALERT_RATE,
} from '@ggclubs/schemas';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { PageStack } from '@/components/ui/page-stack';
import { SkeletonBar, SkeletonGroup } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { api } from '@/lib/api';
import { CHAT_PARAM } from '@/lib/chat-link';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';
import { useRealtimeTopic } from '@/lib/realtime/use-realtime-topic';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useResource } from '@/lib/use-resource';

/**
 * O painel que abre a área de admin.
 *
 * ## O que entra aqui, e o critério
 *
 * **Painel bom responde "preciso fazer alguma coisa agora?", não "quantos
 * registros existem".** Contagem sozinha é enfeite: ninguém age por saber que
 * há 94 contas. O que faz alguém agir é o que está **fora do normal** ou o que
 * está **faltando**.
 *
 * Por isso ele tem duas metades. Em cima, o tamanho do produto, que dá contexto
 * e muda devagar. Embaixo, **o que pede ação**: conta suspensa e documento legal
 * que ainda não foi publicado · esse segundo bloqueia o login com Google sair do
 * modo de teste, e é o tipo de pendência que some da cabeça de todo mundo.
 *
 * **O que eu deliberadamente não pus:** gráfico de crescimento e "últimos
 * cadastros". Os dois parecem painel de verdade e não mudam decisão nenhuma
 * hoje · com 94 contas, a lista de usuários responde melhor e já existe. Quando
 * houver volume que a lista não dê conta, aí eles se pagam.
 */
export function AdminOverviewPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('admin.overview'));

  /**
   * **Falhar aqui é silêncio** · o painel é leitura, e um vermelho na home do
   * admin por causa de um número que não veio conta uma história pior que o
   * número faltando. O `error` é ignorado de propósito.
   */
  const { data, reload, setData } = useResource(
    (signal) => api.getAdminOverview({ signal }),
    [],
  );
  /**
   * **Quem chamou a organização e ainda espera** · uma linha no painel, e não
   * uma tela. Ele derrubou a tela em 27/08/2026 · *"como já tem os chats em
   * /admin/campeonatos/copa-2026, realmente precisa ter o /admin/conversas?"*.
   *
   * Não precisava: esta seção já existe, e o comentário dela já dizia o que
   * fazer · *"a linha cresce, em vez de virar tela nova"*.
   */
  const { data: callingOrNull } = useResource(
    (signal) => api.adminChats({ signal }).then(({ chats }) => chats),
    [],
  );
  const calling = callingOrNull ?? [];


  /**
   * **O aviso de entrega é o que pede ação aqui**, e ele só acende com o
   * desfecho · que chega pelo webhook depois do envio. Sem isto, a home mostra
   * a taxa de quando a página abriu.
   */
  useRealtimeRefresh(ADMIN_REALTIME_TOPIC, [ADMIN_EVENT.emails], reload);

  /**
   * **A contagem anda sozinha** · bloco 11, e ela é a única tela do produto onde
   * o dado muda **sem ninguém agir**. É por isso que ela vale mesmo sendo
   * secundária: um defeito de entrega aparece aqui na hora e de graça, enquanto
   * no resto do produto o modo de falha do canal é o silêncio.
   *
   * **O número vem no evento, e a tela não busca nada** · é a mesma exceção do
   * sininho, e pela mesma razão: buscar o painel inteiro a cada conexão que abre
   * seria consulta ao Mongo por gente entrando.
   *
   * **O tópico é de papel** (`admin:realtime`), e quem confere é o servidor,
   * olhando o documento em `users` · não o claim que o cliente carrega.
   */
  useRealtimeTopic(ADMIN_REALTIME_TOPIC, (event) => {
    if (event.kind !== 'changed' || event.type !== ADMIN_EVENT.presence) return;
    const parsed = adminPresenceEvent.safeParse(event.data);
    if (!parsed.success) return;
    setData((current) => (current ? { ...current, realtime: parsed.data } : current));
  });

  // O cabeçalho não depende de dado nenhum, então ele pinta antes · sem isto a
  // tela inteira, título incluído, aparecia de uma vez depois da resposta.
  const header = <PageHeader title={t('admin.overview')} subtitle={t('admin.overviewSubtitle')} />;

  if (!data) {
    return (
      <PageStack>
        {header}
        <div role="status" aria-live="polite" aria-label={t('common.loading')}>
          <SkeletonGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} className="space-y-3 rounded-xl border bg-card p-4">
                <SkeletonBar className="h-3 w-24 bg-secondary/70" />
                <SkeletonBar className="h-7 w-16" />
              </span>
            ))}
          </SkeletonGroup>
        </div>
      </PageStack>
    );
  }

  /** O que espera a organização nas edições vivas · vazio numa API antiga. */
  const attention = data.attention ?? [];
  /**
   * **Só acende com envio de verdade** · uma base com dois e-mails e um bounce
   * dá 50%, e isso não é sinal, é ruído. O piso de 20 é o que separa "a taxa
   * subiu" de "ainda não há taxa".
   */
  const email = data.email;
  const emailAlert =
    !!email &&
    email.sent >= 20 &&
    (email.bounceRate > BOUNCE_ALERT_RATE || email.complaintRate > COMPLAINT_ALERT_RATE);
  const missingLegal = [
    !data.legal.terms && t('legal.termsTitle'),
    !data.legal.privacy && t('legal.privacyTitle'),
  ].filter(Boolean);

  return (
    <PageStack>
      {header}

      {/**
       * **Cinco colunas a partir de `lg`, e não quatro** · com o card de e-mail
       * a grade de quatro deixava o quinto sozinho numa linha, com três colunas
       * de vazio ao lado. Medido na captura de 21/08/2026, a 1280.
       *
       * Abaixo disso continuam duas, que é o que cabe · o card tem rótulo, ícone
       * e um número grande, e a 390 três já espremeriam o número.
       */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={t('admin.statUsers')} value={data.users.total} icon={Users} />
        <StatCard label={t('admin.statNewUsers')} value={data.users.lastWeek} icon={UserPlus} />
        <StatCard label={t('admin.statClubs')} value={data.clubs.active} icon={Shield} />
        <StatCard label={t('admin.statClosedClubs')} value={data.clubs.deleted} icon={ShieldOff} />
        {/* **O e-mail entra aqui como contexto** · o que pede ação é a TAXA, e
            ela mora no bloco de baixo. Volume sozinho não faz ninguém agir. */}
        <StatCard label={t('admin.statEmails')} value={data.email?.sent ?? 0} icon={Mail} />
      </div>

      {/* **Linha discreta, e não um quinto card.** O critério deste painel está
          no comentário do topo, e este número não o atende: com o tráfego de
          hoje, **zero conexões é o estado normal** na maior parte do dia.

          Ele é diagnóstico, pra quando você **sabe** que alguém deveria estar
          conectado (você, com o app aberto) e vê zero · e é o único jeito de
          enxergar o cliente falhando, porque o modo de falha dele é o silêncio:
          ele reconecta pra sempre, sem erro em tela nenhuma.

          Quando o barramento de eventos existir, é aqui que entram tópico e
          inscritos · a linha cresce, em vez de virar tela nova. */}
      {data.realtime && (
        <p className="text-xs text-muted-foreground">
          {t('admin.realtimeNow', {
            connections: data.realtime.connections,
            accounts: data.realtime.accounts,
          })}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('admin.needsAction')}
        </h2>

        {/* **A ausência de pendência é um estado, e ele se desenha.** Um painel
            que fica em branco quando está tudo bem lê como tela quebrada · é a
            mesma regra de reserva ser design. */}
        {data.users.suspended === 0 &&
        missingLegal.length === 0 &&
        attention.length === 0 &&
        calling.length === 0 &&
        !emailAlert ? (
          <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            {t('admin.allClear')}
          </p>
        ) : (
          <ul className="space-y-2">
            {/**
             * **O trabalho de campeonato vem primeiro** · 19/08/2026.
             *
             * Esta lista olhava **conta suspensa e documento legal**, e mais
             * nada · duas coisas que quase nunca mudam. O que espera a
             * organização todo dia é edição, e ela não aparecia em lugar
             * nenhum: descobrir uma disputa aberta era abrir edição por edição.
             *
             * **Ele vem antes dos outros dois** porque é o único com relógio
             * correndo · uma partida em disputa é dois clubs parados esperando
             * alguém desempatar.
             */}
            {/**
             * **Chamado da sala vem antes de tudo** · é o único item da lista
             * com **duas pessoas paradas esperando** do outro lado, e ele some
             * sozinho quando a organização abre a conversa.
             */}
            {calling.map((room) => (
              <li
                key={room.matchId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <MessageSquare className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {t('admin.tournaments.chatCallingTitle', {
                      home: room.homeTag.toUpperCase(),
                      away: room.awayTag.toUpperCase(),
                    })}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {room.tournamentName}
                  </span>
                </span>
                <Button asChild variant="ctaOutline" size="sm">
                  <Link
                    to={`/admin/campeonatos/${room.tournamentSlug}?${CHAT_PARAM}=${room.matchId}`}
                  >
                    {t('admin.tournaments.chatCallingAction')}
                  </Link>
                </Button>
              </li>
            ))}
            {attention.map((edition) => (
              <li
                key={edition.slug}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Scale className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                    {edition.name}
                  </span>
                  {/**
                   * **Os três motivos numa linha, separados por ponto** ·
                   * `stuck` entrou em 28/08/2026 e é o que a mesa de partidas
                   * paradas resolve.
                   *
                   * A junção sai de uma lista filtrada, e não de ternários
                   * encadeados: com três motivos, o *"põe o separador se o
                   * anterior existir"* vira quatro condições que ninguém lê ·
                   * e o quarto motivo, um dia, viraria oito.
                   */}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {[
                      edition.disputes > 0
                        ? t('admin.attentionDisputes', { count: edition.disputes })
                        : null,
                      (edition.stuck ?? 0) > 0
                        ? t('admin.attentionStuck', { count: edition.stuck ?? 0 })
                        : null,
                      edition.awaitingDraw ? t('admin.attentionDraw') : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/admin/campeonatos/${edition.slug}`}>
                    {t('admin.tournaments.manage')}
                  </Link>
                </Button>
              </li>
            ))}
            {/**
             * **A taxa de retorno acima do limiar do alarme** · e ela vem logo
             * depois do campeonato porque também tem relógio correndo: bounce
             * alto derruba a reputação da conta AWS **inteira**, que é
             * compartilhada com o Dobrou.
             *
             * **O limiar é o MESMO do alarme do CloudWatch** (a constante mora
             * no schema) · dois números pra mesma pergunta divergem no dia em
             * que alguém ajustar um deles.
             */}
            {emailAlert && (
              <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <MailWarning className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                    {t('admin.emails.alertTitle')}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t('admin.emails.alertDetail', {
                      bounce: Math.round((data.email?.bounceRate ?? 0) * 1000) / 10,
                      complaint: Math.round((data.email?.complaintRate ?? 0) * 1000) / 10,
                    })}
                  </span>
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/emails">{t('admin.emails.title')}</Link>
                </Button>
              </li>
            )}
            {data.users.suspended > 0 && (
              <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <span className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  {t('admin.suspendedAccounts', { count: data.users.suspended })}
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/usuarios">{t('admin.users')}</Link>
                </Button>
              </li>
            )}
            {missingLegal.length > 0 && (
              <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {t('admin.legalMissingDoc', { docs: missingLegal.join(', ') })}
                  </span>
                  {/* Diz **por que importa**, senão vira item de lista que
                      ninguém prioriza · sem as duas URLs o login com Google não
                      sai do modo de teste. */}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {t('admin.legalMissingWhy')}
                  </span>
                </span>
                <Button asChild variant="ctaOutline" size="sm">
                  <Link to="/admin/legal">{t('admin.legalPublish')}</Link>
                </Button>
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('admin.legalTitle')}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(['terms', 'privacy'] as const).map((kind) => {
            const doc = data.legal[kind];
            return (
              <li key={kind} className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold">
                  {t(kind === 'terms' ? 'legal.termsTitle' : 'legal.privacyTitle')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {doc
                    ? t('admin.legalCurrent', {
                        version: doc.version,
                        date: new Date(doc.publishedAt).toLocaleDateString(),
                      })
                    : t('admin.legalNeverPublished')}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </PageStack>
  );
}
