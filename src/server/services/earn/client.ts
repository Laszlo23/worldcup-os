function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export type EarnListing = {
  id: string;
  title: string;
  slug: string;
  type: "bounty" | "project" | "hackathon";
  deadline: string;
  rewardAmount: number;
  token: string;
  agentAccess: "AGENT_ALLOWED" | "AGENT_ONLY" | string;
  status: string;
  compensationType?: string;
};

export type EarnListingDetails = EarnListing & {
  description?: string;
  eligibilityQuestions?: { question: string; type?: string; required?: boolean }[];
};

export type EarnSubmissionInput = {
  listingId: string;
  link: string;
  tweet?: string;
  otherInfo: string;
  eligibilityAnswers?: { question: string; answer: string }[];
  ask?: number | null;
  telegram?: string;
};

export type EarnCommentInput = {
  refType: "BOUNTY" | "PROJECT" | "HACKATHON";
  refId: string;
  message: string;
  pocId?: string;
  replyToId?: string;
  replyToUserId?: string;
};

export class EarnClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(params?: { baseUrl?: string; apiKey?: string }) {
    this.baseUrl = (params?.baseUrl ?? optional("SUPERTEAM_EARN_BASE_URL", "https://superteam.fun")).replace(/\/$/, "");
    this.apiKey = params?.apiKey ?? optional("SUPERTEAM_EARN_API_KEY");
  }

  hasCredentials(): boolean {
    return Boolean(this.apiKey);
  }

  private headers(): Record<string, string> {
    if (!this.apiKey) throw new Error("SUPERTEAM_EARN_API_KEY is required");
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers(), ...(init?.headers ?? {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = typeof body === "object" && body !== null && "message" in body ? String(body.message) : res.statusText;
      throw new Error(`Earn API ${res.status}: ${message}`);
    }
    return body as T;
  }

  async listLiveListings(params?: { take?: number; type?: string; deadline?: string }): Promise<EarnListing[]> {
    const qs = new URLSearchParams();
    if (params?.take) qs.set("take", String(params.take));
    if (params?.type) qs.set("type", params.type);
    if (params?.deadline) qs.set("deadline", params.deadline);
    const suffix = qs.size ? `?${qs.toString()}` : "";
    const data = await this.request<EarnListing[] | { error?: unknown }>(`/api/agents/listings/live${suffix}`);
    if (!Array.isArray(data)) throw new Error("Earn listings response was not an array");
    return data;
  }

  async getListingDetails(slug: string): Promise<EarnListingDetails> {
    return this.request<EarnListingDetails>(`/api/agents/listings/details/${encodeURIComponent(slug)}`);
  }

  async createSubmission(input: EarnSubmissionInput): Promise<unknown> {
    return this.request("/api/agents/submissions/create", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateSubmission(input: EarnSubmissionInput): Promise<unknown> {
    return this.request("/api/agents/submissions/update", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async listComments(listingId: string, params?: { skip?: number; take?: number }): Promise<unknown> {
    const qs = new URLSearchParams();
    if (params?.skip !== undefined) qs.set("skip", String(params.skip));
    if (params?.take !== undefined) qs.set("take", String(params.take));
    const suffix = qs.size ? `?${qs.toString()}` : "";
    return this.request(`/api/agents/comments/${encodeURIComponent(listingId)}${suffix}`);
  }

  async createComment(input: EarnCommentInput): Promise<unknown> {
    return this.request("/api/agents/comments/create", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
}

export const earnClient = new EarnClient();
