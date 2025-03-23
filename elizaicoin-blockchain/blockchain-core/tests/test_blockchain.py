import sys
import os
import unittest
import json
import time
from unittest.mock import patch, MagicMock

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from blockchain import Blockchain, Block
import scrypt_utils

class TestBlock(unittest.TestCase):
    def setUp(self):
        self.block = Block(
            index=1,
            timestamp=time.time(),
            transactions=[{"sender": "Alice", "recipient": "Bob", "amount": 5.0}],
            previous_hash="previous_hash_value",
            nonce=0,
            difficulty=4
        )
    
    def test_block_initialization(self):
        """Test that a block is initialized with the correct attributes."""
        self.assertEqual(self.block.index, 1)
        self.assertEqual(self.block.previous_hash, "previous_hash_value")
        self.assertEqual(len(self.block.transactions), 1)
        self.assertEqual(self.block.transactions[0]["sender"], "Alice")
        self.assertEqual(self.block.difficulty, 4)
        self.assertEqual(self.block.energy_consumed, 0)
    
    def test_calculate_hash(self):
        """Test that calculate_hash returns a non-empty string."""
        hash_value = self.block.calculate_hash()
        self.assertIsInstance(hash_value, str)
        self.assertTrue(len(hash_value) > 0)
    
    def test_to_dict(self):
        """Test that to_dict returns a dictionary with all block attributes."""
        block_dict = self.block.to_dict()
        self.assertIsInstance(block_dict, dict)
        self.assertEqual(block_dict["index"], 1)
        self.assertEqual(block_dict["previous_hash"], "previous_hash_value")
        self.assertEqual(len(block_dict["transactions"]), 1)
        self.assertEqual(block_dict["transactions"][0]["sender"], "Alice")
        self.assertEqual(block_dict["difficulty"], 4)
        self.assertEqual(block_dict["energy_consumed"], 0)


