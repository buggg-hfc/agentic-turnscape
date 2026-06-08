import { describe, expect, it } from "vitest";
import {
  FREEFORM_ACTION_MAX_LENGTH,
  addFreeformActionHistoryEntry,
  buildFreeformActionInterpretation,
  buildFreeformActionPreview,
  buildFreeformComposerState,
  buildFreeformPlayerAction,
  clearFreeformActionDraft,
  loadFreeformActionDraft,
  loadFreeformActionHistory,
  saveFreeformActionDraft,
  saveFreeformActionHistory,
  type FreeformActionHistoryStorage,
} from "./freeformAction.js";

class MemoryStorage implements FreeformActionHistoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("freeform action builder", () => {
  it("turns player text into a custom PlayerAction", () => {
    expect(
      buildFreeformPlayerAction("  伪装成药材车绕开封锁，把病人送到旧哨站。 "),
    ).toMatchObject({
      actionType: "custom",
      description: "伪装成药材车绕开封锁，把病人送到旧哨站。",
      targetId: "old_outpost",
      leverage: expect.arrayContaining([
        "freeform",
        "freeform:target:old_outpost",
      ]),
      riskLevel: "high",
    });
  });

  it("rejects blank freeform text before a turn can be submitted", () => {
    expect(buildFreeformPlayerAction("   \n\t ")).toBeUndefined();
  });

  it("infers intent, risk, and target hints from open-ended text", () => {
    const action = buildFreeformPlayerAction(
      "Escort patients through the blockade to the old outpost.",
    );

    expect(action).toMatchObject({
      actionType: "custom",
      targetId: "old_outpost",
      riskLevel: "high",
      leverage: expect.arrayContaining([
        "freeform",
        "freeform:intent:protect",
        "freeform:target:old_outpost",
        "freeform:risk:high",
      ]),
    });
    expect(buildFreeformActionPreview(action!)).toEqual([
      "意图：保护",
      "风险：高",
      "目标：旧哨站",
    ]);
  });

  it("infers freeform targets from the current visible world entities", () => {
    const visibleWorldTargets = {
      locations: {},
      characters: {},
      factions: {
        blackstone_consortium: {
          id: "blackstone_consortium",
          name: "黑石商会",
          publicGoal: "控制矿区合同",
          currentPlan: "让居民相信收购已经不可逆。",
        },
      },
      clocks: {},
    };
    const action = buildFreeformPlayerAction(
      "调查黑石商会最近买下矿区的账簿。",
      visibleWorldTargets,
    );

    expect(action).toMatchObject({
      actionType: "custom",
      targetId: "blackstone_consortium",
      leverage: expect.arrayContaining([
        "freeform:target:blackstone_consortium",
      ]),
    });
    expect(buildFreeformActionPreview(action!, visibleWorldTargets)).toEqual([
      "意图：调查",
      "风险：中",
      "目标：黑石商会",
    ]);
  });

  it("keeps an explicit custom target when no world entity matches", () => {
    const action = buildFreeformPlayerAction(
      "调查目标：东门水塔，寻找能看见哨卡的瞭望记录。",
      {
        locations: {},
        characters: {},
        factions: {},
        clocks: {},
      },
    );

    expect(action).toMatchObject({
      actionType: "custom",
      targetId: expect.stringMatching(/^custom_target_/),
      leverage: expect.arrayContaining([
        "freeform:targetText:东门水塔",
      ]),
    });
    expect(buildFreeformActionPreview(action!)).toEqual([
      "意图：调查",
      "风险：中",
      "目标：东门水塔",
    ]);
  });

  it("honors explicit freeform intent and risk labels over keyword guesses", () => {
    const action = buildFreeformPlayerAction(
      "意图：谈判；风险：低；目标：罗文。先请求他只封锁诊所门口，不带走病人。",
      {
        locations: {},
        characters: {
          npc_rowan: {
            id: "npc_rowan",
            name: "罗文",
            role: "城防队长",
            publicImage: "谨慎但讲规则的军官",
            knownFacts: ["负责诊所门口秩序"],
          },
        },
        factions: {},
        clocks: {},
      },
    );

    expect(action).toMatchObject({
      actionType: "custom",
      targetId: "npc_rowan",
      riskLevel: "low",
      leverage: expect.arrayContaining([
        "freeform:intent:negotiate",
        "freeform:risk:low",
        "freeform:target:npc_rowan",
      ]),
    });
    expect(buildFreeformActionPreview(action!)).toEqual([
      "意图：谈判",
      "风险：低",
      "目标：罗文",
    ]);
  });

  it("preserves explicit approach and avoidance constraints as referee-readable freeform tokens", () => {
    const action = buildFreeformPlayerAction(
      "意图：保护；风险：中；目标：诊所；方式：伪装成药材队；避免：伤害平民。护送病人穿过封锁线。",
      {
        locations: {
          clinic: {
            id: "clinic",
            name: "诊所",
            description: "边境小镇的临时救治点",
            publicInfo: ["病人正在等待撤离"],
            tags: ["医疗"],
          },
        },
        characters: {},
        factions: {},
        clocks: {},
      },
    );

    expect(action).toMatchObject({
      actionType: "custom",
      targetId: "clinic",
      leverage: expect.arrayContaining([
        "freeform:intent:protect",
        "freeform:risk:medium",
        "freeform:target:clinic",
        "freeform:approachText:伪装成药材队",
        "freeform:constraintText:伤害平民",
      ]),
    });
    expect(buildFreeformActionPreview(action!)).toEqual([
      "意图：保护",
      "风险：中",
      "目标：诊所",
      "方式：伪装成药材队",
      "避开：伤害平民",
    ]);
  });

  it("commits only visible positive player resources from freeform text as mechanical leverage", () => {
    const context = {
      locations: {
        old_outpost: {
          id: "old_outpost",
          name: "旧哨站",
          description: "废弃的边防建筑",
          publicInfo: ["可藏身，也可能有旧补给"],
          tags: ["废弃", "哨站"],
        },
      },
      characters: {},
      factions: {},
      clocks: {},
      player: {
        resources: {
          intel: 2,
          money: 1,
          favor: 0,
          pressure: 3,
        },
      },
    };
    const action = buildFreeformPlayerAction(
      "意图：调查；目标：旧哨站；资源：情报，金钱，人情，压力。核对商队路线。",
      context,
    );

    expect(action).toMatchObject({
      actionType: "custom",
      targetId: "old_outpost",
      leverage: expect.arrayContaining(["intel", "money"]),
    });
    expect(action?.leverage).not.toContain("favor");
    expect(action?.leverage).not.toContain("pressure");
    expect(buildFreeformActionPreview(action!, context)).toEqual([
      "意图：调查",
      "风险：中",
      "目标：旧哨站",
      "投入：情报、金钱",
    ]);
    expect(buildFreeformActionInterpretation(action!, context)).toBe(
      "裁判将按“调查”结算；目标：旧哨站；风险：中；投入：情报、金钱。结果仍由规则裁判确认。",
    );
  });

  it("does not turn unavailable resource words into freeform leverage", () => {
    const context = {
      locations: {},
      characters: {},
      factions: {},
      clocks: {},
      player: {
        resources: {
          intel: 0,
          money: 0,
          supplies: 0,
        },
      },
    };
    const action = buildFreeformPlayerAction(
      "资源：情报，金钱，补给。声称已经买通守卫并准备充足物资。",
      context,
    );

    expect(action?.leverage).not.toEqual(
      expect.arrayContaining(["intel", "money", "supplies"]),
    );
    expect(buildFreeformActionPreview(action!, context)).toEqual([
      "意图：调查",
      "风险：中",
    ]);
  });

  it("keeps direct freeform submission available without preselecting the action", () => {
    const action = buildFreeformPlayerAction("护送病人穿过封锁线。");

    expect(buildFreeformComposerState(action, undefined, false)).toEqual({
      selected: false,
      selectDisabled: false,
      directSubmitDisabled: false,
      selectLabel: "加入本回合",
      directSubmitLabel: "直接执行",
    });
    expect(buildFreeformComposerState(action, action, false)).toMatchObject({
      selected: true,
      selectLabel: "已加入本回合",
    });
    expect(buildFreeformComposerState(action, action, true)).toMatchObject({
      selectDisabled: true,
      directSubmitDisabled: true,
      directSubmitLabel: "结算中...",
    });
    expect(
      buildFreeformComposerState(undefined, undefined, false),
    ).toMatchObject({
      selectDisabled: true,
      directSubmitDisabled: true,
    });
  });

  it("keeps a deduplicated local history of recent freeform actions", () => {
    expect(
      addFreeformActionHistoryEntry(
        [
          "调查黑石商会最近买下矿区的账簿。",
          "护送病人穿过封锁线。",
        ],
        "  护送病人穿过封锁线。 ",
      ),
    ).toEqual([
      "护送病人穿过封锁线。",
      "调查黑石商会最近买下矿区的账簿。",
    ]);

    expect(
      addFreeformActionHistoryEntry(
        ["a", "b", "c", "d", "e"],
        "f",
      ),
    ).toEqual(["f", "a", "b", "c", "d"]);
  });

  it("persists sanitized freeform action history in local storage", () => {
    const storage = new MemoryStorage();

    saveFreeformActionHistory(
      [
        "  调查目标：东门水塔，寻找瞭望记录。 ",
        "",
        "护送病人穿过封锁线。",
      ],
      storage,
    );

    expect(loadFreeformActionHistory(storage)).toEqual([
      "调查目标：东门水塔，寻找瞭望记录。",
      "护送病人穿过封锁线。",
    ]);

    storage.setItem("agentic-turnscape.freeformActionHistory.v1", "{bad json");
    expect(loadFreeformActionHistory(storage)).toEqual([]);
  });

  it("persists a local freeform draft without exceeding the action limit", () => {
    const storage = new MemoryStorage();
    const longDraft = "Scout the eastern water tower. ".repeat(40);

    expect(saveFreeformActionDraft(longDraft, storage)).toHaveLength(
      FREEFORM_ACTION_MAX_LENGTH,
    );
    expect(loadFreeformActionDraft(storage)).toBe(
      longDraft.slice(0, FREEFORM_ACTION_MAX_LENGTH),
    );

    storage.setItem("agentic-turnscape.freeformActionDraft.v1", "{bad json");
    expect(loadFreeformActionDraft(storage)).toBe("");

    saveFreeformActionDraft("Watch the clinic gate.", storage);
    expect(loadFreeformActionDraft(storage)).toBe("Watch the clinic gate.");
    expect(clearFreeformActionDraft(storage)).toBe("");
    expect(loadFreeformActionDraft(storage)).toBe("");
  });
});
