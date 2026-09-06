import { z } from 'zod';

/**
 * Telefone · **o país, o número, e por que ele não é validado por país.**
 *
 * Nasceu em 01/09/2026, do pedido do Eduardo: é o meio de falar com a pessoa
 * fora da plataforma quando dá problema, e **de pagar premiação a quem ganha**.
 * Já há gente de Portugal confirmada, então "funcionar pra qualquer país" é
 * requisito e não enfeite.
 *
 * ## O formato guardado é E.164, e o país vai junto
 *
 * O documento guarda `{ country: 'BR', e164: '+5511987654321' }` · **os dois**,
 * e não só a string. Derivar o país do prefixo parece economia e não é: `+1` é
 * dos Estados Unidos **e** do Canadá, `+7` da Rússia **e** do Cazaquistão. O
 * seletor precisa reabrir mostrando a bandeira certa, e adivinhar erraria
 * justamente nos casos em que a pessoa reparou.
 *
 * ## O que este arquivo NÃO faz, e é decisão
 *
 * **Não valida a forma do número dentro do país.** Saber que celular brasileiro
 * tem 9 dígitos começando em 9, que fixo português tem 9 começando em 2, e assim
 * pra 200 países, é o trabalho do `libphonenumber` · são ~150 KB no bundle, num
 * primeiro carregamento que hoje tem teto de 870.
 *
 * **E o custo de errar é assimétrico:** regra de país desatualizada **recusa
 * número válido de gente de verdade** (é o Brasil somando o nono dígito de novo,
 * é o país que criou uma faixa nova), e o único prejuízo do jeito frouxo é um
 * número digitado errado que a pessoa corrige. Preferimos o segundo.
 *
 * **O que se valida é o E.164 de verdade** · `+`, seguido de 1 a 15 dígitos, com
 * o total incluindo o código do país. O teto de 15 é da recomendação **ITU-T
 * E.164**, e não um número escolhido aqui.
 *
 * > **Sem OTP, e isso é decisão dele** · o número não é credencial, não abre
 * > sessão e não prova nada. Ele existe pra alguém do outro lado conseguir
 * > mandar mensagem. Se um dia virar prova de identidade, a verificação vem
 * > junto · **campo não verificado que vira credencial depois é o defeito**.
 */

/** O teto de dígitos de um número E.164, **código do país incluído**. */
export const E164_MAX_DIGITS = 15;

/**
 * O código de discagem de cada país, por ISO 3166-1 alfa-2.
 *
 * **É só o par ISO → discagem, e o nome do país NÃO está aqui** · quem traduz é
 * o `Intl.DisplayNames` do próprio navegador, que já sabe dizer "Brasil",
 * "Brasil" e "Brazil" conforme o idioma da pessoa. Embutir 240 nomes em dois
 * idiomas seria ~15 KB de bundle e um catálogo pra manter, pra reproduzir o que
 * a plataforma entrega de graça.
 *
 * **A bandeira também não é imagem** · sai do próprio ISO, por indicador
 * regional (ver `flagOf`). Zero bytes, e funciona nos três clientes.
 *
 * > **Território sem código próprio não entra** · quem disca pra Guernsey usa o
 * > `+44` do Reino Unido, e uma linha "GG · +44" só faria a lista ter duas
 * > entradas que produzem o mesmo número.
 */
