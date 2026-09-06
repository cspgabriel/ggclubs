import { z } from 'zod';
import type { Language } from './languages.js';

// Mensagem de validação é texto de tela · precisa acompanhar o idioma ativo,
// senão o formulário em espanhol valida certo e reclama em português.

/**
 * O idioma das mensagens do Zod é **o mesmo do produto** · a lista vive em
 * `languages.ts`, e este apelido existe só pra não trocar o nome usado aqui
 * dentro. Era uma segunda lista escrita à mão.
 */
export type SchemaLocale = Language;

type Messages = {
  required: string;
  invalidType: (expected: string) => string;
  email: string;
  url: string;
  uuid: string;
  regex: string;
  text: string;
  startsWith: (v: string) => string;
  endsWith: (v: string) => string;
  minChars: (n: number | bigint) => string;
  minNumber: (n: number | bigint, inclusive: boolean) => string;
  minItems: (n: number | bigint) => string;
  minDate: (d: string) => string;
  belowMin: string;
  maxChars: (n: number | bigint) => string;
  maxNumber: (n: number | bigint, inclusive: boolean) => string;
  maxItems: (n: number | bigint) => string;
  maxDate: (d: string) => string;
  aboveMax: string;
  invalidEnum: (options: (string | number)[]) => string;
  invalidDate: string;
  invalidLiteral: (expected: string) => string;
  unrecognizedKeys: (keys: string[]) => string;
  invalidUnion: string;
  custom: string;
  type: Record<string, string>;
  dateLocale: string;
};

const pt: Messages = {
  required: 'Campo obrigatório',
  invalidType: (e) => `Tipo inválido (esperado ${e})`,
  email: 'E-mail inválido',
  url: 'URL inválida',
  uuid: 'UUID inválido',
  regex: 'Formato inválido',
  text: 'Texto inválido',
  startsWith: (v) => `Deve começar com "${v}"`,
  endsWith: (v) => `Deve terminar com "${v}"`,
  minChars: (n) => `Mínimo de ${n} caracteres`,
  minNumber: (n, inc) => (inc ? `Deve ser maior ou igual a ${n}` : `Deve ser maior que ${n}`),
  minItems: (n) => `Selecione ao menos ${n} ${n === 1 ? 'item' : 'itens'}`,
  minDate: (d) => `Data deve ser após ${d}`,
  belowMin: 'Valor abaixo do mínimo',
  maxChars: (n) => `Máximo de ${n} caracteres`,
  maxNumber: (n, inc) => (inc ? `Deve ser menor ou igual a ${n}` : `Deve ser menor que ${n}`),
  maxItems: (n) => `Máximo de ${n} ${n === 1 ? 'item' : 'itens'}`,
  maxDate: (d) => `Data deve ser antes de ${d}`,
  aboveMax: 'Valor acima do máximo',
  invalidEnum: (o) => `Opção inválida. Valores aceitos: ${o.join(', ')}`,
  invalidDate: 'Data inválida',
  invalidLiteral: (e) => `Valor esperado: ${e}`,
  unrecognizedKeys: (k) => `Campo(s) não reconhecido(s): ${k.join(', ')}`,
  invalidUnion: 'Nenhuma das opções aceitas é válida',
  custom: 'Valor inválido',
  type: {
    string: 'texto',
    number: 'número',
    boolean: 'sim/não',
    date: 'data',
    array: 'lista',
    object: 'objeto',
  },
  dateLocale: 'pt-BR',
};

const es: Messages = {
  required: 'Campo obligatorio',
  invalidType: (e) => `Tipo inválido (se esperaba ${e})`,
  email: 'Correo inválido',
  url: 'URL inválida',
  uuid: 'UUID inválido',
  regex: 'Formato inválido',
  text: 'Texto inválido',
  startsWith: (v) => `Debe empezar con "${v}"`,
  endsWith: (v) => `Debe terminar con "${v}"`,
  minChars: (n) => `Mínimo de ${n} caracteres`,
  minNumber: (n, inc) => (inc ? `Debe ser mayor o igual a ${n}` : `Debe ser mayor que ${n}`),
  minItems: (n) => `Selecciona al menos ${n} ${n === 1 ? 'elemento' : 'elementos'}`,
  minDate: (d) => `La fecha debe ser posterior a ${d}`,
  belowMin: 'Valor por debajo del mínimo',
  maxChars: (n) => `Máximo de ${n} caracteres`,
  maxNumber: (n, inc) => (inc ? `Debe ser menor o igual a ${n}` : `Debe ser menor que ${n}`),
  maxItems: (n) => `Máximo de ${n} ${n === 1 ? 'elemento' : 'elementos'}`,
  maxDate: (d) => `La fecha debe ser anterior a ${d}`,
  aboveMax: 'Valor por encima del máximo',
  invalidEnum: (o) => `Opción inválida. Valores aceptados: ${o.join(', ')}`,
  invalidDate: 'Fecha inválida',
  invalidLiteral: (e) => `Valor esperado: ${e}`,
  unrecognizedKeys: (k) => `Campo(s) no reconocido(s): ${k.join(', ')}`,
  invalidUnion: 'Ninguna de las opciones aceptadas es válida',
  custom: 'Valor inválido',
  type: {
    string: 'texto',
    number: 'número',
    boolean: 'sí/no',
    date: 'fecha',
    array: 'lista',
    object: 'objeto',
  },
  dateLocale: 'es',
};

