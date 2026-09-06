import { z } from 'zod';
import type { PlayerPosition } from './enums.js';

/**
 * As formações do EA FC 26 e os 11 slots de cada uma.
 *
 * **Tabela derivada, não dado de documento** · mesma regra do `crossplay.ts`. A
 * tática grava `formationId` e quem ocupa cada slot; posição e coordenada do
 * slot saem daqui. Gravar a posição junto criaria dois lugares capazes de
 * discordar, e o dia em que a EA mexer num esquema seria migração de dados em
 * vez de uma linha editada aqui.
 *
 * ## De onde veio esta tabela, e o que ainda falta nela
 *
 * **A lista foi conferida no jogo em 04/08/2026**, pelo Eduardo, lendo a tela de
 * tática **do modo Clubs**. São as 29, e elas bateram **uma a uma** com o que a
 * pesquisa de 03/08 tinha achado, inclusive a contagem por linha de trás (5 com
 * três zagueiros, 20 com quatro, 4 com cinco). A pesquisa acertou; o que não dava
 * pra saber sem abrir o jogo é que ela tinha acertado.
 *
 * O que ficou **confirmado pelo jogo**: quais formações existem, que o Clubs
 * oferece todas, e **como o jogo nomeia cada variante em português** · é ele que
 * alimenta o `FORMATION_VARIANT` abaixo.
 *
 * O que **continua sem o jogo**: as 11 posições de cada formação. Elas seguem
 * sustentadas por três caminhos independentes que bateram slot a slot (o HTML cru
 * das páginas do FUT.GG identificadas como EA SPORTS FC 26, com quatro delas
 * reconferidas à mão contra um terceiro campo da mesma página). É o que sobrou da
 * pendência 25.
 *
 * Uma armadilha que custou uma rodada e vale pra qualquer pesquisa daqui pra
 * frente: **circula uma contagem de 45 formações**, e ela é de um site que conta
 * a mesma formação duas vezes (`4-3-3 (2)` e `4-3-3 Holding` são a mesma) e não
 * tem o `4-4-1-1`, que é a mais usada do jogo. O número certo é 29.
 */

/**
 * O código de slot como a fonte escreve, com o lado embutido.
 *
 * `RCB` e `LCB` são os dois zagueiros de uma linha de quatro, e **não são
 * posições diferentes de `CB`** · o prefixo é disposição no campo, não função.
 * Por isso ele não vira valor do `playerPosition`: quem é zagueiro é zagueiro
 * dos dois lados, e alargar o enum ofereceria no cadastro uma posição que o
 * Virtual Pro não deixa a pessoa ser.
 *
 * **Nenhuma das 29 formações usa `LWB`, `RWB` ou `CF`** · medido, não suposto.
 * Os alas de um 3-5-2 saem como `LM`/`RM` e os de um 5-3-2 como `LB`/`RB`.
 */
const SLOT_CODES = [
  'GK',
  'RB',
  'LB',
  'RCB',
  'CB',
  'LCB',
  'CDM',
  'RDM',
  'LDM',
  'RCM',
  'CM',
  'LCM',
  'RM',
  'LM',
  'CAM',
  'RAM',
  'LAM',
  'RW',
  'LW',
  'ST',
  'RS',
  'LS',
] as const;

export type SlotCode = (typeof SLOT_CODES)[number];

/**
 * O identificador gravado. **Slug, nunca o nome de exibição** · o nome tem
 * espaço, caixa e idioma, e o gravado não pode ter nenhum dos três.
 *
 * **A EA tem dois nomes pra mesma formação**, e isso é do jogo, não do site que
 * a lista: o Ultimate Team numera as variantes (`4-3-3 (2)`) e o resto do jogo
 * usa palavra (`4-3-3 Holding`). São 29 formas com dois rótulos cada, não 45
 * formações · foi assim que a contagem de 45 nasceu.
 *
 * **O sufixo do slug só desambigua id, e não é mais a fonte do rótulo.** Ele
 * nasceu quando o rótulo era recortado do próprio slug, e por isso três esquemas
 * ficaram sem sufixo (`4-2-3-1`, `4-3-3`, `4-4-2`) enquanto os irmãos deles
 * ficaram com. Hoje quem responde o nome é o `FORMATION_VARIANT` · o slug ficou
 * como está de propósito, porque trocar valor gravado é migração pra ganhar uma
 * palavra que já vem de outro lugar.
 *
 * **A ordem é a do jogo**, lida na tela do modo Clubs, e não é enfeite: quem
 * monta aqui vai reproduzir lá, e lista reordenada obriga a procurar o que
 * deveria ser reconhecido de relance. Ela também não é alfabética por acidente ·
 * era, e isso era ordem nenhuma.
 */
