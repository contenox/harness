import { BookOpen, CircleDot, GitPullRequest, Layers, ListChecks, NotebookPen } from 'lucide-react';

export const catalog = [
  {
    id: 'linear',
    name: 'Linear',
    url: 'https://mcp.linear.app/mcp',
    auth: 'oauth',
    docs: 'https://linear.app/docs/mcp',
    icon: CircleDot,
    color: 'text-accent',
  },
  {
    id: 'notion',
    name: 'Notion',
    url: 'https://mcp.notion.com/mcp',
    auth: 'oauth',
    docs: 'https://developers.notion.com/guides/mcp/get-started-with-mcp',
    icon: NotebookPen,
    color: 'text-text',
  },
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://api.githubcopilot.com/mcp/',
    auth: 'bearer',
    docs: 'https://github.com/github/github-mcp-server',
    icon: GitPullRequest,
    color: 'text-text',
  },
  {
    id: 'microsoft-learn',
    name: 'Microsoft Learn',
    url: 'https://learn.microsoft.com/api/mcp',
    auth: 'none',
    docs: 'https://learn.microsoft.com/en-us/training/support/mcp',
    icon: BookOpen,
    color: 'text-link',
  },
  {
    id: 'atlassian',
    name: 'Atlassian Rovo',
    url: 'https://mcp.atlassian.com/v1/mcp/authv2',
    auth: 'oauth',
    docs: 'https://support.atlassian.com/rovo/docs/getting-started-with-the-atlassian-rovo-mcp-server/',
    icon: Layers,
    color: 'text-link',
  },
  {
    id: 'asana',
    name: 'Asana',
    url: 'https://mcp.asana.com/v2/mcp',
    auth: 'oauth',
    docs: 'https://developers.asana.com/docs/integrating-with-asanas-mcp-server',
    icon: ListChecks,
    color: 'text-accent',
  },
] as const;

export type Entry = (typeof catalog)[number];
