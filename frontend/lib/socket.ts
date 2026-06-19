import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function getSocket(token: string): Socket {
  // Ne recréer le socket QUE si le token change — pas à chaque déconnexion/reconnexion
  // Recréer tuerait les listeners et sortirait le socket des rooms
  if (socket && currentToken === token) {
    return socket;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentToken = token;
  socket = io(
    (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace('/api', '') + '/chat',
    {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    }
  );
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  currentToken = null;
}
