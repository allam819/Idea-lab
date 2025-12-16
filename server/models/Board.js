// server/models/Board.js
const mongoose = require("mongoose");

const BoardSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true }, // e.g., "room-1"
  nodes: { type: Array, default: [] }, // Stores our React Flow nodes
  edges: { type: Array, default: [] } , // Stores the lines connecting them
  viewport: { type: Object, default: { x: 0, y: 0, zoom: 1 } }
});

module.exports = mongoose.model("Board", BoardSchema);