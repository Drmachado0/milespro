/**
 * ConsentBanner — LGPD Art. 8 §4 granular-consent banner (COMPL-03 / D-16).
 *
 * Mounts globally in App.tsx; renders only when an authenticated user is
 * missing a current-version consent row in user_consents. Four separate
 * checkboxes — terms + privacy required; analytics + marketing optional and
 * default OFF (no pre-checked dark pattern, per LGPD Art. 8 §4 anti-pattern
 * guidance from ANPD).
 *
 * Anonymous visitors do NOT see the banner — they have no PII to consent over.
 * The banner appears after login until the user submits.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useConsent, CURRENT_CONSENT_VERSION } from '@/hooks/useConsent';
import { useTelemetry } from '@/hooks/useTelemetry';
import { logger } from '@/lib/logger';

export function ConsentBanner() {
  const { needsConsent, saveConsent, isSaving } = useConsent();
  // Plan 02-06 W2b — wire the W1b useTelemetry.trackConsentGiven helper.
  // (Closes the TODO marker left in src/hooks/useTelemetry.ts and the
  // 02-03-PLAN.md Task 5 deferred-item note.)
  const telemetry = useTelemetry();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  if (!needsConsent) return null;

  const canSubmit = terms && privacy && !isSaving;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const now = new Date().toISOString();
    logger.info('[ConsentBanner] consent submitted', {
      analytics,
      marketing,
    });
    saveConsent({
      terms_accepted_at: terms ? now : null,
      privacy_accepted_at: privacy ? now : null,
      analytics_opted_in: analytics,
      marketing_opted_in: marketing,
    });
    // Fire AFTER saveConsent has been called (saveConsent is a useMutation
    // .mutate() — fire-and-forget — so we don't await it here). When the
    // user opted OUT of analytics, posthog opt_out_capturing has not been
    // flipped yet (ConsentWatcher does that on the next render); track()
    // will fire ONCE before the opt-out, which is the intended behavior
    // (we want to record the "consent_given" event itself).
    telemetry.trackConsentGiven({
      analytics,
      marketing,
      version: CURRENT_CONSENT_VERSION,
    });
    toast.success('Consentimento registrado');
  };

  return (
    <div
      role="dialog"
      aria-labelledby="consent-banner-title"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card shadow-2xl"
    >
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <div>
          <h3
            id="consent-banner-title"
            className="text-base font-semibold text-foreground md:text-lg"
          >
            Antes de continuar, precisamos do seu consentimento
          </h3>
          <p className="mt-1 text-xs text-muted-foreground md:text-sm">
            Para cumprir a LGPD (Lei nº 13.709/2018), pedimos consentimento
            separado para cada finalidade. Você pode revisar suas escolhas a
            qualquer momento em <Link to="/configuracoes" className="underline">Configurações</Link>.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Checkbox
              id="consent-terms"
              checked={terms}
              onCheckedChange={(v) => setTerms(v === true)}
            />
            <Label
              htmlFor="consent-terms"
              className="text-sm leading-snug text-foreground"
            >
              Li e aceito os{' '}
              <Link to="/termos" className="font-medium underline">
                Termos de Uso
              </Link>{' '}
              <span className="text-destructive">*</span>
            </Label>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="consent-privacy"
              checked={privacy}
              onCheckedChange={(v) => setPrivacy(v === true)}
            />
            <Label
              htmlFor="consent-privacy"
              className="text-sm leading-snug text-foreground"
            >
              Li e aceito a{' '}
              <Link to="/privacidade" className="font-medium underline">
                Política de Privacidade
              </Link>{' '}
              <span className="text-destructive">*</span>
            </Label>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="consent-analytics"
              checked={analytics}
              onCheckedChange={(v) => setAnalytics(v === true)}
            />
            <Label
              htmlFor="consent-analytics"
              className="text-sm leading-snug text-muted-foreground"
            >
              (Opcional) Permito uso de analytics agregado e anonimizado para
              melhorar o produto.
            </Label>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="consent-marketing"
              checked={marketing}
              onCheckedChange={(v) => setMarketing(v === true)}
            />
            <Label
              htmlFor="consent-marketing"
              className="text-sm leading-snug text-muted-foreground"
            >
              (Opcional) Quero receber emails ocasionais com novidades, promoções
              e dicas de uso.
            </Label>
          </div>
        </div>

        <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="text-destructive">*</span> Campos obrigatórios para
            usar o serviço.
          </p>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="sm:min-w-[180px]"
          >
            {isSaving ? 'Salvando…' : 'Confirmar e continuar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
