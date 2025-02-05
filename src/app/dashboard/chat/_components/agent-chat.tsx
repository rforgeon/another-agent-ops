import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useN8n } from "@/lib/api/n8n-provider";
import { Sparkles, Send, Plus } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentCreationStep {
  question: string;
  key: "goal" | "tools" | "personality";
}

const AGENT_CREATION_STEPS: AgentCreationStep[] = [
  {
    question: "What is the main goal or purpose of this agent?",
    key: "goal",
  },
  {
    question: "What tools or APIs should the agent have access to? (e.g., web search, calculator, etc.)",
    key: "tools",
  },
  {
    question: "How would you describe the agent's personality or communication style?",
    key: "personality",
  },
];

export function AgentChat() {
  const { client, anthropicKey } = useN8n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [agentConfig, setAgentConfig] = useState<Record<string, string>>({});

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput("");

    if (isCreatingAgent) {
      const step = AGENT_CREATION_STEPS[currentStep];
      setAgentConfig(prev => ({ ...prev, [step.key]: input }));

      if (currentStep < AGENT_CREATION_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
        const nextStep = AGENT_CREATION_STEPS[currentStep + 1];
        setMessages(prev => [...prev, { role: "assistant" as const, content: nextStep.question }]);
      } else {
        // Create the n8n workflow with an agent node
        try {
          const workflowData = {
            name: `Claude Agent: ${agentConfig.goal}`,
            nodes: [
              {
                parameters: {
                  anthropicApiKey: { "__ql": true, "__ql_name": "Anthropic API Key" },
                  model: "claude-3-sonnet-20240229",
                  systemMessage: `You are an AI assistant with the following configuration:
Goal: ${agentConfig.goal}
Tools: ${agentConfig.tools}
Personality: ${agentConfig.personality}

Please help users achieve their goals while maintaining the specified personality and using the available tools.`,
                },
                name: "Claude Agent",
                type: "@n8n/n8n-nodes-langchain.agent",
                typeVersion: 1,
                position: [100, 100],
              }
            ],
            connections: {},
            settings: {
              saveExecutionProgress: true,
              saveManualExecutions: true,
            },
          };

          const response = await client?.createWorkflow(workflowData);
          
          setMessages(prev => [
            ...prev,
            {
              role: "assistant" as const,
              content: `I've created a new n8n workflow with a Claude agent! The workflow has been configured with your specifications:

- Goal: ${agentConfig.goal}
- Tools: ${agentConfig.tools}
- Personality: ${agentConfig.personality}

You can now find this workflow in your n8n instance and customize it further if needed.`
            }
          ]);
        } catch (error) {
          console.error("Failed to create workflow:", error);
          setMessages(prev => [
            ...prev,
            {
              role: "assistant" as const,
              content: "I apologize, but I encountered an error while creating the workflow. Please make sure your n8n instance is properly configured and try again."
            }
          ]);
        }

        setIsCreatingAgent(false);
        setCurrentStep(0);
        setAgentConfig({});
      }
    }
  };

  const startAgentCreation = () => {
    if (!anthropicKey) {
      setMessages([
        {
          role: "assistant" as const,
          content: "Please add your Anthropic API key in the settings page before creating an agent."
        }
      ]);
      return;
    }

    setIsCreatingAgent(true);
    setMessages([
      {
        role: "assistant" as const,
        content: AGENT_CREATION_STEPS[0].question
      }
    ]);
  };

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Chat header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">n8n Agent Chat</h2>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "assistant" ? "justify-start" : "justify-end"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "assistant"
                  ? "bg-gray-100"
                  : "bg-blue-500 text-white"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      {messages.length === 0 && (
        <div className="p-4 flex justify-center">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={startAgentCreation}
          >
            <Sparkles className="w-4 h-4" />
            Create New Agent
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isCreatingAgent
                ? AGENT_CREATION_STEPS[currentStep].question
                : "Type your message..."
            }
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
          />
          <Button onClick={handleSend}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
} 