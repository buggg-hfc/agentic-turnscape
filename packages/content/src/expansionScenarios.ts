import type {
  Attributes,
  CharacterState,
  ClockState,
  FactionState,
  LocationState,
  PlayerAction,
  QuestState,
  RelationshipState,
  WorldState
} from "@agentic-turnscape/shared";
import type { ScenarioCampaignArc, ScenarioDayPlan, ScenarioPackage } from "./scenarioRegistry.js";

const attributes: Attributes = {
  physique: 2,
  agility: 2,
  knowledge: 3,
  insight: 3,
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

type ExpansionScenarioDefinition = {
  id: string;
  title: string;
  themeTag: string;
  playerName: string;
  startLocation: LocationState;
  secondLocation: LocationState;
  finalLocation: LocationState;
  allyFaction: Omit<FactionState, "baseId" | "clockIds">;
  pressureFaction: Omit<FactionState, "baseId" | "clockIds">;
  guide: Pick<CharacterState, "name" | "role" | "publicImage" | "desire" | "fear" | "shortTermGoal" | "longTermGoal" | "secret">;
  authority: Pick<CharacterState, "name" | "role" | "publicImage" | "desire" | "fear" | "shortTermGoal" | "longTermGoal" | "secret">;
  broker: Pick<CharacterState, "name" | "role" | "publicImage" | "desire" | "fear" | "shortTermGoal" | "longTermGoal" | "secret">;
  quest: Pick<QuestState, "id" | "name" | "trigger" | "realBackground" | "surfaceGoal" | "hiddenGoal" | "failureConsequence" | "longTermImpact">;
  stabilityClock: Omit<ClockState, "id" | "visible">;
  pressureClock: Omit<ClockState, "id" | "visible">;
  firstAction: Pick<PlayerAction, "actionType" | "label" | "description" | "targetId" | "leverage" | "riskLevel">;
  secondAction: Pick<PlayerAction, "actionType" | "label" | "description" | "targetId" | "leverage" | "riskLevel">;
  successEnding: {
    id: string;
    title: string;
    summary: string;
  };
  failureEnding: {
    id: string;
    title: string;
    summary: string;
  };
};

const clone = <T>(value: T): T => structuredClone(value);

const campaignArcFacilities: Record<string, string[]> = {
  science_fiction: ["medbay", "engineering_bay", "evidence_archive"],
  historical: ["ledger_room", "harbor_office", "training_yard"],
  urban_supernatural: ["tenant_office", "ritual_room", "case_archive"],
  realistic_profession: ["triage_station", "maintenance_bay", "review_room"]
};

const createCampaignArc = (
  definition: ExpansionScenarioDefinition,
  allyFactionId: string,
  pressureFactionId: string
): ScenarioCampaignArc => {
  const baseFacilities = campaignArcFacilities[definition.themeTag] ?? ["field_office", "archive", "workshop"];
  return {
    chapters: [
      {
        id: `${definition.id}_opening_arc`,
        title: `${definition.title}: Opening Crisis`,
        focus: definition.quest.surfaceGoal,
        unlocks: [definition.quest.id, definition.startLocation.id]
      },
      {
        id: `${definition.id}_base_arc`,
        title: `${definition.title}: Campaign Base`,
        focus: definition.quest.longTermImpact,
        unlocks: baseFacilities
      },
      {
        id: `${definition.id}_front_arc`,
        title: `${definition.title}: Faction Front`,
        focus: definition.quest.failureConsequence,
        unlocks: [allyFactionId, pressureFactionId]
      }
    ],
    baseFacilities,
    factionFronts: [allyFactionId, pressureFactionId]
  };
};

const character = (
  id: "npc_zhou_jin" | "npc_adele" | "npc_manlo",
  factionId: string,
  input: ExpansionScenarioDefinition["guide"]
): CharacterState => ({
  id,
  factionId,
  name: input.name,
  role: input.role,
  publicImage: input.publicImage,
  truePersonality: "Competent, pressured, and willing to change course when the player proves a better path.",
  desire: input.desire,
  fear: input.fear,
  shortTermGoal: input.shortTermGoal,
  longTermGoal: input.longTermGoal,
  secret: input.secret,
  bottomLine: "Will not accept a solution that erases civilians from the cost ledger.",
  weakness: "Moves too slowly when every option carries visible harm.",
  attributes,
  skills: { investigation: 3, social: 3, survival: 2, defense: 2, command: 2, medical: 1, engineering: 1 },
  resources: { authority: 2, intel: 2, supplies: 2 },
  conditions: [],
  knownFacts: ["The opening crisis is public, but the source pressure remains disputed."],
  memorySummary: "The scenario has just begun and no private deal with the player exists yet."
});

const createExpansionScenarioPackage = (definition: ExpansionScenarioDefinition): ScenarioPackage => {
  const allyFactionId = `${definition.id}_allies`;
  const pressureFactionId = `${definition.id}_pressure`;
  const locationIds = [definition.startLocation.id, definition.secondLocation.id, definition.finalLocation.id];
  const days: ScenarioDayPlan[] = [
    {
      day: 1,
      mainEvent: `${definition.title}: first contact with the visible crisis.`,
      defaultLocationId: definition.startLocation.id,
      sceneIds: [`${definition.id}_opening_social`],
      clockPressure: [`${definition.id}_pressure`]
    },
    {
      day: 2,
      mainEvent: `${definition.title}: the pressure faction forces a public choice.`,
      defaultLocationId: definition.secondLocation.id,
      sceneIds: [`${definition.id}_pressure_combat`],
      clockPressure: [`${definition.id}_stability`, `${definition.id}_pressure`]
    },
    {
      day: 3,
      mainEvent: `${definition.title}: the player locks in a future branch.`,
      defaultLocationId: definition.finalLocation.id,
      sceneIds: [`${definition.id}_final_choice`],
      clockPressure: [`${definition.id}_stability`]
    }
  ];

  const createWorld = (): WorldState => {
    const locations: Record<string, LocationState> = {
      [definition.startLocation.id]: clone(definition.startLocation),
      [definition.secondLocation.id]: clone(definition.secondLocation),
      [definition.finalLocation.id]: clone(definition.finalLocation)
    };
    const factions: Record<string, FactionState> = {
      [allyFactionId]: {
        ...clone(definition.allyFaction),
        id: allyFactionId,
        baseId: definition.startLocation.id,
        clockIds: [`${definition.id}_stability`]
      },
      [pressureFactionId]: {
        ...clone(definition.pressureFaction),
        id: pressureFactionId,
        baseId: definition.secondLocation.id,
        clockIds: [`${definition.id}_pressure`]
      }
    };
    const characters: Record<string, CharacterState> = {
      npc_zhou_jin: character("npc_zhou_jin", allyFactionId, definition.guide),
      npc_adele: character("npc_adele", allyFactionId, definition.authority),
      npc_manlo: character("npc_manlo", pressureFactionId, definition.broker)
    };
    const quests: Record<string, QuestState> = {
      [definition.quest.id]: {
        ...definition.quest,
        patron: "npc_zhou_jin",
        locationIds,
        npcIds: ["npc_zhou_jin", "npc_adele", "npc_manlo"],
        factionIds: [allyFactionId, pressureFactionId],
        solutionTypes: ["investigation", "negotiation", "combat", "protection"],
        status: "active"
      }
    };

    return {
      time: { day: 1, phase: "morning" },
      currentLocationId: definition.startLocation.id,
      player: {
        id: "player",
        name: definition.playerName,
        attributes,
        skills: { investigation: 2, social: 2, defense: 1, medical: 1, engineering: 1, command: 1, survival: 2 },
        resources: { health: 5, stamina: 4, pressure: 1, money: 2, intel: 1, supplies: 3 },
        conditions: [],
        reputationTags: [definition.themeTag],
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
        [`${definition.id}_stability`]: {
          id: `${definition.id}_stability`,
          ...clone(definition.stabilityClock),
          visible: true
        },
        [`${definition.id}_pressure`]: {
          id: `${definition.id}_pressure`,
          ...clone(definition.pressureClock),
          visible: true
        }
      },
      publicEvents: [
        {
          id: `evt_${definition.id}_start`,
          turnId: "setup",
          day: 1,
          phase: "morning",
          title: `${definition.title} begins`,
          body: definition.quest.trigger,
          tags: [definition.themeTag, "expansion"],
          createdAt: "2026-06-02T00:00:00.000Z"
        }
      ],
      hiddenEvents: []
    };
  };

  return {
    id: definition.id,
    title: definition.title,
    counts: { combat: 1, social: 1, endings: 2 },
    campaignArc: createCampaignArc(definition, allyFactionId, pressureFactionId),
    createWorld,
    getActions: (state) => [
      {
        id: `${definition.id}_primary_${state.time.day}_${state.time.phase}`,
        ...definition.firstAction,
        leverage: [
          `scenario:${definition.id}`,
          `clock:${definition.id}_stability`,
          `pressureClock:${definition.id}_pressure`,
          ...definition.firstAction.leverage
        ]
      },
      {
        id: `${definition.id}_secondary_${state.time.day}_${state.time.phase}`,
        ...definition.secondAction,
        leverage: [
          `scenario:${definition.id}`,
          `clock:${definition.id}_stability`,
          `pressureClock:${definition.id}_pressure`,
          ...definition.secondAction.leverage
        ]
      }
    ],
    getDayPlan: (day) => days.find((plan) => plan.day === day),
    evaluateEnding: (state) => {
      if (!(state.time.day >= 3 && state.time.phase === "night")) return undefined;
      const stability = state.clocks[`${definition.id}_stability`]?.progress ?? 0;
      if (state.player.momentum >= 3 || stability >= 3) return clone(definition.successEnding);
      return clone(definition.failureEnding);
    }
  };
};

export const orbitalQuarantinePackage = createExpansionScenarioPackage({
  id: "orbital-quarantine",
  title: "Orbital Quarantine",
  themeTag: "science_fiction",
  playerName: "Station Envoy",
  startLocation: {
    id: "orbital_medbay",
    name: "Orbital Medbay",
    description: "A rotating station clinic where sealed wards flicker under quarantine lighting.",
    publicInfo: ["The infection travels through maintenance coolant.", "Crew families are trapped behind bulkheads."],
    hiddenInfo: ["The pathogen is a terraforming microbe sold as industrial cleanser."],
    tags: ["science_fiction", "medical"],
    dangerLevel: 2
  },
  secondLocation: {
    id: "docking_ring",
    name: "Docking Ring",
    description: "Cargo locks, security drones, and evacuation shuttles all compete for power.",
    publicInfo: ["Docking authority can cut the station loose.", "Smugglers know the auxiliary vents."],
    hiddenInfo: ["One shuttle manifest was altered after the first fever case."],
    tags: ["science_fiction", "combat"],
    dangerLevel: 4
  },
  finalLocation: {
    id: "reactor_spine",
    name: "Reactor Spine",
    description: "The station's power spine hums beside the quarantine firewall.",
    publicInfo: ["A controlled purge could save the station.", "A rushed purge would vent occupied decks."],
    hiddenInfo: ["The reactor AI has already chosen a sacrifice path."],
    tags: ["science_fiction", "ending"],
    dangerLevel: 5
  },
  allyFaction: {
    id: "",
    name: "Civic Quarantine Board",
    publicGoal: "Keep the station alive without mass venting.",
    hiddenGoal: "Hide how late the first containment order came.",
    leader: "npc_adele",
    resources: { medics: 3, codes: 2 },
    allies: [],
    enemies: [],
    internalConflict: "Doctors want triage; administrators want a clean report.",
    style: "Protocols, public briefings, and emergency medicine.",
    bottomLine: "No deliberate civilian venting.",
    currentPlan: "Stabilize the medbay and trace the coolant path."
  },
  pressureFaction: {
    id: "",
    name: "Helix Salvage Authority",
    publicGoal: "Secure valuable station assets before orbit decays.",
    hiddenGoal: "Recover the terraforming microbe sample.",
    leader: "npc_manlo",
    resources: { drones: 4, contracts: 4 },
    allies: [],
    enemies: [],
    internalConflict: "Some crews want rescue pay; others want the sample.",
    style: "Legal claims, drones, and pressure through oxygen rationing.",
    bottomLine: "Never admit the sample caused the outbreak.",
    currentPlan: "Lock the docking ring and seize the altered manifest."
  },
  guide: {
    name: "Pilot Zhou",
    role: "Evacuation pilot",
    publicImage: "A calm pilot who knows every maintenance shortcut.",
    desire: "Get trapped families to the right shuttles.",
    fear: "A panic launch that tears the docking ring apart.",
    shortTermGoal: "Open one safe route through the medbay cordon.",
    longTermGoal: "Expose the altered manifest.",
    secret: "He moved one family before the quarantine order."
  },
  authority: {
    name: "Dr. Arden Vale",
    role: "Quarantine physician",
    publicImage: "An exhausted doctor who refuses a purely mathematical purge.",
    desire: "Trace the pathogen without sacrificing sealed wards.",
    fear: "The board choosing optics over treatment.",
    shortTermGoal: "Keep the medbay powered.",
    longTermGoal: "Build a treatment protocol for future stations.",
    secret: "She knows the coolant cleanser was never certified."
  },
  broker: {
    name: "Broker Manlo",
    role: "Salvage negotiator",
    publicImage: "A polished contractor offering rescue in exchange for access.",
    desire: "Recover the sample and own the station's debt.",
    fear: "The sample being tied to Helix contracts.",
    shortTermGoal: "Control the docking ring.",
    longTermGoal: "Turn quarantine rescue into permanent leverage.",
    secret: "He has a hidden buyer for the microbe."
  },
  quest: {
    id: "station_quarantine",
    name: "Hold the Quarantine Line",
    trigger: "A station-wide fever locks families, salvage crews, and doctors into the same failing orbit.",
    realBackground: "Industrial terraforming microbes escaped through maintenance coolant.",
    surfaceGoal: "Keep the station from panic venting.",
    hiddenGoal: "Prove who smuggled the sample aboard.",
    failureConsequence: "The station survives under salvage occupation.",
    longTermImpact: "Future science-fiction arcs inherit the sample trail."
  },
  stabilityClock: {
    name: "Station Stability",
    progress: 0,
    max: 4,
    consequence: "The station stabilizes before salvage law takes over."
  },
  pressureClock: {
    name: "Salvage Lockdown",
    progress: 0,
    max: 4,
    consequence: "Helix controls evacuation and the sample trail."
  },
  firstAction: {
    actionType: "investigate",
    label: "Trace the coolant fever",
    description: "Follow medbay samples into the maintenance coolant loop.",
    targetId: "npc_adele",
    leverage: ["coolant_sample", "crew_manifest"],
    riskLevel: "medium"
  },
  secondAction: {
    actionType: "protect",
    label: "Hold the shuttle corridor",
    description: "Keep families moving without letting salvage drones seize the ring.",
    targetId: "npc_zhou_jin",
    leverage: ["evacuation_route", "bulkhead_codes"],
    riskLevel: "high"
  },
  successEnding: {
    id: "station_stabilized",
    title: "Station Stabilized",
    summary: "The station survives quarantine with the sample trail preserved for a larger campaign."
  },
  failureEnding: {
    id: "salvage_lockdown",
    title: "Salvage Lockdown",
    summary: "The station remains alive, but Helix writes the official record."
  }
});

export const saltHarborAccordPackage = createExpansionScenarioPackage({
  id: "salt-harbor-accord",
  title: "Salt Harbor Accord",
  themeTag: "historical",
  playerName: "Harbor Mediator",
  startLocation: {
    id: "harbor_customs",
    name: "Harbor Customs House",
    description: "Ledgers, salt permits, and anxious guild envoys fill the customs hall.",
    publicInfo: ["A missing salt tax ledger threatens the truce.", "Dock workers have stopped unloading grain."],
    hiddenInfo: ["The ledger implicates both the governor and the merchant league."],
    tags: ["historical", "social"],
    dangerLevel: 2
  },
  secondLocation: {
    id: "tide_fort",
    name: "Tide Fort",
    description: "Old cannons overlook ships that cannot leave until the accord is signed.",
    publicInfo: ["Militia captains demand back pay.", "The fort controls the harbor chain."],
    hiddenInfo: ["A forged order could start a night bombardment."],
    tags: ["historical", "combat"],
    dangerLevel: 4
  },
  finalLocation: {
    id: "salt_court",
    name: "Salt Court",
    description: "A public court where trade charters are read aloud before the harbor crowd.",
    publicInfo: ["Only a public accord can reopen trade.", "Every faction brought witnesses."],
    hiddenInfo: ["One witness is prepared to lie for a pardon."],
    tags: ["historical", "ending"],
    dangerLevel: 3
  },
  allyFaction: {
    id: "",
    name: "Harbor Guild Council",
    publicGoal: "Reopen grain and salt trade under lawful terms.",
    hiddenGoal: "Limit the governor without inviting rebellion.",
    leader: "npc_adele",
    resources: { ledgers: 3, ships: 2 },
    allies: [],
    enemies: [],
    internalConflict: "Ship owners want profit; dock workers want arrears.",
    style: "Petitions, witnesses, and public shame.",
    bottomLine: "The harbor chain must not fall to soldiers.",
    currentPlan: "Recover the salt ledger and force a narrow accord."
  },
  pressureFaction: {
    id: "",
    name: "Governor's Tide Guard",
    publicGoal: "Restore order before the harbor starves.",
    hiddenGoal: "Destroy the ledger and keep emergency powers.",
    leader: "npc_manlo",
    resources: { soldiers: 4, cannons: 2 },
    allies: [],
    enemies: [],
    internalConflict: "Junior officers fear becoming scapegoats.",
    style: "Curfews, warrants, and controlled testimony.",
    bottomLine: "No public proof of forged salt taxes.",
    currentPlan: "Hold Tide Fort and pressure the court."
  },
  guide: {
    name: "Zhou of the Quay",
    role: "Dock witness",
    publicImage: "A weathered dock guide who knows who unloaded each crate.",
    desire: "Get the harbor working before families run out of grain.",
    fear: "A riot that lets soldiers fire on workers.",
    shortTermGoal: "Find the missing ledger clerk.",
    longTermGoal: "Win a charter that protects dock pay.",
    secret: "He hid the ledger clerk in a sail loft."
  },
  authority: {
    name: "Magistrate Adele",
    role: "Charter magistrate",
    publicImage: "A formal judge trying to keep law alive in public.",
    desire: "Sign an accord that can survive scrutiny.",
    fear: "Being forced to validate forged taxes.",
    shortTermGoal: "Secure credible witnesses.",
    longTermGoal: "End emergency rule without civil war.",
    secret: "She already suspects the governor but lacks admissible proof."
  },
  broker: {
    name: "Factor Manlo",
    role: "Governor's factor",
    publicImage: "A courteous official who treats delay as treason.",
    desire: "Keep emergency powers intact.",
    fear: "A public reading of the true ledger.",
    shortTermGoal: "Move testimony behind closed doors.",
    longTermGoal: "Control the harbor chain through debt.",
    secret: "He ordered the forged salt permits."
  },
  quest: {
    id: "salt_ledger",
    name: "Recover the Salt Ledger",
    trigger: "A missing tax ledger threatens to turn a harbor labor dispute into open rebellion.",
    realBackground: "Emergency salt taxes were forged to fund private guard debts.",
    surfaceGoal: "Reopen the harbor.",
    hiddenGoal: "Force an accord that names the forgery without starting war.",
    failureConsequence: "The harbor reopens under military tax control.",
    longTermImpact: "Historical campaigns inherit a lawful or militarized harbor."
  },
  stabilityClock: {
    name: "Public Accord",
    progress: 0,
    max: 4,
    consequence: "The charter holds and trade resumes."
  },
  pressureClock: {
    name: "Tide Guard Crackdown",
    progress: 0,
    max: 4,
    consequence: "Soldiers control grain, salt, and testimony."
  },
  firstAction: {
    actionType: "investigate",
    label: "Recover the salt ledger",
    description: "Trace dock permits and witness routes before the court convenes.",
    targetId: "npc_zhou_jin",
    leverage: ["dock_witness", "grain_manifest"],
    riskLevel: "medium"
  },
  secondAction: {
    actionType: "negotiate",
    label: "Draft a public accord",
    description: "Use witnesses and law to reopen the harbor without handing it to soldiers.",
    targetId: "npc_adele",
    leverage: ["salt_ledger", "public_court"],
    riskLevel: "high"
  },
  successEnding: {
    id: "harbor_accord",
    title: "Harbor Accord",
    summary: "The harbor reopens under a public charter that future historical arcs can contest."
  },
  failureEnding: {
    id: "guard_charter",
    title: "Guard Charter",
    summary: "Trade resumes, but soldiers now write the harbor's lawful memory."
  }
});

export const rainAlleyHauntingPackage = createExpansionScenarioPackage({
  id: "rain-alley-haunting",
  title: "Rain Alley Haunting",
  themeTag: "urban_supernatural",
  playerName: "Night Caseworker",
  startLocation: {
    id: "rain_alley",
    name: "Rain Alley",
    description: "Neon water runs uphill beneath apartments where tenants hear the same child counting.",
    publicInfo: ["Three apartments report the same haunting.", "The landlord wants quiet before inspectors arrive."],
    hiddenInfo: ["The counting spirit repeats an eviction list."],
    tags: ["urban_supernatural", "social"],
    dangerLevel: 2
  },
  secondLocation: {
    id: "subway_shrine",
    name: "Subway Shrine",
    description: "A tile alcove below the last train platform holds candles nobody admits lighting.",
    publicInfo: ["Commuters avoid the last car.", "Old offerings appear after midnight."],
    hiddenInfo: ["The shrine anchors a debt between tenants and a forgotten guardian."],
    tags: ["urban_supernatural", "combat"],
    dangerLevel: 4
  },
  finalLocation: {
    id: "roof_water_tank",
    name: "Roof Water Tank",
    description: "The building's roof tank reflects a hallway that does not exist.",
    publicInfo: ["The haunting peaks when rain hits the tank.", "Everyone in the building can hear the final count."],
    hiddenInfo: ["Breaking the tank frees the spirit but floods the evidence archive."],
    tags: ["urban_supernatural", "ending"],
    dangerLevel: 4
  },
  allyFaction: {
    id: "",
    name: "Tenant Night Watch",
    publicGoal: "Stop the haunting without losing homes.",
    hiddenGoal: "Expose the illegal eviction list.",
    leader: "npc_adele",
    resources: { witnesses: 4, keys: 2 },
    allies: [],
    enemies: [],
    internalConflict: "Some tenants want a ritual; others want a lawyer.",
    style: "Door knocks, shared food, and whispered testimony.",
    bottomLine: "No solution that makes tenants disappear.",
    currentPlan: "Gather testimony before midnight rain."
  },
  pressureFaction: {
    id: "",
    name: "Glass Tower Holdings",
    publicGoal: "Clear the building for renovation.",
    hiddenGoal: "Use the haunting to force tenants out.",
    leader: "npc_manlo",
    resources: { lawyers: 3, guards: 2 },
    allies: [],
    enemies: [],
    internalConflict: "The field team is scared of what they awakened.",
    style: "Notices, security cameras, and paid debunkers.",
    bottomLine: "Never let the eviction list become public.",
    currentPlan: "Declare the building unsafe after the haunting peaks."
  },
  guide: {
    name: "Zhou from 4B",
    role: "Tenant organizer",
    publicImage: "A tired organizer who keeps spare keys and instant noodles.",
    desire: "Keep the building's families together.",
    fear: "A ritual that saves the walls but loses the people.",
    shortTermGoal: "Document every apartment's version of the counting.",
    longTermGoal: "Turn the haunting into proof of illegal evictions.",
    secret: "He stole a partial eviction list from the landlord office."
  },
  authority: {
    name: "Adele Park",
    role: "Municipal caseworker",
    publicImage: "A city worker who believes paperwork can still protect people.",
    desire: "Find a lawful reason to halt the clearance.",
    fear: "The case becoming a spectacle before tenants are safe.",
    shortTermGoal: "Verify the tenant statements.",
    longTermGoal: "Build a repeatable supernatural housing protocol.",
    secret: "She saw the hallway reflection before the first complaint."
  },
  broker: {
    name: "Manlo Glass",
    role: "Property fixer",
    publicImage: "A polished fixer with permits, cameras, and rehearsed sympathy.",
    desire: "Empty the building without paying relocation costs.",
    fear: "The spirit naming the eviction list on camera.",
    shortTermGoal: "Frame the haunting as tenant fraud.",
    longTermGoal: "Convert the block into luxury towers.",
    secret: "He ordered workers to remove the old shrine."
  },
  quest: {
    id: "counting_spirit",
    name: "Name the Counting Spirit",
    trigger: "A rainy apartment block hears the same invisible child counting evictions.",
    realBackground: "The haunting protects tenants by repeating names from an illegal clearance list.",
    surfaceGoal: "Stop the haunting before the building is condemned.",
    hiddenGoal: "Reveal the eviction list without severing the guardian spirit.",
    failureConsequence: "The haunting ends when tenants scatter.",
    longTermImpact: "Urban campaigns inherit a protected block or a glass-tower dead zone."
  },
  stabilityClock: {
    name: "Neighborhood Trust",
    progress: 0,
    max: 4,
    consequence: "Tenants and spirit agree on a livable boundary."
  },
  pressureClock: {
    name: "Condemnation Notice",
    progress: 0,
    max: 4,
    consequence: "The building is cleared under emergency authority."
  },
  firstAction: {
    actionType: "investigate",
    label: "Map the counting names",
    description: "Compare tenant testimony with the partial eviction list.",
    targetId: "npc_zhou_jin",
    leverage: ["tenant_keys", "rain_recordings"],
    riskLevel: "medium"
  },
  secondAction: {
    actionType: "negotiate",
    label: "Bargain with the guardian",
    description: "Offer a public memory for the spirit without sacrificing tenants.",
    targetId: "npc_adele",
    leverage: ["eviction_list", "subway_offering"],
    riskLevel: "high"
  },
  successEnding: {
    id: "neighborhood_saved",
    title: "Neighborhood Saved",
    summary: "The haunting becomes testimony, and the block remains a playable urban hub."
  },
  failureEnding: {
    id: "condemned_block",
    title: "Condemned Block",
    summary: "The building empties, but the counting follows the displaced tenants."
  }
});

export const emergencyWardNightPackage = createExpansionScenarioPackage({
  id: "emergency-ward-night",
  title: "Emergency Ward Night",
  themeTag: "realistic_profession",
  playerName: "Night Shift Lead",
  startLocation: {
    id: "triage_desk",
    name: "Triage Desk",
    description: "A crowded emergency entrance where every clipboard is already late.",
    publicInfo: ["Ambulances queue outside.", "A power fault is hitting monitors in waves."],
    hiddenInfo: ["The backup generator contractor skipped a maintenance cycle."],
    tags: ["realistic_profession", "medical"],
    dangerLevel: 2
  },
  secondLocation: {
    id: "trauma_bay",
    name: "Trauma Bay",
    description: "Curtains, alarms, and tired staff form a narrow lane through impossible priorities.",
    publicInfo: ["Two critical patients need the same specialist.", "Security is short-staffed."],
    hiddenInfo: ["One patient's chart is linked to a media-sensitive donor case."],
    tags: ["realistic_profession", "combat"],
    dangerLevel: 4
  },
  finalLocation: {
    id: "backup_generator",
    name: "Backup Generator Room",
    description: "A hot service room where the night shift decides whether care keeps moving.",
    publicInfo: ["The generator can be stabilized manually.", "Doing so pulls staff from triage."],
    hiddenInfo: ["The contractor's missing inspection sticker is still on the panel."],
    tags: ["realistic_profession", "ending"],
    dangerLevel: 3
  },
  allyFaction: {
    id: "",
    name: "Night Shift Team",
    publicGoal: "Keep patients alive through the surge.",
    hiddenGoal: "Document the system failures without blaming exhausted staff.",
    leader: "npc_adele",
    resources: { nurses: 4, beds: 2 },
    allies: [],
    enemies: [],
    internalConflict: "Staff disagree over whether to divert ambulances.",
    style: "Triage, checklists, and hard prioritization.",
    bottomLine: "No patient is erased from the queue.",
    currentPlan: "Stabilize triage while finding generator help."
  },
  pressureFaction: {
    id: "",
    name: "Hospital Administration",
    publicGoal: "Avoid a public failure during the night surge.",
    hiddenGoal: "Keep contractor negligence out of the incident report.",
    leader: "npc_manlo",
    resources: { lawyers: 2, budget: 3 },
    allies: [],
    enemies: [],
    internalConflict: "Some administrators want transparency; others want containment.",
    style: "Policies, media scripts, and staffing limits.",
    bottomLine: "No report that names deferred maintenance.",
    currentPlan: "Push the surge narrative and delay the contractor question."
  },
  guide: {
    name: "Charge Nurse Zhou",
    role: "Charge nurse",
    publicImage: "A steady nurse who knows which corners of the ward still work.",
    desire: "Protect staff and patients from impossible silence.",
    fear: "A preventable death becoming a blame game.",
    shortTermGoal: "Keep triage moving.",
    longTermGoal: "Force a staffing and maintenance review.",
    secret: "He photographed the missing generator sticker last week."
  },
  authority: {
    name: "Dr. Adele Noor",
    role: "Emergency physician",
    publicImage: "A focused physician who refuses to skip the hard cases.",
    desire: "Make defensible triage decisions under pressure.",
    fear: "A power failure during an intubation.",
    shortTermGoal: "Stabilize the trauma bay.",
    longTermGoal: "Keep the team intact after the incident review.",
    secret: "She knows the official surge plan is outdated."
  },
  broker: {
    name: "Administrator Manlo",
    role: "Hospital administrator",
    publicImage: "A composed administrator with a phone full of media drafts.",
    desire: "Keep the hospital out of scandal.",
    fear: "The generator maintenance gap becoming public.",
    shortTermGoal: "Control the incident narrative.",
    longTermGoal: "Protect the budget deal that caused the shortage.",
    secret: "He approved the deferred maintenance contract."
  },
  quest: {
    id: "night_surge",
    name: "Hold the Night Surge",
    trigger: "A power fault and ambulance surge hit the emergency ward in the same hour.",
    realBackground: "Deferred generator maintenance turned a hard shift into a system failure.",
    surfaceGoal: "Keep patients moving through triage.",
    hiddenGoal: "Preserve the evidence needed for a truthful incident review.",
    failureConsequence: "The ward survives by burying preventable harm in paperwork.",
    longTermImpact: "Realistic profession campaigns inherit a safer ward or a damaged staff."
  },
  stabilityClock: {
    name: "Care Continuity",
    progress: 0,
    max: 4,
    consequence: "The ward keeps care moving and preserves the incident trail."
  },
  pressureClock: {
    name: "System Overload",
    progress: 0,
    max: 4,
    consequence: "The surge overwhelms triage and the report becomes political."
  },
  firstAction: {
    actionType: "protect",
    label: "Stabilize triage flow",
    description: "Move staff, beds, and oxygen so the waiting room does not collapse.",
    targetId: "npc_adele",
    leverage: ["triage_board", "charge_nurse"],
    riskLevel: "medium"
  },
  secondAction: {
    actionType: "investigate",
    label: "Document the generator fault",
    description: "Secure the maintenance evidence while keeping the trauma bay covered.",
    targetId: "npc_zhou_jin",
    leverage: ["generator_photo", "shift_log"],
    riskLevel: "high"
  },
  successEnding: {
    id: "ward_saved",
    title: "Ward Saved",
    summary: "The night shift keeps care moving and preserves evidence for a safer hospital arc."
  },
  failureEnding: {
    id: "paperwork_burial",
    title: "Paperwork Burial",
    summary: "The ward survives, but staff carry a silence that future shifts must confront."
  }
});

export const firstWaveExpansionPackages: ScenarioPackage[] = [
  orbitalQuarantinePackage,
  saltHarborAccordPackage,
  rainAlleyHauntingPackage,
  emergencyWardNightPackage
];
