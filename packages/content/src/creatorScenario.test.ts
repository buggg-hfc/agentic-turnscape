import { describe, expect, it } from "vitest";
import { buildCreatorScenarioDraft } from "@agentic-turnscape/shared";
import { createBorderSevenDaysWorld } from "./borderSevenDays.js";
import { importCreatorScenarioPackage } from "./creatorScenario.js";
import { createScenarioRegistry } from "./scenarioRegistry.js";

const validCreatorDefinition = () => {
  const world = createBorderSevenDaysWorld();
  return {
    id: "creator-border-lite",
    title: "Creator Border Lite",
    world,
    days: [
      {
        day: 1,
        mainEvent: "A designer-authored clinic crisis starts.",
        defaultLocationId: "clinic",
        sceneIds: ["creator_clinic_scene"],
        clockPressure: ["plague_spread"]
      }
    ],
    scenes: [
      {
        id: "creator_clinic_scene",
        name: "Creator Clinic Scene",
        kind: "social",
        day: 1,
        locationId: "clinic",
        npcIds: ["npc_adele", "npc_rowan"],
        crisisClockIds: ["plague_spread"],
        nonCombatSolutions: ["negotiate", "protect"]
      },
      {
        id: "creator_street_fight",
        name: "Creator Street Fight",
        kind: "combat",
        day: 1,
        locationId: "town_square",
        npcIds: ["npc_hagen"],
        crisisClockIds: ["martial_lockdown"],
        nonCombatSolutions: ["withdraw"]
      }
    ],
    actions: [
      {
        actionType: "negotiate",
        label: "Open creator negotiation",
        description: "Use a custom authored action.",
        targetId: "npc_rowan",
        leverage: ["creator_note"],
        riskLevel: "medium"
      }
    ],
    endings: [
      {
        id: "creator_plague_break",
        title: "Creator Plague Break",
        summary: "The creator-authored plague ending fires.",
        when: { dayAtLeast: 1, phase: "morning", clockAtMax: "plague_spread" }
      }
    ]
  } as const;
};

