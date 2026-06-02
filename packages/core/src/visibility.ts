import type { WorldState } from "@agentic-turnscape/shared";

export const toPlayerVisibleState = (state: WorldState): WorldState => ({
  ...state,
  hiddenEvents: state.hiddenEvents.filter((event) => event.revealed),
  locations: Object.fromEntries(
    Object.entries(state.locations).map(([id, location]) => [
      id,
      {
        ...location,
        hiddenInfo: []
      }
    ])
  ),
  characters: Object.fromEntries(
    Object.entries(state.characters).map(([id, character]) => [
      id,
      {
        ...character,
        secret: "",
        knownFacts: character.knownFacts.filter((fact) => fact.includes("公开") || fact.includes("玩家") || fact.includes("诊所"))
      }
    ])
  ),
  factions: Object.fromEntries(
    Object.entries(state.factions).map(([id, faction]) => [
      id,
      {
        ...faction,
        hiddenGoal: "未知"
      }
    ])
  )
});
