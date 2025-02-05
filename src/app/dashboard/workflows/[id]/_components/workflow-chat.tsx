import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useN8n } from "@/lib/api/n8n-provider";
import { Send, Check, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestedUpdate?: {
    workflow: {
      name: string;
      nodes: any[];
      connections: Record<string, any>;
      settings?: {
        saveExecutionProgress?: boolean;
        saveManualExecutions?: boolean;
        saveDataErrorExecution?: string;
        saveDataSuccessExecution?: string;
        executionTimeout?: number;
        timezone?: string;
      };
    };
    description: string;
  };
  id?: string;
}

interface WorkflowChatProps {
  workflowId: string;
  workflowName: string;
}

interface WorkflowContext {
  workflow: {
    data: {
      id: string;
      name: string;
      active: boolean;
      nodes: any[];
      connections: Record<string, any>;
      settings?: {
        saveExecutionProgress?: boolean;
        saveManualExecutions?: boolean;
        saveDataErrorExecution?: string;
        saveDataSuccessExecution?: string;
        executionTimeout?: number;
        timezone?: string;
      };
    };
  };
  executions: {
    data: Array<{
      id: string;
      status: string;
      startedAt: string;
      stoppedAt?: string;
      workflowId: string;
      finished: boolean;
    }>;
  };
}

interface WorkflowUpdate {
  name: string;
  nodes: any[];
  connections: Record<string, any>;
  settings?: {
    saveExecutionProgress?: boolean;
    saveManualExecutions?: boolean;
    saveDataErrorExecution?: string;
    saveDataSuccessExecution?: string;
    executionTimeout?: number;
    timezone?: string;
  };
}

