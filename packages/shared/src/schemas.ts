import { z } from "zod";

export const TimePhaseSchema = z.enum(["morning", "afternoon", "evening", "night"]);
export type TimePhase = z.infer<typeof TimePhaseSchema>;

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const TransparencyModeSchema = z.enum(["immersive", "inference", "debug"]);
export type TransparencyMode = z.infer<typeof TransparencyModeSchema>;

export const DEFAULT_LLM_CONFIG = {
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4.1-mini",
  apiKey: "",
  timeoutMs: 15000
} as const;

export const LlmConfigSchema = z.object({
  baseUrl: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.replace(/\/+$/, ""))
    .default(DEFAULT_LLM_CONFIG.baseUrl),
  model: z.string().trim().min(1).default(DEFAULT_LLM_CONFIG.model),
  apiKey: z.string().trim().default(DEFAULT_LLM_CONFIG.apiKey),
  timeoutMs: z.coerce.number().int().min(1000).max(120000).default(DEFAULT_LLM_CONFIG.timeoutMs)
});
export type LlmConfig = z.infer<typeof LlmConfigSchema>;

export const RelationshipSchema = z.object({
  trust: z.number().int().min(-5).max(5),
  affinity: z.number().int().min(-5).max(5),
  respect: z.number().int().min(-5).max(5),
  fear: z.number().int().min(-5).max(5),
  interest: z.number().int().min(-5).max(5),
  debt: z.number().int().min(-5).max(5),
  suspicion: z.number().int().min(-5).max(5)
});
export type RelationshipState = z.infer<typeof RelationshipSchema>;

export const AttributesSchema = z.object({
  physique: z.number().int().min(0).max(5),
  agility: z.number().int().min(0).max(5),
  knowledge: z.number().int().min(0).max(5),
  insight: z.number().int().min(0).max(5),
  charm: z.number().int().min(0).max(5),
  will: z.number().int().min(0).max(5)
});
export type Attributes = z.infer<typeof AttributesSchema>;

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  factionId: z.string().optional(),
  publicImage: z.string(),
  truePersonality: z.string(),
  desire: z.string(),
  fear: z.string(),
  shortTermGoal: z.string(),
  longTermGoal: z.string(),
  secret: z.string(),
  bottomLine: z.string(),
  weakness: z.string(),
  attributes: AttributesSchema,
  skills: z.record(z.string(), z.number().int().min(0).max(5)),
  resources: z.record(z.string(), z.number().int()),
  conditions: z.array(z.string()),
  knownFacts: z.array(z.string()),
  memorySummary: z.string()
});
export type CharacterState = z.infer<typeof CharacterSchema>;

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  publicInfo: z.array(z.string()),
  hiddenInfo: z.array(z.string()),
  tags: z.array(z.string()),
  dangerLevel: z.number().int().min(0).max(5)
});
export type LocationState = z.infer<typeof LocationSchema>;

export const FactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  publicGoal: z.string(),
  hiddenGoal: z.string(),
  leader: z.string(),
  resources: z.record(z.string(), z.number().int()),
  baseId: z.string(),
  allies: z.array(z.string()),
  enemies: z.array(z.string()),
  internalConflict: z.string(),
  style: z.string(),
  bottomLine: z.string(),
  currentPlan: z.string(),
  clockIds: z.array(z.string())
});
export type FactionState = z.infer<typeof FactionSchema>;

export const QuestSchema = z.object({
  id: z.string(),
  name: z.string(),
  trigger: z.string(),
  patron: z.string(),
  realBackground: z.string(),
  surfaceGoal: z.string(),
  hiddenGoal: z.string(),
  locationIds: z.array(z.string()),
  npcIds: z.array(z.string()),
  factionIds: z.array(z.string()),
  solutionTypes: z.array(z.string()),
  failureConsequence: z.string(),
  longTermImpact: z.string(),
  status: z.enum(["available", "active", "resolved", "failed"])
});
export type QuestState = z.infer<typeof QuestSchema>;

export const ClockSchema = z.object({
  id: z.string(),
  name: z.string(),
  progress: z.number().int().min(0),
  max: z.number().int().positive(),
  consequence: z.string(),
  visible: z.boolean()
});
export type ClockState = z.infer<typeof ClockSchema>;

