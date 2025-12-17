// client/src/components/ImageNode.jsx
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const ImageNode = ({ data, selected }) => {
  return (
    // 1. Container: 'display: inline-block' makes the div wrap tightly around the image
    <div style={{ 
      position: 'relative', 
      display: 'inline-block',
      lineHeight: 0 // Removes tiny gap at bottom of images
    }}>
      
      {/* 2. The Image: 
          - maxWidth: prevents it from being huge (optional, adjust as you like)
          - height: auto (Keeps original Aspect Ratio!)
      */}
      <img 
        src={data.src} 
        alt="Upload" 
        style={{ 
          display: 'block',
          maxWidth: '300px', // Limits width so huge images don't cover the board
          height: 'auto',    // <--- THIS FIXES THE SQUARE PROBLEM
          borderRadius: '5px', 
          objectFit: 'contain',
          boxShadow: selected ? '0 0 0 2px #8e24aa' : 'none', 
        }} 
      />

      {/* --- CONNECTION DOTS --- */}
      {/* We use 'transform' to center them perfectly on the lines */}

      {/* TOP DOT */}
      <Handle 
        type="source" 
        position={Position.Top} 
        id="top" 
        style={{ 
          left: '50%', top: 0, 
          transform: 'translate(-50%, -50%)', // Centers dot perfectly
          width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 
        }} 
      />

      {/* RIGHT DOT */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        style={{ 
          top: '50%', right: 0, 
          transform: 'translate(50%, -50%)', 
          width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 
        }} 
      />

      {/* BOTTOM DOT */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        style={{ 
          left: '50%', bottom: 0, 
          transform: 'translate(-50%, 50%)',
          width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 
        }} 
      />

      {/* LEFT DOT */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left" 
        style={{ 
          top: '50%', left: 0, 
          transform: 'translate(-50%, -50%)',
          width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 
        }} 
      />
    </div>
  );
};

export default memo(ImageNode);