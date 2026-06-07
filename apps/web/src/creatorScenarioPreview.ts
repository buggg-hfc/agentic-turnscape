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

export const buildCreatorDraftPreview = (
  input: CreatorScenarioDraftInput,
): CreatorDraftPreview => {
  const draft = buildCreatorScenarioDraft(input);
  const locations = namedValues(draft.world.locations);
  const characters = namedValues(draft.world.characters);
  const factions = namedValues(draft.world.factions);
  const clocks = namedValues(draft.world.clocks);
  const actions = draft.actions.map((action) => action.label);
  const endings = draft.endings.map((ending) => ending.title);

  return {
    title: draft.title,
    scenarioId: draft.id,
    summary: [
      `${draft.days.length} 天`,
      `${draft.scenes.length} 场景`,
      `${locations.length} 地点`,
      `${characters.length} NPC`,
      `${factions.length} 阵营`,
      `${actions.length} 行动`,
      `${endings.length} 结局`,
    ].join(" / "),
    sections: [
      { title: "地点", count: locations.length, items: locations },
      { title: "NPC", count: characters.length, items: characters },
      { title: "阵营", count: factions.length, items: factions },
      { title: "危机钟", count: clocks.length, items: clocks },
      { title: "行动", count: actions.length, items: actions },
      { title: "结局", count: endings.length, items: endings },
    ],
  };
};
