// client/src/hooks/useUndoRedo.js
import { useState, useCallback } from 'react';

export default function useUndoRedo(initialNodes = [], initialEdges = []) {
  // History is a list of "Snapshots" of the board
  const [history, setHistory] = useState([{ nodes: initialNodes, edges: initialEdges }]);
  const [index, setIndex] = useState(0);

  // 1. Take a Snapshot (Call this whenever the user changes the board)
  const takeSnapshot = useCallback((nodes, edges) => {
    setHistory((prev) => {
      // If we are in the middle of history (because we undid), delete the "future"
      const newHistory = prev.slice(0, index + 1);
      // Add the new state to history
      newHistory.push({ 
        nodes: JSON.parse(JSON.stringify(nodes)), 
        edges: JSON.parse(JSON.stringify(edges)) 
      });
      return newHistory;
    });
    setIndex((prev) => prev + 1);
  }, [index]);

  // 2. Undo (Go Back)
  const undo = useCallback(() => {
    if (index > 0) {
      const newIndex = index - 1;
      setIndex(newIndex);
      return history[newIndex]; // Returns the past state
    }
    return null;
  }, [index, history]);

  // 3. Redo (Go Forward)
  const redo = useCallback(() => {
    if (index < history.length - 1) {
      const newIndex = index + 1;
      setIndex(newIndex);
      return history[newIndex]; // Returns the future state
    }
    return null;
  }, [index, history]);

  return { takeSnapshot, undo, redo };
}