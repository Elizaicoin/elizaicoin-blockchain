from flask import Flask, jsonify, request, abort
from blockchain import Blockchain, Block
import scrypt_utils
import json
import uuid
from typing import Dict, List, Any, Optional
from flask_cors import CORS
import time

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize blockchain
blockchain = Blockchain()

# Generate a node identifier
node_identifier = str(uuid.uuid4()).replace('-', '')

@app.route('/blocks', methods=['GET'])
def get_blocks():
    """
    Get all blocks in the blockchain.
    
    Query parameters:
    - page: Page number (default: 1)
    - per_page: Number of blocks per page (default: 10)
    
    Returns:
        JSON response with blocks data
    """
    # Get pagination parameters
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    
    # Get chain data
    chain_data = blockchain.get_chain_data()
    
    # Calculate pagination
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated_data = chain_data[start_idx:end_idx]
    
    response = {
        'blocks': paginated_data,
        'total_blocks': len(chain_data),
        'page': page,
        'per_page': per_page,
        'total_pages': (len(chain_data) + per_page - 1) // per_page
    }
    
    return jsonify(response), 200

@app.route('/blocks/<string:block_id>', methods=['GET'])
def get_block(block_id):
    """
    Get a specific block by index or hash.
    
    Args:
        block_id: Block index or hash
        
    Returns:
        JSON response with block data
    """
    # Try to parse as index
    try:
        index = int(block_id)
        block = blockchain.get_block_by_index(index)
        if block:
            return jsonify(block.to_dict()), 200
    except ValueError:
        # Not an integer, try as hash
        block = blockchain.get_block_by_hash(block_id)
        if block:
            return jsonify(block.to_dict()), 200
    
    # Block not found
    return jsonify({'error': 'Block not found'}), 404

@app.route('/transactions', methods=['GET'])
def get_transactions():
    """
    Get all pending transactions.
    
    Returns:
        JSON response with pending transactions
    """
    response = {
        'pending_transactions': blockchain.pending_transactions,
        'count': len(blockchain.pending_transactions)
    }
    
    return jsonify(response), 200

@app.route('/transactions/<string:tx_hash>', methods=['GET'])
def get_transaction(tx_hash):
    """
    Get a specific transaction by hash.
    
    Args:
        tx_hash: Transaction hash
        
    Returns:
        JSON response with transaction data
    """
    transaction = blockchain.get_transaction_by_hash(tx_hash)
    
    if transaction:
        return jsonify(transaction), 200
    
    # Transaction not found
    return jsonify({'error': 'Transaction not found'}), 404

@app.route('/transactions/new', methods=['POST'])
def new_transaction():
    """
    Create a new transaction.
    
    Request body:
    - sender: Sender address
    - recipient: Recipient address
    - amount: Amount to transfer (in EZC)
    - data: Additional transaction data (optional)
    
    Returns:
        JSON response with transaction result
    """
    values = request.get_json()
    
    # Check required fields
    required = ['sender', 'recipient', 'amount']
    if not all(k in values for k in required):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Create new transaction
    index = blockchain.add_transaction(
        sender=values['sender'],
        recipient=values['recipient'],
        amount=float(values['amount']),
        data=values.get('data')
    )
    
    response = {
        'message': f'Transaction will be added to Block {index}',
        'transaction_hash': blockchain.pending_transactions[-1]['hash'],
        'currency': blockchain.coin_symbol
    }
    
    return jsonify(response), 201

@app.route('/mine', methods=['GET'])
def mine():
    """
    Mine a new block with pending transactions.
    
    Query parameters:
    - miner: Miner address (default: node identifier)
    
    Returns:
        JSON response with mining result
    """
    # Get miner address (default to node identifier)
    miner = request.args.get('miner', node_identifier)
    
    # Check if there are pending transactions
    if not blockchain.pending_transactions:
        # Add a dummy transaction if none exist
        blockchain.add_transaction(
            sender="0",
            recipient=miner,
            amount=0,
            data={"type": "dummy"}
        )
    
    # Mine the block
    start_time = time.time()
    block = blockchain.mine_pending_transactions(miner)
    mining_time = time.time() - start_time
    
    # Get the mining reward transaction
    mining_reward = 0
    for tx in block.transactions:
        if tx.get('data', {}).get('type') == 'mining_reward':
            mining_reward = tx.get('amount', 0)
    
    response = {
        'message': 'New Block Mined',
        'block_index': block.index,
        'block_hash': block.hash,
        'transactions': len(block.transactions),
        'mining_time': mining_time,
        'energy_consumed': block.energy_consumed,
        'difficulty': block.difficulty,
        'reward': mining_reward,
        'currency': blockchain.coin_symbol
    }
    
    return jsonify(response), 200

@app.route('/chain/validate', methods=['GET'])
def validate_chain():
    """
    Validate the blockchain.
    
    Returns:
        JSON response with validation result
    """
    is_valid = blockchain.is_chain_valid()
    
    response = {
        'valid': is_valid,
        'chain_length': len(blockchain.chain)
    }
    
    return jsonify(response), 200

@app.route('/coin/info', methods=['GET'])
def get_coin_info():
    """
    Get information about the Elizaicoin (EZC) cryptocurrency.
    
    Returns:
        JSON response with coin information
    """
    response = {
        'name': blockchain.coin_name,
        'symbol': blockchain.coin_symbol,
        'current_supply': blockchain.current_supply,
        'max_supply': blockchain.max_supply,
        'supply_percentage': (blockchain.current_supply / blockchain.max_supply) * 100 if blockchain.max_supply > 0 else 0,
        'next_block_reward': blockchain.calculate_mining_reward(),
        'halving_interval': blockchain.halving_interval,
        'blocks_until_next_halving': blockchain.halving_interval - (len(blockchain.chain) % blockchain.halving_interval) if blockchain.halving_interval > 0 else 0
    }
    
    return jsonify(response), 200

@app.route('/stats', methods=['GET'])
def get_stats():
    """
    Get blockchain statistics.
    
    Returns:
        JSON response with blockchain statistics
    """
    stats = blockchain.get_chain_stats()
    
    # Add Scrypt parameters
    stats['scrypt_params'] = scrypt_utils.get_scrypt_params()
    
    return jsonify(stats), 200

@app.route('/reset', methods=['POST'])
def reset_blockchain():
    """
    Reset the blockchain (for testing purposes).
    
    Returns:
        JSON response with reset confirmation
    """
    global blockchain
    blockchain = Blockchain()
    scrypt_utils.reset_energy_consumption()
    
    return jsonify({'message': 'Blockchain reset successfully'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
