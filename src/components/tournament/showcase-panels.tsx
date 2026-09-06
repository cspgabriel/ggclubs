import { Camera, Check, MessagesSquare } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ClubCrest } from '@/components/club/club-crest';
import { AppNotice } from '@/components/desktop/app-notice';
import { Badge } from '@/components/ui/badge';
import { Chamfer } from '@/components/ui/chamfer';
import { SHOWCASE_REPORT, SHOWCASE_TABLE, showcaseTag } from '@/lib/showcase';
import { cn } from '@/lib/utils';
import './showcase-panels.css';

/**
 * As três peças do produto que o grupo não tem · **tabela, súmula e aviso**,
 * desenhadas com dado de exemplo.
 *
 * A landing dizia *"nada de planilha, print de placar ou admin sumido"* e não
 * mostrava o que entra no lugar de cada um. Aqui cada painel é a resposta a um
 * dos três, e o desenho é o do produto de verdade (a tabela do `GroupCard`, o
 * placar da linha de confronto, o aviso como ele chega) · print envelhece, e
 * CSS acompanha os tokens.
 *
 * **Sem citar o concorrente pelo nome** · decisão do Eduardo em 08/08/2026: a
 * gente também vai usar grupo, pra captar e avisar. A diferença é onde o
 * campeonato **acontece**, e é isso que o título da seção diz.
 */
