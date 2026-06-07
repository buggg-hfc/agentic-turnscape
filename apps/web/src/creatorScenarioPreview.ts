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

const listSummary = (values: string[]) => values.join("，") || "无";

const resourceSummary = (resources: Record<string, number>) =>
  Object.entries(resources)
    .map(([name, amount]) => `${name} ${amount}`)
    .join("，") || "无";

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

const actionTargetName = (
  draft: ReturnType<typeof buildCreatorScenarioDraft>,
  targetId: string | undefined,
) => {
  if (!targetId) return "未指定";
  return (
    draft.world.characters[targetId]?.name ??
    draft.world.locations[targetId]?.name ??
    targetId
  );
};

export const buildCreatorDraftPreview = (
  input: CreatorScenarioDraftInput,
): CreatorDraftPreview => {
  const draft = buildCreatorScenarioDraft(input);
  const locations = Object.values(draft.world.locations).map(
    (location) =>
      `${location.name}：${location.description}；公开：${listSummary(location.publicInfo)}；隐藏：${listSummary(location.hiddenInfo)}；危险：${location.dangerLevel}`,
  );
  const characters = Object.values(draft.world.characters).map(
    (character) =>
      `${character.name}：${character.role}；公开：${character.publicImage}；目标：${character.shortTermGoal}；秘密：${character.secret}`,
  );
  const factions = Object.values(draft.world.factions).map(
    (faction) =>
      `${faction.name}：${faction.publicGoal}；计划：${faction.currentPlan}；资源：${resourceSummary(faction.resources)}`,
  );
  const clocks = Object.values(draft.world.clocks).map(
    (clock) => `${clock.name} ${clock.progress}/${clock.max}：${clock.consequence}`,
  );
  const quests = Object.values(draft.world.quests).map(
    (quest) =>
      `${quest.name}：${quest.surfaceGoal}；真相：${quest.realBackground}；隐线：${quest.hiddenGoal}；失败：${quest.failureConsequence}；影响：${quest.longTermImpact}`,
  );
  const actions = draft.actions.map(
    (action) =>
      `${action.label}：${action.description}（类型：${actionTypeLabel[action.actionType]}；目标：${actionTargetName(draft, action.targetId)}；风险：${riskLabel[action.riskLevel]}）`,
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
