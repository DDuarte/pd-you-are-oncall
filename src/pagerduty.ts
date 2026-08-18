import type { CurrentOnCall } from "./types";

interface PagerDutyOnCallEntry {
  escalation_level: number;
  start: string;
  end: string | null;
  user: {
    id: string;
    summary: string;
  };
  schedule: {
    summary: string;
  } | null;
}

interface PagerDutyOnCallsResponse {
  oncalls: PagerDutyOnCallEntry[];
}

/** Returns whoever is currently the primary (lowest escalation level) on-call for a schedule, or null if nobody is. */
export async function fetchCurrentOnCall(
  scheduleId: string,
  apiKey: string,
): Promise<CurrentOnCall | null> {
  const url = new URL("https://api.pagerduty.com/oncalls");
  url.searchParams.set("schedule_ids[]", scheduleId);
  url.searchParams.set("earliest", "true");

  const response = await fetch(url, {
    headers: {
      Authorization: `Token token=${apiKey}`,
      Accept: "application/vnd.pagerduty+json;version=2",
    },
  });

  if (!response.ok) {
    throw new Error(
      `PagerDuty API error for schedule ${scheduleId}: ${response.status} ${await response.text()}`,
    );
  }

  const data: PagerDutyOnCallsResponse = await response.json();
  if (data.oncalls.length === 0) {
    return null;
  }

  const primary = data.oncalls.reduce((lowest, entry) =>
    entry.escalation_level < lowest.escalation_level ? entry : lowest,
  );

  return {
    scheduleName: primary.schedule?.summary ?? scheduleId,
    userId: primary.user.id,
    userName: primary.user.summary,
    start: primary.start,
    end: primary.end,
  };
}
