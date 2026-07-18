import { memo, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, X, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useBadges } from '@/hooks/useBadges';
import { useLevelUpDetection } from '@/hooks/useLevelUpDetection';
import { OnboardingStepItem } from './OnboardingStepItem';
import { BadgesShowcase } from './BadgesShowcase';
import { LevelUpCelebration } from './LevelUpCelebration';
import { preloadConfetti } from '@/lib/confettiLoader';
import { REQUIRED_STEPS } from '@/data/onboardingSteps';

export const OnboardingCard = memo(function OnboardingCard() {
  const {
    steps,
    completedSteps,
    completionPercentage,
    isComplete,
    dismiss,
    skipStep,
    markComplete,
    isLoading,
  } = useOnboarding();

  const { totalPoints } = useBadges();
  const { newlyUnlockedLevel, dismissLevelUp } = useLevelUpDetection({ totalPoints });

  // Preload confetti when close to level up
  useEffect(() => {
    if (completionPercentage >= 80) preloadConfetti();
  }, [completionPercentage]);

  const completedRequiredCount = REQUIRED_STEPS.filter(
    (step) => completedSteps.includes(step.id)
  ).length;

  // Calculate potential earnings once all steps done
  const estimatedEarnings = useMemo(() => {
    if (!isComplete) return null;
    return completedSteps.length * 150; // Rough estimate
  }, [isComplete, completedSteps.length]);

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <AnimatePresence mode="wait">
      {isComplete ? (
        <motion.div
          key="complete"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-success/50 bg-gradient-to-br from-success to-success/50 dark:from-success/30 dark:to-success/30 dark:border-success/50">
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-4 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <PartyPopper className="w-10 h-10 text-success" />
                </motion.div>
                <div>
                  <h3 className="text-lg font-semibold text-success dark:text-success">
                    configuração completa! 🎉
                  </h3>
                  <p className="text-sm text-success/80 dark:text-success/80">
                    Seu MilesPro está pronto. Você está no caminho certo!
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={dismiss} aria-label="Fechar">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          key="progress"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5 overflow-hidden">
            {/* Header */}
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Configure seu MilesPro</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete os passos abaixo para melhor experiência
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={dismiss}
                  className="text-muted-foreground hover:text-foreground -mt-1 -mr-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium text-primary">
                    {completionPercentage}% ({completedRequiredCount}/{REQUIRED_STEPS.length})
                  </span>
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Progress
                    value={completionPercentage}
                    className="h-2"
                  />
                </motion.div>
              </div>

              {/* Badges showcase */}
              <BadgesShowcase />

              {/* Steps list */}
              <motion.div
                className="space-y-2"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.05,
                    },
                  },
                }}
              >
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: { opacity: 1, x: 0 },
                    }}
                  >
                    <OnboardingStepItem
                      step={step}
                      stepNumber={index + 1}
                      isCompleted={completedSteps.includes(step.id)}
                      onSkip={() => skipStep(step.id)}
                      onMarkComplete={() => markComplete(step.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Level Up Celebration Modal */}
    <LevelUpCelebration 
      newLevel={newlyUnlockedLevel} 
      onClose={dismissLevelUp} 
    />
  </>
  );
});
