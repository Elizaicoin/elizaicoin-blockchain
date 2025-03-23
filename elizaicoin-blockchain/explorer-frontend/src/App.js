import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, Nav, Navbar, Alert } from 'react-bootstrap';
import BlockList from './components/BlockList';
import BlockDetail from './components/BlockDetail';
import TransactionSearch from './components/TransactionSearch';
import TransactionDetail from './components/TransactionDetail';
import NetworkStats from './components/NetworkStats';
import TransactionGraph from './components/TransactionGraph';
import AdminDashboard from './components/AdminDashboard';
import MiningPanel from './components/MiningPanel';
import CreateTransaction from './components/CreateTransaction';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

function App() {
  const [error, setError] = useState(null);
  const [networkStats, setNetworkStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNetworkStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchNetworkStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchNetworkStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/stats`);
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      const data = await response.json();
      setNetworkStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching network stats:', err);
      setError('Failed to connect to the blockchain network. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <div className="App">
        <Navbar bg="dark" variant="dark" expand="lg" sticky="top">
          <Container>
            <Navbar.Brand as={Link} to="/">
              <img
                src="/logo.png"
                width="30"
                height="30"
                className="d-inline-block align-top me-2"
                alt="Elizaicoin Logo"
              />
              Elizaicoin Explorer
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Nav.Link as={Link} to="/">Blocks</Nav.Link>
                <Nav.Link as={Link} to="/transactions">Transactions</Nav.Link>
                <Nav.Link as={Link} to="/graph">Transaction Graph</Nav.Link>
                <Nav.Link as={Link} to="/mine">Mine</Nav.Link>
                <Nav.Link as={Link} to="/admin">Admin</Nav.Link>
              </Nav>
              {networkStats && (
                <Navbar.Text className="d-none d-md-block">
                  <span className="me-3">
                    <strong>Blocks:</strong> {networkStats.blocks}
                  </span>
                  <span className="me-3">
                    <strong>Difficulty:</strong> {networkStats.difficulty}
                  </span>
                  <span>
                    <strong>{networkStats.coin_symbol}:</strong> {networkStats.current_supply.toFixed(2)}/{networkStats.max_supply.toLocaleString()}
                  </span>
                </Navbar.Text>
              )}
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Container className="mt-4 mb-5">
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}

          <Routes>
            <Route path="/" element={<BlockList apiUrl={API_URL} setError={setError} />} />
            <Route path="/blocks/:blockId" element={<BlockDetail apiUrl={API_URL} setError={setError} />} />
            <Route path="/transactions" element={<TransactionSearch apiUrl={API_URL} setError={setError} />} />
            <Route path="/transactions/new" element={<CreateTransaction apiUrl={API_URL} setError={setError} />} />
            <Route path="/transactions/:txHash" element={<TransactionDetail apiUrl={API_URL} setError={setError} />} />
            <Route path="/graph" element={<TransactionGraph apiUrl={API_URL} setError={setError} />} />
            <Route path="/mine" element={<MiningPanel apiUrl={API_URL} setError={setError} onMined={fetchNetworkStats} />} />
            <Route path="/admin" element={<AdminDashboard apiUrl={API_URL} setError={setError} />} />
            <Route path="/stats" element={<NetworkStats apiUrl={API_URL} setError={setError} stats={networkStats} loading={loading} />} />
          </Routes>
        </Container>

        <footer className="bg-dark text-light py-4 mt-auto">
          <Container>
            <div className="d-flex flex-wrap justify-content-between align-items-center">
              <div className="col-md-4 mb-3 mb-md-0">
                <h5>Elizaicoin Explorer</h5>
                <p className="text-muted">
                  An energy-efficient blockchain based on Scrypt PoW algorithm
                </p>
              </div>
              
              <div className="col-md-4 mb-3 mb-md-0">
                <h5>Quick Links</h5>
                <ul className="list-unstyled">
                  <li><Link to="/" className="text-decoration-none text-light">Blocks</Link></li>
                  <li><Link to="/transactions" className="text-decoration-none text-light">Transactions</Link></li>
                  <li><Link to="/mine" className="text-decoration-none text-light">Mining</Link></li>
                </ul>
              </div>
              
              <div className="col-md-4">
                <h5>Network Stats</h5>
                {networkStats ? (
                  <ul className="list-unstyled">
                    <li><strong>Blocks:</strong> {networkStats.blocks}</li>
                    <li><strong>Transactions:</strong> {networkStats.transactions}</li>
                    <li><strong>Current Supply:</strong> {networkStats.current_supply.toFixed(2)} {networkStats.coin_symbol}</li>
                    <li><strong>Supply %:</strong> {networkStats.supply_percentage.toFixed(2)}%</li>
                  </ul>
                ) : (
                  <p className="text-muted">Loading stats...</p>
                )}
              </div>
            </div>
            
            <hr className="my-3" />
            
            <div className="text-center">
              <p className="mb-0">© 2025 Elizaicoin. All rights reserved.</p>
            </div>
          </Container>
        </footer>
      </div>
    </Router>
  );
}

export default App;
