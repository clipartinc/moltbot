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

# Copy workspace templates and skills
RUN mkdir -p /data/workspace/skills
COPY workspace-templates/AGENTS.md /data/workspace/AGENTS.md
COPY workspace-templates/SOUL.md /data/workspace/SOUL.md
COPY openclaw-skills /data/workspace/openclaw-skills

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

# USER node  <-- remove / comment out
CMD ["sh", "-lc", "\
  rm -f /root/.moltbot/moltbot.json /root/.clawdbot/clawdbot.json 2>/dev/null || true && \
  node dist/index.js gateway --bind lan --port ${PORT:-8080}"]



