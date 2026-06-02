import type { Attributes, CharacterState, FactionState, LocationState, PlayerAction, QuestState, RelationshipState, WorldState } from "@agentic-turnscape/shared";
import type { ScenarioCampaignArc, ScenarioDayPlan, ScenarioPackage } from "./scenarioRegistry.js";

const attributes: Attributes = {
  physique: 2,
  agility: 2,
  knowledge: 2,
  insight: 2,
  charm: 2,
  will: 3
};

const relationship = (overrides: Partial<RelationshipState> = {}): RelationshipState => ({
  trust: 0,
  affinity: 0,
  respect: 0,
  fear: 0,
  interest: 0,
  debt: 0,
  suspicion: 0,
  ...overrides
});

const character = (input: Pick<CharacterState, "id" | "name" | "role" | "factionId" | "publicImage" | "desire" | "fear" | "shortTermGoal" | "longTermGoal" | "secret">): CharacterState => ({
  ...input,
  truePersonality: "Careful, proud, and bound by old sect etiquette.",
  bottomLine: "Will not knowingly open the frost seal for an unready disciple.",
  weakness: "Treats formal vows as stronger evidence than lived character.",
  attributes,
  skills: { insight: 2, defense: 2, melee: 2, social: 1, survival: 2 },
  resources: { qi: 2, talismans: 1 },
  conditions: [],
  knownFacts: ["Public: the frost lantern burns only for disciples who can hold a vow under pressure."],
  memorySummary: "The trial has just begun."
});

export const frostLanternTrialDays: ScenarioDayPlan[] = [
  {
    day: 1,
    mainEvent: "The frost lantern is lit in the outer courtyard.",
    defaultLocationId: "lantern_courtyard",
    sceneIds: ["lantern_oath"],
    clockPressure: ["shadow_debt"]
  },
  {
    day: 2,
    mainEvent: "Mist spirits circle the lower gate before dawn.",
    defaultLocationId: "mist_gate",
    sceneIds: ["mist_gate_duel"],
    clockPressure: ["inner_fire"]
  },
  {
    day: 3,
    mainEvent: "The inner gate judges whether the disciple's vow holds.",
    defaultLocationId: "inner_gate",
    sceneIds: ["inner_gate_choice"],
    clockPressure: ["inner_fire", "shadow_debt"]
  }
];

const frostLanternCampaignArc: ScenarioCampaignArc = {
  chapters: [
    {
      id: "frost-lantern-trial_outer_trial",
      title: "Outer Trial",
      focus: "Survive the three-day vow test and decide whether the inner gate opens cleanly.",
      unlocks: ["lantern_oath", "lantern_courtyard", "mist_gate"]
    },
    {
      id: "frost-lantern-trial_sect_seat",
      title: "Sect Seat",
      focus: "Use the trial result to build a cultivation base, repair the lantern, or hide ash debt.",
      unlocks: ["training_hall", "archive", "infirmary"]
    },
    {
      id: "frost-lantern-trial_ash_front",
      title: "Ash Front",
      focus: "Carry the vow, cabal pressure, and elder politics into a broader sect campaign.",
      unlocks: ["frost_lantern_sect", "gray_ash_cabal"]
    }
  ],
  baseFacilities: ["training_hall", "archive", "infirmary"],
  factionFronts: ["frost_lantern_sect", "gray_ash_cabal"]
};

const locations: Record<string, LocationState> = {
  lantern_courtyard: {
    id: "lantern_courtyard",
    name: "Lantern Courtyard",
    description: "A stone courtyard where a blue-white lantern flame hangs without oil or wick.",
    publicInfo: ["The flame dims when a disciple lies.", "Outer disciples gather here before entering the mist gate."],
    hiddenInfo: ["The lantern is fed by old vows broken under fear."],
    tags: ["sect", "trial"],
    dangerLevel: 1
  },
  mist_gate: {
    id: "mist_gate",
    name: "Mist Gate",
    description: "A narrow gate cut into cold cedar fog, guarded by trial spirits and senior disciples.",
    publicInfo: ["Crossing the mist gate costs stamina.", "Combat is permitted but not required."],
    hiddenInfo: ["The mist repeats the strongest fear carried by the entrant."],
    tags: ["gate", "combat"],
    dangerLevel: 3
  },
  inner_gate: {
    id: "inner_gate",
    name: "Inner Gate",
    description: "A silent hall where the frost lantern's reflection decides who may continue cultivation.",
    publicInfo: ["Only a stable vow opens the inner gate."],
    hiddenInfo: ["The gate can be forced, but the debt follows the disciple."],
    tags: ["sect", "ending"],
    dangerLevel: 2
  }
};

