import { Card } from "@/components/ui/card";
import { useMemo } from "react";

interface ExecutionStep {
  startTime?: number;
  endTime?: number;
  error?: boolean;
  executionStatus?: string;
  executionTime?: number;
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

interface ExecutionAveragesProps {
  executions: ExecutionDetails[];
}

interface NodeStats {
  nodeId: string;
  avgDuration: number;
  successRate: number;
  totalExecutions: number;
  minDuration: number;
  maxDuration: number;
}

interface NodeStatsWithOffset {
  nodeId: string;
  avgDuration: number;
  successRate: number;
  totalExecutions: number;
  minDuration: number;
  maxDuration: number;
  startOffset: number;
}

export function ExecutionAverages({ executions }: ExecutionAveragesProps) {
  const nodeStats = useMemo(() => {
    console.log("Processing executions:", executions);
    const stats = new Map<string, {
      totalDuration: number;
      totalExecutions: number;
      successCount: number;
      minDuration: number;
      maxDuration: number;
    }>();

    executions.forEach(execution => {
      console.log("Processing execution:", execution);
      const runData = execution.data?.resultData?.runData;
      
      if (!runData) {
        console.log("No runData found for execution");
        return;
      }

      Object.entries(runData).forEach(([nodeId, steps]) => {
        console.log(`Processing node ${nodeId} with steps:`, steps);
        steps.forEach((step: ExecutionStep) => {
          let duration: number | undefined;
          
          if (step.executionTime) {
            duration = step.executionTime;
          } else if (step.hints && step.hints.length > 0) {
            const hint = step.hints[0];
            if (hint.executionTime) {
              duration = hint.executionTime;
            } else if (hint.startTime) {
              const nextHint = step.hints[1];
              if (nextHint && nextHint.startTime) {
                duration = nextHint.startTime - hint.startTime;
              }
            }
          }

          if (!duration) {
            console.log(`Skipping step for node ${nodeId} - missing timing data:`, step);
            return;
          }

          const currentStats = stats.get(nodeId) || {
            totalDuration: 0,
            totalExecutions: 0,
            successCount: 0,
            minDuration: Infinity,
            maxDuration: -Infinity,
          };

          currentStats.totalDuration += duration;
          currentStats.totalExecutions += 1;
          
          const isSuccess = step.executionStatus === 'success' || 
                          (!step.error && !step.executionStatus);
          if (isSuccess) currentStats.successCount += 1;
          
          currentStats.minDuration = Math.min(currentStats.minDuration, duration);
          currentStats.maxDuration = Math.max(currentStats.maxDuration, duration);

          stats.set(nodeId, currentStats);
        });
      });
    });

    const nodeStats: NodeStats[] = Array.from(stats.entries()).map(([nodeId, stats]) => ({
      nodeId,
      avgDuration: stats.totalDuration / stats.totalExecutions,
      successRate: (stats.successCount / stats.totalExecutions) * 100,
      totalExecutions: stats.totalExecutions,
      minDuration: stats.minDuration === Infinity ? 0 : stats.minDuration,
      maxDuration: stats.maxDuration === -Infinity ? 0 : stats.maxDuration,
    }));

    console.log("Final node stats:", nodeStats);
    return nodeStats;
  }, [executions]);

  // Simplified waterfall calculation
  const waterfallStats = useMemo(() => {
    if (!nodeStats || nodeStats.length === 0) {
      console.log("No node stats available");
      return [];
    }

    console.log("Calculating waterfall stats");
    let currentOffset = 0;
    const stats: NodeStatsWithOffset[] = [];

    // Sort nodes by their first appearance in executions
    const nodeOrder = new Map<string, number>();
    executions.forEach(execution => {
      const runData = execution.data?.resultData?.runData;
      if (!runData) return;
      
      Object.keys(runData).forEach((nodeId, index) => {
        if (!nodeOrder.has(nodeId)) {
          nodeOrder.set(nodeId, index);
        }
      });
    });

    // Sort nodeStats based on execution order
    const sortedNodes = [...nodeStats].sort((a, b) => {
      const orderA = nodeOrder.get(a.nodeId) ?? Infinity;
      const orderB = nodeOrder.get(b.nodeId) ?? Infinity;
      return orderA - orderB;
    });

    // Calculate offsets
    sortedNodes.forEach(node => {
      stats.push({
        ...node,
        startOffset: currentOffset,
      });
      currentOffset += node.avgDuration;
    });

    console.log("Waterfall stats calculated:", stats);
    return stats;
  }, [nodeStats, executions]);

  if (!executions || executions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No execution data available
      </div>
    );
  }

