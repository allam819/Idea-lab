// client/src/App.jsx
import React, { useCallback, useEffect, useState, useMemo,useRef } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  ReactFlowProvider,
  useReactFlow,
  ConnectionMode 
} from '@xyflow/react';
import axios from 'axios'; 

import '@xyflow/react/dist/style.css'; 
import { socket } from './socket';
import { getUserIdentity } from './utils/userIdentity';

// Import Pages & Components
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import IdeaNode from './components/IdeaNode'; 
import ImageNode from './components/ImageNode';

// --- IDENTITY HELPERS ---
// We get a random color/id for fallback, but we'll try to use the Real Name
const randomIdentity = getUserIdentity(); 
const me = randomIdentity; 

// --- PROTECTED ROUTE COMPONENT ---
// Blocks access if you aren't logged in
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// --- THE BOARD COMPONENT ---
function Board() {
  const { roomId } = useParams();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [cursors, setCursors] = useState({});

  // NEW: React Flow Helpers for Coordinate Conversion
  const { 
    getNodes, 
    getEdges, 
    getViewport, 
    setViewport, 
    screenToFlowPosition, // Converts Mouse -> Canvas
    flowToScreenPosition  // Converts Canvas -> Mouse
  } = useReactFlow(); 

  const nodeTypes = useMemo(() => ({ 
    idea: IdeaNode ,
    image:ImageNode
  }),[]);

  // --- SAVE TO DB ---
  const saveBoard = useCallback(async () => {
    setTimeout(async () => {
      const currentNodes = getNodes(); 
      const currentEdges = getEdges(); 
      const currentViewport = getViewport();
      
      // Use the Render URL (or localhost if testing locally)
      const API_URL = 'https://idea-lab-server.onrender.com'; 
      // const API_URL = 'http://localhost:3001'; // Uncomment for local testing

      await axios.post(`${API_URL}/boards`, {
        roomId,
        nodes: currentNodes, 
        edges: currentEdges,
        viewport: currentViewport
      });
    }, 500);
  }, [getNodes, getEdges, getViewport, roomId]);

  // --- HANDLERS ---
  const onNodeTextChange = useCallback((id, newText) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, label: newText, onChange: onNodeTextChange } };
        }
        return node;
      })
    );
    socket.emit("text-change", { roomId, id, text: newText });
    saveBoard();
  }, [roomId, setNodes, saveBoard]);

  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge(params, eds));
      socket.emit("edge-create", { roomId, edge: params });
      saveBoard();
    },
    [setEdges, roomId, saveBoard],
  );

  const onNodesDelete = useCallback((deletedNodes) => {
    const ids = deletedNodes.map(n => n.id);
    socket.emit("nodes-delete", { roomId, ids });
    saveBoard();
  }, [roomId, saveBoard]);

  const onEdgesDelete = useCallback((deletedEdges) => {
    const ids = deletedEdges.map(e => e.id);
    socket.emit("edges-delete", { roomId, ids });
    saveBoard();
  }, [roomId, saveBoard]);

  // --- MOUSE MOVE (THE FIX) ---
  const onMouseMove = (e) => {
    if (!socket.id) return;

    // 1. Get Real Name from Storage (Live check)
    const storedUserString = localStorage.getItem('user');
    let currentName = me.name; 
    if (storedUserString) {
      const storedUser = JSON.parse(storedUserString);
      if (storedUser.name) currentName = storedUser.name;
    }

    // 2. Convert Screen Pixels -> Canvas World Coordinates
    // This ensures that X:100 is always X:100 on the board, regardless of zoom
    const flowPosition = screenToFlowPosition({ x: e.clientX, y: e.clientY });

    const myCursor = { 
      x: flowPosition.x, 
      y: flowPosition.y, 
      userId: socket.id, 
      userName: currentName, 
      userColor: me.color,
      roomId 
    };
    socket.emit("cursor-move", myCursor);
  };
  // 1. Allow dragging files over the board
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  // 2. Handle dropping the file
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const file = event.dataTransfer.files[0];
      if (!file) return;

      // Check if it is actually an image
      if (!file.type.startsWith('image/')) {
        alert("Please drop an image file!");
        return;
      }

      // Convert File -> Base64 String (so we can save it to DB easily)
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target.result;

        // Get drop position (converted to canvas coordinates!)
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        // Create the new Image Node
        const newNode = {
          id: Date.now().toString(),
          type: 'image', // Use our new type
          position,
          data: { src: base64String }, // Store the image data
          style: { width: 200, height: 200 }, // Default size
        };

        setNodes((nds) => [...nds, newNode]);
        socket.emit("node-create", { roomId, node: newNode });
        saveBoard();
      };
      
      reader.readAsDataURL(file); // Start reading
    },
    [screenToFlowPosition, roomId, saveBoard, setNodes] // Dependencies
  );

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    socket.emit("join-room", roomId);

    const API_URL = 'https://idea-lab-server.onrender.com';
    // const API_URL = 'http://localhost:3001'; 

    async function fetchBoard() {
      try {
        const response = await axios.get(`${API_URL}/boards/${roomId}`);
        const { nodes, edges, viewport } = response.data;

        if (nodes) {
          const hydratedNodes = nodes.map(n => ({
            ...n,
            data: { ...n.data, onChange: onNodeTextChange }
          }));
          setNodes(hydratedNodes);
        }
        if (edges) setEdges(edges);
        if (viewport) setViewport(viewport);
      } catch (error) {
        console.error("Failed to load board:", error);
      }
    }
    fetchBoard();

    socket.on("node-drag", (incomingNode) => {
      setNodes((nds) =>
        nds.map((node) => node.id === incomingNode.id ? { ...incomingNode, data: { ...incomingNode.data, onChange: onNodeTextChange } } : node)
      );
    });

    socket.on("node-create", (newNode) => {
      setNodes((nds) => {
        if (nds.find(n => n.id === newNode.id)) return nds;
        return [...nds, { ...newNode, data: { ...newNode.data, onChange: onNodeTextChange } }];
      });
    });

    socket.on("text-change", ({ id, text }) => {
      setNodes((nds) =>
        nds.map((node) => node.id === id ? { ...node, data: { ...node.data, label: text, onChange: onNodeTextChange } } : node)
      );
    });

    socket.on("edge-create", (edge) => setEdges((eds) => addEdge(edge, eds)));
    socket.on("nodes-delete", (ids) => setNodes((nds) => nds.filter((n) => !ids.includes(n.id))));
    socket.on("edges-delete", (ids) => setEdges((eds) => eds.filter((e) => !ids.includes(e.id))));

    socket.on("cursor-move", (data) => {
      if (!data.userId) return;
      setCursors((prev) => ({ ...prev, [data.userId]: data }));
    });

    socket.on("user-disconnected", (userId) => {
      setCursors((prev) => {
        const newCursors = { ...prev };
        delete newCursors[userId];
        return newCursors;
      });
    });

    return () => {
      socket.off("node-drag");
      socket.off("node-create");
      socket.off("text-change");
      socket.off("edge-create");
      socket.off("nodes-delete");
      socket.off("edges-delete");
      socket.off("cursor-move");
      socket.off("user-disconnected");
    };
  }, [roomId, setNodes, setEdges, setViewport, onNodeTextChange]); 

  // --- UI ACTIONS ---
  const onNodeDrag = useCallback((_, node) => {
    socket.emit("node-drag", { roomId, node });
  }, [roomId]);

  const onNodeDragStop = () => saveBoard();
  const onMoveEnd = () => saveBoard();
