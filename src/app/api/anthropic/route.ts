import { NextRequest } from "next/server";
import Anthropic from '@anthropic-ai/sdk';

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  console.log("Received request headers:", Object.fromEntries(request.headers.entries()));
  
  const body = await request.json();
  console.log("Received request body:", body);
  
  const { messages, systemPrompt } = body;
  const anthropicKey = request.headers.get('x-anthropic-key');

  if (!anthropicKey) {
    console.error("Missing Anthropic API key in request headers");
    return new Response(
      JSON.stringify({
        error: "Missing Anthropic API key",
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
    const client = new Anthropic({
      apiKey: anthropicKey
    });

    // Create a TransformStream to convert the SDK stream to SSE
    const encoder = new TextEncoder();
    const stream = new TransformStream({
      async transform(chunk, controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
    });

    const writer = stream.writable.getWriter();
    
    // Start streaming response
    const response = new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    // Process the message stream in the background
    (async () => {
      try {
        const messageStream = await client.messages.create({
          max_tokens: 4096,
          messages: messages.map((msg: Message) => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          })),
          model: 'claude-3-5-sonnet-latest',
          system: systemPrompt,
          stream: true,
        });

        for await (const messageStreamEvent of messageStream) {
          await writer.write(messageStreamEvent);
        }
      } catch (error) {
        console.error('Error in message stream:', error);
        const errorMessage = {
          type: 'error',
          error: error instanceof Error ? error.message : String(error)
        };
        await writer.write(errorMessage);
      } finally {
        await writer.close();
      }
    })();

    return response;
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to call Anthropic API",
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