describe("creator scenario import", () => {
  it("imports a validated creator-authored scenario into the package contract", () => {
    const scenario = importCreatorScenarioPackage(validCreatorDefinition());
    const world = scenario.createWorld();
    const secondWorld = scenario.createWorld();

    world.player.resources.intel = 9;
    expect(secondWorld.player.resources.intel).toBe(1);
    expect(scenario.counts).toEqual({ combat: 1, social: 1, endings: 1 });
    expect(scenario.getDayPlan(1)?.defaultLocationId).toBe("clinic");
    expect(scenario.getActions(world)).toEqual([
      expect.objectContaining({
        actionType: "negotiate",
        targetId: "npc_rowan"
      })
    ]);

    world.clocks.plague_spread!.progress = world.clocks.plague_spread!.max;
    expect(scenario.evaluateEnding(world)).toMatchObject({
      id: "creator_plague_break",
      title: "Creator Plague Break"
    });
  });

  it("rejects creator scenarios with broken world and scene references", () => {
    const invalid = validCreatorDefinition();
    invalid.scenes[0] = { ...invalid.scenes[0], locationId: "missing_location" };

    expect(() => importCreatorScenarioPackage(invalid)).toThrow(/missing_location/);
  });

  it("rejects creator endings that point at unknown clocks", () => {
    const invalid = validCreatorDefinition();
    invalid.endings[0] = {
      ...invalid.endings[0],
      when: { ...invalid.endings[0].when, clockAtMax: "missing_clock" }
    };

    expect(() => importCreatorScenarioPackage(invalid)).toThrow(/missing_clock/);
  });

  it("can register imported creator packages through the existing registry", () => {
    const scenario = importCreatorScenarioPackage(validCreatorDefinition());
    const registry = createScenarioRegistry([scenario]);

    expect(registry.list()).toEqual([
      {
        id: "creator-border-lite",
        title: "Creator Border Lite",
        counts: { combat: 1, social: 1, endings: 1 }
      }
    ]);
    expect(registry.require("creator-border-lite").createWorld().currentLocationId).toBe("town_square");
  });

  it("accepts the GUI quick-create draft through the same import contract", () => {
    const scenario = importCreatorScenarioPackage(
      buildCreatorScenarioDraft({
        id: "clinic-gui-draft",
        title: "诊所草稿",
        premise: "封锁线外的伤员突然涌入，镇民要求一个公开答案。",
        playerName: "临时镇医",
        startLocationName: "临时诊所",
        startLocationDescription: "临时诊所被雨布分成三块分诊区，门口贴着伤员登记表。",
        startLocationPublicInfo: "轻伤者愿意排队登记;镇民正在等待放行名单",
        startLocationHiddenInfo: "第一批重伤者曾被转移到哨卡后仓",
        startLocationDangerLevel: 2,
        pressureLocationName: "封锁哨卡",
        pressureLocationDescription: "封锁哨卡堆着路障和空药箱，巡逻队把通行证收走。",
        pressureLocationPublicInfo: "巡逻队要求所有人退回诊所;哨卡后仓传来咳嗽声",
        pressureLocationHiddenInfo: "延误记录藏在哨卡值班簿里;赫然队长知道药箱去向",
        pressureLocationDangerLevel: 4,
        crisisName: "伤员潮",
        crisisInitialProgress: 1,
        crisisMax: 5,
        crisisConsequence: "伤员潮满格时，巡逻队会接管哨卡分诊权。",
        guideName: "米娜",
        guideRole: "志愿护理队协调员",
        guidePublicImage: "米娜拿着公开登记板，在诊所门口安抚家属。",
        guideShortTermGoal: "让轻伤者先接受公开分诊。",
        guideSecret: "米娜知道第一批药箱被谁扣在哨卡。",
        pressureNpcName: "赫然队长",
        pressureNpcRole: "封锁巡逻队队长",
        pressureNpcPublicImage: "赫然队长以维持秩序为由收走所有通行证。",
        pressureNpcShortTermGoal: "把转运决定权留在巡逻队手里。",
        pressureNpcSecret: "赫然队长签过延后公开伤员名单的命令。",
        allyFactionName: "志愿护理队",
        pressureFactionName: "封锁巡逻队",
        allyFactionPublicGoal: "公开分诊并保护愿意登记的伤员。",
        allyFactionCurrentPlan: "先在诊所门口建立临时护理台。",
        allyFactionResources: "护工:4,药箱:2",
        pressureFactionPublicGoal: "声称封锁哨卡能阻止伤员潮扩大。",
        pressureFactionCurrentPlan: "把所有转运申请压到巡逻队手里。",
        pressureFactionResources: "哨兵:3,封条:2",
        mainQuestGoal: "在哨卡封闭前建立公开分诊线并争取放行窗口。",
        mainQuestRealBackground:
          "巡逻队曾把第一批伤员转移到哨卡后仓，公开分诊会暴露延误。",
        mainQuestHiddenGoal: "查清谁命令志愿护理队延后公开伤员名单。",
        mainQuestFailureConsequence:
          "巡逻队会宣布分诊失败，哨卡进入长期封闭。",
        mainQuestLongTermImpact:
          "公开分诊线会成为后续医疗据点和通行谈判的基础。",
        primaryActionType: "protect",
        primaryActionTarget: "pressureNpc",
        primaryActionLabel: "稳定分诊",
        primaryActionDescription: "把伤员按公开标准分流，争取镇民先稳住现场。",
        primaryActionRiskLevel: "low",
        secondaryActionType: "negotiate",
        secondaryActionTarget: "startLocation",
        secondaryActionLabel: "谈判放行",
        secondaryActionDescription: "带着护理记录去哨卡争取临时通行窗口。",
        secondaryActionRiskLevel: "medium",
        tertiaryActionType: "travel",
        tertiaryActionTarget: "pressureLocation",
        tertiaryActionLabel: "转移伤员",
        tertiaryActionDescription: "保护重伤者离开封锁线并留下可验证名单。",
        tertiaryActionRiskLevel: "high",
        successEndingTitle: "伤员安置",
        pressureEndingTitle: "哨卡接管",
        successEndingSummary: "镇民接受公开分诊，伤员被送进可持续照护线。",
        pressureEndingSummary: "巡逻队接管哨卡，镇民只能等待下一轮放行。",
      }),
    );
    const world = scenario.createWorld();
    const successWorld = scenario.createWorld();
    const pressureWorld = scenario.createWorld();

    expect(scenario.id).toBe("clinic-gui-draft");
    expect(scenario.counts).toEqual({ combat: 1, social: 1, endings: 2 });
    expect(world.player.name).toBe("临时镇医");
    expect(Object.values(world.locations).map((location) => location.name)).toContain("封锁哨卡");
    expect(Object.values(world.locations).map((location) => location.description)).toEqual([
      "临时诊所被雨布分成三块分诊区，门口贴着伤员登记表。",
      "封锁哨卡堆着路障和空药箱，巡逻队把通行证收走。",
    ]);
    expect(Object.values(world.locations).map((location) => location.publicInfo)).toEqual([
      ["轻伤者愿意排队登记", "镇民正在等待放行名单"],
      ["巡逻队要求所有人退回诊所", "哨卡后仓传来咳嗽声"],
    ]);
    expect(Object.values(world.locations).map((location) => location.hiddenInfo)).toEqual([
      ["第一批重伤者曾被转移到哨卡后仓"],
      ["延误记录藏在哨卡值班簿里", "赫然队长知道药箱去向"],
    ]);
    expect(Object.values(world.locations).map((location) => location.dangerLevel)).toEqual([
      2,
      4,
    ]);
    expect(Object.values(world.characters).map((npc) => npc.name)).toContain("赫然队长");
    expect(Object.values(world.characters).map((npc) => npc.role)).toEqual([
      "志愿护理队协调员",
      "封锁巡逻队队长",
    ]);
    expect(Object.values(world.characters).map((npc) => npc.publicImage)).toEqual([
      "米娜拿着公开登记板，在诊所门口安抚家属。",
      "赫然队长以维持秩序为由收走所有通行证。",
    ]);
    expect(Object.values(world.characters).map((npc) => npc.shortTermGoal)).toEqual([
      "让轻伤者先接受公开分诊。",
      "把转运决定权留在巡逻队手里。",
    ]);
    expect(Object.values(world.characters).map((npc) => npc.secret)).toEqual([
      "米娜知道第一批药箱被谁扣在哨卡。",
      "赫然队长签过延后公开伤员名单的命令。",
    ]);
    expect(Object.values(world.factions).map((faction) => faction.publicGoal)).toEqual([
      "公开分诊并保护愿意登记的伤员。",
      "声称封锁哨卡能阻止伤员潮扩大。",
    ]);
    expect(Object.values(world.factions).map((faction) => faction.currentPlan)).toEqual([
      "先在诊所门口建立临时护理台。",
      "把所有转运申请压到巡逻队手里。",
    ]);
    expect(Object.values(world.factions).map((faction) => faction.resources)).toEqual([
      { 护工: 4, 药箱: 2 },
      { 哨兵: 3, 封条: 2 },
    ]);
    expect(Object.values(world.quests).map((quest) => quest.surfaceGoal)).toEqual([
      "在哨卡封闭前建立公开分诊线并争取放行窗口。",
    ]);
    expect(Object.values(world.quests).map((quest) => quest.realBackground)).toEqual([
      "巡逻队曾把第一批伤员转移到哨卡后仓，公开分诊会暴露延误。",
    ]);
    expect(Object.values(world.quests).map((quest) => quest.hiddenGoal)).toEqual([
      "查清谁命令志愿护理队延后公开伤员名单。",
    ]);
    expect(
      Object.values(world.quests).map((quest) => quest.failureConsequence),
    ).toEqual(["巡逻队会宣布分诊失败，哨卡进入长期封闭。"]);
    expect(Object.values(world.quests).map((quest) => quest.longTermImpact)).toEqual([
      "公开分诊线会成为后续医疗据点和通行谈判的基础。",
    ]);
    const importedPressureClock = Object.values(world.clocks).find(
      (clock) => clock.name === "伤员潮",
    );
    expect(importedPressureClock).toMatchObject({ progress: 1, max: 5 });
    expect(importedPressureClock?.consequence).toBe(
      "伤员潮满格时，巡逻队会接管哨卡分诊权。",
    );
    expect(scenario.getDayPlan(1)?.mainEvent).toContain("封锁线外");
    expect(scenario.getActions(world).map((action) => action.label)).toEqual([
      "稳定分诊",
      "谈判放行",
      "转移伤员",
    ]);
    expect(scenario.getActions(world).map((action) => action.actionType)).toEqual([
      "protect",
      "negotiate",
      "travel",
    ]);
    expect(scenario.getActions(world).map((action) => action.targetId)).toEqual([
      "clinic_gui_draft_pressure_lead",
      "clinic_gui_draft_start",
      "clinic_gui_draft_pressure_site",
    ]);
    expect(scenario.getActions(world).map((action) => action.description)).toEqual([
      "把伤员按公开标准分流，争取镇民先稳住现场。",
      "带着护理记录去哨卡争取临时通行窗口。",
      "保护重伤者离开封锁线并留下可验证名单。",
    ]);
    expect(scenario.getActions(world).map((action) => action.riskLevel)).toEqual([
      "low",
      "medium",
      "high",
    ]);
    successWorld.player.momentum = 3;
    expect(scenario.evaluateEnding(successWorld)?.title).toBe("伤员安置");
    expect(scenario.evaluateEnding(successWorld)?.summary).toBe(
      "镇民接受公开分诊，伤员被送进可持续照护线。",
    );
    const pressureClock = Object.values(pressureWorld.clocks).find(
      (clock) => clock.name === "伤员潮",
    );
    expect(pressureClock).toBeDefined();
    pressureClock!.progress = pressureClock!.max;
    expect(scenario.evaluateEnding(pressureWorld)?.title).toBe("哨卡接管");
    expect(scenario.evaluateEnding(pressureWorld)?.summary).toBe(
      "巡逻队接管哨卡，镇民只能等待下一轮放行。",
    );
  });
});
