import { describe, expect, it } from "vitest";
import type { WorldState } from "@agentic-turnscape/shared";
import { requireScenarioPackage } from "./scenarioRegistry.js";

const expansionScenarioIds = [
  "frost-lantern-trial",
  "orbital-quarantine",
  "salt-harbor-accord",
  "rain-alley-haunting",
  "emergency-ward-night",
];

const hasChinese = /[\u3400-\u9fff]/;
const latinWord = /[A-Za-z]{3,}/;

const expectChineseUiText = (value: string, label: string) => {
  expect(value, label).toMatch(hasChinese);
  expect(value, label).not.toMatch(latinWord);
};

const mutableWorldAtEnding = (world: WorldState, momentum: number): WorldState => {
  const endingWorld = structuredClone(world);
  endingWorld.time = { day: 3, phase: "night" };
  endingWorld.player.momentum = momentum;
  return endingWorld;
};

describe("first-wave expansion localization", () => {
  it("keeps all expansion player-facing scenario text in Chinese", () => {
    for (const scenarioId of expansionScenarioIds) {
      const scenario = requireScenarioPackage(scenarioId);
      const world = scenario.createWorld();

      expectChineseUiText(scenario.title, `${scenarioId} title`);
      expectChineseUiText(world.player.name, `${scenarioId} player name`);

      for (const day of [1, 2, 3]) {
        const dayPlan = scenario.getDayPlan(day);
        expect(dayPlan, `${scenarioId} day ${day}`).toBeDefined();
        expectChineseUiText(dayPlan!.mainEvent, `${scenarioId} day ${day} event`);
      }

      for (const chapter of scenario.campaignArc?.chapters ?? []) {
        expectChineseUiText(chapter.title, `${scenarioId} chapter ${chapter.id} title`);
        expectChineseUiText(chapter.focus, `${scenarioId} chapter ${chapter.id} focus`);
      }

      for (const location of Object.values(world.locations)) {
        expectChineseUiText(location.name, `${scenarioId} location ${location.id} name`);
        expectChineseUiText(location.description, `${scenarioId} location ${location.id} description`);
        for (const [index, fact] of location.publicInfo.entries()) {
          expectChineseUiText(fact, `${scenarioId} location ${location.id} public ${index}`);
        }
        for (const [index, secret] of location.hiddenInfo.entries()) {
          expectChineseUiText(secret, `${scenarioId} location ${location.id} hidden ${index}`);
        }
      }

      for (const faction of Object.values(world.factions)) {
        expectChineseUiText(faction.name, `${scenarioId} faction ${faction.id} name`);
        expectChineseUiText(faction.publicGoal, `${scenarioId} faction ${faction.id} public goal`);
        expectChineseUiText(faction.hiddenGoal, `${scenarioId} faction ${faction.id} hidden goal`);
        expectChineseUiText(faction.internalConflict, `${scenarioId} faction ${faction.id} conflict`);
        expectChineseUiText(faction.style, `${scenarioId} faction ${faction.id} style`);
        expectChineseUiText(faction.bottomLine, `${scenarioId} faction ${faction.id} bottom line`);
        expectChineseUiText(faction.currentPlan, `${scenarioId} faction ${faction.id} plan`);
      }

      for (const character of Object.values(world.characters)) {
        expectChineseUiText(character.name, `${scenarioId} character ${character.id} name`);
        expectChineseUiText(character.role, `${scenarioId} character ${character.id} role`);
        expectChineseUiText(character.publicImage, `${scenarioId} character ${character.id} image`);
        expectChineseUiText(character.desire, `${scenarioId} character ${character.id} desire`);
        expectChineseUiText(character.fear, `${scenarioId} character ${character.id} fear`);
        expectChineseUiText(character.shortTermGoal, `${scenarioId} character ${character.id} short goal`);
        expectChineseUiText(character.longTermGoal, `${scenarioId} character ${character.id} long goal`);
        expectChineseUiText(character.truePersonality, `${scenarioId} character ${character.id} personality`);
        expectChineseUiText(character.bottomLine, `${scenarioId} character ${character.id} bottom line`);
        expectChineseUiText(character.weakness, `${scenarioId} character ${character.id} weakness`);
        expectChineseUiText(character.secret, `${scenarioId} character ${character.id} secret`);
        for (const [index, fact] of character.knownFacts.entries()) {
          expectChineseUiText(fact, `${scenarioId} character ${character.id} known ${index}`);
        }
        expectChineseUiText(character.memorySummary, `${scenarioId} character ${character.id} memory`);
      }

      for (const quest of Object.values(world.quests)) {
        expectChineseUiText(quest.name, `${scenarioId} quest ${quest.id} name`);
        expectChineseUiText(quest.trigger, `${scenarioId} quest ${quest.id} trigger`);
        expectChineseUiText(quest.realBackground, `${scenarioId} quest ${quest.id} background`);
        expectChineseUiText(quest.surfaceGoal, `${scenarioId} quest ${quest.id} surface goal`);
        expectChineseUiText(quest.hiddenGoal, `${scenarioId} quest ${quest.id} hidden goal`);
        expectChineseUiText(quest.failureConsequence, `${scenarioId} quest ${quest.id} failure`);
        expectChineseUiText(quest.longTermImpact, `${scenarioId} quest ${quest.id} impact`);
      }

      for (const clock of Object.values(world.clocks)) {
        expectChineseUiText(clock.name, `${scenarioId} clock ${clock.id} name`);
        expectChineseUiText(clock.consequence, `${scenarioId} clock ${clock.id} consequence`);
      }

      for (const event of world.publicEvents) {
        expectChineseUiText(event.title, `${scenarioId} event ${event.id} title`);
        expectChineseUiText(event.body, `${scenarioId} event ${event.id} body`);
      }

      for (const action of scenario.getActions(world)) {
        expectChineseUiText(action.label, `${scenarioId} action ${action.id} label`);
        expectChineseUiText(action.description, `${scenarioId} action ${action.id} description`);
      }

      const successEnding = scenario.evaluateEnding(mutableWorldAtEnding(world, 3));
      const pressureEnding = scenario.evaluateEnding(mutableWorldAtEnding(world, 0));
      expect(successEnding, `${scenarioId} success ending`).toBeDefined();
      expect(pressureEnding, `${scenarioId} pressure ending`).toBeDefined();
      expectChineseUiText(successEnding!.title, `${scenarioId} success ending title`);
      expectChineseUiText(successEnding!.summary, `${scenarioId} success ending summary`);
      expectChineseUiText(pressureEnding!.title, `${scenarioId} pressure ending title`);
      expectChineseUiText(pressureEnding!.summary, `${scenarioId} pressure ending summary`);
    }
  });
});
