import { io } from 'socket.io-client';
const socket = io('https://send-clone-backend.onrender.com');
export default socket;
