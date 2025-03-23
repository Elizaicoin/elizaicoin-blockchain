import React, { useState, useEffect, useRef } from 'react';
import { Card, Spinner, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import ForceGraph2D from 'react-force-graph-2d';
import { scaleLinear } from 'd3-scale';

const TransactionGraph = ({ apiUrl, setError }) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeTransactions, setNodeTransactions] = useState([]);
  const [nodeTransactionsLoading, setNodeTransactionsLoading] = useState(false);
  const [maxLinkValue, setMaxLinkValue] = useState(0);
  const [minLinkValue, setMinLinkValue] = useState(0);
  const [showLabels, setShowLabels] = useState(false);
  const [nodeSize, setNodeSize] = useState(5);
  const [linkWidth, setLinkWidth] = useState(1);
  
  const graphRef = useRef();

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/graph/transactions`);
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Find min and max link values for scaling
      if (data.links && data.links.length > 0) {
        const values = data.links.map(link => link.value);
        setMaxLinkValue(Math.max(...values));
        setMinLinkValue(Math.min(...values));
      }
      
      setGraphData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching graph data:', err);
      setError('Failed to fetch transaction graph data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNodeTransactions = async (nodeId) => {
    try {
      setNodeTransactionsLoading(true);
      
      // In a real implementation, this would fetch transactions for the selected node
      // For this demo, we'll simulate it by filtering the links
      const transactions = graphData.links
        .filter(link => link.source === nodeId || link.target === nodeId)
        .map(link => ({
          hash: Math.random().toString(36).substring(2, 15),
          from: typeof link.source === 'object' ? link.source.id : link.source,
          to: typeof link.target === 'object' ? link.target.id : link.target,
          amount: link.value,
          timestamp: link.timestamp || Date.now() / 1000,
          type: link.source === nodeId ? 'outgoing' : 'incoming'
        }));
      
      setNodeTransactions(transactions);
    } catch (err) {
      console.error('Error fetching node transactions:', err);
    } finally {
      setNodeTransactionsLoading(false);
    }
  };

  const handleNodeHover = (node) => {
    if (!node) {
      setHoverNode(null);
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      return;
    }
    
    setHoverNode(node);
    
    // Get connected nodes and links
    const connectedNodes = new Set([node.id]);
    const connectedLinks = new Set();
    
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === node.id || targetId === node.id) {
        connectedLinks.add(link);
        if (sourceId === node.id) connectedNodes.add(targetId);
        if (targetId === node.id) connectedNodes.add(sourceId);
      }
    });
    
    setHighlightNodes(connectedNodes);
    setHighlightLinks(connectedLinks);
  };

  const handleNodeClick = (node) => {
    if (selectedNode && selectedNode.id === node.id) {
      // Deselect if clicking the same node
      setSelectedNode(null);
      setNodeTransactions([]);
    } else {
      setSelectedNode(node);
      fetchNodeTransactions(node.id);
    }
  };

  const handleZoomToFit = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  };

  const getNodeColor = (node) => {
    if (selectedNode && selectedNode.id === node.id) {
      return '#ff0000'; // Red for selected node
    }
    
    if (hoverNode && hoverNode.id === node.id) {
      return '#ff9900'; // Orange for hovered node
    }
    
    if (highlightNodes.has(node.id)) {
      return '#ffcc00'; // Yellow for connected nodes
    }
    
    return node.group === 1 ? '#00aaff' : '#00cc88'; // Blue for senders, green for recipients
  };

  const getLinkColor = (link) => {
    if (highlightLinks.has(link)) {
      return '#ffcc00'; // Yellow for highlighted links
    }
    
    return '#999999'; // Gray for normal links
  };

  const getLinkWidth = (link) => {
    if (highlightLinks.has(link)) {
      return linkWidth * 2; // Thicker for highlighted links
    }
    
    if (maxLinkValue === minLinkValue) return linkWidth;
    
    // Scale link width based on value
    const scale = scaleLinear()
      .domain([minLinkValue, maxLinkValue])
      .range([linkWidth * 0.5, linkWidth * 2]);
    
    return scale(link.value);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const renderNodeTooltip = () => {
    if (!hoverNode) return null;
    
    return (
      <div className="graph-tooltip">
        <div><strong>Address:</strong> {hoverNode.id}</div>
        <div><strong>Type:</strong> {hoverNode.group === 1 ? 'Sender' : 'Recipient'}</div>
        <div><strong>Value:</strong> {hoverNode.value.toFixed(2)} EZC</div>
      </div>
    );
  };

  return (
    <div>
      <h2 className="mb-4">Transaction Graph</h2>
      
      <Row className="mb-4">
        <Col md={8}>
          <p className="text-muted">
            This graph visualizes the flow of transactions between addresses in the blockchain.
            Each node represents an address, and each link represents a transaction.
            Hover over nodes to see details, and click on a node to view its transactions.
          </p>
        </Col>
        <Col md={4} className="d-flex justify-content-end align-items-start">
          <Button 
            variant="primary" 
            onClick={fetchGraphData}
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
            variant="outline-secondary" 
            onClick={handleZoomToFit}
          >
            Zoom to Fit
          </Button>
        </Col>
      </Row>
      
      <Row>
        <Col md={9}>
          <Card className="mb-4">
            <Card.Body>
              {loading ? (
                <div className="spinner-container">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              ) : graphData.nodes.length === 0 ? (
                <Alert variant="info">
                  No transaction data available. Mine some blocks with transactions to see the graph.
                </Alert>
              ) : (
                <div className="transaction-graph">
                  <ForceGraph2D
                    ref={graphRef}
                    graphData={graphData}
                    nodeRelSize={nodeSize}
                    nodeColor={getNodeColor}
                    nodeLabel={node => `Address: ${node.id}\nType: ${node.group === 1 ? 'Sender' : 'Recipient'}\nValue: ${node.value.toFixed(2)} EZC`}
                    linkWidth={getLinkWidth}
                    linkColor={getLinkColor}
                    linkDirectionalParticles={4}
                    linkDirectionalParticleWidth={link => highlightLinks.has(link) ? 2 : 0}
                    onNodeHover={handleNodeHover}
                    onNodeClick={handleNodeClick}
                    nodeCanvasObjectMode={showLabels ? () => 'after' : undefined}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                      if (showLabels) {
                        const label = node.id.substring(0, 6) + '...';
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = 'black';
                        ctx.fillText(label, node.x, node.y + 10);
                      }
                    }}
                    cooldownTicks={100}
                    onEngineStop={() => handleZoomToFit()}
                  />
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="mb-4">
            <Card.Header>Graph Controls</Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Node Size</Form.Label>
                <Form.Range 
                  min={1} 
                  max={10} 
                  step={1} 
                  value={nodeSize}
                  onChange={e => setNodeSize(parseInt(e.target.value))}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Link Width</Form.Label>
                <Form.Range 
                  min={0.5} 
                  max={3} 
                  step={0.5} 
                  value={linkWidth}
                  onChange={e => setLinkWidth(parseFloat(e.target.value))}
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Check 
                  type="switch"
                  id="show-labels"
                  label="Show Address Labels"
                  checked={showLabels}
                  onChange={e => setShowLabels(e.target.checked)}
                />
              </Form.Group>
              
              <div className="mt-4">
                <h6>Legend</h6>
                <div className="d-flex align-items-center mb-2">
                  <div style={{ width: 15, height: 15, backgroundColor: '#00aaff', borderRadius: '50%', marginRight: 10 }}></div>
                  <span>Sender Address</span>
                </div>
                <div className="d-flex align-items-center mb-2">
                  <div style={{ width: 15, height: 15, backgroundColor: '#00cc88', borderRadius: '50%', marginRight: 10 }}></div>
                  <span>Recipient Address</span>
                </div>
                <div className="d-flex align-items-center mb-2">
                  <div style={{ width: 15, height: 15, backgroundColor: '#ff0000', borderRadius: '50%', marginRight: 10 }}></div>
                  <span>Selected Address</span>
                </div>
              </div>
            </Card.Body>
          </Card>
          
          {selectedNode && (
            <Card>
              <Card.Header>Address Transactions</Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <strong>Address:</strong> <span className="hash-display">{selectedNode.id}</span>
                </div>
                <div className="mb-3">
                  <strong>Total Value:</strong> {selectedNode.value.toFixed(2)} EZC
                </div>
                
                {nodeTransactionsLoading ? (
                  <div className="text-center p-3">
                    <Spinner animation="border" size="sm" />
                    <span className="ms-2">Loading transactions...</span>
                  </div>
                ) : nodeTransactions.length > 0 ? (
                  <div className="transaction-list">
                    <h6>Recent Transactions</h6>
                    {nodeTransactions.map((tx, index) => (
                      <div key={index} className="transaction-item p-2 mb-2 border rounded">
                        <div className="small hash-short">{tx.hash}</div>
                        <div className={`small ${tx.type === 'incoming' ? 'text-success' : 'text-danger'}`}>
                          {tx.type === 'incoming' ? 'Received' : 'Sent'} {tx.amount.toFixed(2)} EZC
                        </div>
                        <div className="small text-muted">{formatTimestamp(tx.timestamp)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-3">
                    <p>No transactions found for this address.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default TransactionGraph;
