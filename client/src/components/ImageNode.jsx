// client/src/components/ImageNode.jsx
import React, { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';

const ImageNode = ({ data, selected }) => {
  return (
    <div style={{ position: 'relative' }}>
      {/* NodeResizer: Allows resizing. 
         - isVisible={selected}: Only shows purple borders when clicked.
         - handleStyle: Makes the resize dots purple squares.
      */}
      <NodeResizer 
        color="#8e24aa" 
        isVisible={selected} 
        minWidth={100} 
        minHeight={100}
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }} 
      />
      
      {/* The Image */}
      <img 
        src={data.src} 
        alt="Upload" 
        style={{ 
          width: '100%', 
          height: '100%', 
          borderRadius: '5px', 
          objectFit: 'cover',
          display: 'block',
          boxShadow: selected ? '0 0 0 2px #8e24aa' : 'none' // Purple border when selected
        }} 
      />

      {/* --- CONNECTION HANDLES (The Dots) --- */}
      {/* We add 'id' to each handle so lines know exactly where to snap. 
          We set 'type="source"' because ConnectionMode.Loose allows any-to-any. 
      */}

      {/* Top Handle */}
      <Handle 
        type="source" 
        position={Position.Top} 
        id="top" 
        style={{ background: '#555', width: 8, height: 8, border: '2px solid white' }} 
      />

      {/* Right Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right" 
        style={{ background: '#555', width: 8, height: 8, border: '2px solid white' }} 
      />

      {/* Bottom Handle */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom" 
        style={{ background: '#555', width: 8, height: 8, border: '2px solid white' }} 
      />

      {/* Left Handle */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left" 
        style={{ background: '#555', width: 8, height: 8, border: '2px solid white' }} 
      />
    </div>
  );
};

export default memo(ImageNode);