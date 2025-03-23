#!/usr/bin/env python3
"""
Stratum Protocol Server for Elizaicoin
Allows mining pools and miners to connect and mine EZC
"""

import asyncio
import json
import hashlib
import time
import logging
import uuid
import argparse
import signal
import sys
from typing import Dict, List, Any, Optional, Set
import scrypt_utils
from blockchain import Blockchain, Block

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('stratum_server')

# Global variables
blockchain = Blockchain()
connected_clients = {}
job_subscribers = set()
current_job_id = None
current_job = None
current_difficulty = 4
mining_address = None
server = None

class StratumClient:
    def __init__(self, reader, writer, client_id):
        self.reader = reader
        self.writer = writer
        self.client_id = client_id
        self.address = writer.get_extra_info('peername')
        self.subscribed = False
        self.authorized = False
        self.worker_name = None
        self.difficulty = current_difficulty
        self.shares_submitted = 0
        self.valid_shares = 0
        self.last_activity = time.time()
        
    async def send_response(self, response_data):
        """Send JSON response to client"""
        try:
            response_str = json.dumps(response_data) + '\n'
            self.writer.write(response_str.encode())
            await self.writer.drain()
            self.last_activity = time.time()
        except Exception as e:
            logger.error(f"Error sending response to {self.address}: {e}")
            
    async def handle_subscribe(self, message):
        """Handle subscription request"""
        # Standard subscription response with session ID and extranonce
        session_id = str(uuid.uuid4())
        extranonce1 = hashlib.sha256(session_id.encode()).hexdigest()[:8]
        extranonce2_size = 4
        
        response = {
            "id": message.get("id", 0),
            "result": [
                [
                    ["mining.set_difficulty", session_id],
                    ["mining.notify", session_id]
                ],
                extranonce1,
                extranonce2_size
            ],
            "error": None
        }
        
        self.subscribed = True
        job_subscribers.add(self.client_id)
        
        await self.send_response(response)
        
        # Send initial difficulty
        await self.send_difficulty(current_difficulty)
        
        # Send current job if available
        if current_job:
            await self.send_job(current_job, clean_jobs=True)
            
    async def handle_authorize(self, message):
        """Handle authorization request"""
        params = message.get("params", [])
        if len(params) < 2:
            await self.send_error_response(message.get("id", 0), -1, "Invalid params")
            return
            
        worker_name = params[0]
        worker_password = params[1]
        
        # In a real implementation, validate credentials
        # For this demo, we'll accept any worker
        self.authorized = True
        self.worker_name = worker_name
        
        response = {
            "id": message.get("id", 0),
            "result": True,
            "error": None
        }
        
        await self.send_response(response)
        logger.info(f"Worker {worker_name} authorized from {self.address}")
        
    async def handle_submit(self, message):
        """Handle share submission"""
        if not self.authorized:
            await self.send_error_response(message.get("id", 0), -1, "Not authorized")
            return
            
        params = message.get("params", [])
        if len(params) < 5:
            await self.send_error_response(message.get("id", 0), -1, "Invalid params")
            return
            
        worker_name = params[0]
        job_id = params[1]
        extranonce2 = params[2]
        ntime = params[3]
        nonce = params[4]
        
        self.shares_submitted += 1
        
        # Validate the share
        # In a real implementation, verify the proof of work
        # For this demo, we'll accept shares with a certain probability based on difficulty
        
        # Simulate share validation
        share_valid = True
        
        if share_valid:
            self.valid_shares += 1
            
            # Check if this share solves the block
            block_solved = False
            
            # If block is solved, add it to the blockchain
            if block_solved:
                # Create a new block with pending transactions
                new_block = blockchain.mine_pending_transactions(mining_address)
                logger.info(f"New block mined by {worker_name}: {new_block.hash}")
                
                # Generate a new job
                await generate_new_job()
                
            response = {
                "id": message.get("id", 0),
                "result": True,
                "error": None
            }
        else:
            response = {
                "id": message.get("id", 0),
                "result": False,
                "error": [20, "Invalid share", None]
            }
            
        await self.send_response(response)
        
    async def send_difficulty(self, difficulty):
        """Send difficulty to client"""
        self.difficulty = difficulty
        
        notification = {
            "id": None,
            "method": "mining.set_difficulty",
            "params": [difficulty]
        }
        
        await self.send_response(notification)
        
    async def send_job(self, job, clean_jobs=False):
        """Send job to client"""
        if not self.subscribed:
            return
            
        notification = {
            "id": None,
            "method": "mining.notify",
            "params": [
                job["job_id"],
                job["prevhash"],
                job["coinbase1"],
                job["coinbase2"],
                job["merkle_branch"],
                job["version"],
                job["nbits"],
                job["ntime"],
                clean_jobs
            ]
        }
        
        await self.send_response(notification)
        
    async def send_error_response(self, message_id, code, message):
        """Send error response to client"""
        response = {
            "id": message_id,
            "result": None,
            "error": [code, message, None]
        }
        
        await self.send_response(response)

