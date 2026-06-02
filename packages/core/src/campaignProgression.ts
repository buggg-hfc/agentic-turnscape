import type { CampaignProgressionState, ChronicleEvent, StatePatch, WorldState } from "@agentic-turnscape/shared";

export type BaseInvestment = {
  facilityId: string;
  supplies?: number;
  money?: number;
};

export type SkillTraining = {
  skill: string;
  experience: number;
};

export type FactionFrontDelta = {
  factionId: string;
  influenceDelta?: number;
  pressureDelta?: number;
};

export type LongCampaignStepInput = {
  state: WorldState;
  turnId: string;
  completedQuestIds?: string[];
  baseInvestments?: BaseInvestment[];
  training?: SkillTraining;
  factionFronts?: FactionFrontDelta[];
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(value, max));

const event = (state: WorldState, turnId: string, title: string, body: string, tags: string[]): ChronicleEvent => ({
  id: `evt_${turnId}_${tags[0] ?? "campaign"}`,
  turnId,
  day: state.time.day,
  phase: state.time.phase,
  title,
  body,
  tags,
  createdAt: new Date().toISOString()
});

const frontStatus = (influence: number, pressure: number): CampaignProgressionState["fronts"][string]["status"] => {
  if (influence <= 0) return "broken";
  if (pressure >= 8) return "dominant";
  if (pressure <= 2) return "contained";
  return "active";
};

const initialFronts = (state: WorldState): CampaignProgressionState["fronts"] =>
  Object.fromEntries(
    Object.values(state.factions).map((faction) => {
      const clockPressure = Math.max(0, ...faction.clockIds.map((clockId) => state.clocks[clockId]?.progress ?? 0));
      const influence = clamp(3 + Object.keys(faction.resources).length, 0, 10);
      const pressure = clamp(clockPressure, 0, 10);
      return [
        faction.id,
        {
          factionId: faction.id,
          influence,
          pressure,
          status: frontStatus(influence, pressure)
        }
      ];
    })
  );

const defaultCampaignProgression = (state: WorldState): CampaignProgressionState => ({
  chapter: 1,
  experience: 0,
  base: {
    name: "Border House",
    level: 0,
    facilities: {
      infirmary: 0,
      workshop: 0,
      archive: 0
    },
    assets: {}
  },
  fronts: initialFronts(state),
  legacyFlags: []
});

const shouldAdvanceChapter = (state: WorldState, completedQuestIds: string[]): boolean =>
  completedQuestIds.length > 0 && state.time.day === 7 && state.time.phase === "night";

