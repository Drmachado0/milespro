import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflight, createCorsResponse, createCorsErrorResponse } from '../_shared/cors.ts';
import { timingSafeEq } from '../_shared/timingSafeEq.ts';

interface ClubSubscription {
  id: string;
  user_id: string;
  holder_id: string | null;
  program: string;
  subscription_name: string | null;
  points_per_month: number;
  monthly_fee: number;
  annual_price: number | null;
  annual_installment_price: number | null;
  modality: string;
  initial_bonus: number;
  initial_bonus_applied: boolean;
  initial_bonus_applied_at: string | null;
  billing_day: number | null;
  active: boolean;
  bonus_type: string;
  bonus_value: number;
  bonus_frequency: string;
  start_date: string | null;
  last_points_generated_at: string | null;
  last_bonus_generated_at: string | null;
  total_points_generated: number;
  total_bonuses_received: number;
  total_amount_paid: number;
}

// Get monthly equivalent cost based on modality
function getMonthlyEquivalentCost(sub: ClubSubscription): number {
  if (sub.modality === 'annual_upfront' && sub.annual_price) {
    return sub.annual_price / 12;
  } else if (sub.modality === 'annual_installments' && sub.annual_installment_price) {
    return sub.annual_installment_price; // installment value IS the monthly cost
  }
  return sub.monthly_fee || 0;
}

// Dedicated cron token (rotate independently of SUPABASE_SERVICE_ROLE_KEY).
// Set as a Lovable Cloud secret; pg_cron schedules invoke this fn with the
// header `x-cron-secret: <CRON_SECRET>`. The legacy branch that accepted the
// service-role key as an `Authorization: Bearer ...` header was removed — it
// was a confused-deputy vector (any leak of the service role would let an
// attacker forge cron triggers) and used a non-constant-time string compare.
const CRON_SECRET = Deno.env.get('CRON_SECRET');

function verifyCronAuth(req: Request): boolean {
  if (!CRON_SECRET) return false;
  const cronSecret = req.headers.get('x-cron-secret');
  if (!cronSecret) return false;
  return timingSafeEq(cronSecret, CRON_SECRET);
}

