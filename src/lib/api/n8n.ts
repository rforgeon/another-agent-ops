interface N8nConfig {
  apiKey: string;
  baseUrl: string;
}

interface ApiError {
  error: string;
  status?: number;
  statusText?: string;
  details?: string;
}

interface N8nResponse<T> {
  data: T;
}

class N8nApiClient {
  private config: N8nConfig;

  constructor(config: N8nConfig) {
    this.config = config;
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<N8nResponse<T>> {
    const url = new URL(`/api/n8n/${endpoint}`, window.location.origin);
    url.searchParams.set("apiKey", this.config.apiKey);
    url.searchParams.set("baseUrl", this.config.baseUrl);

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;
      throw new Error(
        `API request failed: ${error.statusText || response.statusText}\n${
          error.details || error.error || "Unknown error"
        }`
      );
    }

    return data as N8nResponse<T>;
  }

  async getWorkflows() {
    return this.fetch<any[]>("workflows");
  }

  async getWorkflow(id: string) {
    return this.fetch<any>(`workflows/${id}`);
  }

  async updateWorkflow(id: string, data: any) {
    return this.fetch<any>(`workflows/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async activateWorkflow(id: string) {
    return this.fetch<any>(`workflows/${id}/activate`, {
      method: "POST",
    });
  }

  async deactivateWorkflow(id: string) {
    return this.fetch<any>(`workflows/${id}/deactivate`, {
      method: "POST",
    });
  }

  async getExecutions(workflowId?: string) {
    const endpoint = workflowId 
      ? `executions?workflowId=${workflowId}`
      : "executions";
    return this.fetch<any[]>(endpoint);
  }

  async getExecution(id: string) {
    return this.fetch<any>(`executions/${id}`);
  }

  async createWorkflow(workflowData: any) {
    return this.fetch<any>("workflows", {
      method: "POST",
      body: JSON.stringify(workflowData),
    });
  }
}

export function createN8nClient(config: N8nConfig) {
  return new N8nApiClient(config);
} 