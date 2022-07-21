import express from 'express';
import path from 'path';
import favicon from 'serve-favicon';
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

import { NODE_ENV, PORT, UPLOAD_LIMIT, TESTING } from './env.js';
import indexRouter from './routes/index.js';
import apiRouter from './routes/api/index.js';
import { registerCytoscapeExtensions } from '../model/cy-extensions.js';

console.info('Starting Express');

import datastore from './datastore.js';

await datastore.connect();

// extensions/plugins
registerCytoscapeExtensions();

const debugLog = debug('enrichment-map');
const app = express();
const server = http.createServer(app);

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

app.use(favicon(path.join(__dirname, '../..', 'public', 'icon.png')));

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

app.use('/api', apiRouter);
app.use('/', indexRouter);

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