const Koa = require('koa');
const http = require('http');
const { Server } = require('socket.io');

const app = new Koa();
const server = http.createServer(app.callback());
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
    },
});

const SERVER_PORT = 8080;
const SERVER_HOST = 'localhost';
const MAX_HISTORY_SIZE = 50;
const connectedUsers = new Map();
const roomState = new Map();

const createSystemMessage = (message) => ({
    id: `system-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    message,
    type: 'system',
    createdAt: new Date().toISOString(),
});

const getOrCreateRoom = (roomId) => {
    if (!roomState.has(roomId)) {
        roomState.set(roomId, {
            history: [],
            users: new Set(),
        });
    }

    return roomState.get(roomId);
};

const pushToHistory = (roomId, message) => {
    const room = getOrCreateRoom(roomId);
    room.history.push(message);
    if (room.history.length > MAX_HISTORY_SIZE) {
        room.history.shift();
    }
};

const emitOnlineCount = (roomId) => {
    const room = getOrCreateRoom(roomId);
    io.to(roomId).emit('chat:online', { roomId, count: room.users.size });
};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    socket.emit('chat:me', { socketId: socket.id });
    connectedUsers.set(socket.id, {
        username: 'Anônimo',
        roomId: null,
    });

    socket.on('chat:room:join', ({ roomId, username }) => {
        const nextRoomId = (roomId || 'geral').trim().toLowerCase();
        const nextUsername = (username || 'Anônimo').trim() || 'Anônimo';
        const user = connectedUsers.get(socket.id) || { username: 'Anônimo', roomId: null };
        const previousRoomId = user.roomId;

        if (previousRoomId && previousRoomId !== nextRoomId) {
            const previousRoom = getOrCreateRoom(previousRoomId);
            previousRoom.users.delete(socket.id);
            socket.leave(previousRoomId);

            const leftMessage = createSystemMessage(`${user.username} saiu da sala`);
            pushToHistory(previousRoomId, leftMessage);
            io.to(previousRoomId).emit('chat:message', leftMessage);
            io.to(previousRoomId).emit('chat:typing', {
                senderId: socket.id,
                username: user.username,
                isTyping: false,
            });
            emitOnlineCount(previousRoomId);
        }

        if (previousRoomId !== nextRoomId) {
            socket.join(nextRoomId);
            const nextRoom = getOrCreateRoom(nextRoomId);
            nextRoom.users.add(socket.id);
            connectedUsers.set(socket.id, {
                username: nextUsername,
                roomId: nextRoomId,
            });

            socket.emit('chat:history', nextRoom.history);
            const joinedMessage = createSystemMessage(`${nextUsername} entrou na sala`);
            pushToHistory(nextRoomId, joinedMessage);
            io.to(nextRoomId).emit('chat:message', joinedMessage);
            emitOnlineCount(nextRoomId);
            return;
        }

        connectedUsers.set(socket.id, {
            username: nextUsername,
            roomId: nextRoomId,
        });
    });

    socket.on('chat:user:set', ({ username }) => {
        const user = connectedUsers.get(socket.id) || { username: 'Anônimo', roomId: null };
        const previousUsername = user.username;
        const nextUsername = (username || 'Anônimo').trim() || 'Anônimo';
        connectedUsers.set(socket.id, {
            ...user,
            username: nextUsername,
        });

        if (!user.roomId || previousUsername === nextUsername) {
            return;
        }

        const changedMessage = createSystemMessage(`${previousUsername} agora é ${nextUsername}`);
        pushToHistory(user.roomId, changedMessage);
        io.to(user.roomId).emit('chat:message', changedMessage);
    });

    socket.on('chat:message', (payload) => {
        const user = connectedUsers.get(socket.id) || { username: 'Anônimo', roomId: null };
        if (!user.roomId) {
            return;
        }

        const message = {
            id: payload.id,
            message: payload.message,
            username: user.username || payload.username || 'Anônimo',
            senderId: socket.id,
            type: 'user',
            createdAt: new Date().toISOString(),
        };

        pushToHistory(user.roomId, message);

        io.to(user.roomId).emit('chat:message', message);
    });

    socket.on('chat:typing', ({ isTyping }) => {
        const user = connectedUsers.get(socket.id) || { username: 'Anônimo', roomId: null };
        if (!user.roomId) {
            return;
        }

        socket.to(user.roomId).emit('chat:typing', {
            senderId: socket.id,
            username: user.username,
            isTyping: Boolean(isTyping),
        });
    });

    socket.on('disconnect', () => {
        const user = connectedUsers.get(socket.id) || { username: 'Anônimo', roomId: null };
        connectedUsers.delete(socket.id);

        if (user.roomId) {
            const room = getOrCreateRoom(user.roomId);
            room.users.delete(socket.id);
            const leftMessage = createSystemMessage(`${user.username} saiu da sala`);
            pushToHistory(user.roomId, leftMessage);
            io.to(user.roomId).emit('chat:message', leftMessage);
            socket.to(user.roomId).emit('chat:typing', {
                senderId: socket.id,
                username: user.username,
                isTyping: false,
            });
            emitOnlineCount(user.roomId);
        }

        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(SERVER_PORT, SERVER_HOST, () => {
    console.log(`Server is running on port ${SERVER_PORT}`);
});