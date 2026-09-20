import { createContext, useContext } from 'react';
import type { L, Lang } from '../../src/types.ts';

const DICT = {
  brand: { zh: 'Qoder CLI 闯关', en: 'Qoder CLI Quest' },
  slogan: { zh: '每个难度挑一关，提示词已经备好，回车由你来按', en: 'Pick one level per tier. The prompt is ready, the Enter key is yours' },
  cleared: { zh: '难度已通关', en: 'tiers cleared' },
  pickOne: { zh: '任选一关', en: 'pick any one' },
  tierCleared: { zh: '本难度已通关', en: 'tier cleared' },
  newVisitor: { zh: '换人了，清空进度', en: 'New visitor, reset progress' },
  confirmReset: { zh: '清空本机的通关记录？', en: 'Clear the progress saved on this machine?' },
  level1: { zh: '新手村', en: 'Warm-up' },
  level2: { zh: '进阶', en: 'Getting serious' },
  level3: { zh: '高手区', en: 'Expert' },
  hardcore: { zh: '硬核支线', en: 'Hardcore side track' },
  hardcoreHint: { zh: '给写代码的人：修 bug、造命令、抢上线。同样计入难度通关', en: 'For people who code: fix bugs, forge commands, ship under pressure. Counts towards the tiers too' },
  settings: { zh: '展台设置', en: 'Booth settings' },
  mainTrack: { zh: '主线', en: 'Main track' },
  archivedLevels: { zh: '归档关卡（默认关）', en: 'Archived levels (off by default)' },
  videoSwitch: { zh: '生视频（VideoGen）', en: 'Video generation (VideoGen)' },
  videoSwitchHint: { zh: '一段 5 秒视频要生成 4 到 5 分钟。关掉后 Boss「一句话开公司」降级为不带宣传片的版本', en: 'A 5 second clip takes 4 to 5 minutes. When off, the startup boss falls back to a version without the promo' },
  videoPinned: { zh: '被环境变量 QUEST_VIDEO 锁定了，去掉它才能在这里改', en: 'Pinned by the QUEST_VIDEO environment variable. Unset it to change this here' },
  hiddenNoVideo: { zh: '生视频关着，这一关不会出现', en: 'Hidden while video is off' },
  tierEmpty: { zh: '有难度一关都没开。观众只需要通关地图上出现的难度', en: 'Some tier has no level switched on. Visitors only need to clear the tiers that appear on the map' },
  minutes: { zh: '分钟', en: 'min' },
  funny: { zh: '搞笑', en: 'for laughs' },
  stamp: { zh: '通关', en: 'CLEAR' },
  start: { zh: '开始', en: 'Start' },
  back: { zh: '返回地图', en: 'Back to map' },
  story: { zh: '背景', en: 'Story' },
  goal: { zh: '目标', en: 'Goal' },
  steps: { zh: '步骤', en: 'Steps' },
  typeIt: { zh: '帮我输入', en: 'Type it for me' },
  pressEnter: { zh: '提示词已经输进终端了，想改就改，按回车发送', en: 'The prompt is typed in. Edit it if you like, then press Enter to send' },
  typedHint: { zh: '已经帮你输进终端了，按回车发送', en: 'Typed into the terminal. Press Enter to send' },
  checks: { zh: '通关条件', en: 'To clear this level' },
  checkNow: { zh: '检查', en: 'Check now' },
  checking: { zh: '检查中…', en: 'Checking…' },
  notYet: { zh: '还差一点，继续', en: 'Not there yet, keep going' },
  manualDone: { zh: '我完成了', en: "I'm done" },
  terminal: { zh: '终端', en: 'Terminal' },
  preview: { zh: '预览', en: 'Preview' },
  refresh: { zh: '刷新', en: 'Refresh' },
  previewEmpty: { zh: 'Qoder 还没写出来，稍等', en: "Qoder hasn't written it yet. Hang on" },
  restart: { zh: '重启终端', en: 'Restart terminal' },
  exited: { zh: 'qodercli 退出了。点「重启终端」接着上次的对话继续。', en: 'qodercli exited. Hit Restart terminal to pick the conversation back up.' },
  disconnected: { zh: '连接断开了，可能是闲置太久。返回地图重新开始。', en: 'Disconnected, probably idle for too long. Go back to the map and start again.' },
  starting: { zh: '正在准备沙箱…', en: 'Preparing the sandbox…' },
  startFailed: { zh: '启动失败，服务器在运行吗？', en: 'Failed to start. Is the server running?' },
  overtime: { zh: '超时了，但做完要紧，别停', en: 'Over time, but finishing matters more. Keep going' },
  clearedTitle: { zh: '通关！', en: 'Level cleared!' },
  clearedIn: { zh: '用时', en: 'Time' },
  bossInTime: { zh: '赶在时限内搞定了', en: 'Done before the clock ran out' },
  bossLate: { zh: '晚了点，但搞定了', en: 'A bit late, but done' },
  next: { zh: '去挑下一关', en: 'Pick the next level' },
  keepPlaying: { zh: '再玩一会', en: 'Keep playing' },
  allCleared: { zh: '三个难度全部通关，去找工作人员领奖', en: 'All three tiers cleared. Go claim your prize at the desk' },
} satisfies Record<string, L>;

export type Key = keyof typeof DICT;

export const LangContext = createContext<Lang>('zh');

export function useI18n() {
  const lang = useContext(LangContext);
  return {
    lang,
    t: (key: Key) => DICT[key][lang],
    l: (text: L) => text[lang],
  };
}

const STORAGE_KEY = 'qoder-quest:lang';

export function loadLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // private window
  }
}
