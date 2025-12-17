// client/src/components/ImageNode.jsx
import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const ImageNode = ({ data, selected }) => {
  return (
    <div style={{ 
      position: 'relative', 
      // width: 'fit-content' tells the box to shrink to the image size
      width: 'fit-content',
      height: 'fit-content',
      lineHeight: 0 
    }}>
      
      {/* THE IMAGE */}
      <img 
        src={data.src} 
        alt="Upload" 
        style={{ 
          display: 'block',
          // Force natural height/width ratio
          width: 'auto',   
          height: 'auto',  
          maxWidth: '300px', // Prevent it from being too huge
          maxHeight: '400px', // Prevent it from being too tall
          borderRadius: '5px', 
          boxShadow: selected ? '0 0 0 2px #8e24aa' : 'none', 
        }} 
      />

      {/* --- CONNECTION DOTS --- */}
      {/* Top */}
      <Handle 
        type="source" position={Position.Top} id="top" 
        style={{ left: '50%', top: 0, transform: 'translate(-50%, -50%)', width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 }} 
      />
      {/* Right */}
      <Handle 
        type="source" position={Position.Right} id="right" 
        style={{ top: '50%', right: 0, transform: 'translate(50%, -50%)', width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 }} 
      />
      {/* Bottom */}
      <Handle 
        type="source" position={Position.Bottom} id="bottom" 
        style={{ left: '50%', bottom: 0, transform: 'translate(-50%, 50%)', width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 }} 
      />
      {/* Left */}
      <Handle 
        type="source" position={Position.Left} id="left" 
        style={{ top: '50%', left: 0, transform: 'translate(-50%, -50%)', width: 10, height: 10, background: '#555', border: '2px solid white', zIndex: 10 }} 
      />
    </div>
  );
};

export default memo(ImageNode);