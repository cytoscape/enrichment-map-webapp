FROM node:16

# Allow user configuration of variable at build-time using --build-arg flag
ARG NODE_ENV

# Initialize environment and override with build-time flag, if set
ENV NODE_ENV ${NODE_ENV:-production}

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY . .

# Note: NODE_ENV is development so that dev deps are installed
RUN NODE_ENV=development npm ci

RUN npm run build

EXPOSE 3000
CMD [ "npm", "start" ]
