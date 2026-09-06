import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

/**
 * O fecho das telas de venda · **o passo concreto, depois do argumento.**
 *
 * Ele nasceu na landing em 10/08/2026 (uma página longa fecha com CTA, e ele
 * não repete o rótulo do topo · ver `docs/design.md`) e virou componente em
 * 03/09/2026, quando a lista pública de campeonatos passou a fechar com o
 * mesmo bloco · até ali ela terminava no último card, sem nada pra apertar.
 *
 * **É o único `cta` sólido de cada tela que o usa**, e isso é regra: na
 * landing o sólido do hero é o mesmo passo de funil em outra profundidade; na
 * lista pública o header carrega só contornados.
 */
export function TournamentClosing() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-border/60 bg-card/30">
      <div className="container py-12 text-center sm:py-16">
        <h2 className="mx-auto max-w-2xl font-display text-2xl uppercase leading-tight text-foreground sm:text-3xl">
          {t('landing.closingTitle')}
        </h2>
        <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
          {t('landing.closingBody')}
        </p>
        <Button asChild variant="cta" className="mt-6">
          <Link to="/login?criar=1">{t('common.createAccount')}</Link>
        </Button>
      </div>
    </section>
  );
}