export const resolveLongCampaignStep = ({
  state,
  turnId,
  completedQuestIds = [],
  baseInvestments = [],
  training,
  factionFronts = []
}: LongCampaignStepInput): StatePatch => {
  const startingCampaign = state.campaign ?? defaultCampaignProgression(state);
  const changes: StatePatch["changes"] = [];

  if (!state.campaign) {
    changes.push({
      op: "set",
      path: "campaign",
      value: startingCampaign,
      reason: "Initialize long campaign progression state"
    });
  }

  const completedExistingQuests = completedQuestIds.filter((questId) => state.quests[questId]);
  for (const questId of completedExistingQuests) {
    changes.push(
      { op: "set", path: `quests.${questId}.status`, value: "resolved", reason: "Long campaign quest resolution" },
      { op: "tag", path: "campaign.legacyFlags", value: `quest:${questId}:resolved`, reason: "Record campaign legacy flag" }
    );
  }

  if (completedExistingQuests.length > 0) {
    changes.push(
      {
        op: "inc",
        path: "campaign.experience",
        delta: completedExistingQuests.length * 2,
        reason: "Resolved quests add long campaign experience"
      },
      {
        op: "append",
        path: "publicEvents",
        value: event(
          state,
          turnId,
          "Campaign memory updated",
          "Resolved quests become part of the next chapter's playable history.",
          ["campaign", "quest"]
        ),
        reason: "Record long campaign quest resolution"
      }
    );
  }

  if (shouldAdvanceChapter(state, completedExistingQuests)) {
    changes.push(
      { op: "set", path: "campaign.chapter", value: clamp(startingCampaign.chapter + 1, 1, 12), reason: "Advance long campaign chapter" },
      { op: "set", path: "time.day", value: 1, reason: "Start the next campaign chapter" },
      { op: "set", path: "time.phase", value: "morning", reason: "Start the next campaign chapter" },
      {
        op: "append",
        path: "publicEvents",
        value: event(
          state,
          turnId,
          "Next chapter begins",
          "The old crisis becomes history, and the campaign opens a new playable chapter.",
          ["chapter", "campaign"]
        ),
        reason: "Record chapter transition"
      }
    );
  }

  if (baseInvestments.length > 0) {
    let supplies = state.player.resources.supplies ?? 0;
    let money = state.player.resources.money ?? 0;
    const facilities = { ...startingCampaign.base.facilities };

    for (const investment of baseInvestments) {
      const supplyCost = investment.supplies ?? 0;
      const moneyCost = investment.money ?? 0;
      if (supplies < supplyCost || money < moneyCost) continue;
      supplies -= supplyCost;
      money -= moneyCost;
      facilities[investment.facilityId] = clamp((facilities[investment.facilityId] ?? 0) + 1, 0, 5);
      if (supplyCost > 0) {
        changes.push({ op: "inc", path: "player.resources.supplies", delta: -supplyCost, reason: "Spend supplies on base investment" });
      }
      if (moneyCost > 0) {
        changes.push({ op: "inc", path: "player.resources.money", delta: -moneyCost, reason: "Spend money on base investment" });
      }
    }

    const baseLevel = clamp(Math.max(0, ...Object.values(facilities)), 0, 5);
    changes.push(
      { op: "set", path: "campaign.base.facilities", value: facilities, reason: "Update base facilities" },
      { op: "set", path: "campaign.base.level", value: baseLevel, reason: "Update base level" },
      {
        op: "append",
        path: "publicEvents",
        value: event(state, turnId, "Base improved", "The campaign base gains a facility upgrade for future chapters.", ["base", "campaign"]),
        reason: "Record base investment"
      }
    );
  }

  if (training && startingCampaign.experience >= training.experience) {
    const skills = { ...state.player.skills };
    skills[training.skill] = clamp((skills[training.skill] ?? 0) + 1, 0, 5);
    changes.push(
      { op: "inc", path: "campaign.experience", delta: -training.experience, reason: "Spend campaign experience on training" },
      { op: "set", path: "player.skills", value: skills, reason: "Apply character growth training" },
      {
        op: "append",
        path: "publicEvents",
        value: event(state, turnId, "Training completed", "Campaign experience turns into a lasting player skill improvement.", [
          "growth",
          "campaign"
        ]),
        reason: "Record character growth"
      }
    );
  }

  if (factionFronts.length > 0) {
    const fronts = { ...startingCampaign.fronts };
    for (const delta of factionFronts) {
      const current = fronts[delta.factionId] ?? {
        factionId: delta.factionId,
        influence: 5,
        pressure: 5,
        status: "active" as const
      };
      const influence = clamp(current.influence + (delta.influenceDelta ?? 0), 0, 10);
      const pressure = clamp(current.pressure + (delta.pressureDelta ?? 0), 0, 10);
      fronts[delta.factionId] = {
        factionId: delta.factionId,
        influence,
        pressure,
        status: frontStatus(influence, pressure)
      };
    }
    changes.push(
      { op: "set", path: "campaign.fronts", value: fronts, reason: "Update long campaign faction fronts" },
      {
        op: "append",
        path: "publicEvents",
        value: event(
          state,
          turnId,
          "Faction war front shifts",
          "Faction pressure and influence change the strategic map for future chapters.",
          ["faction_war", "campaign"]
        ),
        reason: "Record faction war update"
      }
    );
  }

  return {
    type: "state_patch",
    source: "referee",
    changes
  };
};
