import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Table, Pagination, Spinner, Badge, Button, Row, Col } from 'react-bootstrap';
import { formatDistanceToNow } from 'date-fns';

const BlockList = ({ apiUrl, setError }) => {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchBlocks(currentPage);
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [currentPage]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchBlocks(currentPage);
      }, 10000); // Refresh every 10 seconds
      
      setRefreshInterval(interval);
      
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, currentPage]);

  const fetchBlocks = async (page) => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/blocks?page=${page}&per_page=10`);
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      const data = await response.json();
      setBlocks(data.blocks);
      setTotalPages(data.total_pages);
      setTotalBlocks(data.total_blocks);
      setError(null);
    } catch (err) {
      console.error('Error fetching blocks:', err);
      setError('Failed to fetch blocks. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const renderPagination = () => {
    const items = [];
    
    // Previous button
    items.push(
      <Pagination.Prev 
        key="prev"
        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      />
    );
    
    // First page
    items.push(
      <Pagination.Item 
        key={1} 
        active={currentPage === 1}
        onClick={() => handlePageChange(1)}
      >
        1
      </Pagination.Item>
    );
    
    // Ellipsis if needed
    if (currentPage > 3) {
      items.push(<Pagination.Ellipsis key="ellipsis1" disabled />);
    }
    
    // Pages around current page
    for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page++) {
      items.push(
        <Pagination.Item 
          key={page} 
          active={page === currentPage}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </Pagination.Item>
      );
    }
    
    // Ellipsis if needed
    if (currentPage < totalPages - 2) {
      items.push(<Pagination.Ellipsis key="ellipsis2" disabled />);
    }
    
    // Last page if there are more than 1 page
    if (totalPages > 1) {
      items.push(
        <Pagination.Item 
          key={totalPages} 
          active={currentPage === totalPages}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }
    
    // Next button
    items.push(
      <Pagination.Next 
        key="next"
        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      />
    );
    
    return <Pagination>{items}</Pagination>;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const renderDifficultyIndicator = (difficulty) => {
    let className = 'difficulty-medium';
    
    if (difficulty <= 3) {
      className = 'difficulty-easy';
    } else if (difficulty >= 6) {
      className = 'difficulty-hard';
    }
    
    return (
      <>
        <span className={`difficulty-indicator ${className}`}></span>
        {difficulty}
      </>
    );
  };

  return (
    <div>
      <Row className="mb-4 align-items-center">
        <Col>
          <h2>Blockchain Explorer</h2>
          <p className="text-muted">
            Showing {blocks.length} of {totalBlocks} total blocks
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
            onClick={() => fetchBlocks(currentPage)}
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

      <Card className="block-card">
        <Card.Header>Latest Blocks</Card.Header>
        <Card.Body>
          {loading && blocks.length === 0 ? (
            <div className="spinner-container">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Height</th>
                  <th>Hash</th>
                  <th>Transactions</th>
                  <th>Timestamp</th>
                  <th>Difficulty</th>
                  <th>Energy</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block) => (
                  <tr key={block.index}>
                    <td>
                      <Link to={`/blocks/${block.index}`}>
                        {block.index}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/blocks/${block.hash}`} className="hash-short">
                        {block.hash}
                      </Link>
                    </td>
                    <td>
                      <Badge bg="primary" pill>
                        {block.transactions.length}
                      </Badge>
                    </td>
                    <td className="timestamp">
                      {formatTimestamp(block.timestamp)}
                    </td>
                    <td>
                      {renderDifficultyIndicator(block.difficulty)}
                    </td>
                    <td>
                      <span className={block.energy_consumed < 100 ? 'energy-efficient' : 'energy-inefficient'}>
                        {block.energy_consumed.toFixed(2)} units
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          
          {blocks.length === 0 && !loading && (
            <div className="text-center p-4">
              <p>No blocks found.</p>
            </div>
          )}
        </Card.Body>
      </Card>
      
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          {renderPagination()}
        </div>
      )}
    </div>
  );
};

export default BlockList;
