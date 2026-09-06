import {
  ADMIN_EVENT,
  ADMIN_REALTIME_TOPIC,
  emailStatus as emailStatusEnum,
  REPLY_MAX,
  type EmailStatus,
} from '@ggclubs/schemas';
import {
  ChevronDown,
  CornerUpLeft,
  MailCheck,
  MailWarning,
  MailX,
  PenLine,
  Send,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { familyOf } from './email-family';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { PageStack } from '@/components/ui/page-stack';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { SectionTitle } from '@/components/ui/section-title';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api, type InboxMessageRecord } from '@/lib/api';
import { useRealtimeRefresh } from '@/lib/realtime/use-realtime-refresh';
import { apiErrorMessage } from '@/lib/api-error';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useResource } from '@/lib/use-resource';

/**
 * O e-mail, do lado de quem opera · **as duas metades no mesmo lugar.**
 *
 * **"Enviado" não é "chegou", e essa distinção é a tela inteira.** Um painel que
 * mostrasse só o que o `mailer` tentou mandar afirmaria entrega onde houve
 * bounce · e bounce é o que custa a reputação da conta AWS **inteira**, que é
 * compartilhada com o Dobrou. Por isso o desfecho vem do SES, por webhook.
 *
 * **A caixa recebida é texto puro, sempre** · é conteúdo que um estranho
 * escreveu, renderizado no painel de **admin**. HTML de fora aqui é XSS com a
 * sessão mais poderosa do produto.
 *
 * **Responder não tem campo de destinatário**, e essa ausência é decisão: o
 * destino é quem **já** escreveu. Um compositor livre seria o nosso domínio
 * autenticado atrás de um input aberto.
 */
const PAGE = 50;

/** O selo de cada desfecho · **só o excepcional ganha cor**, como no painel de contas. */
const STATUS_STYLE: Record<
  EmailStatus,
  { variant: 'default' | 'strong' | 'outline'; icon: typeof Send }
> = {
  sent: { variant: 'outline', icon: Send },
  delivered: { variant: 'outline', icon: MailCheck },
  bounced: { variant: 'strong', icon: MailX },
  complained: { variant: 'strong', icon: MailWarning },
  failed: { variant: 'strong', icon: MailX },
};


/**
 * O vazio de uma **seção**, e não de uma página.
 *
 * O `EmptyState` é peça de página inteira · usado aqui ele abria uma tela de
 * altura pra dizer "nenhum e-mail ainda", com a seção seguinte empurrada pra
 * fora da dobra. Medido na captura de 21/08/2026.
 *
 * A forma é a mesma do "nada esperando por você agora" da home do admin ·
 * **ausência é um estado, e ele se desenha**, mas no tamanho do que ele diz.
 */
