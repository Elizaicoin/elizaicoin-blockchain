import hashlib
import json
import time
from typing import List, Dict, Any, Optional
import scrypt_utils

class Block:
    def __init__(self, index: int, timestamp: float, transactions: List[Dict], 
                 previous_hash: str, nonce: int = 0, difficulty: int = 4):
        self.index = index
        self.timestamp = timestamp
        self.transactions = transactions
        self.previous_hash = previous_hash
        self.nonce = nonce
        self.difficulty = difficulty
        self.hash = self.calculate_hash()
        self.energy_consumed = 0  # Will be set during mining

    def calculate_hash(self) -> str:
        """Calculate the hash of the block using Scrypt algorithm."""
        block_string = json.dumps({
            "index": self.index,
            "timestamp": self.timestamp,
            "transactions": self.transactions,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce,
            "difficulty": self.difficulty
        }, sort_keys=True)
        
        # Use Scrypt for hashing (energy-efficient PoW)
        return scrypt_utils.hash_scrypt(block_string)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert block to dictionary for JSON serialization."""
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "transactions": self.transactions,
            "previous_hash": self.previous_hash,
            "hash": self.hash,
            "nonce": self.nonce,
            "difficulty": self.difficulty,
            "energy_consumed": self.energy_consumed
        }


class Blockchain:
    def __init__(self):
        self.chain: List[Block] = []
        self.pending_transactions: List[Dict] = []
        self.nodes = set()
        self.difficulty = 4
        self.block_reward = 10.0
        self.energy_efficiency_factor = 1.0  # Adjusts rewards based on energy efficiency
        
        # Elizaicoin (EZC) specific parameters
        self.coin_name = "Elizaicoin"
        self.coin_symbol = "EZC"
        self.max_supply = 30_000_000  # 30 million coins
        self.current_supply = 0
        self.halving_interval = 210000  # Number of blocks for reward halving (similar to Bitcoin)
        
        # Create the genesis block
        self.create_genesis_block()
    
    def create_genesis_block(self) -> None:
        """Create the first block in the chain (genesis block)."""
        genesis_block = Block(0, time.time(), [], "0")
        genesis_block.hash = genesis_block.calculate_hash()
        self.chain.append(genesis_block)
    
    def get_latest_block(self) -> Block:
        """Return the most recent block in the chain."""
        return self.chain[-1]
    
    def add_transaction(self, sender: str, recipient: str, amount: float, 
                        data: Optional[Dict] = None) -> int:
        """
        Add a new transaction to the list of pending transactions.
        
        Args:
            sender: Address of the sender
            recipient: Address of the recipient
            amount: Amount to transfer
            data: Additional transaction data
            
        Returns:
            The index of the block that will hold this transaction
        """
        transaction = {
            "sender": sender,
            "recipient": recipient,
            "amount": amount,
            "timestamp": time.time(),
            "data": data or {},
            "hash": hashlib.sha256(f"{sender}{recipient}{amount}{time.time()}".encode()).hexdigest()
        }
        
        self.pending_transactions.append(transaction)
        return self.get_latest_block().index + 1
    
    def mine_pending_transactions(self, miner_address: str) -> Block:
        """
        Mine pending transactions and add a new block to the chain.
        
        Args:
            miner_address: Address to receive mining rewards
            
        Returns:
            The newly created block
        """
        # Create reward transaction
        self.add_transaction(
            sender="0",  # "0" signifies a system transaction (coinbase)
            recipient=miner_address,
            amount=self.calculate_mining_reward(),
            data={"type": "mining_reward"}
        )
        
        # Create new block
        block = Block(
            index=len(self.chain),
            timestamp=time.time(),
            transactions=self.pending_transactions,
            previous_hash=self.get_latest_block().hash,
            difficulty=self.difficulty
        )
        
        # Mine the block (find valid nonce)
        start_time = time.time()
        energy_before = scrypt_utils.get_energy_consumption()
        
        self.proof_of_work(block)
        
        # Calculate energy consumed
        energy_after = scrypt_utils.get_energy_consumption()
        block.energy_consumed = energy_after - energy_before
        
        # Add block to chain
        self.chain.append(block)
        
        # Reset pending transactions
        self.pending_transactions = []
        
        # Adjust difficulty every 10 blocks
        if len(self.chain) % 10 == 0:
            self.adjust_difficulty()
            
        # Adjust energy efficiency factor
        self.update_energy_efficiency()
        
        return block
    
    def proof_of_work(self, block: Block) -> None:
        """
        Find a nonce that results in a hash with the required number of leading zeros.
        
        Args:
            block: The block to mine
        """
        target = "0" * block.difficulty
        
        while block.hash[:block.difficulty] != target:
            block.nonce += 1
            block.hash = block.calculate_hash()
    
    def is_chain_valid(self) -> bool:
        """
        Check if the blockchain is valid.
        
        Returns:
            True if the chain is valid, False otherwise
        """
        for i in range(1, len(self.chain)):
            current_block = self.chain[i]
            previous_block = self.chain[i-1]
            
            # Check if the current block's hash is valid
            if current_block.hash != current_block.calculate_hash():
                return False
            
            # Check if the current block points to the correct previous hash
            if current_block.previous_hash != previous_block.hash:
                return False
        
        return True
    
    def adjust_difficulty(self) -> None:
        """Adjust mining difficulty based on the time it took to mine the last 10 blocks."""
        if len(self.chain) < 11:  # Need at least 10 blocks to calculate
            return
        
        # Calculate average time for the last 10 blocks
        last_10_blocks = self.chain[-10:]
        first_timestamp = last_10_blocks[0].timestamp
        last_timestamp = last_10_blocks[-1].timestamp
        avg_time_per_block = (last_timestamp - first_timestamp) / 10
        
        # Target time per block (e.g., 60 seconds)
        target_time = 60
        
        # Adjust difficulty
        if avg_time_per_block < target_time * 0.8:
            self.difficulty += 1
        elif avg_time_per_block > target_time * 1.2:
            self.difficulty = max(1, self.difficulty - 1)
    
    def update_energy_efficiency(self) -> None:
        """Update the energy efficiency factor based on recent blocks."""
        if len(self.chain) < 5:  # Need some blocks to calculate
            return
        
        # Calculate average energy consumption per transaction for the last 5 blocks
        last_blocks = self.chain[-5:]
        total_energy = sum(block.energy_consumed for block in last_blocks)
        total_transactions = sum(len(block.transactions) for block in last_blocks)
        
        if total_transactions == 0:
            return
            
        avg_energy_per_tx = total_energy / total_transactions
        
        # Baseline energy consumption (can be adjusted)
        baseline_energy = 100
        
        # Update efficiency factor (lower energy consumption = higher rewards)
        if avg_energy_per_tx > 0:
            self.energy_efficiency_factor = baseline_energy / avg_energy_per_tx
            # Cap the factor to reasonable bounds
            self.energy_efficiency_factor = max(0.5, min(2.0, self.energy_efficiency_factor))
    
    def calculate_mining_reward(self) -> float:
        """
        Calculate mining reward based on base reward, energy efficiency, and supply limits.
        
        Returns:
            The mining reward in EZC
        """
        # Check if max supply has been reached
        if self.current_supply >= self.max_supply:
            return 0.0
        
        # Calculate halving factor (reduces reward as more coins are mined)
        halving_factor = 2 ** (len(self.chain) // self.halving_interval)
        base_reward = self.block_reward / max(1, halving_factor)
        
        # Apply energy efficiency factor
        reward = base_reward * self.energy_efficiency_factor
        
        # Ensure we don't exceed max supply
        remaining = self.max_supply - self.current_supply
        if reward > remaining:
            reward = remaining
            
        # Update current supply
        self.current_supply += reward
        
        return reward
    
    def get_block_by_index(self, index: int) -> Optional[Block]:
        """Get a block by its index."""
        if 0 <= index < len(self.chain):
            return self.chain[index]
        return None
    
    def get_block_by_hash(self, hash_value: str) -> Optional[Block]:
        """Get a block by its hash."""
        for block in self.chain:
            if block.hash == hash_value:
                return block
        return None
    
    def get_transaction_by_hash(self, hash_value: str) -> Optional[Dict]:
        """Get a transaction by its hash."""
        # Search in all blocks
        for block in self.chain:
            for transaction in block.transactions:
                if transaction.get("hash") == hash_value:
                    return {
                        "transaction": transaction,
                        "block_index": block.index,
                        "block_hash": block.hash
                    }
        
        # Search in pending transactions
        for transaction in self.pending_transactions:
            if transaction.get("hash") == hash_value:
                return {
                    "transaction": transaction,
                    "status": "pending"
                }
                
        return None
    
    def get_chain_data(self) -> List[Dict]:
        """Get the entire blockchain data."""
        return [block.to_dict() for block in self.chain]
    
    def get_chain_stats(self) -> Dict:
        """Get statistics about the blockchain."""
        if not self.chain:
            return {
                "blocks": 0,
                "transactions": 0,
                "difficulty": self.difficulty,
                "energy_efficiency_factor": self.energy_efficiency_factor,
                "coin_name": self.coin_name,
                "coin_symbol": self.coin_symbol,
                "current_supply": self.current_supply,
                "max_supply": self.max_supply,
                "supply_percentage": 0
            }
            
        total_transactions = sum(len(block.transactions) for block in self.chain)
        total_energy = sum(block.energy_consumed for block in self.chain)
        
        # Calculate average block time for the last 10 blocks (or all if less than 10)
        num_blocks_for_avg = min(10, len(self.chain) - 1)
        if num_blocks_for_avg > 0:
            recent_blocks = self.chain[-num_blocks_for_avg:]
            time_diffs = [recent_blocks[i].timestamp - recent_blocks[i-1].timestamp 
                          for i in range(1, len(recent_blocks))]
            avg_block_time = sum(time_diffs) / len(time_diffs) if time_diffs else 0
        else:
            avg_block_time = 0
        
        # Energy per transaction
        energy_per_tx = total_energy / total_transactions if total_transactions > 0 else 0
        
        # Calculate supply percentage
        supply_percentage = (self.current_supply / self.max_supply) * 100 if self.max_supply > 0 else 0
        
        return {
            "blocks": len(self.chain),
            "transactions": total_transactions,
            "difficulty": self.difficulty,
            "avg_block_time": avg_block_time,
            "energy_per_transaction": energy_per_tx,
            "energy_efficiency_factor": self.energy_efficiency_factor,
            "coin_name": self.coin_name,
            "coin_symbol": self.coin_symbol,
            "current_supply": self.current_supply,
            "max_supply": self.max_supply,
            "supply_percentage": supply_percentage,
            "next_reward": self.calculate_mining_reward()
        }
