// client/src/socket.js
import { io } from 'socket.io-client';
import { getUserIdentity } from './utils/userIdentity';

// Get the user (either from storage or generate new)
const user = getUserIdentity();

export const socket = io("https://idea-lab-server.onrender.com/", {
  // Pass the identity in the "query" (Handshake)
  query: {
    userId: user.id,
    userName: user.name,
    userColor: user.color
  }
});