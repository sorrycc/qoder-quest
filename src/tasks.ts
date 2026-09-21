import fs from 'node:fs';
import path from 'node:path';
import type { Feature, QuestConfig, TaskDef } from './types.ts';

export const TASKS_DIR = path.resolve(import.meta.dirname, '../tasks');
export const CONFIG_FILE = path.resolve(import.meta.dirname, '../quest.config.json');

export type Features = Record<Feature, boolean>;

/** Read on every request, like the tasks: the settings page writes it, and editing it by hand works too. */
export function loadConfig(file = CONFIG_FILE): QuestConfig {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    // No file, or one caught mid-edit: everything optional stays off.
    return {};
  }
}

export function saveConfig(config: QuestConfig, file = CONFIG_FILE): void {
  fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
}

/** QUEST_VIDEO=on|off pins the switch whatever the file or the settings page say. */
export function videoPinned(): boolean | undefined {
  const env = process.env.QUEST_VIDEO;
  return env ? env === 'on' : undefined;
}

export function loadFeatures(file = CONFIG_FILE): Features {
  return { video: videoPinned() ?? loadConfig(file).video === true };
}

/** Every level on disk, exactly as written. */
export function loadAllTasks(dir = TASKS_DIR): TaskDef[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'task.json')))
    .map((e) => {
      const read = (file: string) => JSON.parse(fs.readFileSync(path.join(dir, e.name, file), 'utf8'));
      // Hundreds of ideas would bury the level itself, so they get a file of their own.
      const ideas = fs.existsSync(path.join(dir, e.name, 'ideas.json')) ? { ideas: read('ideas.json') } : {};
      return { ...read('task.json'), ...ideas, id: e.name } as TaskDef;
    })
    .sort((a, b) => a.order - b.order);
}

export const isEnabled = (task: TaskDef, levels: QuestConfig['levels'] = {}) => levels[task.id] ?? !task.archived;

/** The levels on the map: switched on, and with fallbacks applied for whatever feature is off. */
export function loadTasks(dir = TASKS_DIR, features = loadFeatures(), levels = loadConfig().levels): TaskDef[] {
  return loadAllTasks(dir)
    .filter((task) => isEnabled(task, levels))
    .flatMap(({ requires, fallback, archived: _archived, ...task }) => {
      if ((requires ?? []).every((f) => features[f])) return [task];
      return fallback ? [{ ...task, ...fallback }] : [];
    });
}