async def handle_client(reader, writer):
    """Handle a client connection"""
    client_id = str(uuid.uuid4())
    client = StratumClient(reader, writer, client_id)
    connected_clients[client_id] = client
    
    addr = writer.get_extra_info('peername')
    logger.info(f"New connection from {addr}")
    
    try:
        while True:
            data = await reader.readline()
            if not data:
                break
                
            try:
                message = json.loads(data.decode())
                method = message.get("method", "")
                
                if method == "mining.subscribe":
                    await client.handle_subscribe(message)
                elif method == "mining.authorize":
                    await client.handle_authorize(message)
                elif method == "mining.submit":
                    await client.handle_submit(message)
                else:
                    # Unknown method
                    await client.send_error_response(message.get("id", 0), -1, f"Unknown method: {method}")
                    
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON from {addr}: {data.decode()}")
                
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Error handling client {addr}: {e}")
    finally:
        # Clean up
        if client_id in connected_clients:
            del connected_clients[client_id]
        if client_id in job_subscribers:
            job_subscribers.remove(client_id)
            
        writer.close()
        await writer.wait_closed()
        logger.info(f"Connection closed for {addr}")

async def generate_new_job():
    """Generate a new mining job"""
    global current_job_id, current_job
    
    # Get the latest block
    latest_block = blockchain.get_latest_block()
    
    # Create job parameters
    job_id = hashlib.sha256(f"{time.time()}".encode()).hexdigest()[:8]
    prevhash = latest_block.hash
    
    # In a real implementation, these would be properly constructed
    coinbase1 = "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff"
    coinbase2 = "ffffffff01"
    merkle_branch = []
    version = "00000002"
    nbits = format(blockchain.difficulty, '08x')
    ntime = format(int(time.time()), '08x')
    
    current_job_id = job_id
    current_job = {
        "job_id": job_id,
        "prevhash": prevhash,
        "coinbase1": coinbase1,
        "coinbase2": coinbase2,
        "merkle_branch": merkle_branch,
        "version": version,
        "nbits": nbits,
        "ntime": ntime
    }
    
    # Send job to all subscribed clients
    for client_id in job_subscribers:
        if client_id in connected_clients:
            client = connected_clients[client_id]
            await client.send_job(current_job)
            
    logger.info(f"New job generated: {job_id}")

async def update_difficulty():
    """Periodically update mining difficulty"""
    global current_difficulty
    
    while True:
        await asyncio.sleep(300)  # Check every 5 minutes
        
        # Get current blockchain difficulty
        new_difficulty = blockchain.difficulty
        
        if new_difficulty != current_difficulty:
            current_difficulty = new_difficulty
            logger.info(f"Updating difficulty to {current_difficulty}")
            
            # Send new difficulty to all clients
            for client_id, client in connected_clients.items():
                if client.subscribed:
                    await client.send_difficulty(current_difficulty)

async def monitor_clients():
    """Monitor client connections and clean up inactive ones"""
    while True:
        await asyncio.sleep(60)  # Check every minute
        
        current_time = time.time()
        clients_to_remove = []
        
        for client_id, client in connected_clients.items():
            # If client has been inactive for more than 10 minutes
            if current_time - client.last_activity > 600:
                clients_to_remove.append(client_id)
                
        for client_id in clients_to_remove:
            if client_id in connected_clients:
                client = connected_clients[client_id]
                logger.info(f"Removing inactive client: {client.address}")
                
                try:
                    client.writer.close()
                except:
                    pass
                    
                if client_id in connected_clients:
                    del connected_clients[client_id]
                if client_id in job_subscribers:
                    job_subscribers.remove(client_id)

async def start_server(host, port):
    """Start the stratum server"""
    global server
    
    # Generate initial job
    await generate_new_job()
    
    # Start the server
    server = await asyncio.start_server(handle_client, host, port)
    
    addr = server.sockets[0].getsockname()
    logger.info(f'Stratum server started on {addr}')
    
    # Start background tasks
    asyncio.create_task(update_difficulty())
    asyncio.create_task(monitor_clients())
    
    async with server:
        await server.serve_forever()

def handle_signal(sig, frame):
    """Handle termination signals"""
    logger.info("Shutting down stratum server...")
    if server:
        server.close()
    sys.exit(0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Elizaicoin Stratum Server')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=3333, help='Port to bind to')
    parser.add_argument('--address', type=str, required=True, help='Mining reward address')
    
    args = parser.parse_args()
    
    mining_address = args.address
    
    # Set up signal handlers
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    
    try:
        asyncio.run(start_server(args.host, args.port))
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
