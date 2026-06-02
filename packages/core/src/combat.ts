import type { StatePatch, WorldState } from "@agentic-turnscape/shared";
import { classifySuccess, roll2d6, successLabel, type SuccessLevel } from "./dice.js";

export type CombatMoveType = "strike" | "guard" | "maneuver" | "press";

export type CombatMove = {
  type: CombatMoveType;
};

export type CombatRoundInput = {
  state: WorldState;
  targetId?: string;
  plan: CombatMove[];
  seed: string;
  difficulty?: number;
  leverageBonus?: number;
};

export type CombatOutcome = "player_advantage" | "player_setback";

export type CombatRoundResolution = {
  apBudget: number;
  apSpent: number;
  remainingAp: number;
  roll: {
    dice: [number, number];
    modifier: number;
    difficulty: number;
    total: number;
    level: SuccessLevel;
    label: string;
  };
  outcome: CombatOutcome;
  patch: StatePatch;
  publicSummary: string;
};

const AP_BUDGET = 3;

const moveCosts: Record<CombatMoveType, number> = {
  strike: 2,
  guard: 1,
  maneuver: 1,
  press: 1
};

const hasMove = (plan: CombatMove[], type: CombatMoveType) => plan.some((move) => move.type === type);

export const resolveCombatRound = ({
  state,
  targetId,
  plan,
  seed,
  difficulty = 13,
  leverageBonus = 0
}: CombatRoundInput): CombatRoundResolution => {
  const apSpent = plan.reduce((total, move) => total + moveCosts[move.type], 0);
  if (apSpent > AP_BUDGET) {
    throw new Error(`Combat plan exceeds 3 AP: ${apSpent}`);
  }

  const dice = roll2d6(seed);
  const pressurePenalty = Math.max(0, Math.floor((state.player.resources.pressure ?? 0) / 4));
  const maneuverBonus = hasMove(plan, "maneuver") ? 1 : 0;
  const pressBonus = hasMove(plan, "press") ? 1 : 0;
  const modifier =
    (state.player.attributes.physique ?? 0) +
    (state.player.skills.melee ?? 0) +
    state.player.momentum +
    leverageBonus +
    maneuverBonus +
    pressBonus -
    pressurePenalty;
  const total = dice.total + modifier;
  const level = classifySuccess(total, difficulty);
  const success = level === "costly_success" || level === "success" || level === "critical_success";
  const guarded = hasMove(plan, "guard");
  const changes: StatePatch["changes"] = [];

  if (success) {
    changes.push({ op: "inc", path: "player.momentum", delta: 1, reason: "3 AP 战斗回合取得优势" });
    if (targetId && state.characters[targetId]) {
      changes.push({ op: "tag", path: `characters.${targetId}.conditions`, value: "wounded", reason: "攻击命中造成状态效果" });
    }
    if (level === "costly_success") {
      changes.push({ op: "inc", path: "player.resources.pressure", delta: 1, reason: "有代价成功带来压力" });
    }
    if (level === "critical_success" && targetId && state.characters[targetId]) {
      changes.push({ op: "tag", path: `characters.${targetId}.conditions`, value: "rattled", reason: "大成功压制目标士气" });
    }
  } else {
    const damage = guarded ? 0 : level === "critical_failure" ? 2 : 1;
    if (damage > 0) {
      changes.push({ op: "inc", path: "player.resources.health", delta: -damage, reason: "战斗失败造成伤害" });
      changes.push({ op: "tag", path: "player.conditions", value: "wounded", reason: "战斗伤害留下状态效果" });
      if ((state.player.resources.health ?? 0) - damage <= 0) {
        changes.push({ op: "tag", path: "player.conditions", value: "downed", reason: "生命归零进入濒死状态" });
      }
    }
    changes.push({ op: "inc", path: "player.resources.pressure", delta: 1, reason: "战斗失利造成压力" });
  }

  return {
    apBudget: AP_BUDGET,
    apSpent,
    remainingAp: AP_BUDGET - apSpent,
    roll: {
      dice: dice.dice,
      modifier,
      difficulty,
      total,
      level,
      label: successLabel(level)
    },
    outcome: success ? "player_advantage" : "player_setback",
    patch: {
      type: "state_patch",
      source: "referee",
      changes
    },
    publicSummary: success ? `战斗回合取得优势：${successLabel(level)}。` : `战斗回合陷入劣势：${successLabel(level)}。`
  };
};
