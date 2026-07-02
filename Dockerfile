ARG NODE_IMAGE=node:22-alpine
FROM ${NODE_IMAGE}

WORKDIR /app

COPY package.json README.md README_zh.md LICENSE ./
COPY assets ./assets
COPY core ./core
COPY direct-html ./direct-html
COPY editor ./editor
COPY markdown ./markdown
COPY reference ./reference
COPY skills ./skills

RUN mkdir -p /workspace \
  && chown -R node:node /app /workspace

USER node

ENV HOST=0.0.0.0
ENV PORT=5174
ENV SJTU_WORKSPACE=/workspace

EXPOSE 5174
VOLUME ["/workspace"]

CMD ["node", "editor/server.js"]
