import { z } from 'zod';
import { baseDocumentFields, httpUrl, moneyCents, objectIdString } from './common.js';

/**
 * Como a pessoa paga a inscrição.
 *
 * **Os dois nascem juntos e são construídos diferente**, por decisão do Eduardo
 * em 12/08/2026:
 *
 * - **`pix` acontece na nossa página** · o QR e o copia-e-cola são desenhados
 *   aqui, e a validade do código é **nossa**. É o que faz "o Pix expira junto da
 *   reserva" ser verdade em vez de promessa: quem escolhe o instante de morte do
 *   código é quem escolhe o instante de morte da vaga.
 * - **`card` sai daqui** · redirect pro checkout do Mercado Pago, sem parcelar.
 *   Desenhar cartão na nossa tela custaria o SDK deles no bundle, tokenização e
 *   3DS · e a R$ 39,90 o cartão é o meio secundário.
 */
export const paymentMethod = z.enum(['pix', 'card']);
export type PaymentMethod = z.infer<typeof paymentMethod>;

/**
 * Situação de uma tentativa de pagamento.
 *
 * **Ela não é a situação da inscrição**, e essa separação é o desenho: a
 * inscrição tem uma vaga e pode ter **várias** tentativas de pagamento (o Pix
 * que venceu, o cartão recusado, o Pix que fechou). Fundir as duas faria a vaga
 * herdar o histórico de cada tentativa.
 *
 * **`expired` e `cancelled` são fins diferentes**, pela mesma régua que separa
 * os dois na inscrição: um é o relógio, o outro é alguém decidindo.
 */
export const paymentStatus = z.enum([
  /** Criada, esperando o dinheiro · é o estado do Pix enquanto o QR vive. */
  'pending',
  'approved',
  /** O provedor recusou · cartão sem limite, antifraude, Pix devolvido. */
  'rejected',
  /** O prazo acabou sem pagamento · morre junto com a reserva. */
  'expired',
  'cancelled',
  'refunded',
]);
export type PaymentStatus = z.infer<typeof paymentStatus>;

/** Os estados de onde uma tentativa ainda pode virar dinheiro. */
export const LIVE_PAYMENT_STATUSES = ['pending'] as const;

export function paymentIsLive(status: PaymentStatus): boolean {
  return (LIVE_PAYMENT_STATUSES as readonly string[]).includes(status);
}

/**
 * Pra onde o dinheiro volta.
 *
 * **Nasce com dois destinos mesmo com um só funcionando**, e isso é decisão do
 * Eduardo de 10/08/2026: GGCoins é projeto que não existe, e ele citou a
 * carteira como destino alternativo de reembolso. Gravar o destino desde o
 * primeiro reembolso é o que permite a carteira entrar depois **sem migração de
 * dado** · o contrário seria descobrir, no dia dela, que todo reembolso antigo é
 * ambíguo.
 */
export const refundDestination = z.enum(['money', 'credits']);
export type RefundDestination = z.infer<typeof refundDestination>;

/**
 * O motivo do reembolso · **e ele é o que a política precisa cobrir**.
 *
 * Cada um vem de uma decisão já escrita no `docs/produto.md`, e nenhum deles é
 * "a pessoa mudou de ideia" · essa é justamente a que espera a política do
 * Eduardo.
 */
export const refundReason = z.enum([
  /** A edição foi cancelada · decisão dele em 10/08/2026. */
  'tournament-cancelled',
  /** Nem o menor degrau da escada fechou · a edição não tem como acontecer. */
  'tournament-undersized',
  /** O prazo pra criar o club venceu e ele não existe. */
  'no-club-in-time',
  /**
   * A edição passou do teto e este é o excedente · decisão do Eduardo em
   * 24/08/2026, pendência 91.
   *
   * **Ele existe separado do `admin` porque quem recebe precisa saber disso** ·
   * "decisão do admin" não explica nada a quem pagou, e reembolso sem motivo
   * lê como calote. A ordem é a do pagamento confirmado, e não a da inscrição
   * iniciada: quem estourou o teto foi justamente quem pagou atrasado.
   */
  'over-capacity',
  /** Decisão do admin, caso a caso · é a válvula de escape. */
  'admin',
]);
export type RefundReason = z.infer<typeof refundReason>;

/**
 * O que a organização manda ao pedir um estorno · pendência 88.
 *
 * **O motivo é obrigatório**, e ele reusa o enum acima em vez de repetir a
 * lista: este é o único caminho em que **alguém decide** devolver, e a decisão
 * tem autor. O estorno que chega do painel do provedor grava `null` porque ali
 * ninguém nos disse nada · aqui, gravar `null` jogaria fora a única informação
 * que só existe neste instante.
 */
