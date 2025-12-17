// client/src/App.jsx
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useParams,Link,Navigate } from 'react-router-dom';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  ReactFlowProvider,
  useReactFlow,
  ConnectionMode // <--- 1. NEW IMPORT: Allows connecting any handle to any handle
} from '@xyflow/react';
import axios from 'axios'; 

import '@xyflow/react/dist/style.css'; 
import { socket } from './socket';
import { getUserIdentity } from './utils/userIdentity';
import Home from './pages/Home';
import IdeaNode from './components/IdeaNode'; 
import Login from './pages/Login';
import Register from './pages/Register';

const getSmartIdentity = () => {
  const savedUser = localStorage.getItem('user');
  const randomIdentity = getUserIdentity(); // Always get a color from here

  if (savedUser) {
    const parsed = JSON.parse(savedUser);
    return {
      id: parsed.id,       // Real DB ID
      name: parsed.name,   // Real Name (e.g. "Master Coder")
      color: randomIdentity.color // Keep the random color (or save color in DB later)
    };
  }
  return randomIdentity; // Fallback to "Calm Tiger"
};

const me = getUserIdentity(); 

function Board() {
  const { roomId } = useParams();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [cursors, setCursors] = useState({});
  const { getNodes, getEdges, getViewport, setViewport } = useReactFlow(); 

  const nodeTypes = useMemo(() => ({ idea: IdeaNode }), []);

  // --- HELPER: Save to DB ---
  const saveBoard = useCallback(async () => {
    // We wait a brief moment to ensure state is settled before saving
    setTimeout(async () => {
      const currentNodes = getNodes(); 
      const currentEdges = getEdges(); // Get latest edges too
      const currentViewport = getViewport();
      await axios.post('https://idea-lab-server.onrender.com/boards', {
        roomId,
        nodes: currentNodes, 
        edges: currentEdges,
        viewport: currentViewport
      });
    }, 500);
  }, [getNodes, getEdges, getViewport, roomId]);

  // --- HANDLERS ---

  // 1. Text Changes
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
    saveBoard(); // Save text changes
  }, [roomId, setNodes, saveBoard]);

  // 2. Connections (Drawing Lines) - FIX FOR ISSUE #2
  const onConnect = useCallback(
    (params) => {
      // Update Local
      setEdges((eds) => addEdge(params, eds));
      // Broadcast to Socket
      socket.emit("edge-create", { roomId, edge: params });
      // Save
      saveBoard();
    },
    [setEdges, roomId, saveBoard],
  );

  // 3. Deleting Nodes - FIX FOR ISSUE #3
  const onNodesDelete = useCallback((deletedNodes) => {
    const ids = deletedNodes.map(n => n.id);
    socket.emit("nodes-delete", { roomId, ids });
    saveBoard();
  }, [roomId, saveBoard]);

  // 4. Deleting Edges - FIX FOR ISSUE #3
  const onEdgesDelete = useCallback((deletedEdges) => {
    const ids = deletedEdges.map(e => e.id);
    socket.emit("edges-delete", { roomId, ids });
    saveBoard();
  }, [roomId, saveBoard]);


  // --- SOCKET LISTENERS ---
  useEffect(() => {
    // Join Room
    socket.emit("join-room", roomId);

    // Initial Load
    async function fetchBoard() {
      try {
        const response = await axios.get(`https://idea-lab-server.onrender.com/boards/${roomId}`);
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

    // Event: Node Moved
    socket.on("node-drag", (incomingNode) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === incomingNode.id) {
             return { ...incomingNode, data: { ...incomingNode.data, onChange: onNodeTextChange } };
          }
          return node;
        })
      );
    });

    // Event: Node Created
    socket.on("node-create", (newNode) => {
      setNodes((nds) => {
        if (nds.find(n => n.id === newNode.id)) return nds;
        return [...nds, { ...newNode, data: { ...newNode.data, onChange: onNodeTextChange } }];
      });
    });

    // Event: Text Changed
    socket.on("text-change", ({ id, text }) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return { ...node, data: { ...node.data, label: text, onChange: onNodeTextChange } };
          }
          return node;
        })
      );
    });

    // Event: Edge Created (Line Drawn)
    socket.on("edge-create", (edge) => {
      setEdges((eds) => addEdge(edge, eds));
    });

    // Event: Nodes Deleted
    socket.on("nodes-delete", (ids) => {
      setNodes((nds) => nds.filter((n) => !ids.includes(n.id)));
    });

    // Event: Edges Deleted
    socket.on("edges-delete", (ids) => {
      setEdges((eds) => eds.filter((e) => !ids.includes(e.id)));
    });

    // Event: Cursors
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

  const onMouseMove = (e) => {
    if (!socket.id) return;
    const myCursor = { 
      x: e.clientX, y: e.clientY, 
      userId: socket.id, userName: me.name, userColor: me.color,
      roomId 
    };
    socket.emit("cursor-move", myCursor);
  };

  const addCard = () => {
    const newNode = { 
      id: Date.now().toString(), 
      type: 'idea', 
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 }, 
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
        onConnect={onConnect}      // Handles drawing lines
        onNodesDelete={onNodesDelete} // Handles deleting nodes
        onEdgesDelete={onEdgesDelete} // Handles deleting lines
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop} 
        onMoveEnd={onMoveEnd}
        connectionMode={ConnectionMode.Loose} // <--- FIX FOR ISSUE #1
      >
        <Background variant="dots" gap={12} size={1} />
        <Controls />
      </ReactFlow>

      {/* Cursors */}
      {Object.entries(cursors).map(([userId, cursor]) => (
        <div key={userId} style={{ position: 'absolute', left: cursor.x, top: cursor.y, pointerEvents: 'none', zIndex: 9999, transition: 'all 0.1s ease', transform: 'translate(-50%, -50%)' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: cursor.userColor || 'red', borderRadius: '50%' }} />
          <div style={{ backgroundColor: cursor.userColor || 'red', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginTop: '4px', whiteSpace: 'nowrap' }}>
            {cursor.userName || "Guest"}
          </div>
        </div>
      ))}
      
      {/* Buttons */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
        <button onClick={addCard} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', background: '#FFD700', color: '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
          + Sticky Note
        </button>
      </div>
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, background: 'white', padding: '5px 10px', borderRadius: '5px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
        Room: <b>{roomId}</b>
      </div>
    </div>
  );
}
// Helper: Only allow access if logged in
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    // Redirect to login if no token found
    return <Navigate to="/login" replace />; // You'll need to import Navigate
  }
  return children;
};
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* PROTECTED ROUTES (Must be logged in) */}
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
  )};