import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, Target } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { LevelProgressHeader } from '@/components/achievements/LevelProgressHeader';
import { StatsCards } from '@/components/achievements/StatsCards';
import { AchievementCard } from '@/components/achievements/AchievementCard';
import { BadgeDetailModal } from '@/components/onboarding/BadgeDetailModal';
import { useBadges } from '@/hooks/useBadges';
import { getUserLevel } from '@/data/levels';
import { Badge, BADGES } from '@/data/badges';
import { ONBOARDING_STEPS } from '@/data/onboardingSteps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Conquistas() {
  const {
    onboardingBadges,
    milestoneBadges,
    unlockedBadgeIds,
    totalPoints,
    stats,
  } = useBadges();

  const navigate = useNavigate();
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

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

  // Check if a badge has a shortcut (navigates to another page)
  const hasShortcut = (badge: Badge): boolean => {
    if (badge.condition.type === 'onboarding_step' && badge.condition.stepId) {
      return ONBOARDING_STEPS.some(s => s.id === badge.condition.stepId);
    }
    return false;
  };

  // Calculate progress for milestone badges
  const getMilestoneProgress = (badge: Badge) => {
    if (badge.condition.type !== 'milestone' || !badge.condition.milestone) {
      return undefined;
    }

    const { metric, operationType, threshold } = badge.condition.milestone;
    let current = 0;

    switch (metric) {
      case 'operations_count':
        current = stats.operationsCount;
        break;
      case 'operation_type':
        current = stats.operationsByType[operationType || ''] || 0;
        break;
      case 'programs_with_balance':
        current = stats.programsWithBalance;
        break;
      case 'vip_entries':
        current = stats.vipEntriesCount;
        break;
      case 'total_miles':
        current = stats.totalMilesBalance;
        break;
      case 'savings_total':
        current = stats.savingsTotal;
        break;
      case 'savings_tickets':
        current = stats.savingsByCategory.tickets;
        break;
      case 'savings_hotels':
        current = stats.savingsByCategory.hotels;
        break;
      case 'savings_cars':
        current = stats.savingsByCategory.cars;
        break;
      case 'savings_cruises':
        current = stats.savingsByCategory.cruises;
        break;
      case 'savings_insurances':
        current = stats.savingsByCategory.insurances;
        break;
      case 'savings_attractions':
        current = stats.savingsByCategory.attractions;
        break;
      case 'savings_transfers':
        current = stats.savingsByCategory.transfers;
        break;
      default:
        return undefined;
    }

    return {
      current,
      target: threshold,
    };
  };

  const currentLevel = useMemo(() => getUserLevel(totalPoints), [totalPoints]);

  // Count badges by rarity
  const rarityStats = useMemo(() => {
    const unlockedBadges = BADGES.filter(b => unlockedBadgeIds.includes(b.id));
    return {
      legendary: unlockedBadges.filter(b => b.rarity === 'legendary').length,
      epic: unlockedBadges.filter(b => b.rarity === 'epic').length,
      rare: unlockedBadges.filter(b => b.rarity === 'rare').length,
      common: unlockedBadges.filter(b => b.rarity === 'common').length,
    };
  }, [unlockedBadgeIds]);

  // Sort badges: unlocked first, then by rarity
  const sortBadges = useCallback((badges: Badge[]) => {
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
    return [...badges].sort((a, b) => {
      const aUnlocked = unlockedBadgeIds.includes(a.id);
      const bUnlocked = unlockedBadgeIds.includes(b.id);
      
      if (aUnlocked !== bUnlocked) {
        return aUnlocked ? -1 : 1;
      }
      
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });
  }, [unlockedBadgeIds]);

  const sortedOnboardingBadges = useMemo(() => sortBadges(onboardingBadges), [onboardingBadges, sortBadges]);
  const sortedMilestoneBadges = useMemo(() => sortBadges(milestoneBadges), [milestoneBadges, sortBadges]);

  const onboardingUnlocked = onboardingBadges.filter(b => unlockedBadgeIds.includes(b.id)).length;
  const milestoneUnlocked = milestoneBadges.filter(b => unlockedBadgeIds.includes(b.id)).length;

  return (
    <DashboardLayout title="Conquistas">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          eyebrow="Gamificação"
          icon={<Trophy className="h-5 w-5" />}
          title="Conquistas"
          subtitle="Acompanhe seu progresso e desbloqueie recompensas"
        />

        {/* Level Progress Header */}
        <LevelProgressHeader totalPoints={totalPoints} />

        {/* Stats Cards */}
        <StatsCards
          totalPoints={totalPoints}
          unlockedCount={unlockedBadgeIds.length}
          totalBadges={BADGES.length}
          legendaryCount={rarityStats.legendary}
          epicCount={rarityStats.epic}
          currentLevel={currentLevel}
        />

        {/* Badges Tabs */}
        <Tabs defaultValue="onboarding" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="onboarding" className="gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Onboarding</span>
              <span className="text-xs opacity-70">
                ({onboardingUnlocked}/{onboardingBadges.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="milestones" className="gap-2">
              <Target className="w-4 h-4" />
              <span>Milestones</span>
              <span className="text-xs opacity-70">
                ({milestoneUnlocked}/{milestoneBadges.length})
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="onboarding">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Conquistas de Onboarding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {sortedOnboardingBadges.map((badge, index) => (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <AchievementCard
                          badge={badge}
                          isUnlocked={unlockedBadgeIds.includes(badge.id)}
                          hasShortcut={hasShortcut(badge)}
                          onClick={() => handleBadgeClick(badge)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="milestones">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5 text-primary" />
                  Conquistas de Uso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {sortedMilestoneBadges.map((badge, index) => (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <AchievementCard
                          badge={badge}
                          isUnlocked={unlockedBadgeIds.includes(badge.id)}
                          progress={getMilestoneProgress(badge)}
                          onClick={() => setSelectedBadge(badge)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Badge Detail Modal */}
        <BadgeDetailModal
          badge={selectedBadge}
          isUnlocked={selectedBadge ? unlockedBadgeIds.includes(selectedBadge.id) : false}
          isOpen={selectedBadge !== null}
          onClose={() => setSelectedBadge(null)}
        />
      </div>
    </DashboardLayout>
  );
}