export const PHONE_COUNTRIES: readonly { iso: string; dial: string }[] = [
  // América do Norte e Caribe · o NANP inteiro é `+1`, e por isso só os países
  // com código próprio aparecem aqui.
  { iso: 'US', dial: '1' },
  { iso: 'CA', dial: '1' },
  // América Central e México
  { iso: 'MX', dial: '52' },
  { iso: 'GT', dial: '502' },
  { iso: 'SV', dial: '503' },
  { iso: 'HN', dial: '504' },
  { iso: 'NI', dial: '505' },
  { iso: 'CR', dial: '506' },
  { iso: 'PA', dial: '507' },
  { iso: 'CU', dial: '53' },
  { iso: 'HT', dial: '509' },
  { iso: 'BZ', dial: '501' },
  // América do Sul · o público mais provável depois do Brasil
  { iso: 'BR', dial: '55' },
  { iso: 'AR', dial: '54' },
  { iso: 'UY', dial: '598' },
  { iso: 'PY', dial: '595' },
  { iso: 'CL', dial: '56' },
  { iso: 'BO', dial: '591' },
  { iso: 'PE', dial: '51' },
  { iso: 'EC', dial: '593' },
  { iso: 'CO', dial: '57' },
  { iso: 'VE', dial: '58' },
  { iso: 'GY', dial: '592' },
  { iso: 'SR', dial: '597' },
  // Europa · Portugal e Espanha primeiro, pelo mesmo motivo
  { iso: 'PT', dial: '351' },
  { iso: 'ES', dial: '34' },
  { iso: 'FR', dial: '33' },
  { iso: 'IT', dial: '39' },
  { iso: 'DE', dial: '49' },
  { iso: 'GB', dial: '44' },
  { iso: 'IE', dial: '353' },
  { iso: 'NL', dial: '31' },
  { iso: 'BE', dial: '32' },
  { iso: 'LU', dial: '352' },
  { iso: 'CH', dial: '41' },
  { iso: 'AT', dial: '43' },
  { iso: 'DK', dial: '45' },
  { iso: 'SE', dial: '46' },
  { iso: 'NO', dial: '47' },
  { iso: 'FI', dial: '358' },
  { iso: 'IS', dial: '354' },
  { iso: 'PL', dial: '48' },
  { iso: 'CZ', dial: '420' },
  { iso: 'SK', dial: '421' },
  { iso: 'HU', dial: '36' },
  { iso: 'RO', dial: '40' },
  { iso: 'BG', dial: '359' },
  { iso: 'GR', dial: '30' },
  { iso: 'HR', dial: '385' },
  { iso: 'SI', dial: '386' },
  { iso: 'RS', dial: '381' },
  { iso: 'BA', dial: '387' },
  { iso: 'ME', dial: '382' },
  { iso: 'MK', dial: '389' },
  { iso: 'AL', dial: '355' },
  { iso: 'LT', dial: '370' },
  { iso: 'LV', dial: '371' },
  { iso: 'EE', dial: '372' },
  { iso: 'UA', dial: '380' },
  { iso: 'BY', dial: '375' },
  { iso: 'MD', dial: '373' },
  { iso: 'RU', dial: '7' },
  { iso: 'TR', dial: '90' },
  { iso: 'CY', dial: '357' },
  { iso: 'MT', dial: '356' },
  { iso: 'AD', dial: '376' },
  { iso: 'MC', dial: '377' },
  { iso: 'SM', dial: '378' },
  // África lusófona primeiro · é onde o produto tem chance de encostar
  { iso: 'AO', dial: '244' },
  { iso: 'MZ', dial: '258' },
  { iso: 'CV', dial: '238' },
  { iso: 'GW', dial: '245' },
  { iso: 'ST', dial: '239' },
  { iso: 'ZA', dial: '27' },
  { iso: 'NG', dial: '234' },
  { iso: 'GH', dial: '233' },
  { iso: 'KE', dial: '254' },
  { iso: 'TZ', dial: '255' },
  { iso: 'UG', dial: '256' },
  { iso: 'ET', dial: '251' },
  { iso: 'EG', dial: '20' },
  { iso: 'MA', dial: '212' },
  { iso: 'DZ', dial: '213' },
  { iso: 'TN', dial: '216' },
  { iso: 'LY', dial: '218' },
  { iso: 'SN', dial: '221' },
  { iso: 'CI', dial: '225' },
  { iso: 'CM', dial: '237' },
  { iso: 'CD', dial: '243' },
  { iso: 'CG', dial: '242' },
  { iso: 'GA', dial: '241' },
  { iso: 'ZM', dial: '260' },
  { iso: 'ZW', dial: '263' },
  { iso: 'NA', dial: '264' },
  { iso: 'BW', dial: '267' },
  // Oriente Médio e Ásia
  { iso: 'IL', dial: '972' },
  { iso: 'AE', dial: '971' },
  { iso: 'SA', dial: '966' },
  { iso: 'QA', dial: '974' },
  { iso: 'KW', dial: '965' },
  { iso: 'BH', dial: '973' },
  { iso: 'OM', dial: '968' },
  { iso: 'JO', dial: '962' },
  { iso: 'LB', dial: '961' },
  { iso: 'IQ', dial: '964' },
  { iso: 'IR', dial: '98' },
  { iso: 'PK', dial: '92' },
  { iso: 'IN', dial: '91' },
  { iso: 'BD', dial: '880' },
  { iso: 'LK', dial: '94' },
  { iso: 'NP', dial: '977' },
  { iso: 'CN', dial: '86' },
  { iso: 'HK', dial: '852' },
  { iso: 'MO', dial: '853' },
  { iso: 'TW', dial: '886' },
  { iso: 'JP', dial: '81' },
  { iso: 'KR', dial: '82' },
  { iso: 'TH', dial: '66' },
  { iso: 'VN', dial: '84' },
  { iso: 'PH', dial: '63' },
  { iso: 'ID', dial: '62' },
  { iso: 'MY', dial: '60' },
  { iso: 'SG', dial: '65' },
  { iso: 'KH', dial: '855' },
  { iso: 'LA', dial: '856' },
  { iso: 'MM', dial: '95' },
  { iso: 'KZ', dial: '7' },
  { iso: 'UZ', dial: '998' },
  { iso: 'GE', dial: '995' },
  { iso: 'AM', dial: '374' },
  { iso: 'AZ', dial: '994' },
  // Oceania
  { iso: 'AU', dial: '61' },
  { iso: 'NZ', dial: '64' },
  { iso: 'FJ', dial: '679' },
  { iso: 'PG', dial: '675' },
  // Timor-Leste, o quinto de língua portuguesa que faltava
  { iso: 'TL', dial: '670' },
];

