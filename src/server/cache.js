import { LRUCache } from 'lru-cache';


export const cache = new LRUCache({
  max: 25000,
  ttl: /*90 * 24 *  */60 * 60 * 1000, // 90 days in milliseconds
  allowStale: false, // do not return stale values
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});