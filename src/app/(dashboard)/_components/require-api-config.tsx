"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useN8n } from "@/lib/api/n8n-provider";

interface RequireApiConfigProps {
  children: React.ReactNode;
}

export function RequireApiConfig({ children }: RequireApiConfigProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isConfigured } = useN8n();

  useEffect(() => {
    if (!isConfigured && !pathname.includes("/settings")) {
      router.push("/dashboard/settings");
    }
  }, [isConfigured, router, pathname]);

  if (!isConfigured && !pathname.includes("/settings")) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">API Not Configured</h2>
          <p className="text-muted-foreground">
            Redirecting to settings...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 