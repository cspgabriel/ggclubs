import { z } from 'zod';
import { baseDocumentFields, emailLower, objectIdString } from './common.js';
import { notificationKind } from './notification.js';

/**
 * O que aconteceu com uma mensagem depois que ela saiu daqui.
 *
 * **"Enviado" não é "chegou", e essa distinção é a razão desta collection
 * existir.** Um painel que mostra só o que o `mailer` tentou mandar afirma
 * entrega onde houve **bounce** · e bounce é o desfecho que custa reputação, que
 * é da conta AWS **inteira** e compartilhada com o Dobrou.
 *
 * A ordem aqui é de certeza crescente sobre o destino, e cada degrau tem uma
 * fonte diferente:
 */
export const emailStatus = z.enum([
  /** O SES aceitou a mensagem · é o que **nós** sabemos, e só isso. */
  'sent',
  /**
   * O servidor do destinatário aceitou · vem do **event destination** do SES,
   * nunca de nós. É o único degrau que autoriza dizer "chegou".
   */
  'delivered',
  /**
   * Voltou · caixa que não existe, domínio errado, caixa cheia. **O desfecho
   * que a guarda do `mailer` existe pra evitar antes de acontecer.**
   */
  'bounced',
  /** A pessoa marcou como spam · pior que bounce pra reputação. */
  'complained',
  /**
   * Nem saiu · o `mailer` recusou (domínio bloqueado, envio desligado) ou a
   * chamada ao SES falhou. **Fica gravado**, porque "não saiu" é resposta pra
   * quem for perguntar por que alguém não recebeu.
   */
  'failed',
]);
export type EmailStatus = z.infer<typeof emailStatus>;

/**
 * Os limiares que **acendem** o painel · são **os mesmos dos alarmes do
 * CloudWatch**, de propósito.
 *
 * Dois números pra mesma pergunta divergem no dia em que alguém ajustar um deles
 * · aqui eles ficam escritos junto, e quem mexer no alarme sabe onde está o par.
 * A referência de cima é a AWS: ela **revisa** acima de 5% de bounce e **pausa**
 * acima de 10%, então 2% é margem pra agir antes de alguém de fora agir por nós.
 */
export const BOUNCE_ALERT_RATE = 0.02;
export const COMPLAINT_ALERT_RATE = 0.001;

/** Os desfechos que vêm de fora · quem os escreve é o webhook, nunca o `mailer`. */
export const EXTERNAL_EMAIL_STATUSES = ['delivered', 'bounced', 'complained'] as const;

/**
 * Por que aquela mensagem saiu.
 *
 * **Quase sempre é um tipo de aviso**, e por isso ele entra inteiro · assim o
 * painel filtra por "todos os `tournament.drawn`" sem manter uma segunda lista
 * que diverge da `NOTIFICATION_CHANNELS`.
 *
 * **`test` é o que o `send-test-email` manda** · ele não é aviso de ninguém, e
 * sem um valor próprio ele precisaria mentir sobre ser outra coisa.
 */
export const emailReason = z.union([
  notificationKind,
  z.literal('test'),
  /**
   * **A resposta que a organização mandou pela caixa** · ela não é aviso de
   * ninguém, e sem valor próprio precisaria mentir sobre ser outra coisa no
   * painel. É a mesma razão do `test`.
   */
  z.literal('reply'),
  /**
   * **A mensagem que a organização escreveu do zero**, pra um endereço digitado.
   *
   * Separada da `reply` de propósito · responder é reagir a quem procurou a
   * gente, e escrever é **iniciativa nossa**. É a diferença que importa no dia
   * de auditar o que saiu do domínio, e ela some se as duas dividirem o rótulo.
   */
  z.literal('compose'),
  /**
   * **A recuperação de senha** · desde 24/08/2026.
   *
   * Não é aviso e nunca vai ser: ela não entra na caixa do sininho (quem pediu
   * está **fora** da sessão, e um aviso lá dentro seria lido por ninguém) e não
   * respeita `emailNotifications` · desligar aviso não pode trancar a pessoa
   * fora da própria conta.
   *
   * **É a razão mais crítica do painel** · quando alguém disser "não consigo
   * entrar", é esta linha que responde se a mensagem saiu, e o `detail` do
   * bounce diz por que não chegou.
   */
  z.literal('password-reset'),
  /**
   * **O primeiro e-mail que a conta recebe**, no `POST /me`.
   *
   * Separado do `password-reset` porque os dois são transacionais e param aí ·
   * um é resposta a *"me deixa entrar"* e o outro é iniciativa nossa no minuto
   * do cadastro. No dia de olhar reputação, misturar os dois esconde qual dos
   * caminhos está gerando bounce.
   */
  z.literal('welcome'),
]);
export type EmailReason = z.infer<typeof emailReason>;

/**
 * O teto do detalhe · a referência é o `Diagnostic-Code` do SMTP, que a RFC 3463
 * mantém curto (uma linha de status mais texto). 500 cabe o que a AWS manda com
 * folga, e impede que um provedor verborrágico grave meio kilobyte por bounce.
 */
export const EMAIL_DETAIL_MAX = 500;