// Reference to the hidden file input
  const fileInputRef = useRef(null);

  // Helper: Trigger the file input when button is clicked
  const onImageClick = () => {
    fileInputRef.current?.click();
  };

  // Handle the file selection
  const onImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Convert to Base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result;
      
      // Create Image Node (Place it near the center/randomly like sticky notes)
      const newNode = {
        id: Date.now().toString(),
        type: 'image', 
        position: { x: Math.random() * 400, y: Math.random() * 400 }, 
        data: { src: base64String }, 
        style: { width: 200, height: 200 }, // Default size
      };

      setNodes((nds) => [...nds, newNode]);
      socket.emit("node-create", { roomId, node: newNode });
      saveBoard();
    };
    
    reader.readAsDataURL(file);
    // Reset input so you can upload the same file again if needed
    event.target.value = ''; 
  };

  const addCard = () => {
    const newNode = { 
      id: Date.now().toString(), 
      type: 'idea', 
      // Random position slightly offset from center
      position: { x: Math.random() * 300, y: Math.random() * 300 }, 
      data: { label: 'New Idea', onChange: onNodeTextChange }, 
    };
    setNodes((nds) => [...nds, newNode]);
    socket.emit("node-create", { roomId, node: newNode });
    saveBoard();
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }} onMouseMove={onMouseMove}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}      
        onNodesDelete={onNodesDelete} 
        onEdgesDelete={onEdgesDelete} 
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop} 
        onMoveEnd={onMoveEnd}
        connectionMode={ConnectionMode.Loose} 
        onDragOver={onDragOver} 
        onDrop={onDrop}        
      >
        <Background variant="dots" gap={12} size={1} />
        <Controls />
      </ReactFlow>

      {/* --- RENDER CURSORS (THE FIX) --- */}
      {Object.entries(cursors).map(([userId, cursor]) => {
        // Convert "World" coordinates back to "Screen" coordinates for drawing
        const screenPos = flowToScreenPosition({ x: cursor.x, y: cursor.y });
        
        // If cursor is off-screen, don't render it
        if (!screenPos) return null;

        return (
          <div key={userId} style={{ 
            position: 'absolute', 
            left: screenPos.x, 
            top: screenPos.y, 
            pointerEvents: 'none', 
            zIndex: 9999, 
            transition: 'all 0.1s ease', 
            transform: 'translate(-50%, -50%)' 
          }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: cursor.userColor || 'red', borderRadius: '50%' }} />
            <div style={{ backgroundColor: cursor.userColor || 'red', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginTop: '4px', whiteSpace: 'nowrap' }}>
              {cursor.userName || "Guest"}
            </div>
          </div>
        );
      })}
      
      {/* UI Overlay */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 ,display: 'flex', gap: '10px' }}>
        <button 
          onClick={onImageClick} 
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
        >
          + Image
        </button>
        
        <button onClick={addCard} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#FFD700', color: '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
          + Sticky Note
        </button>
      </div>
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, background: 'white', padding: '5px 10px', borderRadius: '5px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
        Room: <b>{roomId}</b>
      </div>
      <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onImageChange} 
          accept="image/*" 
          style={{ display: 'none' }} 
        />
    </div>
  );
}

// --- MAIN ROUTER ---
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/board/:roomId" 
          element={
            <ProtectedRoute>
              <ReactFlowProvider>
                <Board />
              </ReactFlowProvider>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}