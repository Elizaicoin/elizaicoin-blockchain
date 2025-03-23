const { createClient } = require('redis');

class RedisCache {
  constructor(options = {}) {
    this.client = createClient({
      url: options.url || process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.defaultExpiration = options.defaultExpiration || 60; // 60 seconds
    this.prefix = options.prefix || 'cache:';
    this.connected = false;
    
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    
    this.client.on('connect', () => {
      this.connected = true;
      console.log('Redis client connected');
    });
    
    this.client.on('end', () => {
      this.connected = false;
      console.log('Redis client disconnected');
    });
  }
  
  async connect() {
    if (!this.connected) {
      await this.client.connect();
    }
    return this;
  }
  
  async disconnect() {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }
  
  /**
   * Get a value from the cache
   * @param {string} key - The cache key
   * @returns {Promise<any>} - The cached value or null if not found
   */
  async get(key) {
    try {
      const fullKey = this.prefix + key;
      const value = await this.client.get(fullKey);
      
      if (!value) {
        return null;
      }
      
      return JSON.parse(value);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }
  
  /**
   * Set a value in the cache
   * @param {string} key - The cache key
   * @param {any} value - The value to cache
   * @param {number} [expiration] - Expiration time in seconds
   * @returns {Promise<boolean>} - True if successful, false otherwise
   */
  async set(key, value, expiration = this.defaultExpiration) {
    try {
      const fullKey = this.prefix + key;
      const stringValue = JSON.stringify(value);
      
      await this.client.set(fullKey, stringValue, {
        EX: expiration
      });
      
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }
  
  /**
   * Delete a value from the cache
   * @param {string} key - The cache key
   * @returns {Promise<boolean>} - True if successful, false otherwise
   */
  async del(key) {
    try {
      const fullKey = this.prefix + key;
      await this.client.del(fullKey);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }
  
  /**
   * Clear all cache entries with the configured prefix
   * @returns {Promise<boolean>} - True if successful, false otherwise
   */
  async clear() {
    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      
      return true;
    } catch (error) {
      console.error('Redis clear error:', error);
      return false;
    }
  }
  
  /**
   * Create a middleware function for Express
   * @param {number} [expiration] - Cache expiration time in seconds
   * @returns {Function} - Express middleware function
   */
  middleware(expiration = this.defaultExpiration) {
    return async (req, res, next) => {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }
      
      const cacheKey = req.originalUrl;
      
      try {
        // Try to get from cache
        const cachedData = await this.get(cacheKey);
        
        if (cachedData) {
          console.log(`Cache hit for ${cacheKey}`);
          return res.json(cachedData);
        }
        
        console.log(`Cache miss for ${cacheKey}`);
        
        // Store original send method
        const originalSend = res.send;
        
        // Override send method
        res.send = function(body) {
          // Only cache successful JSON responses
          if (res.statusCode === 200 && res.getHeader('content-type')?.includes('application/json')) {
            const data = JSON.parse(body);
            this.set(cacheKey, data, expiration)
              .catch(err => console.error('Redis cache middleware error:', err));
          }
          
          // Call original send method
          return originalSend.call(this, body);
        }.bind(this);
        
        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }
  
  /**
   * Get cache stats
   * @returns {Promise<object>} - Cache statistics
   */
  async getStats() {
    try {
      const keys = await this.client.keys(`${this.prefix}*`);
      const info = await this.client.info();
      
      return {
        cacheSize: keys.length,
        keys: keys.map(k => k.replace(this.prefix, '')),
        redisInfo: info
      };
    } catch (error) {
      console.error('Redis stats error:', error);
      return {
        error: error.message
      };
    }
  }
}

module.exports = RedisCache;
