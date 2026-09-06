import { PHONE_COUNTRIES, type PhoneNumber, dialOf } from '@ggclubs/schemas';
import {
  AsYouType,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from 'libphonenumber-js/max';

/**
 * O que o campo de telefone precisa saber · **entender e formatar, nunca
 * barrar.**
 *
 * ## Por que uma biblioteca entrou aqui, depois de ter sido recusada
 *
 * Na primeira volta eu recusei o `libphonenumber-js` com o argumento do bundle,
 * e o argumento estava certo **pro que o campo fazia então**. O que mudou foram
 * três exigências do Eduardo, e as três são exatamente o que ela resolve:
 *
 * | o que ele pediu | o que ela faz |
 * |---|---|
 * | *"pense no autopreencher que muita gente usa"* | o navegador preenche o número **internacional inteiro**, e ela sabe separar país e nacional |
 * | *"no caso de colocarem no input escrito o `+55`"* | ela lê o `+` e diz **de que país é** |
 * | um campo agradável | ela formata enquanto se digita · `(11) 98765-4321` é como a pessoa confere que acertou |
 *
 * **E o custo saiu de graça, medido:** as três telas do telefone são rotas
 * **preguiçosas**, e o `vite.config.ts` não tem `manualChunks`. Os metadados
 * caem no chunk daquelas rotas, e **não no primeiro carregamento**, que é o que
 * o `pnpm scan:bundle` mede.
 *
 * ## E são os metadados `max`, não os `min`
 *
 * Trocados em 01/09/2026, medindo. O `min` confere **comprimento e prefixo**, e
 * deixa passar número com a cara certa e o padrão errado · `+5511111111111` e
 * `+5511387654321` (prefixo que não existe em celular de São Paulo) são
 * **válidos** pra ele e **inválidos** pro `max`. Como o pedido do Eduardo foi
 * *"aceitando apenas o padrão"*, o `min` não entregava o que a linha acima
 * promete.
 *
 * **São +72 KB crus** (154 contra 82), e eles caem no mesmo lugar: os chunks
 * preguiçosos. O primeiro carregamento não se mexeu · medido antes e depois.
 *
 * ## O que ela NÃO faz aqui, e isso é decisão
 *
 * **Ela não recusa número.** O schema continua aceitando qualquer E.164 (ver
 * `packages/schemas/src/phone.ts`), e o que sai daqui é ajuda: formatar, achar o
 * país, separar o que foi colado. **Recusar número válido de gente de verdade é
 * mais caro que aceitar um errado** · o primeiro é alguém que não consegue se
 * inscrever, o segundo é um dígito que a pessoa corrige quando a gente ligar.
 */

/** Os países que a lista conhece · o resto do mundo não aparece no seletor. */
const KNOWN = new Set(PHONE_COUNTRIES.map((c) => c.iso));

/**
 * O que a pessoa digitou virou o quê · **e é aqui que o `+` troca o país.**
 *
 * Três entradas caem nesta função e ela trata as três iguais, porque pra quem
 * digita elas são a mesma coisa:
 *
 * - **digitar `11 98765-4321`** no país que já está escolhido;
 * - **colar `+55 11 98765-4321`**, ou qualquer número internacional;
 * - **o navegador autopreencher** com o número inteiro, que é o caso que o
 *   Eduardo levantou e o que mais quebra campo de telefone por aí.
 *
 * **Quando o texto começa com `+`, quem manda é ele** · o país do seletor é
 * trocado pelo que o número diz. Ignorar isso é o defeito clássico: a pessoa
 * cola `+351…` com o Brasil selecionado e o campo grava `+55351…`.
 */
export function readTyped(typed: string, country: string): PhoneNumber | null {
  const trimmed = typed.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(trimmed);
    // **País desconhecido não vira palpite** · sem país o número fica com o do
    // seletor, e a pessoa vê o que digitou em vez de uma correção silenciosa.
    if (parsed?.country && KNOWN.has(parsed.country)) {
      return { country: parsed.country, e164: parsed.number };
    }
    return { country, e164: `+${trimmed.replace(/\D/g, '')}` };
  }

  const dial = dialOf(country) ?? '';
  // O zero do tronco cai · com ele o número internacional não completa.
  const digits = trimmed.replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return null;
  return { country, e164: `+${dial}${digits}` };
}

/**
 * O número como a pessoa vê enquanto digita · `(11) 98765-4321`.
 *
 * **Formatação é conferência, e não enfeite** · ninguém lê onze dígitos
 * seguidos e sabe se acertou. Quem agrupa é o `AsYouType`, com as regras do
 * país, e por isso não escrevemos máscara nenhuma aqui.
 *
 * **País que a biblioteca não conhece devolve o texto cru** · melhor sem
 * formato que com o formato errado.
 */