/**
 * **O `alsoRemove` é a oferta cruzada da pendência 169 virando UMA chamada** ·
 * 03/09/2026. O cliente encadeava as duas rotas, e encadear no cliente tem dois
 * defeitos que só aparecem quando a segunda falha: o admin fica com o dinheiro
 * devolvido e sem conseguir remover, e o aviso de reembolso sai antes de a
 * remoção acontecer · aí ele não sabe dizer se a pessoa continua na edição.
 */
export const refundPaymentInput = z.object({
  reason: refundReason,
  alsoRemove: z.boolean().optional(),
});
export type RefundPaymentInput = z.infer<typeof refundPaymentInput>;

/**
 * O código Pix como a nossa página o mostra.
 *
 * **Os três campos vêm do provedor e nenhum deles é derivável dos outros** · o
 * `payload` é o copia-e-cola, o `qrBase64` é a imagem já pronta (desenhar o QR
 * no cliente custaria uma biblioteca por uma imagem que veio junto), e o
 * `ticketUrl` é a página do provedor, que é o caminho de quem prefere o app do
 * banco pelo celular.
 */
export const pixCharge = z.object({
  payload: z.string(),
  qrBase64: z.string(),
  ticketUrl: httpUrl.nullable(),
});
export type PixCharge = z.infer<typeof pixCharge>;

