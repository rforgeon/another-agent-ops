import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const apiKey = searchParams.get("apiKey");
  const baseUrl = searchParams.get("baseUrl")?.replace(/\/$/, "");
  const workflowId = searchParams.get("workflowId");

  if (!apiKey || !baseUrl) {
    return new Response(
      JSON.stringify({
        error: "Missing required parameters",
        details: "API key and base URL are required",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const url = new URL(workflowId
      ? `${baseUrl}/api/v1/executions`
      : `${baseUrl}/api/v1/executions`);
    
    // Add query parameters
    if (workflowId) {
      url.searchParams.set("workflowId", workflowId);
    }
    url.searchParams.set("includeData", "true");

    console.log("Fetching executions from:", url.toString());

    const response = await fetch(url, {
      headers: {
        "X-N8N-API-KEY": apiKey,
      },
    });

    const rawData = await response.json();
    console.log("Raw n8n executions response:", rawData);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch executions",
          status: response.status,
          statusText: response.statusText,
          details: rawData.message || "Unknown error",
        }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Transform the response to include data property
    // Handle both array and object with results property
    const transformedData = {
      data: Array.isArray(rawData) ? rawData : rawData.data || rawData,
    };

    console.log("Transformed executions response:", transformedData);

    return new Response(JSON.stringify(transformedData), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching executions:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch executions",
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