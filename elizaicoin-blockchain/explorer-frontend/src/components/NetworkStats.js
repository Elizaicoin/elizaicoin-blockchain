import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Button, ProgressBar } from 'react-bootstrap';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const NetworkStats = ({ apiUrl, setError, stats, loading }) => {
  const [coinInfo, setCoinInfo] = useState(null);
  const [coinLoading, setCoinLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [isChainValid, setIsChainValid] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);

  useEffect(() => {
    fetchCoinInfo();
    generateMockChartData();
    
    // Refresh coin info every 30 seconds
    const interval = setInterval(fetchCoinInfo, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchCoinInfo = async () => {
    try {
      setCoinLoading(true);
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
      setCoinLoading(false);
    }
  };

  const validateChain = async () => {
    try {
      setValidationLoading(true);
      const response = await fetch(`${apiUrl}/validate`);
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      const data = await response.json();
      setIsChainValid(data.valid);
      setError(null);
    } catch (err) {
      console.error('Error validating chain:', err);
      setError('Failed to validate blockchain. Please try again later.');
      setIsChainValid(null);
    } finally {
      setValidationLoading(false);
    }
  };

  // Generate mock chart data for visualization
  // In a real implementation, this would fetch historical data from the backend
  const generateMockChartData = () => {
    const data = [];
    const now = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toLocaleDateString(),
        difficulty: Math.floor(Math.random() * 3) + 3,
        blockTime: Math.floor(Math.random() * 30) + 50,
        energy: Math.floor(Math.random() * 50) + 75,
        transactions: Math.floor(Math.random() * 10) + 5,
        supply: 5000 + (i * 100)
      });
    }
    
    setChartData(data);
  };

  const renderDifficultyChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="difficulty" 
          stroke="#8884d8" 
          activeDot={{ r: 8 }} 
          name="Difficulty"
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderBlockTimeChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area 
          type="monotone" 
          dataKey="blockTime" 
          stroke="#82ca9d" 
          fill="#82ca9d" 
          name="Block Time (s)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderEnergyChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar 
          dataKey="energy" 
          fill="#ff8042" 
          name="Energy per Transaction"
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderSupplyChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area 
          type="monotone" 
          dataKey="supply" 
          stroke="#8884d8" 
          fill="#8884d8" 
          name="Coin Supply"
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderScryptParams = () => {
    if (!stats || !stats.scrypt_params) return null;
    
    const { n, r, p, dklen } = stats.scrypt_params;
    
    return (
      <Card className="mb-4 stats-card">
        <Card.Header>Scrypt Parameters</Card.Header>
        <Card.Body>
          <Row>
            <Col md={3} className="mb-3">
              <div className="text-center">
                <h5>N (CPU/Memory Cost)</h5>
                <div className="value">{n.toLocaleString()}</div>
              </div>
            </Col>
            <Col md={3} className="mb-3">
              <div className="text-center">
                <h5>R (Block Size)</h5>
                <div className="value">{r}</div>
              </div>
            </Col>
            <Col md={3} className="mb-3">
              <div className="text-center">
                <h5>P (Parallelization)</h5>
                <div className="value">{p}</div>
              </div>
            </Col>
            <Col md={3} className="mb-3">
              <div className="text-center">
                <h5>DKLEN (Output Length)</h5>
                <div className="value">{dklen}</div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };

  return (
    <div>
      <h2 className="mb-4">Network Statistics</h2>
      
      {/* Blockchain Status */}
      <Card className="mb-4 stats-card">
        <Card.Header>Blockchain Status</Card.Header>
        <Card.Body>
          <Row>
            <Col md={4} className="mb-3">
              <div className="text-center">
                <h5>Chain Validation</h5>
                {isChainValid === null ? (
                  <Button 
                    variant="primary" 
                    onClick={validateChain}
                    disabled={validationLoading}
                  >
                    {validationLoading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Validating...
                      </>
                    ) : (
                      "Validate Chain"
                    )}
                  </Button>
                ) : (
                  <div className={`value ${isChainValid ? 'text-success' : 'text-danger'}`}>
                    {isChainValid ? 'Valid' : 'Invalid'}
                  </div>
                )}
              </div>
            </Col>
            <Col md={4} className="mb-3">
              <div className="text-center">
                <h5>Blocks</h5>
                {loading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <div className="value">{stats?.blocks || 0}</div>
                )}
              </div>
            </Col>
            <Col md={4} className="mb-3">
              <div className="text-center">
                <h5>Transactions</h5>
                {loading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <div className="value">{stats?.transactions || 0}</div>
                )}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* Coin Information */}
      <Card className="mb-4 stats-card">
        <Card.Header>Elizaicoin (EZC) Information</Card.Header>
        <Card.Body>
          {coinLoading ? (
            <div className="spinner-container">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : coinInfo ? (
            <>
              <Row>
                <Col md={4} className="mb-3">
                  <div className="text-center">
                    <h5>Current Supply</h5>
                    <div className="value">{coinInfo.current_supply.toFixed(2)} EZC</div>
                  </div>
                </Col>
                <Col md={4} className="mb-3">
                  <div className="text-center">
                    <h5>Max Supply</h5>
                    <div className="value">{coinInfo.max_supply.toLocaleString()} EZC</div>
                  </div>
                </Col>
                <Col md={4} className="mb-3">
                  <div className="text-center">
                    <h5>Next Block Reward</h5>
                    <div className="value">{coinInfo.next_block_reward.toFixed(4)} EZC</div>
                  </div>
                </Col>
              </Row>
              
              <h5 className="mt-4">Supply Progress</h5>
              <ProgressBar 
                now={coinInfo.supply_percentage} 
                label={`${coinInfo.supply_percentage.toFixed(2)}%`} 
                variant="success" 
                className="mb-3"
              />
              
              <Row className="mt-4">
                <Col md={6} className="mb-3">
                  <div className="text-center">
                    <h5>Halving Interval</h5>
                    <div className="value">{coinInfo.halving_interval.toLocaleString()} blocks</div>
                  </div>
                </Col>
                <Col md={6} className="mb-3">
                  <div className="text-center">
                    <h5>Blocks Until Next Halving</h5>
                    <div className="value">{coinInfo.blocks_until_next_halving.toLocaleString()} blocks</div>
                  </div>
                </Col>
              </Row>
            </>
          ) : (
            <div className="text-center p-4">
              <p>Failed to load coin information.</p>
              <Button 
                variant="primary" 
                onClick={fetchCoinInfo}
              >
                Retry
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
      
      {/* Mining Statistics */}
      <Card className="mb-4 stats-card">
        <Card.Header>Mining Statistics</Card.Header>
        <Card.Body>
          <Row>
            <Col md={4} className="mb-3">
              <div className="text-center">
                <h5>Current Difficulty</h5>
                {loading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <div className="value">{stats?.difficulty || 0}</div>
                )}
              </div>
            </Col>
            <Col md={4} className="mb-3">
              <div className="text-center">
                <h5>Average Block Time</h5>
                {loading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <div className="value">
                    {stats?.avg_block_time ? `${stats.avg_block_time.toFixed(2)} s` : 'N/A'}
                  </div>
                )}
              </div>
            </Col>
            <Col md={4} className="mb-3">
              <div className="text-center">
                <h5>Energy per Transaction</h5>
                {loading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <div className="value">
                    {stats?.energy_per_transaction ? 
                      `${stats.energy_per_transaction.toFixed(2)} units` : 
                      'N/A'
                    }
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* Scrypt Parameters */}
      {renderScryptParams()}
      
      {/* Charts */}
      <h3 className="mb-3 mt-5">Historical Data</h3>
      <p className="text-muted mb-4">
        Note: The charts below show simulated data for demonstration purposes.
      </p>
      
      <Row>
        <Col lg={6} className="mb-4">
          <Card className="stats-card h-100">
            <Card.Header>Difficulty Over Time</Card.Header>
            <Card.Body>
              {renderDifficultyChart()}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6} className="mb-4">
          <Card className="stats-card h-100">
            <Card.Header>Block Time Over Time</Card.Header>
            <Card.Body>
              {renderBlockTimeChart()}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col lg={6} className="mb-4">
          <Card className="stats-card h-100">
            <Card.Header>Energy Consumption per Transaction</Card.Header>
            <Card.Body>
              {renderEnergyChart()}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6} className="mb-4">
          <Card className="stats-card h-100">
            <Card.Header>Coin Supply Over Time</Card.Header>
            <Card.Body>
              {renderSupplyChart()}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default NetworkStats;
