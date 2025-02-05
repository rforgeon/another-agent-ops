"use client";

import { useEffect, useState } from "react";
import { useN8n } from "@/lib/api/n8n-provider";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { WorkflowStats } from "./_components/workflow-stats";

interface Workflow {
  id: string;
  name: string;
  active: boolean;
}

interface Execution {
  id: string;
  status: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  finished: boolean;
}

export default function WorkflowsPage() {
  const { client } = useN8n();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!client) return;

      try {
        const [workflowsResponse, executionsResponse] = await Promise.all([
          client.getWorkflows(),
          client.getExecutions(),
        ]);

        console.log("Workflows response:", workflowsResponse);
        console.log("Executions response:", executionsResponse);

        // Sort workflows by updatedAt in descending order
        const sortedWorkflows = (workflowsResponse.data || [])
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        setWorkflows(sortedWorkflows);
        setExecutions(executionsResponse.data || []);
        setError(null);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [client]);

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

  // Calculate per-workflow statistics
  const workflowStats = workflows.map(workflow => {
    const workflowExecutions = executions.filter(e => e.workflowId === workflow.id);
    const workflowFinishedExecutions = workflowExecutions.filter(e => e.finished);
    const successCount = workflowExecutions.filter(e => e.status === "success").length;
    const failureCount = workflowExecutions.filter(e => e.status === "error").length;
    
    const avgTime = workflowFinishedExecutions.reduce((acc, execution) => {
      if (execution.startedAt && execution.stoppedAt) {
        const duration = new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime();
        return acc + duration;
      }
      return acc;
    }, 0) / (workflowFinishedExecutions.length || 1);

    return {
      ...workflow,
      totalExecutions: workflowExecutions.length,
      successCount,
      failureCount,
      avgExecutionTime: avgTime,
    };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Agents</h1>
        <div className="text-sm text-muted-foreground">
          Total Agents: {workflows.length}
        </div>
      </div>

      {/* Execution Statistics */}
      <WorkflowStats
        totalExecutions={totalExecutions}
        successfulExecutions={successfulExecutions}
        failedExecutions={failedExecutions}
        avgExecutionTime={avgExecutionTime}
        lastExecution={lastExecution}
      />

      {/* Agents List */}
      <div className="space-y-4">
        {workflowStats.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No agents found
          </div>
        ) : (
          workflowStats.map((workflow) => (
            <Link
              key={workflow.id}
              href={`/dashboard/workflows/${workflow.id}`}
              className="block"
            >
              <Card className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{workflow.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      ID: {workflow.id}
                    </p>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-xs ${
                      workflow.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {workflow.active ? "Active" : "Inactive"}
                  </div>
                </div>

                {/* Agent-specific stats */}
                <div className="mt-4 grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">
                      {workflow.totalExecutions}
                    </span>{" "}
                    executions
                  </div>
                  <div>
                    <span className="font-medium text-green-600">
                      {workflow.successCount}
                    </span>{" "}
                    successful
                  </div>
                  <div>
                    <span className="font-medium text-red-600">
                      {workflow.failureCount}
                    </span>{" "}
                    failed
                  </div>
                  <div>
                    <span className="font-medium text-blue-600">
                      {workflow.avgExecutionTime > 1000
                        ? `${(workflow.avgExecutionTime / 1000).toFixed(2)}s`
                        : `${Math.round(workflow.avgExecutionTime)}ms`}
                    </span>{" "}
                    avg time
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
} 