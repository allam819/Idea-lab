// client/src/components/ImageNode.jsx
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const ImageNode = ({ data, selected }) => {
  return (
    <div style={{ 
      position: 'relative', 
      width: '200px', 
      height: '200px',
      borderRadius: '5px',
    }}>
      
      {/* THE IMAGE */}
      <img 
        src={data.src} 
        alt="Upload" 
        style={{ 
          width: '100%', 
          height: '100%', 
          borderRadius: '5px', 
          objectFit: 'cover',
          display: 'block',
          boxShadow: selected ? '0 0 0 2px #8e24aa' : 'none', 
        }} 
      />

      {/* --- CONNECTION DOTS --- */}
      {/* We manually position them to be 100% sure they are on the edges */}

      {/* TOP DOT */}
      <Handle 
        type="source" 
        position={Position.Top} 
        id="top" 
        style={{ 
          top: -5, 
          left: '50%', 
          width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 
        }} 
      />

      {/* RIGHT DOT */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        style={{ 
          top: '50%', 
          right: -5, 
          width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 
        }} 
      />

      {/* BOTTOM DOT */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        style={{ 
          bottom: -5, 
          left: '50%', 
          width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 
        }} 
      />

      {/* LEFT DOT */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left" 
        style={{ 
          top: '50%', 
          left: -5, 
          width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 
        }} 
      />
    </div>
  );
};

export default memo(ImageNode);