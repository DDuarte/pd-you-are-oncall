export interface SlackTarget {
  webhookUrl: string;
  channel?: string;
}

export interface CurrentOnCall {
  scheduleName: string;
  userId: string;
  userName: string;
  start: string;
  end: string | null;
}

export interface StoredOnCall {
  userId: string;
  userName: string;
  start: string;
  end: string | null;
}
