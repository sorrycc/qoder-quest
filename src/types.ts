// Shared by the server and the web app.

export type Lang = 'zh' | 'en';
export type L = Record<Lang, string>;

export type Check = { label: L } & (
  | { type: 'fileExists'; glob: string }
  | { type: 'fileContains'; path: string; pattern: string; flags?: string }
  | { type: 'fileNotContains'; path: string; pattern: string; flags?: string }
  | { type: 'command'; cmd: string; args: string[]; timeoutMs?: number }
  /** Matches against qodercli's own record of the conversation, e.g. to see that a slash command really ran. */
  | { type: 'transcriptContains'; pattern: string; flags?: string }
);

export interface Step {
  hint: L;
  /** Suggested prompt. Clicking it types the text into the terminal without sending. */
  prompt?: L;
}

/** Something the booth can switch off in quest.config.json when it is too slow on the day. */
export type Feature = 'video';

export interface TaskDef {
  id: string;
  /** Which part of the map the level sits on. Defaults to main. */
  track?: 'main' | 'hardcore';
  order: number;
  level: 1 | 2 | 3;
  emoji: string;
  minutes: number;
  funny?: boolean;
  /** Sandbox file to show in the preview tab, e.g. index.html. A glob shows its newest match. */
  preview?: string;
  /** Par time for the boss stage, in minutes. */
  parMinutes?: number;
  title: L;
  tagline: L;
  story: L;
  goal: L;
  openingPrompt: L;
  steps: Step[];
  /** All must pass. Tasks without checks are finished by hand. */
  checks?: Check[];
  /** Off the map unless the settings page switches it on. */
  archived?: boolean;
  /** Features the level leans on. */
  requires?: Feature[];
  /** Replaces these fields while a required feature is off. A level without one is hidden instead. */
  fallback?: Partial<Omit<TaskDef, 'id' | 'requires' | 'fallback' | 'archived'>>;
}

/** quest.config.json, written by the settings page. */
export interface QuestConfig {
  video?: boolean;
  /** Per-level override. Without one a level is on unless it is archived. */
  levels?: Record<string, boolean>;
}

/** What the settings page shows and sends back. */
export interface Settings {
  video: boolean;
  /** QUEST_VIDEO is set, so the switch can't be changed from the page. */
  videoPinned: boolean;
  levels: (Pick<TaskDef, 'id' | 'emoji' | 'title' | 'level' | 'track' | 'archived'> & {
    enabled: boolean;
    /** Disappears from the map while video is off. */
    needsVideo: boolean;
  })[];
}

export interface CheckResult {
  label: L;
  ok: boolean;
}

export type ClientMsg =
  | { t: 'input'; d: string }
  | { t: 'resize'; cols: number; rows: number };

export type ServerMsg =
  | { t: 'data'; d: string }
  | { t: 'exit'; code: number }
  /** The opening prompt is sitting in the input box, waiting for the visitor's Enter. */
  | { t: 'prompted' };
