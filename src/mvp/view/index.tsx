import { useEffect, useState } from "react";
import type { AppViewModel } from "../presenter";
import {
  fetchPlaySnapshot,
  generatePinSession,
  resolveApiBaseUrl,
  type KahootMiniPinSession,
  type KahootMiniPlayerSnapshot,
  type KahootMiniSnapshot,
} from "../service/pin-session";
import { fetchLeaderboard, type KahootMiniLeaderboardResponse } from "../service/leaderboard";
import { sendPlayAction, type KahootMiniPlayAction } from "../service/play-session";

type Props = AppViewModel;

type Phase = "pin" | "intro";
type StreamState = "idle" | "connecting" | "open" | "error";

const pageStyle = {
  width: "100%",
  maxWidth: "1200px",
  margin: "0 auto",
  padding: "clamp(12px, 2.5vw, 28px)",
  boxSizing: "border-box" as const,
};

const stackStyle = {
  display: "grid",
  gap: "16px",
};

const panelStyle = {
  borderRadius: "22px",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,248,255,0.92) 100%)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
  padding: "20px",
};

const ACCESS_PIN = "246810";
const ACCESS_GRANTED_STORAGE_KEY = "mfe-mgn-kahoot-mini-react:access-granted";
const PIN_SESSION_STORAGE_KEY = "mfe-mgn-kahoot-mini-react:pin-session";
const SESSION_RESET_CHANNEL = "kahoot-mini-session-reset";
const SESSION_RESET_STORAGE_KEY = "kahoot-mini-session-reset";

const formatSessionTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
};

