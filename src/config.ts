import type { SlackTarget } from "./types";

export function getSlackTargets(env: Env): Record<string, SlackTarget> {
  try {
    return JSON.parse(env.SLACK_WEBHOOK_URLS);
  } catch {
    throw new Error("SLACK_WEBHOOK_URLS secret is not valid JSON");
  }
}
