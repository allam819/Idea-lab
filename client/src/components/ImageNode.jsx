// client/src/components/ImageNode.jsx
import React from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';

export default function ImageNode({ data, selected }) {
  return (
    <div style={{ position: 'relative' }}>
      {/* NodeResizer: Allows you to drag the corners to resize the image 
        'isVisible={selected}' means the handles only show when you click the image
      */}
      <NodeResizer 
        color="#ff0071" 
        isVisible={selected} 
        minWidth={100} 
        minHeight={100} 
      />
      
      {/* The Image Itself */}
      <img 
        src={data.src} 
        alt="Upload" 
        style={{ 
          width: '100%', 
          height: '100%', 
          borderRadius: '5px', 
          objectFit: 'cover',
          display: 'block' // Removes weird spacing
        }} 
      />

      {/* Connection Handles (Hidden but functional) */}
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}