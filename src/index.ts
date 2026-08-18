import { getSlackTargets } from "./config";
import { fetchCurrentOnCall } from "./pagerduty";
import { notifySlack } from "./slack";
import type { SlackTarget, StoredOnCall } from "./types";

function stateKey(scheduleId: string): string {
  return `oncall:${scheduleId}`;
}

async function checkSchedule(
  env: Env,
  scheduleId: string,
  target: SlackTarget,
): Promise<void> {
  const current = await fetchCurrentOnCall(scheduleId, env.PAGERDUTY_API_KEY);
  if (!current) {
    console.log(`No one is on call for schedule ${scheduleId}`);
    return;
  }

  const storedRaw = await env.ONCALL_STATE.get(stateKey(scheduleId));
  const stored: StoredOnCall | null = storedRaw ? JSON.parse(storedRaw) : null;

  const next: StoredOnCall = {
    userId: current.userId,
    userName: current.userName,
    start: current.start,
    end: current.end,
  };
  await env.ONCALL_STATE.put(stateKey(scheduleId), JSON.stringify(next));

  if (!stored) {
    console.log(`Seeded state for "${current.scheduleName}": ${current.userName} is on call`);
  }

  if (stored?.userId === current.userId) {
    return;
  }

  await notifySlack(target, current);
  console.log(`Notified Slack: ${current.userName} started on-call for "${current.scheduleName}"`);
}

async function checkAllSchedules(env: Env): Promise<void> {
  const targets = getSlackTargets(env);
  const results = await Promise.allSettled(
    Object.entries(targets).map(([scheduleId, target]) =>
      checkSchedule(env, scheduleId, target),
    ),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Failed to check schedule:", result.reason);
    }
  }
}

export default {
  async scheduled(_controller, env): Promise<void> {
    await checkAllSchedules(env);
  },
} satisfies ExportedHandler<Env>;
