// client/src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [recentRooms, setRecentRooms] = useState([]);

  // Load recent rooms from local storage on start
  useEffect(() => {
    const saved = localStorage.getItem('idea_lab_recents');
    if (saved) {
      setRecentRooms(JSON.parse(saved));
    }
  }, []);

  const addToRecents = (id) => {
    const updated = [id, ...recentRooms.filter(r => r !== id)].slice(0, 5); // Keep max 5
    setRecentRooms(updated);
    localStorage.setItem('idea_lab_recents', JSON.stringify(updated));
  };

  const createRandomBoard = () => {
    const id = uuidv4().slice(0, 8); // Short random ID
    addToRecents(id);
    navigate(`/board/${id}`);
  };

  const joinCustomRoom = (e) => {
    e.preventDefault(); // Stop form reload
    if (!roomName.trim()) return;
    
    // Convert "My Cool Plan" -> "my-cool-plan"
    const formattedId = roomName.trim().toLowerCase().replace(/\s+/g, '-');
    
    addToRecents(formattedId);
    navigate(`/board/${formattedId}`);
  };

  return (
    <div style={{ 
      height: '100vh', 
      background: '#f8f9fa', 
      fontFamily: 'sans-serif',
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      paddingTop: '100px'
    }}>
      <h1 style={{ fontSize: '48px', color: '#333', marginBottom: '10px' }}>Idea Lab 💡</h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>Your Infinite Real-Time Whiteboard</p>

      {/* CARD: Create / Join */}
      <div style={{ 
        background: 'white', 
        padding: '30px', 
        borderRadius: '10px', 
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        width: '400px',
        textAlign: 'center'
      }}>
        
        {/* OPTION 1: Random New Board */}
        <button 
          onClick={createRandomBoard}
          style={{ 
            width: '100%', 
            padding: '12px', 
            fontSize: '16px', 
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '20px',
            fontWeight: 'bold'
          }}
        >
          ✨ Create New Random Board
        </button>

        <div style={{ margin: '20px 0', color: '#aaa', fontSize: '14px' }}>— OR —</div>

        {/* OPTION 2: Custom Name */}
        <form onSubmit={joinCustomRoom} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Enter custom name (e.g. 'marketing')" 
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            style={{ 
              flex: 1, 
              padding: '10px', 
              borderRadius: '5px', 
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          />
          <button 
            type="submit"
            style={{ 
              padding: '10px 20px', 
              background: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Go
          </button>
        </form>
      </div>

      {/* RECENT ROOMS LIST */}
      {recentRooms.length > 0 && (
        <div style={{ marginTop: '40px', width: '400px' }}>
          <h3 style={{ color: '#555', fontSize: '16px', marginBottom: '10px' }}>Recent Boards:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentRooms.map(room => (
              <div 
                key={room}
                onClick={() => navigate(`/board/${room}`)}
                style={{ 
                  background: 'white', 
                  padding: '12px', 
                  borderRadius: '5px', 
                  border: '1px solid #eee',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: '#333'
                }}
                onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
                onMouseLeave={(e) => e.target.style.background = 'white'}
              >
                <span>📂 {room}</span>
                <span style={{ color: '#007bff' }}>Open &rarr;</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}