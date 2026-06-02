import { describe, expect, it } from "vitest";
import {
  CREATOR_SCENARIO_STORAGE_KEY,
  deleteCreatorScenarioDefinition,
  formatCreatorScenarioDefinition,
  getSavedCreatorScenarioDefinition,
  listSavedCreatorScenarioSummaries,
  loadSavedCreatorScenarioDefinitions,
  parseCreatorScenarioJson,
  removeCreatorScenarioPackage,
  restoreSavedCreatorScenarioDefinitions,
  saveCreatorScenarioDefinition
} from "./scenarioImport.js";
import type { StorageLike } from "./llmSettings.js";

class MemoryStorage implements StorageLike {
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

describe("creator scenario import parsing", () => {
  it("parses a JSON object definition", () => {
    expect(parseCreatorScenarioJson('{ "id": "creator-pack", "title": "Creator Pack" }')).toEqual({
      ok: true,
      definition: { id: "creator-pack", title: "Creator Pack" }
    });
  });

  it("rejects malformed JSON with a useful message", () => {
    const result = parseCreatorScenarioJson('{ "id": ');

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain("JSON");
  });

  it("rejects empty text", () => {
    expect(parseCreatorScenarioJson("   ")).toEqual({
      ok: false,
      error: "Paste a creator scenario JSON object before importing."
    });
  });

  it("rejects non-object JSON", () => {
    expect(parseCreatorScenarioJson('[{ "id": "pack" }]')).toEqual({
      ok: false,
      error: "Creator scenario import must be a JSON object."
    });
  });

  it("saves imported creator scenario definitions by id", () => {
    const storage = new MemoryStorage();

    saveCreatorScenarioDefinition("pack-1", { id: "pack-1", title: "First" }, storage);
    saveCreatorScenarioDefinition("pack-1", { id: "pack-1", title: "Updated" }, storage);
    saveCreatorScenarioDefinition("pack-2", { id: "pack-2", title: "Second" }, storage);

    expect(loadSavedCreatorScenarioDefinitions(storage)).toEqual([
      { id: "pack-1", definition: { id: "pack-1", title: "Updated" } },
      { id: "pack-2", definition: { id: "pack-2", title: "Second" } }
    ]);
  });

  it("returns no saved creator scenarios for invalid storage data", () => {
    const storage = new MemoryStorage();
    storage.setItem(CREATOR_SCENARIO_STORAGE_KEY, "{bad json");

    expect(loadSavedCreatorScenarioDefinitions(storage)).toEqual([]);
  });

  it("summarizes saved creator scenarios for management UI", () => {
    const storage = new MemoryStorage();
    saveCreatorScenarioDefinition("pack-1", { id: "pack-1", title: "First Pack" }, storage);
    saveCreatorScenarioDefinition("pack-2", { id: "pack-2" }, storage);

    expect(listSavedCreatorScenarioSummaries(storage)).toEqual([
      { id: "pack-1", title: "First Pack" },
      { id: "pack-2", title: "pack-2" }
    ]);
  });

  it("finds saved creator scenario definitions by id", () => {
    const storage = new MemoryStorage();
    saveCreatorScenarioDefinition("pack-1", { id: "pack-1", title: "First Pack" }, storage);

    expect(getSavedCreatorScenarioDefinition("pack-1", storage)).toEqual({ id: "pack-1", title: "First Pack" });
    expect(getSavedCreatorScenarioDefinition("missing-pack", storage)).toBeUndefined();
  });

  it("formats creator scenario definitions for export", () => {
    expect(formatCreatorScenarioDefinition({ id: "pack-1", title: "First Pack" })).toBe([
      "{",
      '  "id": "pack-1",',
      '  "title": "First Pack"',
      "}"
    ].join("\n"));
  });

  it("deletes saved creator scenarios by id", () => {
    const storage = new MemoryStorage();
    saveCreatorScenarioDefinition("pack-1", { id: "pack-1", title: "First" }, storage);
    saveCreatorScenarioDefinition("pack-2", { id: "pack-2", title: "Second" }, storage);

    expect(deleteCreatorScenarioDefinition("pack-1", storage)).toEqual([
      { id: "pack-2", definition: { id: "pack-2", title: "Second" } }
    ]);
    expect(loadSavedCreatorScenarioDefinitions(storage)).toEqual([
      { id: "pack-2", definition: { id: "pack-2", title: "Second" } }
    ]);
  });

  it("removes a creator scenario after runtime deletion succeeds", async () => {
    const storage = new MemoryStorage();
    saveCreatorScenarioDefinition("pack-1", { id: "pack-1", title: "First" }, storage);
    const deleted: string[] = [];

    const result = await removeCreatorScenarioPackage("pack-1", async (id) => {
      deleted.push(id);
    }, storage);

    expect(result).toEqual({ ok: true, runtimeAlreadyMissing: false, saved: [] });
    expect(deleted).toEqual(["pack-1"]);
    expect(loadSavedCreatorScenarioDefinitions(storage)).toEqual([]);
  });

  it("keeps a saved creator scenario when runtime deletion is refused", async () => {
    const storage = new MemoryStorage();
    saveCreatorScenarioDefinition("pack-1", { id: "pack-1", title: "First" }, storage);

    const result = await removeCreatorScenarioPackage("pack-1", async () => {
      throw new Error('{"error":"scenario_in_use"}');
    }, storage);

    expect(result).toEqual({ ok: false, error: '{"error":"scenario_in_use"}' });
    expect(loadSavedCreatorScenarioDefinitions(storage)).toEqual([
      { id: "pack-1", definition: { id: "pack-1", title: "First" } }
    ]);
  });

  it("removes local saved data when the runtime scenario is already missing", async () => {
    const storage = new MemoryStorage();
    saveCreatorScenarioDefinition("pack-1", { id: "pack-1", title: "First" }, storage);

    const result = await removeCreatorScenarioPackage("pack-1", async () => {
      throw new Error('{"error":"runtime_scenario_not_found"}');
    }, storage);

    expect(result).toEqual({ ok: true, runtimeAlreadyMissing: true, saved: [] });
    expect(loadSavedCreatorScenarioDefinitions(storage)).toEqual([]);
  });

  it("restores saved creator scenarios into the runtime API", async () => {
    const storage = new MemoryStorage();
    saveCreatorScenarioDefinition("pack-1", { id: "pack-1" }, storage);
    saveCreatorScenarioDefinition("pack-2", { id: "pack-2" }, storage);
    const imported: unknown[] = [];

    const result = await restoreSavedCreatorScenarioDefinitions(async (definition) => {
      imported.push(definition);
    }, storage);

    expect(imported).toEqual([{ id: "pack-1" }, { id: "pack-2" }]);
    expect(result).toEqual({ restored: ["pack-1", "pack-2"], skipped: [], failed: [] });
  });

  it("skips duplicate runtime scenarios during restore", async () => {
    const storage = new MemoryStorage();
    saveCreatorScenarioDefinition("pack-1", { id: "pack-1" }, storage);

    const result = await restoreSavedCreatorScenarioDefinitions(async () => {
      throw new Error('{"error":"duplicate_scenario"}');
    }, storage);

    expect(result).toEqual({ restored: [], skipped: ["pack-1"], failed: [] });
  });

  it("reports failed saved scenario restores without stopping the rest", async () => {
    const storage = new MemoryStorage();
    saveCreatorScenarioDefinition("bad-pack", { id: "bad-pack" }, storage);
    saveCreatorScenarioDefinition("good-pack", { id: "good-pack" }, storage);

    const result = await restoreSavedCreatorScenarioDefinitions(async (definition) => {
      if ((definition as { id?: string }).id === "bad-pack") {
        throw new Error("invalid_scenario");
      }
    }, storage);

    expect(result.restored).toEqual(["good-pack"]);
    expect(result.skipped).toEqual([]);
    expect(result.failed).toEqual([{ id: "bad-pack", message: "invalid_scenario" }]);
  });
});
