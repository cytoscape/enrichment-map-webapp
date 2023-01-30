/**
 * These fields come from env vars.
 *
 * Default values are specified in /.env
 *
 * You can normalise the values (e.g. with `parseInt()`, as all env vars are
 * strings).
 */

export const NODE_ENV = process.env.NODE_ENV;
export const PROD = NODE_ENV === 'production';
export const PORT = parseInt(process.env.PORT, 10);
export const LOG_LEVEL = process.env.LOG_LEVEL;
export const BASE_URL = process.env.BASE_URL;
export const UPLOAD_LIMIT = process.env.UPLOAD_LIMIT;
export const NDEX_API_URL = process.env.NDEX_API_URL;
export const MONGO_URL = process.env.MONGO_URL;
export const MONGO_ROOT_NAME = process.env.MONGO_ROOT_NAME;
export const MONGO_COLLECTION_QUERIES = process.env.MONGO_COLLECTION_QUERIES;
export const FGSEA_PRERANKED_SERVICE_URL = process.env.FGSEA_PRERANKED_SERVICE_URL;
export const FGSEA_RNASEQ_SERVICE_URL =  process.env.FGSEA_RNASEQ_SERVICE_URL;
export const EM_SERVICE_URL = process.env.EM_SERVICE_URL;
export const TESTING = ('' + process.env.TESTING).toLowerCase() === 'true';
