export type KahootMiniPinSession = {
  id: string;
  pin: string;
  quizId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

type KahootMiniPinResponse = {
  session: KahootMiniPinSession;
};

type KahootMiniPlaySnapshotResponse = {
  snapshot?: KahootMiniSnapshot;
};

type ApiErrorPayload = {
  message?: string;
};

export type GeneratePinSessionInput = {
  questionIds?: Array<number | string>;
};

export type KahootMiniState = {
  phase?: "lobby" | "question_live" | "question_closed" | "completed" | string;
  currentQuestionIndex?: number;
  totalQuestions?: number;
  closeReason?: "manual_finish" | "auto_completed" | "host_replaced" | "expired" | string;
};

export type KahootMiniPlayerSnapshot = {
  id?: string;
  name?: string;
  joinedAt?: string;
  score?: number;
  correctAnswers?: number;
  answersCount?: number;
  isOnline?: boolean;
};

export type KahootMiniSnapshot = {
  session?: KahootMiniPinSession;
  state?: KahootMiniState;
  players?: KahootMiniPlayerSnapshot[];
  joinedPlayersCount?: number;
  connectedPlayerIds?: string[];
  connectedPlayersCount?: number;
  topPlayers?: KahootMiniPlayerSnapshot[];
};

export const pinSessionQueryKey = ["kahoot-mini", "pin-session"] as const;

const normalizeApiBaseUrl = (value?: string | null) => value?.trim().replace(/\/+$/, "") ?? "";

const isLocalHostname = (value: string) => /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(value);

const isLocalApiBaseUrl = (value: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(value);

export const resolveApiBaseUrl = () => {
  const browserLocation = typeof window !== "undefined" ? window.location : null;
  const isLocalPage = browserLocation ? isLocalHostname(browserLocation.hostname) : false;

  if (typeof document !== "undefined") {
    const metaAuthBaseUrl = normalizeApiBaseUrl(
      document.querySelector('meta[name="auth-base-url"]')?.getAttribute("content")
    );

    if (metaAuthBaseUrl && (!isLocalApiBaseUrl(metaAuthBaseUrl) || isLocalPage)) {
      return metaAuthBaseUrl;
    }
  }

  if (isLocalPage) {
    return "http://localhost:7272";
  }

  return "";
};

const requireApiBaseUrl = () => {
  const baseUrl = resolveApiBaseUrl();
  if (!baseUrl) {
    throw new Error("API base URL is not configured for this environment.");
  }
  return baseUrl;
};

const readApiError = async (response: Response, fallbackMessage: string) => {
  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
  return payload.message ?? fallbackMessage;
};

export const generatePinSession = async (
  input?: GeneratePinSessionInput
): Promise<KahootMiniPinSession> => {
  const response = await fetch(`${requireApiBaseUrl()}/api/kahoot-mini/pin?ts=${Date.now()}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "MGN Kahoot Mini React",
      hostName: "Admin",
      maxPlayers: 50,
      questionIds: Array.isArray(input?.questionIds) && input.questionIds.length > 0 ? input.questionIds : undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(
      await readApiError(response, `PIN session request failed with status ${response.status}`)
    );
  }

  const payload = (await response.json()) as KahootMiniPinResponse;

  if (!payload?.session?.pin) {
    throw new Error("PIN session payload is missing `session.pin`");
  }

  return payload.session;
};

export const fetchPinSession = generatePinSession;

export const fetchPlaySnapshot = async (pin: string): Promise<KahootMiniSnapshot> => {
  const response = await fetch(`${requireApiBaseUrl()}/api/kahoot-mini/play?pin=${encodeURIComponent(pin)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      await readApiError(response, `Play snapshot request failed with status ${response.status}`)
    );
  }

  const payload = (await response.json()) as KahootMiniPlaySnapshotResponse;

  if (!payload?.snapshot) {
    throw new Error("Play snapshot payload is missing `snapshot`");
  }

  return payload.snapshot;
};
