export type Readiness = {
  ready: boolean;
  error: string | null;
};

export type ReadinessResponse = {
  status: string;
  models: Record<string, Readiness>;
};

export type AmazonPrediction = {
  rating: number;
  probabilities: number[];
};

export type Emotion = {
  label: string;
  probability: number;
};

export type GoEmotionsPrediction = {
  emotions: Emotion[];
  probabilities: Record<string, number>;
  threshold: number;
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  // Only advertise a JSON body when one is sent: a Content-Type header on a
  // GET turns every readiness poll into a preflighted CORS request.
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const getReadiness = (init?: RequestInit) =>
  request<ReadinessResponse>("/readiness", init);

export const predictAmazon = (text: string) =>
  request<AmazonPrediction>("/predict/amazon", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

export const predictEmotions = (text: string) =>
  request<GoEmotionsPrediction>("/predict/go-emotions", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