function SectionEmpty({ children }: { children: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function AdminEmailsPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('admin.emails.title'));

  const [shown, setShown] = useState(PAGE);
  const [filter, setFilter] = useState<EmailStatus | null>(null);
  /** Falha de rede não é "nenhum e-mail" · são dois desfechos diferentes. */

  const [open, setOpen] = useState<InboxMessageRecord | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyResult, setReplyResult] = useState<{ id: string; message: string } | null>(null);

  /** O compositor · **com destinatário**, ao contrário do responder. */
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<{
    to: string;
    subject: string;
    text: string;
  }>({ to: '', subject: '', text: '' });
  const [composeResult, setComposeResult] = useState<string | null>(null);

  const { data, error, reload } = useResource(
    (signal) => api.adminListEmails({ limit: shown, ...(filter ? { status: filter } : {}) }, { signal }),
    [shown, filter],
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
  /** Falha de rede não é "nenhum e-mail" · são dois desfechos diferentes. */
  const failed = Boolean(error);
  const emails = failed ? [] : (data?.emails ?? null);
  const counts = data?.counts ?? {};
  const total = data?.total ?? 0;

  /**
   * **O desfecho não chega no envio, chega depois** · o SES conta entrega,
   * quique e reclamação pelo webhook, segundos ou minutos mais tarde. Sem isto
   * a linha afirma "enviado" até alguém recarregar, e **enviado não é
   * entregue** · é a distinção que fez a collection existir.
   *
   * Só a lista de enviados ouve. A caixa de entrada vem do S3, e nada do nosso
   * lado sabe quando alguém escreve pra gente.
   */
  useRealtimeRefresh(ADMIN_REALTIME_TOPIC, [ADMIN_EVENT.emails], reload);

  // **A caixa é uma busca separada, e falhar nela não derruba a de enviados** ·
  // ela fala com o S3, que é outro serviço e outra credencial.
  const { data: inboxData, error: inboxError } = useResource(
    (signal) => api.adminListInbox({ signal }).then((res) => res.messages),
    [],
  );
  const inbox = inboxError ? [] : inboxData;
  const inboxFailure = inboxError ? apiErrorMessage(inboxError, t) : null;

  /** Abre a mensagem, ou **fecha se ela já estava aberta** · era o que faltava. */
  async function toggleMessage(message: InboxMessageRecord): Promise<void> {
    if (open?.id === message.id) {
      setOpen(null);
      setReplyTo(null);
      return;
    }

    setOpen(message);
    setReplyTo(null);
    try {
      const res = await api.adminReadInboxMessage(message.id);
      setOpen(res.message);
    } catch {
      setOpen({ ...message, text: t('admin.emails.inboxReadFailed') });
    }
  }

  async function sendReply(id: string): Promise<void> {
    setSending(true);
    setReplyResult(null);
    try {
      await api.adminReplyToInboxMessage(id, replyText);
      setReplyResult({ id, message: t('admin.emails.replySent') });
      setReplyTo(null);
      setReplyText('');
      // A resposta é um envio · ela aparece na lista de cima como qualquer outro.
      reload();
    } catch (err) {
      setReplyResult({ id, message: apiErrorMessage(err, t) });
    } finally {
      setSending(false);
    }
  }

  async function send(): Promise<void> {
    setSending(true);
    setComposeResult(null);
    try {
      await api.adminSendEmail(draft);
      setComposeResult(t('admin.emails.composeSent'));
      setDraft({ to: '', subject: '', text: '' });
      setComposing(false);
      reload();
    } catch (err) {
      setComposeResult(apiErrorMessage(err, t));
    } finally {
      setSending(false);
    }
  }

  const canSend =
    draft.to.includes('@') && draft.subject.trim().length >= 2 && draft.text.trim().length >= 2;

  const bounceRate = total > 0 ? Math.round(((counts['bounced'] ?? 0) / total) * 1000) / 10 : 0;

  /**
   * Uma lista de mensagens · **extraída porque a caixa deixou de ser uma só.**
   *
   * Desde 23/08/2026 o que chega é separado em duas: o que **gente** escreveu
   * pro `contato@`, e os **relatórios** que provedores mandam pro `dmarc@`.
   * Repetir setenta linhas de JSX nas duas é a segunda cópia que diverge no
   * primeiro ajuste · e as duas abrem, respondem e mostram corpo igual.
   */
  /**
   * **Duas caixas, e o critério é o destinatário** · o `contato@` é gente
   * escrevendo, o `dmarc@` é relatório de máquina. Medido em 23/08/2026: a
   * caixa era **100% relatório**, e a primeira mensagem de uma pessoa ia chegar
   * no meio de XML compactado.
   */
  const fromPeople = (inbox ?? []).filter((m) => !m.automated);
  const fromMachines = (inbox ?? []).filter((m) => m.automated);

  function messageList(list: InboxMessageRecord[]) {
    return (
      <ul className="divide-y divide-border rounded-lg border border-border">
        {list.map((message) => {
          const isOpen = open?.id === message.id;
          return (
            <li key={message.id}>
              <button
                type="button"
                className="touch-target block w-full p-3 text-left text-sm hover:bg-secondary/40"
                onClick={() => void toggleMessage(message)}
                aria-expanded={isOpen}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="flex min-w-0 items-center gap-2 sm:flex-1">
                    {/* A seta gira · é o que diz que a linha abre E fecha, e
                        era o que faltava pra ela não parecer travada. */}
                    <ChevronDown
                      className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden
                    />
                    <span className="min-w-0 truncate font-medium">{message.subject}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-2 pl-6 text-xs text-muted-foreground sm:pl-0">
                    <span className="min-w-0 truncate">{message.from}</span>
                    <span className="shrink-0 tabular-nums">
                      {new Date(message.receivedAt).toLocaleString()}
                    </span>
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border bg-secondary/20 p-3">
                  {/**
                   * **Texto puro num `<pre>`, e nunca `dangerouslySetInnerHTML`.**
                   * O conteúdo é de terceiro e a sessão aqui é de admin · o
                   * React escapa por padrão, e é isso que se quer.
                   */}
                  <pre className="max-h-96 overflow-auto overscroll-contain whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
                    {open.text ?? t('common.loading')}
                  </pre>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReplyTo(replyTo === message.id ? null : message.id);
                        setReplyResult(null);
                      }}
                    >
                      <CornerUpLeft className="mr-2 h-3.5 w-3.5" aria-hidden />
                      {t('admin.emails.reply')}
                    </Button>
                  </div>

                  {replyTo === message.id && (
                    <div className="mt-3 space-y-2">
                      {/* **Sem campo de destinatário, de propósito** · a
                          resposta vai pra quem escreveu, e dizer isso na
                          tela é o que impede alguém procurar o campo. */}
                      <p className="text-xs text-muted-foreground">
                        {t('admin.emails.replyTo', { who: message.from })}
                      </p>
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        maxLength={REPLY_MAX}
                        rows={5}
                        className="min-h-32"
                        placeholder={t('admin.emails.replyPlaceholder')}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={sending || replyText.trim().length < 2}
                          onClick={() => void sendReply(message.id)}
                        >
                          {sending ? t('common.loading') : t('admin.emails.replySend')}
                        </Button>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {replyText.length}/{REPLY_MAX}
                        </span>
                      </div>
                    </div>
                  )}

                  {replyResult?.id === message.id && (
                    <p className="mt-2 text-xs text-muted-foreground">{replyResult.message}</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <PageStack>
      <PageHeader title={t('admin.emails.title')} subtitle={t('admin.emails.subtitle')} />

      {/**
       * **A taxa vem antes da lista**, e é a pergunta que abre esta tela · a AWS
       * revisa acima de 5% e pausa acima de 10%. Contar linha na página não
       * responde isso.
       */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={filter === null ? 'secondary' : 'ghost'}
          onClick={() => setFilter(null)}
        >
          {t('admin.emails.all')} · {total}
        </Button>
        {emailStatusEnum.options.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={filter === status ? 'secondary' : 'ghost'}
            onClick={() => setFilter(status)}
          >
            {t(`admin.emails.status.${status}`)} · {counts[status] ?? 0}
          </Button>
        ))}
      </div>

      {total > 0 && (
        <p className="text-sm text-muted-foreground">
          {t('admin.emails.bounceRate', { rate: bounceRate })}
        </p>
      )}

      {/**
       * **O compositor tem campo de destinatário, e isso é o que o distingue do
       * responder** · eu recomendei não ter, o Eduardo pediu, e ele existe com o
       * risco escrito no `sendFreeEmail`. As guardas que sobraram: só admin,
       * faixa `reaching`, a guarda de domínio do `mailer`, e **todo envio fica
       * registrado** na lista abaixo.
       */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant={composing ? 'secondary' : 'outline'}
          onClick={() => {
            setComposing((v) => !v);
            setComposeResult(null);
          }}
        >
          <PenLine className="mr-2 h-3.5 w-3.5" aria-hidden />
          {t('admin.emails.compose')}
        </Button>
      </div>

      {composing && (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          {/* **O seletor de caixa saiu em 24/08/2026** · o `noreply@` foi
              aposentado, e o motivo está no `fromAddress` do `mailer`: ele não
              recebe (o MX entrega só `contato@` e `dmarc@`), então escolher ele
              aqui era escolher uma porta fechada. Todo envio sai do `contato@`. */}
          <Input
            type="email"
            value={draft.to}
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            placeholder={t('admin.emails.composeTo')}
            aria-label={t('admin.emails.composeTo')}
          />
          <Input
            value={draft.subject}
            onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
            maxLength={120}
            placeholder={t('admin.emails.composeSubject')}
            aria-label={t('admin.emails.composeSubject')}
          />
          <Textarea
            value={draft.text}
            onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
            maxLength={REPLY_MAX}
            rows={6}
            className="min-h-36"
            placeholder={t('admin.emails.replyPlaceholder')}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={sending || !canSend} onClick={() => void send()}>
              {sending ? t('common.loading') : t('admin.emails.composeSend')}
            </Button>
            {/* **O que a guarda recusa, dito antes do clique** · descobrir isso
                por erro depois de escrever a mensagem é a pior ordem. */}
            <span className="text-xs text-muted-foreground">
              {t('admin.emails.hint.contact')}
            </span>
          </div>
        </div>
      )}

      {composeResult && <p className="text-sm text-muted-foreground">{composeResult}</p>}

      <section>
        <SectionTitle
          meta={
            emails && total > 0
              ? t('admin.emails.count', { shown: emails.length, count: total })
              : undefined
          }
        >
          {t('admin.emails.sent')}
        </SectionTitle>

        {failed ? (
          <SectionEmpty>{t('admin.emails.loadFailed')}</SectionEmpty>
        ) : emails && emails.length === 0 ? (
          <SectionEmpty>{t('admin.emails.empty')}</SectionEmpty>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {(emails ?? []).map((mail) => {
              const style = STATUS_STYLE[mail.status];
              const Icon = style.icon;
              return (
                /**
                 * **O assunto ganha a linha, e o resto desce** · medido a 390 em
                 * 21/08/2026: numa linha só o endereço comia a largura inteira e
                 * o assunto truncava em "Paga…", que é a informação invertida.
                 */
                <li key={mail._id} className="p-3 text-sm">
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    <div className="flex min-w-0 items-center gap-2 sm:flex-1">
                      <Badge variant={style.variant} className="shrink-0 gap-1">
                        <Icon className="size-3" aria-hidden />
                        {t(`admin.emails.status.${mail.status}`)}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate font-medium">{mail.subject}</span>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {new Date(mail.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Para quem, e por quê · o tipo exato fica no title, que é
                      onde quem precisa dele vai procurar. */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="truncate">{mail.to}</span>
                    <span aria-hidden>·</span>
                    <span title={mail.reason}>
                      {t(`admin.emails.family.${familyOf(mail.reason)}`)}
                    </span>
                    {mail.settledAt && (
                      <>
                        <span aria-hidden>·</span>
                        <span>
                          {t('admin.emails.settledAt', {
                            when: new Date(mail.settledAt).toLocaleString(),
                          })}
                        </span>
                      </>
                    )}
                  </div>

                  {/* O detalhe responde por que a mensagem não chegou · é a
                      razão de o campo existir no documento. */}
                  {mail.detail && (
                    <p className="mt-1 rounded bg-secondary/40 px-2 py-1 text-xs text-muted-foreground">
                      {mail.detail}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {emails && emails.length < total && (
          <Button variant="ghost" className="mt-3" onClick={() => setShown((n) => n + PAGE)}>
            {t('admin.emails.more')}
          </Button>
        )}
      </section>

      <section>
        <SectionTitle hint={t('admin.emails.inboxHint')}>{t('admin.emails.inbox')}</SectionTitle>

        {inboxFailure ? (
          <SectionEmpty>{inboxFailure}</SectionEmpty>
        ) : inbox && fromPeople.length === 0 ? (
          <SectionEmpty>
            {/* Vazia e vazia-com-relatorios sao estados diferentes · dizer
              "nenhuma mensagem recebida" com tres logo abaixo e a tela mentindo. */}
            {t(fromMachines.length > 0 ? 'admin.emails.inboxOnlyReports' : 'admin.emails.inboxEmpty')}
          </SectionEmpty>
        ) : (
          messageList(fromPeople)
        )}

        {/**
         * **Os relatórios ficam à parte, e fechados** · eles não são pra ler
         * todo dia: são XML de DMARC que provedor manda sozinho, e a única
         * pergunta que respondem é *"alguém está falsificando o domínio?"*.
         * Deixá-los na lista de cima enterra a mensagem de uma pessoa.
         */}
        {fromMachines.length > 0 && (
          <CollapsibleSection
            className="mt-6"
            title={t('admin.emails.reports')}
            meta={t('admin.emails.reportsCount', { count: fromMachines.length })}
          >
            {messageList(fromMachines)}
          </CollapsibleSection>
        )}
      </section>
    </PageStack>
  );
}
