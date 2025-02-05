import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const searchParams = request.nextUrl.searchParams;
  const apiKey = searchParams.get("apiKey");
  const baseUrl = searchParams.get("baseUrl")?.replace(/\/$/, "");

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
    const url = `${baseUrl}/api/v1/workflows/${params.id}/deactivate`;
    console.log("Deactivating workflow at:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-N8N-API-KEY": apiKey,
      },
    });

    const rawData = await response.json();
    console.log("Raw n8n workflow deactivation response:", rawData);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to deactivate workflow",
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
    const transformedData = {
      data: rawData.data || rawData,
    };

    console.log("Transformed workflow deactivation response:", transformedData);

    return new Response(JSON.stringify(transformedData), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error deactivating workflow:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to deactivate workflow",
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