const factions: Record<string, FactionState> = {
  frost_lantern_sect: {
    id: "frost_lantern_sect",
    name: "Frost Lantern Sect",
    publicGoal: "Find disciples who can keep vows under pressure.",
    hiddenGoal: "Bind unstable talents before rival sects notice them.",
    leader: "npc_adele",
    resources: { elders: 2, talismans: 4 },
    baseId: "inner_gate",
    allies: [],
    enemies: ["gray_ash_cabal"],
    internalConflict: "Some elders prefer obedient disciples; others want resilient ones.",
    style: "Ritual discipline and quiet tests.",
    bottomLine: "The sect will not admit a disciple who endangers the lantern.",
    currentPlan: "Run the three-day outer trial.",
    clockIds: ["inner_fire"]
  },
  gray_ash_cabal: {
    id: "gray_ash_cabal",
    name: "Gray Ash Cabal",
    publicGoal: "Offer shortcuts to failed disciples.",
    hiddenGoal: "Turn the frost lantern's debt into a recruitment chain.",
    leader: "npc_manlo",
    resources: { spies: 2, ash_charms: 3 },
    baseId: "mist_gate",
    allies: [],
    enemies: ["frost_lantern_sect"],
    internalConflict: "The cabal argues over whether to corrupt or simply harvest the trial.",
    style: "Quiet bargains at the edge of failure.",
    bottomLine: "Never let a promising disciple leave without a debt.",
    currentPlan: "Whisper shortcuts during the mist gate duel.",
    clockIds: ["shadow_debt"]
  }
};

const characters: Record<string, CharacterState> = {
  npc_zhou_jin: character({
    id: "npc_zhou_jin",
    name: "Senior Zhou",
    role: "Outer sect guide",
    factionId: "frost_lantern_sect",
    publicImage: "A patient guide who explains trial etiquette.",
    desire: "Keep new disciples alive long enough to learn.",
    fear: "Watching another trial become a public execution.",
    shortTermGoal: "Steer the player toward a stable vow.",
    longTermGoal: "Reform the outer trial into a fairer test.",
    secret: "Senior Zhou once failed the mist gate and was admitted only by mercy."
  }),
  npc_adele: character({
    id: "npc_adele",
    name: "Elder Adele",
    role: "Lantern hall elder",
    factionId: "frost_lantern_sect",
    publicImage: "A precise elder who treats ritual law as mercy.",
    desire: "Protect the lantern from unstable ambition.",
    fear: "A forced gate opening that stains the sect for a generation.",
    shortTermGoal: "Measure whether the player can endure a vow.",
    longTermGoal: "Choose one disciple who can inherit the lantern method.",
    secret: "She is hiding how weak the lantern has become."
  }),
  npc_manlo: character({
    id: "npc_manlo",
    name: "Ash Steward Manlo",
    role: "Cabal broker",
    factionId: "gray_ash_cabal",
    publicImage: "A smiling steward who offers practical help.",
    desire: "Put a debt charm on the most promising disciple.",
    fear: "The player succeeding cleanly and exposing the cabal.",
    shortTermGoal: "Offer a shortcut before the mist gate closes.",
    longTermGoal: "Turn the outer trial into a cabal recruitment funnel.",
    secret: "He planted ash charms beneath the courtyard stones."
  })
};

const quests: Record<string, QuestState> = {
  lantern_oath: {
    id: "lantern_oath",
    name: "Hold the Frost Oath",
    trigger: "The player enters the outer trial.",
    patron: "npc_zhou_jin",
    realBackground: "The oath filters disciples who chase power without discipline.",
    surfaceGoal: "Reach the inner gate.",
    hiddenGoal: "Learn whether the lantern is failing.",
    locationIds: ["lantern_courtyard", "mist_gate", "inner_gate"],
    npcIds: ["npc_zhou_jin", "npc_adele", "npc_manlo"],
    factionIds: ["frost_lantern_sect", "gray_ash_cabal"],
    solutionTypes: ["travel", "fight", "negotiate"],
    failureConsequence: "The player keeps power but carries ash debt.",
    longTermImpact: "This trial defines how future cultivation scenarios judge vows.",
    status: "active"
  }
};

