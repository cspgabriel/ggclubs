import { PHONE_COUNTRIES, type PhoneNumber, dialOf } from '@ggclubs/schemas';
import { formatInternational } from '@/lib/phone-input';

export type CountryOption = {
  /** O ISO alfa-2 · é ele que endereça a bandeira e vai pro documento. */
  value: string;
  /** O nome do país no idioma de quem lê · vem do navegador. */
  name: string;
  dial: string;
  /** Nome, ISO e código em caixa baixa · é contra isto que a busca casa. */
  search: string;
};

/**
 * A lista de países do seletor, **com o nome traduzido pelo navegador**.
 *
 * ## O nome não está no nosso catálogo, e é de propósito
 *
 * Quem traduz é o `Intl.DisplayNames`, que faz parte da plataforma e já sabe
 * dizer "Brasil", "Brasil" e "Brazil" conforme o idioma. Embutir 136 nomes nos
 * dois idiomas seria alguns KB e um catálogo pra manter, pra reproduzir o que o
 * navegador entrega de graça · e o [i18n.md](../../../../docs/i18n.md) é sobre
 * texto **nosso**, não sobre nome de país.
 *
 * **Se o `Intl.DisplayNames` não existir, cai no ISO** · a lista continua
 * utilizável em vez de sumir, e a defesa custa uma linha.
 *
 * ## A ordem é escolhida, e não alfabética
 *
 * **Brasil e Portugal primeiro**, porque é onde o público está · há gente de
 * Portugal confirmada. O resto vai em ordem alfabética **do nome traduzido**,
 * que é a ordem em que a pessoa procura.
 *
 * > **Ordenar por nome traduzido exige o `localeCompare` com o idioma** · sem
 * > ele "Áustria" cai depois de "Zâmbia", porque a comparação crua ordena por
 * > ponto de código e o `Á` fica fora da faixa do alfabeto.
 */
export function countryOptions(locale: string): CountryOption[] {
  const names = displayNames(locale);
  const first = ['BR', 'PT'];

  const build = (iso: string): CountryOption => {
    const name = names?.of(iso) ?? iso;
    const dial = dialOf(iso) ?? '';
    return { value: iso, name, dial, search: `${name.toLowerCase()} ${iso.toLowerCase()} +${dial}` };
  };

  const rest = PHONE_COUNTRIES.filter((c) => !first.includes(c.iso))
    .map((c) => build(c.iso))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  return [...first.map(build), ...rest];
}

function displayNames(locale: string): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' });
  } catch {
    return null;
  }
}

/**
 * O número como se lê fora do campo · `+55 11 98765-4321`.
 *
 * Quem chama é o painel de admin, onde alguém vai **discar ou copiar pro
 * WhatsApp** · ali o código do país precisa estar visível, ao contrário de
 * dentro do campo, onde a bandeira já o mostra.
 */
export function phoneLabel(phone: PhoneNumber | null | undefined): string {
  return formatInternational(phone);
}