export const formationId = z.enum([
  '3-4-3',
  '3-4-1-2',
  '3-4-2-1',
  '3-1-4-2',
  '3-5-2',
  '4-3-3-attack',
  '4-3-3',
  '4-3-1-2',
  '4-3-2-1',
  '4-5-1-attack',
  '4-3-3-holding',
  '4-5-1-flat',
  '4-4-2',
  '4-4-1-1',
  '4-1-2-1-2-wide',
  '4-1-2-1-2-narrow',
  '4-2-2-2',
  '4-3-3-defend',
  '4-4-2-holding',
  '4-2-4',
  '4-1-3-2',
  '4-1-4-1',
  '4-2-1-3',
  '4-2-3-1',
  '4-2-3-1-wide',
  '5-2-3',
  '5-2-1-2',
  '5-4-1',
  '5-3-2',
]);

export type FormationId = z.infer<typeof formationId>;

/** Os sufixos que o jogo dá a uma formação. Lista fechada · ver `FORMATION_VARIANT`. */
export const FORMATION_VARIANTS = [
  'flat',
  'attack',
  'holding',
  'defend',
  'midfield',
  'wide',
  'narrow',
] as const;

export type FormationVariant = (typeof FORMATION_VARIANTS)[number];

/**
 * A variante que o jogo dá a cada formação, ou `null` quando ele mostra só o
 * número.
 *
 * **Isto é tabela explícita porque derivar do slug parou de descrever a
 * verdade.** O rótulo saía de cortar o sufixo do id, e funcionava enquanto três
 * esquemas eram a exceção. A leitura do jogo em 04/08/2026 mostrou **seis**:
 * `3-4-3`, `4-3-3`, `4-4-2` e `4-2-3-1` já eram, e `5-4-1` e `5-3-2` também têm
 * palavra · esses dois **sem irmão nenhum pra desambiguar**, o que mata de vez a
 * ideia de que o sufixo existe pra separar variantes. É o "não é o valor, é o
 * modelo" do `CLAUDE.md`.
 *
 * A chave vira texto no catálogo do front, um por idioma. Aqui fica só qual é ·
 * a palavra é tradução, não dado.
 */
export const FORMATION_VARIANT: Record<FormationId, FormationVariant | null> = {
  '3-4-3': 'flat',
  '3-4-1-2': null,
  '3-4-2-1': null,
  '3-1-4-2': null,
  '3-5-2': null,
  '4-3-3-attack': 'attack',
  '4-3-3': 'flat',
  '4-3-1-2': null,
  '4-3-2-1': null,
  '4-5-1-attack': 'attack',
  '4-3-3-holding': 'holding',
  '4-5-1-flat': 'flat',
  '4-4-2': 'flat',
  '4-4-1-1': 'midfield',
  '4-1-2-1-2-wide': 'wide',
  '4-1-2-1-2-narrow': 'narrow',
  '4-2-2-2': null,
  '4-3-3-defend': 'defend',
  '4-4-2-holding': 'holding',
  '4-2-4': null,
  '4-1-3-2': null,
  '4-1-4-1': null,
  '4-2-1-3': null,
  '4-2-3-1': 'narrow',
  '4-2-3-1-wide': 'wide',
  '5-2-3': null,
  '5-2-1-2': null,
  '5-4-1': 'flat',
  '5-3-2': 'holding',
};

/** O número da formação, sem a variante · `4-2-3-1-wide` vira `4-2-3-1`. */
export function formationBase(id: FormationId): string {
  return id
    .split('-')
    .filter((part) => /^\d+$/.test(part))
    .join('-');
}

/** Todo esquema do jogo tem onze. É o que trava a tabela contra erro de digitação. */
export const SLOTS_PER_FORMATION = 11;

