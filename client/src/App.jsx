// client/src/App.jsx
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, useParams, Navigate } from 'react-router-dom';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,            // <--- NEW: Imported MiniMap
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

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import IdeaNode from './components/IdeaNode'; 
import ImageNode from './components/ImageNode'; 
import useUndoRedo from './hooks/useUndoRedo'; 

const randomIdentity = getUserIdentity(); 
const me = randomIdentity; 

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

// --- LOADING COMPONENT ---
const LoadingScreen = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
    <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #007bff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    <h3 style={{ fontFamily: 'sans-serif', color: '#555' }}>Loading your Idea Lab...</h3>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

function Board() {
  const { roomId } = useParams();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [cursors, setCursors] = useState({});
  const [isLoading, setIsLoading] = useState(true); // <--- NEW: Loading State
  const fileInputRef = useRef(null); 

  const { takeSnapshot, undo, redo } = useUndoRedo();

  const { getNodes, getEdges, getViewport, setViewport, screenToFlowPosition, flowToScreenPosition } = useReactFlow(); 

  const nodeTypes = useMemo(() => ({ idea: IdeaNode, image: ImageNode }), []);

  const saveBoard = useCallback(async (manualNodes, manualEdges) => {
    const nodesToSave = manualNodes || getNodes();
    const edgesToSave = manualEdges || getEdges();
    const currentViewport = getViewport();
    
    const API_URL = 'https://idea-lab-server.onrender.com'; 

    try {
      await axios.post(`${API_URL}/boards`, {
        roomId,
        nodes: nodesToSave, 
        edges: edgesToSave,
        viewport: currentViewport
      });
    } catch (err) {
      console.error("Save failed", err);
    }
  }, [getNodes, getEdges, getViewport, roomId]);

  // --- HANDLERS ---
  const onNodeTextChange = useCallback((id, newText) => {
    setNodes((nds) => nds.map((node) => node.id === id ? { ...node, data: { ...node.data, label: newText, onChange: onNodeTextChange } } : node));
    socket.emit("text-change", { roomId, id, text: newText });
    saveBoard();
  }, [roomId, setNodes, saveBoard]);

  const onConnect = useCallback((params) => {
    setEdges((eds) => {
      const newEdges = addEdge(params, eds);
      takeSnapshot(getNodes(), newEdges); 
      return newEdges;
    });
    socket.emit("edge-create", { roomId, edge: params });
    saveBoard();
  }, [setEdges, roomId, saveBoard, takeSnapshot, getNodes]);

  const onNodesDelete = useCallback((deletedNodes) => {
    const ids = deletedNodes.map(n => n.id);
    takeSnapshot(getNodes(), getEdges()); 
    socket.emit("nodes-delete", { roomId, ids });
    saveBoard();
  }, [roomId, saveBoard, takeSnapshot, getNodes, getEdges]);

  const onEdgesDelete = useCallback((deletedEdges) => {
    const ids = deletedEdges.map(e => e.id);
    takeSnapshot(getNodes(), getEdges()); 
    socket.emit("edges-delete", { roomId, ids });
    saveBoard();
  }, [roomId, saveBoard, takeSnapshot, getNodes, getEdges]);

  const onNodeDragStop = useCallback(() => {
    takeSnapshot(getNodes(), getEdges());
    saveBoard();
  }, [getNodes, getEdges, takeSnapshot, saveBoard]);

  const onMoveEnd = () => saveBoard();

  const onMouseMove = (e) => {
    if (!socket.id) return;
    const storedUserString = localStorage.getItem('user');
    let currentName = me.name; 
    if (storedUserString) {
      const storedUser = JSON.parse(storedUserString);
      if (storedUser.name) currentName = storedUser.name;
    }
    const flowPosition = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const myCursor = { x: flowPosition.x, y: flowPosition.y, userId: socket.id, userName: currentName, userColor: me.color, roomId };
    socket.emit("cursor-move", myCursor);
  };

  const handleUndo = useCallback(() => {
    const pastState = undo(); 
    if (pastState) {
      setNodes(pastState.nodes); 
      setEdges(pastState.edges);
      socket.emit("board-update", { roomId, nodes: pastState.nodes, edges: pastState.edges });
      saveBoard(pastState.nodes, pastState.edges);
    }
  }, [undo, setNodes, setEdges, roomId, saveBoard]);

  const handleRedo = useCallback(() => {
    const futureState = redo(); 
    if (futureState) {
      setNodes(futureState.nodes); 
      setEdges(futureState.edges);
      socket.emit("board-update", { roomId, nodes: futureState.nodes, edges: futureState.edges });
      saveBoard(futureState.nodes, futureState.edges);
    }
  }, [redo, setNodes, setEdges, roomId, saveBoard]);

  // --- SHARE FUNCTION ---
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("✅ Link copied to clipboard! Send it to your friends.");
  };

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode = {
        id: Date.now().toString(), type: 'image', position,
        data: { src: base64String },
      };
      setNodes((nds) => [...nds, newNode]);
      takeSnapshot([...getNodes(), newNode], getEdges()); 
      socket.emit("node-create", { roomId, node: newNode });
      saveBoard();
    };
    reader.readAsDataURL(file);
  }, [screenToFlowPosition, roomId, saveBoard, setNodes, takeSnapshot, getNodes, getEdges]);

  const onImageClick = () => { fileInputRef.current?.click(); };

  const onImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result;
      const newNode = {
        id: Date.now().toString(), type: 'image', 
        position: { x: Math.random() * 400, y: Math.random() * 400 }, 
        data: { src: base64String }, 
      };
      setNodes((nds) => [...nds, newNode]);
      takeSnapshot([...getNodes(), newNode], getEdges()); 
      socket.emit("node-create", { roomId, node: newNode });
      saveBoard();
    };
    reader.readAsDataURL(file);
    event.target.value = ''; 
  };

  const addCard = () => {
    const newNode = { 
      id: Date.now().toString(), type: 'idea', 
      position: { x: Math.random() * 300, y: Math.random() * 300 }, 
      data: { label: 'New Idea', onChange: onNodeTextChange }, 
    };
    setNodes((nds) => [...nds, newNode]);
    takeSnapshot([...getNodes(), newNode], getEdges()); 
    socket.emit("node-create", { roomId, node: newNode });
    saveBoard();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    socket.emit("join-room", roomId);
    const API_URL = 'https://idea-lab-server.onrender.com';

    async function fetchBoard() {
      try {
        const response = await axios.get(`${API_URL}/boards/${roomId}`);
        const { nodes, edges, viewport } = response.data;
        if (nodes) {
          const hydratedNodes = nodes.map(n => ({ ...n, data: { ...n.data, onChange: onNodeTextChange } }));
          setNodes(hydratedNodes);
        }
        if (edges) setEdges(edges);
        if (viewport) setViewport(viewport);
      } catch (error) {
        console.error("Failed to load board:", error);
      } finally {
        setIsLoading(false); // <--- STOP LOADING
      }
    }
    fetchBoard();

    socket.on("node-drag", (incomingNode) => {
       setNodes((nds) => nds.map((node) => node.id === incomingNode.id ? { ...incomingNode, data: { ...incomingNode.data, onChange: onNodeTextChange } } : node));
    });
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
    socket.on("user-disconnected", (userId) => {
      setCursors((prev) => {
        const newCursors = { ...prev }; 
        delete newCursors[userId];
        return newCursors;
      });
    });
    socket.on("board-update", ({ nodes, edges }) => {
      const hydratedNodes = nodes.map(n => ({ ...n, data: { ...n.data, onChange: onNodeTextChange } }));
      setNodes(hydratedNodes);
      setEdges(edges);
    });

    return () => {
      socket.off("node-drag"); socket.off("node-create"); socket.off("text-change");
      socket.off("edge-create"); socket.off("nodes-delete"); socket.off("edges-delete");
      socket.off("cursor-move"); socket.off("user-disconnected"); socket.off("board-update"); 
    };
  }, [roomId, setNodes, setEdges, setViewport, onNodeTextChange]); 

  const onNodeDrag = useCallback((_, node) => { socket.emit("node-drag", { roomId, node }); }, [roomId]);

  if (isLoading) return <LoadingScreen />;

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
        {/* NEW: MiniMap added here */}
        <MiniMap 
           position="bottom-right" 
           nodeColor={(node) => node.type === 'image' ? '#ff0071' : '#FFD700'} 
        />
      </ReactFlow>

      {/* CURSORS */}
      {Object.entries(cursors).map(([userId, cursor]) => {
        const screenPos = flowToScreenPosition({ x: cursor.x, y: cursor.y });
        if (!screenPos) return null;
        return (
          <div key={userId} style={{ position: 'absolute', left: screenPos.x, top: screenPos.y, pointerEvents: 'none', zIndex: 9999, transition: 'all 0.1s ease', transform: 'translate(-50%, -50%)' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: cursor.userColor || 'red', borderRadius: '50%' }} />
            <div style={{ backgroundColor: cursor.userColor || 'red', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginTop: '4px', whiteSpace: 'nowrap' }}>
              {cursor.userName || "Guest"}
            </div>
          </div>
        );
      })}
      
      {/* TOP LEFT CONTROLS */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', gap: '10px' }}>
        <div style={{ background: 'white', padding: '10px 15px', borderRadius: '5px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
           Room: {roomId}
        </div>
        <button onClick={handleUndo} style={btnStyle} title="Undo (Ctrl+Z)"> ↩ </button>
        <button onClick={handleRedo} style={btnStyle} title="Redo (Ctrl+Y)"> ↪ </button>
      </div>
      
      {/* TOP RIGHT TOOLS */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', gap: '10px' }}>
        {/* NEW: Share Button */}
        <button onClick={copyLink} style={{ ...btnStyle, background: '#28a745', color: 'white' }}> 🔗 Share </button>

        <button onClick={onImageClick} style={{ ...btnStyle, background: '#007bff', color: 'white' }}> + Image </button>
        <button onClick={addCard} style={{ ...btnStyle, background: '#FFD700', color: '#333' }}> + Sticky Note </button>
        <input type="file" ref={fileInputRef} onChange={onImageChange} accept="image/*" style={{ display: 'none' }} />
      </div>
    </div>
  );
}

// Helper style for cleaner code
const btnStyle = {
  padding: '10px 15px',
  fontSize: '16px',
  cursor: 'pointer',
  background: 'white',
  color: '#333',
  border: 'none',
  borderRadius: '5px',
  fontWeight: 'bold',
  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/board/:roomId" element={<ProtectedRoute><ReactFlowProvider><Board /></ReactFlowProvider></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}