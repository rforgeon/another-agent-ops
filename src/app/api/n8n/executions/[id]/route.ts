import { NextRequest } from "next/server";

export async function GET(
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
    const url = new URL(`${baseUrl}/api/v1/executions/${params.id}`);
    url.searchParams.set("includeData", "true");
    
    console.log("Fetching execution from:", url.toString());

    const response = await fetch(url, {
      headers: {
        "X-N8N-API-KEY": apiKey,
      },
    });

    const rawData = await response.json();
    console.log("Raw n8n execution response:", rawData);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch execution",
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

    console.log("Transformed execution response:", transformedData);

    return new Response(JSON.stringify(transformedData), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching execution:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch execution",
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