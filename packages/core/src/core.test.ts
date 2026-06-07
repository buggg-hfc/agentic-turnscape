import { describe, expect, it } from "vitest";
import { createBorderSevenDaysWorld } from "@agentic-turnscape/content";
import type { PlayerAction, StatePatch } from "@agentic-turnscape/shared";
import { adjudicateTurn } from "./referee.js";
import { applyStatePatch } from "./patch.js";
import { classifySuccess, roll2d6 } from "./dice.js";

describe("dice and adjudication", () => {
  it("classifies 2d6 check margins using the GDD success ladder", () => {
    expect(classifySuccess(8, 13)).toBe("critical_failure");
    expect(classifySuccess(12, 13)).toBe("failure");
    expect(classifySuccess(13, 13)).toBe("costly_success");
    expect(classifySuccess(16, 13)).toBe("success");
    expect(classifySuccess(18, 13)).toBe("critical_success");
  });

  it("rolls deterministic 2d6 results for a fixed seed", () => {
    expect(roll2d6("clinic-turn")).toEqual(roll2d6("clinic-turn"));
  });

  it("keeps LLM proposals as input and only emits referee state patches", () => {
    const state = createBorderSevenDaysWorld();
    const action: PlayerAction = {
      actionType: "investigate",
      label: "调查失踪商队",
      description: "询问目击者，整理前往旧哨站的路线。",
      targetId: "old_outpost",
      leverage: ["public_rumor", "zhou_jin_help"],
      riskLevel: "medium"
    };
    const resolution = adjudicateTurn({
      state,
      playerAction: action,
      proposals: [
        {
          actorId: "npc_zhou_jin",
          intent: "协助调查",
          actionType: "observe",
          target: "old_outpost",
          usedResources: ["survival"],
          proposedAction: "寻找失踪商队痕迹",
          riskLevel: "low",
          publicReason: "边境痕迹不该这么干净"
        }
      ],
      turnId: "turn-test",
      seed: "fixed-success"
    });

    expect(resolution.patch.source).toBe("referee");
    expect(resolution.patch.changes.every((change) => change.reason.length > 0)).toBe(true);
  });

  it("routes fight actions through the 3 AP combat rules", () => {
    const state = createBorderSevenDaysWorld();
    const action: PlayerAction = {
      actionType: "fight",
      label: "压制雇佣兵",
      description: "用一次攻击和防守站位压住哈根。",
      targetId: "npc_hagen",
      leverage: ["ap:strike", "ap:guard"],
      riskLevel: "high"
    };

    const resolution = adjudicateTurn({
      state,
      playerAction: action,
      proposals: [],
      turnId: "turn-combat",
      seed: "referee-combat-success"
    });
    const next = applyStatePatch(state, resolution.patch);

    expect(next.characters.npc_hagen?.conditions).toContain("wounded");
    expect(next.player.momentum).toBeGreaterThan(state.player.momentum);
    expect(resolution.publicSummary).toContain("3 AP");
    expect(resolution.roll.modifier).toBe(4);
    expect(resolution.roll.total).toBe(15);
  });

  it("lets recovery branch actions reduce a near-collapse crisis clock through referee rules", () => {
    const state = createBorderSevenDaysWorld();
    state.clocks.plague_spread!.progress = 6;
    const action: PlayerAction = {
      id: "branch_quarantine_camp",
      actionType: "protect",
      label: "组织临时隔离营",
      description: "把诊所、礼拜堂和广场的空屋串成临时隔离线。",
      targetId: "npc_adele",
      leverage: ["recovery:plague", "clinic_protocol", "eve_shelter"],
      riskLevel: "high"
    };

    const resolution = adjudicateTurn({
      state,
      playerAction: action,
      proposals: [],
      turnId: "turn-recovery-plague",
      seed: "recovery-2"
    });
    const next = applyStatePatch(state, resolution.patch);

    expect(resolution.roll.label).toMatch(/成功/);
    expect(next.clocks.plague_spread?.progress).toBeLessThan(state.clocks.plague_spread!.progress);
    expect(next.publicEvents.at(-1)?.tags).toContain("recovery");
    expect(next.player.reputationTags).toContain("危机补救者");
  });
  it("adjudicates freeform player actions without letting text mutate state directly", () => {
    const state = createBorderSevenDaysWorld();
    state.player.attributes.insight = 5;
    state.player.skills.survival = 5;
    const action: PlayerAction = {
      actionType: "custom",
      label: "自由行动：伪装药材车",
      description: "伪装成药材车绕开封锁，把病人送到旧哨站。",
      leverage: ["freeform"],
      riskLevel: "medium"
    };

    const resolution = adjudicateTurn({
      state,
      playerAction: action,
      proposals: [],
      turnId: "turn-freeform",
      seed: "freeform-success"
    });
    const next = applyStatePatch(state, resolution.patch);
    const freeformEvent = next.publicEvents.find((item) => item.tags.includes("freeform"));

    expect(resolution.patch.source).toBe("referee");
    expect(freeformEvent?.body).toContain(action.description);
    expect(next.player.momentum).toBeGreaterThan(state.player.momentum);
    expect(next).not.toHaveProperty("伪装成药材车绕开封锁，把病人送到旧哨站。");
  });
});

