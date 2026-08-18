import type { CurrentOnCall, SlackTarget } from "./types";

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return `<!date^${Math.floor(date.getTime() / 1000)}^{date_short_pretty} at {time}|${date.toISOString()}>`;
}

function buildMessage(current: CurrentOnCall, channel: string | undefined): object {
  const endText = formatTime(current.end);

  return {
    ...(channel
      ? { channel: channel.startsWith("#") ? channel : `#${channel}` }
      : {}),
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:pagerduty: *${current.userName}* is now on call for *${current.scheduleName}*`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: endText
              ? `Shift ends ${endText}`
              : "No scheduled end time",
          },
        ],
      },
    ],
  };
}

export async function notifySlack(
  target: SlackTarget,
  current: CurrentOnCall,
): Promise<void> {
  const response = await fetch(target.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildMessage(current, target.channel)),
  });

  if (!response.ok) {
    throw new Error(
      `Slack webhook error for schedule "${current.scheduleName}": ${response.status} ${await response.text()}`,
    );
  }
}
