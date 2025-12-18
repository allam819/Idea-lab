// client/src/App.jsx
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
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

// Import Pages & Components & Hooks
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import IdeaNode from './components/IdeaNode'; 
import ImageNode from './components/ImageNode'; 
import useUndoRedo from './hooks/useUndoRedo'; 

// --- IDENTITY HELPERS ---
const randomIdentity = getUserIdentity(); 
const me = randomIdentity; 

// --- PROTECTED ROUTE COMPONENT ---
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
  
  // 1. INITIALIZE STATE & HOOKS (ORDER MATTERS!)
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [cursors, setCursors] = useState({});
  const fileInputRef = useRef(null); // Reference for hidden file input

  // *** FIX 1: Initialize Undo/Redo HERE (Before useEffects) ***
  const { takeSnapshot, undo, redo } = useUndoRedo();

  const { 
    getNodes, 
    getEdges, 
    getViewport, 
    setViewport, 
    screenToFlowPosition, 
    flowToScreenPosition 
  } = useReactFlow(); 

  // Register Custom Node Types
  const nodeTypes = useMemo(() => ({ 
    idea: IdeaNode,
    image: ImageNode
  }), []);

  // --- SAVE TO DB ---
  const saveBoard = useCallback(async () => {
    // Debounce slightly to prevent spamming server
    setTimeout(async () => {
      const currentNodes = getNodes(); 
      const currentEdges = getEdges(); 
      const currentViewport = getViewport();
      
      const API_URL = 'https://idea-lab-server.onrender.com'; 
      // const API_URL = 'http://localhost:3001'; // Use for local testing

      try {
        await axios.post(`${API_URL}/boards`, {
          roomId,
          nodes: currentNodes, 
          edges: currentEdges,
          viewport: currentViewport
        });
      } catch (err) {
        console.error("Save failed", err);
      }
    }, 500);
  }, [getNodes, getEdges, getViewport, roomId]);

  // --- HANDLERS ---
  
  // 1. Text Change
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

  // 2. Connections
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) => {
        const newEdges = addEdge(params, eds);
        takeSnapshot(getNodes(), newEdges); // Snapshot for Undo
        return newEdges;
      });
      socket.emit("edge-create", { roomId, edge: params });
      saveBoard();
    },
    [setEdges, roomId, saveBoard, takeSnapshot, getNodes],
  );

  // 3. Deletions
  const onNodesDelete = useCallback((deletedNodes) => {
    const ids = deletedNodes.map(n => n.id);
    takeSnapshot(getNodes(), getEdges()); // Snapshot before delete
    socket.emit("nodes-delete", { roomId, ids });
    saveBoard();
  }, [roomId, saveBoard, takeSnapshot, getNodes, getEdges]);

  const onEdgesDelete = useCallback((deletedEdges) => {
    const ids = deletedEdges.map(e => e.id);
    takeSnapshot(getNodes(), getEdges()); // Snapshot before delete
    socket.emit("edges-delete", { roomId, ids });
    saveBoard();
  }, [roomId, saveBoard, takeSnapshot, getNodes, getEdges]);

  // 4. Drag Stop (Snapshot)
  const onNodeDragStop = useCallback(() => {
    takeSnapshot(getNodes(), getEdges());
    saveBoard();
  }, [getNodes, getEdges, takeSnapshot, saveBoard]);

  const onMoveEnd = () => saveBoard();

  // --- MOUSE & CURSOR LOGIC ---
  const onMouseMove = (e) => {
    if (!socket.id) return;

    // Get Identity (Real Name or Guest)
    const storedUserString = localStorage.getItem('user');
    let currentName = me.name; 
    if (storedUserString) {
      const storedUser = JSON.parse(storedUserString);
      if (storedUser.name) currentName = storedUser.name;
    }

    // Convert Screen Pixels -> Canvas Coordinates
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

  // --- IMAGE UPLOAD HANDLERS ---
  
  // A. Drag & Drop
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target.result;
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

        const newNode = {
          id: Date.now().toString(),
          type: 'image',
          position,
          data: { src: base64String },
          // Note: No explicit style width/height here, letting CSS handle it
        };

        setNodes((nds) => [...nds, newNode]);
        takeSnapshot([...getNodes(), newNode], getEdges()); // Snapshot
        socket.emit("node-create", { roomId, node: newNode });
        saveBoard();
      };
      reader.readAsDataURL(file);
    },
    [screenToFlowPosition, roomId, saveBoard, setNodes, takeSnapshot, getNodes, getEdges]
  );

  // B. Button Click Upload
  const onImageClick = () => {
    fileInputRef.current?.click();
  };

  const onImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result;
      const newNode = {
        id: Date.now().toString(),
        type: 'image', 
        position: { x: Math.random() * 400, y: Math.random() * 400 }, 
        data: { src: base64String }, 
      };

      setNodes((nds) => [...nds, newNode]);
      takeSnapshot([...getNodes(), newNode], getEdges()); // Snapshot
      socket.emit("node-create", { roomId, node: newNode });
      saveBoard();
    };
    reader.readAsDataURL(file);
    event.target.value = ''; // Reset input
  };

  const addCard = () => {
    const newNode = { 
      id: Date.now().toString(), 
      type: 'idea', 
      position: { x: Math.random() * 300, y: Math.random() * 300 }, 
      data: { label: 'New Idea', onChange: onNodeTextChange }, 
    };
    setNodes((nds) => [...nds, newNode]);
    takeSnapshot([...getNodes(), newNode], getEdges()); // Snapshot
    socket.emit("node-create", { roomId, node: newNode });
    saveBoard();
  };

  // --- KEYBOARD LISTENERS (UNDO/REDO) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z (Undo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const pastState = undo();
        if (pastState) {
          setNodes(pastState.nodes);
          setEdges(pastState.edges);
        }
      }

      // Ctrl+Y or Ctrl+Shift+Z (Redo)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        const futureState = redo();
        if (futureState) {
          setNodes(futureState.nodes);
          setEdges(futureState.edges);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setNodes, setEdges]);


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

    // Listeners
    const handleNodeDrag = (incomingNode) => {
       setNodes((nds) => nds.map((node) => node.id === incomingNode.id ? { ...incomingNode, data: { ...incomingNode.data, onChange: onNodeTextChange } } : node));
    };
    
    // Wire up listeners
    socket.on("node-drag", handleNodeDrag);
    socket.on("node-create", (newNode) => {
      setNodes((nds) => {
        if (nds.find(n => n.id === newNode.id)) return nds;
        return [...nds, { ...newNode, data: { ...newNode.data, onChange: onNodeTextChange } }];
      });
    });
    socket.on("text-change", ({ id, text }) => {
      setNodes((nds) => nds.map((node) => node.id === id ? { ...node, data: { ...node.data, label: text, onChange: onNodeTextChange } } : node));
    });
    socket.on("edge-create", (edge) => setEdges((eds) => addEdge(edge, eds)));
    socket.on("nodes-delete", (ids) => setNodes((nds) => nds.filter((n) => !ids.includes(n.id))));
    socket.on("edges-delete", (ids) => setEdges((eds) => eds.filter((e) => !ids.includes(e.id))));
    socket.on("cursor-move", (data) => {
      if (!data.userId) return;
      setCursors((prev) => ({ ...prev, [data.userId]: data }));
    });
    
    // *** FIX 2: Renamed variable 'new' to 'newCursors' to avoid build error ***
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
        onDragOver={onDragOver}
        onDrop={onDrop}
        connectionMode={ConnectionMode.Loose} 
      >
        <Background variant="dots" gap={12} size={1} />
        <Controls />
      </ReactFlow>

      {/* RENDER CURSORS */}
      {Object.entries(cursors).map(([userId, cursor]) => {
        const screenPos = flowToScreenPosition({ x: cursor.x, y: cursor.y });
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
      
      {/* --- TOP LEFT: ROOM ID & HISTORY CONTROLS --- */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', gap: '10px' }}>
        <div style={{ background: 'white', padding: '10px 15px', borderRadius: '5px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
           Room: {roomId}
        </div>
        
        {/* Undo Button */}
        <button 
          onClick={undo} 
          style={{ padding: '10px 15px', fontSize: '16px', cursor: 'pointer', background: 'white', color: '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
          title="Undo (Ctrl+Z)"
        >
           ↩ Undo
        </button>

        {/* Redo Button */}
        <button 
          onClick={redo} 
          style={{ padding: '10px 15px', fontSize: '16px', cursor: 'pointer', background: 'white', color: '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
          title="Redo (Ctrl+Y)"
        >
           ↪ Redo
        </button>
      </div>
      
      {/* --- TOP RIGHT: TOOLS --- */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', gap: '10px' }}>
        <button 
          onClick={onImageClick} 
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
        >
          + Image
        </button>

        <button 
          onClick={addCard} 
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#FFD700', color: '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
        >
          + Sticky Note
        </button>

        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onImageChange} 
          accept="image/*" 
          style={{ display: 'none' }} 
        />
      </div>
    </div>
  );
}

// --- MAIN ROUTER ---
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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