class TestBlockchain(unittest.TestCase):
    def setUp(self):
        # Mock energy consumption for faster tests
        self.energy_patcher = patch('scrypt_utils.get_energy_consumption', return_value=10.0)
        self.mock_energy = self.energy_patcher.start()
        
        # Mock hash_scrypt to return predictable values for faster tests
        self.hash_patcher = patch('scrypt_utils.hash_scrypt', 
                                 side_effect=lambda data: "0000" + hashlib.sha256(data.encode()).hexdigest()[4:])
        self.mock_hash = self.hash_patcher.start()
        
        self.blockchain = Blockchain()
    
    def tearDown(self):
        self.energy_patcher.stop()
        self.hash_patcher.stop()
    
    def test_blockchain_initialization(self):
        """Test that a blockchain is initialized with a genesis block."""
        self.assertEqual(len(self.blockchain.chain), 1)
        self.assertEqual(self.blockchain.chain[0].index, 0)
        self.assertEqual(self.blockchain.chain[0].previous_hash, "0")
        self.assertEqual(len(self.blockchain.pending_transactions), 0)
        self.assertEqual(self.blockchain.coin_name, "Elizaicoin")
        self.assertEqual(self.blockchain.coin_symbol, "EZC")
        self.assertEqual(self.blockchain.max_supply, 30_000_000)
    
    def test_add_transaction(self):
        """Test adding a transaction to the pending transactions list."""
        index = self.blockchain.add_transaction("Alice", "Bob", 5.0)
        self.assertEqual(len(self.blockchain.pending_transactions), 1)
        self.assertEqual(self.blockchain.pending_transactions[0]["sender"], "Alice")
        self.assertEqual(self.blockchain.pending_transactions[0]["recipient"], "Bob")
        self.assertEqual(self.blockchain.pending_transactions[0]["amount"], 5.0)
        self.assertEqual(index, 1)  # Next block index
    
    def test_mine_pending_transactions(self):
        """Test mining a block with pending transactions."""
        # Add a transaction
        self.blockchain.add_transaction("Alice", "Bob", 5.0)
        
        # Mine the block
        block = self.blockchain.mine_pending_transactions("Miner")
        
        # Check that the block was added to the chain
        self.assertEqual(len(self.blockchain.chain), 2)
        self.assertEqual(self.blockchain.chain[1].index, 1)
        
        # Check that the pending transactions were reset
        self.assertEqual(len(self.blockchain.pending_transactions), 0)
        
        # Check that the block contains the transaction and the mining reward
        self.assertEqual(len(block.transactions), 2)  # Original tx + mining reward
        
        # Check that the mining reward was added to the current supply
        self.assertGreater(self.blockchain.current_supply, 0)
    
    def test_is_chain_valid(self):
        """Test chain validation."""
        # Add and mine some blocks
        self.blockchain.add_transaction("Alice", "Bob", 5.0)
        self.blockchain.mine_pending_transactions("Miner")
        
        self.blockchain.add_transaction("Bob", "Charlie", 2.0)
        self.blockchain.mine_pending_transactions("Miner")
        
        # Chain should be valid
        self.assertTrue(self.blockchain.is_chain_valid())
        
        # Tamper with a block
        self.blockchain.chain[1].transactions[0]["amount"] = 100.0
        
        # Chain should be invalid
        self.assertFalse(self.blockchain.is_chain_valid())
    
    def test_get_block_by_index(self):
        """Test retrieving a block by its index."""
        # Add and mine a block
        self.blockchain.add_transaction("Alice", "Bob", 5.0)
        self.blockchain.mine_pending_transactions("Miner")
        
        # Get the block by index
        block = self.blockchain.get_block_by_index(1)
        self.assertIsNotNone(block)
        self.assertEqual(block.index, 1)
        
        # Try to get a non-existent block
        block = self.blockchain.get_block_by_index(999)
        self.assertIsNone(block)
    
    def test_get_block_by_hash(self):
        """Test retrieving a block by its hash."""
        # Add and mine a block
        self.blockchain.add_transaction("Alice", "Bob", 5.0)
        block = self.blockchain.mine_pending_transactions("Miner")
        
        # Get the block by hash
        retrieved_block = self.blockchain.get_block_by_hash(block.hash)
        self.assertIsNotNone(retrieved_block)
        self.assertEqual(retrieved_block.hash, block.hash)
        
        # Try to get a non-existent block
        block = self.blockchain.get_block_by_hash("nonexistent_hash")
        self.assertIsNone(block)
    
    def test_get_transaction_by_hash(self):
        """Test retrieving a transaction by its hash."""
        # Add a transaction
        self.blockchain.add_transaction("Alice", "Bob", 5.0)
        tx_hash = self.blockchain.pending_transactions[0]["hash"]
        
        # Get the transaction (should be pending)
        tx_info = self.blockchain.get_transaction_by_hash(tx_hash)
        self.assertIsNotNone(tx_info)
        self.assertEqual(tx_info["status"], "pending")
        
        # Mine the block
        self.blockchain.mine_pending_transactions("Miner")
        
        # Get the transaction (should be in a block)
        tx_info = self.blockchain.get_transaction_by_hash(tx_hash)
        self.assertIsNotNone(tx_info)
        self.assertEqual(tx_info["transaction"]["sender"], "Alice")
        self.assertEqual(tx_info["block_index"], 1)
        
        # Try to get a non-existent transaction
        tx_info = self.blockchain.get_transaction_by_hash("nonexistent_hash")
        self.assertIsNone(tx_info)
    
    def test_adjust_difficulty(self):
        """Test difficulty adjustment."""
        # Mock time.time to control block timestamps
        original_time = time.time
        
        try:
            # Create a sequence of timestamps for 11 blocks (genesis + 10 new)
            # Each block is 30 seconds apart (faster than target)
            timestamps = [original_time() + i * 30 for i in range(11)]
            time_index = 0
            
            def mock_time():
                nonlocal time_index
                if time_index < len(timestamps):
                    result = timestamps[time_index]
                    time_index += 1
                    return result
                return original_time()
            
            with patch('time.time', mock_time):
                # Initial difficulty
                initial_difficulty = self.blockchain.difficulty
                
                # Mine 10 blocks (plus genesis = 11)
                for _ in range(10):
                    self.blockchain.add_transaction("Alice", "Bob", 1.0)
                    self.blockchain.mine_pending_transactions("Miner")
                
                # Difficulty should increase because blocks were mined faster than target
                self.assertGreater(self.blockchain.difficulty, initial_difficulty)
        finally:
            # Restore original time function
            time.time = original_time
    
    def test_calculate_mining_reward(self):
        """Test mining reward calculation."""
        # Initial reward
        initial_reward = self.blockchain.calculate_mining_reward()
        self.assertGreater(initial_reward, 0)
        
        # Mine many blocks to test halving
        # Mock the halving interval to a smaller value for testing
        original_interval = self.blockchain.halving_interval
        self.blockchain.halving_interval = 2
        
        try:
            # Mine 2 blocks (trigger halving)
            self.blockchain.add_transaction("Alice", "Bob", 1.0)
            self.blockchain.mine_pending_transactions("Miner")
            
            self.blockchain.add_transaction("Bob", "Charlie", 1.0)
            self.blockchain.mine_pending_transactions("Miner")
            
            # Reward after halving should be less
            halved_reward = self.blockchain.calculate_mining_reward()
            self.assertLess(halved_reward, initial_reward)
        finally:
            # Restore original interval
            self.blockchain.halving_interval = original_interval
    
    def test_max_supply_limit(self):
        """Test that mining stops when max supply is reached."""
        # Set a very small max supply for testing
        original_max_supply = self.blockchain.max_supply
        self.blockchain.max_supply = 20.0
        self.blockchain.current_supply = 0.0
        
        try:
            # Mine blocks until max supply is reached
            while self.blockchain.current_supply < self.blockchain.max_supply:
                self.blockchain.add_transaction("Alice", "Bob", 1.0)
                self.blockchain.mine_pending_transactions("Miner")
            
            # Current supply should not exceed max supply
            self.assertLessEqual(self.blockchain.current_supply, self.blockchain.max_supply)
            
            # Mining reward should be zero when max supply is reached
            reward = self.blockchain.calculate_mining_reward()
            self.assertEqual(reward, 0.0)
        finally:
            # Restore original max supply
            self.blockchain.max_supply = original_max_supply
    
    def test_get_chain_stats(self):
        """Test getting chain statistics."""
        # Add and mine a block
        self.blockchain.add_transaction("Alice", "Bob", 5.0)
        self.blockchain.mine_pending_transactions("Miner")
        
        # Get stats
        stats = self.blockchain.get_chain_stats()
        
        # Check stats
        self.assertEqual(stats["blocks"], 2)  # Genesis + 1
        self.assertEqual(stats["transactions"], 2)  # 1 transaction + 1 mining reward
        self.assertEqual(stats["coin_name"], "Elizaicoin")
        self.assertEqual(stats["coin_symbol"], "EZC")
        self.assertGreater(stats["current_supply"], 0)
        self.assertEqual(stats["max_supply"], 30_000_000)
        self.assertGreater(stats["supply_percentage"], 0)


if __name__ == '__main__':
    import hashlib  # Import here to avoid conflict with mock
    unittest.main()
