/**
 * These fields come from env vars.
 *
 * Default values are specified in /.env
 *
 * You can normalise the values (e.g. with `parseInt()`, as all env vars are strings).
 */


// Node/Express config
export const NODE_ENV = process.env.NODE_ENV;
export const PORT = parseInt(process.env.PORT, 10);
export const LOG_LEVEL = process.env.LOG_LEVEL;
export const BASE_URL = process.env.BASE_URL;
export const UPLOAD_LIMIT = process.env.UPLOAD_LIMIT;
export const TESTING = ('' + process.env.TESTING).toLowerCase() === 'true';
export const REPORT_SECRET = process.env.REPORT_SECRET;

// Service config
export const FGSEA_PRERANKED_SERVICE_URL = process.env.FGSEA_PRERANKED_SERVICE_URL;
export const FGSEA_RNASEQ_SERVICE_URL =  process.env.FGSEA_RNASEQ_SERVICE_URL;
export const EM_SERVICE_URL = process.env.EM_SERVICE_URL;
export const BRIDGEDB_URL = process.env.BRIDGEDB_URL;

// Mongo config
export const MONGO_URL = process.env.MONGO_URL;
export const MONGO_ROOT_NAME = process.env.MONGO_ROOT_NAME;

// Sentry config
export const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT;
export const SENTRY = NODE_ENV === 'production' || (SENTRY_ENVIRONMENT && SENTRY_ENVIRONMENT.startsWith('test'));

// S3/R2 config
export const S3_ENDPOINT = process.env.S3_ENDPOINT;
export const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
export const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
export const S3_USER_UPLOAD_BUCKET = process.env.S3_USER_UPLOAD_BUCKET;
