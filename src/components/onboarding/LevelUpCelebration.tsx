import { memo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { fireConfetti } from '@/lib/confettiLoader';
import { UserLevel } from '@/data/levels';
import { Button } from '@/components/ui/button';

interface LevelUpCelebrationProps {
  newLevel: UserLevel | null;
  onClose: () => void;
}

export const LevelUpCelebration = memo(function LevelUpCelebration({
  newLevel,
  onClose,
}: LevelUpCelebrationProps) {
  const triggerConfetti = useCallback(async () => {
    // Fire confetti from multiple angles using lazy-loaded library
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    const fire = async (particleRatio: number, opts: import('canvas-confetti').Options) => {
      await fireConfetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    };

    // Launch sequence - fire all confetti bursts in parallel
    await Promise.all([
      fire(0.25, {
        spread: 26,
        startVelocity: 55,
        scalar: 0.8,
        colors: ['#FFD700', '#FFA500', '#FF6347'],
      }),
      fire(0.2, {
        spread: 60,
        scalar: 1.2,
        colors: ['#9333EA', '#A855F7', '#C084FC'],
      }),
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
        colors: ['#22C55E', '#4ADE80', '#86EFAC'],
      }),
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
        colors: ['#3B82F6', '#60A5FA', '#93C5FD'],
      }),
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
        colors: ['#F59E0B', '#FBBF24', '#FCD34D'],
      }),
    ]);
  }, []);

  useEffect(() => {
    if (!newLevel) return;
    // Trigger confetti after a short delay for the modal to appear
    const timer = setTimeout(() => {
      triggerConfetti();
    }, 300);

    return () => clearTimeout(timer);
  }, [newLevel, triggerConfetti]);

  if (!newLevel) return null;

  const Icon = newLevel.icon;

  return (
    <AnimatePresence>
      {newLevel && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative bg-card border border-border rounded-2xl p-8 shadow-2xl pointer-events-auto max-w-sm mx-4"
              initial={{ scale: 0.5, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-muted-foreground"
                onClick={onClose}
              >
                <X size={18} />
              </Button>

              {/* Sparkles decoration */}
              <motion.div
                className="absolute -top-3 -left-3"
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-6 h-6 text-warning" />
              </motion.div>
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
              >
                <Sparkles className="w-5 h-5 text-violet-400" />
              </motion.div>

              {/* Content */}
              <div className="text-center space-y-4">
                {/* Level up text */}
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Parabéns!
                  </span>
                </motion.div>

                {/* Level icon with glow */}
                <motion.div
                  className="relative inline-flex"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                >
                  <div
                    className={`p-6 rounded-full bg-gradient-to-br ${newLevel.gradient} shadow-2xl`}
                  >
                    <Icon className="w-12 h-12 text-white" />
                  </div>
                  {/* Pulse ring */}
                  <motion.div
                    className={`absolute inset-0 rounded-full bg-gradient-to-br ${newLevel.gradient} opacity-30`}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>

                {/* Level info */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-1"
                >
                  <h2 className="text-2xl font-bold">
                    Nível {newLevel.level}
                  </h2>
                  <p className={`text-xl font-semibold bg-gradient-to-r ${newLevel.gradient} bg-clip-text text-transparent`}>
                    {newLevel.name}
                  </p>
                </motion.div>

                {/* Description */}
                <motion.p
                  className="text-sm text-muted-foreground"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Você alcançou {newLevel.minPoints} pontos!
                </motion.p>

                {/* Continue button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    onClick={onClose}
                    className={`bg-gradient-to-r ${newLevel.gradient} hover:opacity-90 text-white border-0`}
                  >
                    Continuar
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