export const paymentSchema = z.object({
  ...baseDocumentFields,
  /**
   * A inscrição que esta tentativa paga.
   *
   * **A tentativa aponta pra inscrição, e não o contrário** · uma vaga tem
   * várias tentativas ao longo da vida dela, e o documento da inscrição é
   * reaproveitado por par (edição, club). Guardar `paymentId` lá faria a
   * inscrição esquecer a tentativa anterior a cada nova.
   */
  registrationId: objectIdString,
  /**
   * Duplicados de propósito, e é o único lugar do domínio onde isso acontece.
   *
   * **Dinheiro se audita sozinho.** Ler a edição e o club através da inscrição
   * funciona hoje e deixa a auditoria dependente de um `$lookup` que pode não
   * achar par · num documento contábil, a resposta "de que edição era este
   * pagamento" não pode depender de outro documento continuar existindo.
   */
  tournamentId: objectIdString,
  clubId: objectIdString,
  /**
   * **Quem pagou, que não é necessariamente quem inscreveu.**
   *
   * Qualquer membro do elenco inicia a inscrição (decisão de 12/08/2026), e
   * dono ou gerente podem assumir o pagamento. O reembolso volta **pra quem
   * pagou** · é o dinheiro dessa pessoa, não do club.
   */
  paidBy: objectIdString,
  method: paymentMethod,
  status: paymentStatus,
  /**
   * O preço **congelado no instante da cobrança**, e não lido da edição.
   *
   * Mesma razão do `pool` congelado na inscrição: se o admin corrigir o preço
   * depois, o que foi cobrado não muda. Um documento contábil que lê o valor de
   * outro lugar é um documento que reescreve o passado.
   */
  amountCents: moneyCents,
  /**
   * **O que o provedor cobrou pra intermediar**, em centavos · e o que sobrou
   * de verdade.
   *
   * O `amountCents` é o que a pessoa pagou, e ele **nunca** foi o que entrou na
   * conta. Até 05/09/2026 o produto só guardava o bruto, então "quanto a edição
   * rendeu" era uma pergunta que só o painel do Mercado Pago respondia · a
   * primeira edição de verdade precisou de uma conciliação à mão, pagamento por
   * pagamento, pra descobrir R$ 21,16 de taxa em R$ 1.546,90.
   *
   * **Os dois são anuláveis, e o nulo quer dizer "não sei"** · não zero. Zero
   * seria afirmar que a intermediação foi de graça, e é justamente a afirmação
   * que a leitura pode não ter conseguido fazer: a taxa vem de uma segunda
   * leitura no provedor, e ela é **melhor-esforço** (ver `readSettlement`). Todo
   * pagamento anterior a esta data também é nulo, e continua sendo até alguém
   * rodar o backfill.
   *
   * **Não confie no `fee_details` deles pra montar isto.** Medido em
   * 05/09/2026: num cartão de R$ 49,90 ele declarava **uma** taxa de R$ 1,24
   * enquanto o `charges_details` trazia **duas** (a segunda é a antecipação de
   * recebível), e o líquido era R$ 47,42. Quem soma o `fee_details` erra por
   * metade, e erra **pra menos**, que é o lado que ninguém desconfia.
   */
  feeCents: moneyCents.nullable().optional(),
  /**
   * O que caiu na conta · `net_received_amount` do provedor, em centavos.
   *
   * **É ele o número autoritativo**, e não `amountCents - feeCents`: a taxa é
   * derivada de uma lista de cobranças que pode ganhar linha nova (foi assim que
   * a antecipação apareceu), e o líquido é o que o provedor afirma ter
   * depositado.
   */
  netCents: moneyCents.nullable().optional(),
  /** Hoje só o Mercado Pago · o campo existe pra a troca não virar migração. */
  provider: z.literal('mercadopago'),
  /**
   * A **order** no provedor · o recurso que o webhook anuncia e que o
   * cancelamento mata.
   *
   * **É `order`, e não `payment`, porque a integração é a API de Orders**
   * (escolha de 12/08/2026, medida contra a API de verdade). No Pix ela nasce
   * junto da cobrança; **no cartão ela só existe depois de a pessoa pagar**,
   * porque o que criamos antes é uma preferência de checkout · por isso os dois
   * campos, e por isso este é anulável.
   */
  providerOrderId: z.string().nullable(),
  /** A preferência de checkout · só o cartão tem, e ela morre com a reserva. */
  providerPreferenceId: z.string().nullable(),
  /**
   * O **pagamento** no provedor · preenchido quando o dinheiro entra **pelo
   * cartão**.
   *
   * **Nasceu em 13/08/2026, com o conserto do cartão.** Ele é o recurso que o
   * checkout deles cria, e a notificação de cartão anuncia **este** id, não o de
   * uma order · enquanto ele não existia, a confirmação procurava o pagamento
   * por `providerOrderId` e **nunca achava**: cobrava, o dinheiro entrava e a
   * vaga vencia.
   *
   * **No Pix ele fica `null`, e isso é lacuna conhecida** (pendência 88): quem
   * confirma ali é o caminho da order, que não tem esse id em mãos. O `PAY01…`
   * que vem dentro da order **não serve** · ele responde **404** em
   * `/v1/payments/{id}`, medido em 13/08/2026. O id útil é o **numérico**, e
   * quem o acha é o `findPaymentByReference` · o reembolso vai precisar dele, e
   * é lá que a busca entra.
   */
  providerPaymentId: z.string().nullable(),
  /** Pra onde mandar quem escolheu cartão. */
  checkoutUrl: httpUrl.nullable(),
  /** O QR e o copia-e-cola · só o Pix tem. */
  pix: pixCharge.nullable(),
  /**
   * Quando esta tentativa morre · **o mesmo instante do `reservedUntil` da
   * inscrição**, e não um prazo próprio.
   *
   * Dois relógios para a mesma espera é a garantia de que um dia eles vão
   * discordar, e o desfecho dessa discordância é dinheiro entrando numa vaga que
   * já foi de outro club.
   */
  expiresAt: z.coerce.date(),
  paidAt: z.coerce.date().nullable(),
  refundedAt: z.coerce.date().nullable(),
  refundDestination: refundDestination.nullable(),
  refundReason: refundReason.nullable(),
  /**
   * **Quem pediu o estorno** · `null` quando ninguém daqui pediu.
   *
   * Nasce com a rota de reembolso (pendência 88, 19/08/2026), e é a outra
   * metade do `refundReason`: os dois só existem quando **alguém decidiu**
   * devolver. O estorno feito direto no painel do provedor deixa os dois em
   * branco, e é assim que se distingue um do outro na contabilidade.
   *
   * **`.optional()` cobre os documentos anteriores a 19/08/2026** · num
   * documento contábil não se reescreve o passado pra caber num campo novo.
   */
  refundedBy: objectIdString.nullable().optional(),
});

export type Payment = z.infer<typeof paymentSchema>;

/**
 * O que a tela de pagamento recebe · **e o que ela nunca recebe.**
 *
 * A decisão de exposição mora no schema, como no `clubPublicView` e no
 * `tournamentPublicView`. O id do provedor fica de fora **mesmo sendo do próprio
 * pagador**: ele não serve a nenhuma tela, e id de sistema de terceiro numa
 * resposta é superfície que só cresce.
 */
export const paymentView = z.object({
  _id: objectIdString,
  method: paymentMethod,
  status: paymentStatus,
  amountCents: moneyCents,
  checkoutUrl: httpUrl.nullable(),
  pix: pixCharge.nullable(),
  expiresAt: z.coerce.date(),
});
export type PaymentView = z.infer<typeof paymentView>;