/** O país padrão do seletor · a maioria do público está aqui. */
export const DEFAULT_PHONE_COUNTRY = 'BR';

/**
 * A bandeira, **sem imagem e sem catálogo** · o emoji sai do próprio ISO.
 *
 * Cada letra vira o indicador regional dela (`A` = `U+1F1E6`), e o par forma a
 * bandeira. Duas linhas em vez de 240 arquivos, e o sistema operacional desenha.
 *
 * > **Windows não desenha bandeira**, e isso é conhecido: ele mostra as duas
 * > letras (`BR`), que continua sendo informação certa. Quem depende da bandeira
 * > pra entender a tela perdeu, e por isso o **código de discagem aparece escrito
 * > ao lado** e não só na bandeira.
 */
export function flagOf(iso: string): string {
  if (!/^[A-Z]{2}$/.test(iso)) return '';
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** O código de discagem de um país, ou `null` se ele não está na lista. */
export function dialOf(iso: string): string | null {
  return PHONE_COUNTRIES.find((c) => c.iso === iso)?.dial ?? null;
}

const isoCodes = PHONE_COUNTRIES.map((c) => c.iso);

/**
 * O número guardado · **o país e o E.164, juntos**.
 *
 * O `e164` é a fonte pra discar, e o `country` é o que faz o seletor reabrir
 * certo. Eles podem parecer redundantes e não são · ver o cabeçalho.
 */
export const phoneNumber = z.object({
  country: z.enum(isoCodes as [string, ...string[]]),
  /**
   * `+` e de 1 a 15 dígitos · o teto é da ITU-T E.164, com o código do país
   * **dentro** da conta.
   *
   * O piso de 8 não existe: há país com número nacional curto, e recusar por
   * comprimento seria a validação por país que este arquivo recusa.
   */
  e164: z
    .string()
    .trim()
    .regex(new RegExp(`^\\+[1-9]\\d{0,${E164_MAX_DIGITS - 1}}$`), 'phone-invalid'),
});

export type PhoneNumber = z.infer<typeof phoneNumber>;

/**
 * Monta o E.164 a partir do que a pessoa digitou.
 *
 * **Tudo que não é dígito é jogado fora** · quem digita `(11) 98765-4321` está
 * certo, e obrigar a pessoa a limpar a formatação é obrigar ela a trabalhar
 * porque o nosso campo é preguiçoso.
 *
 * **E o zero da frente cai** · em quase todo país da lista o `0` é prefixo
 * nacional que não entra no formato internacional (o `021` de Portugal, o `0`
 * do tronco no Brasil). Mantê-lo produz número que não completa.
 */
export function toE164(dial: string, typed: string): string {
  const digits = typed.replace(/\D/g, '').replace(/^0+/, '');
  return `+${dial}${digits}`;
}

/** O que mostrar no campo · o E.164 sem o código do país. */
export function nationalOf(phone: PhoneNumber): string {
  const dial = dialOf(phone.country);
  if (!dial) return phone.e164.replace(/^\+/, '');
  return phone.e164.startsWith(`+${dial}`) ? phone.e164.slice(dial.length + 1) : phone.e164;
}
