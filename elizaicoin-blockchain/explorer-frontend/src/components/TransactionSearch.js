import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Form, Button, InputGroup, Table, Badge, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { formatDistanceToNow } from 'date-fns';

const TransactionSearch = ({ apiUrl, setError }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingTransactions();
    
    // Refresh pending transactions every 15 seconds
    const interval = setInterval(fetchPendingTransactions, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchPendingTransactions = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setSearchError('Please enter a transaction hash');
      return;
    }
    
    try {
      setSearchLoading(true);
      setSearchError(null);
      setSearchResult(null);
      
      const response = await fetch(`${apiUrl}/transactions/${searchQuery.trim()}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setSearchError('Transaction not found. Please check the hash and try again.');
        } else {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        return;
      }
      
      const data = await response.json();
      setSearchResult(data);
      
      // Navigate to transaction detail page
      navigate(`/transactions/${searchQuery.trim()}`);
    } catch (err) {
      console.error('Error searching for transaction:', err);
      setSearchError('Failed to search for transaction. Please try again later.');
    } finally {
      setSearchLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <div>
      <h2 className="mb-4">Transaction Search</h2>
      
      <Card className="mb-4 transaction-card">
        <Card.Header>Search by Transaction Hash</Card.Header>
        <Card.Body>
          <Form onSubmit={handleSearch}>
            <InputGroup className="mb-3">
              <Form.Control
                type="text"
                placeholder="Enter transaction hash"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Transaction hash"
                aria-describedby="search-button"
              />
              <Button 
                variant="primary" 
                id="search-button" 
                type="submit"
                disabled={searchLoading}
              >
                {searchLoading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Searching...
                  </>
                ) : (
                  "Search"
                )}
              </Button>
            </InputGroup>
          </Form>
          
          {searchError && (
            <Alert variant="danger" className="mt-3">
              {searchError}
            </Alert>
          )}
        </Card.Body>
      </Card>
      
      <Row className="mb-4">
        <Col>
          <h3>Pending Transactions</h3>
          <p className="text-muted">
            Transactions waiting to be included in a block
          </p>
        </Col>
        <Col xs="auto">
          <Button 
            variant="outline-primary" 
            onClick={fetchPendingTransactions}
            disabled={loading}
            className="me-2"
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
          <Button 
            variant="success" 
            as={Link} 
            to="/transactions/new"
          >
            Create Transaction
          </Button>
        </Col>
      </Row>
      
      <Card className="transaction-card">
        <Card.Body>
          {loading ? (
            <div className="spinner-container">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : pendingTransactions.length > 0 ? (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Hash</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingTransactions.map((tx) => (
                  <tr key={tx.hash}>
                    <td>
                      <Link to={`/transactions/${tx.hash}`} className="hash-short">
                        {tx.hash}
                      </Link>
                    </td>
                    <td className="hash-short">{tx.sender}</td>
                    <td className="hash-short">{tx.recipient}</td>
                    <td>{tx.amount.toFixed(2)} EZC</td>
                    <td className="timestamp">
                      {formatTimestamp(tx.timestamp)}
                    </td>
                    <td>
                      <Badge bg="warning" pill>Pending</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center p-4">
              <p>No pending transactions.</p>
              <Button 
                variant="success" 
                as={Link} 
                to="/transactions/new"
              >
                Create Transaction
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default TransactionSearch;
