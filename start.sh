#!/bin/sh
set -e

# Cleanup old config and lock files
rm -f /root/.moltbot/moltbot.json /root/.clawdbot/clawdbot.json 2>/dev/null || true
echo "Cleaning up stale lock files..."
find /data -name "*.lock" -type f -delete 2>/dev/null || true
find /root/.clawdbot -name "*.lock" -type f -delete 2>/dev/null || true

# Copy workspace files
mkdir -p /data/workspace
cp -f /app/workspace-init/AGENTS.md /data/workspace/AGENTS.md
cp -f /app/workspace-init/SOUL.md /data/workspace/SOUL.md
cp -rf /app/workspace-init/openclaw-skills /data/workspace/
echo "Workspace files copied"

# Configure Discord
echo "Configuring Discord..."
node dist/index.js config set channels.discord.enabled true || true
node dist/index.js config set channels.discord.groupPolicy open || true
node dist/index.js config set channels.discord.dm.policy open || true
node dist/index.js config set "channels.discord.guilds.*.requireMention" false || true
node dist/index.js config set "channels.discord.guilds.*.channels.*.requireMention" false || true
echo "Discord configured"

# Configure model
echo "Setting up model: OpenAI gpt-4o"
node dist/index.js config set agents.defaults.model.primary "openai/gpt-4o" || true
echo "Model configured"

# Configure gateway auth mode (token value comes from env var at runtime)
if [ -n "$CLAWDBOT_GATEWAY_TOKEN" ]; then
  echo "Gateway token auth enabled"
  node dist/index.js config set gateway.auth.mode token || true
fi
if [ -n "$CLAWDBOT_GATEWAY_PASSWORD" ]; then
  echo "Gateway password auth enabled"
  node dist/index.js config set gateway.auth.mode password || true
fi

# Start gateway
exec node dist/index.js gateway --bind lan --port ${PORT:-8080} --verbose
