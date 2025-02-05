"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useN8n } from "@/lib/api/n8n-provider";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExecutionWaterfall } from "./_components/execution-waterfall";
import { WorkflowStats } from "../_components/workflow-stats";
import { ExecutionAverages } from "./_components/execution-averages";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { WorkflowChat } from "./_components/workflow-chat";

interface WorkflowDetails {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExecutionStep {
  startTime?: number;
  endTime?: number;
  error?: boolean;
  executionStatus?: string;
  hints?: Array<{
    startTime?: number;
    executionTime?: number;
  }>;
}

interface ExecutionDetails {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt: string;
  status: "success" | "error" | "running" | "waiting";
  data?: {
    resultData?: {
      runData?: Record<string, ExecutionStep[]>;
    };
    executionData?: {
      resultData?: {
        runData?: Record<string, ExecutionStep[]>;
      };
    };
  };
  resultData?: {
    runData?: Record<string, ExecutionStep[]>;
  };
  executionData?: {
    resultData?: {
      runData?: Record<string, ExecutionStep[]>;
    };
  };
}

export default function WorkflowDetailsPage() {
  const params = useParams();
  const { client } = useN8n();
  const [workflow, setWorkflow] = useState<WorkflowDetails | null>(null);
  const [executions, setExecutions] = useState<ExecutionDetails[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionDetails | null>(null);
  const [selectedTab, setSelectedTab] = useState("executions");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!client) return;

      try {
        const [workflowResponse, executionsResponse] = await Promise.all([
          client.getWorkflow(params.id as string),
          client.getExecutions(params.id as string),
        ]);

        console.log("Workflow response:", workflowResponse);
        console.log("Executions response:", executionsResponse);

        setWorkflow(workflowResponse.data);
        setExecutions(executionsResponse.data || []);
        setError(null);
      } catch (error) {
        console.error("Failed to fetch workflow data:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [client, params.id]);

  const fetchExecutionDetails = async (executionId: string) => {
    if (!client) return;

    try {
      const response = await client.getExecution(executionId);
      console.log("Execution details response:", response);
      setSelectedExecution(response.data);
      setSelectedTab("details");
    } catch (error) {
      console.error("Failed to fetch execution details:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch execution details");
    }
  };

  const hasExecutionSteps = useMemo(() => {
    if (!selectedExecution) return false;
    
    // Check all possible data structures
    const runData = selectedExecution.data?.resultData?.runData || 
                   selectedExecution.data?.executionData?.resultData?.runData ||
                   selectedExecution.resultData?.runData ||
                   selectedExecution.executionData?.resultData?.runData;
                   
    console.log("Run data found:", runData);
    return runData && Object.keys(runData).length > 0;
  }, [selectedExecution]);

  // Calculate execution statistics
  const finishedExecutions = executions.filter(e => e.finished);
  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter(e => e.status === "success").length;
  const failedExecutions = executions.filter(e => e.status === "error").length;
  const lastExecution = executions[0]; // Assuming executions are sorted by date

  // Calculate average execution time
  const avgExecutionTime = finishedExecutions.reduce((acc, execution) => {
    if (execution.startedAt && execution.stoppedAt) {
      const duration = new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime();
      return acc + duration;
    }
    return acc;
  }, 0) / (finishedExecutions.length || 1);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  console.log("Selected execution:", selectedExecution);
  console.log("Has execution steps:", hasExecutionSteps);

  return (
    <div className="p-6 space-y-6">
      {/* Agent Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{workflow?.name}</h1>
          <p className="text-sm text-muted-foreground">ID: {workflow?.id}</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => client && window.open(`${client.baseUrl}/workflow/${workflow?.id}`, '_blank')}
          >
            Open in n8n
            <ExternalLink className="h-4 w-4" />
          </Button>
          <div
            className={`px-3 py-1 rounded-full text-sm ${
              workflow?.active
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {workflow?.active ? "Active" : "Inactive"}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Existing Content */}
        <div className="space-y-6">
          {/* Agent Details */}
          <Card className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                <p>{new Date(workflow?.createdAt || "").toLocaleString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Last Updated</h3>
                <p>{new Date(workflow?.updatedAt || "").toLocaleString()}</p>
              </div>
            </div>
          </Card>

          {/* Execution Statistics */}
          <WorkflowStats
            totalExecutions={totalExecutions}
            successfulExecutions={successfulExecutions}
            failedExecutions={failedExecutions}
            avgExecutionTime={avgExecutionTime}
            lastExecution={lastExecution}
          />

          {/* Execution Averages */}
          <ExecutionAverages executions={executions} />
        </div>

        {/* Right Column - Chat and Executions */}
        <div className="space-y-6">
          {/* Agent Chat */}
          {workflow && (
            <WorkflowChat
              workflowId={workflow.id}
              workflowName={workflow.name}
            />
          )}

          {/* Executions List and Details */}
          <Card>
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList>
                <TabsTrigger value="executions">Executions</TabsTrigger>
                <TabsTrigger value="details" disabled={!selectedExecution}>
                  Execution Details
                </TabsTrigger>
              </TabsList>

              <TabsContent value="executions" className="space-y-4">
                {executions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No executions found for this agent
                  </div>
                ) : (
                  executions.map((execution) => (
                    <Card
                      key={execution.id}
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => fetchExecutionDetails(execution.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Execution {execution.id}</p>
                          <p className="text-sm text-muted-foreground">
                            Started: {new Date(execution.startedAt).toLocaleString()}
                          </p>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs ${
                            execution.status === "success"
                              ? "bg-green-100 text-green-700"
                              : execution.status === "error"
                              ? "bg-red-100 text-red-700"
                              : execution.status === "running"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {execution.status}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="details">
                {selectedExecution && hasExecutionSteps && (
                  <div className="space-y-6">
                    <ExecutionWaterfall 
                      data={selectedExecution.data?.resultData?.runData || 
                           selectedExecution.data?.executionData?.resultData?.runData ||
                           selectedExecution.resultData?.runData ||
                           selectedExecution.executionData?.resultData?.runData || {}}
                      executionStartTime={selectedExecution.startedAt}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
} 