export function WorkflowChat({ workflowId, workflowName }: WorkflowChatProps) {
  const { client, anthropicKey } = useN8n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [workflowContext, setWorkflowContext] = useState<WorkflowContext | null>(null);
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

  // Fetch initial workflow context
  useEffect(() => {
    async function fetchWorkflowContext() {
      if (!client) return;
      try {
        const [workflow, executions] = await Promise.all([
          client.getWorkflow(workflowId),
          client.getExecutions(workflowId)
        ]);
        
        setWorkflowContext({
          workflow: {
            data: workflow.data
          },
          executions: {
            data: executions.data || []
          }
        });

        // Set initial message with context
        setMessages([{
          role: "assistant",
          content: `Hi! I'm here to help you with the workflow "${workflowName}". I have access to the current workflow configuration and execution history. What would you like to do?`
        }]);
      } catch (error) {
        console.error("Failed to fetch workflow context:", error);
        setMessages([{
          role: "assistant",
          content: "I encountered an error while fetching the workflow data. Please try again or check your connection."
        }]);
      }
    }
    fetchWorkflowContext();
  }, [client, workflowId, workflowName]);

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
      const systemPrompt = `You are a helpful AI assistant that helps users modify their n8n workflows. You have access to the current workflow configuration and execution history.

Current workflow context:
${JSON.stringify(workflowContext, null, 2)}

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

When building or updating agents:
1. For agent connectiviety and actions, use the following types:
[
  {
    "type": "@n8n/n8n-nodes-langchain.agent",
    "description": "Agent node for orchestrating tasks with LangChain, enabling integration with various language models and decision-making processes."
  },
  {
    "type": "@n8n/n8n-nodes-langchain.chatTrigger",
    "description": "Chat Trigger node for initiating workflows based on incoming chat messages or events, enabling real-time chat interactions."
  },
  {
    "type": "@n8n/n8n-nodes-langchain.conversationalRetrievalQA",
    "description": "Conversational Retrieval QA node that combines conversational context with retrieval-based question answering to enhance user queries."
  },
  {
    "type": "@n8n/n8n-nodes-langchain.llm",
    "description": "LLM node for interfacing directly with large language models to generate text or process prompts."
  },
  {
    "type": "@n8n/n8n-nodes-langchain.llmChain",
    "description": "LLMChain node that orchestrates multiple calls to language models, enabling complex sequential language processing workflows."
  },
  {
    "type": "@n8n/n8n-nodes-langchain.prompt",
    "description": "Prompt node for managing and generating dynamic prompts, which serve as input for language model interactions."
  },
  {
    "type": "@n8n/n8n-nodes-langchain.retrievalQA",
    "description": "Retrieval QA node that retrieves relevant documents and leverages language models to answer questions based on the retrieved content."
  }
]

For integrations with other tools, use the following types:
[
  {
    "type": "@n8n/nodes-base.activeCampaign",
    "description": "ActiveCampaign integration node for managing contacts, campaigns, and marketing automation."
  },
  {
    "type": "@n8n/nodes-base.airtable",
    "description": "Airtable integration node for interacting with bases, tables, and records in Airtable."
  },
  {
    "type": "@n8n/nodes-base.ambee",
    "description": "Ambee integration node for accessing real-time environmental data such as air quality and weather."
  },
  {
    "type": "@n8n/nodes-base.asana",
    "description": "Asana integration node for managing tasks, projects, and team collaborations."
  },
  {
    "type": "@n8n/nodes-base.amazonS3",
    "description": "Amazon S3 integration node for managing file storage and buckets on AWS S3."
  },
  {
    "type": "@n8n/nodes-base.amazonSES",
    "description": "Amazon SES integration node for sending and receiving emails using AWS SES."
  },
  {
    "type": "@n8n/nodes-base.azureBlob",
    "description": "Azure Blob Storage integration node for managing data and files in Azure Blob Storage."
  },
  {
    "type": "@n8n/nodes-base.bambooHR",
    "description": "BambooHR integration node for accessing HR data and managing employee information."
  },
  {
    "type": "@n8n/nodes-base.basecamp",
    "description": "Basecamp integration node for project management, collaboration, and team communication."
  },
  {
    "type": "@n8n/nodes-base.baserow",
    "description": "Baserow integration node for interacting with databases and tables in Baserow."
  },
  {
    "type": "@n8n/nodes-base.bitbucket",
    "description": "Bitbucket integration node for repository management, commits, and pull requests."
  },
  {
    "type": "@n8n/nodes-base.bigCommerce",
    "description": "BigCommerce integration node for managing e-commerce stores, orders, and products."
  },
  {
    "type": "@n8n/nodes-base.box",
    "description": "Box integration node for managing files, folders, and collaboration within Box."
  },
  {
    "type": "@n8n/nodes-base.clickUp",
    "description": "ClickUp integration node for task and project management as well as team productivity."
  },
  {
    "type": "@n8n/nodes-base.coinbase",
    "description": "Coinbase integration node for accessing cryptocurrency data and managing transactions."
  },
  {
    "type": "@n8n/nodes-base.coda",
    "description": "Coda integration node for document management and interactive spreadsheet-like experiences."
  },
  {
    "type": "@n8n/nodes-base.confluence",
    "description": "Confluence integration node for interacting with Atlassian Confluence content and spaces."
  },
  {
    "type": "@n8n/nodes-base.convertKit",
    "description": "ConvertKit integration node for managing email marketing campaigns and subscriber lists."
  },
  {
    "type": "@n8n/nodes-base.discord",
    "description": "Discord integration node for sending messages and managing communications on Discord."
  },
  {
    "type": "@n8n/nodes-base.docuSign",
    "description": "DocuSign integration node for managing electronic signature workflows and document signing."
  },
  {
    "type": "@n8n/nodes-base.dropbox",
    "description": "Dropbox integration node for managing file storage, sharing, and collaboration within Dropbox."
  },
  {
    "type": "@n8n/nodes-base.emailSend",
    "description": "Email integration node for sending emails via SMTP or supported email providers."
  },
  {
    "type": "@n8n/nodes-base.facebook",
    "description": "Facebook integration node for managing pages, ads, and data insights from Facebook."
  },
  {
    "type": "@n8n/nodes-base.figma",
    "description": "Figma integration node for accessing design files and collaborating on design projects."
  },
  {
    "type": "@n8n/nodes-base.github",
    "description": "GitHub integration node for repository management, issues, and pull requests."
  },
  {
    "type": "@n8n/nodes-base.gitlab",
    "description": "GitLab integration node for managing projects, repositories, and CI/CD pipelines."
  },
  {
    "type": "@n8n/nodes-base.googleDrive",
    "description": "Google Drive integration node for managing files and folders stored on Google Drive."
  },
  {
    "type": "@n8n/nodes-base.googleSheets",
    "description": "Google Sheets integration node for reading from and writing to Google Sheets."
  },
  {
    "type": "@n8n/nodes-base.googleCalendar",
    "description": "Google Calendar integration node for managing events, calendars, and scheduling."
  },
  {
    "type": "@n8n/nodes-base.hubspot",
    "description": "HubSpot integration node for CRM management, contacts, and marketing automation."
  },
  {
    "type": "@n8n/nodes-base.instagram",
    "description": "Instagram integration node for accessing Instagram data, posts, and media."
  },
  {
    "type": "@n8n/nodes-base.intercom",
    "description": "Intercom integration node for managing customer communication and support workflows."
  },
  {
    "type": "@n8n/nodes-base.jira",
    "description": "Jira integration node for issue tracking, project management, and agile workflows."
  },
  {
    "type": "@n8n/nodes-base.linkedin",
    "description": "LinkedIn integration node for accessing professional data, posts, and networking information."
  },
  {
    "type": "@n8n/nodes-base.mailchimp",
    "description": "Mailchimp integration node for email marketing campaigns and subscriber management."
  },
  {
    "type": "@n8n/nodes-base.microsoftExcel",
    "description": "Microsoft Excel integration node for reading, writing, and manipulating Excel files."
  },
  {
    "type": "@n8n/nodes-base.microsoftOneDrive",
    "description": "Microsoft OneDrive integration node for managing files and storage on OneDrive."
  },
  {
    "type": "@n8n/nodes-base.microsoftOutlook",
    "description": "Microsoft Outlook integration node for managing emails, calendars, and contacts."
  },
  {
    "type": "@n8n/nodes-base.mongodb",
    "description": "MongoDB integration node for interacting with MongoDB databases and collections."
  },
  {
    "type": "@n8n/nodes-base.mysql",
    "description": "MySQL integration node for interacting with MySQL databases."
  },
  {
    "type": "@n8n/nodes-base.notion",
    "description": "Notion integration node for managing pages, databases, and content in Notion."
  },
  {
    "type": "@n8n/nodes-base.outlook",
    "description": "Outlook integration node for managing emails, calendars, and contacts via Microsoft Outlook."
  },
  {
    "type": "@n8n/nodes-base.pipedrive",
    "description": "Pipedrive integration node for sales pipeline management, deals, and CRM functionalities."
  },
  {
    "type": "@n8n/nodes-base.postgres",
    "description": "Postgres integration node for interacting with PostgreSQL databases."
  },
  {
    "type": "@n8n/nodes-base.quickBooks",
    "description": "QuickBooks integration node for managing accounting, invoices, and financial data."
  },
  {
    "type": "@n8n/nodes-base.reddit",
    "description": "Reddit integration node for interacting with Reddit APIs, posts, and comments."
  },
  {
    "type": "@n8n/nodes-base.salesforce",
    "description": "Salesforce integration node for managing CRM data, leads, and sales automation."
  },
  {
    "type": "@n8n/nodes-base.sendGrid",
    "description": "SendGrid integration node for sending emails and managing email campaigns."
  },
  {
    "type": "@n8n/nodes-base.slack",
    "description": "Slack integration node for sending messages, managing channels, and team communication."
  },
  {
    "type": "@n8n/nodes-base.stripe",
    "description": "Stripe integration node for managing payments, subscriptions, and financial transactions."
  },
  {
    "type": "@n8n/nodes-base.trello",
    "description": "Trello integration node for managing boards, lists, and cards."
  },
  {
    "type": "@n8n/nodes-base.twitter",
    "description": "Twitter integration node for posting tweets and accessing Twitter data."
  },
  {
    "type": "@n8n/nodes-base.wordpress",
    "description": "WordPress integration node for managing posts, pages, and comments in WordPress."
  },
  {
    "type": "@n8n/nodes-base.zendesk",
    "description": "Zendesk integration node for managing support tickets and customer service workflows."
  },
  {
    "type": "@n8n/nodes-base.zoho",
    "description": "Zoho integration node for managing various Zoho services, including CRM and email marketing."
  },
  {
    "type": "@n8n/nodes-base.activeCampaign",
    "description": "ActiveCampaign integration node for managing contacts, campaigns, and marketing automation."
  },
  {
    "type": "@n8n/nodes-base.airtable",
    "description": "Airtable integration node for interacting with bases, tables, and records."
  },
  {
    "type": "@n8n/nodes-base.ambee",
    "description": "Ambee integration node for accessing environmental data such as air quality and weather."
  },
  {
    "type": "@n8n/nodes-base.asana",
    "description": "Asana integration node for managing tasks, projects, and team collaborations."
  },
  {
    "type": "@n8n/nodes-base.amazonS3",
    "description": "Amazon S3 integration node for managing file storage and buckets on AWS."
  },
  {
    "type": "@n8n/nodes-base.amazonSES",
    "description": "Amazon SES integration node for sending and receiving emails using AWS SES."
  },
  {
    "type": "@n8n/nodes-base.azureBlob",
    "description": "Azure Blob integration node for managing data and files in Azure Blob Storage."
  },
  {
    "type": "@n8n/nodes-base.bambooHR",
    "description": "BambooHR integration node for accessing HR data and managing employee information."
  },
  {
    "type": "@n8n/nodes-base.basecamp",
    "description": "Basecamp integration node for project management, team collaboration, and communication."
  },
  {
    "type": "@n8n/nodes-base.baserow",
    "description": "Baserow integration node for interacting with databases and tables in Baserow."
  },
  {
    "type": "@n8n/nodes-base.bitbucket",
    "description": "Bitbucket integration node for repository management, commits, and pull requests."
  },
  {
    "type": "@n8n/nodes-base.bigCommerce",
    "description": "BigCommerce integration node for managing e-commerce stores, orders, and products."
  },
  {
    "type": "@n8n/nodes-base.box",
    "description": "Box integration node for managing files, folders, and collaboration within Box."
  },
  {
    "type": "@n8n/nodes-base.clickUp",
    "description": "ClickUp integration node for task and project management as well as team productivity."
  },
  {
    "type": "@n8n/nodes-base.coinbase",
    "description": "Coinbase integration node for accessing cryptocurrency data and managing transactions."
  },
  {
    "type": "@n8n/nodes-base.coda",
    "description": "Coda integration node for document management and interactive spreadsheets."
  },
  {
    "type": "@n8n/nodes-base.confluence",
    "description": "Confluence integration node for interacting with Atlassian Confluence content and spaces."
  },
  {
    "type": "@n8n/nodes-base.convertKit",
    "description": "ConvertKit integration node for managing email marketing campaigns and subscriber lists."
  },
  {
    "type": "@n8n/nodes-base.cloudConvert",
    "description": "CloudConvert integration node for file conversion and processing workflows."
  },
  {
    "type": "@n8n/nodes-base.coinMarketCap",
    "description": "CoinMarketCap integration node for retrieving cryptocurrency market data and statistics."
  },
  {
    "type": "@n8n/nodes-base.discord",
    "description": "Discord integration node for sending messages and managing communications on Discord."
  },
  {
    "type": "@n8n/nodes-base.docuSign",
    "description": "DocuSign integration node for managing electronic signature workflows and document signing."
  },
  {
    "type": "@n8n/nodes-base.dropbox",
    "description": "Dropbox integration node for managing file storage, sharing, and collaboration within Dropbox."
  },
  {
    "type": "@n8n/nodes-base.emailSend",
    "description": "EmailSend integration node for sending emails via SMTP or supported email providers."
  },
  {
    "type": "@n8n/nodes-base.facebook",
    "description": "Facebook integration node for managing pages, ads, and data insights from Facebook."
  },
  {
    "type": "@n8n/nodes-base.figma",
    "description": "Figma integration node for accessing design files and collaborating on design projects."
  },
  {
    "type": "@n8n/nodes-base.freshdesk",
    "description": "Freshdesk integration node for managing customer support tickets and helpdesk workflows."
  },
  {
    "type": "@n8n/nodes-base.gitHub",
    "description": "GitHub integration node for repository management, issues, and pull requests."
  },
  {
    "type": "@n8n/nodes-base.gitLab",
    "description": "GitLab integration node for managing projects, repositories, and CI/CD pipelines."
  },
  {
    "type": "@n8n/nodes-base.googleAds",
    "description": "Google Ads integration node for managing and analyzing online advertising campaigns."
  },
  {
    "type": "@n8n/nodes-base.googleAnalytics",
    "description": "Google Analytics integration node for retrieving website analytics and performance data."
  },
  {
    "type": "@n8n/nodes-base.googleBigQuery",
    "description": "Google BigQuery integration node for running queries and managing datasets in BigQuery."
  },
  {
    "type": "@n8n/nodes-base.googleCalendar",
    "description": "Google Calendar integration node for managing events, calendars, and scheduling."
  },
  {
    "type": "@n8n/nodes-base.googleContacts",
    "description": "Google Contacts integration node for managing contacts stored in Google Contacts."
  },
  {
    "type": "@n8n/nodes-base.googleDrive",
    "description": "Google Drive integration node for managing files and folders stored on Google Drive."
  },
  {
    "type": "@n8n/nodes-base.googleSheets",
    "description": "Google Sheets integration node for reading from and writing to Google Sheets."
  },
  {
    "type": "@n8n/nodes-base.hubSpot",
    "description": "HubSpot integration node for CRM management, contacts, and marketing automation."
  },
  {
    "type": "@n8n/nodes-base.harvest",
    "description": "Harvest integration node for tracking time, expenses, and project data."
  },
  {
    "type": "@n8n/nodes-base.instagram",
    "description": "Instagram integration node for accessing Instagram data, posts, and media."
  },
  {
    "type": "@n8n/nodes-base.intercom",
    "description": "Intercom integration node for managing customer communication and support workflows."
  },
  {
    "type": "@n8n/nodes-base.jira",
    "description": "Jira integration node for issue tracking, project management, and agile workflows."
  },
  {
    "type": "@n8n/nodes-base.keap",
    "description": "Keap (Infusionsoft) integration node for managing CRM, sales, and marketing automation."
  },
  {
    "type": "@n8n/nodes-base.linkedin",
    "description": "LinkedIn integration node for accessing professional data, posts, and networking information."
  },
  {
    "type": "@n8n/nodes-base.mailchimp",
    "description": "Mailchimp integration node for email marketing campaigns and subscriber management."
  },
  {
    "type": "@n8n/nodes-base.mailjet",
    "description": "Mailjet integration node for managing email campaigns and transactional emails."
  },
  {
    "type": "@n8n/nodes-base.mailerLite",
    "description": "MailerLite integration node for email marketing and subscriber list management."
  },
  {
    "type": "@n8n/nodes-base.microsoftExcel",
    "description": "Microsoft Excel integration node for reading, writing, and manipulating Excel files."
  },
  {
    "type": "@n8n/nodes-base.microsoftOneDrive",
    "description": "Microsoft OneDrive integration node for managing files and storage on OneDrive."
  },
  {
    "type": "@n8n/nodes-base.microsoftOutlook",
    "description": "Microsoft Outlook integration node for managing emails, calendars, and contacts."
  },
  {
    "type": "@n8n/nodes-base.mongoDB",
    "description": "MongoDB integration node for interacting with MongoDB databases and collections."
  },
  {
    "type": "@n8n/nodes-base.mySQL",
    "description": "MySQL integration node for interacting with MySQL databases."
  },
  {
    "type": "@n8n/nodes-base.notion",
    "description": "Notion integration node for managing pages, databases, and content in Notion."
  },
  {
    "type": "@n8n/nodes-base.pipedrive",
    "description": "Pipedrive integration node for sales pipeline management, deals, and CRM functionalities."
  },
  {
    "type": "@n8n/nodes-base.postgres",
    "description": "Postgres integration node for interacting with PostgreSQL databases."
  },
  {
    "type": "@n8n/nodes-base.quickBooks",
    "description": "QuickBooks integration node for managing accounting, invoices, and financial data."
  },
  {
    "type": "@n8n/nodes-base.reddit",
    "description": "Reddit integration node for interacting with Reddit APIs, posts, and comments."
  },
  {
    "type": "@n8n/nodes-base.salesforce",
    "description": "Salesforce integration node for managing CRM data, leads, and sales automation."
  },
  {
    "type": "@n8n/nodes-base.sendGrid",
    "description": "SendGrid integration node for sending emails and managing email campaigns."
  },
  {
    "type": "@n8n/nodes-base.slack",
    "description": "Slack integration node for sending messages, managing channels, and team communication."
  },
  {
    "type": "@n8n/nodes-base.shopify",
    "description": "Shopify integration node for managing e-commerce stores, products, and orders."
  },
  {
    "type": "@n8n/nodes-base.stripe",
    "description": "Stripe integration node for managing payments, subscriptions, and financial transactions."
  },
  {
    "type": "@n8n/nodes-base.square",
    "description": "Square integration node for processing payments and managing financial transactions."
  },
  {
    "type": "@n8n/nodes-base.trello",
    "description": "Trello integration node for managing boards, lists, and cards."
  },
  {
    "type": "@n8n/nodes-base.twitter",
    "description": "Twitter integration node for posting tweets and accessing Twitter data."
  },
  {
    "type": "@n8n/nodes-base.typeform",
    "description": "Typeform integration node for creating forms, surveys, and collecting responses."
  },
  {
    "type": "@n8n/nodes-base.wordPress",
    "description": "WordPress integration node for managing posts, pages, and comments."
  },
  {
    "type": "@n8n/nodes-base.xero",
    "description": "Xero integration node for managing accounting, invoicing, and financial data."
  },
  {
    "type": "@n8n/nodes-base.zendesk",
    "description": "Zendesk integration node for managing support tickets and customer service workflows."
  },
  {
    "type": "@n8n/nodes-base.zoho",
    "description": "Zoho integration node for managing various Zoho services, including CRM and email marketing."
  }


]


2. Position nodes logically in the workflow layout
3. Configure appropriate connections between nodes
4. Set up proper error handling and retries



Remember to:
- Use line breaks and bullet points for better readability
- Explain technical changes in user-friendly language
- Provide context for why each change is being made
- Suggest related improvements when relevant`;

      console.log("Sending request with anthropicKey:", anthropicKey?.substring(0, 8) + "...");
      
      const requestBody = {
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
        systemPrompt
      };

      console.log("Request body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch('/api/anthropic', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-anthropic-key': anthropicKey
        },
        body: JSON.stringify(requestBody)
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", JSON.stringify(errorData, null, 2));
        throw new Error(`API error: ${response.statusText}`);
      }

      // Process the response as a readable stream
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

          // Decode the chunk and add it to our buffer
          buffer += decoder.decode(value, { stream: true });

          // Process any complete lines in the buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);
              console.log('Stream event:', event);
              
              switch (event.type) {
                case 'message_start':
                  console.log('Message started:', event);
                  break;

                case 'content_block_start':
                  console.log('Content block started:', event);
                  break;

                case 'content_block_delta':
                  if (event.delta?.text) {
                    const newText = event.delta.text;
                    streamedContent += newText;
                    console.log('New content:', newText);
                    
                    // Update the temporary message with the streamed content
                    setMessages(prev => prev.map(msg => 
                      msg.id === tempMessageId 
                        ? { ...msg, content: streamedContent }
                        : msg
                    ));
                  }
                  break;

                case 'content_block_stop':
                  console.log('Content block stopped:', event);
                  break;

                case 'message_delta':
                  console.log('Message delta:', event);
                  break;

                case 'message_stop':
                  console.log('Message completed:', event);
                  break;

                case 'error':
                  console.error('Stream error:', event.error);
                  throw new Error(event.error);
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e, 'Line:', line);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Extract workflow update if present
      let suggestedUpdate = null;
      const jsonMatch = streamedContent.match(/```json\n([\s\S]*?)\n```/);
      
      if (jsonMatch) {
        try {
          const workflowJson = JSON.parse(jsonMatch[1]);
          if (workflowJson.workflow?.data) {
            suggestedUpdate = {
              workflow: {
                name: workflowJson.workflow.data.name,
                nodes: workflowJson.workflow.data.nodes,
                connections: workflowJson.workflow.data.connections,
                settings: workflowJson.workflow.data.settings
              },
              description: streamedContent.split('```')[0].trim()
            };
          }
        } catch (e) {
          console.error('Failed to parse workflow JSON:', e);
        }
      }

      // Update the final message with the complete content and suggested update
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessageId 
          ? {
              role: 'assistant',
              content: streamedContent,
              ...(suggestedUpdate && { suggestedUpdate })
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
        name: update.name || workflowName,
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

      // Update the workflow without including the ID in the request body
      await client?.updateWorkflow(workflowId, workflowData);

      // Refresh workflow context after update
      const updatedWorkflow = await client?.getWorkflow(workflowId);
      if (updatedWorkflow) {
        setWorkflowContext(prev => prev ? ({
          ...prev,
          workflow: {
            data: updatedWorkflow.data
          }
        }) : null);
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: "✓ Workflow has been updated successfully!"
      }]);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error applying workflow update:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "❌ Failed to update the workflow. Please check your n8n instance configuration and try again."
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
    <Card className="flex flex-col h-[400px]">
      {/* Chat header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Agent Assistant</h2>
        <p className="text-sm text-muted-foreground">
          Chat with Claude about your agent
        </p>
      </div>

      {/* Chat messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
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
            placeholder="Chat with Claude about your agent..."
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