export type RollResult = {
  dice: [number, number];
  total: number;
};

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number): (() => number) => {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

export const roll2d6 = (seed: string = crypto.randomUUID()): RollResult => {
  const random = mulberry32(hashSeed(seed));
  const die = () => Math.floor(random() * 6) + 1;
  const dice: [number, number] = [die(), die()];
  return { dice, total: dice[0] + dice[1] };
};

export type SuccessLevel = "critical_failure" | "failure" | "costly_success" | "success" | "critical_success";

export const classifySuccess = (total: number, difficulty: number): SuccessLevel => {
  const margin = total - difficulty;
  if (margin <= -5) return "critical_failure";
  if (margin < 0) return "failure";
  if (margin === 0) return "costly_success";
  if (margin >= 5) return "critical_success";
  return "success";
};

export const successLabel = (level: SuccessLevel): string => {
  switch (level) {
    case "critical_failure":
      return "大失败";
    case "failure":
      return "失败";
    case "costly_success":
      return "有代价成功";
    case "success":
      return "成功";
    case "critical_success":
      return "大成功";
  }
};
