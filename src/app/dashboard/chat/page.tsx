"use client";

import { AgentChat } from "./_components/agent-chat";

export default function ChatPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">n8n Agent Chat</h1>
      <div className="max-w-4xl mx-auto">
        <AgentChat />
      </div>
    </div>
  );
} 