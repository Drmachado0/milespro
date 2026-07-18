/**
 * PushPermissionPrompt — contextual push permission pre-prompt (D-T07).
 *
 * Auto-opens when `shouldShowPrompt` from `usePushPermission()` is true (i.e.,
 * user has registered at least one program AND has not seen this prompt before
 * AND native permission state is 'prompt').
 *
 * iOS HIG anti-pattern avoided: never prompts at signup; the trigger condition
 * is value-moment (first balance added). Accept-rate target 65-75% (vs ~50%
 * at-signup — iOS HIG documented win).
 *
 * Once dismissed (either via "Permitir" → native dialog OR "Agora não"),
 * push_pre_prompt_seen_at is set in user_settings and the dialog never
 * re-renders for this user. There is no "Configurações → Re-enable" toggle
 * in v1 (deferred to v2 backlog).
 *
 * Copy is D-T07 verbatim where possible:
 *   "Avisamos quando suas milhas estiverem perto de vencer ou quando aparecer
 *    uma promoção de transferência que combina com seus saldos."
 */

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

import { usePushPermission } from '@/hooks/usePushPermission';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function PushPermissionPrompt() {
  const { shouldShowPrompt, requestPermission, dismissPrePrompt, isRequesting } =
    usePushPermission();
  const [open, setOpen] = useState(false);

  // Open the dialog when the hook signals — once.
  useEffect(() => {
    if (shouldShowPrompt) setOpen(true);
  }, [shouldShowPrompt]);

  const handleAllow = async () => {
    await requestPermission();
    setOpen(false);
  };

  // P1-10 — "Agora não" now uses the soft-dismiss path: marks the pre-prompt
  // latch + emits telemetry, but does NOT invoke the native permission dialog.
  // iOS only gives one shot at the native dialog per install; burning it here
  // would (combined with the latch) lock the user out of push entirely with
  // no UI recovery path in v1.
  const handleDeny = async () => {
    await dismissPrePrompt();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <Bell className="h-5 w-5 text-mp-orange-500" aria-hidden />
            <DialogTitle>Permitir avisos do MilesPro?</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            Avisamos quando suas milhas estiverem perto de vencer ou quando
            aparecer uma promoção de transferência que combina com seus saldos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleDeny}
            disabled={isRequesting}
          >
            Agora não
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleAllow}
            disabled={isRequesting}
          >
            Permitir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
