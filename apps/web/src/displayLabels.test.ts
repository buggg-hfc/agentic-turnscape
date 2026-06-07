import { describe, expect, it } from "vitest";
import { displayLabel, formatResourceBadge } from "./displayLabels.js";

describe("display labels", () => {
  it("renders common state ids and resource keys as Chinese UI text", () => {
    expect(displayLabel("missing_caravan")).toBe("失踪商队");
    expect(displayLabel("clinic_conflict")).toBe("诊所冲突");
    expect(displayLabel("old_outpost")).toBe("旧哨站");
    expect(displayLabel("npc_rowan")).toBe("罗文");
    expect(formatResourceBadge("money", 9)).toBe("金钱 9");
    expect(formatResourceBadge("contracts", 5)).toBe("合约 5");
  });

  it("keeps unknown ids readable without changing state keys", () => {
    expect(displayLabel("custom_story_hook")).toBe("custom story hook");
  });
});
