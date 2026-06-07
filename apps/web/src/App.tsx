import {
  buildCreatorScenarioDraft,
  defaultCreatorScenarioDraftInput,
  type CharacterState,
  type ClockState,
  type CreatorScenarioDraftInput,
  type LlmConfig,
  type PlayerAction,
  type TransparencyMode,
  type TurnResolution,
  type WorldState,
} from "@agentic-turnscape/shared";
import {
  AlertTriangle,
  Activity,
  BookOpen,
  Brain,
  Clock3,
  Download,
  GitBranch,
  HeartPulse,
  History,
  KeyRound,
  MessageSquare,
  Play,
  RefreshCcw,
  Save,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { buildAgentTransparencyRows } from "./agentTransparency.js";
import {
  buildCampaignArcStatusSummary,
  type CampaignArcStatusSummary,
} from "./campaignArcStatus.js";
import {
  buildCampaignProgressionChoices,
  buildCampaignProgressionSummary,
  type CampaignProgressionChoice,
  type CampaignProgressionSummary,
} from "./campaignProgression.js";
import { formatCampaignProgress } from "./campaignResume.js";
import {
  buildChronicleTimeline,
  type ChronicleTimelineItem,
} from "./chronicle.js";
import {
  buildFactionPlanSummaries,
  type FactionPlanSummary,
} from "./factionPlans.js";
import { displayLabel } from "./displayLabels.js";
import {
  FREEFORM_ACTION_MAX_LENGTH,
  buildFreeformActionPreview,
  buildFreeformComposerState,
  buildFreeformPlayerAction,
} from "./freeformAction.js";
import {
  clearLlmSettings,
  llmConnectionErrorStatus,
  llmConnectionSuccessStatus,
  loadLlmSettings,
  saveLlmSettings,
  type LlmConnectionStatus,
} from "./llmSettings.js";
import { displayPlayerAction } from "./playerActionDisplay.js";
import {
  formatCreatorScenarioDefinition,
  getSavedCreatorScenarioDefinition,
  listSavedCreatorScenarioSummaries,
  parseCreatorScenarioJson,
  removeCreatorScenarioPackage,
  restoreSavedCreatorScenarioDefinitions,
  saveCreatorScenarioDefinition,
  type SavedCreatorScenarioSummary,
} from "./scenarioImport.js";
import {
  buildCreatorDraftPreview,
  type CreatorDraftPreview,
} from "./creatorScenarioPreview.js";
import {
  buildScenarioSelection,
  type ScenarioOption,
} from "./scenarioSelection.js";
import type {
  CampaignPayload,
  CampaignSummary,
  TurnProgressEvent,
} from "./api.js";

type LoadState = "booting" | "selecting" | "ready" | "running" | "error";
type ScenarioImportStatus = { kind: "success" | "error"; message: string };

type RelationshipEntry = {
  id: string;
  character: CharacterState;
  score: number;
};

const phaseLabel: Record<WorldState["time"]["phase"], string> = {
  morning: "清晨",
  afternoon: "午后",
  evening: "傍晚",
  night: "夜晚",
};

const transparencyLabels: Record<TransparencyMode, string> = {
  immersive: "沉浸",
  inference: "推理",
  debug: "调试",
};

const clockTone = (clock: ClockState) => {
  const ratio = clock.progress / clock.max;
  if (ratio >= 0.75) return "danger";
  if (ratio >= 0.45) return "warning";
  return "steady";
};

export const App = () => {
  const [campaignId, setCampaignId] = useState<string>();
  const [campaignTitle, setCampaignTitle] = useState("多 Agent 回合制模拟");
  const [state, setState] = useState<WorldState>();
  const [scenarioStatus, setScenarioStatus] =
    useState<CampaignPayload["scenarioStatus"]>();
  const [scenarioOptions, setScenarioOptions] = useState<ScenarioOption[]>([]);
  const [campaignSummaries, setCampaignSummaries] = useState<CampaignSummary[]>(
    [],
  );
  const [selectedScenarioId, setSelectedScenarioId] =
    useState("border-seven-days");
  const [scenarioImportText, setScenarioImportText] = useState("");
  const [scenarioImportStatus, setScenarioImportStatus] =
    useState<ScenarioImportStatus>();
  const [creatorDraft, setCreatorDraft] = useState<CreatorScenarioDraftInput>(
    defaultCreatorScenarioDraftInput,
  );
  const [savedCreatorScenarios, setSavedCreatorScenarios] = useState<
    SavedCreatorScenarioSummary[]
  >([]);
  const [actions, setActions] = useState<PlayerAction[]>([]);
  const [lastResolution, setLastResolution] = useState<TurnResolution>();
  const [loadState, setLoadState] = useState<LoadState>("booting");
  const [error, setError] = useState<string>();
  const [transparency, setTransparency] =
    useState<TransparencyMode>("inference");
  const [selectedAction, setSelectedAction] = useState<PlayerAction>();
  const [freeformActionText, setFreeformActionText] = useState("");
  const [llmSettings, setLlmSettings] = useState<LlmConfig>(() =>
    loadLlmSettings(),
  );
  const [llmSettingsSaved, setLlmSettingsSaved] = useState(true);
  const [llmConnectionStatus, setLlmConnectionStatus] =
    useState<LlmConnectionStatus>();
  const [turnProgress, setTurnProgress] = useState<TurnProgressEvent[]>([]);
  const [chronicleTimeline, setChronicleTimeline] = useState<
    ChronicleTimelineItem[]
  >([]);

  const loadScenarios = async () => {
    setLoadState("booting");
    setError(undefined);
    try {
      const restore = await restoreSavedCreatorScenarioDefinitions(
        (definition) => api.importScenario(definition),
      );
      setSavedCreatorScenarios(listSavedCreatorScenarioSummaries());
      const [catalog, campaigns] = await Promise.all([
        api.scenarios(),
        api.campaigns(6),
      ]);
      const selection = buildScenarioSelection(catalog, selectedScenarioId);
      setScenarioOptions(selection.options);
      setCampaignSummaries(campaigns.campaigns);
      setSelectedScenarioId(selection.selectedId);
      if (restore.failed.length > 0) {
        setScenarioImportStatus({
          kind: "error",
          message: `${restore.failed.length} 个本地剧本恢复失败`,
        });
      } else if (restore.restored.length > 0) {
        setScenarioImportStatus({
          kind: "success",
          message: `已恢复 ${restore.restored.length} 个本地剧本`,
        });
      }
      setLoadState("selecting");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "剧本列表加载失败");
      setLoadState("error");
    }
  };

  const hydrateCampaign = async (payload: CampaignPayload) => {
    setCampaignId(payload.campaignId);
    setCampaignTitle(payload.title ?? "多 Agent 回合制模拟");
    setSelectedScenarioId(payload.scenario ?? selectedScenarioId);
    setState(payload.state);
    setScenarioStatus(payload.scenarioStatus);
    setActions(payload.availableActions);
    setSelectedAction(payload.availableActions[0]);
    setLastResolution(payload.lastTurn?.resolution);
    setTurnProgress([]);
    setChronicleTimeline(
      buildChronicleTimeline(await api.chronicle(payload.campaignId)),
    );
    setLoadState("ready");
  };

  const boot = async (scenarioId = selectedScenarioId) => {
    setLoadState("booting");
    setError(undefined);
    try {
      const payload = await api.createCampaign(scenarioId);
      const fallbackTitle = scenarioOptions.find(
        (option) => option.id === scenarioId,
      )?.title;
      const title = payload.title ?? fallbackTitle;
      const campaignPayload: CampaignPayload = title
        ? { ...payload, title, scenario: payload.scenario ?? scenarioId }
        : { ...payload, scenario: payload.scenario ?? scenarioId };
      await hydrateCampaign(campaignPayload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "启动失败");
      setLoadState("error");
    }
  };

  const resumeCampaign = async (id: string) => {
    setLoadState("booting");
    setError(undefined);
    try {
      await hydrateCampaign(await api.getState(id, transparency));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "继续战役失败");
      setLoadState("error");
    }
  };

  const importCreatorScenario = async () => {
    const parsed = parseCreatorScenarioJson(scenarioImportText);
    if (!parsed.ok) {
      setScenarioImportStatus({ kind: "error", message: parsed.error });
      return;
    }

    setLoadState("booting");
    setError(undefined);
    setScenarioImportStatus(undefined);
    try {
      const imported = await api.importScenario(parsed.definition);
      saveCreatorScenarioDefinition(imported.scenario.id, parsed.definition);
      setSavedCreatorScenarios(listSavedCreatorScenarioSummaries());
      const [catalog, campaigns] = await Promise.all([
        api.scenarios(),
        api.campaigns(6),
      ]);
      const selection = buildScenarioSelection(catalog, imported.scenario.id);
      setScenarioOptions(selection.options);
      setCampaignSummaries(campaigns.campaigns);
      setSelectedScenarioId(selection.selectedId);
      setScenarioImportText("");
      setScenarioImportStatus({
        kind: "success",
        message: `已导入 ${imported.scenario.title}`,
      });
      setLoadState("selecting");
    } catch (caught) {
      setScenarioImportStatus({
        kind: "error",
        message: caught instanceof Error ? caught.message : "导入剧本失败",
      });
      setLoadState("selecting");
    }
  };

  const updateCreatorDraftField = <K extends keyof CreatorScenarioDraftInput>(
    field: K,
    value: CreatorScenarioDraftInput[K],
  ) => {
    setCreatorDraft((current) => ({ ...current, [field]: value }));
  };

  const generateCreatorDraftJson = () => {
    const definition = buildCreatorScenarioDraft(creatorDraft);
    setScenarioImportText(formatCreatorScenarioDefinition(definition));
    setScenarioImportStatus({
      kind: "success",
      message: `已生成 ${definition.title} 草稿 JSON`,
    });
  };

  const importCreatorDraft = async () => {
    const definition = buildCreatorScenarioDraft(creatorDraft);
    setScenarioImportText(formatCreatorScenarioDefinition(definition));
    setLoadState("booting");
    setError(undefined);
    setScenarioImportStatus(undefined);
    try {
      const imported = await api.importScenario(definition);
      saveCreatorScenarioDefinition(imported.scenario.id, definition);
      setSavedCreatorScenarios(listSavedCreatorScenarioSummaries());
      const [catalog, campaigns] = await Promise.all([
        api.scenarios(),
        api.campaigns(6),
      ]);
      const selection = buildScenarioSelection(catalog, imported.scenario.id);
      setScenarioOptions(selection.options);
      setCampaignSummaries(campaigns.campaigns);
      setSelectedScenarioId(selection.selectedId);
      setScenarioImportText("");
      setScenarioImportStatus({
        kind: "success",
        message: `已生成并导入 ${imported.scenario.title}`,
      });
      setLoadState("selecting");
    } catch (caught) {
      setScenarioImportStatus({
        kind: "error",
        message:
          caught instanceof Error ? caught.message : "生成导入剧本失败",
      });
      setLoadState("selecting");
    }
  };

  const deleteCreatorScenario = async (scenarioId: string) => {
    setLoadState("booting");
    setError(undefined);
    setScenarioImportStatus(undefined);
    try {
      const removal = await removeCreatorScenarioPackage(scenarioId, (id) =>
        api.deleteScenario(id),
      );
      if (!removal.ok) {
        setScenarioImportStatus({ kind: "error", message: removal.error });
        setLoadState("selecting");
        return;
      }
      setSavedCreatorScenarios(listSavedCreatorScenarioSummaries());
      const [catalog, campaigns] = await Promise.all([
        api.scenarios(),
        api.campaigns(6),
      ]);
      const selection = buildScenarioSelection(catalog, selectedScenarioId);
      setScenarioOptions(selection.options);
      setCampaignSummaries(campaigns.campaigns);
      setSelectedScenarioId(selection.selectedId);
      setScenarioImportStatus({
        kind: "success",
        message: removal.runtimeAlreadyMissing
          ? "已移除本地保存的剧本"
          : "已删除创作者剧本",
      });
      setLoadState("selecting");
    } catch (caught) {
      setScenarioImportStatus({
        kind: "error",
        message: caught instanceof Error ? caught.message : "删除剧本失败",
      });
      setLoadState("selecting");
    }
  };

  const exportCreatorScenario = async (scenarioId: string) => {
    setScenarioImportStatus(undefined);
    try {
      let definition: Record<string, unknown> | undefined;
      try {
        definition = (await api.exportScenario(scenarioId)).definition;
      } catch (caught) {
        definition = getSavedCreatorScenarioDefinition(scenarioId);
        if (!definition) throw caught;
      }
      setScenarioImportText(formatCreatorScenarioDefinition(definition));
      setScenarioImportStatus({
        kind: "success",
        message: "已导出创作者剧本 JSON",
      });
    } catch (caught) {
      setScenarioImportStatus({
        kind: "error",
        message: caught instanceof Error ? caught.message : "导出剧本失败",
      });
    }
  };

  useEffect(() => {
    void loadScenarios();
  }, []);

  const location = state ? state.locations[state.currentLocationId] : undefined;
  const visibleClocks = useMemo(
    () =>
      state ? Object.values(state.clocks).filter((clock) => clock.visible) : [],
    [state],
  );
  const topRelationships = useMemo(() => {
    if (!state) return [];
    return Object.entries(state.relationships)
      .flatMap(([id, relationship]): RelationshipEntry[] => {
        const npcId = id.split(":")[1] ?? "";
        const character = state.characters[npcId];
        if (!character) return [];
        return [
          {
            id,
            character,
            score:
              relationship.trust +
              relationship.affinity +
              relationship.respect -
              relationship.suspicion,
          },
        ];
      })
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 5);
  }, [state]);
  const factionPlanSummaries = useMemo(
    () => (state ? buildFactionPlanSummaries(state) : []),
    [state],
  );
  const campaignProgression = useMemo(
    () => (state ? buildCampaignProgressionSummary(state) : undefined),
    [state],
  );
  const campaignProgressionChoices = useMemo(
    () =>
      state
        ? buildCampaignProgressionChoices(state, {
            baseFacilities: scenarioStatus?.campaignArc?.baseFacilities,
          })
        : [],
    [state, scenarioStatus],
  );
  const campaignArcStatus = useMemo(
    () => buildCampaignArcStatusSummary(scenarioStatus),
    [scenarioStatus],
  );
  const freeformAction = useMemo(
    () => buildFreeformPlayerAction(freeformActionText),
    [freeformActionText],
  );
  const freeformActionPreview = useMemo(
    () => (freeformAction ? buildFreeformActionPreview(freeformAction) : []),
    [freeformAction],
  );
  const freeformComposerState = useMemo(
    () =>
      buildFreeformComposerState(
        freeformAction,
        selectedAction,
        loadState === "running",
      ),
    [freeformAction, selectedAction, loadState],
  );
  const selectedTurnAction =
    selectedAction?.actionType === "custom" ? freeformAction : selectedAction;

  const submitTurn = async (action: PlayerAction) => {
    if (!campaignId) return;
    setLoadState("running");
    setError(undefined);
    setTurnProgress([]);
    try {
      const queued = await api.runTurn(
        campaignId,
        action,
        transparency,
        llmSettings,
        { queued: true },
      );
      setTurnProgress([
        { event: "pending", data: { message: "turn_waiting_for_worker" } },
      ]);
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const events = await api.turnEvents(
          campaignId,
          queued.turnId,
          transparency,
        );
        if (events.length > 0) setTurnProgress(events);
        const payload = await api.getState(campaignId, transparency);
        if (
          payload.lastTurn?.id === queued.turnId &&
          payload.lastTurn.status === "complete" &&
          payload.lastTurn.resolution
        ) {
          setState(payload.state);
          setScenarioStatus(payload.scenarioStatus);
          setActions(payload.availableActions);
          setSelectedAction(payload.availableActions[0]);
          setLastResolution(payload.lastTurn.resolution);
          if (action.actionType === "custom") setFreeformActionText("");
          setChronicleTimeline(
            buildChronicleTimeline(await api.chronicle(campaignId)),
          );
          setLoadState("ready");
          return;
        }
        if (
          payload.lastTurn?.id === queued.turnId &&
          payload.lastTurn.status === "failed"
        ) {
          throw new Error("回合队列结算失败，请检查 API 日志。");
        }
        await new Promise((resolve) => window.setTimeout(resolve, 300));
      }
      throw new Error("回合仍在队列中，请稍后刷新状态。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "回合执行失败");
      setLoadState("error");
    }
  };

  const testLlmConnection = async () => {
    setLlmConnectionStatus({
      kind: "running",
      message: "正在测试 LLM 连接...",
    });
    try {
      setLlmConnectionStatus(
        llmConnectionSuccessStatus(
          await api.testLlmConnection(llmSettings),
        ),
      );
    } catch (caught) {
      setLlmConnectionStatus(llmConnectionErrorStatus(caught));
    }
  };

  const submitCampaignProgression = async (
    choice: CampaignProgressionChoice,
  ) => {
    if (!campaignId) return;
    setLoadState("running");
    setError(undefined);
    setTurnProgress([
      { event: "campaign_progress", data: { message: choice.label } },
    ]);
    try {
      const payload = await api.progressCampaign(campaignId, choice.request);
      setState(payload.state);
      setScenarioStatus(payload.scenarioStatus);
      setActions(payload.availableActions);
      setSelectedAction(payload.availableActions[0]);
      setLastResolution(payload.resolution);
      setTurnProgress([
        {
          event: "done",
          data: {
            message:
              payload.resolution?.publicSummary ??
              "campaign_progression_complete",
          },
        },
      ]);
      setChronicleTimeline(
        buildChronicleTimeline(await api.chronicle(campaignId)),
      );
      setLoadState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "长期战役推进失败");
      setLoadState("error");
    }
  };

  if (!state || !location) {
    return (
      <main className="boot-shell">
        <section className="boot-panel">
          <Sparkles size={28} />
          <h1>多 Agent 回合制模拟</h1>
          <p>
            {loadState === "booting"
              ? "正在加载剧本..."
              : "选择一个剧本开始战役。"}
          </p>
          {campaignSummaries.length > 0 ? (
            <ResumeCampaigns
              campaigns={campaignSummaries}
              disabled={loadState === "booting"}
              onResume={resumeCampaign}
            />
          ) : null}
          {scenarioOptions.length > 0 ? (
            <ScenarioPicker
              options={scenarioOptions}
              selectedId={selectedScenarioId}
              disabled={loadState === "booting"}
              onSelect={setSelectedScenarioId}
            />
          ) : null}
          <CreatorScenarioImportPanel
            value={scenarioImportText}
            status={scenarioImportStatus}
            draft={creatorDraft}
            savedScenarios={savedCreatorScenarios}
            disabled={loadState === "booting"}
            onChange={setScenarioImportText}
            onDraftChange={updateCreatorDraftField}
            onGenerateDraft={generateCreatorDraftJson}
            onImportDraft={() => void importCreatorDraft()}
            onImport={() => void importCreatorScenario()}
            onExport={(scenarioId) => void exportCreatorScenario(scenarioId)}
            onDelete={(scenarioId) => void deleteCreatorScenario(scenarioId)}
          />
          {error ? <pre>{error}</pre> : null}
          <div className="boot-actions">
            <button
              className="primary-button"
              disabled={loadState === "booting" || scenarioOptions.length === 0}
              onClick={() => void boot(selectedScenarioId)}
            >
              <Play size={18} />
              开始战役
            </button>
            <button
              className="icon-button"
              title="重新加载剧本"
              onClick={() => void loadScenarios()}
            >
              <RefreshCcw size={18} />
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>{campaignTitle}</h1>
          <p>
            第 {state.time.day} 天 · {phaseLabel[state.time.phase]} ·{" "}
            {location.name}
          </p>
        </div>
        <div className="topbar-actions">
          <SegmentedControl value={transparency} onChange={setTransparency} />
          <button
            className="icon-button"
            title="重开战役"
            onClick={() => void boot(selectedScenarioId)}
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </header>

      {error ? (
        <aside className="error-banner">
          <AlertTriangle size={18} />
          {error}
        </aside>
      ) : null}

      <section className="dashboard">
        <article className="scene-panel">
          <div className="panel-heading">
            <ScrollText size={19} />
            <h2>当前场景</h2>
          </div>
          <p className="scene-text">{location.description}</p>
          <div className="fact-list">
            {location.publicInfo.map((fact) => (
              <span key={fact}>{fact}</span>
            ))}
          </div>
          {scenarioStatus ? (
            <ScenarioStatusPanel status={scenarioStatus} />
          ) : null}
          <Narration resolution={lastResolution} state={state} />
        </article>

        <aside className="action-panel">
          <div className="panel-heading">
            <Play size={19} />
            <h2>行动</h2>
          </div>
          <div className="action-list">
            {actions.map((action) => {
              const visibleAction = displayPlayerAction(action);
              return (
                <button
                  key={action.id ?? `${action.actionType}-${action.label}`}
                  className={
                    selectedAction?.label === action.label
                      ? "action-choice selected"
                      : "action-choice"
                  }
                  onClick={() => setSelectedAction(action)}
                >
                  <span>{visibleAction.label}</span>
                  <small>{visibleAction.description}</small>
                </button>
              );
            })}
          </div>
          <section className="freeform-action-composer">
            <div className="panel-heading compact">
              <Sparkles size={16} />
              <h3>自由行动</h3>
            </div>
            <textarea
              aria-label="自由行动"
              placeholder="伪装成药材车绕开封锁，把病人送到旧哨站。"
              value={freeformActionText}
              maxLength={FREEFORM_ACTION_MAX_LENGTH}
              disabled={loadState === "running"}
              onChange={(event) => setFreeformActionText(event.target.value)}
            />
            <div className="freeform-action-footer">
              <span>
                {freeformActionText.trim().length}/{FREEFORM_ACTION_MAX_LENGTH}
              </span>
              <div className="freeform-action-buttons">
                <button
                  className={
                    freeformComposerState.selected
                      ? "freeform-action-button selected"
                      : "freeform-action-button"
                  }
                  disabled={freeformComposerState.selectDisabled}
                  onClick={() =>
                    freeformAction && setSelectedAction(freeformAction)
                  }
                >
                  <Play size={15} />
                  {freeformComposerState.selectLabel}
                </button>
                <button
                  className="secondary-button"
                  disabled={freeformComposerState.directSubmitDisabled}
                  onClick={() =>
                    freeformAction && void submitTurn(freeformAction)
                  }
                >
                  <Play size={15} />
                  {freeformComposerState.directSubmitLabel}
                </button>
              </div>
            </div>
            {freeformActionPreview.length > 0 ? (
              <div className="freeform-action-preview">
                {freeformActionPreview.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            ) : null}
          </section>
          <button
            className="primary-button full"
            disabled={!selectedTurnAction || loadState === "running"}
            onClick={() =>
              selectedTurnAction && void submitTurn(selectedTurnAction)
            }
          >
            <Play size={18} />
            {loadState === "running" ? "结算中..." : "执行回合"}
          </button>
          <TurnProgressPanel
            events={turnProgress}
            running={loadState === "running"}
          />
        </aside>

        <aside className="side-panel">
          <StatusPanel state={state} />
          {campaignArcStatus.available ? (
            <CampaignArcPanel summary={campaignArcStatus} />
          ) : null}
          {campaignProgressionChoices.length > 0 ? (
            <CampaignProgressionChoicesPanel
              choices={campaignProgressionChoices}
              disabled={loadState === "running"}
              onChoose={(choice) => void submitCampaignProgression(choice)}
            />
          ) : null}
          {campaignProgression?.available ? (
            <CampaignProgressionPanel summary={campaignProgression} />
          ) : null}
          <ClockPanel clocks={visibleClocks} />
          <ChroniclePanel items={chronicleTimeline} />
        </aside>

        <aside className="side-panel">
          <RelationshipPanel entries={topRelationships} />
          <FactionPlanPanel summaries={factionPlanSummaries} />
          <LlmSettingsPanel
            settings={llmSettings}
            saved={llmSettingsSaved}
            connectionStatus={llmConnectionStatus}
            onChange={(settings) => {
              setLlmSettings(settings);
              setLlmSettingsSaved(false);
              setLlmConnectionStatus(undefined);
            }}
            onSave={() => {
              setLlmSettings(saveLlmSettings(llmSettings));
              setLlmSettingsSaved(true);
            }}
            onClear={() => {
              setLlmSettings(clearLlmSettings());
              setLlmSettingsSaved(true);
              setLlmConnectionStatus(undefined);
            }}
            onTest={() => void testLlmConnection()}
          />
          <AgentPanel resolution={lastResolution} transparency={transparency} />
        </aside>
      </section>
    </main>
  );
};

const progressTitle: Record<string, string> = {
  turn: "回合任务",
  pending: "队列等待",
  campaign_progress: "战役推进",
  agent_proposals: "智能体提案",
  referee: "规则裁判",
  narration: "叙事输出",
  done: "完成",
  error: "错误",
};

const progressDetail = (event: TurnProgressEvent) => {
  const data = event.data as Record<string, unknown> | null;
  if (!data) return "";
  if (typeof data.message === "string") return data.message;
  if (typeof data.status === "string") return data.status;
  if (typeof data.publicSummary === "string") return data.publicSummary;
  if (typeof data.text === "string") return data.text;
  if (Array.isArray(data)) return `${data.length} 条提案`;
  return "";
};

const TurnProgressPanel = ({
  events,
  running,
}: {
  events: TurnProgressEvent[];
  running: boolean;
}) => {
  if (!running && events.length === 0) return null;
  return (
    <section className="turn-progress">
      <div className="panel-heading compact">
        <Activity size={17} />
        <h3>回合进度</h3>
      </div>
      <div className="progress-list">
        {(events.length > 0
          ? events
          : [{ event: "pending", data: { message: "turn_waiting_for_worker" } }]
        ).map((event, index) => (
          <div key={`${event.event}-${index}`} className="progress-row">
            <strong>{progressTitle[event.event] ?? event.event}</strong>
            <span>{progressDetail(event)}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

const ResumeCampaigns = ({
  campaigns,
  disabled,
  onResume,
}: {
  campaigns: CampaignSummary[];
  disabled: boolean;
  onResume: (campaignId: string) => void;
}) => (
  <section className="resume-panel">
    <div className="panel-heading compact">
      <History size={17} />
      <h3>继续战役</h3>
    </div>
    <div className="resume-list">
      {campaigns.map((campaign) => (
        <button
          key={campaign.id}
          className="resume-choice"
          disabled={disabled}
          onClick={() => onResume(campaign.id)}
        >
          <span>{campaign.title}</span>
          <small>{formatCampaignProgress(campaign)}</small>
        </button>
      ))}
    </div>
  </section>
);

const ScenarioPicker = ({
  options,
  selectedId,
  disabled,
  onSelect,
}: {
  options: ScenarioOption[];
  selectedId: string;
  disabled: boolean;
  onSelect: (scenarioId: string) => void;
}) => (
  <div className="scenario-picker" role="listbox" aria-label="剧本选择">
    {options.map((option) => (
      <button
        key={option.id}
        className={
          selectedId === option.id
            ? "scenario-option selected"
            : "scenario-option"
        }
        disabled={disabled}
        onClick={() => onSelect(option.id)}
        role="option"
        aria-selected={selectedId === option.id}
      >
        <span>{option.title}</span>
        <small>{option.summary}</small>
        {option.arcSummary ? <small className="scenario-arc">{option.arcSummary}</small> : null}
      </button>
    ))}
  </div>
);

const CreatorDraftPreviewPanel = ({
  preview,
}: {
  preview: CreatorDraftPreview;
}) => (
  <div className="creator-preview" aria-label="创作者草稿大纲">
    <div className="creator-preview-header">
      <div>
        <h4>{preview.title}</h4>
        <span>{preview.scenarioId}</span>
      </div>
      <strong>{preview.summary}</strong>
    </div>
    <div className="creator-preview-grid">
      {preview.sections.map((section) => (
        <div className="creator-preview-section" key={section.title}>
          <div>
            <span>{section.title}</span>
            <strong>{section.count}</strong>
          </div>
          <ul>
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
);

const CreatorScenarioImportPanel = ({
  value,
  status,
  draft,
  savedScenarios,
  disabled,
  onChange,
  onDraftChange,
  onGenerateDraft,
  onImportDraft,
  onImport,
  onExport,
  onDelete,
}: {
  value: string;
  status: ScenarioImportStatus | undefined;
  draft: CreatorScenarioDraftInput;
  savedScenarios: SavedCreatorScenarioSummary[];
  disabled: boolean;
  onChange: (value: string) => void;
  onDraftChange: <K extends keyof CreatorScenarioDraftInput>(
    field: K,
    value: CreatorScenarioDraftInput[K],
  ) => void;
  onGenerateDraft: () => void;
  onImportDraft: () => void;
  onImport: () => void;
  onExport: (scenarioId: string) => void;
  onDelete: (scenarioId: string) => void;
}) => (
  <section className="creator-import-panel">
    <div className="panel-heading compact">
      <Upload size={17} />
      <h3>创作剧本</h3>
    </div>
    <div className="creator-draft-grid">
      <label className="creator-field">
        <span>剧本 ID</span>
        <input
          value={draft.id}
          disabled={disabled}
          onChange={(event) => onDraftChange("id", event.target.value)}
        />
      </label>
      <label className="creator-field">
        <span>剧本名</span>
        <input
          value={draft.title}
          disabled={disabled}
          onChange={(event) => onDraftChange("title", event.target.value)}
        />
      </label>
      <label className="creator-field wide">
        <span>开局危机</span>
        <textarea
          value={draft.premise}
          disabled={disabled}
          onChange={(event) => onDraftChange("premise", event.target.value)}
        />
      </label>
      <label className="creator-field">
        <span>玩家身份</span>
        <input
          value={draft.playerName}
          disabled={disabled}
          onChange={(event) => onDraftChange("playerName", event.target.value)}
        />
      </label>
      <label className="creator-field">
        <span>起始地点</span>
        <input
          value={draft.startLocationName}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("startLocationName", event.target.value)
          }
        />
      </label>
      <label className="creator-field">
        <span>冲突地点</span>
        <input
          value={draft.pressureLocationName}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("pressureLocationName", event.target.value)
          }
        />
      </label>
      <label className="creator-field">
        <span>危机钟</span>
        <input
          value={draft.crisisName}
          disabled={disabled}
          onChange={(event) => onDraftChange("crisisName", event.target.value)}
        />
      </label>
      <label className="creator-field">
        <span>危机初始值</span>
        <input
          type="number"
          min={0}
          value={draft.crisisInitialProgress}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange(
              "crisisInitialProgress",
              Number.parseInt(event.target.value, 10),
            )
          }
        />
      </label>
      <label className="creator-field">
        <span>危机上限</span>
        <input
          type="number"
          min={1}
          value={draft.crisisMax}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("crisisMax", Number.parseInt(event.target.value, 10))
          }
        />
      </label>
      <label className="creator-field wide">
        <span>危机后果</span>
        <textarea
          value={draft.crisisConsequence}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("crisisConsequence", event.target.value)
          }
        />
      </label>
      <label className="creator-field">
        <span>关键 NPC</span>
        <input
          value={draft.guideName}
          disabled={disabled}
          onChange={(event) => onDraftChange("guideName", event.target.value)}
        />
      </label>
      <label className="creator-field">
        <span>对手 NPC</span>
        <input
          value={draft.pressureNpcName}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("pressureNpcName", event.target.value)
          }
        />
      </label>
      <label className="creator-field">
        <span>支援阵营</span>
        <input
          value={draft.allyFactionName}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("allyFactionName", event.target.value)
          }
        />
      </label>
      <label className="creator-field">
        <span>施压阵营</span>
        <input
          value={draft.pressureFactionName}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("pressureFactionName", event.target.value)
          }
        />
      </label>
      <label className="creator-field wide">
        <span>主线目标</span>
        <textarea
          value={draft.mainQuestGoal}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("mainQuestGoal", event.target.value)
          }
        />
      </label>
      <label className="creator-field">
        <span>行动一</span>
        <input
          value={draft.primaryActionLabel}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("primaryActionLabel", event.target.value)
          }
        />
      </label>
      <label className="creator-field">
        <span>行动二</span>
        <input
          value={draft.secondaryActionLabel}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("secondaryActionLabel", event.target.value)
          }
        />
      </label>
      <label className="creator-field">
        <span>行动三</span>
        <input
          value={draft.tertiaryActionLabel}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("tertiaryActionLabel", event.target.value)
          }
        />
      </label>
      <label className="creator-field">
        <span>成功结局</span>
        <input
          value={draft.successEndingTitle}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("successEndingTitle", event.target.value)
          }
        />
      </label>
      <label className="creator-field wide">
        <span>成功结局摘要</span>
        <textarea
          value={draft.successEndingSummary}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("successEndingSummary", event.target.value)
          }
        />
      </label>
      <label className="creator-field">
        <span>压力结局</span>
        <input
          value={draft.pressureEndingTitle}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("pressureEndingTitle", event.target.value)
          }
        />
      </label>
      <label className="creator-field wide">
        <span>压力结局摘要</span>
        <textarea
          value={draft.pressureEndingSummary}
          disabled={disabled}
          onChange={(event) =>
            onDraftChange("pressureEndingSummary", event.target.value)
          }
        />
      </label>
    </div>
    <CreatorDraftPreviewPanel preview={buildCreatorDraftPreview(draft)} />
    <div className="creator-draft-actions">
      <button
        className="secondary-button"
        disabled={disabled}
        onClick={onGenerateDraft}
      >
        <Sparkles size={15} />
        生成 JSON
      </button>
      <button
        className="primary-button"
        disabled={disabled}
        onClick={onImportDraft}
      >
        <Upload size={15} />
        生成并导入
      </button>
    </div>
    <h4 className="creator-json-heading">高级 JSON 导入</h4>
    <textarea
      aria-label="创作者剧本 JSON"
      placeholder='{ "id": "my-scenario", "title": "我的剧本", ... }'
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
    <div className="creator-import-actions">
      <button
        className="secondary-button"
        disabled={disabled || value.trim().length === 0}
        onClick={onImport}
      >
        <Upload size={15} />
        导入
      </button>
      {status ? (
        <span className={`import-status ${status.kind}`}>{status.message}</span>
      ) : null}
    </div>
    {savedScenarios.length > 0 ? (
      <div className="creator-saved-list">
        {savedScenarios.map((scenario) => (
          <div key={scenario.id} className="creator-saved-row">
            <div>
              <strong>{scenario.title}</strong>
              <span>{scenario.id}</span>
            </div>
            <button
              className="icon-button"
              title="导出创作者剧本"
              disabled={disabled}
              onClick={() => onExport(scenario.id)}
            >
              <Download size={15} />
            </button>
            <button
              className="icon-button"
              title="删除创作者剧本"
              disabled={disabled}
              onClick={() => onDelete(scenario.id)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    ) : null}
  </section>
);

const SegmentedControl = ({
  value,
  onChange,
}: {
  value: TransparencyMode;
  onChange: (value: TransparencyMode) => void;
}) => (
  <div className="segmented" role="tablist" aria-label="Agent 透明度">
    {(Object.keys(transparencyLabels) as TransparencyMode[]).map((mode) => (
      <button
        key={mode}
        className={value === mode ? "active" : ""}
        onClick={() => onChange(mode)}
      >
        {transparencyLabels[mode]}
      </button>
    ))}
  </div>
);

const ScenarioStatusPanel = ({
  status,
}: {
  status: CampaignPayload["scenarioStatus"];
}) => (
  <section className="scenario-status">
    <div>
      <strong>今日主事件</strong>
      <span>{status.dayPlan?.mainEvent ?? "战役日程之外的自由行动。"}</span>
    </div>
    <div className="scenario-counts">
      <span>战斗 {status.sceneCounts.combat}</span>
      <span>社交 {status.sceneCounts.social}</span>
      <span>结局 {status.sceneCounts.endings}</span>
    </div>
    {status.ending ? (
      <div className="ending-callout">
        <strong>{status.ending.title}</strong>
        <span>{status.ending.summary}</span>
      </div>
    ) : null}
  </section>
);

const Narration = ({
  resolution,
  state,
}: {
  resolution: TurnResolution | undefined;
  state: WorldState;
}) => (
  <section className="narration">
    <div className="panel-heading compact">
      <BookOpen size={17} />
      <h3>叙事记录</h3>
    </div>
    <p>{resolution?.narration ?? state.publicEvents.at(-1)?.body}</p>
    {resolution ? (
      <div className="resolution-strip">
        <span>{resolution.publicSummary}</span>
      </div>
    ) : null}
  </section>
);

const StatusPanel = ({ state }: { state: WorldState }) => (
  <section className="module">
    <div className="panel-heading compact">
      <HeartPulse size={17} />
      <h3>队伍状态</h3>
    </div>
    <div className="stat-grid">
      <Metric label="生命" value={state.player.resources.health ?? 0} max={5} />
      <Metric
        label="压力"
        value={state.player.resources.pressure ?? 0}
        max={9}
      />
      <Metric
        label="体力"
        value={state.player.resources.stamina ?? 0}
        max={5}
      />
      <Metric label="声势" value={state.player.momentum} max={5} />
    </div>
    <div className="tag-row">
      {state.player.reputationTags.map((tag) => (
        <span key={tag}>{displayLabel(tag)}</span>
      ))}
    </div>
  </section>
);

const CampaignArcPanel = ({
  summary,
}: {
  summary: CampaignArcStatusSummary;
}) => (
  <section className="module campaign-arc-status">
    <div className="panel-heading compact">
      <GitBranch size={17} />
      <h3>战役篇章</h3>
    </div>
    <div className="arc-current">
      <strong>{summary.chapterLabel}</strong>
      <span>{summary.focus}</span>
    </div>
    <div className="arc-section">
      <small>解锁内容</small>
      <div className="tag-row compact">
        {summary.unlocks.slice(0, 4).map((unlock) => (
          <span key={unlock}>{displayLabel(unlock)}</span>
        ))}
      </div>
    </div>
    <div className="arc-meta-grid">
      <Metric label="基地" valueLabel={String(summary.baseFacilities.length)} />
      <Metric label="战线" valueLabel={String(summary.factionFronts.length)} />
    </div>
  </section>
);

const CampaignProgressionPanel = ({
  summary,
}: {
  summary: CampaignProgressionSummary;
}) => (
  <section className="module campaign-progression">
    <div className="panel-heading compact">
      <Activity size={17} />
      <h3>长期战役</h3>
    </div>
    <div className="campaign-progress-grid">
      <Metric label="章节" valueLabel={summary.chapterLabel} />
      <Metric label="成长" valueLabel={summary.experienceLabel} />
    </div>
    <div className="campaign-base">
      <strong>{summary.baseLabel}</strong>
      <div className="tag-row compact">
        {summary.facilities.length > 0 ? (
          summary.facilities.map((facility) => <span key={facility}>{facility}</span>)
        ) : (
          <span>暂无设施</span>
        )}
      </div>
    </div>
    {summary.assets.length > 0 ? (
      <div className="tag-row compact campaign-assets">
        {summary.assets.map((asset) => (
          <span key={asset}>{asset}</span>
        ))}
      </div>
    ) : null}
    <div className="front-list">
      {summary.fronts.slice(0, 3).map((front) => (
        <div key={front.id} className={`front-row ${front.status}`}>
          <div>
            <strong>{front.name}</strong>
            <span>{front.statusLabel}</span>
          </div>
          <small>
            影响 {front.influence} · 压力 {front.pressure}
          </small>
        </div>
      ))}
    </div>
    {summary.legacyFlags.length > 0 ? (
      <small className="legacy-flags">{summary.legacyFlags.length} 条传承记录</small>
    ) : null}
  </section>
);

const CampaignProgressionChoicesPanel = ({
  choices,
  disabled,
  onChoose,
}: {
  choices: CampaignProgressionChoice[];
  disabled: boolean;
  onChoose: (choice: CampaignProgressionChoice) => void;
}) => (
  <section className="module campaign-choices">
    <div className="panel-heading compact">
      <GitBranch size={17} />
      <h3>战役行动</h3>
    </div>
    <div className="campaign-choice-list">
      {choices.slice(0, 4).map((choice) => (
        <button
          key={choice.id}
          className={`campaign-choice ${choice.kind}`}
          disabled={disabled}
          onClick={() => onChoose(choice)}
        >
          <span>{choice.label}</span>
          <small>{choice.description}</small>
        </button>
      ))}
    </div>
  </section>
);

const ClockPanel = ({ clocks }: { clocks: ClockState[] }) => (
  <section className="module">
    <div className="panel-heading compact">
      <Clock3 size={17} />
      <h3>危机时钟</h3>
    </div>
    <div className="clock-list">
      {clocks.map((clock) => (
        <div className="clock-row" key={clock.id}>
          <div>
            <strong>{clock.name}</strong>
            <span>
              {clock.progress}/{clock.max}
            </span>
          </div>
          <div className={`bar ${clockTone(clock)}`}>
            <i style={{ width: `${(clock.progress / clock.max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  </section>
);

const ChroniclePanel = ({ items }: { items: ChronicleTimelineItem[] }) => (
  <section className="module">
    <div className="panel-heading compact">
      <History size={17} />
      <h3>回放记录</h3>
    </div>
    <div className="chronicle-list">
      {items.slice(-4).map((item) => (
        <div key={item.id} className="chronicle-row">
          <strong>{item.title}</strong>
          <span>{item.meta}</span>
          <p>{item.body}</p>
          <small>
            {item.patchSummary}
            {item.endingTitle ? ` · ${item.endingTitle}` : ""}
          </small>
        </div>
      ))}
      {items.length === 0 ? <p className="muted">等待第一轮结算。</p> : null}
    </div>
  </section>
);

const RelationshipPanel = ({ entries }: { entries: RelationshipEntry[] }) => (
  <section className="module">
    <div className="panel-heading compact">
      <Users size={17} />
      <h3>关系图谱</h3>
    </div>
    <div className="relation-list">
      {entries.map((entry) => (
        <div key={entry.id} className="relation-row">
          <div>
            <strong>{entry.character.name}</strong>
            <span>{entry.character.role}</span>
          </div>
          <meter min={-10} max={10} value={entry.score} />
        </div>
      ))}
    </div>
  </section>
);

const FactionPlanPanel = ({
  summaries,
}: {
  summaries: FactionPlanSummary[];
}) => (
  <section className="module faction-plans">
    <div className="panel-heading compact">
      <Shield size={17} />
      <h3>阵营计划</h3>
    </div>
    <div className="faction-plan-list">
      {summaries.map((summary) => (
        <div key={summary.id} className="faction-plan-row">
          <div className="faction-plan-head">
            <div>
              <strong>{summary.name}</strong>
              <span>{summary.leaderName}</span>
            </div>
            <small>{summary.clockLabel}</small>
          </div>
          <p>{summary.plan}</p>
          <div className="tag-row compact">
            {summary.resourceBadges.map((badge) => (
              <span key={`${summary.id}-${badge}`}>{badge}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
);

const LlmSettingsPanel = ({
  settings,
  saved,
  connectionStatus,
  onChange,
  onSave,
  onClear,
  onTest,
}: {
  settings: LlmConfig;
  saved: boolean;
  connectionStatus: LlmConnectionStatus | undefined;
  onChange: (settings: LlmConfig) => void;
  onSave: () => void;
  onClear: () => void;
  onTest: () => void;
}) => (
  <section className="module">
    <div className="panel-heading compact">
      <Settings size={17} />
      <h3>LLM 接口</h3>
    </div>
    <div className="settings-grid">
      <label>
        <span>接口地址</span>
        <input
          value={settings.baseUrl}
          onChange={(event) =>
            onChange({ ...settings, baseUrl: event.target.value })
          }
        />
      </label>
      <label>
        <span>模型</span>
        <input
          value={settings.model}
          onChange={(event) =>
            onChange({ ...settings, model: event.target.value })
          }
        />
      </label>
      <label>
        <span>API 密钥</span>
        <div className="secret-input">
          <KeyRound size={15} />
          <input
            type="password"
            value={settings.apiKey}
            autoComplete="off"
            onChange={(event) =>
              onChange({ ...settings, apiKey: event.target.value })
            }
          />
        </div>
      </label>
      <label>
        <span>超时时间</span>
        <input
          type="number"
          min={1000}
          max={120000}
          step={1000}
          value={settings.timeoutMs}
          onChange={(event) =>
            onChange({ ...settings, timeoutMs: Number(event.target.value) })
          }
        />
      </label>
      <label>
        <span>最大 Token</span>
        <input
          type="number"
          min={1}
          max={128000}
          step={256}
          value={settings.maxTokens}
          onChange={(event) =>
            onChange({ ...settings, maxTokens: Number(event.target.value) })
          }
        />
      </label>
    </div>
    <div className="settings-actions">
      <button className="secondary-button" onClick={onSave}>
        <Save size={15} />
        {saved ? "已保存" : "保存"}
      </button>
      <button
        className="secondary-button"
        disabled={connectionStatus?.kind === "running"}
        onClick={onTest}
      >
          <Activity size={15} />
          {connectionStatus?.kind === "running" ? "测试中" : "测试"}
        </button>
      <button className="icon-button" title="清除 LLM 设置" onClick={onClear}>
        <Trash2 size={16} />
      </button>
    </div>
    {connectionStatus ? (
      <div className={`llm-test-status ${connectionStatus.kind}`}>
        {connectionStatus.message}
      </div>
    ) : null}
  </section>
);

const AgentPanel = ({
  resolution,
  transparency,
}: {
  resolution: TurnResolution | undefined;
  transparency: TransparencyMode;
}) => {
  const rows = buildAgentTransparencyRows(resolution, transparency);
  return (
    <section className="module">
      <div className="panel-heading compact">
        <Brain size={17} />
        <h3>智能体</h3>
      </div>
      {transparency === "immersive" ? (
        <p className="muted">角色的动机隐藏在行为里。</p>
      ) : (
        <div className="agent-list">
          {rows.map((row) => (
            <div key={row.id} className="agent-row">
              <MessageSquare size={15} />
              <span>{row.headline}</span>
              {row.detail ? <small>{row.detail}</small> : null}
              {row.hiddenDetail ? (
                <small className="debug-detail">{row.hiddenDetail}</small>
              ) : null}
            </div>
          ))}
          {!resolution ? <p className="muted">等待第一轮行动。</p> : null}
        </div>
      )}
    </section>
  );
};

const Metric = ({
  label,
  value,
  max,
  valueLabel,
}: {
  label: string;
  value?: number;
  max?: number;
  valueLabel?: string;
}) => (
  <div className="metric">
    <Shield size={15} />
    <span>{label}</span>
    <strong>{valueLabel ?? `${value}/${max}`}</strong>
  </div>
);
