import type { TournamentStatus } from '@ggclubs/schemas';
import { useTranslation } from 'react-i18next';
import { STEPS, stepOf } from '@/lib/edition-steps';
import { cn } from '@/lib/utils';

/**
 * **A vida da edição, desenhada** · onde ela está, o que já passou e o que vem.
 *
 * **Ela não diz de quem é a vez**, e essa linha já dizia que sim · quem responde
 * isso é a `nextStepOf`, que mora em `lib/edition-steps.ts`, mais a frase que o cartão escreve. As duas
 * perguntas se separaram em 19/08/2026 porque elas **discordam**: uma edição
 * sorteada segue `open` até alguém fechar, então a régua a desenha em
 * "inscrições" enquanto a vez já é dos clubs.
 *
 * Ela nasceu de um pedido do Eduardo em 18/08/2026, e ele é sobre pessoas:
 * *"com o tempo podemos ter múltiplos admins que vão gerenciar o campeonato e
 * que não tenham tanta experiência"*. Até aqui o painel assumia que quem opera
 * **já sabe** · que a varredura sorteia sozinha **quando a edição lota**, que
 * fora disso quem sorteia é a organização a partir da data anunciada, e que
 * depois da chave são os clubs que declaram o placar. Nada disso estava escrito,
 * e o custo de errar é uma edição sorteada antes da hora.
 *
 * > **Esta linha dizia "quando chega o prazo"** até 02/09/2026, e a varredura
 * > nunca fez isso · pendência 180.
 *
 * **Ela também é a peça de identidade do painel**, e as duas coisas não brigam:
 * régua de fases é a linguagem de transmissão esportiva que o `docs/design.md`
 * pede desde 28/07 · o mesmo lower-third de onde saiu o marquee. Clareza e
 * imersão pediram o mesmo desenho.
 *
 * **Um passo verde por vez, e o resto neutro** · é a regra de cor da casa: doze
 * blocos verdes numa tela matam o destaque que o verde existe pra dar.
 *
 * **A 320 ela muda de forma, não some** · os pontos ficam, e só o passo corrente
 * mantém o rótulo. É a regra de peça de desktop no celular.
 */

export function EditionRail({
  status,
  drawn,
  className,
}: {
  status: TournamentStatus;
  /**
   * A chave já saiu · **e ela não é derivável do status**, porque a edição segue
   * `open` até alguém fechar. Sem isto a régua diz "inscrições" com a chave no
   * ar.
   */
  drawn: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const current =
    drawn && status !== 'finished' && status !== 'cancelled'
      ? stepOf(status) === 'signup'
        ? 'bracket'
        : stepOf(status)
      : stepOf(status);
  const at = STEPS.indexOf(current);

  return (
    <div className={cn('min-w-0', className)}>
      <ol className="flex items-center gap-1.5">
        {STEPS.map((step, i) => {
          const done = i < at;
          const now = i === at;
          return (
            <li key={step} className={cn('flex min-w-0 items-center gap-1.5', now && 'shrink')}>
              <span
                aria-hidden
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',
                  now ? 'bg-primary' : done ? 'bg-primary/40' : 'bg-border',
                )}
              />
              {/* **Só o passo corrente carrega rótulo abaixo de `sm`** · cinco
                  palavras lado a lado a 320 truncam as cinco, e aí a régua deixa
                  de dizer onde a edição está, que é a única coisa que ela faz. */}
              <span
                className={cn(
                  'truncate text-[10px] uppercase tracking-widest',
                  now ? 'font-semibold text-primary' : 'hidden text-muted-foreground sm:inline',
                )}
              >
                {t(`tournament.step.${step}`)}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={cn('h-px w-3 shrink-0 sm:w-5', done ? 'bg-primary/40' : 'bg-border')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
