"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useN8n } from "@/lib/api/n8n-provider";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const { configure, clear, isConfigured } = useN8n();
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    configure(apiKey, baseUrl, anthropicKey);
    router.push("/dashboard");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      
      <Card className="p-6 max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">n8n API Configuration</h2>
        
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              API Key
            </label>
            <Input
              type="password"
              placeholder="Enter your n8n API key"
              className="max-w-lg"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Your API key will be stored securely and used to fetch data from your n8n instance.
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">
              n8n Instance URL
            </label>
            <Input
              type="url"
              placeholder="https://your-n8n-instance.com"
              className="max-w-lg"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              The URL of your n8n instance (including http:// or https://)
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Anthropic API Key
            </label>
            <Input
              type="password"
              placeholder="Enter your Anthropic API key"
              className="max-w-lg"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Your Anthropic API key is required for creating and interacting with Claude-powered agents.
            </p>
          </div>
          
          <div className="flex gap-4">
            <Button type="submit">
              Save Settings
            </Button>
            {isConfigured && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  clear();
                  setApiKey("");
                  setBaseUrl("");
                  setAnthropicKey("");
                }}
              >
                Clear Settings
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
} 