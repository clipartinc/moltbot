#!/bin/sh
set -e

echo "Starting Moltbot..."

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

# Configure model (Kimi K2 primary, OpenAI fallback)
echo "Setting up model: Kimi K2 (primary), OpenAI gpt-4o (fallback)"
node dist/index.js config set agents.defaults.model.primary "moonshot/kimi-k2-0905-preview" || true
echo "Model configured"

# Configure heartbeat model (Kimi K2 via Moonshot - cheaper for periodic checks)
if [ -n "$MOONSHOT_API_KEY" ]; then
  echo "Configuring Kimi K2 for heartbeats"
  node dist/index.js config set agents.defaults.heartbeat.model "moonshot/kimi-k2-0905-preview" || true
  echo "Kimi heartbeat model configured"
fi

# Configure gateway auth
if [ -n "$CLAWDBOT_GATEWAY_TOKEN" ]; then
  echo "Gateway token auth enabled"
  node dist/index.js config set gateway.auth.mode token || true
  node dist/index.js config set gateway.controlUi.allowInsecureAuth true || true
fi

# Start gateway
echo "Starting gateway..."
exec node dist/index.js gateway --bind lan --port ${PORT:-8080} --verbose
