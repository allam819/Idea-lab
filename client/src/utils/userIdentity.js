// client/src/utils/userIdentity.js
import { v4 as uuidv4 } from 'uuid';

const ADJECTIVES = ["Swift", "Happy", "Fierce", "Calm", "Brave"];
const ANIMALS = ["Tiger", "Eagle", "Panda", "Fox", "Hawk"];
const COLORS = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#FF33A8"];

export const getUserIdentity = () => {
  // 1. Try to get existing user from LocalStorage
  const storedUser = localStorage.getItem('idea_lab_user');
  
  if (storedUser) {
    return JSON.parse(storedUser);
  }

  // 2. If not found, generate a new random identity
  const newUser = {
    id: uuidv4(),
    name: `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${ANIMALS[Math.floor(Math.random() * ANIMALS.length)]}`,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  };

  // 3. Save it for next time
  localStorage.setItem('idea_lab_user', JSON.stringify(newUser));
  
  return newUser;
};