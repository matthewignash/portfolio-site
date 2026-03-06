/**
 * CacheManager.gs — Wraps CacheService with chunking for large values
 *
 * Google Apps Script CacheService has a 100KB per-key limit.
 * This manager transparently chunks values exceeding that limit.
 *
 * TTL defaults:
 *   - Reference data (staff, timetable, _config): 1800s (30 min)
 *   - Module data (observations, cards, etc.):     300s  (5 min)
 *   - Computed aggregates (dashboards):             120s  (2 min)
 */

var CacheManager = (function() {

  var CHUNK_SIZE = 90000; // 90KB — stays safely under the 100KB limit
  var cache = CacheService.getScriptCache();

  // Default TTLs by table name prefix
  var TTL_MAP = {
    '_config': 1800,
    'staff': 1800,
    'timetable': 1800,
    '_meta': 1800
  };
  var DEFAULT_TTL = 300;
  var AGGREGATE_TTL = 120;

  /**
   * Returns the appropriate TTL for a given cache key.
   * Keys starting with "agg_" get the aggregate TTL.
   * Keys matching a known table name get that table's TTL.
   * Everything else gets the default module TTL.
   */
  function getTTL(key) {
    if (key.indexOf('agg_') === 0) return AGGREGATE_TTL;
    for (var prefix in TTL_MAP) {
      if (key.indexOf('table_' + prefix) === 0 || key === prefix) {
        return TTL_MAP[prefix];
      }
    }
    return DEFAULT_TTL;
  }

  /**
   * Retrieves a cached value by key.
   * Handles both direct (small) and chunked (large) values.
   * @param {string} key
   * @returns {*} Parsed value, or null if cache miss
   */
  function get(key) {
    // Try direct retrieval first
    var direct = cache.get(key);
    if (direct !== null) {
      try {
        return JSON.parse(direct);
      } catch (e) {
        return direct;
      }
    }

    // Check for chunked data via manifest
    var manifest = cache.get(key + '_manifest');
    if (!manifest) return null;

    var meta;
    try {
      meta = JSON.parse(manifest);
    } catch (e) {
      return null;
    }

    var chunkKeys = [];
    for (var i = 0; i < meta.chunks; i++) {
      chunkKeys.push(key + '_chunk_' + i);
    }

    // Batch retrieval of all chunks
    var chunkData = cache.getAll(chunkKeys);
    var assembled = '';
    for (var j = 0; j < meta.chunks; j++) {
      var chunk = chunkData[key + '_chunk_' + j];
      if (!chunk) {
        // A chunk expired — treat as full cache miss
        return null;
      }
      assembled += chunk;
    }

    try {
      return JSON.parse(assembled);
    } catch (e) {
      return null;
    }
  }

  /**
   * Stores a value in the cache.
   * Automatically chunks if the serialised value exceeds CHUNK_SIZE.
   * @param {string} key
   * @param {*} value - Will be JSON-serialised
   * @param {number} [ttl] - Time-to-live in seconds. Auto-determined from key if omitted.
   */
  function put(key, value, ttl) {
    if (ttl === undefined) ttl = getTTL(key);

    var json = JSON.stringify(value);

    if (json.length <= CHUNK_SIZE) {
      cache.put(key, json, ttl);
      return;
    }

    // Chunk the data
    var numChunks = Math.ceil(json.length / CHUNK_SIZE);
    var batchPut = {};
    for (var i = 0; i < numChunks; i++) {
      batchPut[key + '_chunk_' + i] = json.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    }
    batchPut[key + '_manifest'] = JSON.stringify({ chunks: numChunks });

    cache.putAll(batchPut, ttl);
  }

  /**
   * Removes a value (and any associated chunks) from the cache.
   * @param {string} key
   */
  function invalidate(key) {
    // Always try to remove the direct key
    cache.remove(key);

    // Check for chunked data
    var manifest = cache.get(key + '_manifest');
    if (manifest) {
      try {
        var meta = JSON.parse(manifest);
        var keysToRemove = [key + '_manifest'];
        for (var i = 0; i < meta.chunks; i++) {
          keysToRemove.push(key + '_chunk_' + i);
        }
        cache.removeAll(keysToRemove);
      } catch (e) {
        cache.remove(key + '_manifest');
      }
    }
  }

  /**
   * Invalidates the cached data for a specific table.
   * Convention: table data is cached under "table_{tableName}".
   * @param {string} tableName
   */
  function invalidateTable(tableName) {
    invalidate('table_' + tableName);
    // Also invalidate any known aggregate keys for this table
    invalidate('agg_' + tableName);
  }

  /**
   * Removes all cached items matching a set of keys.
   * @param {string[]} keys
   */
  function invalidateAll(keys) {
    keys.forEach(function(key) {
      invalidate(key);
    });
  }

  // Public API
  return {
    get: get,
    put: put,
    invalidate: invalidate,
    invalidateTable: invalidateTable,
    invalidateAll: invalidateAll,
    getTTL: getTTL,
    AGGREGATE_TTL: AGGREGATE_TTL,
    DEFAULT_TTL: DEFAULT_TTL
  };

})();
