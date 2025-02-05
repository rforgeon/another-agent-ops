import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useN8n } from "@/lib/api/n8n-provider";
import { Sparkles, Send, Check, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestedUpdate?: {
    workflow: any;
    description: string;
  };
  id?: string;
}

const MASTER_PROMPT = `You are an expert n8n workflow developer, specializing in creating and configuring AI/LLM agents using nodes from the n8n Langchain integration. Your role is to help users build and configure n8n workflows that utilize these nodes effectively.

When suggesting workflow changes:
1. Analyze the user's request carefully
2. Explain the changes you're going to make in a clear, step-by-step format
3. Include the complete updated workflow configuration in your response, wrapped in \`\`\`json\`\`\` code blocks
4. The JSON should contain the full workflow data structure under a "workflow" key
5. Make sure to preserve all existing workflow properties (id, name, settings, etc.)
6. Format your response with clear sections:
   - Explanation of changes
   - Step-by-step modifications
   - JSON configuration block
   - Next steps or additional suggestions

When building or updating agents, use these core AI/LLM nodes:
- @n8n/n8n-nodes-langchain.agent: Orchestrate tasks with LangChain
- @n8n/n8n-nodes-langchain.chatTrigger: Initiate workflows from chat messages
- @n8n/n8n-nodes-langchain.conversationalRetrievalQA: Combine conversation context with retrieval QA
- @n8n/n8n-nodes-langchain.llm: Interface with language models
- @n8n/n8n-nodes-langchain.llmChain: Orchestrate sequential language processing
- @n8n/n8n-nodes-langchain.prompt: Manage dynamic prompts
- @n8n/n8n-nodes-langchain.retrievalQA: Answer questions using retrieved documents

For integrations with external services, you have access to a wide range of nodes including:
- Communication: Discord, Slack, Email, Intercom, SendGrid, Mailchimp
- Documents: Google Drive, Dropbox, OneDrive, Box, SharePoint
- Databases: MongoDB, MySQL, PostgreSQL, Airtable, Notion
- CRM/Sales: Salesforce, HubSpot, Pipedrive, Zendesk
- Project Management: Jira, Asana, Trello, ClickUp, Monday.com
- Social Media: Twitter, LinkedIn, Facebook, Instagram
- Development: GitHub, GitLab, Bitbucket
- And many more specialized integration nodes

Best Practices:
1. Start with a Chat Trigger node (@n8n/n8n-nodes-langchain.chatTrigger) for chat-based workflows
2. Position nodes logically in the workflow layout:
   - Input/trigger nodes at the top
   - Processing/transformation nodes in the middle
   - Output/action nodes at the bottom
3. Configure proper connections between nodes:
   - Ensure data flow matches the expected input/output formats
   - Use Set node for data transformation when needed
4. Implement error handling:
   - Add Error Trigger nodes for failure scenarios
   - Configure retries for external service calls
   - Add logging for debugging purposes
5. Consider performance and cost:
   - Cache results when possible
   - Use batching for bulk operations
   - Implement rate limiting for API calls

When providing responses:
1. Use clear, structured formatting with headers and sections
2. Include code blocks with proper syntax highlighting
3. Explain technical concepts in user-friendly language
4. Provide context for why each node and configuration is chosen
5. Suggest optimizations and improvements
6. Include example data structures when relevant

Remember to maintain a helpful and informative tone while providing practical, implementable solutions that follow n8n best practices.`;

