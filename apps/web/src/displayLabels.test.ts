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

  it("renders built-in expansion scenario and chapter titles as Chinese", () => {
    expect(displayLabel("frost-lantern-trial")).toBe("霜灯试炼");
    expect(displayLabel("orbital-quarantine")).toBe("轨道隔离");
    expect(displayLabel("salt-harbor-accord")).toBe("盐港协定");
    expect(displayLabel("rain-alley-haunting")).toBe("雨巷异闻");
    expect(displayLabel("emergency-ward-night")).toBe("急诊夜班");
    expect(displayLabel("orbital-quarantine_opening_arc")).toBe(
      "轨道隔离：开局危机",
    );
  });

  it("keeps unknown ids readable or uses an explicit fallback title", () => {
    expect(displayLabel("custom_story_hook")).toBe("custom story hook");
    expect(displayLabel("creator-pack", "Creator Pack")).toBe("Creator Pack");
  });
});
