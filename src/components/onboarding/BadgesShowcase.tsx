import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { useBadges } from '@/hooks/useBadges';
import { BadgeIcon } from './BadgeIcon';
import { BadgeDetailModal } from './BadgeDetailModal';
import { UserLevelBadge } from './UserLevelBadge';
import { Badge } from '@/data/badges';
import { ONBOARDING_STEPS } from '@/data/onboardingSteps';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export const BadgesShowcase = memo(function BadgesShowcase() {
  const { onboardingBadges, milestoneBadges, unlockedBadgeIds, totalPoints } = useBadges();
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [showMilestones, setShowMilestones] = useState(false);
  const navigate = useNavigate();

  const totalBadges = onboardingBadges.length + milestoneBadges.length;
  const unlockedMilestonesCount = milestoneBadges.filter(b => unlockedBadgeIds.includes(b.id)).length;

  // Handle badge click - navigate for onboarding badges with stepId, show modal for others
  const handleBadgeClick = (badge: Badge) => {
    if (badge.condition.type === 'onboarding_step' && badge.condition.stepId) {
      const step = ONBOARDING_STEPS.find(s => s.id === badge.condition.stepId);
      if (step) {
        navigate(step.path);
        return;
      }
    }
    setSelectedBadge(badge);
  };

  return (
    <>
      <div className="space-y-3">
        {/* User Level Badge */}
        <UserLevelBadge points={totalPoints} />

        {/* Onboarding Badges Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Conquistas do Onboarding
            </span>
            <motion.div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              key={totalPoints}
            >
              <Trophy size={12} className="text-primary" />
              <span className="text-xs font-semibold text-primary">
                {totalPoints} pts
              </span>
            </motion.div>
          </div>

          {/* Onboarding Badges grid */}
          <div className="flex flex-wrap gap-2">
            {onboardingBadges.map((badge, index) => {
              const isUnlocked = unlockedBadgeIds.includes(badge.id);
              
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <BadgeIcon
                    badge={badge}
                    isUnlocked={isUnlocked}
                    size="sm"
                    onClick={() => handleBadgeClick(badge)}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Milestone Badges Section - Collapsible */}
        <Collapsible open={showMilestones} onOpenChange={setShowMilestones}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between text-xs text-muted-foreground hover:text-foreground h-8"
            >
              <span className="flex items-center gap-2">
                <span className="uppercase tracking-wide">Conquistas de Uso</span>
                <span className="text-primary font-medium">
                  {unlockedMilestonesCount}/{milestoneBadges.length}
                </span>
              </span>
              {showMilestones ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.div 
              className="flex flex-wrap gap-2 pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {milestoneBadges.map((badge, index) => {
                const isUnlocked = unlockedBadgeIds.includes(badge.id);
                
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                  >
                  <BadgeIcon
                    badge={badge}
                    isUnlocked={isUnlocked}
                    size="sm"
                    onClick={() => handleBadgeClick(badge)}
                  />
                  </motion.div>
                );
              })}
            </motion.div>
          </CollapsibleContent>
        </Collapsible>

        {/* Progress text */}
        <p className="text-xs text-muted-foreground text-center">
          {unlockedBadgeIds.length} de {totalBadges} conquistas desbloqueadas
        </p>
      </div>

      {/* Badge detail modal */}
      <BadgeDetailModal
        badge={selectedBadge}
        isUnlocked={selectedBadge ? unlockedBadgeIds.includes(selectedBadge.id) : false}
        isOpen={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />
    </>
  );
});
