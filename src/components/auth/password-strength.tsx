import { useTranslation } from 'react-i18next';
import { passwordStrength, type PasswordStrength } from '@/lib/password-strength';
import { cn } from '@/lib/utils';

/**
 * Três traços e uma palavra. Nada mais.
 *
 * A tela de entrar não comporta mais um bloco: o medidor entra **no lugar** da
 * dica de comprimento, que só faz sentido enquanto o campo está vazio. Um
 * substitui o outro, a altura não muda e nada empurra o botão pra baixo.
 *
 * Cor pelos tokens que já existem, na regra do `design.md`: vermelho quando está
 * ruim, **branco sustentando** a faixa do meio e verde só quando está bom.
 * Inventar um âmbar aqui seria somar cor ao sistema pra dizer o que a palavra
 * já diz.
 */
// `as const` preserva o literal da chave, que é o que o `t()` tipado exige ·
// `satisfies` mantém a exaustividade: nível novo sem estilo não compila.
const STYLE = {
  weak: { fill: 'bg-destructive', text: 'text-destructive', bars: 1, label: 'auth.passwordWeak' },
  medium: { fill: 'bg-foreground', text: 'text-foreground', bars: 2, label: 'auth.passwordMedium' },
  strong: { fill: 'bg-primary', text: 'text-primary', bars: 3, label: 'auth.passwordStrong' },
} as const satisfies Record<PasswordStrength, unknown>;

export function PasswordStrengthMeter({ password, email }: { password: string; email?: string }) {
  const { t } = useTranslation();
  const strength = passwordStrength(password, email);

  if (!strength) return null;
  const { fill, text, bars, label } = STYLE[strength];

  return (
    <div className="flex items-center gap-2">
      <span className="flex flex-1 gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn('h-1 flex-1 rounded-full transition-colors', i < bars ? fill : 'bg-muted')}
          />
        ))}
      </span>
      {/* `polite` e não `assertive`: a pessoa está digitando, e interromper o
          leitor de tela a cada tecla seria pior que não anunciar. */}
      <span aria-live="polite" className={cn('text-xs font-medium', text)}>
        <span className="sr-only">{t('auth.passwordStrengthLabel')} </span>
        {t(label)}
      </span>
    </div>
  );
}