/**
 * O teto do texto de uma resposta da organização.
 *
 * **A referência é o que cabe numa resposta de suporte lida no celular** · 4000
 * caracteres são cerca de 600 palavras, e resposta maior que isso quer dizer que
 * o assunto pede uma chamada ou uma página, não um e-mail. O teto existe pra
 * impedir que um `paste` acidental vire uma mensagem de meio megabyte.
 */
export const REPLY_MAX = 4000;

/**
 * Uma mensagem que o produto tentou entregar.
 *
 * **Gravada pelo `mailer`, que já é o caminho único de envio** · qualquer
 * chamador novo entra no registro sozinho, sem ninguém lembrar. É a mesma razão
 * de o cabeçalho `List-Unsubscribe` morar lá.
 *
 * **O `providerMessageId` é a chave que liga isto ao mundo de fora** · é o id
 * que o SES devolve no envio e repete em cada evento, e é por ele que o webhook
 * acha o documento. Sem ele, desfecho que chega não tem onde pousar.
 */
export const emailSchema = z.object({
  ...baseDocumentFields,
  to: emailLower,
  /** A quem pertence aquele endereço · ausente no envio de teste. */
  userId: objectIdString.optional(),
  reason: emailReason,
  subject: z.string().min(1),
  status: emailStatus,
  /**
   * O id do SES · **ausente quando a mensagem nem saiu**, que é justamente o
   * caso `failed`. Por isso ele é opcional e o índice único é **parcial**.
   */
  providerMessageId: z.string().min(1).optional(),
  /**
   * Quando o desfecho de fora chegou · nulo enquanto a mensagem está só `sent`.
   * Separado do `updatedAt` porque este é do **documento** e aquele é do fato.
   */
  settledAt: z.coerce.date().nullable(),
  /**
   * O detalhe do desfecho, em texto · o motivo do bounce, ou o erro do envio.
   *
   * **Guardado porque é o que responde "por que não chegou"**, e essa pergunta
   * é a razão de alguém abrir este painel.
   */
  detail: z.string().max(EMAIL_DETAIL_MAX).nullable(),
});
export type Email = z.infer<typeof emailSchema>;

/**
 * A linha do painel · **é o documento inteiro**, e isso é deliberado.
 *
 * Não há campo interno pra esconder aqui: quem lê é admin, e o endereço é
 * justamente o dado que ele precisa ver. A view existe pra travar isso com
 * teste, como as outras · o dia em que o documento ganhar um campo que não deva
 * sair, a lista de chaves reprova.
 */
export const adminEmailView = emailSchema;
export type AdminEmailView = z.infer<typeof adminEmailView>;

/**
 * Uma mensagem **recebida** no `contato@`, lida do S3.
 *
 * **Não tem documento no banco, e não vai ter** · o S3 já é o armazenamento, e
 * copiar pro Mongo criaria uma segunda verdade que diverge no dia em que alguém
 * apagar de um lado. O que esta view descreve é o que a rota monta na hora.
 *
 * **O corpo é TEXTO PURO, sempre.** Isto é conteúdo que um estranho escreveu, e
 * ele é renderizado no painel de **admin** · HTML de fora ali dentro é XSS com
 * a sessão mais poderosa do produto. O renderizador de markdown **não serve**:
 * ele existe pra documento nosso, e o allowlist dele é sobre confiar na fonte.
 */
export const inboxMessageView = z.object({
  /** A chave no S3 · é o id, porque o objeto é a mensagem. */
  id: z.string().min(1),
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  receivedAt: z.coerce.date(),
  sizeBytes: z.number().int().nonnegative(),
  /**
   * **Relatório de máquina, e não gente escrevendo** · 23/08/2026.
   *
   * A caixa existe pra ler o que uma **pessoa** manda pro `contato@`. Só que o
   * MX do domínio entrega tudo no mesmo lugar, e o `dmarc@` recebe relatório
   * agregado de **todo provedor** que recebe e-mail nosso · Google, Amazon e
   * quem mais vier. Medido em 23/08: **a caixa era 100% relatório**, e a
   * primeira mensagem de gente ia chegar no meio de XML compactado.
   *
   * **Quem decide é o destinatário, não o remetente** · a lista de quem manda
   * relatório cresce sozinha e envelheceria em silêncio; o `dmarc@` existe
   * **só** pra isso, e é por isso que ele é o critério.
   */
  automated: z.boolean(),
  /** Só no detalhe · a lista não carrega corpo. */
  text: z.string().optional(),
});

/**
 * A caixa que existe pra relatório · e ela é uma só, hoje.
 *
 * Mora no schema porque a API classifica e a tela agrupa · a regra escrita duas
 * vezes é a regra que diverge, e aqui divergir é relatório aparecendo no meio
 * das mensagens de gente.
 */
export const REPORT_MAILBOXES = ['dmarc@'];

/** O destinatário é caixa de relatório? · `to` vem cru do cabeçalho. */
export function isAutomatedRecipient(to: string): boolean {
  const recipient = to.toLowerCase();
  return REPORT_MAILBOXES.some((box) => recipient.includes(box));
}
export type InboxMessageView = z.infer<typeof inboxMessageView>;
