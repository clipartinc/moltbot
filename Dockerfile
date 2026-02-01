FROM node:22-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

ARG CLAWDBOT_DOCKER_APT_PACKAGES=""
RUN if [ -n "$CLAWDBOT_DOCKER_APT_PACKAGES" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $CLAWDBOT_DOCKER_APT_PACKAGES && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    fi

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .
RUN CLAWDBOT_A2UI_SKIP_MISSING=1 pnpm build
# Force pnpm for UI build (Bun may fail on ARM/Synology architectures)
ENV CLAWDBOT_PREFER_PNPM=1
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production


# Ensure persistent volume is writable by non-root user
RUN mkdir -p /data && chown -R node:node /data

# Copy workspace templates to a staging area (will be copied to /data at runtime)
RUN mkdir -p /app/workspace-init
COPY workspace-templates/AGENTS.md /app/workspace-init/AGENTS.md
COPY workspace-templates/SOUL.md /app/workspace-init/SOUL.md
COPY openclaw-skills /app/workspace-init/openclaw-skills

# Security hardening: Run as non-root user
# The node:22-bookworm image includes a 'node' user (uid 1000)
# This reduces the attack surface by preventing container escape via root privileges
#USER node

# Railway sets PORT; default to 8080 locally
ENV PORT=8080

# Expose port for Railway private networking
EXPOSE 8080

# Hooks configuration (set via environment variables)
ENV MOLTBOT_HOOKS_ENABLED=true

# Create startup script
# MODEL OPTIONS (set MOLTBOT_MODEL env var in Railway):
#   Budget:    openai/gpt-4o-mini, google/gemini-1.5-flash, anthropic/claude-haiku-4-5
#   Balanced:  openai/gpt-4o, google/gemini-1.5-pro, anthropic/claude-sonnet-4
#   Premium:   anthropic/claude-opus-4-5 (default)
RUN printf '#!/bin/sh\n\
set -e\n\
rm -f /root/.moltbot/moltbot.json /root/.clawdbot/clawdbot.json 2>/dev/null || true\n\
echo "Cleaning up stale lock files..."\n\
find /data -name "*.lock" -type f -delete 2>/dev/null || true\n\
find /root/.clawdbot -name "*.lock" -type f -delete 2>/dev/null || true\n\
mkdir -p /data/workspace\n\
cp -f /app/workspace-init/AGENTS.md /data/workspace/AGENTS.md\n\
cp -f /app/workspace-init/SOUL.md /data/workspace/SOUL.md\n\
cp -rf /app/workspace-init/openclaw-skills /data/workspace/\n\
echo "Workspace files copied"\n\
echo "Configuring Discord..."\n\
node dist/index.js config set channels.discord.enabled true || true\n\
node dist/index.js config set channels.discord.groupPolicy open || true\n\
node dist/index.js config set channels.discord.dm.policy open || true\n\
node dist/index.js config set "channels.discord.guilds.*.requireMention" false || true\n\
node dist/index.js config set "channels.discord.guilds.*.channels.*.requireMention" false || true\n\
echo "Discord configured"\n\
echo "Setting up model fallback chain: OpenAI -> Claude -> Gemini"\n\
node dist/index.js config set agents.defaults.model.primary "openai/gpt-4o" || true\n\
node dist/index.js config set agents.defaults.model.fallbacks "[\\\"anthropic/claude-opus-4-5\\\", \\\"google/gemini-1.5-pro\\\"]" || true\n\
echo "Model fallbacks configured"\n\
exec node dist/index.js gateway --bind lan --port ${PORT:-8080} --verbose\n\
' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]



