import { StatePatchSchema, WorldStateSchema, type StatePatch, type WorldState } from "@agentic-turnscape/shared";

const allowedRoots = new Set([
  "time",
  "currentLocationId",
  "player",
  "locations",
  "characters",
  "factions",
  "relationships",
  "quests",
  "clocks",
  "campaign",
  "publicEvents",
  "hiddenEvents"
]);
const optionalPatchRoots = new Set(["campaign"]);

const getAtPath = (target: unknown, parts: string[]): unknown => {
  let cursor = target;
  for (const part of parts) {
    if (cursor === null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
};

const getParent = (target: unknown, path: string): { parent: Record<string, unknown> | unknown[]; key: string } => {
  const parts = path.split(".").filter(Boolean);
  const [root] = parts;
  if (!root || !allowedRoots.has(root)) {
    throw new Error(`State patch path is outside allowed world state roots: ${path}`);
  }
  if (parts.length === 1) {
    if (target === null || typeof target !== "object") {
      throw new Error(`Cannot patch non-object root for path: ${path}`);
    }
    return { parent: target as Record<string, unknown>, key: root };
  }

  const parentPath = parts.slice(0, -1);
  const parent = getAtPath(target, parentPath);
  if (parent === null || typeof parent !== "object") {
    throw new Error(`Cannot patch missing parent for path: ${path}`);
  }
  return { parent: parent as Record<string, unknown> | unknown[], key: parts[parts.length - 1] ?? "" };
};

const hasPatchTarget = (parent: Record<string, unknown> | unknown[], key: string): boolean => {
  if (Array.isArray(parent)) {
    const index = Number(key);
    return Number.isInteger(index) && index >= 0 && index < parent.length;
  }
  return Object.prototype.hasOwnProperty.call(parent, key);
};

const playerResourceLimits: Record<string, { min: number; max: number }> = {
  health: { min: 0, max: 5 },
  stamina: { min: 0, max: 6 },
  pressure: { min: 0, max: 10 },
  focus: { min: 0, max: 5 },
  supplies: { min: 0, max: 10 },
  intel: { min: 0, max: 10 },
  favor: { min: 0, max: 10 },
  money: { min: 0, max: 99 }
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(value, max));

const addUnique = (items: string[], item: string) => {
  if (!items.includes(item)) items.push(item);
};

export const applyStatePatch = (state: WorldState, patch: StatePatch): WorldState => {
  const checkedPatch = StatePatchSchema.parse(patch);
  const next = structuredClone(state) as WorldState;

  for (const change of checkedPatch.changes) {
    const { parent, key } = getParent(next, change.path);
    const current = Array.isArray(parent) ? parent[Number(key)] : parent[key];

    switch (change.op) {
      case "set": {
        if (!hasPatchTarget(parent, key) && !optionalPatchRoots.has(change.path)) {
          throw new Error(`Cannot set missing state field at ${change.path}`);
        }
        if (Array.isArray(parent)) parent[Number(key)] = change.value;
        else parent[key] = change.value;
        break;
      }
      case "inc": {
        if (typeof current !== "number") {
          throw new Error(`Cannot increment non-number at ${change.path}`);
        }
        const delta = change.delta ?? 0;
        if (Array.isArray(parent)) parent[Number(key)] = current + delta;
        else parent[key] = current + delta;
        break;
      }
      case "append": {
        if (!Array.isArray(current)) {
          throw new Error(`Cannot append to non-array at ${change.path}`);
        }
        current.push(change.value);
        break;
      }
      case "remove": {
        if (!Array.isArray(current)) {
          throw new Error(`Cannot remove from non-array at ${change.path}`);
        }
        const index = current.findIndex((item) => JSON.stringify(item) === JSON.stringify(change.value));
        if (index >= 0) current.splice(index, 1);
        break;
      }
      case "tag": {
        if (!Array.isArray(current)) {
          throw new Error(`Cannot tag non-array at ${change.path}`);
        }
        if (!current.includes(change.value)) current.push(change.value);
        break;
      }
    }
  }

  for (const clock of Object.values(next.clocks)) {
    clock.progress = Math.max(0, Math.min(clock.progress, clock.max));
  }
  for (const relationship of Object.values(next.relationships)) {
    relationship.trust = Math.max(-5, Math.min(relationship.trust, 5));
    relationship.affinity = Math.max(-5, Math.min(relationship.affinity, 5));
    relationship.respect = Math.max(-5, Math.min(relationship.respect, 5));
    relationship.fear = Math.max(-5, Math.min(relationship.fear, 5));
    relationship.interest = Math.max(-5, Math.min(relationship.interest, 5));
    relationship.debt = Math.max(-5, Math.min(relationship.debt, 5));
    relationship.suspicion = Math.max(-5, Math.min(relationship.suspicion, 5));
  }
  for (const [resource, limit] of Object.entries(playerResourceLimits)) {
    const current = next.player.resources[resource];
    if (typeof current === "number") {
      next.player.resources[resource] = clamp(current, limit.min, limit.max);
    }
  }
  if (next.player.conditions.includes("dead")) {
    throw new Error("Player death is not a legal MVP state; use downed, captured, exiled, or another failure branch.");
  }
  if ((next.player.resources.health ?? 0) <= 0) {
    addUnique(next.player.conditions, "downed");
  }
  next.player.momentum = Math.max(0, Math.min(next.player.momentum, 5));

  return WorldStateSchema.parse(next);
};

export const mergePatches = (...patches: StatePatch[]): StatePatch => ({
  type: "state_patch",
  source: "referee",
  changes: patches.flatMap((patch) => patch.changes)
});