const formatCountdown = (expiresAt: string, nowMs: number) => {
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return "--:--:--";
  const remainingMs = Math.max(expiresMs - nowMs, 0);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

const isUsablePinSession = (session: KahootMiniPinSession | null) => {
  if (!session?.pin || !session.expiresAt) return false;
  const expiresAtMs = new Date(session.expiresAt).getTime();
  return !Number.isNaN(expiresAtMs) && expiresAtMs > Date.now();
};

const readStoredPinSession = (): KahootMiniPinSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PIN_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KahootMiniPinSession;
    if (!isUsablePinSession(parsed)) {
      window.sessionStorage.removeItem(PIN_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const persistPinSession = (session: KahootMiniPinSession | null) => {
  if (typeof window === "undefined") return;
  try {
    if (session && isUsablePinSession(session)) {
      window.sessionStorage.setItem(PIN_SESSION_STORAGE_KEY, JSON.stringify(session));
      return;
    }
    window.sessionStorage.removeItem(PIN_SESSION_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
};

const readAccessGranted = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(ACCESS_GRANTED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const persistAccessGranted = (isGranted: boolean) => {
  if (typeof window === "undefined") return;
  try {
    if (isGranted) {
      window.sessionStorage.setItem(ACCESS_GRANTED_STORAGE_KEY, "1");
      return;
    }
    window.sessionStorage.removeItem(ACCESS_GRANTED_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
};

const resolveStreamUrl = (pin: string) => `${resolveApiBaseUrl()}/api/kahoot-mini/socket?pin=${encodeURIComponent(pin)}`;

const broadcastSessionReset = () => {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({ type: "reset", at: Date.now(), nonce: crypto.randomUUID?.() ?? Math.random().toString(16).slice(2) });

  try {
    if (typeof window.BroadcastChannel !== "undefined") {
      const channel = new window.BroadcastChannel(SESSION_RESET_CHANNEL);
      channel.postMessage({ token: payload });
      channel.close();
    }
  } catch {
    // ignore broadcast errors
  }

  try {
    window.localStorage.setItem(SESSION_RESET_STORAGE_KEY, payload);
  } catch {
    // ignore storage errors
  }
};

const getRealtimeLabel = (streamState: StreamState, labels: Props["labels"]) => {
  if (streamState === "open") return labels.realtimeConnected;
  if (streamState === "connecting") return labels.realtimeConnecting;
  if (streamState === "error") return labels.realtimeError;
  return labels.realtimeIdle;
};

const isPinGoneError = (message: string) => /pin not found or expired/i.test(message);

const shouldResetHostSession = (snapshot: KahootMiniSnapshot | null | undefined) => {
  if (!snapshot) return false;

  const closeReason = snapshot.state?.closeReason;
  const status = snapshot.session?.status;

  return closeReason === "host_replaced" || closeReason === "expired" || status === "expired";
};

const getSessionPhaseLabel = (phase: string | undefined, labels: Props["labels"]) => {
  if (phase === "question_live") return labels.phaseQuestionLive;
  if (phase === "question_closed") return labels.phaseQuestionClosed;
  if (phase === "completed") return labels.phaseCompleted;
  return labels.phaseLobby;
};

const getPlayerJoinedAt = (player: KahootMiniPlayerSnapshot) =>
  player.joinedAt ? formatSessionTime(player.joinedAt) : "--";

export const AppView = ({
  title,
  subtitle,
  introEyebrow,
  labels,
}: Props): JSX.Element => {
  const initialSession = readStoredPinSession();
  const [phase, setPhase] = useState<Phase>(initialSession ? "intro" : "pin");
  const [accessPin, setAccessPin] = useState("");
  const [accessError, setAccessError] = useState("");
  const [isAccessGranted, setIsAccessGranted] = useState(() => readAccessGranted());
  const [pinError, setPinError] = useState("");
  const [pinSession, setPinSession] = useState<KahootMiniPinSession | null>(initialSession);
  const [snapshot, setSnapshot] = useState<KahootMiniSnapshot | null>(null);
  const [isPinSessionLoading, setIsPinSessionLoading] = useState(false);
  const [isPinSessionError, setIsPinSessionError] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [lastPingAt, setLastPingAt] = useState<string | null>(null);
  const [hostActionError, setHostActionError] = useState("");
  const [isHostActionLoading, setIsHostActionLoading] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<KahootMiniLeaderboardResponse | null>(null);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");
  const [hasCopiedJoinLink, setHasCopiedJoinLink] = useState(false);

  const currentPin = snapshot?.session?.pin ?? pinSession?.pin ?? "";
  const sessionPhase = snapshot?.state?.phase ?? "lobby";
  const connectedPlayerIds = snapshot?.connectedPlayerIds ?? [];
  const connectedPlayers =
    connectedPlayerIds.length > 0
      ? (snapshot?.players ?? []).filter((player) => !!player.id && connectedPlayerIds.includes(player.id))
      : snapshot?.players ?? [];
  const connectedPlayersCount =
    snapshot?.connectedPlayersCount ?? connectedPlayerIds.length ?? connectedPlayers.length;
  const topPlayers = leaderboardData?.topPlayers ?? snapshot?.topPlayers ?? [];
  const leaderboard = leaderboardData?.leaderboard ?? [];
  const realtimeLabel = getRealtimeLabel(streamState, labels);
  const phaseLabel = getSessionPhaseLabel(sessionPhase, labels);
  const hasConnectedPlayers = connectedPlayersCount >= 1;
  const canStartGame = Boolean(currentPin) && sessionPhase === "lobby" && hasConnectedPlayers;
  const canFinishGame = Boolean(currentPin) && sessionPhase !== "completed";
  const joinUrl =
    typeof window !== "undefined" && currentPin
      ? `${window.location.origin}/?kahootPin=${encodeURIComponent(currentPin)}`
      : "";
  const qrCodeUrl = joinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(joinUrl)}`
    : "";

  const clearHostSessionState = () => {
    setPhase("pin");
    setPinSession(null);
    setSnapshot(null);
    setPinError("");
    setHostActionError("");
    setStreamState("idle");
    setLastPingAt(null);
    setLeaderboardData(null);
    setLeaderboardError("");
    setIsLeaderboardLoading(false);
    setHasCopiedJoinLink(false);
    persistPinSession(null);
  };

  const resyncPlayState = async (pin: string) => {
    try {
      const nextSnapshot = await fetchPlaySnapshot(pin);
      if (shouldResetHostSession(nextSnapshot)) {
        clearHostSessionState();
        return;
      }
      setSnapshot(nextSnapshot);
      setHostActionError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : labels.hostActionError;
      if (isPinGoneError(message)) {
        clearHostSessionState();
        return;
      }
      setHostActionError(message);
    }
  };

  const loadLeaderboard = async (pin: string) => {
    setIsLeaderboardLoading(true);
    setLeaderboardError("");

    try {
      const payload = await fetchLeaderboard(pin);
      setLeaderboardData(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : labels.leaderboardEmpty;
      setLeaderboardError(message);
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  const unlockProtectedRoute = () => {
    if (accessPin.trim() !== ACCESS_PIN) {
      setAccessError(labels.accessError);
      return;
    }
    setAccessError("");
    setAccessPin("");
    setIsAccessGranted(true);
    persistAccessGranted(true);
  };

  const handleGeneratePin = async () => {
    setPinError("");
    setHostActionError("");
    setIsPinSessionLoading(true);
    setIsPinSessionError(false);
    setPhase("pin");
    setPinSession(null);
    setSnapshot(null);
    setStreamState("idle");
    setLastPingAt(null);
    setLeaderboardData(null);
    setLeaderboardError("");
    setIsLeaderboardLoading(false);
    try {
      const nextSession = await generatePinSession();
      broadcastSessionReset();
      setPinSession(nextSession);
      setSnapshot({
        session: nextSession,
        state: {
          phase: "lobby",
          currentQuestionIndex: -1,
        },
        players: [],
      });
      setLastPingAt(null);
      setPhase("intro");
      setLeaderboardData(null);
      setLeaderboardError("");
      setHasCopiedJoinLink(false);
      void resyncPlayState(nextSession.pin);
      persistPinSession(nextSession);
    } catch {
      setIsPinSessionError(true);
      setPinError(labels.pinError);
    } finally {
      setIsPinSessionLoading(false);
    }
  };

  const copyJoinUrl = async () => {
    if (!joinUrl || typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setHasCopiedJoinLink(true);
      window.setTimeout(() => setHasCopiedJoinLink(false), 1800);
    } catch {
      setHasCopiedJoinLink(false);
    }
  };

  const triggerHostAction = async (action: KahootMiniPlayAction) => {
    if (!currentPin) {
      setHostActionError(labels.pinUnavailable);
      return;
    }
    if (action === "start" && !hasConnectedPlayers) {
      setHostActionError(labels.hostWaitingPlayers);
      return;
    }

    setIsHostActionLoading(true);
    setHostActionError("");
    try {
      await sendPlayAction({ pin: currentPin, action });
      if (action === "finish") {
        await resyncPlayState(currentPin);
        await loadLeaderboard(currentPin);
        broadcastSessionReset();
      }
    } catch (error) {
      setHostActionError(error instanceof Error ? error.message : labels.hostActionError);
    } finally {
      setIsHostActionLoading(false);
    }
  };

  useEffect(() => {
    persistPinSession(pinSession);
  }, [pinSession]);

  useEffect(() => {
    if (!pinSession?.expiresAt) return undefined;
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [pinSession?.expiresAt]);

  useEffect(() => {
    if (!pinSession || isUsablePinSession(pinSession)) return;
    setPinSession(null);
    setSnapshot(null);
    setPhase("pin");
    setStreamState("idle");
    setLastPingAt(null);
    setLeaderboardData(null);
    setLeaderboardError("");
  }, [pinSession, nowMs]);

  useEffect(() => {
    if (!currentPin || !isAccessGranted) return undefined;

    const eventSource = new EventSource(resolveStreamUrl(currentPin));
    setStreamState("connecting");

    const onConnected = () => {
      setStreamState("open");
      void resyncPlayState(currentPin);
    };

    const onSnapshot = (event: MessageEvent<string>) => {
      try {
        const nextSnapshot = JSON.parse(event.data) as KahootMiniSnapshot;
        if (shouldResetHostSession(nextSnapshot)) {
          clearHostSessionState();
          return;
        }
        setSnapshot(nextSnapshot);
        if (nextSnapshot.session?.pin) {
          setPinSession((current) => {
            if (!nextSnapshot.session?.pin) return current;
            return {
              ...(current ?? nextSnapshot.session),
              ...nextSnapshot.session,
            };
          });
        }
        setStreamState("open");
      } catch {
        setStreamState("error");
      }
    };

    const onPing = () => {
      setLastPingAt(new Date().toLocaleTimeString("vi-VN"));
      setStreamState("open");
    };

    eventSource.onopen = () => {
      setStreamState("connecting");
    };
    eventSource.onerror = () => {
      setStreamState("error");
    };
    eventSource.addEventListener("connected", onConnected as EventListener);
    eventSource.addEventListener("snapshot", onSnapshot as EventListener);
    eventSource.addEventListener("ping", onPing as EventListener);

    return () => {
      eventSource.removeEventListener("connected", onConnected as EventListener);
      eventSource.removeEventListener("snapshot", onSnapshot as EventListener);
      eventSource.removeEventListener("ping", onPing as EventListener);
      eventSource.close();
    };
  }, [currentPin, isAccessGranted]);

  useEffect(() => {
    if (!isAccessGranted || !pinSession?.pin) return;
    void resyncPlayState(pinSession.pin);
  }, [isAccessGranted, pinSession?.pin]);

  useEffect(() => {
    if (sessionPhase !== "completed") {
      if (leaderboardData || leaderboardError || isLeaderboardLoading) {
        setLeaderboardData(null);
        setLeaderboardError("");
        setIsLeaderboardLoading(false);
      }
      return;
    }

    if (!currentPin || leaderboardData || isLeaderboardLoading) return;

    void loadLeaderboard(currentPin);
  }, [
    sessionPhase,
    currentPin,
    leaderboardData,
    leaderboardError,
    isLeaderboardLoading,
  ]);

  if (!isAccessGranted) {
    return (
      <section style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <section style={pageStyle}>
          <section
            style={{
              ...panelStyle,
              maxWidth: "520px",
              margin: "8vh auto 0",
              padding: "28px",
              display: "grid",
              gap: "18px",
            }}
            aria-modal="true"
            role="dialog"
            aria-labelledby="mgn-access-title"
          >
            <div style={{ display: "grid", gap: "8px" }}>
              <div
                style={{
                  display: "inline-flex",
                  width: "fit-content",
                  alignItems: "center",
                  borderRadius: "999px",
                  background: "rgba(15, 23, 42, 0.08)",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {introEyebrow}
              </div>
              <div id="mgn-access-title" style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1.1 }}>
                {labels.accessTitle}
              </div>
              <div style={{ color: "#475569", lineHeight: 1.7 }}>{labels.accessSubtitle}</div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                unlockProtectedRoute();
              }}
              style={{ display: "grid", gap: "14px" }}
            >
              <label style={{ display: "grid", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>{labels.accessLabel}</span>
                <input
                  value={accessPin}
                  onChange={(event) => {
                    setAccessPin(event.target.value.replace(/\s+/g, ""));
                    if (accessError) setAccessError("");
                  }}
                  placeholder={labels.accessPlaceholder}
                  autoFocus
                  style={{
                    width: "100%",
                    borderRadius: "16px",
                    border: accessError
                      ? "1px solid rgba(220, 38, 38, 0.4)"
                      : "1px solid rgba(148, 163, 184, 0.35)",
                    padding: "14px 16px",
                    fontSize: "20px",
                    fontWeight: 700,
                    textAlign: "center",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </label>

              {accessError ? (
                <div style={{ color: "#b91c1c", fontSize: "14px", fontWeight: 700 }}>{accessError}</div>
              ) : null}

              <button type="submit" className="ds-btn ds-btn--primary ds-btn--md">
                {labels.accessSubmit}
              </button>
            </form>
          </section>
        </section>
      </section>
    );
  }

  return (
    <section style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <section style={pageStyle}>
        <section style={stackStyle}>
          <section style={panelStyle}>
            <div
              style={{
                display: "grid",
                gap: "18px",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: "10px" }}>
                <div
                  style={{
                    display: "inline-flex",
                    width: "fit-content",
                    alignItems: "center",
                    borderRadius: "999px",
                    background: "rgba(15, 23, 42, 0.08)",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {introEyebrow}
                </div>
                <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
                <div style={{ maxWidth: "56ch", color: "#475569", fontSize: "15px", lineHeight: 1.6 }}>
                  {subtitle}
                </div>
              </div>

              <div
                style={{
                  borderRadius: "18px",
                  background: "linear-gradient(135deg, #0f172a 0%, #0f766e 100%)",
                  color: "#fff",
                  padding: "18px",
                  display: "grid",
                  gap: "10px",
                }}
              >
                <div style={{ fontSize: "12px", opacity: 0.82, textTransform: "uppercase" }}>{labels.pinCode}</div>
                <div style={{ fontSize: "34px", fontWeight: 800, letterSpacing: "0.1em" }}>
                  {currentPin || "......"}
                </div>
                <div style={{ fontSize: "14px", opacity: 0.88 }}>
                  {pinSession?.expiresAt
                    ? `${labels.pinCountdown}: ${formatCountdown(pinSession.expiresAt, nowMs)}`
                    : labels.pinLocked}
                </div>
                {pinSession?.expiresAt ? (
                  <div style={{ fontSize: "13px", opacity: 0.78 }}>
                    {labels.pinExpiresAt}: {formatSessionTime(pinSession.expiresAt)}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {phase === "pin" && !pinSession ? (
            <section style={panelStyle}>
              <div
                style={{
                  display: "grid",
                  gap: "18px",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  alignItems: "start",
                }}
              >
                <div style={{ display: "grid", gap: "10px" }}>
                  <div style={{ fontSize: "24px", fontWeight: 800 }}>{labels.pinTitle}</div>
                  <div style={{ color: "#475569", lineHeight: 1.7 }}>{labels.pinSubtitle}</div>
                  <div
                    style={{
                      borderRadius: "18px",
                      background: "rgba(15, 23, 42, 0.04)",
                      padding: "14px 16px",
                      color: "#334155",
                      lineHeight: 1.6,
                    }}
                  >
                    {isPinSessionLoading
                      ? labels.pinLoading
                      : isPinSessionError
                      ? labels.pinUnavailable
                      : labels.pinHint}
                  </div>
                </div>

                <section style={{ display: "grid", gap: "14px", alignContent: "start" }}>
                  {pinError ? (
                    <div style={{ color: "#b91c1c", fontSize: "14px", fontWeight: 700 }}>{pinError}</div>
                  ) : null}

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="ds-btn ds-btn--primary ds-btn--md"
                      onClick={() => {
                        void handleGeneratePin();
                      }}
                      disabled={isPinSessionLoading}
                    >
                      {labels.pinGenerate}
                    </button>
                  </div>
                </section>
              </div>
            </section>
          ) : null}

          {pinSession ? (
            <section style={panelStyle}>
              <div style={{ display: "grid", gap: "18px" }}>
                <div style={{ display: "grid", gap: "8px" }}>
                  <div style={{ fontSize: "24px", fontWeight: 800 }}>{labels.hostPanelTitle}</div>
                  <div style={{ color: "#475569", lineHeight: 1.7 }}>{labels.hostPanelSubtitle}</div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  }}
                >
                  <div className="ds-card" style={{ padding: "14px" }}>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>{labels.pinLabel}</div>
                    <div style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "0.08em" }}>{currentPin}</div>
                  </div>
                  <div className="ds-card" style={{ padding: "14px" }}>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>{labels.sessionPhase}</div>
                    <div style={{ fontSize: "18px", fontWeight: 800 }}>{phaseLabel}</div>
                  </div>
                  <div className="ds-card" style={{ padding: "14px" }}>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>{labels.playersConnected}</div>
                    <div style={{ fontSize: "24px", fontWeight: 800 }}>{connectedPlayersCount}</div>
                  </div>
                  <div className="ds-card" style={{ padding: "14px" }}>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>{labels.realtimeStatus}</div>
                    <div style={{ fontSize: "18px", fontWeight: 800 }}>{realtimeLabel}</div>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: "18px",
                    background: "rgba(15, 23, 42, 0.04)",
                    padding: "14px 16px",
                    color: "#334155",
                    lineHeight: 1.6,
                  }}
                >
                  {connectedPlayersCount > 0
                    ? `${connectedPlayersCount} ${labels.hostConnectedUsers}.`
                    : labels.hostWaitingPlayers}
                  {lastPingAt ? ` ${labels.hostLastPing}: ${lastPingAt}.` : ""}
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="ds-btn ds-btn--primary ds-btn--md"
                    disabled={isHostActionLoading || !currentPin || !canStartGame}
                    onClick={() => {
                      void triggerHostAction("start");
                    }}
                  >
                    {isHostActionLoading && canStartGame ? labels.hostStarting : labels.hostStart}
                  </button>
                  <button
                    type="button"
                    className="ds-btn ds-btn--secondary ds-btn--md"
                    disabled={isHostActionLoading || !currentPin || !canFinishGame}
                    onClick={() => {
                      void triggerHostAction("finish");
                    }}
                  >
                    {isHostActionLoading && canFinishGame ? labels.hostFinishing : labels.hostFinish}
                  </button>
                  <button
                    type="button"
                    className="ds-btn ds-btn--secondary ds-btn--md"
                    disabled={isPinSessionLoading}
                    onClick={() => {
                      void handleGeneratePin();
                    }}
                  >
                    {labels.pinGenerate}
                  </button>
                </div>

                {hostActionError ? (
                  <div style={{ color: "#b91c1c", fontSize: "14px", fontWeight: 700 }}>{hostActionError}</div>
                ) : null}
              </div>
            </section>
          ) : null}

          {pinSession && joinUrl ? (
            <section style={panelStyle}>
              <div
                style={{
                  display: "grid",
                  gap: "18px",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "grid", gap: "10px" }}>
                  <div style={{ fontSize: "24px", fontWeight: 800 }}>{labels.hostQrTitle}</div>
                  <div style={{ color: "#475569", lineHeight: 1.7 }}>{labels.hostQrSubtitle}</div>
                  <div style={{ display: "grid", gap: "8px" }}>
                    <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 700 }}>{labels.hostQrLinkLabel}</div>
                    <div
                      style={{
                        borderRadius: "14px",
                        border: "1px solid rgba(148, 163, 184, 0.3)",
                        background: "rgba(248, 250, 252, 0.96)",
                        padding: "12px 14px",
                        color: "#0f172a",
                        fontSize: "14px",
                        lineHeight: 1.6,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {joinUrl}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button type="button" className="ds-btn ds-btn--secondary ds-btn--md" onClick={() => void copyJoinUrl()}>
                      {hasCopiedJoinLink ? labels.hostQrCopied : labels.hostQrCopy}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div
                    style={{
                      borderRadius: "24px",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,249,255,0.92) 100%)",
                      border: "1px solid rgba(148, 163, 184, 0.24)",
                      boxShadow: "0 18px 36px rgba(15, 23, 42, 0.08)",
                      padding: "16px",
                    }}
                  >
                    <img
                      src={qrCodeUrl}
                      alt={labels.hostQrTitle}
                      style={{
                        display: "block",
                        width: "min(240px, 100%)",
                        height: "auto",
                        borderRadius: "18px",
                        background: "#fff",
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {pinSession ? (
            <section style={panelStyle}>
              <div style={{ display: "grid", gap: "16px" }}>
                <div style={{ fontSize: "22px", fontWeight: 800 }}>{labels.hostPlayersTitle}</div>

                {connectedPlayersCount === 0 ? (
                  <div
                    style={{
                      borderRadius: "18px",
                      background: "rgba(15, 23, 42, 0.04)",
                      padding: "16px",
                      color: "#475569",
                    }}
                  >
                    {labels.hostPlayersEmpty}
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    {connectedPlayers.map((player) => (
                      <section key={player.id ?? player.name} className="ds-card" style={{ padding: "16px" }}>
                        <div style={{ display: "grid", gap: "10px" }}>
                          <div style={{ fontSize: "20px", fontWeight: 800 }}>{player.name ?? "-"}</div>
                          <div style={{ display: "grid", gap: "6px", color: "#475569", fontSize: "14px" }}>
                            <div>
                              {labels.playerScore}: <strong>{player.score ?? 0}</strong>
                            </div>
                            <div>
                              {labels.playerAnswers}: <strong>{player.answersCount ?? 0}</strong>
                            </div>
                            <div>
                              {labels.playerCorrect}: <strong>{player.correctAnswers ?? 0}</strong>
                            </div>
                            <div>
                              {labels.playerJoinedAt}: <strong>{getPlayerJoinedAt(player)}</strong>
                            </div>
                          </div>
                        </div>
                      </section>
                    ))}
                  </div>
                )}

                {topPlayers.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    {topPlayers.slice(0, 2).map((player, index) => (
                      <section key={`${player.id ?? player.name}-${index}`} className="ds-card" style={{ padding: "16px" }}>
                        <div style={{ display: "grid", gap: "8px" }}>
                          <div style={{ fontSize: "13px", color: "#64748b" }}>
                            {index === 0 ? labels.topOne : labels.topTwo}
                          </div>
                          <div style={{ fontSize: "20px", fontWeight: 800 }}>{player.name ?? "-"}</div>
                          <div style={{ color: "#475569" }}>
                            {labels.playerScore}: <strong>{player.score ?? 0}</strong>
                          </div>
                        </div>
                      </section>
                    ))}
                  </div>
                ) : null}

                {sessionPhase === "completed" ? (
                  <section
                    style={{
                      display: "grid",
                      gap: "12px",
                      borderRadius: "18px",
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      background: "#fff",
                      padding: "16px",
                    }}
                  >
                    <div style={{ display: "grid", gap: "6px" }}>
                      <div style={{ fontSize: "20px", fontWeight: 800 }}>{labels.leaderboardTitle}</div>
                      <div style={{ color: "#475569", lineHeight: 1.6 }}>{labels.leaderboardSubtitle}</div>
                    </div>

                    {isLeaderboardLoading ? (
                      <div style={{ color: "#475569" }}>{labels.leaderboardLoading}</div>
                    ) : null}

                    {leaderboardError ? (
                      <div style={{ color: "#b91c1c", fontWeight: 700 }}>{leaderboardError}</div>
                    ) : null}

                    {leaderboard.length > 0 ? (
                      <div style={{ display: "grid", gap: "10px" }}>
                        {leaderboard.map((player, index) => (
                          <article
                            key={player.id ?? `${player.name ?? "player"}-${index}`}
                            style={{
                              borderRadius: "16px",
                              background: "rgba(15, 23, 42, 0.04)",
                              padding: "14px 16px",
                              display: "grid",
                              gap: "6px",
                            }}
                          >
                            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 700 }}>#{index + 1}</div>
                            <div style={{ fontSize: "18px", fontWeight: 800 }}>{player.name ?? "-"}</div>
                            <div style={{ color: "#334155" }}>
                              {labels.playerScore}: <strong>{player.score ?? 0}</strong>
                            </div>
                            <div style={{ color: "#334155" }}>
                              {labels.playerCorrect}: <strong>{player.correctAnswers ?? 0}</strong>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : !isLeaderboardLoading && !leaderboardError ? (
                      <div style={{ color: "#475569" }}>{labels.leaderboardEmpty}</div>
                    ) : null}
                  </section>
                ) : null}
              </div>
            </section>
          ) : null}
        </section>
      </section>
    </section>
  );
};
