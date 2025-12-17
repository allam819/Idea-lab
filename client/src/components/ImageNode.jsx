// client/src/components/ImageNode.jsx
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const ImageNode = ({ data, selected }) => {
  return (
    <div style={{ 
      position: 'relative', 
      width: 'fit-content',  // <--- KEY FIX: Hugs the image size
      height: 'fit-content', // <--- KEY FIX: Hugs the image size
      lineHeight: 0          // Removes tiny ghost space at bottom
    }}>
      
      {/* THE IMAGE */}
      <img 
        src={data.src} 
        alt="Upload" 
        style={{ 
          display: 'block',
          maxWidth: '300px', // Prevents giant images
          height: 'auto',    // Maintains Aspect Ratio!
          borderRadius: '5px', 
          boxShadow: selected ? '0 0 0 2px #8e24aa' : 'none', 
        }} 
      />

      {/* --- CONNECTION DOTS --- */}
      {/* Perfectly centered on edges using translate */}

      {/* TOP */}
      <Handle 
        type="source" position={Position.Top} id="top" 
        style={{ 
          left: '50%', top: 0, transform: 'translate(-50%, -50%)',
          width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 
        }} 
      />

      {/* RIGHT */}
      <Handle 
        type="source" position={Position.Right} id="right" 
        style={{ 
          top: '50%', right: 0, transform: 'translate(50%, -50%)',
          width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 
        }} 
      />

      {/* BOTTOM */}
      <Handle 
        type="source" position={Position.Bottom} id="bottom" 
        style={{ 
          left: '50%', bottom: 0, transform: 'translate(-50%, 50%)',
          width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 
        }} 
      />

      {/* LEFT */}
      <Handle 
        type="source" position={Position.Left} id="left" 
        style={{ 
          top: '50%', left: 0, transform: 'translate(-50%, -50%)',
          width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 
        }} 
      />
    </div>
  );
};

export default memo(ImageNode);