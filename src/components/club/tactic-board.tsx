import {
  slotsOf,
  SLOTS_PER_FORMATION,
  type FormationId,
  type FormationSlot,
  type ManageSquadMember,
  type SquadMember,
  type TacticSlot,
  type TacticSlotView,
} from '@ggclubs/schemas';
import { X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { FormationPicker } from '@/components/club/formation-picker';
import { PitchLines } from '@/components/club/pitch-lines';
import { Avatar } from '@/components/ui/avatar';
import { SaveBar } from '@/components/ui/save-bar';
import { SectionTitle } from '@/components/ui/section-title';
import { useFormationLabel } from '@/lib/formation';
import { positionKey } from '@/lib/position';
import { cn } from '@/lib/utils';

/**
 * O campo com a escalação do club.
 *
 * **A escalação vem do servidor sem os players**, e é aqui que ela encontra o
 * elenco que a página já tinha em mãos · ver o comentário do `tacticView`. Quem
 * foi escalado e saiu do club simplesmente não é achado, e o slot desenha vazio
 * sem ninguém precisar limpar tática nenhuma.
 *
 * **Sem arrastar.** A escalação se monta tocando num slot e depois em quem
 * entra nele. Arrastar é o gesto óbvio no desktop e o pior possível no celular,
 * que é onde este produto vive · e num campo de 320px de largura o alvo de
 * arraste tem menos que o mínimo de toque. Tocar funciona nos dois, e de quebra
 * funciona no teclado.
 */
export function TacticBoard({
  squad,
  manageable,
  tactic,
  canEdit,
  saving,
  saved,
  onDirtyChange,
  onSave,
}: {
  /**
   * O elenco que a página já carregou · é ele que dá nome e rosto a cada slot.
   *
   * Vem sem `userId` de propósito · é a view pública, e ela chega pra todo mundo
   * que abre a página. É por isso que a escalação é lida por `@handle`.
   */
  squad: SquadMember[];
  /**
   * O mesmo elenco **com id**, que só quem gerencia recebe.
   *
   * Ele existe aqui por um motivo só: **gravar precisa de id estável**, e o
   * handle é trocável. Quem não gerencia não recebe e não precisa · a tela dele
   * é de leitura.
   */
  manageable?: ManageSquadMember[];
  tactic: { formation: FormationId; slots: TacticSlotView[] } | null;
  canEdit: boolean;
  saving?: boolean;
  /**
   * Acabou de gravar · **a escalação não tinha isso**, e só voltava pro estado
   * "nada mudou". A diferença entre *gravou* e *nunca teve alteração* ficava no
   * sumiço de um selo. Achado ao montar o mapa da pendência 64.
   */
  saved?: boolean;
  /**
   * Avisa quem está por fora que existe alteração pendente aqui dentro.
   *
   * **Existe por causa do tempo real** · quando a escalação muda no servidor, a
   * página precisa decidir entre aplicar a nova e avisar, e a resposta depende
   * de haver trabalho em andamento nesta prancheta. Trocar o campo embaixo da
   * mão de quem está arrastando player seria o mesmo apagão que o evento veio
   * consertar, feito por nós.
   */
  onDirtyChange?: (dirty: boolean) => void;
  onSave?: (input: { formation: FormationId; slots: TacticSlot[] }) => void;
}) {
  const { t } = useTranslation();
  const formationLabel = useFormationLabel();
  const formationLabelId = useId();

  const [formation, setFormation] = useState<FormationId>(tactic?.formation ?? '4-2-3-1');
  const [placed, setPlaced] = useState<Map<number, string>>(
    () => new Map((tactic?.slots ?? []).map((slot) => [slot.index, slot.handle])),
  );
  const [selected, setSelected] = useState<number | null>(null);

  /**
   * O ponto de partida, guardado pra ser **comparado** contra o que está na
   * tela.
   *
   * **Havia uma flag aqui, e ela mentia.** Toda ação a ligava e nada a
   * desligava, então desfazer o que se acabou de fazer · tirar alguém e pôr de
   * volta no mesmo slot, trocar de formação e voltar · deixava a tela dizendo
   * "não salvo" com o botão de gravar aceso, sem haver diferença nenhuma pra
   * gravar. Apontado pelo Eduardo em 07/08/2026.
   *
   * **A flag não tinha conserto no lugar onde o defeito aparece:** eram quatro
   * funções ligando ela, e cada uma teria que saber comparar o estado inteiro
   * pra decidir se desliga. Derivado, o valor nasce certo pras quatro e pra
   * quinta que aparecer.
   */
  const initial = useMemo(
    () => ({
      formation: tactic?.formation ?? '4-2-3-1',
      placed: new Map((tactic?.slots ?? []).map((slot) => [slot.index, slot.handle])),
    }),
    [tactic],
  );

  const dirty = formation !== initial.formation || !sameLineup(placed, initial.placed);

  /**
   * **O `onDirtyChange` não entra nas dependências**, e é a mesma razão do
   * `useRealtimeTopic`: a página costuma passar função nova a cada render, e
   * depender dela avisaria a cada pintura em vez de a cada mudança de estado.
   */
  const notifyDirty = useRef(onDirtyChange);
  notifyDirty.current = onDirtyChange;
  useEffect(() => {
    notifyDirty.current?.(dirty);
  }, [dirty]);

  const slots = useMemo(() => slotsOf(formation), [formation]);

  /** Quem está no elenco, por handle · o cruzamento que desenha cada slot. */
  const byHandle = useMemo(
    () => new Map(squad.map((member) => [member.handle, member])),
    [squad],
  );

  /** O caminho de volta pro id, só pra gravar. */
  const idOf = useMemo(
    () => new Map((manageable ?? []).map((member) => [member.handle, member.userId])),
    [manageable],
  );

  const bench = useMemo(
    () => squad.filter((m) => ![...placed.values()].includes(m.handle)),
    [squad, placed],
  );

  function assign(index: number, handle: string) {
    setPlaced((current) => {
      const next = new Map(current);
      // A mesma pessoa não joga em dois lugares · escalar quem já estava noutro
      // slot é **mover**, não duplicar. O schema recusaria o duplicado, e
      // descobrir isso no envio seria descobrir tarde.
      for (const [slot, who] of next) {
        if (who === handle) next.delete(slot);
      }
      next.set(index, handle);
      return next;
    });
    setSelected(null);
  }

  function clear(index: number) {
    setPlaced((current) => {
      const next = new Map(current);
      next.delete(index);
      return next;
    });
    setSelected(null);
  }

  /**
   * **Tocar num slot ocupado e depois em outro move · e troca, se o destino
   * estiver ocupado.**
   *
   * Sem isto, inverter dois jogadores custava quatro toques e passava por um
   * estado onde ninguém está no slot: limpar, escolher o destino, achar a
   * pessoa na lista, e repetir pro outro. Apontado pelo Eduardo em 07/08/2026,
   * e é a falta mais séria da tela · montar time é justamente mexer em quem
   * está onde.
   *
   * **Não inventa gesto novo:** o toque-toque já era como se escala. O que muda
   * é o que o segundo toque significa quando o primeiro caiu em alguém.
   */
  function moveOrSwap(from: number, to: number) {
    setPlaced((current) => {
      const next = new Map(current);
      const moving = next.get(from);
      if (!moving) return current;
      const atDestination = next.get(to);

      next.set(to, moving);
      // Destino ocupado vira troca · sobrescrever tiraria alguém do time sem
      // ninguém ter pedido, e o desfazer disso é remontar na mão.
      if (atDestination) next.set(from, atDestination);
      else next.delete(from);

      return next;
    });
    setSelected(null);
  }

  /**
   * O que o toque num slot faz depende do que já estava escolhido.
   *
   * - nada escolhido · escolhe este (e a lista lateral acende, se ele estiver
   *   vazio);
   * - o mesmo de novo · desfaz a escolha, que é a saída sem consequência;
   * - **outro slot, com um ocupado escolhido** · move ou troca;
   * - outro slot, com um vazio escolhido · só muda a escolha, porque não há
   *   ninguém pra mover.
   */
  function selectSlot(index: number) {
    if (selected === index) {
      setSelected(null);
      return;
    }
    if (selected !== null && placed.has(selected)) {
      moveOrSwap(selected, index);
      return;
    }
    setSelected(index);
  }

  function changeFormation(next: FormationId) {
    setFormation(next);
    // A escalação **não** é limpa ao trocar de esquema: o índice do slot
    // continua valendo, e quem estava no 3 continua no 3. Trocar de 4-4-2 pra
    // 4-2-3-1 pra ver como fica não pode custar o time inteiro montado de novo.
    setSelected(null);
  }

  // **Slot cujo handle não tem id conhecido cai fora do que é gravado.** É o
  // caso de quem saiu do club com a tela aberta: ele já não está no elenco, e
  // mandar o id que a tela tinha antes seria escalar quem não está mais lá · o
  // servidor recusaria a gravação inteira com `PLAYER_NOT_IN_SQUAD`, e quem
  // estava salvando perderia o resto do trabalho por causa de um slot.
  const lineup: TacticSlot[] = [...placed.entries()]
    .flatMap(([index, handle]) => {
      const userId = idOf.get(handle);
      return userId ? [{ index, userId }] : [];
    })
    .sort((a, b) => a.index - b.index);

  /**
   * Quem está no slot escolhido, e se ele joga fora da posição dele.
   *
   * Mora aqui e não no `Pitch` porque quem mostra a frase é a **coluna ao
   * lado** · o campo só desenha o anel.
   */
  const selectedMember = selected === null ? undefined : byHandle.get(placed.get(selected) ?? '');
  const selectedSlotPosition =
    selected === null ? null : (slots.find((s) => s.index === selected)?.position ?? null);
  const selectedOutOfPosition =
    !!selectedMember?.position &&
    selectedSlotPosition !== null &&
    selectedMember.position !== selectedSlotPosition;

  /**
   * De onde o arraste saiu · `null` quando ninguém está arrastando.
   *
   * **O arrastar é adição, e nunca o único caminho.** Ele só existe onde há
   * ponteiro fino: o HTML5 *drag and drop* não dispara no toque, e é por isso
   * que ele **não** substitui o tocar-tocar · num campo de 320px o alvo de
   * arraste tem menos que o mínimo de toque, que é a razão registrada aqui
   * desde o começo pra não ter arraste. No desktop ele é o gesto natural, e cai
   * nas **mesmas** funções do toque, então não há dois comportamentos pra
   * manter.
   *
   * **A origem é tipada porque são duas**, e foi pedido do Eduardo que o gesto
   * atravessasse as duas metades da tela: do campo pro campo é mover ou trocar,
   * do banco pro campo é escalar, e do campo pro banco é tirar do time.
   */
  const [dragging, setDragging] = useState<
    { kind: 'slot'; index: number } | { kind: 'bench'; handle: string } | null
  >(null);

  /** O banco aceita quem vem do campo · soltar ali tira a pessoa do time. */
  const [overBench, setOverBench] = useState(false);

  function dropOnSlot(index: number) {
    if (!dragging) return;
    if (dragging.kind === 'slot') {
      if (dragging.index !== index) moveOrSwap(dragging.index, index);
    } else {
      assign(index, dragging.handle);
    }
    setDragging(null);
  }

  /** Um só, usado nos dois ramos · duas cópias do campo divergiriam. */
  const pitch = (
    <Pitch
      slots={slots}
      placed={placed}
      byHandle={byHandle}
      selected={selected}
      canEdit={canEdit}
      onSelect={selectSlot}
      dragging={dragging}
      onDragStart={(index) => {
        setDragging({ kind: 'slot', index });
        setSelected(null);
      }}
      onDragEnd={() => setDragging(null)}
      onDropOn={dropOnSlot}
    />
  );

  return (
    <section>
      <SectionTitle hint={t('tactic.hint')}>{t('tactic.title')}</SectionTitle>

      {/* A segunda coluna só existe pra quem edita · com a grade fixa, quem só
          lê via o campo empurrado pra esquerda por uma coluna vazia de 18rem.
          Visto na página pública, que é justamente onde ninguém edita. */}
      {/* **As duas colunas andam juntas e centradas, em vez de a primeira
          esticar.** Ela era `minmax(0,1fr)`, então numa tela de 1440 ficava com
          ~1100px pra um campo de 448 centrado nela · sobravam uns 330px mortos
          de cada lado, e o conjunto parecia desalinhado do resto da página.
          Apontado pelo Eduardo em 07/08/2026.

          Com `max-content` a coluna do campo passa a medir o campo, e o
          `justify-center` centra o **par**. O `max-w-md` do campo continua
          mandando na largura dele · o que muda é a coluna parar de esticar em
          volta. */}
      <div
        className={cn(
          'grid gap-5',
          // **`28rem` e não `max-content`.** Com `max-content` a coluna mede o
          // conteúdo, e o campo é `w-full` · ele não tem largura intrínseca,
          // então colapsava. Medido: a 1440 o campo caiu pra **266px**, menor
          // do que os 448 que ele tem a 768. Os 28rem são o próprio `max-w-md`
          // do campo, escritos na trilha.
          canEdit && 'lg:grid-cols-[28rem_18rem] lg:justify-center',
        )}
      >
        {/* As três peças da coluna dividem a largura do campo · com o seletor
            ocupando a coluna inteira e o campo centrado no meio dela, os dois
            pareciam de telas diferentes. Visto em captura a 1280. */}
        <div className="mx-auto w-full max-w-md space-y-3">
          {/*
            **A lista de formações ocupa o lugar do campo**, e não flutua nem
            empurra · as duas primeiras versões fizeram isso e o Eduardo derrubou
            as duas. O campo entra como filho do seletor porque é ele quem decide
            quando o desenho dá lugar à escolha: composição, não configuração.

            **Agrupada pela linha de trás, e isso é informação, não enfeite.**
            São 29 formações, e numa lista chapada elas viram um paredão que
            ninguém lê · quem monta time pensa primeiro em quantos zagueiros vai
            jogar. É o mesmo agrupamento que o jogo usa.
          */}
          {canEdit ? (
            <>
              {/* Não é `<label>` porque o controle é um `button` · rótulo que
                  embrulha botão não associa nada. Quem faz o vínculo é o
                  `aria-labelledby`. */}
              {/* **O aviso de não-salvo mora aqui também, e não só no botão.**
                  Trocar de formação redesenha o campo na hora, e mudança que
                  acontece à vista **parece gravada** · o texto ao lado do botão
                  é fraco demais pra desfazer essa impressão, e o botão fica
                  depois do campo, fora do olhar de quem acabou de escolher.
                  Apontado pelo Eduardo em 07/08/2026. */}
              <span className="flex items-center justify-between gap-2">
                <span
                  id={formationLabelId}
                  className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {t('tactic.formation')}
                </span>
                {dirty && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                    {t('tactic.notSaved')}
                  </span>
                )}
              </span>
              <FormationPicker
                value={formation}
                onChange={changeFormation}
                labelId={formationLabelId}
              />
              {/* **O campo não sai mais de cena pra a lista entrar** · desde
                  07/08/2026 a escolha acontece num diálogo que mostra os dois,
                  e aqui o desenho fica onde sempre esteve. */}
              {pitch}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-primary">{formationLabel(formation)}</p>
              {pitch}
            </>
          )}

          <p className="text-xs text-muted-foreground">
            {t('tactic.countPlaced', { count: placed.size, total: SLOTS_PER_FORMATION })}
          </p>

          {/* **A ação principal mora embaixo do campo, e não na coluna de
              reservas.** Ela ficava no fim da outra coluna, e a 1440 isso a
              jogava pro canto superior direito, a uns 600px de onde a pessoa
              acabou de mexer · o olho não acha a ação no lugar em que ela não
              trabalhou. Apontado pelo Eduardo em 07/08/2026.

              **E ele diz por que está desligado**, que é a regra da casa e o
              padrão que o diálogo de posição já seguia · antes era um botão
              verde a 50% de opacidade, que sobre fundo escuro ainda lê como
              clicável. Eu mesmo achei que estava ligado até medir. */}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {/* `cta` quando há o que salvar · o botão neutro competia em peso
                  com o texto ao lado, e a ação que a pessoa **precisa** fazer
                  não pode ter o mesmo destaque de quando não há nada a fazer. */}
              <SaveBar
                label={t('tactic.save')}
                onSave={() => onSave?.({ formation, slots: lineup })}
                dirty={dirty}
                saving={saving ?? false}
                // **A escalação não confirmava que salvou** · ela só voltava pro
                // estado "nada mudou", e a diferença entre *gravou* e *nunca
                // teve alteração* ficava só no sumiço do selo. Achado ao montar
                // o mapa da pendência 64.
                saved={saved ?? false}
                idleHint={t('tactic.nothingChanged')}
                dirtyHint={t('tactic.unsaved')}
              />
            </div>
          )}
        </div>

        {canEdit && (
          // **O banco é uma zona de soltar**, e não só uma lista · arrastar
          // alguém do campo pra cá tira a pessoa do time, que é o par natural
          // de arrastar de cá pro campo. Pedido do Eduardo em 07/08/2026, e é o
          // que fecha o gesto: sem isso, o arraste só funcionava numa metade da
          // tela.
          <div
            className={cn(
              // `select-none` **só aqui e no campo**, e não na seção inteira ·
              // título, dica e o contador continuam selecionáveis, que é texto
              // que a pessoa pode querer copiar. Apontado pelo Eduardo em
              // 07/08/2026, depois de eu ter travado o bloco todo.
              'select-none space-y-3 rounded-xl p-2 transition-colors',
              // **`ring` não tem estilo tracejado, e isso continua valendo no
              // Tailwind 4** · o anel é sombra, não contorno. `ring-dashed`
              // ficou aqui pintando nada até 18/08/2026, achado pelo
              // `scan:tailwind`. Quem aceita `dashed` é o `outline`, que é o
              // mesmo recurso do slot logo abaixo e também não empurra layout.
              overBench &&
                'bg-destructive/10 outline-2 outline-dashed outline-offset-2 outline-destructive/50',
            )}
            onDragOver={(e) => {
              if (dragging?.kind !== 'slot') return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setOverBench(true);
            }}
            onDragLeave={() => setOverBench(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOverBench(false);
              if (dragging?.kind === 'slot') clear(dragging.index);
              setDragging(null);
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {overBench ? t('tactic.dropToBench') : selected === null ? t('tactic.bench') : t('tactic.pick')}
            </p>

            {/* **O que o selo `!` dizia no campo, dito aqui com a frase
                inteira.** Ele era um alvo de 16px que ninguém acertava, e
                aparecia em todo mundo ao mesmo tempo · a informação continua
                existindo, e agora num lugar com largura pra escrevê-la. Só
                aparece pro slot escolhido, que é quando ela importa. */}
            {selectedMember && (
              <div className="space-y-2 rounded-xl border bg-card p-3">
                <p className="text-sm font-semibold">{selectedMember.displayName}</p>
                {selectedOutOfPosition && selectedMember.position && (
                  <p className="text-xs text-muted-foreground">
                    <Trans
                      i18nKey="tactic.outOfPositionHint"
                      values={{
                        player: selectedMember.displayName,
                        position: t(positionKey(selectedMember.position)),
                        slot: t(positionKey(selectedSlotPosition)),
                      }}
                      components={[
                        <span key="position" className="font-semibold text-foreground" />,
                        <span key="slot" className="font-semibold text-foreground" />,
                      ]}
                    />
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => selected !== null && clear(selected)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  {t('tactic.clear')}
                </button>
              </div>
            )}
            {bench.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                {t('tactic.benchEmpty')}
              </p>
            ) : (
              <ul className="space-y-2">
                {bench.map((member) => (
                  <li key={member.handle}>
                    <button
                      type="button"
                      disabled={selected === null}
                      onClick={() => selected !== null && assign(selected, member.handle)}
                      // **Arrastável mesmo com o botão desabilitado** · o
                      // `disabled` existe pro clique, que precisa de um slot
                      // escolhido antes. O arraste não precisa: ele já diz pra
                      // onde vai.
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        setDragging({ kind: 'bench', handle: member.handle });
                      }}
                      onDragEnd={() => setDragging(null)}
                      className={cn(
                        'flex w-full cursor-grab items-center gap-3 rounded-xl border bg-card p-2.5 text-left active:cursor-grabbing',
                        selected === null
                          ? 'opacity-60'
                          : 'hover:border-primary/50 hover:bg-primary/5',
                        dragging?.kind === 'bench' &&
                          dragging.handle === member.handle &&
                          'opacity-40',
                      )}
                    >
                      <Avatar
                        name={member.displayName}
                        src={member.avatarUrl}
                        className="h-8 w-8"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">{member.displayName}</span>
                      {member.position && (
                        <span className="shrink-0 text-xs font-semibold text-primary">
                          {t(positionKey(member.position))}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

          </div>
        )}
      </div>
    </section>
  );
}

/** Quem está em cada slot, por índice · a forma que o campo manipula. */
type Lineup = Map<number, string>;

/**
 * Duas escalações são a mesma quando **os mesmos slots têm as mesmas pessoas**.
 *
 * Compara por valor, e não por identidade do `Map` · cada ação cria um mapa
 * novo, então identidade responderia "mudou" sempre, que é justamente a flag
 * que isto substituiu.
 */
function sameLineup(a: Lineup, b: Lineup): boolean {
  if (a.size !== b.size) return false;
  for (const [index, handle] of a) {
    if (b.get(index) !== handle) return false;
  }
  return true;
}

/**
 * O desenho em si.
 *
 * **Proporção fixa e posição em porcentagem**, então ele funciona de 320px a um
 * monitor largo sem número mágico por breakpoint. A peça posicionada em
 * porcentagem já deu problema aqui (a marca d'água do login), e a diferença é
 * que ali a proporção do container variava · aqui ela é travada pelo
 * `aspect-[3/4]`, que é o que faz a porcentagem significar sempre a mesma coisa.
 */
function Pitch({
  slots,
  placed,
  byHandle,
  selected,
  canEdit,
  onSelect,
  dragging,
  onDragStart,
  onDragEnd,
  onDropOn,
}: {
  slots: readonly FormationSlot[];
  placed: Map<number, string>;
  byHandle: Map<string, SquadMember>;
  selected: number | null;
  canEdit: boolean;
  onSelect: (index: number) => void;
  dragging: { kind: 'slot'; index: number } | { kind: 'bench'; handle: string } | null;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  onDropOn: (index: number) => void;
}) {
  const { t } = useTranslation();
  /**
   * Sobre qual slot o ponteiro está **agora**, durante um arraste.
   *
   * Estado local porque ele só vive enquanto o gesto dura e ninguém fora daqui
   * precisa saber · o `dragging` é do board, porque é ele quem move.
   */
  const [over, setOver] = useState<number | null>(null);

  return (
    // **Largura travada, e não é estética.** Em tela larga o `aspect-[3/4]` de
    // um container de 800px rende um campo de 1067px de altura, que engole a
    // página inteira e obriga a rolar pra ver o ataque. Medido em captura a
    // 1280 · o campo tem tamanho próprio, não o da coluna que o recebeu.
    // `container-type: inline-size` é o que deixa as peças medirem **o campo**,
    // e não a janela · ver o comentário do círculo, logo abaixo.
    // `select-none` porque **arrastar em cima de texto seleciona o texto**, e
    // aí o navegador arrasta a seleção em vez da peça · o gesto não pega e não
    // há erro nenhum pra explicar. Fica no campo e na lista de reservas, que
    // são os dois lugares onde a mão encosta pra arrastar.
    <div className="relative mx-auto aspect-[3/4] w-full max-w-md select-none overflow-hidden rounded-2xl border bg-card [container-type:inline-size]">
      <PitchLines />
      {slots.map((slot) => {
        const handle = placed.get(slot.index);
        const member = handle ? byHandle.get(handle) : undefined;
        const isSelected = selected === slot.index;
        // Sem posição no vínculo **não há o que comparar**, e a tela não inventa
        // encaixe · o campo é opcional no perfil e no vínculo.
        const playerPosition = member?.position ?? null;
        const outOfPosition = playerPosition !== null && playerPosition !== slot.position;

        /**
         * Os dois estados do arraste, e eles são diferentes de propósito.
         *
         * **Alvo possível** é o convite: acontece em todos os outros slots no
         * instante em que o gesto começa, e usa o **tracejado** que a tela já
         * usa pra "aqui cabe alguém" · é o mesmo vocabulário do slot vazio, e
         * foi o que o Eduardo pediu no lugar do anel retangular.
         *
         * **Em cima** é a confirmação, e precisa ser mais forte que o convite:
         * sem ela, soltar entre dois slots vizinhos é adivinhação · vale
         * inclusive pra troca, que é o caso em que soltar no lugar errado mexe
         * em duas pessoas de uma vez.
         */
        const isDragging = dragging?.kind === 'slot' && dragging.index === slot.index;
        const isTarget = dragging !== null && !isDragging;
        const isOver = isTarget && over === slot.index;

        return (
          <div
            key={slot.index}
            // Mesmo padrão do `data-player-handle` do elenco · dá alvo estável
            // pra teste e pra probe de medição, sem depender do texto.
            data-slot-index={slot.index}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${slot.x * 100}%`, top: `${(1 - slot.y) * 100}%` }}
          >
            {/* **O botão é só o círculo, e o nome pende por fora dele.**
                Enquanto o rótulo estava no fluxo, ele empurrava o centro do
                slot pra baixo · e como a peça é centrada por
                `-translate-y-1/2`, o círculo de quem estava escalado subia
                **15px** em relação ao ponto da formação, medido a 320 e a 1440.
                Numa linha com uns ocupados e outros vazios, os círculos ficavam
                em alturas diferentes · foi o que o Eduardo viu como "tamanho
                diferente". O círculo sempre teve o mesmo tamanho nos dois. */}
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => onSelect(slot.index)}
              aria-label={member ? member.displayName : t('tactic.slotEmpty')}
              // Só quem está no campo pode ser arrastado · slot vazio não tem
              // o que mover, e quem não edita não move nada.
              draggable={canEdit && !!member}
              // **`move` não é detalhe de API, é o que o sistema escreve na
              // tela.** Sem declarar nada vale o padrão `copy`, e aí o Windows
              // desenha o badge de mais e a legenda **"Copiar"** ao lado do
              // cursor · a palavra é falsa, porque arrastar daqui tira a pessoa
              // do slot de origem. Apontado pelo Eduardo em 07/08/2026, no
              // navegador. Vale nos dois lados: quem começa declara o que
              // permite, quem recebe declara o que vai fazer.
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                onDragStart(slot.index);
              }}
              onDragEnd={onDragEnd}
              // `preventDefault` é o que **autoriza** o drop · sem ele o
              // navegador recusa e o gesto morre sem sinal nenhum.
              onDragOver={(e) => {
                if (!canEdit || dragging === null) return;
                // `preventDefault` é o que **autoriza** o drop · sem ele o
                // navegador recusa e o gesto morre sem sinal nenhum.
                e.preventDefault();
                // Precisa ser dito **a cada evento**, e não uma vez no começo ·
                // o `dropEffect` volta ao padrão a cada `dragover`.
                e.dataTransfer.dropEffect = 'move';
                setOver(slot.index);
              }}
              onDragLeave={() => setOver((current) => (current === slot.index ? null : current))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                onDropOn(slot.index);
              }}
              className={cn(
                // `touch-target` garante os 44px de alvo **sem** engordar a
                // caixa · o círculo encolheu junto com o campo e o alvo não
                // podia encolher com ele.
                'touch-target group relative flex w-12 items-center justify-center sm:w-16',
                canEdit && !!member && 'cursor-grab active:cursor-grabbing',
                // O que está sendo arrastado apaga. **O destaque dos destinos
                // mora no círculo**, e não numa caixa em volta do slot · era um
                // `ring` retangular, que é o mesmo desenho que a seleção já
                // tinha abandonado. Apontado pelo Eduardo em 07/08/2026.
                isDragging && 'opacity-40',
              )}
            >
              {member ? (
                /**
                 * **O estado mora num anel em volta, não no avatar.**
                 *
                 * Aplicado no próprio avatar ele ficava invisível justamente em
                 * quem tem **foto**: `ring-inset` desenha por dentro, ou seja
                 * por cima da imagem, e some no meio dela · apontado pelo
                 * Eduardo em 07/08/2026. E os dois avatares nunca ficariam
                 * iguais, porque o de iniciais já traz um `ring-1` próprio e o
                 * de foto não traz nada.
                 *
                 * Num invólucro, o desenho é o mesmo para os dois e não disputa
                 * classe com o componente.
                 */
                <span
                  className={cn(
                    // **O círculo mede o campo, não a janela.** Ele era fixo em
                    // 36/40px enquanto o campo escala com a largura · a 320px
                    // isso dava 12,5% da largura do campo contra 8,9% no
                    // tamanho cheio, ou seja, **quanto menor a tela, mais
                    // lotado o campo ficava**. Apontado por ele no mesmo dia, e
                    // é a raiz de boa parte do "tudo colado".
                    //
                    // `cqw` é porcentagem da largura do container, que aqui é o
                    // campo · com ela a peça guarda a mesma proporção de 320 a
                    // 448px, que é o que o `aspect-[3/4]` já faz pelo desenho.
                    'block h-[10cqw] w-[10cqw] rounded-full transition',
                    // **Fora de posição não é destrutivo**, e a primeira versão
                    // usava `destructive` · anel vermelho em cinco peças fazia
                    // a escalação inteira parecer erro.
                    outOfPosition && 'ring-1 ring-muted-foreground/60',
                    isSelected
                      ? 'ring-2 ring-primary'
                      : canEdit && !isTarget && 'group-hover:ring-2 group-hover:ring-primary/50',
                    // Convite tracejado, confirmação sólida e um pouco maior ·
                    // `outline` aceita `dashed` e não empurra layout.
                    //
                    // **A sólida é `outline-solid`, e ela passou a existir com o
                    // Tailwind 4** · até 26/08/2026 esta linha era `outline`
                    // sozinho, porque no 3 era ele que valia "estilo sólido".
                    //
                    // **No 4 o `outline` sozinho virou LARGURA de 1px**, como o
                    // `border`, e o desenho só continuou certo porque o
                    // `.outline-2` sai depois dele na folha compilada e vence
                    // por ordem. Depender disso é frágil · `outline-solid` diz
                    // o que se quer e não disputa largura com ninguém.
                    //
                    // Antes de 18/08/2026 a linha era `outline-solid` num
                    // Tailwind 3, onde a classe **não existia**: a confirmação
                    // saía tracejada com o comentário ao lado afirmando que era
                    // sólida. Achado pelo `scan:tailwind`, e é o defeito que ele
                    // existe pra pegar.
                    isTarget && !isOver && 'outline-dashed outline-2 outline-offset-2 outline-primary/50',
                    isOver && 'scale-110 outline-solid outline-2 outline-offset-2 outline-primary ring-2 ring-primary',
                  )}
                >
                  {/* **`ring-0` desliga o anel do próprio avatar**, e sem ele
                      o estado vira **duas** linhas concêntricas: o de iniciais
                      traz um `ring-1 ring-primary/30` por dentro, e o invólucro
                      desenha o estado por fora. Medido em 07/08/2026 · em
                      repouso davam uma linha cinza (fora de posição) e uma
                      verde, e no hover duas verdes de tons diferentes. Era o
                      que o Eduardo via como "borda meio estranha", e é por isso
                      que **só na seleção parecia certo**: ali a de fora é verde
                      chapada e cobre a de dentro.

                      O anel do avatar continua valendo onde ele aparece
                      sozinho, que é o resto do produto · aqui o estado é do
                      invólucro, e duas bordas concêntricas o `docs/design.md`
                      já proíbe por nome.

                      **E o fundo a 30% é o que faz a peça parar de recortar o
                      campo.** O disco de iniciais é opaco (`bg-secondary`, 43)
                      sobre um campo de 33: a linha do meio-campo **parava** ao
                      encostar nele e reaparecia do outro lado, enquanto o slot
                      vazio ao lado deixa a mesma linha atravessar. Comparado em
                      captura a 100, 60, 30 e 0%: a 60 a linha ainda some, e a 0
                      o ocupado fica quase igual ao vazio. Quem tem **foto**
                      continua opaco, e isso é da foto, não da regra. */}
                  <Avatar
                    name={member.displayName}
                    src={member.avatarUrl}
                    className="h-full w-full bg-secondary/30 ring-0"
                  />
                </span>
              ) : (
                <span
                  className={cn(
                    // Mesma medida do avatar · os dois são a mesma peça, e foi
                    // justamente a diferença entre eles que gerou a queixa de
                    // "tamanho diferente". A sigla escala junto, senão ela
                    // estoura o círculo pequeno.
                    'grid h-[10cqw] w-[10cqw] place-items-center rounded-full border border-dashed border-muted-foreground/50 text-[2.6cqw] font-bold text-muted-foreground transition',
                    // Sólida quando escolhido · o tracejado já é o estado de
                    // repouso, então trocar o traço **é** o sinal, sem somar um
                    // anel por fora.
                    isSelected
                      ? 'border-solid border-primary text-primary'
                      : canEdit &&
                        !isTarget &&
                        'group-hover:border-primary/60 group-hover:text-primary',
                    // Aqui o tracejado já é o repouso, então o convite é ele
                    // **em verde**, e a confirmação fecha o traço e cresce.
                    isTarget && 'border-primary/50 text-primary/70',
                    isOver && 'scale-110 border-solid border-primary bg-primary/15 text-primary',
                  )}
                >
                  {t(positionKey(slot.position))}
                </span>
              )}
              {/* **O nome só aparece quando há nome.** No slot vazio a sigla já
                  está dentro do círculo, e repeti-la embaixo era a mesma palavra
                  duas vezes na mesma peça · apareceu em captura. */}
              {member && (
                /**
                 * **Quebra em duas linhas, e é a terceira peça a decidir isso**
                 * · o `ClubIdentity` em 30/07, o card de club e este slot em
                 * 04/08. A regra que ficou: **nome de identidade quebra, não
                 * corta**, porque reticências escondem justamente o que
                 * identifica.
                 *
                 * O slot é estreito **em toda resolução**, e é o que separa
                 * este corte dos outros da tela: medido em 04/08/2026, o rótulo
                 * tem **56px a 320 e os mesmos 56px a 2560** · o campo tem 11
                 * slots em linha, então ele não cresce com o monitor.
                 *
                 * **A primeira tentativa foi mostrar só a primeira palavra, e
                 * ela estava errada** · o Eduardo apontou o furo antes de a
                 * tela ser validada: encurtar sem olhar se cabia jogava fora
                 * informação de graça (`Torres Jr` mede **39px** e cabia
                 * inteiro) e, pior, fazia `Torres` e `Torres Jr` virarem a mesma
                 * palavra no campo. Trocar um corte visível por dois players
                 * indistinguíveis é piorar.
                 *
                 * Duas linhas resolvem sem número mágico e sem medir em
                 * runtime: quem cabe numa linha fica numa, quem não cabe usa a
                 * segunda, e o `title` cobre o caso absurdo que nem em duas
                 * cabe.
                 *
                 * **Fora do fluxo desde 07/08/2026** · a altura fixa em duas
                 * linhas alinhava os slots entre si, mas desalinhava cada
                 * círculo do ponto onde a formação o manda ficar. Pendurado por
                 * `absolute`, ele não entra na conta do centro e as duas coisas
                 * passam a valer ao mesmo tempo.
                 */
                <span
                  title={member.displayName}
                  className={
                    // **Uma linha no estreito, duas a partir do `sm`.**
                    //
                    // Medido em 07/08/2026 no pior caso (nome de 32 letras, seis
                    // escalados): com duas linhas a 320px o rótulo da defesa
                    // caía **10px em cima do círculo do goleiro**, e o do meia
                    // 11px em cima do zagueiro · três colisões. A 390 ainda
                    // sobravam duas, de 1px.
                    //
                    // A segunda linha não estava entregando identificação ali:
                    // num slot de 48px, nome comprido termina em reticências
                    // **mesmo com duas linhas**. Ela entregava colisão. Onde há
                    // espaço (de `sm` pra cima) a regra da casa continua valendo
                    // · nome de identidade quebra, não corta.
                    //
                    // **O fundo é o que faz o resto do problema sumir**, e ele
                    // resolve dois de uma vez: o nome do goleiro cruzava as
                    // linhas da área em toda resolução, e sobravam 2px de
                    // encosto no círculo vizinho a 320px. Com uma caixa opaca
                    // atrás do texto, sobreposição deixa de virar ilegibilidade
                    // · e é bem mais barato que mexer na tabela `DEPTH`, que
                    // mudaria o desenho das 29 formações pra ganhar 3px.
                    //
                    // **Sem margem, e duas linhas de volta.** O caminho até aqui
                    // foi: colado (lia como peça só), `mt-1.5` (longe demais, o
                    // nome parecia de outro slot), e então a observação do
                    // Eduardo que resolveu · o **botão já é mais largo que o
                    // círculo**, e o `py-0.5` do próprio rótulo já dá o respiro.
                    // A margem era vão em cima de vão.
                    //
                    // E com o círculo agora proporcional (10% do campo, contra
                    // 36px fixos), sobra altura pra segunda linha voltar em
                    // **todas** as larguras · o que a tirou a 320px foi a
                    // colisão com o círculo do goleiro, e ela deixou de
                    // acontecer. Um pixel a menos de fonte no estreito paga a
                    // linha extra.
                    // **Halo em vez de caixa.** O rótulo precisa se ler por cima
                    // das linhas da área (o goleiro fica sobre elas em toda
                    // resolução) e, no pior caso, por cima do círculo vizinho.
                    //
                    // A primeira tentativa foi um fundo: `bg-card/85` não
                    // contrastava com nada, porque o campo **é** `bg-card`; e
                    // opaco ele resolvia a leitura mas virava um retângulo
                    // recortando o desenho do campo · o Eduardo recusou os dois.
                    //
                    // A sombra dupla faz o mesmo trabalho **só em volta das
                    // letras**: some onde não há nada atrás, e abre o espaço
                    // exato onde há. É o que legenda sobre imagem usa, e não
                    // desenha peça nenhuma.
                    cn(
                      'pointer-events-none absolute left-1/2 top-full w-full -translate-x-1/2 px-1 py-0.5 text-center text-[9px] font-semibold leading-tight break-words [text-shadow:0_0_3px_hsl(var(--card)),0_0_3px_hsl(var(--card)),0_0_2px_hsl(var(--card))] sm:text-[10px]',
                      // **Uma linha só no slot mais fundo.** Ele fica colado na
                      // linha de fundo, e a segunda linha do nome passa da borda
                      // do campo · como o campo é `overflow-hidden`, ela é
                      // cortada no meio da palavra. Visto a 320px, onde o campo
                      // tem menos altura pra dar.
                      //
                      // Subir o rótulo não serve: ele bateria no da defesa, que
                      // desce nesse mesmo espaço.
                      slot.y < 0.15 ? 'line-clamp-1' : 'line-clamp-2',
                    )
                  }
                >
                  {member.displayName}
                </span>
              )}
            </button>

            {/* **O campo não tem mais nenhum botão flutuante**, e os dois que
                havia saíram pelo mesmo motivo: eram alvos de 16 e 24px pendurados
                no canto de uma peça pequena, sem hover, e o `touch-target` da
                casa só amplia na vertical.

                O selo de fora de posição virou o anel do avatar mais a frase na
                coluna ao lado. O `X` virou uma ação escrita lá também, com
                palavra, alvo inteiro e estado de hover · tirar alguém é a ação
                mais rara desta tela, e a mais fácil de disparar sem querer
                quando mora encostada no rosto da pessoa. */}
          </div>
        );
      })}
    </div>
  );
}

/**
 * As linhas do campo · decoração, e por isso `aria-hidden`.
 *
 * **A margem que existia aqui saiu**, e ela era conserto no lugar errado: a peça
 * ficava metade fora porque a tabela punha o ataque em `1`, ou seja em cima da
 * linha de fundo. Empurrar tudo pra dentro escondia o sintoma e deixava o time
 * espremido · quem passou a responder onde cada linha joga é a tabela `DEPTH`,
 * no `formations.ts`, e aí o campo pode ser desenhado inteiro.
 *
 * **Área e meia-lua são caminho aberto, não retângulo.** A área encosta na linha
 * de fundo, então um `rect` desenha um traço **por cima** da borda do campo e o
 * resultado é linha dobrada · foi o que o Eduardo viu no gol. Desenhando três
 * lados, a linha de fundo continua sendo a borda, que é como um campo de verdade
 * é marcado.
 *
 * A linha do meio atravessa o círculo central de propósito · é assim no campo, e
 * o que fazia aquilo parecer sujeira era a mesma espessura da área dobrada ao
 * lado. Com traço fino e uniforme, o cruzamento lê como marcação.
 */
/**
 * As linhas do campo.
 *
 * **A linha de fundo é uma borda de CSS, e não o `rect` do SVG · isso é
 * conserto.** O Eduardo apontou que a borda do container discordava da linha, e
 * ele estava certo por dois motivos que se somavam: o container arredonda em
 * 16px e o `rect` arredondava em 3 unidades de `viewBox`, e como o SVG estica
 * com `preserveAspectRatio="none"`, esse raio ainda saía **elíptico** · duas
 * curvas diferentes a seis pixels uma da outra, que o olho lê como erro.
 *
 * Com `inset-2` e raio de 8, as duas ficam concêntricas de verdade em qualquer
 * tamanho, porque quem desenha é o mesmo motor que desenha o container. E as
 * marcações internas passaram a viver **dentro** dessa caixa, então elas se
 * alinham à linha de fundo por construção em vez de por número escolhido.
 */