  if (!waterfallStats || waterfallStats.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No node statistics available
      </div>
    );
  }

  const totalDuration = Math.max(...waterfallStats.map(stat => stat.startOffset + stat.avgDuration));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Workflow Execution Waterfall</h3>
      
      <div className="space-y-4">
        {waterfallStats.map((stat) => {
          const startPercentage = (stat.startOffset / totalDuration) * 100;
          const widthPercentage = (stat.avgDuration / totalDuration) * 100;
          
          return (
            <div key={stat.nodeId} className="relative h-16 group">
              {/* Node name and stats */}
              <div className="absolute left-0 top-0 bottom-0 w-48 pr-4 flex flex-col justify-center">
                <div className="font-medium truncate">{stat.nodeId}</div>
                <div className="text-sm text-muted-foreground">
                  {stat.totalExecutions} executions
                </div>
              </div>
              
              {/* Timeline bar */}
              <div className="absolute left-48 right-0 h-full">
                {/* Background track */}
                <div className="absolute top-2 h-8 w-full bg-gray-50 border border-gray-200 rounded">
                  {/* Start offset */}
                  <div
                    className="absolute h-full bg-gray-100"
                    style={{ width: `${startPercentage}%` }}
                  />
                  {/* Average duration bar */}
                  <div
                    className={`absolute h-full rounded ${
                      stat.successRate > 90
                        ? "bg-green-400"
                        : stat.successRate > 70
                        ? "bg-yellow-400"
                        : "bg-red-400"
                    }`}
                    style={{
                      left: `${startPercentage}%`,
                      width: `${widthPercentage}%`
                    }}
                  />
                </div>

                {/* Min-max range */}
                <div 
                  className="absolute top-0 h-12 border-l border-r border-black opacity-25"
                  style={{
                    left: `${startPercentage + (stat.minDuration / totalDuration) * 100}%`,
                    width: `${((stat.maxDuration - stat.minDuration) / totalDuration) * 100}%`
                  }}
                />

                {/* Tooltip */}
                <div className="absolute top-full mt-1 left-0 text-xs bg-gray-900 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                  <div>Node: {stat.nodeId}</div>
                  <div>Average: {(stat.avgDuration / 1000).toFixed(2)}s</div>
                  <div>Start Offset: {(stat.startOffset / 1000).toFixed(2)}s</div>
                  <div>Range: {(stat.minDuration / 1000).toFixed(2)}s - {(stat.maxDuration / 1000).toFixed(2)}s</div>
                  <div>Success Rate: {stat.successRate.toFixed(1)}%</div>
                  <div>Total Executions: {stat.totalExecutions}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Time scale */}
      <div className="mt-4 pl-48 flex justify-between text-sm text-muted-foreground">
        <span>0s</span>
        <span>{(totalDuration / 1000).toFixed(2)}s</span>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-6 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded bg-green-400 mr-2"></div>
          &gt;90% Success
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded bg-yellow-400 mr-2"></div>
          70-90% Success
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded bg-red-400 mr-2"></div>
          &lt;70% Success
        </div>
        <div className="flex items-center">
          <div className="w-8 h-3 bg-gray-100 mr-2"></div>
          Wait Time
        </div>
        <div className="flex items-center">
          <div className="w-8 h-3 border-l border-r border-black opacity-25 mr-2"></div>
          Min-Max Range
        </div>
      </div>
    </Card>
  );
} 