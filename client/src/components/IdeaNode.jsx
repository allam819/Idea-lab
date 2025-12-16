// client/src/components/IdeaNode.jsx
import React, { useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';

export default function IdeaNode({ id, data }) {
  
  const handleChange = useCallback((evt) => {
    if (data.onChange) {
      data.onChange(id, evt.target.value);
    }
  }, [id, data]);

  return (
    <div style={{
      background: '#fff9c4', 
      padding: '10px',
      borderRadius: '5px',
      border: '1px solid #e6e600',
      boxShadow: '2px 2px 5px rgba(0,0,0,0.1)',
      minWidth: '150px',
      textAlign: 'left'
    }}>
      {/* CRITICAL FIX: Added 'id' to each handle. 
         Now React Flow knows exactly which dot you are connecting!
      */}
      
      {/* Top Handle */}
      <Handle 
        type="source" // Changed to 'source' to allow connecting FROM top too
        position={Position.Top} 
        id="top" 
        style={{ background: '#555' }} 
      />
      
      {/* Bottom Handle */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        style={{ background: '#555' }} 
      />
      
      {/* Left Handle */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left" 
        style={{ background: '#555' }} 
      />
      
      {/* Right Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        style={{ background: '#555' }} 
      />

      <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#666' }}>IDEA</label>
      <textarea 
        className="nodrag" 
        value={data.label} 
        onChange={handleChange}
        placeholder="Type something..."
        rows={3}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          resize: 'none',
          outline: 'none',
          marginTop: '5px',
          fontFamily: 'sans-serif',
          fontSize: '14px'
        }}
      />
    </div>
  );
}