export const createFrostLanternTrialWorld = (): WorldState => ({
  time: { day: 1, phase: "morning" },
  currentLocationId: "lantern_courtyard",
  player: {
    id: "player",
    name: "Outer Disciple",
    attributes: { ...attributes, will: 3 },
    skills: { survival: 2, melee: 1, defense: 1, social: 1, investigation: 1, insight: 1 },
    resources: { health: 5, stamina: 3, pressure: 0, money: 0, intel: 0 },
    conditions: [],
    reputationTags: ["unproven_disciple"],
    momentum: 0
  },
  locations,
  characters,
  factions,
  relationships: {
    "player:npc_zhou_jin": relationship({ trust: 1 }),
    "player:npc_adele": relationship({ respect: 1 }),
    "player:npc_manlo": relationship({ suspicion: 1 })
  },
  quests,
  clocks: {
    inner_fire: {
      id: "inner_fire",
      name: "Inner Fire Stability",
      progress: 0,
      max: 4,
      consequence: "A stable inner fire opens the gate without debt.",
      visible: true
    },
    shadow_debt: {
      id: "shadow_debt",
      name: "Shadow Debt",
      progress: 0,
      max: 4,
      consequence: "Debt charms bind the disciple to the gray ash cabal.",
      visible: true
    },
    martial_lockdown: {
      id: "martial_lockdown",
      name: "Trial Discipline",
      progress: 0,
      max: 5,
      consequence: "Too much open violence ends the trial.",
      visible: false
    }
  },
  publicEvents: [
    {
      id: "evt_frost_lantern_start",
      turnId: "setup",
      day: 1,
      phase: "morning",
      title: "The frost lantern is lit",
      body: "Outer disciples gather as the lantern flame turns blue-white.",
      tags: ["trial", "sect"],
      createdAt: "2026-06-02T00:00:00.000Z"
    }
  ],
  hiddenEvents: []
});

export const getFrostLanternTrialDayPlan = (day: number): ScenarioDayPlan | undefined => frostLanternTrialDays.find((plan) => plan.day === day);

export const getFrostLanternTrialActions = (state: WorldState): PlayerAction[] => [
  {
    id: `frost_travel_${state.time.day}_${state.time.phase}`,
    actionType: "travel",
    label: "Cross the mist gate",
    description: "Spend stamina to move deeper into the trial without forcing a duel.",
    targetId: "mist_gate",
    leverage: ["scenario:frost-lantern-trial", "clock:inner_fire", "pressureClock:shadow_debt", "sect_trial"],
    riskLevel: "medium"
  },
  {
    id: `frost_duel_${state.time.day}_${state.time.phase}`,
    actionType: "fight",
    label: "Face the trial spirit",
    description: "Use force and discipline to prove your inner fire can hold.",
    targetId: "mist_gate",
    leverage: ["scenario:frost-lantern-trial", "clock:inner_fire", "pressureClock:shadow_debt", "inner_fire"],
    riskLevel: "high"
  }
];

export const evaluateFrostLanternTrialEnding = (state: WorldState) => {
  if (!(state.time.day >= 3 && state.time.phase === "night")) return undefined;
  if (state.player.momentum >= 3 || (state.clocks.inner_fire?.progress ?? 0) >= 3) {
    return {
      id: "inner_gate_opened",
      title: "Inner Gate Opened",
      summary: "The disciple enters cleanly, carrying a stable vow instead of a hidden debt."
    };
  }
  return {
    id: "ash_debt_bound",
    title: "Ash Debt Bound",
    summary: "The disciple survives the trial, but a gray ash debt follows every future breakthrough."
  };
};

export const frostLanternTrialPackage: ScenarioPackage = {
  id: "frost-lantern-trial",
  title: "Frost Lantern Trial",
  counts: { combat: 1, social: 1, endings: 2 },
  campaignArc: frostLanternCampaignArc,
  createWorld: createFrostLanternTrialWorld,
  getActions: getFrostLanternTrialActions,
  getDayPlan: getFrostLanternTrialDayPlan,
  evaluateEnding: evaluateFrostLanternTrialEnding
};