export const ChronicleEventSchema = z.object({
  id: z.string(),
  turnId: z.string(),
  day: z.number().int().positive(),
  phase: TimePhaseSchema,
  title: z.string(),
  body: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string()
});
export type ChronicleEvent = z.infer<typeof ChronicleEventSchema>;

export const HiddenEventSchema = ChronicleEventSchema.extend({
  revealed: z.boolean(),
  relatedIds: z.array(z.string())
});
export type HiddenEvent = z.infer<typeof HiddenEventSchema>;

export const CampaignFrontSchema = z.object({
  factionId: z.string(),
  influence: z.number().int().min(0).max(10),
  pressure: z.number().int().min(0).max(10),
  status: z.enum(["contained", "active", "dominant", "broken"])
});
export type CampaignFrontState = z.infer<typeof CampaignFrontSchema>;

export const CampaignProgressionSchema = z.object({
  chapter: z.number().int().min(1).max(12),
  experience: z.number().int().min(0).max(99),
  base: z.object({
    name: z.string(),
    level: z.number().int().min(0).max(5),
    facilities: z.record(z.string(), z.number().int().min(0).max(5)),
    assets: z.record(z.string(), z.number().int().min(0).max(99))
  }),
  fronts: z.record(z.string(), CampaignFrontSchema),
  legacyFlags: z.array(z.string())
});
export type CampaignProgressionState = z.infer<typeof CampaignProgressionSchema>;

export const WorldStateSchema = z.object({
  time: z.object({
    day: z.number().int().min(1).max(7),
    phase: TimePhaseSchema
  }),
  currentLocationId: z.string(),
  player: z.object({
    id: z.literal("player"),
    name: z.string(),
    attributes: AttributesSchema,
    skills: z.record(z.string(), z.number().int().min(0).max(5)),
    resources: z.record(z.string(), z.number().int()),
    conditions: z.array(z.string()),
    reputationTags: z.array(z.string()),
    momentum: z.number().int().min(0).max(5)
  }),
  locations: z.record(z.string(), LocationSchema),
  characters: z.record(z.string(), CharacterSchema),
  factions: z.record(z.string(), FactionSchema),
  relationships: z.record(z.string(), RelationshipSchema),
  quests: z.record(z.string(), QuestSchema),
  clocks: z.record(z.string(), ClockSchema),
  publicEvents: z.array(ChronicleEventSchema),
  hiddenEvents: z.array(HiddenEventSchema),
  campaign: CampaignProgressionSchema.optional()
});
export type WorldState = z.infer<typeof WorldStateSchema>;

export const AgentActionProposalSchema = z.object({
  actorId: z.string(),
  intent: z.string(),
  actionType: z.string(),
  target: z.string().optional(),
  usedResources: z.array(z.string()),
  proposedAction: z.string(),
  riskLevel: RiskLevelSchema,
  fallback: z.string().optional(),
  publicReason: z.string(),
  hiddenReason: z.string().optional()
});
export type AgentActionProposal = z.infer<typeof AgentActionProposalSchema>;

export const StatePatchSchema = z.object({
  type: z.literal("state_patch"),
  source: z.literal("referee"),
  changes: z.array(
    z.object({
      op: z.enum(["set", "inc", "append", "remove", "tag"]),
      path: z.string(),
      value: z.unknown().optional(),
      delta: z.number().optional(),
      reason: z.string()
    })
  )
});
export type StatePatch = z.infer<typeof StatePatchSchema>;

export const EndingSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string()
});
export type EndingSummary = z.infer<typeof EndingSummarySchema>;

export const PlayerActionSchema = z.object({
  id: z.string().optional(),
  actionType: z.enum(["investigate", "negotiate", "fight", "protect", "trade", "rest", "travel", "ignore"]),
  label: z.string(),
  description: z.string(),
  targetId: z.string().optional(),
  leverage: z.array(z.string()).default([]),
  riskLevel: RiskLevelSchema.default("medium")
});
export type PlayerAction = z.infer<typeof PlayerActionSchema>;

export const TurnResolutionSchema = z.object({
  turnId: z.string(),
  proposals: z.array(AgentActionProposalSchema),
  statePatch: StatePatchSchema,
  publicSummary: z.string(),
  hiddenSummary: z.string(),
  narration: z.string(),
  ending: EndingSummarySchema.optional(),
  availableActions: z.array(PlayerActionSchema)
});
export type TurnResolution = z.infer<typeof TurnResolutionSchema>;
