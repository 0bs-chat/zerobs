FROM ubuntu:22.04

# Install dependencies
RUN apt update         && \
    apt upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"  && \
    apt install -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"     \
        coreutils             \
        util-linux            \
        bsdutils              \
        file                  \
        openssl               \
        libssl-dev            \
        locales               \
        ca-certificates       \
        ssh                   \
        wget                  \
        patch                 \
        sudo                  \
        htop                  \
        dstat                 \
        vim                   \
        tmux                  \
        curl                  \
        git                   \
        jq                    \
        zsh                   \
        ksh                   \
        gcc                   \
        g++                   \
        xz-utils              \
        build-essential       \
        bash-completion       && \
    apt-get clean

ENV NVM_DIR=/root/.nvm
ENV NODE_VERSION=18

# Install NVM and Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash && \
    . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm use $NODE_VERSION && \
    nvm alias default $NODE_VERSION && \
    npm install -g bun

ENV NODE_PATH=$NVM_DIR/$NODE_VERSION/lib/node_modules
ENV PATH=$NVM_DIR/$NODE_VERSION/bin:$PATH

# Install Astral UV
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
RUN . $NVM_DIR/nvm.sh && \
    nvm use default && \
    echo "Bunx is available:" && \
    bunx --version && \
    echo "Bun is available:" && \
    bun --version

ENV MCP_COMMAND="bunx -y github-repo-mcp"
EXPOSE 8000
CMD ["/bin/bash", "-c", ". $NVM_DIR/nvm.sh && nvm use default && bunx -y supergateway --stdio '${MCP_COMMAND}' --port 8000 --base-url http://0.0.0.0:8000 --ssePath /sse --messagePath /message"]

# docker build -t mantrakp04/mcprunner:latest -f docker/Dockerfile-mcp .