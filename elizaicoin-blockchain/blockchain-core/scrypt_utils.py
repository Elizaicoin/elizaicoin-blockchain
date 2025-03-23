import hashlib
import time
import random
import psutil
from typing import Dict, Any

# Scrypt parameters (n=16384, r=8, p=1) as specified in the requirements
SCRYPT_N = 16384  # CPU/memory cost factor
SCRYPT_R = 8      # Block size
SCRYPT_P = 1      # Parallelization factor
SCRYPT_DKLEN = 32 # Output length

# For energy consumption simulation
ENERGY_BASELINE = 0.1  # Base energy units per hash
ENERGY_VARIANCE = 0.05 # Random variance in energy consumption

# Global counter for energy consumption simulation
_total_energy_consumed = 0.0

def hash_scrypt(data: str) -> str:
    """
    Hash data using Scrypt algorithm with the specified parameters.
    
    Args:
        data: The data to hash
        
    Returns:
        The hexadecimal digest of the hash
    """
    global _total_energy_consumed
    
    # Convert data to bytes
    data_bytes = data.encode('utf-8')
    
    # Generate a random salt (in a real implementation, this would be stored)
    salt = bytes([random.randint(0, 255) for _ in range(16)])
    
    # Measure CPU usage before hashing
    cpu_percent_before = psutil.cpu_percent(interval=None)
    start_time = time.time()
    
    # Perform Scrypt hashing
    hash_result = hashlib.scrypt(
        password=data_bytes,
        salt=salt,
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=SCRYPT_DKLEN
    )
    
    # Measure time and CPU usage after hashing
    elapsed_time = time.time() - start_time
    cpu_percent_after = psutil.cpu_percent(interval=None)
    
    # Simulate energy consumption based on CPU usage and time
    # In a real system, this would be measured using hardware sensors
    energy_consumed = calculate_energy_consumption(elapsed_time, cpu_percent_before, cpu_percent_after)
    _total_energy_consumed += energy_consumed
    
    # Return the hexadecimal digest
    return hash_result.hex()

def calculate_energy_consumption(elapsed_time: float, cpu_before: float, cpu_after: float) -> float:
    """
    Calculate simulated energy consumption based on CPU usage and time.
    
    Args:
        elapsed_time: Time taken for the operation in seconds
        cpu_before: CPU usage percentage before the operation
        cpu_after: CPU usage percentage after the operation
        
    Returns:
        Simulated energy consumption in arbitrary units
    """
    # Average CPU usage during the operation
    avg_cpu = (cpu_before + cpu_after) / 2
    
    # Base energy consumption with some randomness to simulate real-world variance
    base_energy = ENERGY_BASELINE + random.uniform(-ENERGY_VARIANCE, ENERGY_VARIANCE)
    
    # Energy consumption based on CPU usage and time
    # Higher CPU usage and longer time = more energy consumed
    energy = base_energy * (1 + avg_cpu / 100) * elapsed_time
    
    return energy

def get_energy_consumption() -> float:
    """
    Get the total energy consumed so far.
    
    Returns:
        Total energy consumption in arbitrary units
    """
    global _total_energy_consumed
    return _total_energy_consumed

def reset_energy_consumption() -> None:
    """Reset the energy consumption counter."""
    global _total_energy_consumed
    _total_energy_consumed = 0.0

def get_scrypt_params() -> Dict[str, Any]:
    """
    Get the current Scrypt parameters.
    
    Returns:
        Dictionary containing the Scrypt parameters
    """
    return {
        "n": SCRYPT_N,
        "r": SCRYPT_R,
        "p": SCRYPT_P,
        "dklen": SCRYPT_DKLEN
    }
