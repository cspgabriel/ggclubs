import { POOL_PLATFORMS, crossplayPool, type CrossplayPool, type Platform } from '@ggclubs/schemas';
import { useTranslation } from 'react-i18next';
import { PlatformMark } from '@/components/club/platform-mark';
import { OptionGroup } from '@/components/ui/option-group';
import { POOL_KEY } from '@/lib/clubs';

/**
 * Escolha de plataforma, **agrupada por geração**.
 *
 * São sete plataformas no EA FC 26, e sete cartões numa grade plana viram uma
 * parede. Mas o agrupamento não existe pra caber melhor: ele **ensina a regra
 * do jogo**. No Clubs, PS5, Xbox Series e PC jogam juntos; PS4 e Xbox One
 * jogam juntos; Switch não joga com ninguém. Quem escolhe aqui está decidindo
 * com quem vai poder jogar, e a tela que esconde isso empurra a descoberta
 * pro dia em que o time não encontra partida.
 *
 * Os grupos compartilham o mesmo `name` de rádio de propósito · o navegador
 * cuida da exclusividade entre eles, sem estado extra.
 */
export function PlatformPicker({
  name,
  value,
  onChange,
  allowClear = false,
}: {
  name: string;
  value: Platform | null;
  onChange: (value: Platform | null) => void;
  allowClear?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {crossplayPool.options.map((pool: CrossplayPool) => (
        <div key={pool}>
          <p className="mb-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            {t(POOL_KEY[pool])}
          </p>
          <OptionGroup
            name={name}
            value={value}
            onChange={onChange}
            allowClear={allowClear}
            columns={3}
            options={POOL_PLATFORMS[pool].map((p) => ({
              value: p,
              label: <PlatformMark platform={p} variant="plain" size="md" withLabel />,
            }))}
          />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">{t('club.poolHint')}</p>
    </div>
  );
}
