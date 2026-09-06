import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wordmark } from '@/components/brand';
import { cn } from '@/lib/utils';

/** Abaixo disto a espera não é percebida · mostrar algo aqui só causa flash. */
const APPEAR_AFTER_MS = 140;

/**
 * Tela do intervalo entre abrir o app e saber quem está logado.
 *
 * O ponto não é "mostrar que está carregando", é **não mostrar a tela errada**.
 * Por isso ela tem duas travas de tempo: não aparece se a espera for curta, e
 * se aparecer não some antes de ser lida. Sem a primeira, o app pisca em quem
 * tem sessão em cache; sem a segunda, pisca em quem tem rede lenta.
 *
 * Não há barra de progresso nem porcentagem: seria inventar informação que não
 * temos, e transmitir demora onde costuma não haver.
 */
export function BootSplash() {
  const { t } = useTranslation();
  // Se a marca estática do `index.html` ainda está na tela, o relógio dos 140ms
  // já correu lá · recomeçar aqui apagaria a marca e desenharia fundo vazio no
  // lugar dela. Era um quadro preto no meio do carregamento, medido num hard
  // reload. O `App` só remove aquele bloco depois deste render.
  const [visible, setVisible] = useState(() => Boolean(document.getElementById('boot')));
  // **O fio espera a marca.** Ele é CSS puro e pinta no mesmo quadro; a marca é
  // um arquivo e chega por requisição própria. Enquanto a ordem era essa, o
  // boot tinha ~100ms de um traço verde de 96px sozinho no preto · medido em
  // frames, em 05/08/2026. Um risco flutuando não lê como marca nem como
  // carregamento, lê como defeito de render.
  const [wordmarkReady, setWordmarkReady] = useState(false);

  useEffect(() => {
    if (visible) return;
    const timer = setTimeout(() => setVisible(true), APPEAR_AFTER_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) {
    // Fundo da marca, sem elemento nenhum · é o que evita o pisca de 30ms.
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background"
    >
      <Wordmark size="entry" className="animate-fade-in" onReady={() => setWordmarkReady(true)} />
      {/* Pulso lento no fio da marca. `motion-reduce` desliga · quem pediu
          menos movimento no sistema não deve ver nada se mexendo.

          A altura fica reservada desde o começo (`h-px` mais o `gap` do pai já
          existem): o que espera é a tinta, não o espaço · senão consertar a
          ordem custaria um salto de layout, que é pior que o problema. */}
      <span
        aria-hidden
        className={cn(
          'h-px w-24 bg-gradient-to-r from-transparent via-primary to-transparent transition-opacity',
          wordmarkReady ? 'animate-pulse opacity-100 motion-reduce:animate-none' : 'opacity-0',
        )}
      />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  );
}
