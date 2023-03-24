# Cytoscape Explore

## Required software

- [Node.js](https://nodejs.org/en/) 16.x, >=16.13
- [MongoDB](https://www.mongodb.com) ^5.x

## Getting started

**N.b. you can use [public service instances](https://github.com/BaderLab/sysadmin/blob/master/websites/em.env) for your local development to obviate local service dependencies.**  [See below for details.](#dependent-services)

- Windows Cloning

  - The `public` directory includes symlinks, which most versions of Windows Git will not correctly clone by default. Make sure to clone using the following command:
    - `git clone -c core.symlinks=true https://github.com/cytoscape/enrichment-map-webapp.git`

- Prerequisites:
  - Node.js
    - Option 1: Install [nvm](https://github.com/nvm-sh/nvm) so you can have multiple versions of node installed.
      - Install version 16 with `nvm install 16`.
      - Set version 16 as your default: `nvm alias default 16`.
      - To use a particular version, do `nvm use 16.0.1` or set up a `.nvmrc` file in the CWD and do `nvm use`.
    - Option 2: Install node manually:
      - Mac: `brew install node@16`
      - Linux: Use `dnf`, `zypper`, `apt`, etc.
      - Or use [the installer](https://nodejs.org/en/download/) for Mac or Windows
  - MongoDB
    - Mac: `brew install mongodb-community && brew services start mongodb-community`
    - Linux: Use `dnf`, `zypper`, `apt`, etc.
    - Or use [the installer](https://downloads.apache.org/couchdb/binary/mac/2.3.1/)
    - Use [MongoDB Compass](https://www.mongodb.com/products/compass) for debugging
- Start off by running `npm install`.
- The main target you will run during development is `npm run watch`.
  - This automatically builds the clientside code in the background. The browser will refresh automatically when the code is rebuilt.
  - The server will automatically reload when you change the server code. That way new HTTP requests from the client will use the updated code right away.
- <span id="dependent-services">Dependent services</span>:
  - MongoDB: If you have MongoDB running locally on the default port, you don't need to configure any environment variables to get things working. The defaults are preset for local development. 
  - [Java service](https://github.com/cytoscape/enrichmentmap-service):  This app depends on the Java webservice.  The project is set up to point to a local instance of the Java service by default.  A public instance is available at https://service.em.baderlab.org
  - [FGSEA service](https://github.com/cytoscape/fgsea-service):  This app depends on the FSGEA service.  The project is set up to point to a local instance of FGSEA by default.  A public instance is available at https://fgsea.em.baderlab.org
  - **N.b. you can use public service instances for your local development to obviate local service dependencies.  It is recommended to use a local instance of MongoDB, where possible, to avoid conflicts.  You can use [an `.env` file in the root of this project](https://github.com/BaderLab/sysadmin/blob/master/websites/em.env) with [the proper values](https://github.com/BaderLab/sysadmin/blob/master/websites/em.env) for remote services.  Do not commit the linked environment variables in public GitHub repositories.**
- The Chrome debugger can be used for the clientside code (Chrome > View > Developer > Developer Tools) or the serverside code (`npm run inspect` and go to [chrome://inspect](chrome://inspect)). There is also an included launch config file that allows you to debug the client or the server directly in VSC.

## Editor

- [Visual Studio Code](https://code.visualstudio.com)
- Extensions
  - Must-haves
    - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) : Lint JS.
    - [Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint) : Lint CSS.
    - [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome) : Use the VSC debugger on an instnace of Chrome, for debugging the browser UI.
  - Nice-to-haves
    - [GitHub Pull Requests and Issues](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-pull-request-github) : Easily browse and reference issues and pull requests.
    - [Live Share Extension Pack](https://marketplace.visualstudio.com/items?itemName=MS-vsliveshare.vsliveshare-pack) : Do remote pair programming.
    - [Docker](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker) : Manage docker images with a GUI.

## Configuration

The following environment variables can be used to configure the server:

- `NODE_ENV` : the environment mode, either `production` or `development` (default)
- `PORT` : the port on which the server runs (default 3000)
- `LOG_LEVEL` : the log level for `out.log`
- `BASE_URL` : the base url of the server (e.g. `https://example.com`)
- `UPLOAD_LIMIT` : max network upload size (e.g. `20kb`)
- `NDEX_API_URL`: the URL for the NDEx web application
- `MONGO_URL`: the MongoDB connection URL
- `FGSEA_SERVICE_URL`: the full path of the [FGSEA service](https://github.com/cytoscape/fgsea-service) (i.e. for a query, not the root URL)
- `EM_SERVICE_URL`: the pull path of the [Java service](https://github.com/cytoscape/enrichmentmap-service) (i.e. for a query, not the root URL)
- `MONGO_ROOT_NAME`: the name of the app's DB in Mongo
- `MONGO_COLLECTION_QUERIES`: the name of the query collection
- `SENTRY_ENVIRONMENT`: the Sentry environment name to use (automatic in prod mode, set to `test*` like `test_joe` to get Sentry reports in debug instances)

## Run targets

- `npm start` : start the server (usually for prod mode)
- `npm run watch` : watch mode (debug mode enabled, autorebuild, autoreload)
- `npm run inspect` : start the server in inspection mode, with server-side code debuggable via the chrome debugger with a breakpoint automatically set on the first line ([chrome://inspect](chrome://inspect))
- `npm run build` : build project
- `npm run build-prod` : build the project for production
- `npm run clean` : clean the project
- `npm run lint` : lint the project
- `npm run fix` : fix linting errors that can be automatically addressed
- `npm run test:mocha` : run model tests
- `npm test` : run model tests, linting, and a build (run this before doing a pull request)

## Running via Docker

Build the container. Here, `enrichment-map` is used as the container name.

```
cd enrichment-map
docker build -t enrichment-map .
```

Run the container:

```
docker run -it -p 12345:3000 -e "NODE_ENV=production" --name "my-enrichment-map" enrichment-map
```

Notes:

- The `-it` switches are necessary to make `node` respond to `ctrl+c` etc. in `docker`.
- The `-p` switch indicates that port 3000 on the container is mapped to port 12345 on the host. Without this switch, the server is inaccessible.
- The `-u` switch is used so that a non-root user is used inside the container.
- The `-e` switch is used to set environment variables. Alternatively use `--env-file` to use a file with the environment variables.
- References:
  - [Dockerizing a Node.js web app](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
  - [Documentation of docker-node](https://github.com/nodejs/docker-node)
  - [Docker CLI docs](https://docs.docker.com/engine/reference/commandline/cli/)

## Testing

All files `/test` will be run by [Mocha](https://mochajs.org/). You can `npm run test:mocha` to run all tests, or you can run `npm run test:mocha -- -g specific-test-name` to run specific tests.

[Chai](http://chaijs.com/) is included to make the tests easier to read and write.

By running `npm test`, you will run the tests, the linting, and a test build.

## Publishing a release

1. Make sure the tests are passing: `npm test`
1. Make sure the linting is passing: `npm run lint`
1. Bump the version number with `npm version`, in accordance with [semver](http://semver.org/). The `version` command in `npm` updates both `package.json` and git tags, but note that it uses a `v` prefix on the tags (e.g. `v1.2.3`).
1. For a bug fix / patch release, run `npm version patch`.
1. For a new feature release, run `npm version minor`.
1. For a breaking API change, run `npm version major.`
1. For a specific version number (e.g. 1.2.3), run `npm version 1.2.3`.
1. Push the release: `git push origin --tags`
