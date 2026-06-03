import type { PlayerAction, StatePatch, WorldState } from "@agentic-turnscape/shared";

export type FactionPlanInput = {
  actionType: PlayerAction["actionType"];
  targetId?: string;
  success: boolean;
};

const hasFaction = (state: WorldState, factionId: string): boolean => Boolean(state.factions[factionId]);
const hasResource = (state: WorldState, factionId: string, resource: string): boolean =>
  typeof state.factions[factionId]?.resources[resource] === "number";

const setPlan = (factionId: string, value: string, reason: string): StatePatch["changes"][number] => ({
  op: "set",
  path: `factions.${factionId}.currentPlan`,
  value,
  reason
});

const incResource = (factionId: string, resource: string, delta: number, reason: string): StatePatch["changes"][number] => ({
  op: "inc",
  path: `factions.${factionId}.resources.${resource}`,
  delta,
  reason
});

export const resolveFactionPlans = (state: WorldState, input: FactionPlanInput): StatePatch => {
  const changes: StatePatch["changes"] = [];

  if (input.actionType === "negotiate" && input.targetId === "npc_rowan") {
    if (input.success) {
      if (hasFaction(state, "frontier_guild")) {
        changes.push(setPlan("frontier_guild", "与诊所建立联合隔离线，先用医学证据稳定街区。", "成功谈判使边境公会计划转向协作隔离"));
        if (hasResource(state, "frontier_guild", "legitimacy")) {
          changes.push(incResource("frontier_guild", "legitimacy", 1, "公开克制提升边境公会合法性"));
        }
      }
      if (hasFaction(state, "blackstone_consortium")) {
        changes.push(setPlan("blackstone_consortium", "诊所舆论受阻，改为压低矿区账本风险。", "诊所谈判受控阻断商会舆论计划"));
        if (hasResource(state, "blackstone_consortium", "contracts")) {
          changes.push(incResource("blackstone_consortium", "contracts", -1, "舆论受阻拖慢矿区合同推进"));
        }
      }
    } else if (hasFaction(state, "frontier_guild")) {
      changes.push(setPlan("frontier_guild", "转向强硬封锁，扩大街区封锁并把诊所纳入城防接管。", "谈判失败推动边境公会转向强硬封锁"));
    }
  }

  if (input.actionType === "investigate" && input.targetId === "npc_kyle" && input.success && hasFaction(state, "frontier_guild")) {
    changes.push(setPlan("frontier_guild", "旧哨站证据公开后，暂停街区接管并转向内部审查。", "旧哨站调查阻断边境公会强硬接管计划"));
    if (hasResource(state, "frontier_guild", "legitimacy")) {
      changes.push(incResource("frontier_guild", "legitimacy", -1, "旧哨站证据削弱边境公会合法性"));
    }
  }

  if (input.actionType === "ignore" || input.actionType === "rest") {
    if (hasFaction(state, "blackstone_consortium")) {
      changes.push(setPlan("blackstone_consortium", "加速矿区合同，并把诊所混乱包装成治理失败。", "玩家放任局势给商会推进空间"));
      if (hasResource(state, "blackstone_consortium", "contracts")) {
        changes.push(incResource("blackstone_consortium", "contracts", 1, "空档让商会合同推进"));
      }
    }
    if (hasFaction(state, "rift_cult")) {
      changes.push(setPlan("rift_cult", "收拢被拒病人，用庇护换取第七夜名单。", "玩家不介入使教团扩大收容影响"));
      if (hasResource(state, "rift_cult", "believers")) {
        changes.push(incResource("rift_cult", "believers", 1, "庇护叙事吸引更多信徒"));
      }
    }
  }

  if (input.actionType === "trade" && input.targetId === "npc_crow_nine" && input.success && hasFaction(state, "blackstone_consortium")) {
    changes.push(setPlan("blackstone_consortium", "黑市账线暴露后，商会转向切割中间人与洗白物资流。", "黑市交易成功迫使商会调整矿区资金路线"));
  }

  if (input.actionType === "protect" && input.targetId === "npc_mina" && input.success && hasFaction(state, "rift_cult")) {
    changes.push(setPlan("rift_cult", "争取米娜与温和派，把保护者塑造成裂隙启示的见证人。", "玩家保护病人迫使教团调整招募策略"));
    if (hasResource(state, "rift_cult", "shelter")) {
      changes.push(incResource("rift_cult", "shelter", 1, "教团扩大病人庇护容量"));
    }
  }

  if (input.actionType === "fight" && input.targetId === "npc_eve" && input.success && hasFaction(state, "rift_cult")) {
    changes.push(setPlan("rift_cult", "仪式入口被迫转移，狂信派暂时放弃公开收容点。", "玩家击退伊芙阻断教团公开仪式路线"));
    if (hasResource(state, "rift_cult", "relics")) {
      changes.push(incResource("rift_cult", "relics", -1, "仪式物被迫转移造成损耗"));
    }
  }

  return {
    type: "state_patch",
    source: "referee",
    changes
  };
};
