import { useMemo } from "react";

interface NodeExecution {
  node: string;
  startTime: number;
  endTime?: number;
  status: "success" | "error" | "running";
  duration: number;
}

interface ExecutionWaterfallProps {
  data: Record<string, any[]>;
  executionStartTime: string;
}

export function ExecutionWaterfall({ data, executionStartTime }: ExecutionWaterfallProps) {
  const nodeExecutions = useMemo(() => {
    const executions: NodeExecution[] = [];
    const startTimeMs = new Date(executionStartTime).getTime();

    console.log("Processing execution data:", data);
    
    if (!data || Object.keys(data).length === 0) {
      console.log("No execution data to process");
      return executions;
    }

    Object.entries(data).forEach(([nodeId, steps]) => {
      if (!Array.isArray(steps)) {
        console.log(`Skipping node ${nodeId} - steps is not an array:`, steps);
        return;
      }

      steps.forEach((step: any) => {
        console.log(`Processing step for node ${nodeId}:`, step);

        // Get timing information from either the step itself or its hints
        let stepStartTime = startTimeMs;
        let stepEndTime: number | undefined;
        let duration: number | undefined;

        if (step.executionTime) {
          // If we have executionTime, use that for duration
          duration = step.executionTime;
          if (step.startTime) stepStartTime = step.startTime;
          stepEndTime = stepStartTime + (duration as number);
        } else if (step.hints && step.hints.length > 0) {
          // If we have hints with timing information, use those
          const hint = step.hints[0];
          if (hint.executionTime) {
            duration = hint.executionTime;
            if (hint.startTime) stepStartTime = hint.startTime;
            stepEndTime = stepStartTime + (duration as number);
          } else if (hint.startTime) {
            stepStartTime = hint.startTime;
            // Look for end time in next hint
            const nextHint = step.hints[1];
            if (nextHint && nextHint.startTime) {
              stepEndTime = nextHint.startTime;
              duration = (stepEndTime as number) - stepStartTime;
            }
          }
        }

        // If we still don't have timing info, try direct properties
        if (step.startTime) {
          stepStartTime = step.startTime;
        }
        if (!stepEndTime && step.endTime) {
          stepEndTime = step.endTime;
          duration = (stepEndTime as number) - stepStartTime;
        }

        // Skip if we don't have enough timing information
        if (!duration && !stepEndTime) {
          console.log(`Skipping step for node ${nodeId} - insufficient timing data`);
          return;
        }

        // Calculate duration if we don't have it yet
        if (!duration && stepEndTime) {
          duration = (stepEndTime as number) - stepStartTime;
        }

        // Determine status
        let status: "success" | "error" | "running" = "running";
        if (step.error || step.executionStatus === "error") {
          status = "error";
        } else if (stepEndTime || step.executionStatus === "success") {
          status = "success";
        }

        executions.push({
          node: nodeId,
          startTime: stepStartTime,
          endTime: stepEndTime,
          status,
          duration: duration || 0,
        });
      });
    });

    // Sort by start time
    return executions.sort((a, b) => a.startTime - b.startTime);
  }, [data, executionStartTime]);

  if (nodeExecutions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No execution data available
      </div>
    );
  }

  const timelineStart = Math.min(...nodeExecutions.map(exec => exec.startTime));
  const timelineEnd = Math.max(...nodeExecutions.map(exec => 
    exec.endTime || (exec.startTime + exec.duration)
  ));
  const timelineDuration = timelineEnd - timelineStart;

  return (
    <div className="space-y-2">
      {/* Timeline header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>0ms</span>
        <span>{Math.round(timelineDuration)}ms</span>
      </div>

      {/* Waterfall bars */}
      <div className="space-y-2">
        {nodeExecutions.map((execution, index) => {
          const startOffset = ((execution.startTime - timelineStart) / timelineDuration) * 100;
          const width = (execution.duration / timelineDuration) * 100;

          return (
            <div key={`${execution.node}-${index}`} className="relative h-8 group">
              {/* Node name */}
              <div className="absolute left-0 top-0 bottom-0 w-32 pr-4 flex items-center justify-end text-sm truncate">
                {execution.node}
              </div>
              
              {/* Timeline bar */}
              <div className="absolute left-32 right-0 h-full bg-gray-50 border border-gray-200 rounded">
                {/* Execution bar */}
                <div
                  className={`absolute h-full rounded ${
                    execution.status === "success"
                      ? "bg-green-400"
                      : execution.status === "error"
                      ? "bg-red-400"
                      : "bg-blue-400 animate-pulse"
                  }`}
                  style={{
                    left: `${startOffset}%`,
                    width: `${Math.max(width, 0.5)}%`,
                  }}
                >
                  {/* Duration tooltip */}
                  <div className="absolute top-full mt-1 left-0 text-xs bg-gray-900 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                    <div>Node: {execution.node}</div>
                    <div>Start: {new Date(execution.startTime).toISOString()}</div>
                    {execution.endTime && (
                      <div>End: {new Date(execution.endTime).toISOString()}</div>
                    )}
                    <div>Duration: {execution.duration}ms</div>
                    <div>Status: {execution.status}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 