import { describe, expect, it } from "vitest";
import type { ScenarioCatalogPayload } from "./api.js";
import { buildScenarioSelection, DEFAULT_SCENARIO_ID, formatScenarioCounts } from "./scenarioSelection.js";

const catalog: ScenarioCatalogPayload = {
  scenarios: [
    {
      id: "frost-lantern-trial",
      title: "Frost Lantern Trial",
      counts: { combat: 2, social: 3, endings: 2 },
      campaignArc: {
        chapterCount: 3,
        baseFacilities: ["training_hall", "archive"],
        factionFronts: ["frost_lantern_sect", "gray_ash_cabal"]
      }
    },
    {
      id: "border-seven-days",
      title: "边境七日",
      counts: { combat: 5, social: 8, endings: 6 }
    }
  ]
};

describe("scenario selection", () => {
  it("formats scenario counts for compact cards", () => {
    expect(formatScenarioCounts(catalog.scenarios[1]!.counts)).toBe("战斗 5 · 社交 8 · 结局 6");
  });

  it("formats long campaign arc metadata when a scenario exposes it", () => {
    const selection = buildScenarioSelection(catalog, "frost-lantern-trial");

    expect(selection.options[0]).toMatchObject({
      id: "frost-lantern-trial",
      arcSummary: "长期 3 章 · 基地 2 · 战线 2"
    });
  });

  it("keeps catalog order but defaults to border seven days when available", () => {
    const selection = buildScenarioSelection(catalog);

    expect(selection.selectedId).toBe(DEFAULT_SCENARIO_ID);
    expect(selection.options.map((option) => option.id)).toEqual(["frost-lantern-trial", "border-seven-days"]);
    expect(selection.options[0]).toMatchObject({
      id: "frost-lantern-trial",
      summary: "战斗 2 · 社交 3 · 结局 2"
    });
  });

  it("falls back to the first listed scenario when a preferred id is missing", () => {
    expect(buildScenarioSelection(catalog, "missing-scenario").selectedId).toBe("frost-lantern-trial");
  });
});
