import { Card } from "@/components/ui/card";

interface Execution {
  id: string;
  startedAt: string;
  stoppedAt?: string;
  status: string;
}

interface WorkflowTimelineProps {
  executions: Execution[];
}

export function WorkflowTimeline({ executions }: WorkflowTimelineProps) {
  if (executions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No executions available
      </div>
    );
  }

  // Sort executions by start time
  const sortedExecutions = [...executions].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );

  // Calculate timeline scale
  const startTime = new Date(sortedExecutions[0].startedAt).getTime();
  const endTime = Math.max(
    ...sortedExecutions.map(exec => 
      exec.stoppedAt 
        ? new Date(exec.stoppedAt).getTime() 
        : new Date(exec.startedAt).getTime()
    )
  );
  const timelineDuration = endTime - startTime;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Execution Timeline</h3>
      
      {/* Timeline header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
        <span>{new Date(startTime).toLocaleString()}</span>
        <span>{new Date(endTime).toLocaleString()}</span>
      </div>

      {/* Timeline bars */}
      <div className="space-y-2">
        {sortedExecutions.map((execution) => {
          const startOffset = ((new Date(execution.startedAt).getTime() - startTime) / timelineDuration) * 100;
          const duration = execution.stoppedAt
            ? new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime()
            : 0;
          const width = duration ? (duration / timelineDuration) * 100 : 2;

          return (
            <div key={execution.id} className="relative h-8 group">
              {/* Execution ID */}
              <div className="absolute left-0 top-0 bottom-0 w-32 pr-4 flex items-center justify-end text-sm truncate">
                #{execution.id}
              </div>
              
              {/* Timeline bar */}
              <div className="absolute left-32 right-0 h-full bg-gray-50 border border-gray-200 rounded">
                {/* Execution bar */}
                <div
                  className={`absolute h-full rounded ${
                    execution.status === "success"
                      ? "bg-green-500"
                      : execution.status === "error"
                      ? "bg-red-500"
                      : "bg-blue-500 animate-pulse"
                  }`}
                  style={{
                    left: `${startOffset}%`,
                    width: `${Math.max(width, 2)}%`,
                  }}
                >
                  {/* Tooltip */}
                  <div className="absolute top-full mt-1 left-0 text-xs bg-gray-900 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                    <div>Execution #{execution.id}</div>
                    <div>Started: {new Date(execution.startedAt).toLocaleString()}</div>
                    {execution.stoppedAt && (
                      <>
                        <div>Ended: {new Date(execution.stoppedAt).toLocaleString()}</div>
                        <div>Duration: {(duration / 1000).toFixed(2)}s</div>
                      </>
                    )}
                    <div>Status: {execution.status}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded bg-green-500 mr-2"></div>
          Success
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded bg-red-500 mr-2"></div>
          Error
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded bg-blue-500 mr-2"></div>
          Running
        </div>
      </div>
    </Card>
  );
} 