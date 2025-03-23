# Elizaicoin Blockchain Project

A complete blockchain implementation based on an energy-efficient Scrypt PoW algorithm with a blockchain explorer and mining capabilities.

## Project Overview

This project consists of several main components:

1. **Blockchain Core** - A Python implementation of a blockchain using the Scrypt algorithm for Proof of Work (PoW) with energy efficiency features.
2. **Explorer Backend** - A Node.js backend that provides API endpoints for the explorer frontend and caches data using Redis.
3. **Explorer Frontend** - A React.js frontend that provides a user interface for exploring the blockchain, visualizing transactions, and mining new blocks.
4. **Mining Infrastructure** - Support for mining pools, HiveOS integration, and standalone miners.

Additionally, the project includes monitoring tools:

- **Prometheus** - For metrics collection
- **Grafana** - For metrics visualization and dashboards

## Features

### Core Blockchain

- Scrypt-based PoW algorithm (n=16384, r=8, p=1)
- Dynamic difficulty adjustment every 10 blocks
- Energy-efficient mining with rewards based on energy consumption
- Full chain validation
- RESTful API for interacting with the blockchain

### Blockchain Explorer

- Block explorer with pagination
- Transaction search by hash
- Real-time network statistics
- Transaction graph visualization
- Admin dashboard with metrics
- Mining interface

### Cryptocurrency

- Elizaicoin (EZC) with a maximum supply of 30 million coins
- Halving mechanism to control inflation
- Energy-based reward adjustments
- Mining support for pools and HiveOS

## Prerequisites

- Docker and Docker Compose
- Python 3.9+ (for local development)
- Node.js 16+ (for local development)

## Getting Started

### Using Docker Compose (Recommended)

1. Clone the repository:
   ```
   git clone <repository-url>
   cd blockchain_project
   ```

2. Start the services:
   ```
   docker-compose up -d
   ```

3. Access the applications:
   - Blockchain Explorer: http://localhost
   - Blockchain API: http://localhost:5000
   - Explorer Backend API: http://localhost:3000
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3001 (admin/admin)

### Starting the Stratum Mining Server

To enable mining with external miners and pools, start the Stratum server:

```bash
cd blockchain-core
python stratum_server.py --address YOUR_MINING_REWARD_ADDRESS
```

This will start a Stratum server on port 3333 that miners can connect to.

### Local Development

#### Blockchain Core

1. Navigate to the blockchain-core directory:
   ```
   cd blockchain-core
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Run the API server:
   ```
   python api.py
   ```

#### Explorer Backend

1. Navigate to the explorer-backend directory:
   ```
   cd explorer-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start Redis (required for caching):
   ```
   docker run -d -p 6379:6379 redis:alpine
   ```

4. Run the server:
   ```
   npm start
   ```

#### Explorer Frontend

1. Navigate to the explorer-frontend directory:
   ```
   cd explorer-frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm start
   ```

## API Documentation

### Blockchain Core API

The Blockchain Core API is documented using Swagger/OpenAPI. You can access the documentation at:

- http://localhost:5000/swagger-ui.html (when running with Docker)
- Or view the swagger.yaml file in the blockchain-core directory

### Explorer Backend API

The Explorer Backend API is also documented using Swagger/OpenAPI. You can access the documentation at:

- http://localhost:3000/api-docs (when running with Docker)
- Or view the swagger.yaml file in the explorer-backend directory

## Testing

### Blockchain Core

Run the tests with coverage:

```
cd blockchain-core
pytest --cov=. tests/
```

### Explorer Backend

Run the tests:

```
cd explorer-backend
npm test
```

### Explorer Frontend

Run the tests:

```
cd explorer-frontend
npm test
```

## Example API Requests

### Create a Transaction

```bash
curl -X POST http://localhost:5000/transactions/new \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "0x1234567890abcdef1234567890abcdef12345678",
    "recipient": "0xabcdef1234567890abcdef1234567890abcdef12",
    "amount": 10.5
  }'
```

### Mine a Block

```bash
curl http://localhost:5000/mine?miner=0x1234567890abcdef1234567890abcdef12345678
```

### Get Blockchain Stats

```bash
curl http://localhost:5000/stats
```

## Mining Elizaicoin (EZC)

Elizaicoin can be mined in several ways:

### Using the Web Interface

The simplest way to mine EZC is through the web interface at http://localhost. Navigate to the "Mine" tab and enter your wallet address to start mining.

### Using a Mining Pool

For more efficient mining, you can join a mining pool:

1. Configure your mining software to connect to a pool:
   ```
   stratum+tcp://pool.elizaicoin.example.com:3333
   ```

2. Use your EZC wallet address as the username, optionally followed by a worker name:
   ```
   EZCWalletAddress.worker1
   ```

3. Sample configurations for popular miners are provided in the `mining/standalone` directory.

### Using HiveOS

Elizaicoin is compatible with HiveOS mining platform:

1. Add a custom miner in HiveOS using the configuration file in `mining/hiveos/elizaicoin.conf`
2. Set your wallet address and pool information
3. Start mining with your HiveOS workers

### Setting Up Your Own Mining Pool

To set up your own mining pool:

1. Configure the pool settings in `mining/pool/config.json`
2. Start the pool server:
   ```bash
   cd mining/pool
   npm install
   npm start
   ```

3. Access the pool admin interface at http://localhost:8080

## Monitoring

The project includes Prometheus and Grafana for monitoring:

- **Prometheus** collects metrics from the blockchain core and explorer backend
- **Grafana** provides dashboards for visualizing these metrics

Default Grafana credentials: admin/admin

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│  Node.js Backend│────▶│  Python Core    │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                        ┌────────▼────────┐     ┌────────▼────────┐
                        │                 │     │                 │
                        │  Redis Cache    │     │ Stratum Server  │◀───┐
                        │                 │     │                 │    │
                        └─────────────────┘     └────────┬────────┘    │
                                 ▲                       │              │
                                 │                       ▼              │
                 ┌───────────────┴───────────┐    ┌─────────────┐      │
                 │                           │    │             │      │
    ┌────────────▼─────────────┐   ┌─────────▼────▼───────┐     │      │
    │                          │   │                      │     │      │
    │      Prometheus          │──▶│        Grafana       │     │      │
    │                          │   │                      │     │      │
    └──────────────────────────┘   └──────────────────────┘     │      │
                                                                │      │
                                                          ┌─────▼──────▼─┐
                                                          │              │
                                                          │ Mining Pools │
                                                          │              │
                                                          └──────┬───────┘
                                                                 │
                                                                 ▼
                                                          ┌─────────────┐
                                                          │             │
                                                          │   Miners    │
                                                          │             │
                                                          └─────────────┘
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
