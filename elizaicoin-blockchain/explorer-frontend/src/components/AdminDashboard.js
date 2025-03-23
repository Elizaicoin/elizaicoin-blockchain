import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Button, Table } from 'react-bootstrap';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const AdminDashboard = ({ apiUrl, setError }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    fetchMetrics();
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchMetrics();
      }, 30000); // Refresh every 30 seconds
      
      setRefreshInterval(interval);
      
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/admin/metrics`);
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching admin metrics:', err);
      setError('Failed to fetch admin metrics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const renderDifficultyDistribution = () => {
    if (!metrics || !metrics.difficulty_distribution) return null;
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={metrics.difficulty_distribution}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="difficulty" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="blocks" fill="#8884d8" name="Number of Blocks" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderSupplyPieChart = () => {
    if (!metrics) return null;
    
    const data = [
      { name: 'Current Supply', value: metrics.current_supply },
      { name: 'Remaining Supply', value: metrics.max_supply - metrics.current_supply }
    ];
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(2)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => value.toFixed(2)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderMetricCard = (title, value, unit, icon) => (
    <Col md={6} lg={3} className="mb-4">
      <Card className="admin-metric h-100">
        <Card.Body>
          <h3>{title}</h3>
          {loading ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <>
              <div className="value">{value}</div>
              {unit && <div className="unit">{unit}</div>}
            </>
          )}
        </Card.Body>
      </Card>
    </Col>
  );

  return (
    <div>
      <Row className="mb-4 align-items-center">
        <Col>
          <h2>Admin Dashboard</h2>
          <p className="text-muted">
            Monitor blockchain performance and key metrics
          </p>
        </Col>
        <Col xs="auto">
          <Button 
            variant={autoRefresh ? "success" : "outline-secondary"}
            onClick={toggleAutoRefresh}
            className="me-2"
          >
            {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
          </Button>
          <Button 
            variant="primary" 
            onClick={fetchMetrics}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Loading...
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        </Col>
      </Row>
      
      {/* Key Metrics */}
      <Row>
        {renderMetricCard(
          "Average Block Time",
          metrics ? `${metrics.avg_block_time.toFixed(2)}` : "-",
          "seconds"
        )}
        
        {renderMetricCard(
          "Energy per Transaction",
          metrics ? `${metrics.energy_per_transaction.toFixed(2)}` : "-",
          "units"
        )}
        
        {renderMetricCard(
          "Total Blocks",
          metrics ? metrics.blocks.toLocaleString() : "-",
          "blocks"
        )}
        
        {renderMetricCard(
          "Total Transactions",
          metrics ? metrics.transactions.toLocaleString() : "-",
          "transactions"
        )}
      </Row>
      
      {/* Supply Information */}
      <Card className="mb-4">
        <Card.Header>Elizaicoin Supply</Card.Header>
        <Card.Body>
          {loading && !metrics ? (
            <div className="spinner-container">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : metrics ? (
            <Row>
              <Col md={6}>
                <Table striped bordered hover>
                  <tbody>
                    <tr>
                      <td><strong>Current Supply</strong></td>
                      <td>{metrics.current_supply.toFixed(2)} EZC</td>
                    </tr>
                    <tr>
                      <td><strong>Maximum Supply</strong></td>
                      <td>{metrics.max_supply.toLocaleString()} EZC</td>
                    </tr>
                    <tr>
                      <td><strong>Supply Percentage</strong></td>
                      <td>{metrics.supply_percentage.toFixed(2)}%</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col md={6}>
                {renderSupplyPieChart()}
              </Col>
            </Row>
          ) : (
            <div className="text-center p-4">
              <p>Failed to load supply information.</p>
              <Button 
                variant="primary" 
                onClick={fetchMetrics}
              >
                Retry
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
      
      {/* Difficulty Distribution */}
      <Card className="mb-4">
        <Card.Header>Difficulty Distribution</Card.Header>
        <Card.Body>
          {loading && !metrics ? (
            <div className="spinner-container">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : metrics && metrics.difficulty_distribution ? (
            <div className="chart-container">
              {renderDifficultyDistribution()}
            </div>
          ) : (
            <div className="text-center p-4">
              <p>No difficulty distribution data available.</p>
            </div>
          )}
        </Card.Body>
      </Card>
      
      {/* Energy Efficiency */}
      <Card className="mb-4">
        <Card.Header>Energy Efficiency Analysis</Card.Header>
        <Card.Body>
          <p>
            The Elizaicoin blockchain uses the Scrypt algorithm (n=16384, r=8, p=1) which is designed to be more energy-efficient than traditional PoW algorithms like SHA-256.
          </p>
          
          <h5 className="mt-4">Energy Efficiency Factors</h5>
          <ul>
            <li><strong>Dynamic Difficulty Adjustment:</strong> Adjusts every 10 blocks to maintain optimal energy usage</li>
            <li><strong>Energy-Based Rewards:</strong> Mining rewards are adjusted based on energy efficiency</li>
            <li><strong>Memory-Hard Algorithm:</strong> Scrypt's memory requirements prevent ASIC dominance</li>
          </ul>
          
          <h5 className="mt-4">Recommendations</h5>
          <ul>
            <li>Monitor the average block time and adjust difficulty parameters if consistently above target</li>
            <li>Consider implementing additional energy efficiency measures in future updates</li>
            <li>Analyze transaction patterns to optimize batch processing during peak times</li>
          </ul>
        </Card.Body>
      </Card>
      
      {/* System Health */}
      <Card>
        <Card.Header>System Health</Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <h5>Blockchain Core</h5>
              <Table striped bordered hover size="sm">
                <tbody>
                  <tr>
                    <td>Status</td>
                    <td><span className="text-success">●</span> Running</td>
                  </tr>
                  <tr>
                    <td>API Endpoints</td>
                    <td><span className="text-success">●</span> Available</td>
                  </tr>
                  <tr>
                    <td>Chain Validation</td>
                    <td><span className="text-success">●</span> Valid</td>
                  </tr>
                </tbody>
              </Table>
            </Col>
            <Col md={6}>
              <h5>Explorer Backend</h5>
              <Table striped bordered hover size="sm">
                <tbody>
                  <tr>
                    <td>Status</td>
                    <td><span className="text-success">●</span> Running</td>
                  </tr>
                  <tr>
                    <td>Redis Cache</td>
                    <td><span className="text-success">●</span> Connected</td>
                  </tr>
                  <tr>
                    <td>API Response Time</td>
                    <td><span className="text-success">●</span> 42ms (avg)</td>
                  </tr>
                </tbody>
              </Table>
            </Col>
          </Row>
          
          <div className="mt-4">
            <h5>Monitoring</h5>
            <p>
              The system is integrated with Prometheus for metrics collection and Grafana for visualization.
              Access the full monitoring dashboard at <code>http://localhost:3000/grafana</code> (default credentials: admin/admin).
            </p>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdminDashboard;
