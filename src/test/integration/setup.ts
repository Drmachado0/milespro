import { beforeAll, afterAll } from 'vitest';
import { adminClient } from './adminClient';
import { FREE_USER, PRO_USER, VIP_USER, PASSWORD } from './fixtures';

beforeAll(async () => {
  for (const u of [FREE_USER, PRO_USER, VIP_USER]) {
    const { error } = await adminClient.auth.admin.createUser({
      id: u.id,
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (
      error &&
      !String(error.message).match(/already.*registered|already exists/i)
    ) {
      throw new Error(
        `[integration/setup] createUser failed for ${u.email}: ${error.message}`,
      );
    }
  }

  // Seed plans: handle_new_user trigger inserts 'free' default; upsert overrides for pro/vip.
  const { error: subErr } = await adminClient
    .from('user_subscriptions')
    .upsert(
      [
        { user_id: PRO_USER.id, plan: 'pro' as const, is_active: true },
        { user_id: VIP_USER.id, plan: 'vip' as const, is_active: true },
      ] as never,
      { onConflict: 'user_id' },
    );
  if (subErr) {
    throw new Error(
      `[integration/setup] seed user_subscriptions failed: ${subErr.message}`,
    );
  }
}, 60_000);

afterAll(async () => {
  for (const u of [FREE_USER, PRO_USER, VIP_USER]) {
    await adminClient.auth.admin.deleteUser(u.id);
  }
}, 30_000);
