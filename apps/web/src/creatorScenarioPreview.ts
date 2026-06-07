import {
  buildCreatorScenarioDraft,
  type CreatorScenarioDraftInput,
} from "@agentic-turnscape/shared";

export type CreatorDraftPreviewSection = {
  title: string;
  count: number;
  items: string[];
};

export type CreatorDraftPreview = {
  title: string;
  scenarioId: string;
  summary: string;
  sections: CreatorDraftPreviewSection[];
};

const namedValues = <T extends { name: string }>(values: Record<string, T>) =>
  Object.values(values).map((value) => value.name);

const riskLabel = {
  low: "低",
  medium: "中",
  high: "高",
} as const;

const actionTypeLabel = {
  investigate: "调查",
  negotiate: "谈判",
  fight: "战斗",
  protect: "保护",
  trade: "交易",
  rest: "休整",
  travel: "旅行",
  ignore: "放弃",
  custom: "自定义",
} as const;

export const buildCreatorDraftPreview = (
  input: CreatorScenarioDraftInput,
): CreatorDraftPreview => {
  const draft = buildCreatorScenarioDraft(input);
  const locations = namedValues(draft.world.locations);
  const characters = namedValues(draft.world.characters);
  const factions = namedValues(draft.world.factions);
  const clocks = Object.values(draft.world.clocks).map(
    (clock) => `${clock.name} ${clock.progress}/${clock.max}：${clock.consequence}`,
  );
  const quests = Object.values(draft.world.quests).map(
    (quest) =>
      `${quest.name}：${quest.surfaceGoal}；真相：${quest.realBackground}；隐线：${quest.hiddenGoal}；失败：${quest.failureConsequence}；影响：${quest.longTermImpact}`,
  );
  const actions = draft.actions.map(
    (action) =>
      `${action.label}：${action.description}（类型：${actionTypeLabel[action.actionType]}；风险：${riskLabel[action.riskLevel]}）`,
  );
  const endings = draft.endings.map(
    (ending) => `${ending.title}：${ending.summary}`,
  );

  return {
    title: draft.title,
    scenarioId: draft.id,
    summary: [
      `${draft.days.length} 天`,
      `${draft.scenes.length} 场景`,
      `${locations.length} 地点`,
      `${characters.length} NPC`,
      `${factions.length} 阵营`,
      `${quests.length} 任务`,
      `${actions.length} 行动`,
      `${endings.length} 结局`,
    ].join(" / "),
    sections: [
      { title: "地点", count: locations.length, items: locations },
      { title: "NPC", count: characters.length, items: characters },
      { title: "阵营", count: factions.length, items: factions },
      { title: "危机钟", count: clocks.length, items: clocks },
      { title: "任务", count: quests.length, items: quests },
      { title: "行动", count: actions.length, items: actions },
      { title: "结局", count: endings.length, items: endings },
    ],
  };
};
