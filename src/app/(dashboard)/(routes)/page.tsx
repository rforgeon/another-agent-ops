"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useN8n } from "@/lib/api/n8n-provider";
import Link from "next/link";

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

  useEffect(() => {
    async function fetchData() {
      if (!client) return;

      try {
        const [workflowsData, executionsData] = await Promise.all([
          client.getWorkflows(),
          client.getExecutions(),
        ]);

        const activeWorkflows = workflowsData.filter((w: any) => w.active).length;
        const successfulExecutions = executionsData.filter(
          (e: any) => e.status === "success"
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

        setWorkflows(
          workflowsData.map((w: any) => ({
            id: w.id,
            name: w.name,
            active: w.active,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
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

  return (
    <div className="p-6 space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium">Total Workflows</h3>
          <div className="text-2xl font-bold">{stats.totalWorkflows}</div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium">Active Workflows</h3>
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

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Recent Workflows</h2>
        <div className="space-y-4">
          {workflows.length === 0 ? (
            <div className="text-muted-foreground">No workflows found</div>
          ) : (
            workflows.map((workflow) => (
              <Link
                key={workflow.id}
                href={`/workflows/${workflow.id}`}
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
            ))
          )}
        </div>
      </div>
    </div>
  );
} 