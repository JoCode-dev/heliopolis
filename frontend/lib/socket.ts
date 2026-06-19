import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
// undefined = jamais initialisé (≠ null = cookie-only mode)
let currentToken: string | null | undefined = undefined;

// token peut être null — l'authentification se fait via le cookie httpOnly access_token
export function getSocket(token?: string | null): Socket {
  // Ne recréer le socket QUE si le token change — pas à chaque déconnexion/reconnexion
  // Recréer tuerait les listeners et sortirait le socket des rooms
  const key = token ?? null;
  if (socket && currentToken === key) {
    return socket;
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentToken = key;
  socket = io(
    (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4002/api').replace('/api', '') + '/chat',
    {
      // withCredentials envoie le cookie access_token sur le handshake WebSocket
      withCredentials: true,
      ...(token ? { auth: { token } } : {}),
      transports: ['websocket'],
      autoConnect: true,
    }
  );
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  currentToken = undefined;
}