/** Na ordem do jogo, igual ao enum · duas ordens no mesmo arquivo é o que diverge. */
const FORMATION_SLOTS: Record<FormationId, readonly SlotCode[]> = {
  '3-4-3': ['GK', 'RCB', 'CB', 'LCB', 'RM', 'RCM', 'LCM', 'LM', 'RW', 'ST', 'LW'],
  '3-4-1-2': ['GK', 'RCB', 'CB', 'LCB', 'RM', 'RCM', 'LCM', 'LM', 'CAM', 'RS', 'LS'],
  '3-4-2-1': ['GK', 'RCB', 'CB', 'LCB', 'RM', 'RCM', 'LCM', 'LM', 'RAM', 'LAM', 'ST'],
  '3-1-4-2': ['GK', 'RCB', 'CB', 'LCB', 'CDM', 'RM', 'RCM', 'LCM', 'LM', 'RS', 'LS'],
  '3-5-2': ['GK', 'RCB', 'CB', 'LCB', 'RDM', 'LDM', 'RM', 'LM', 'CAM', 'RS', 'LS'],
  '4-3-3-attack': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RCM', 'LCM', 'CAM', 'RW', 'ST', 'LW'],
  '4-3-3': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RCM', 'CM', 'LCM', 'RW', 'ST', 'LW'],
  '4-3-1-2': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RCM', 'CM', 'LCM', 'CAM', 'RS', 'LS'],
  '4-3-2-1': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RCM', 'CM', 'LCM', 'RAM', 'LAM', 'ST'],
  '4-5-1-attack': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RM', 'CM', 'LM', 'RAM', 'LAM', 'ST'],
  '4-3-3-holding': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'CDM', 'RCM', 'LCM', 'RW', 'ST', 'LW'],
  '4-5-1-flat': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RM', 'RCM', 'CM', 'LCM', 'LM', 'ST'],
  '4-4-2': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RM', 'RCM', 'LCM', 'LM', 'RS', 'LS'],
  '4-4-1-1': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RM', 'RCM', 'LCM', 'LM', 'CAM', 'ST'],
  '4-1-2-1-2-wide': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'CDM', 'RM', 'LM', 'CAM', 'RS', 'LS'],
  '4-1-2-1-2-narrow': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'CDM', 'RCM', 'LCM', 'CAM', 'RS', 'LS'],
  '4-2-2-2': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RDM', 'LDM', 'RAM', 'LAM', 'RS', 'LS'],
  '4-3-3-defend': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RDM', 'LDM', 'CM', 'RW', 'ST', 'LW'],
  '4-4-2-holding': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RDM', 'LDM', 'RM', 'LM', 'RS', 'LS'],
  '4-2-4': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RCM', 'LCM', 'RW', 'RS', 'LS', 'LW'],
  '4-1-3-2': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'CDM', 'RM', 'CM', 'LM', 'RS', 'LS'],
  '4-1-4-1': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'CDM', 'RM', 'RCM', 'LCM', 'LM', 'ST'],
  '4-2-1-3': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RDM', 'LDM', 'CAM', 'RW', 'ST', 'LW'],
  '4-2-3-1': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RDM', 'LDM', 'RAM', 'CAM', 'LAM', 'ST'],
  '4-2-3-1-wide': ['GK', 'RB', 'RCB', 'LCB', 'LB', 'RDM', 'LDM', 'RM', 'LM', 'CAM', 'ST'],
  '5-2-3': ['GK', 'RB', 'RCB', 'CB', 'LCB', 'LB', 'RCM', 'LCM', 'RW', 'ST', 'LW'],
  '5-2-1-2': ['GK', 'RB', 'RCB', 'CB', 'LCB', 'LB', 'RCM', 'LCM', 'CAM', 'RS', 'LS'],
  '5-4-1': ['GK', 'RB', 'RCB', 'CB', 'LCB', 'LB', 'RM', 'RCM', 'LCM', 'LM', 'ST'],
  '5-3-2': ['GK', 'RB', 'RCB', 'CB', 'LCB', 'LB', 'CDM', 'RCM', 'LCM', 'RS', 'LS'],
};

/** A posição que o slot é, sem o lado · é ela que a tela rotula e traduz. */
const POSITION_OF: Record<SlotCode, PlayerPosition> = {
  GK: 'GK',
  RB: 'RB',
  LB: 'LB',
  RCB: 'CB',
  CB: 'CB',
  LCB: 'CB',
  CDM: 'CDM',
  RDM: 'CDM',
  LDM: 'CDM',
  RCM: 'CM',
  CM: 'CM',
  LCM: 'CM',
  RM: 'RM',
  LM: 'LM',
  CAM: 'CAM',
  RAM: 'CAM',
  LAM: 'CAM',
  RW: 'RW',
  LW: 'LW',
  ST: 'ST',
  RS: 'ST',
  LS: 'ST',
};

/**
 * A linha do campo em que o slot vive · 0 é o gol, 5 é o ataque.
 *
 * Sai da família do código, não de tabela por formação: `RCM` é meio em toda
 * formação que o usa. Uma linha por formação seria a mesma informação escrita
 * 29 vezes, livre pra divergir.
 */
const LINE_OF: Record<SlotCode, number> = {
  GK: 0,
  RB: 1,
  LB: 1,
  RCB: 1,
  CB: 1,
  LCB: 1,
  CDM: 2,
  RDM: 2,
  LDM: 2,
  RCM: 3,
  CM: 3,
  LCM: 3,
  RM: 3,
  LM: 3,
  CAM: 4,
  RAM: 4,
  LAM: 4,
  RW: 5,
  LW: 5,
  ST: 5,
  RS: 5,
  LS: 5,
};