export function AgentChat() {
  const { client, anthropicKey } = useN8n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle scroll events to detect user interaction
  const handleScroll = () => {
    if (!messagesContainerRef.current || !isStreaming) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    setShouldAutoScroll(isAtBottom);
  };

  // Auto-scroll effect during streaming
  useEffect(() => {
    if (isStreaming && shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, isStreaming, shouldAutoScroll]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing || !anthropicKey) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);
    setIsStreaming(true);

    let streamedContent = '';
    const tempMessageId = Date.now().toString();

    // Add a temporary message for streaming
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '',
      id: tempMessageId
    }]);

    try {
      const response = await fetch('/api/anthropic', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-anthropic-key': anthropicKey
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: input
            }
          ],
          systemPrompt: MASTER_PROMPT
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body reader available');
      }

      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '' || !line.startsWith('data: ')) continue;

            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);
              
              switch (event.type) {
                case 'content_block_delta':
                  if (event.delta?.text) {
                    streamedContent += event.delta.text;
                    setMessages(prev => prev.map(msg => 
                      msg.id === tempMessageId 
                        ? { ...msg, content: streamedContent }
                        : msg
                    ));
                  }
                  break;

                case 'error':
                  throw new Error(event.error);
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Update the final message
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessageId 
          ? {
              role: 'assistant',
              content: streamedContent,
              suggestedUpdate: extractWorkflowConfig(streamedContent)
            }
          : msg
      ));

    } catch (error) {
      console.error("Error processing message:", error);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I encountered an error while processing your request. Please try again."
      }]);
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsProcessing(false);
      setIsStreaming(false);
    }
  };

  const extractWorkflowConfig = (content: string): { workflow: any; description: string } | undefined => {
    try {
      // Look for JSON code blocks
      const matches = content.match(/```json\n([\s\S]*?)\n```/);
      if (!matches) return undefined;

      const jsonStr = matches[1];
      const config = JSON.parse(jsonStr);

      // Extract the description from the text before the JSON
      const descriptionMatch = content.match(/Explanation:([\s\S]*?)(?=Step-by-step|```json)/);
      const description = descriptionMatch ? descriptionMatch[1].trim() : "";

      if (config.workflow) {
        return {
          workflow: config.workflow,
          description: description
        };
      }
    } catch (error) {
      console.error("Error extracting workflow config:", error);
    }
    return undefined;
  };

  const applyWorkflowUpdate = async (update: any) => {
    try {
      setIsProcessing(true);
      
      // Create workflow data with only the required properties
      const workflowData = {
        name: update.name || "New Workflow",
        nodes: update.nodes || [],
        connections: update.connections || {},
        settings: {
          saveExecutionProgress: true,
          saveManualExecutions: true,
          saveDataErrorExecution: "all",
          saveDataSuccessExecution: "all",
          timezone: "America/New_York",
          ...update.settings
        },
        staticData: update.staticData || null
      };

      const response = await client?.createWorkflow(workflowData);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "✓ Workflow has been created successfully! You can now find it in your n8n instance."
      }]);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error applying workflow update:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "❌ Failed to create the workflow. Please check your n8n instance configuration and try again."
      }]);
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!anthropicKey) {
    return (
      <Card className="p-4">
        <p className="text-center text-muted-foreground">
          Please add your Anthropic API key in the settings page to enable workflow chat assistance.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Chat header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Agent Chat</h2>
        <p className="text-sm text-muted-foreground">
          Get answers about your current agents or build a new one!
        </p>
      </div>

      {/* Chat messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="text-left text-muted-foreground text-sm">
            Ask me anything about building agents on n8n. I can help you:
            <ul className="mt-2 list-disc text-left pl-6 space-y-1">
              <li>Design an agent architecture</li>
              <li>Set up AI agents workflows</li>
              <li>Connect to any internal tools</li>
              <li>Handle documents and memory</li>
            </ul>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "assistant" ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 text-sm ${
                message.role === "assistant"
                  ? "bg-gray-100"
                  : "bg-blue-500 text-white"
              }`}
            >
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content.split('```').map((part, i) => {
                  if (i % 2 === 0) {
                    return <span key={i}>{part}</span>;
                  } else {
                    const [lang, ...code] = part.split('\n');
                    const codeContent = code.join('\n');
                    return (
                      <div key={i} className="my-2">
                        {lang && (
                          <div className="bg-gray-800 text-gray-200 text-xs px-3 py-1 rounded-t">
                            {lang}
                          </div>
                        )}
                        <pre className={`bg-gray-800 text-gray-200 p-3 overflow-x-auto text-xs ${lang ? 'rounded-b' : 'rounded'}`}>
                          <code>{codeContent || lang}</code>
                        </pre>
                      </div>
                    );
                  }
                })}
              </div>
              {message.suggestedUpdate?.workflow && (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex items-center gap-1 bg-slate-600 hover:bg-slate-700 text-white font-medium shadow-sm"
                    onClick={() => {
                      if (message.suggestedUpdate?.workflow) {
                        applyWorkflowUpdate(message.suggestedUpdate.workflow);
                        scrollToBottom();
                      }
                    }}
                    disabled={isProcessing}
                  >
                    <Check className="h-4 w-4" />
                    Apply Update
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1 hover:bg-gray-100"
                    onClick={scrollToBottom}
                  >
                    <X className="h-4 w-4" />
                    Decline
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            disabled={isProcessing}
          />
          <Button 
            onClick={handleSend}
            disabled={isProcessing}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
} 