export async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  try {
    // Verify cron job authentication
    if (!verifyCronAuth(req)) {
      console.log('Unauthorized cron job trigger attempt');
      return createCorsErrorResponse('Unauthorized', req, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    console.log(`Processing club subscriptions for day ${currentDay}`);

    // Get all active subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from('club_subscriptions')
      .select('*')
      .eq('active', true);

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${subscriptions?.length || 0} active subscriptions`);

    const results = {
      pointsGenerated: 0,
      bonusesGenerated: 0,
      initialBonusesApplied: 0,
      operationsCreated: 0,
      errors: [] as string[],
    };

    for (const sub of (subscriptions as ClubSubscription[]) || []) {
      try {
        const billingDay = sub.billing_day || 1;
        const monthlyEquivalentCost = getMonthlyEquivalentCost(sub);
        
        // Check if today is billing day
        if (currentDay !== billingDay) {
          continue;
        }

        // Check if points were already generated this month
        const lastGenerated = sub.last_points_generated_at 
          ? new Date(sub.last_points_generated_at) 
          : null;
        
        const alreadyGeneratedThisMonth = lastGenerated && 
          lastGenerated.getMonth() === currentMonth && 
          lastGenerated.getFullYear() === currentYear;

        if (alreadyGeneratedThisMonth) {
          console.log(`Subscription ${sub.id} already processed this month`);
          continue;
        }

        // Generate monthly points
        const pointsToGenerate = sub.points_per_month || 0;
        let initialBonusApplied = 0;
        
        // Apply initial bonus only once (on first activation)
        if (!sub.initial_bonus_applied && (sub.initial_bonus || 0) > 0) {
          initialBonusApplied = sub.initial_bonus;
          
          // Create initial bonus operation
          const { error: initialBonusError } = await supabase
            .from('operations')
            .insert({
              user_id: sub.user_id,
              holder_id: sub.holder_id,
              program: sub.program,
              type: 'entrada_manual',
              quantity: initialBonusApplied,
              total_cost: 0,
              cost_per_thousand: 0,
              date: today.toISOString().split('T')[0],
              status: 'confirmado',
              notes: `Bônus inicial (1º mês): ${sub.subscription_name || sub.program}`,
              bonus: initialBonusApplied,
              holder_name: null,
            });

          if (initialBonusError) {
            console.error(`Error creating initial bonus for ${sub.id}:`, initialBonusError);
            results.errors.push(`Initial bonus error for ${sub.id}: ${initialBonusError.message}`);
          } else {
            results.initialBonusesApplied += initialBonusApplied;
            results.operationsCreated++;
            console.log(`Applied initial bonus of ${initialBonusApplied} points for ${sub.id}`);
          }
        }
        
        if (pointsToGenerate > 0) {
          // Create operation entry for monthly points
          const { error: opError } = await supabase
            .from('operations')
            .insert({
              user_id: sub.user_id,
              holder_id: sub.holder_id,
              program: sub.program,
              type: 'entrada_manual',
              quantity: pointsToGenerate,
              total_cost: monthlyEquivalentCost,
              cost_per_thousand: pointsToGenerate > 0 ? (monthlyEquivalentCost / pointsToGenerate) * 1000 : 0,
              date: today.toISOString().split('T')[0],
              status: 'confirmado',
              notes: `Pontos mensais: ${sub.subscription_name || sub.program}`,
              holder_name: null,
            });

          if (opError) {
            console.error(`Error creating operation for ${sub.id}:`, opError);
            results.errors.push(`Operation error for ${sub.id}: ${opError.message}`);
          } else {
            results.pointsGenerated += pointsToGenerate;
            results.operationsCreated++;
          }
        }

        // Check for recurring bonus eligibility (legacy bonus system)
        let recurringBonusPoints = 0;
        const startDate = sub.start_date ? new Date(sub.start_date) : null;
        
        if (startDate && sub.bonus_type !== 'none' && sub.bonus_value > 0) {
          // Check if still in first year
          const oneYearAfterStart = new Date(startDate);
          oneYearAfterStart.setFullYear(oneYearAfterStart.getFullYear() + 1);
          
          if (today <= oneYearAfterStart) {
            // Calculate months since start
            const monthsSinceStart = (currentYear - startDate.getFullYear()) * 12 + 
              (currentMonth - startDate.getMonth());

            // Check bonus frequency
            let shouldApplyBonus = false;
            switch (sub.bonus_frequency) {
              case 'monthly':
                shouldApplyBonus = true;
                break;
              case 'quarterly':
                shouldApplyBonus = monthsSinceStart > 0 && monthsSinceStart % 3 === 0;
                break;
              case 'yearly':
                shouldApplyBonus = monthsSinceStart === 12;
                break;
            }

            // Check if bonus was already applied this period
            const lastBonus = sub.last_bonus_generated_at 
              ? new Date(sub.last_bonus_generated_at) 
              : null;

            if (shouldApplyBonus) {
              let bonusAlreadyApplied = false;
              
              if (lastBonus) {
                switch (sub.bonus_frequency) {
                  case 'monthly':
                    bonusAlreadyApplied = lastBonus.getMonth() === currentMonth && 
                      lastBonus.getFullYear() === currentYear;
                    break;
                  case 'quarterly':
                    const lastBonusQuarter = Math.floor(lastBonus.getMonth() / 3);
                    const currentQuarter = Math.floor(currentMonth / 3);
                    bonusAlreadyApplied = lastBonusQuarter === currentQuarter && 
                      lastBonus.getFullYear() === currentYear;
                    break;
                  case 'yearly':
                    bonusAlreadyApplied = lastBonus.getFullYear() === currentYear;
                    break;
                }
              }

              if (!bonusAlreadyApplied) {
                // Calculate bonus points based on type
                switch (sub.bonus_type) {
                  case 'percentage':
                    recurringBonusPoints = Math.floor((sub.points_per_month || 0) * (sub.bonus_value / 100));
                    break;
                  case 'fixed_value':
                    const costPerThousand = monthlyEquivalentCost / (sub.points_per_month || 1) * 1000;
                    recurringBonusPoints = Math.floor((sub.bonus_value / costPerThousand) * 1000);
                    break;
                  case 'points':
                    recurringBonusPoints = Math.floor(sub.bonus_value);
                    break;
                }

                if (recurringBonusPoints > 0) {
                  // Create bonus operation
                  const { error: bonusOpError } = await supabase
                    .from('operations')
                    .insert({
                      user_id: sub.user_id,
                      holder_id: sub.holder_id,
                      program: sub.program,
                      type: 'entrada_manual',
                      quantity: recurringBonusPoints,
                      total_cost: 0,
                      cost_per_thousand: 0,
                      date: today.toISOString().split('T')[0],
                      status: 'confirmado',
                      notes: `Bônus ${sub.bonus_frequency}: ${sub.subscription_name || sub.program}`,
                      bonus: recurringBonusPoints,
                      holder_name: null,
                    });

                  if (bonusOpError) {
                    console.error(`Error creating bonus operation for ${sub.id}:`, bonusOpError);
                    results.errors.push(`Bonus error for ${sub.id}: ${bonusOpError.message}`);
                  } else {
                    results.bonusesGenerated += recurringBonusPoints;
                    results.operationsCreated++;
                  }
                }
              }
            }
          }
        }

        // Total bonus for this cycle
        const totalBonusThisCycle = initialBonusApplied + recurringBonusPoints;

        // Update subscription tracking
        const updateData: Record<string, unknown> = {
          last_points_generated_at: today.toISOString(),
          total_points_generated: (sub.total_points_generated || 0) + pointsToGenerate + initialBonusApplied,
          total_amount_paid: (sub.total_amount_paid || 0) + monthlyEquivalentCost,
          updated_at: today.toISOString(),
        };

        // Mark initial bonus as applied
        if (initialBonusApplied > 0) {
          updateData.initial_bonus_applied = true;
          updateData.initial_bonus_applied_at = today.toISOString();
        }

        if (recurringBonusPoints > 0) {
          updateData.last_bonus_generated_at = today.toISOString();
          updateData.total_bonuses_received = (sub.total_bonuses_received || 0) + recurringBonusPoints;
        }

        const { error: updateError } = await supabase
          .from('club_subscriptions')
          .update(updateData)
          .eq('id', sub.id);

        if (updateError) {
          console.error(`Error updating subscription ${sub.id}:`, updateError);
          results.errors.push(`Update error for ${sub.id}: ${updateError.message}`);
        }

        // Record history entry for this month
        const monthYear = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
        const totalPointsThisMonth = pointsToGenerate + totalBonusThisCycle;
        const costPerThousand = totalPointsThisMonth > 0 
          ? (monthlyEquivalentCost / totalPointsThisMonth) * 1000 
          : 0;

        const { error: historyError } = await supabase
          .from('subscription_history')
          .upsert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            month_year: monthYear,
            points_generated: pointsToGenerate,
            bonus_generated: totalBonusThisCycle,
            amount_paid: monthlyEquivalentCost,
            cost_per_thousand: costPerThousand,
          }, {
            onConflict: 'subscription_id,month_year',
          });

        if (historyError) {
          console.error(`Error recording history for ${sub.id}:`, historyError);
          results.errors.push(`History error for ${sub.id}: ${historyError.message}`);
        }

        console.log(`Processed subscription ${sub.id}: ${pointsToGenerate} points, ${totalBonusThisCycle} bonus (initial: ${initialBonusApplied}), history recorded`);

      } catch (subError) {
        console.error(`Error processing subscription ${sub.id}:`, subError);
        results.errors.push(`Processing error for ${sub.id}: ${String(subError)}`);
      }
    }

    console.log('Processing complete:', results);

    return createCorsResponse({
      success: true,
      message: 'Club subscriptions processed',
      results,
    }, req);

  } catch (error) {
    console.error('Error processing club subscriptions:', error);
    return createCorsErrorResponse(String(error), req, 500);
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