/**
 * Onde o slot fica na largura, da esquerda pra direita.
 *
 * Três degraus de cada lado, e o terceiro existe por um caso só: no `4-2-4` a
 * ponta e o segundo atacante dividem a mesma linha, e sem separar `LW` de `LS`
 * os dois cairiam no mesmo lugar. Ponta é mais aberta que atacante.
 */
const SIDE_OF: Record<SlotCode, number> = {
  GK: 0,
  CB: 0,
  CDM: 0,
  CM: 0,
  CAM: 0,
  ST: 0,
  RCB: 1,
  RDM: 1,
  RCM: 1,
  RAM: 1,
  LCB: -1,
  LDM: -1,
  LCM: -1,
  LAM: -1,
  RB: 2,
  RM: 2,
  RS: 2,
  LB: -2,
  LM: -2,
  LS: -2,
  RW: 3,
  LW: -3,
};

/**
 * Quanto a linha se abre, por quantidade de gente nela.
 *
 * **Fração da largura do campo**, então o desenho não depende do tamanho em que
 * a tela renderiza · é a mesma razão de a marca d'água do login ser medida em
 * `rem` e não em porcentagem do container.
 */
const SPREAD = [
  [],
  [0.5],
  [0.33, 0.67],
  [0.19, 0.5, 0.81],
  [0.13, 0.38, 0.62, 0.87],
  [0.11, 0.3, 0.5, 0.7, 0.89],
] as const;

/** Nenhuma linha das 29 passa de cinco · o teto é o da linha mais cheia que existe. */
const WIDEST_LINE = SPREAD[5];

/**
 * A que altura do campo cada linha joga · 0 é a nossa linha de fundo, 1 é a do
 * adversário.
 *
 * **Não é distribuição uniforme, e a primeira versão era.** Dividir a altura em
 * partes iguais punha o ataque em `1`, ou seja **em cima da linha de fundo**
 * adversária, dentro da grande área · time nenhum se desenha assim, e na
 * captura os três atacantes ficavam colados no topo. Apareceu olhando a tela,
 * como quase tudo que é de desenho.
 *
 * Os números deixam de fora as duas faixas onde não há jogador de linha: a
 * própria área e a do adversário. O goleiro fica na dele, que é onde ele joga
 * mesmo.
 */
const DEPTH = [0.11, 0.24, 0.38, 0.52, 0.66, 0.8] as const;

const DEEPEST = DEPTH[0];

export type FormationSlot = {
  /** Índice no array da formação · é o que a tática grava. */
  index: number;
  position: PlayerPosition;
  /** Fração da largura, 0 na lateral esquerda e 1 na direita. */
  x: number;
  /** Fração da altura, 0 no nosso gol e 1 no ataque. */
  y: number;
};

/**
 * Os 11 slots de uma formação, prontos pra desenhar.
 *
 * A coordenada é **calculada**, não digitada: 29 formações a 11 slots seriam 319
 * pares de número escritos à mão, e cada um deles é uma chance de errar em
 * silêncio · defeito de desenho não quebra teste nenhum. O que a tabela guarda é
 * o que veio da fonte; o resto é regra.
 */
export function slotsOf(id: FormationId): readonly FormationSlot[] {
  const codes = FORMATION_SLOTS[id];
  const byLine = new Map<number, SlotCode[]>();

  for (const code of codes) {
    const line = LINE_OF[code];
    const current = byLine.get(line);
    if (current) current.push(code);
    else byLine.set(line, [code]);
  }

  const placed = new Map<SlotCode, number>();
  for (const [, inLine] of byLine) {
    const ordered = [...inLine].sort((a, b) => SIDE_OF[a] - SIDE_OF[b]);
    const spread: readonly number[] = SPREAD[ordered.length] ?? WIDEST_LINE;
    ordered.forEach((code, i) => placed.set(code, spread[i] ?? 0.5));
  }

  return codes.map((code, index) => ({
    index,
    position: POSITION_OF[code],
    x: placed.get(code) ?? 0.5,
    y: DEPTH[LINE_OF[code]] ?? DEEPEST,
  }));
}

/** O código bruto de cada slot · existe pro teste conferir a tabela contra a fonte. */
export function slotCodesOf(id: FormationId): readonly SlotCode[] {
  return FORMATION_SLOTS[id];
}

export const FORMATION_IDS = formationId.options;

/** Todos os códigos que a tabela usa · o teste confere que nenhum ficou órfão. */
export const ALL_SLOT_CODES = SLOT_CODES;
