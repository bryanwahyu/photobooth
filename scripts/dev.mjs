/**
 * Runs `next dev` without the AI-agent env markers.
 *
 * `next dev` scaffolds AGENTS.md / CLAUDE.md whenever it detects an agent
 * session (see node_modules/next/dist/server/lib/app-info-log.js →
 * ensureAgentRulesForDev). Detection reads only these env vars, so clearing
 * them keeps the project tree free of those files.
 */
import { spawn } from "node:child_process";

const AGENT_ENV_VARS = [
  "AI_AGENT",
  "ANTIGRAVITY_AGENT",
  "AUGMENT_AGENT",
  "CLAUDECODE",
  "CLAUDE_CODE",
  "CLAUDE_CODE_IS_COWORK",
  "CODEX_CI",
  "CODEX_SANDBOX",
  "CODEX_THREAD_ID",
  "COPILOT_ALLOW_ALL",
  "COPILOT_GITHUB_TOKEN",
  "COPILOT_MODEL",
  "CURSOR_AGENT",
  "CURSOR_EXTENSION_HOST_ROLE",
  "CURSOR_TRACE_ID",
  "GEMINI_CLI",
  "OPENCODE_CLIENT",
  "REPL_ID",
];

const env = { ...process.env };
for (const key of AGENT_ENV_VARS) delete env[key];

const child = spawn("next", ["dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
