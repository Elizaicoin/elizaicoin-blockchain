import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Spinner, Alert, Row, Col, Table, Badge } from 'react-bootstrap';
import { formatDistanceToNow } from 'date-fns';

const MiningPanel = ({ apiUrl, setError, onMined }) => {
  const [minerAddress, setMinerAddress] = useState('');
  const [mining, setMining] = useState(false);
  const [miningResult, setMiningResult] = useState(null);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [coinInfo, setCoinInfo] = useState(null);
  const [coinInfoLoading, setCoinInfoLoading] = useState(true);
  
  useEffect(() => {
    // Generate a random miner address if none exists
    if (!minerAddress) {
      const randomAddress = generateRandomAddress();
      setMinerAddress(randomAddress);
    }
    
    fetchPendingTransactions();
    fetchCoinInfo();
  }, []);

  const generateRandomAddress = () => {
    const characters = '0123456789abcdef';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
      address += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return address;
  };

  const fetchPendingTransactions = async () => {
    try {
      setPendingLoading(true);
      const response = await fetch(`${apiUrl}/transactions`);
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      const data = await response.json();
      setPendingTransactions(data.pending_transactions || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching pending transactions:', err);
      setError('Failed to fetch pending transactions. Please try again later.');
    } finally {
      setPendingLoading(false);
    }
  };

  const fetchCoinInfo = async () => {
    try {
      setCoinInfoLoading(true);
      const response = await fetch(`${apiUrl}/coin/info`);
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      const data = await response.json();
      setCoinInfo(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching coin info:', err);
      setError('Failed to fetch coin information. Please try again later.');
    } finally {
      setCoinInfoLoading(false);
    }
  };

  const handleMine = async () => {
    if (!minerAddress.trim()) {
      setError('Please enter a miner address');
      return;
    }
    
    try {
      setMining(true);
      setMiningResult(null);
      setError(null);
      
      const response = await fetch(`${apiUrl}/mine?miner=${encodeURIComponent(minerAddress)}`);
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      const data = await response.json();
      setMiningResult(data);
      
      // Refresh pending transactions and coin info
      fetchPendingTransactions();
      fetchCoinInfo();
      
      // Notify parent component that mining is complete
      if (onMined) {
        onMined();
      }
    } catch (err) {
      console.error('Error mining block:', err);
      setError('Failed to mine block. Please try again later.');
    } finally {
      setMining(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <div>
      <h2 className="mb-4">Mining Panel</h2>
      
      <Row>
        <Col lg={8}>
          <Card className="mb-4 mining-card">
            <Card.Header>Mine a New Block</Card.Header>
            <Card.Body>
              <p className="mb-4">
                Mining a block will process all pending transactions and add them to the blockchain.
                The miner will receive a reward in Elizaicoin (EZC) for their work.
              </p>
              
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Miner Address</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter your miner address"
                    value={minerAddress}
                    onChange={(e) => setMinerAddress(e.target.value)}
                    disabled={mining}
                  />
                  <Form.Text className="text-muted">
                    This address will receive the mining reward.
                  </Form.Text>
                </Form.Group>
                
                <div className="d-grid gap-2">
                  <Button 
                    variant="danger" 
                    size="lg"
                    onClick={handleMine}
                    disabled={mining || !minerAddress.trim()}
                    className={mining ? 'mining-animation' : ''}
                  >
                    {mining ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Mining Block...
                      </>
                    ) : (
                      "Mine Block"
                    )}
                  </Button>
                </div>
              </Form>
              
              {miningResult && (
                <div className="mining-result mt-4">
                  <h5>Mining Successful!</h5>
                  <Table bordered size="sm">
                    <tbody>
                      <tr>
                        <td><strong>Block Index</strong></td>
                        <td>{miningResult.block_index}</td>
                      </tr>
                      <tr>
                        <td><strong>Block Hash</strong></td>
                        <td className="hash-display">{miningResult.block_hash}</td>
                      </tr>
                      <tr>
                        <td><strong>Transactions</strong></td>
                        <td>{miningResult.transactions}</td>
                      </tr>
                      <tr>
                        <td><strong>Mining Time</strong></td>
                        <td>{miningResult.mining_time.toFixed(2)} seconds</td>
                      </tr>
                      <tr>
                        <td><strong>Energy Consumed</strong></td>
                        <td>{miningResult.energy_consumed.toFixed(2)} units</td>
                      </tr>
                      <tr>
                        <td><strong>Difficulty</strong></td>
                        <td>{miningResult.difficulty}</td>
                      </tr>
                      <tr>
                        <td><strong>Reward</strong></td>
                        <td className="text-success fw-bold">
                          {miningResult.reward.toFixed(4)} {miningResult.currency}
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
          
          <Card className="mb-4">
            <Card.Header>Pending Transactions</Card.Header>
            <Card.Body>
              {pendingLoading ? (
                <div className="spinner-container">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : pendingTransactions.length > 0 ? (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>From</th>
                        <th>To</th>
                        <th>Amount</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTransactions.map((tx, index) => (
                        <tr key={index}>
                          <td className="hash-short">{tx.sender}</td>
                          <td className="hash-short">{tx.recipient}</td>
                          <td>{tx.amount.toFixed(2)} EZC</td>
                          <td className="timestamp">{formatTimestamp(tx.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <Alert variant="info">
                  No pending transactions. Create a transaction first or mine a block to generate the mining reward transaction.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>Mining Information</Card.Header>
            <Card.Body>
              <h5>How Mining Works</h5>
              <p>
                Mining is the process of adding new blocks to the blockchain by solving a computational puzzle.
                Elizaicoin uses the Scrypt algorithm, which is more energy-efficient than traditional PoW algorithms.
              </p>
              
              <h5 className="mt-4">Mining Rewards</h5>
              <p>
                Miners are rewarded with newly minted Elizaicoin (EZC) for their work.
                The reward amount is based on:
              </p>
              <ul>
                <li>Base block reward</li>
                <li>Energy efficiency factor</li>
                <li>Current supply vs. maximum supply</li>
              </ul>
              
              <h5 className="mt-4">Current Mining Parameters</h5>
              {coinInfoLoading ? (
                <div className="text-center p-3">
                  <Spinner animation="border" size="sm" />
                  <span className="ms-2">Loading parameters...</span>
                </div>
              ) : coinInfo ? (
                <Table bordered size="sm">
                  <tbody>
                    <tr>
                      <td><strong>Next Block Reward</strong></td>
                      <td>{coinInfo.next_block_reward.toFixed(4)} EZC</td>
                    </tr>
                    <tr>
                      <td><strong>Halving Interval</strong></td>
                      <td>{coinInfo.halving_interval.toLocaleString()} blocks</td>
                    </tr>
                    <tr>
                      <td><strong>Blocks Until Halving</strong></td>
                      <td>{coinInfo.blocks_until_next_halving.toLocaleString()} blocks</td>
                    </tr>
                  </tbody>
                </Table>
              ) : (
                <div className="text-center">
                  <p>Failed to load mining parameters.</p>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={fetchCoinInfo}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
          
          <Card>
            <Card.Header>Energy Efficiency</Card.Header>
            <Card.Body>
              <h5>Scrypt Algorithm</h5>
              <p>
                Elizaicoin uses the Scrypt algorithm with parameters:
              </p>
              <ul>
                <li><strong>N (CPU/Memory Cost):</strong> 16384</li>
                <li><strong>R (Block Size):</strong> 8</li>
                <li><strong>P (Parallelization):</strong> 1</li>
              </ul>
              
              <h5 className="mt-4">Energy Efficiency Features</h5>
              <ul>
                <li>
                  <Badge bg="success" className="me-2">Dynamic Difficulty</Badge>
                  Adjusts every 10 blocks to maintain optimal energy usage
                </li>
                <li>
                  <Badge bg="success" className="me-2">Reward Adjustment</Badge>
                  Mining rewards are adjusted based on energy efficiency
                </li>
                <li>
                  <Badge bg="success" className="me-2">Memory-Hard</Badge>
                  Scrypt's memory requirements prevent ASIC dominance
                </li>
              </ul>
              
              <div className="mt-4 text-center">
                <p className="text-muted">
                  <small>
                    Elizaicoin is estimated to use 99.8% less energy than Bitcoin for the same number of transactions.
                  </small>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MiningPanel;
