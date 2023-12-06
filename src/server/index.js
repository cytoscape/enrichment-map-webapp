import express from 'express';
import path from 'path';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import debug from 'debug';
import http from 'http';
import logger from './logger.js';
import fs from 'fs';
import stream from 'stream';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";

import { NODE_ENV, PORT, UPLOAD_LIMIT, TESTING, SENTRY, SENTRY_ENVIRONMENT } from './env.js';
import indexRouter from './routes/index.js';
import apiRouter from './routes/api/index.js';
import createRouter from './routes/api/create.js';
import exportRouter from './routes/api/export.js';

import Datastore, { DB_1 } from './datastore.js';

console.info('Starting Express');

await Datastore.connect();
await Datastore.initializeGeneSetDB('./public/geneset-db/', DB_1);


const debugLog = debug('enrichment-map');
const app = express();
const server = http.createServer(app);

if (SENTRY) {
  Sentry.init({
    dsn: 'https://91d6fea963a1453abc1075637d2e7c76@o4504571938603008.ingest.sentry.io/4504571946467328',
    environment: SENTRY_ENVIRONMENT,
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Tracing.Integrations.Express({ app }),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,

    // Delete the HTTP body data sent from the client because it can be very
    // large and Sentry might reject it. The client sends the user's data to Sentry
    // as attachments so we don't need to record it here.
    beforeSend: (event) => {
      delete event.request.data;
      return event;
    },
  });

  console.log("Sentry initalized, environment: " + SENTRY_ENVIRONMENT);
}

// RequestHandler creates a separate execution context using domains, so that every
// transaction/span/breadcrumb is attached to its own Hub instance
if (SENTRY) {
  app.use(Sentry.Handlers.requestHandler());
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());
}

// view engine setup
app.set('views', path.join(__dirname, '../', 'views'));

// define an inexpensive html engine that doesn't do serverside templating
app.engine('html', function (filePath, options, callback){
  fs.readFile(filePath, function (err, content) {
    if( err ){ return callback( err ); }

    return callback( null, content.toString() );
  });
});

app.set('view engine', 'html');

if (!TESTING) {
  app.use(morgan('dev', {
    stream: new stream.Writable({
      write( chunk, encoding, next ){
        logger.info( chunk.toString('utf8').trim() );

        next();
      }
    })
  }));
}

app.use(bodyParser.json({ limit: UPLOAD_LIMIT }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../..', 'public')));

app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/api/create', createRouter);
app.use('/api/export', exportRouter);

// The error handler must be before any other error middleware and after all controllers
if (SENTRY) {
  app.use(Sentry.Handlers.errorHandler());
}

// catch 404 and forward to error handler
app.use(function(req, res) {
  res.render('index.html');
});

// development error handler
// will print stacktrace
if (NODE_ENV === 'development') {
  app.use(function(err, req, res) {
    res.status(err.status || 500);
    res.render('error.html');
  });
}

// production error handler
// no stacktraces leaked to user
// error page handler
app.use(function(err, req, res) {
  res.status(err.status || 500);
  res.render('error.html');
});

app.set('port', PORT);

server.listen(PORT);
server.on('error', onError);
server.on('listening', onListening);

// Connect to mongo

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  let bind = typeof PORT === 'string'
    ? 'Pipe ' + PORT
    : 'Port ' + PORT;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  let addr = server.address();
  let bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debugLog('Listening on ' + bind);
}

console.info('Express started');

export { app, server };