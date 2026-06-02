import type { StatePatch, WorldState } from "@agentic-turnscape/shared";

export type SocialChipResource = "favor" | "intel" | "money";

export type SocialChipSpend = {
  resource: SocialChipResource;
  amount: number;
};

export type SocialLeverageResolution = {
  ordinaryLeverage: string[];
  acceptedChips: SocialChipSpend[];
  rejectedChips: SocialChipSpend[];
  ordinaryBonus: number;
  chipBonus: number;
  totalBonus: number;
  spendChanges: StatePatch["changes"];
};

const socialChipResources = new Set<SocialChipResource>(["favor", "intel", "money"]);
const chipPattern = /^chip:([a-z_]+):([1-9]\d*)$/;

const parseChip = (token: string): SocialChipSpend | undefined => {
  const match = chipPattern.exec(token);
  if (!match) return undefined;
  const resource = match[1];
  if (!socialChipResources.has(resource as SocialChipResource)) return undefined;
  return {
    resource: resource as SocialChipResource,
    amount: Number(match[2])
  };
};

export const resolveSocialLeverage = (state: WorldState, leverage: string[]): SocialLeverageResolution => {
  const ordinaryLeverage: string[] = [];
  const requestedChips: SocialChipSpend[] = [];

  for (const token of leverage) {
    const chip = parseChip(token);
    if (chip) requestedChips.push(chip);
    else ordinaryLeverage.push(token);
  }

  const remainingResources = { ...state.player.resources };
  const acceptedChips: SocialChipSpend[] = [];
  const rejectedChips: SocialChipSpend[] = [];

  for (const chip of requestedChips) {
    const available = remainingResources[chip.resource] ?? 0;
    if (available >= chip.amount) {
      acceptedChips.push(chip);
      remainingResources[chip.resource] = available - chip.amount;
    } else {
      rejectedChips.push(chip);
    }
  }

  const ordinaryBonus = Math.min(2, ordinaryLeverage.length);
  const chipBonus = Math.min(
    2,
    acceptedChips.reduce((total, chip) => total + chip.amount, 0)
  );

  return {
    ordinaryLeverage,
    acceptedChips,
    rejectedChips,
    ordinaryBonus,
    chipBonus,
    totalBonus: ordinaryBonus + chipBonus,
    spendChanges: acceptedChips.map((chip) => ({
      op: "inc",
      path: `player.resources.${chip.resource}`,
      delta: -chip.amount,
      reason: `投入社交筹码：${chip.resource}`
    }))
  };
};