export function formatAsTyped(phone: PhoneNumber | null): string {
  if (!phone) return '';
  const dial = dialOf(phone.country);
  const national = dial && phone.e164.startsWith(`+${dial}`) ? phone.e164.slice(dial.length + 1) : phone.e164;
  try {
    return new AsYouType(phone.country as CountryCode).input(national);
  } catch {
    return national;
  }
}

/**
 * O número pronto, pra mostrar fora do campo · `+55 11 98765-4321`.
 *
 * Usado no painel de admin, onde quem lê vai **discar ou copiar pro WhatsApp** ·
 * ali o código do país precisa estar visível, ao contrário de dentro do campo,
 * onde o seletor já o mostra.
 */
export function formatInternational(phone: PhoneNumber | null | undefined): string {
  if (!phone) return '';
  const parsed = parsePhoneNumberFromString(phone.e164);
  return parsed?.formatInternational() ?? phone.e164;
}

/**
 * O número é válido pro país escolhido?
 *
 * **Isto BARRA, e a mudança é do Eduardo em 01/09/2026.** A primeira versão
 * avisava em cinza e salvava assim mesmo, com o argumento de que recusar número
 * real de gente de verdade é mais caro que aceitar um errado. Ele recusou o
 * argumento, e o dele é melhor: *"se conseguimos saber exatamente o padrão,
 * vamos deixar aceitando apenas o padrão"*.
 *
 * **O que ele viu e eu não:** o custo do número errado não é aqui, é lá na
 * frente · a organização com um telefone quebrado na mão, no dia de pagar a
 * premiação, sem canal nenhum pra chegar na pessoa. Aí ninguém tem como
 * corrigir · e o campo é justamente onde isso custava um segundo.
 *
 * **Só barra o que a biblioteca sabe julgar** · país cujo padrão ela não
 * conhece passa, porque ali não há padrão a cobrar e recusar viraria palpite.
 * É a mesma régua de antes, aplicada onde ela tem base.
 *
 * > A versão dos metadados envelhece · quando um país mudar de regra (o Brasil
 * > somou o nono dígito, e vai acontecer de novo em algum lugar), o conserto é
 * > atualizar o `libphonenumber-js`. É um `pnpm up` contra uma pessoa que não
 * > consegue se inscrever, e por isso está escrito aqui.
 */
export function phoneIsValid(phone: PhoneNumber | null): boolean {
  if (!phone) return false;
  const parsed = parsePhoneNumberFromString(phone.e164);
  // Não deu nem pra ler · não há padrão conhecido, e passa.
  if (!parsed) return true;
  return parsed.isValid();
}

/**
 * O número já tem dígitos demais pro país? · **é o que impede digitar além do
 * limite**, em vez de deixar escrever e reclamar depois.
 *
 * Pedido do Eduardo em 01/09/2026, junto com o de não acusar erro antes da
 * hora: *"tá dando pra escrever além do limite do número mesmo"*. A tecla que
 * estouraria o comprimento simplesmente não entra · quem digita não vê nada
 * acontecer, que é o comportamento de todo campo de telefone por aí.
 *
 * **Isto não é o `maxLength` que o `CLAUDE.md` condena** · aquele trava a
 * digitação num teto inventado e sem explicação. Aqui o teto é o do país, e a
 * pessoa já tinha o número completo na tela quando a tecla parou de responder.
 */
export function isTooLong(phone: PhoneNumber | null): boolean {
  if (!phone) return false;
  return validatePhoneNumberLength(phone.e164) === 'TOO_LONG';
}

/**
 * O campo **encheu** · não cabe mais nenhum dígito neste país.
 *
 * É o sinal de *"a pessoa terminou de digitar"*, e ele existe pra **calar o
 * erro enquanto ela ainda está escrevendo**: acusar "não bate com o padrão" no
 * terceiro dígito é acusar alguém de estar no meio de uma frase.
 *
 * **A pergunta é feita ao contrário, e é isso que a torna confiável:** em vez de
 * perguntar *"já tem o comprimento certo?"*, ela acrescenta um dígito e pergunta
 * se estourou. Perguntar pelo comprimento não serve porque **um país tem
 * vários** · o Brasil aceita 8, 9, 10 e 11 dígitos, então "não está mais curto"
 * acontecia com o número pela metade e o erro aparecia enquanto se digitava.
 * Foi o que a medição de 01/09/2026 mostrou.
 */
export function isFull(phone: PhoneNumber | null): boolean {
  if (!phone) return false;
  return validatePhoneNumberLength(`${phone.e164}0`) === 'TOO_LONG';
}

/** Só os dígitos · usado pra saber se uma tecla mexeu no número ou só no formato. */
export function digitsOnly(text: string): string {
  return text.replace(/\D/g, '');
}

/** O endereço da bandeira · arquivo estático, buscado só quando aparece. */
export function flagSrc(iso: string): string {
  return `/flags/${iso.toLowerCase()}.svg`;
}
