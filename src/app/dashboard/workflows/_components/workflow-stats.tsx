import { Card } from "@/components/ui/card";

interface WorkflowStatsProps {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
  lastExecution?: {
    status: string;
    startedAt: string;
  };
}

export function WorkflowStats({
  totalExecutions,
  successfulExecutions,
  failedExecutions,
  avgExecutionTime,
  lastExecution,
}: WorkflowStatsProps) {
  const successRate = totalExecutions > 0
    ? ((successfulExecutions / totalExecutions) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground">Total Executions</h3>
        <div className="text-2xl font-bold">{totalExecutions}</div>
      </Card>
      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground">Success Rate</h3>
        <div className="text-2xl font-bold text-green-600">{successRate}%</div>
        <div className="text-sm text-muted-foreground mt-1">
          {successfulExecutions} successful
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground">Failed Executions</h3>
        <div className="text-2xl font-bold text-red-600">{failedExecutions}</div>
        <div className="text-sm text-muted-foreground mt-1">
          {((failedExecutions / totalExecutions) * 100).toFixed(1)}% failure rate
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground">Avg Execution Time</h3>
        <div className="text-2xl font-bold text-blue-600">
          {avgExecutionTime > 1000 
            ? `${(avgExecutionTime / 1000).toFixed(2)}s`
            : `${Math.round(avgExecutionTime)}ms`}
        </div>
      </Card>
      <Card className="p-4">
        <h3 className="text-sm font-medium text-muted-foreground">Last Execution</h3>
        {lastExecution ? (
          <div>
            <div className="text-2xl font-bold">
              <span
                className={`inline-block px-2 py-1 rounded-full text-sm ${
                  lastExecution.status === "success"
                    ? "bg-green-100 text-green-700"
                    : lastExecution.status === "error"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {lastExecution.status}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {new Date(lastExecution.startedAt).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No executions yet</div>
        )}
      </Card>
    </div>
  );
} 