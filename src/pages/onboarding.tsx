import { zodResolver } from '@hookform/resolvers/zod';
import {
  createMyAccountInput,
  DISPLAY_NAME_MAX,
  HANDLE_MAX,
  type CreateMyAccountInput,
} from '@ggclubs/schemas';
import { Check, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Button } from '@/components/ui/button';
import { CharCount } from '@/components/ui/char-count';
import { PhoneFormField } from '@/components/phone-field';
import { phoneIsValid } from '@/lib/phone-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { useAuth } from '@/lib/use-auth';
import { Trans, useTranslation } from 'react-i18next';
import { PlatformPicker } from '@/components/club/platform-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { PositionChips } from '@/components/club/position-picker';

type HandleState = 'idle' | 'checking' | 'free' | 'taken';

export function OnboardingPage() {
  const { t } = useTranslation();
  const { refreshAccount, signOut, user } = useAuth();
  const navigate = useNavigate();

  async function onSignOut() {
    await signOut();
    void navigate('/login', { replace: true });
  }

  const [handleState, setHandleState] = useState<HandleState>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CreateMyAccountInput>({
    resolver: zodResolver(createMyAccountInput),
    // `position` nasce **ausente**, não nula · null aqui é a escolha "sem
    // posição", e o chip da grade se pinta a partir dela. A plataforma segue
    // com null porque o seletor dela não tem chip de "nenhuma".
    defaultValues: {
      handle: '',
      displayName: '',
      platform: null,
      position: undefined,
      lookingForClub: false,
    },
  });
  // Mesmo freio de `/app/conta` · o campo diz o porquê em vermelho.
  const typedPhone = form.watch('phone') ?? null;
  const phoneBlocked = typedPhone !== null && !phoneIsValid(typedPhone);

  const handle = form.watch('handle');
  const platform = form.watch('platform');
  const position = form.watch('position');
  const lookingForClub = form.watch('lookingForClub') ?? false;

  useEffect(() => {
    if (!createMyAccountInput.shape.handle.safeParse(handle).success) {
      setHandleState('idle');
      return;
    }
    setHandleState('checking');
    // Espera a digitação parar · sem isso é uma chamada por tecla.
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const { available } = await api.handleAvailable(handle);
          setHandleState(available ? 'free' : 'taken');
        } catch {
          setHandleState('idle');
        }
      })();
    }, 400);
    return () => clearTimeout(timer);
  }, [handle]);

  async function onSubmit(input: CreateMyAccountInput) {
    setSubmitError(null);
    try {
      await api.createMyAccount(input);
      await refreshAccount();
      void navigate('/app', { replace: true });
    } catch (err) {
      // A API manda código, não frase · o texto sai do catálogo do idioma ativo.
      setSubmitError(apiErrorMessage(err, t));
    }
  }

  return (
    <AuthLayout title={t('onboarding.title')} subtitle={t('onboarding.subtitle')}>
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="handle">{t('onboarding.handleLabel')}</Label>
          <div className="relative">
            {/* `inset-y-0 flex items-center` centraliza pela altura real do
                campo · translate **de centralização** (`-50%`) deixava o @ meio
                pixel torto, porque gera posição fracionária.

                O `-translate-y-px` é outra coisa e não tem esse problema: é
                deslocamento de **1 pixel inteiro**, e ele existe por medição.
                O @ está na linha de base do texto (conferido: desvio 0,00px em
                escala 1, 1.25, 1.5, 1.75 e 2), mas **o glifo desce 3px abaixo
                dela** enquanto as minúsculas sentam nela · o centro de tinta do
                @ fica a 3px da base e o da faixa de x a 4px. Alinhado pela base
                ele lê como pesando pra baixo. Aqui a escolha é **centro
                óptico**, que é o que se espera de um afixo de campo. */}
            <span className="pointer-events-none absolute inset-y-0 left-3 flex -translate-y-px items-center text-sm leading-none text-muted-foreground">
              @
            </span>
            <Input
              id="handle"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              // O teto do schema no campo · sem ele o excesso só aparece no envio.
              maxLength={HANDLE_MAX}
              // `lowercase` é display, e o `setValueAs` abaixo é o valor · os
              // dois juntos fazem o campo mostrar exatamente o que vai ser
              // gravado. Sem ele, quem digita `Bruno` vê `Bruno` e salva
              // `bruno`, e a diferença só aparece no perfil depois.
              className="h-11 pl-7 lowercase"
              {...form.register('handle', {
                setValueAs: (v: string) => v.trim().toLowerCase(),
              })}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t('onboarding.handleHint')}</p>
          {/* Leitor de tela precisa saber que o @handle foi recusado ·
                  sem aria-live a informação só existe pra quem enxerga. */}
          <div aria-live="polite">
            {handleState === 'checking' && (
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('onboarding.handleChecking')}
              </p>
            )}
            {handleState === 'free' && (
              <p className="inline-flex items-center gap-1.5 text-xs text-primary">
                <Check className="h-3 w-3" />
                {t('onboarding.handleFree')}
              </p>
            )}
            {handleState === 'taken' && (
              <p className="inline-flex items-center gap-1.5 text-xs text-destructive">
                <X className="h-3 w-3" />
                {t('onboarding.handleTaken')}
              </p>
            )}
          </div>
          {form.formState.errors.handle && (
            <p className="text-xs text-destructive">{form.formState.errors.handle.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">{t('onboarding.nameLabel')}</Label>
          <Input
            id="displayName"
            autoComplete="nickname"
            maxLength={DISPLAY_NAME_MAX}
            className="h-11"
            {...form.register('displayName')}
          />
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-muted-foreground">{t('onboarding.nameHint')}</p>
            <CharCount value={form.watch('displayName')} max={DISPLAY_NAME_MAX} />
          </div>
          {form.formState.errors.displayName && (
            <p className="text-xs text-destructive">{form.formState.errors.displayName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t('onboarding.platformOptional')}</Label>
          <PlatformPicker
            name="platform"
            value={platform ?? null}
            onChange={(v) => form.setValue('platform', v)}
            allowClear
          />
        </div>

        {/* Opcional, como a plataforma · quem chega quer entrar, e campo
            obrigatório a mais no cadastro é gente desistindo antes de ter conta.
            Esta é a **posição do perfil**, a identidade ("sou zagueiro") · a de
            cada club começa nela e é trocável lá dentro.

            **Voltar ao vazio é um chip, e não um clique repetido.** Até
            07/08/2026 daqui se limpava clicando de novo na escolhida · um toggle
            que funcionava e que **ninguém descobre**, e que era o segundo
            mecanismo pra mesma coisa depois que o diálogo do club ganhou o chip.
            Mesma grade, mesmo componente, dois jeitos. */}
        <div className="space-y-2">
          <Label>{t('onboarding.positionOptional')}</Label>
          {/* Sem `?? null` · aqui `undefined` é quem ainda não respondeu e
              `null` é a escolha de não ter posição. Colapsar os dois fazia o
              chip de sem posição nascer verde num formulário em branco. */}
          <PositionChips
            value={position}
            onPick={(next) => form.setValue('position', next)}
            noneLabel={t('club.positionClear')}
          />
        </div>

        {/* **Opcional aqui, e cobrado na inscrição** · decisão do Eduardo em
            01/09/2026, entre exigir na porta de entrada e exigir onde o número
            vale dinheiro. O schema do cadastro carrega o porquê: campo
            obrigatório a mais no onboarding é gente desistindo antes de ter
            conta, e quem só está olhando não precisa de telefone.

            **A dica diz pra que serve e que é privado** · pedir telefone sem
            explicar é o campo que a pessoa pula ou preenche errado. */}
        <PhoneFormField
          id="phone"
          value={form.watch('phone') ?? null}
          onChange={(v) => {
            form.setValue('phone', v);
          }}
        />

        {/* **A chave nasce desligada e o único lugar de ligá-la era `/app/conta`**
            · que é exatamente a tela que quem acabou de criar conta não conhece.
            Quem chega sem club é quem procura um, e este é o único momento em
            que dá pra perguntar isso sem parecer intromissão. Pedido pelo
            Eduardo em 08/08/2026.

            **Opcional, como a plataforma e a posição** · marcar é uma
            declaração, e declaração não se faz por omissão. */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
          <Checkbox
            checked={lookingForClub}
            onCheckedChange={(v) => form.setValue('lookingForClub', v === true)}
            className="mt-0.5"
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium">{t('account.lookingForClubLabel')}</span>
            <span className="block text-xs text-muted-foreground">
              {t('onboarding.lookingForClubHint')}
            </span>
          </span>
        </label>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <Button
          type="submit"
          variant="cta"
          className="h-11 w-full text-base"
          // Ver o mesmo freio em `/app/conta` · vazio passa, errado não.
          disabled={form.formState.isSubmitting || handleState === 'taken' || phoneBlocked}
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('onboarding.loading')}
            </>
          ) : (
            t('onboarding.cta')
          )}
        </Button>
      </form>

      {/* Saída da tela. Sem isso quem entra com a conta Google errada fica
              preso aqui · e mostrar o e-mail responde a pergunta que a pessoa
              realmente tem, que é em qual conta ela está. */}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Trans
          i18nKey="onboarding.signedInAs"
          values={{ email: user?.email ?? '' }}
          components={[<span key="0" className="text-primary" />]}
        />
        {' · '}
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {t('onboarding.notYou')}
        </button>
      </p>
    </AuthLayout>
  );
}
