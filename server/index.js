// server/index.js
require("dotenv").config();
const authRoute= require("./routes/auth")
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Board = require("./models/Board");

const app = express();
app.use(cors({
  origin: [
    "https://idea-lab-client.onrender.com"
  ],
  credentials: true
  
}));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL || "mongodb+srv://admin:admin@cluster0.ux9s.mongodb.net/idea-lab?retryWrites=true&w=majority")
  .then(() => console.log("MONGODB CONNECTED"))
  .catch((err) => console.error("MONGODB ERROR:", err));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin:[
      //"http://localhost:5173",                 // Trust your laptop
      "https://idea-lab-client.onrender.com"   // Trust your live website (REPLACE THIS WITH YOUR ACTUAL URL)
    ],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  // 1. Get User Info
  const { userName } = socket.handshake.query;
  console.log(`User Connected: ${userName} (${socket.id})`);

  // 2. Join Room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`${userName} joined room: ${roomId}`);
  });

  // 3. Handle Node Drag
  socket.on("node-drag", ({ roomId, node }) => {
    socket.to(roomId).emit("node-drag", node);
  });

  // 4. Handle Text Change
  socket.on("text-change", ({ roomId, id, text }) => {
    socket.to(roomId).emit("text-change", { id, text });
  });

  // 5. NEW: Handle Node Creation (With Log)
  socket.on("node-create", ({ roomId, node }) => {
    console.log(`New Node Created in ${roomId} by ${userName}`);
    socket.to(roomId).emit("node-create", node);
  });

 socket.on("edge-create", ({ roomId, edge }) => {
    socket.to(roomId).emit("edge-create", edge);
  }); 

  // We send a list of IDs to delete
  socket.on("nodes-delete", ({ roomId, ids }) => {
    socket.to(roomId).emit("nodes-delete", ids);
  });

  socket.on("edges-delete", ({ roomId, ids }) => {
    socket.to(roomId).emit("edges-delete", ids);
  });


  // 6. Handle Cursors
  socket.on("cursor-move", (data) => {
    socket.to(data.roomId).emit("cursor-move", data);
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("user-disconnected", socket.id);
  });
});
app.use("/auth", authRoute);
// API Routes
app.get("/boards/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const board = await Board.findOne({ roomId });
    if (board) {
      res.json(board);
    } else {
      res.json({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

app.post("/boards", async (req, res) => {
  try {
    const { roomId, nodes, edges, viewport } = req.body;
    const board = await Board.findOneAndUpdate(
      { roomId },
      { nodes, edges, viewport },
      { upsert: true, new: true }
    );
    res.json(board);
  } catch (err) {
    res.status(500).json(err);
  }
});
 

server.listen(3001, () => {
  console.log("SERVER RUNNING ON PORT 3001");
});