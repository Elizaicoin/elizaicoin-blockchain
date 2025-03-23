const express = require('express');
const cors = require('cors');
const axios = require('axios');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const { createClient } = require('redis');
const { promisify } = require('util');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const prometheus = require('prom-client');

// Load Swagger document
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL || 'http://localhost:5000';
const CACHE_EXPIRATION = 60; // Cache expiration in seconds

// Redis client setup
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Promisify Redis methods
const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);

// Connect to Redis
(async () => {
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  await redisClient.connect();
  console.log('Connected to Redis');
})();

// Prometheus metrics
const register = new prometheus.Registry();
prometheus.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [1, 5, 15, 50, 100, 200, 500, 1000, 2000]
});

const blockchainRequestCounter = new prometheus.Counter({
  name: 'blockchain_api_requests_total',
  help: 'Total number of requests to the blockchain API',
  labelNames: ['endpoint']
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(blockchainRequestCounter);

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(morgan('combined'));

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds
      .labels(req.method, req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});

// Cache middleware
const cacheMiddleware = async (req, res, next) => {
  const cacheKey = `cache:${req.originalUrl}`;
  
  try {
    const cachedData = await getAsync(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for ${req.originalUrl}`);
      return res.json(JSON.parse(cachedData));
    }
    
    console.log(`Cache miss for ${req.originalUrl}`);
    
    // Store the original send method
    const originalSend = res.send;
    
    // Override the send method
    res.send = function(body) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        setAsync(cacheKey, body, 'EX', CACHE_EXPIRATION)
          .catch(err => console.error('Redis cache error:', err));
      }
      
      // Call the original send method
      originalSend.call(this, body);
    };
    
    next();
  } catch (error) {
    console.error('Cache middleware error:', error);
    next();
  }
};

// API routes
app.get('/api/blocks', cacheMiddleware, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const perPage = req.query.per_page || 10;
    
    blockchainRequestCounter.inc({ endpoint: 'blocks' });
    
    const response = await axios.get(`${BLOCKCHAIN_API_URL}/blocks`, {
      params: { page, per_page: perPage }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching blocks:', error);
    res.status(500).json({ error: 'Failed to fetch blocks' });
  }
});

app.get('/api/blocks/:blockId', cacheMiddleware, async (req, res) => {
  try {
    const { blockId } = req.params;
    
    blockchainRequestCounter.inc({ endpoint: 'block_detail' });
    
    const response = await axios.get(`${BLOCKCHAIN_API_URL}/blocks/${blockId}`);
    
    res.json(response.data);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Block not found' });
    }
    
    console.error('Error fetching block:', error);
    res.status(500).json({ error: 'Failed to fetch block' });
  }
});

app.get('/api/transactions', cacheMiddleware, async (req, res) => {
  try {
    blockchainRequestCounter.inc({ endpoint: 'transactions' });
    
    const response = await axios.get(`${BLOCKCHAIN_API_URL}/transactions`);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.get('/api/transactions/:txHash', cacheMiddleware, async (req, res) => {
  try {
    const { txHash } = req.params;
    
    blockchainRequestCounter.inc({ endpoint: 'transaction_detail' });
    
    const response = await axios.get(`${BLOCKCHAIN_API_URL}/transactions/${txHash}`);
    
    res.json(response.data);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    blockchainRequestCounter.inc({ endpoint: 'create_transaction' });
    
    const response = await axios.post(`${BLOCKCHAIN_API_URL}/transactions/new`, req.body);
    
    // Invalidate cache for transactions
    await redisClient.del('cache:/api/transactions');
    
    res.status(201).json(response.data);
  } catch (error) {
    if (error.response && error.response.status === 400) {
      return res.status(400).json(error.response.data);
    }
    
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

app.get('/api/mine', async (req, res) => {
  try {
    const { miner } = req.query;
    
    blockchainRequestCounter.inc({ endpoint: 'mine' });
    
    const response = await axios.get(`${BLOCKCHAIN_API_URL}/mine`, {
      params: { miner }
    });
    
    // Invalidate caches
    await redisClient.del('cache:/api/blocks');
    await redisClient.del('cache:/api/transactions');
    await redisClient.del('cache:/api/stats');
    await redisClient.del('cache:/api/coin/info');
    
    res.json(response.data);
  } catch (error) {
    console.error('Error mining block:', error);
    res.status(500).json({ error: 'Failed to mine block' });
  }
});

app.get('/api/stats', cacheMiddleware, async (req, res) => {
  try {
    blockchainRequestCounter.inc({ endpoint: 'stats' });
    
    const response = await axios.get(`${BLOCKCHAIN_API_URL}/stats`);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/coin/info', cacheMiddleware, async (req, res) => {
  try {
    blockchainRequestCounter.inc({ endpoint: 'coin_info' });
    
    const response = await axios.get(`${BLOCKCHAIN_API_URL}/coin/info`);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching coin info:', error);
    res.status(500).json({ error: 'Failed to fetch coin info' });
  }
});

app.get('/api/validate', async (req, res) => {
  try {
    blockchainRequestCounter.inc({ endpoint: 'validate' });
    
    const response = await axios.get(`${BLOCKCHAIN_API_URL}/chain/validate`);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error validating chain:', error);
    res.status(500).json({ error: 'Failed to validate chain' });
  }
});

// Transaction graph data
app.get('/api/graph/transactions', cacheMiddleware, async (req, res) => {
  try {
    blockchainRequestCounter.inc({ endpoint: 'graph_data' });
    
    // Get all blocks
    const blocksResponse = await axios.get(`${BLOCKCHAIN_API_URL}/blocks`, {
      params: { per_page: 100 } // Get a larger number of blocks for the graph
    });
    
    const blocks = blocksResponse.data.blocks;
    
    // Extract transactions and build graph data
    const nodes = new Map();
    const links = [];
    
    blocks.forEach(block => {
      block.transactions.forEach(tx => {
        // Skip coinbase transactions
        if (tx.sender === "0" && tx.data && tx.data.type === "mining_reward") {
          return;
        }
        
        // Add sender node if not exists
        if (!nodes.has(tx.sender)) {
          nodes.set(tx.sender, {
            id: tx.sender,
            group: 1,
            value: 0
          });
        }
        
        // Add recipient node if not exists
        if (!nodes.has(tx.recipient)) {
          nodes.set(tx.recipient, {
            id: tx.recipient,
            group: 2,
            value: 0
          });
        }
        
        // Update node values
        const senderNode = nodes.get(tx.sender);
        senderNode.value += tx.amount;
        
        const recipientNode = nodes.get(tx.recipient);
        recipientNode.value += tx.amount;
        
        // Add link
        links.push({
          source: tx.sender,
          target: tx.recipient,
          value: tx.amount,
          timestamp: tx.timestamp
        });
      });
    });
    
    // Convert nodes map to array
    const nodesArray = Array.from(nodes.values());
    
    res.json({
      nodes: nodesArray,
      links: links
    });
  } catch (error) {
    console.error('Error generating transaction graph:', error);
    res.status(500).json({ error: 'Failed to generate transaction graph' });
  }
});

// Admin metrics
app.get('/api/admin/metrics', async (req, res) => {
  try {
    blockchainRequestCounter.inc({ endpoint: 'admin_metrics' });
    
    // Get blockchain stats
    const statsResponse = await axios.get(`${BLOCKCHAIN_API_URL}/stats`);
    const stats = statsResponse.data;
    
    // Get coin info
    const coinResponse = await axios.get(`${BLOCKCHAIN_API_URL}/coin/info`);
    const coinInfo = coinResponse.data;
    
    // Calculate additional metrics
    const avgBlockTime = stats.avg_block_time || 0;
    const energyPerTx = stats.energy_per_transaction || 0;
    const difficulty = stats.difficulty || 0;
    
    // Get historical difficulty data (simplified for this example)
    // In a real implementation, you would store historical data in a database
    const difficultyDistribution = [
      { difficulty: difficulty - 2, blocks: Math.floor(Math.random() * 10) },
      { difficulty: difficulty - 1, blocks: Math.floor(Math.random() * 20) },
      { difficulty: difficulty, blocks: Math.floor(Math.random() * 30) },
      { difficulty: difficulty + 1, blocks: Math.floor(Math.random() * 15) },
      { difficulty: difficulty + 2, blocks: Math.floor(Math.random() * 5) }
    ].filter(item => item.difficulty > 0);
    
    res.json({
      avg_block_time: avgBlockTime,
      energy_per_transaction: energyPerTx,
      difficulty_distribution: difficultyDistribution,
      current_supply: coinInfo.current_supply,
      max_supply: coinInfo.max_supply,
      supply_percentage: coinInfo.supply_percentage,
      blocks: stats.blocks,
      transactions: stats.transactions
    });
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    res.status(500).json({ error: 'Failed to fetch admin metrics' });
  }
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Explorer backend server running on port ${PORT}`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await redisClient.quit();
  process.exit(0);
});