export function ShowcasePanels({ className }: { className?: string }) {
  const { t } = useTranslation();
  const home = t('landing.showcaseTeam', { n: SHOWCASE_REPORT.home.team });
  const away = t('landing.showcaseTeam', { n: SHOWCASE_REPORT.away.team });
  const score = `${SHOWCASE_REPORT.home.goals} x ${SHOWCASE_REPORT.away.goals}`;

  return (
    <div className={cn('showcase-panels grid gap-4 xl:grid-cols-3', className)}>
      <Panel
        label={t('landing.showcaseTableLabel')}
        title={t('landing.showcaseTableTitle')}
        body={t('landing.showcaseTableBody')}
        alt={t('landing.showcaseTableAlt')}
      >
        <ShowcaseTable />
      </Panel>

      <Panel
        label={t('landing.showcaseReportLabel')}
        title={t('landing.showcaseReportTitle')}
        body={t('landing.showcaseReportBody')}
        alt={t('landing.showcaseReportAlt')}
      >
        <div className="flex items-center gap-2">
          <ClubCrest tag={showcaseTag(SHOWCASE_REPORT.home.team)} className="h-6 w-6 text-[8px]" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
            {home}
          </span>
          <span className="shrink-0 font-display text-xl tabular-nums text-foreground">
            {SHOWCASE_REPORT.home.goals}
            <span className="mx-1 text-sm text-muted-foreground">x</span>
            {SHOWCASE_REPORT.away.goals}
          </span>
          <span className="min-w-0 flex-1 truncate text-right text-xs font-semibold text-foreground">
            {away}
          </span>
          <ClubCrest tag={showcaseTag(SHOWCASE_REPORT.away.team)} className="h-6 w-6 text-[8px]" />
        </div>
        <div className="mt-3 space-y-1.5 border-y border-border/50 py-2 text-[11px]">
          <p className="rounded-lg bg-secondary px-2 py-1.5">
            <span className="font-semibold text-primary">{home}</span>
            {' · '}
            {t('landing.showcaseChatHome')}
          </p>
          <p className="ml-4 rounded-lg border border-primary/20 bg-primary/5 px-2 py-1.5">
            <span className="font-semibold text-primary">{away}</span>
            {' · '}
            {t('landing.showcaseChatAway')}
          </p>
          <p className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <MessagesSquare className="h-3 w-3 shrink-0" aria-hidden />
            {t('landing.showcaseChatHelp')}
          </p>
        </div>
        <ul className="mt-3 space-y-1.5">
          {[home, away].map((club) => (
            <li key={club} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Check className="h-3 w-3 shrink-0 text-primary" aria-hidden />
              {t('landing.showcaseReported', { club, score })}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge size="sm" variant="success">
            {t('landing.showcaseMatched')}
          </Badge>
          <Badge size="sm" variant="outline" icon={Camera}>
            {t('landing.showcasePrint')}
          </Badge>
        </div>
      </Panel>

      <Panel
        label={t('landing.showcaseNoticeLabel')}
        title={t('landing.showcaseNoticeTitle')}
        body={t('landing.showcaseNoticeBody')}
      >
        <div className="showcase-notices space-y-2">
          <AppNotice
            className="xl:items-center"
            title={t('desktop.noticeTitle')}
            body={t('desktop.noticeBody')}
            alt={t('landing.showcaseNoticeAlt')}
          />
          <AppNotice
            className="xl:items-center"
            title={t('landing.showcaseNoticeReport')}
            body={t('landing.showcaseNoticeReportBody')}
            alt={t('landing.showcaseNoticeAlt')}
          />
        </div>
      </Panel>
    </div>
  );
}

/**
 * Um painel · o rótulo, o desenho, e a frase.
 *
 * O desenho vem antes do texto de propósito: a seção existe pra **mostrar**, e o
 * texto explica o que a pessoa acabou de ver. Ao contrário, ele seria mais um
 * parágrafo com ilustração.
 */
function Panel({
  label,
  title,
  body,
  alt,
  children,
}: {
  label: string;
  title: string;
  body: string;
  /**
   * O rótulo do desenho pra leitor de tela · quando ele existe, o desenho vira
   * uma imagem só. Sem ele, cada peça de dentro já se descreve (o aviso).
   */
  alt?: string;
  children: ReactNode;
}) {
  return (
    <Chamfer
      className="showcase-panel min-w-0"
      border="bg-border"
      innerClassName="flex min-w-0 flex-col bg-card p-3 sm:p-5"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{label}</p>
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt}
        className="showcase-demo mt-3 rounded-xl border border-border/60 bg-background/60 p-3"
      >
        {children}
      </div>
      <h3 className="mt-4 font-display text-lg uppercase leading-tight text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </Chamfer>
  );
}

function signedDiff(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

/**
 * A tabela de um grupo, com as colunas que cabem num painel · pontos, jogos e
 * saldo. É a mesma leitura do `GroupCard`: a letra grande, a barra da zona à
 * esquerda, os pontos em display.
 */
function ShowcaseTable() {
  const { t } = useTranslation();
  const columns = [
    { key: 'tournament.tablePoints' as const, strong: true },
    { key: 'tournament.tablePlayed' as const, strong: false },
    { key: 'tournament.tableDiff' as const, strong: false },
  ];

  return (
    <div className="showcase-table">
      <div className="flex items-center gap-2 pb-2">
        <span aria-hidden className="font-display text-2xl leading-none text-primary">
          A
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {t('tournament.groupLabel')}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-primary">
          {t('tournament.groupQualify', { count: 2 })}
        </span>
      </div>
      <div className="flex h-6 items-center gap-1.5 pl-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span className="min-w-0 flex-1">{t('tournament.tableClub')}</span>
        {columns.map((col) => (
          <span
            key={col.key}
            className={cn('w-7 shrink-0 text-center', col.strong && 'text-foreground')}
          >
            {t(col.key)}
          </span>
        ))}
      </div>
      {SHOWCASE_TABLE.map((row, index) => (
        // O sinal explícito no positivo, como na tabela de verdade · a conta
        // fica fora do JSX porque o scanner de strings lê a comparação como
        // texto de tela.
        <div
          key={row.team}
          className={cn(
            'flex h-8 items-center gap-1.5 border-t border-border/50',
            row.zone === 'direct' && 'border-l-2 border-l-primary pl-1.5',
            row.zone === 'bestNext' && 'border-l-2 border-l-amber-400 pl-1.5',
            row.zone === null && 'pl-2',
          )}
        >
          <span className="w-3 shrink-0 text-center text-[11px] tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <ClubCrest tag={showcaseTag(row.team)} className="h-4 w-4 text-[7px]" />
          <span className="min-w-0 flex-1 truncate text-xs text-foreground">
            {t('landing.showcaseTeam', { n: row.team })}
          </span>
          <span className="w-7 shrink-0 text-center font-display text-xs text-foreground">
            {row.points}
          </span>
          <span className="w-7 shrink-0 text-center text-[11px] tabular-nums text-muted-foreground">
            {row.played}
          </span>
          <span className="w-7 shrink-0 text-center text-[11px] tabular-nums text-muted-foreground">
            {signedDiff(row.goalDiff)}
          </span>
        </div>
      ))}
    </div>
  );
}
