import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TourStep } from '@/data/tourSteps';

interface TourModalProps {
  isOpen: boolean;
  currentStep: TourStep | null;
  currentStepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

export const TourModal = memo(function TourModal({
  isOpen,
  currentStep,
  currentStepIndex,
  totalSteps,
  onNext,
  onPrevious,
  onSkip
}: TourModalProps) {
  if (!isOpen || !currentStep) return null;

  const Icon = currentStep.icon;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        {/* Backdrop with blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onSkip}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Decorative gradient top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />

          {/* Skip button */}
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Pular tour"
          >
            <X size={18} />
          </button>

          {/* Content */}
          <div className="p-6 pt-8">
            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Passo {currentStepIndex + 1} de {totalSteps}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* Icon */}
            <motion.div
              key={currentStep.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="flex justify-center mb-4"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-8 h-8 text-primary" />
                </div>
                {isLastStep && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute -top-1 -right-1"
                  >
                    <Sparkles className="w-5 h-5 text-warning" />
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Title & Description */}
            <motion.div
              key={`text-${currentStep.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-center mb-6"
            >
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {currentStep.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentStep.description}
              </p>
            </motion.div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrevious}
                  className="flex-1"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Anterior
                </Button>
              )}
              
              <Button
                size="sm"
                onClick={onNext}
                className="flex-1"
              >
                {isLastStep ? (
                  <>
                    Concluir
                    <Sparkles size={16} className="ml-1" />
                  </>
                ) : isFirstStep ? (
                  <>
                    Começar Tour
                    <ArrowRight size={16} className="ml-1" />
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight size={16} className="ml-1" />
                  </>
                )}
              </Button>
            </div>

            {/* Skip link */}
            {!isLastStep && (
              <button
                onClick={onSkip}
                className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Pular tour e explorar sozinho
              </button>
            )}
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 pb-4">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <motion.div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStepIndex
                    ? 'w-6 bg-primary'
                    : index < currentStepIndex
                    ? 'w-1.5 bg-primary/50'
                    : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
