import { resolveApiBaseUrl } from "./pin-session";

export type KahootMiniPlayAction = "start" | "next" | "finish";

type PlayActionParams = {
  pin: string;
  action: KahootMiniPlayAction;
};

type ApiErrorPayload = {
  message?: string;
};

const readApiError = async (response: Response, fallbackMessage: string) => {
  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
  return payload.message ?? fallbackMessage;
};

export const sendPlayAction = async ({ pin, action }: PlayActionParams): Promise<void> => {
  const response = await fetch(`${resolveApiBaseUrl()}/api/kahoot-mini/play`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pin,
      action,
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, `Play action failed with status ${response.status}`));
  }
};