const DICTIONARIES: Record<SchemaLocale, Messages> = { 'pt-BR': pt, es };

/**
 * **O mapa fala a linguagem de issue do Zod 4**, que renomeou quase tudo o que
 * este arquivo lia · foi a migração de 26/08/2026, e as formas abaixo foram
 * medidas contra a versão instalada, uma a uma, e não lidas do changelog:
 *
 * | o que o 3 mandava | o que o 4 manda |
 * |---|---|
 * | `invalid_string` + `validation` | `invalid_format` + `format`, com `prefix`/`suffix` |
 * | `invalid_enum_value` + `options` | `invalid_value` + `values` |
 * | `invalid_literal` + `expected` | `invalid_value` com **um** valor |
 * | `invalid_date` | `invalid_type` com `expected: "date"` e um `Date` inválido na entrada |
 * | `too_small`/`too_big` + `type` | os mesmos + `origin` |
 * | `issue.received === "undefined"` | `issue.input === undefined` |
 * | `ctx.defaultError` | não existe · devolver `undefined` cai no padrão |
 *
 * **O que NÃO mudou é o que a pessoa lê** · as frases são as mesmas de antes,
 * e `zod-locale.test.ts` existe pra provar isso: ele foi escrito e visto
 * passar **sob o Zod 3**, e passou intocado no 4.
 */
function createErrorMap(m: Messages): z.core.$ZodErrorMap {
  return (issue) => {
    switch (issue.code) {
      case 'invalid_type': {
        if (issue.input === undefined || issue.input === null) return m.required;
        // **Data que existe e não vale** · no Zod 3 isto era um código
        // próprio (`invalid_date`), e no 4 chega como tipo trocado com um
        // `Date` de `NaN` na entrada. Sem esta linha, "Data inválida" vira
        // "Tipo inválido (esperado data)" pra quem digitou 31 de fevereiro.
        if (issue.expected === 'date' && issue.input instanceof Date) return m.invalidDate;
        return m.invalidType(m.type[issue.expected] ?? issue.expected);
      }

      case 'invalid_format': {
        // O `prefix` e o `suffix` moram em subtipos que a união pública não
        // carrega · é o mesmo estreitamento que os idiomas embutidos do Zod
        // fazem, e por isso ele é feito aqui em vez de virar `as any`.
        const format = issue as z.core.$ZodStringFormatIssues;
        if (format.format === 'email') return m.email;
        if (format.format === 'url') return m.url;
        if (format.format === 'uuid') return m.uuid;
        if (format.format === 'regex') return m.regex;
        if (format.format === 'starts_with') return m.startsWith(format.prefix);
        if (format.format === 'ends_with') return m.endsWith(format.suffix);
        return m.text;
      }

      case 'too_small': {
        const min = issue.minimum;
        if (issue.origin === 'string') return min === 1 ? m.required : m.minChars(min);
        if (issue.origin === 'number') return m.minNumber(min, issue.inclusive ?? true);
        if (issue.origin === 'array') return m.minItems(min);
        if (issue.origin === 'date') {
          return m.minDate(new Date(Number(min)).toLocaleDateString(m.dateLocale));
        }
        return m.belowMin;
      }

      case 'too_big': {
        const max = issue.maximum;
        if (issue.origin === 'string') return m.maxChars(max);
        if (issue.origin === 'number') return m.maxNumber(max, issue.inclusive ?? true);
        if (issue.origin === 'array') return m.maxItems(max);
        if (issue.origin === 'date') {
          return m.maxDate(new Date(Number(max)).toLocaleDateString(m.dateLocale));
        }
        return m.aboveMax;
      }

      // **Enum e literal viraram o mesmo código no Zod 4**, e o que os separa
      // é a quantidade de valores aceitos · um só é literal.
      case 'invalid_value': {
        const values = issue.values;
        if (values.length === 1) return m.invalidLiteral(JSON.stringify(values[0]));
        return m.invalidEnum(values.map((value) => String(value)));
      }

      case 'unrecognized_keys':
        return m.unrecognizedKeys(issue.keys);

      case 'invalid_union':
        return m.invalidUnion;

      case 'custom':
        return issue.message ?? m.custom;

      // **Devolver `undefined` é o que o Zod 4 põe no lugar do `ctx.defaultError`**
      // · ele cai pro idioma padrão em vez de inventar frase nossa.
      default:
        return undefined;
    }
  };
}

/** Troca o idioma das mensagens de validação. Chamar junto com a troca de idioma da UI. */
export function setSchemaLocale(locale: SchemaLocale): void {
  // `z.config` no lugar do `z.setErrorMap` do Zod 3 · e é `customError`, e não
  // `localeError`: o segundo tem a MENOR precedência e perderia pra qualquer
  // idioma embutido que alguém configure depois.
  z.config({ customError: createErrorMap(DICTIONARIES[locale]) });
}

setSchemaLocale('pt-BR');
