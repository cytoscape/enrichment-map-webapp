FROM node:16

# Allow user configuration of variable at build-time using --build-arg flag
ARG NODE_ENV

# Initialize environment and override with build-time flag, if set
ENV NODE_ENV ${NODE_ENV:-production}

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Note: NODE_ENV is development so that dev deps are installed
# Note: Do this step before `COPY .` and `npm run build` in order to maximise sub-image/layer reuse
COPY package*.json .
RUN NODE_ENV=development npm ci

# Bundle app source
COPY . .
RUN npm run build

# N.b. PORT must be left to the default (3000)
EXPOSE 3000

# N.b. use a CMD without `npm start` to allow for cleaner exiting
CMD ["node", "-r", "dotenv-defaults/config", "./src/server/index.js" ]
