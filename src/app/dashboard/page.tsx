"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useN8n } from "@/lib/api/n8n-provider";
import Link from "next/link";
import { AgentChat } from "./_components/agent-chat";

interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
}

interface Workflow {
  id: string;
  name: string;
  active: boolean;
}

interface N8nResponse<T> {
  data: T | { results: T };
}

interface WorkflowData {
  id: string;
  name: string;
  active: boolean;
}

interface ExecutionData {
  id: string;
  status: string;
}

export default function DashboardPage() {
  const { client } = useN8n();
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkflows: 0,
    activeWorkflows: 0,
    totalExecutions: 0,
    successRate: 0,
  });
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!client) return;

      try {
        const [workflowsResponse, executionsResponse] = await Promise.all([
          client.getWorkflows(),
          client.getExecutions(),
        ]) as [N8nResponse<WorkflowData[]>, N8nResponse<ExecutionData[]>];

        console.log("Raw workflows response:", JSON.stringify(workflowsResponse, null, 2));
        console.log("Raw executions response:", JSON.stringify(executionsResponse, null, 2));

        // Check if we have the expected data structure and handle both array and object responses
        const workflowsData = Array.isArray(workflowsResponse.data) 
          ? workflowsResponse.data 
          : ('results' in workflowsResponse.data ? workflowsResponse.data.results : []);
          
        const executionsData = Array.isArray(executionsResponse.data)
          ? executionsResponse.data
          : ('results' in executionsResponse.data ? executionsResponse.data.results : []);

        console.log("Processed workflows data:", workflowsData);
        console.log("Processed executions data:", executionsData);

        const activeWorkflows = workflowsData.filter((w: WorkflowData) => w.active).length;
        const successfulExecutions = executionsData.filter(
          (e: ExecutionData) => e.status === "success"
        ).length;

        setStats({
          totalWorkflows: workflowsData.length,
          activeWorkflows,
          totalExecutions: executionsData.length,
          successRate:
            executionsData.length > 0
              ? (successfulExecutions / executionsData.length) * 100
              : 0,
        });

        // Sort workflows by updatedAt in descending order
        const sortedWorkflows = workflowsData
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .map((w) => ({
            id: w.id,
            name: w.name,
            active: w.active,
          }));

        setWorkflows(sortedWorkflows);
        setError(null);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
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

  return (
    <div className="p-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stats Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Overview</h1>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <h3 className="text-sm font-medium">Total Agents</h3>
              <div className="text-2xl font-bold">{stats.totalWorkflows}</div>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium">Active Agents</h3>
              <div className="text-2xl font-bold">{stats.activeWorkflows}</div>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium">Total Executions</h3>
              <div className="text-2xl font-bold">{stats.totalExecutions}</div>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium">Success Rate</h3>
              <div className="text-2xl font-bold">
                {stats.successRate.toFixed(1)}%
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">Recent Agents</h2>
            {workflows.length === 0 ? (
              <div className="text-muted-foreground">No agents found</div>
            ) : (
              <div className="space-y-4">
                {workflows.slice(0, 3).map((workflow) => (
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
                    </Card>
                  </Link>
                ))}
                {workflows.length > 3 && (
                  <Link
                    href="/dashboard/workflows"
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    View all agents →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">AI Chat</h2>
          <AgentChat />
        </div>
      </div>
    </div>
  );
} 