describe("state patches", () => {
  it("applies validated increments and append-only chronicle updates", () => {
    const state = createBorderSevenDaysWorld();
    const patch: StatePatch = {
      type: "state_patch",
      source: "referee",
      changes: [
        { op: "inc", path: "clocks.plague_spread.progress", delta: 2, reason: "测试推进危机" },
        {
          op: "append",
          path: "publicEvents",
          value: {
            id: "evt_test",
            turnId: "turn-test",
            day: 1,
            phase: "morning",
            title: "测试事件",
            body: "这是一个测试事件。",
            tags: ["test"],
            createdAt: new Date(0).toISOString()
          },
          reason: "测试编年史"
        },
        { op: "tag", path: "player.reputationTags", value: "守信者", reason: "测试声望标签" }
      ]
    };

    const next = applyStatePatch(state, patch);
    expect(next.clocks.plague_spread?.progress).toBe(2);
    expect(next.publicEvents.at(-1)?.title).toBe("测试事件");
    expect(next.player.reputationTags).toContain("守信者");
  });

  it("rejects state patches that write to unknown fields instead of silently dropping them", () => {
    const state = createBorderSevenDaysWorld();
    const patch: StatePatch = {
      type: "state_patch",
      source: "referee",
      changes: [
        { op: "set", path: "characters.npc_adele.unverifiedSecret", value: "凭空新增字段", reason: "测试非法字段" }
      ]
    };

    expect(() => applyStatePatch(state, patch)).toThrow(/Cannot set missing state field/);
    expect(state.characters.npc_adele).not.toHaveProperty("unverifiedSecret");
  });

  it("clamps bounded player resources and converts zero health into a downed state", () => {
    const state = createBorderSevenDaysWorld();
    const patch: StatePatch = {
      type: "state_patch",
      source: "referee",
      changes: [
        { op: "inc", path: "player.resources.health", delta: -99, reason: "测试重伤不会生成负生命" },
        { op: "inc", path: "player.resources.stamina", delta: 99, reason: "测试体力上限" },
        { op: "inc", path: "player.resources.pressure", delta: 99, reason: "测试压力上限" }
      ]
    };

    const next = applyStatePatch(state, patch);
    expect(next.player.resources.health).toBe(0);
    expect(next.player.resources.stamina).toBe(6);
    expect(next.player.resources.pressure).toBe(10);
    expect(next.player.conditions).toContain("downed");
    expect(next.player.conditions).not.toContain("dead");
  });

  it("rejects referee patches that directly mark the player dead", () => {
    const state = createBorderSevenDaysWorld();
    const patch: StatePatch = {
      type: "state_patch",
      source: "referee",
      changes: [{ op: "tag", path: "player.conditions", value: "dead", reason: "测试非法终局状态" }]
    };

    expect(() => applyStatePatch(state, patch)).toThrow(/Player death is not a legal MVP state/);
  });
});
