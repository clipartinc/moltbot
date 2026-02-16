FROM node:22-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

ARG OPENCLAW_DOCKER_APT_PACKAGES=""
RUN if [ -n "$OPENCLAW_DOCKER_APT_PACKAGES" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $OPENCLAW_DOCKER_APT_PACKAGES && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    fi

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

# Cache bust - increment to force full rebuild
ARG CACHE_BUST=3
RUN echo "Build version: $(node -e \"console.log(require('./package.json').version)\")"
COPY . .
RUN pnpm build
# Force pnpm for UI build (Bun may fail on ARM/Synology architectures)
ENV OPENCLAW_PREFER_PNPM=1
RUN pnpm ui:build

ENV NODE_ENV=production

# Allow non-root user to write temp files during runtime/tests.
RUN chown -R node:node /app

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

# Copy startup script and ensure Unix line endings
COPY start.sh /app/start.sh
RUN sed -i 's/\r$//' /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
