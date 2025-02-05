import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get("apiKey");
  const baseUrl = searchParams.get("baseUrl");

  if (!apiKey || !baseUrl) {
    return new Response("Missing API key or base URL", { status: 400 });
  }

  // Remove trailing slash from baseUrl if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const url = `${cleanBaseUrl}/api/v1/${path}`;

  try {
    console.log("Fetching from n8n:", url);
    const response = await fetch(url, {
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("n8n API error:", {
        status: response.status,
        statusText: response.statusText,
      });
      const errorText = await response.text();
      console.error("Error response:", errorText);
      
      return new Response(
        JSON.stringify({
          error: "n8n API request failed",
          status: response.status,
          statusText: response.statusText,
          details: errorText,
        }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const rawData = await response.json();
    
    // Transform the response to include data property
    const transformedData = {
      data: Array.isArray(rawData) ? rawData : rawData.data || rawData,
    };

    return new Response(JSON.stringify(transformedData), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch data",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join("/");
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get("apiKey");
  const baseUrl = searchParams.get("baseUrl");

  if (!apiKey || !baseUrl) {
    return new Response("Missing API key or base URL", { status: 400 });
  }

  try {
    const body = await request.json();
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    const url = `${cleanBaseUrl}/api/v1/${path}`;

    console.log("Creating workflow in n8n:", url);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("n8n API error:", {
        status: response.status,
        statusText: response.statusText,
      });
      const errorText = await response.text();
      console.error("Error response:", errorText);
      
      return new Response(
        JSON.stringify({
          error: "n8n API request failed",
          status: response.status,
          statusText: response.statusText,
          details: errorText,
        }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const rawData = await response.json();
    
    // Transform the response to include data property
    const transformedData = {
      data: rawData.data || rawData,
    };

    return new Response(JSON.stringify(transformedData), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to create workflow",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
} 