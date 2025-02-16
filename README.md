# Agent Ops Dashboard

A modern dashboard for managing and monitoring your n8n agents. "Cursor for agents"

<div align="center">
  <img src="docs/dashboard-overview.png" alt="n8n Dashboard Overview" width="800"/>
  <br/>
  <em>Dashboard Overview: Monitor your agents and executions</em>
  <br/><br/>
  <img src="docs/agent-chat.png" alt="AI Agent Chat Interface" width="800"/>
  <br/>
  <em>AI Agent Chat: Create and manage your n8n agents with natural language</em>
  <br/><br/>
  <img src="docs/n8n-screen.png" alt="n8n Workflow Editor" width="800"/>
  <br/>
  <em>n8n Workflow Editor: Build and configure your agents visually</em>
</div>

## Watch it in Action

https://github.com/user-attachments/assets/4145677b-8ac2-4bd5-9d9a-4798f46eadb4


## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

## Configuration

### Required Settings

Before using the dashboard, you need to configure the following settings:

1. **n8n Instance Configuration**
   - The dashboard works with any n8n instance:
     - [n8n Cloud](https://www.n8n.io/cloud/): Use n8n's managed cloud service
     - Self-hosted: Install and run n8n on your own infrastructure ([Self-hosting guide](https://docs.n8n.io/hosting/))
   - Enter your n8n instance URL:
     - For n8n Cloud: Your cloud instance URL (e.g., `https://your-workspace.app.n8n.cloud`)
     - For self-hosted: Your instance URL (e.g., `http://localhost:5678`)
   - Add your n8n API key
     - To get your API key:
       1. Log into your n8n instance
       2. Go to Settings > API
       3. Create a new API key with appropriate permissions
       4. Copy the generated key

2. **Anthropic API Key**
   - Go to the Settings page in the dashboard
   - Enter your Anthropic API key
     - To get an API key:
       1. Visit [Anthropic's website](https://www.anthropic.com)
       2. Sign up or log in to your account
       3. Navigate to the API section
       4. Generate a new API key
       5. Copy the key

### Environment Variables

If you prefer to set these values via environment variables, create a `.env.local` file in the root directory with:

```env
NEXT_PUBLIC_N8N_URL=your_n8n_url
NEXT_PUBLIC_N8N_API_KEY=your_n8n_api_key
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Features

- Modern, responsive dashboard interface
- Real-time agent monitoring
- Execution history and statistics
- AI-powered agent chat assistance
- Workflow visualization and management
- Integration with n8n's API

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [n8n Documentation](https://docs.n8n.io)
- [Anthropic Claude Documentation](https://docs.anthropic.com)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
