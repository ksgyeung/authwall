FROM node:17-bullseye-slim
WORKDIR /opt/app

COPY yarn.lock .
COPY package.json .
COPY src/* ./src

RUN yarn install

VOLUME [ "/opt/app/tmp" ]
EXPOSE 3000

ENTRYPOINT [ "/usr/bin/env", "node", "/opt/app/src/index.mjs" ]
