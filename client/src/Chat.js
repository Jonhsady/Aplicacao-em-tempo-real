import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

const socket = io('http://localhost:8080');


const Chat = () => {
    const [message, updateMessage] = useState('');
    const [messages, updateMessages] = useState([]);
    const [username, setUsername] = useState('');
    const [roomId, setRoomId] = useState('');
    const [editingRoomId, setEditingRoomId] = useState('');
    const [isEditingRoom, setIsEditingRoom] = useState(false);
    const [editingUsername, setEditingUsername] = useState('');
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [mySocketId, setMySocketId] = useState('');
    const [onlineCount, setOnlineCount] = useState(0);
    const [typingUsers, setTypingUsers] = useState([]);
    const [copyStatus, setCopyStatus] = useState('');
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        const savedUsername = localStorage.getItem('chat:username');
        if (savedUsername && savedUsername.trim()) {
            setUsername(savedUsername.trim());
        } else {
            const typedUsername = window.prompt('Qual é o seu nome?');
            const nextUsername = (typedUsername || 'Anônimo').trim() || 'Anônimo';
            setUsername(nextUsername);
            localStorage.setItem('chat:username', nextUsername);
        }
        const roomParam = new URLSearchParams(window.location.search).get('room');
        if (roomParam && roomParam.trim()) {
            const normalizedRoom = roomParam.trim().toLowerCase();
            setRoomId(normalizedRoom);
            localStorage.setItem('chat:room', normalizedRoom);
        } else {
            const savedRoom = localStorage.getItem('chat:room');
            if (savedRoom && savedRoom.trim()) {
                setRoomId(savedRoom.trim().toLowerCase());
            } else {
                setRoomId('geral');
                localStorage.setItem('chat:room', 'geral');
            }
        }

        socket.on('connect', () => console.log('Connected to server'));
        socket.on('chat:me', ({ socketId }) => {
            setMySocketId(socketId);
        });
        socket.on('chat:history', (history) => {
            updateMessages(history);
            setTypingUsers([]);
        });
        socket.on('chat:online', ({ count }) => {
            setOnlineCount(count);
        });
        socket.on('chat:message', (payload) => {
            updateMessages((currentMessages) => [...currentMessages, payload]);
        });
        socket.on('chat:typing', ({ senderId, username: typingUsername, isTyping }) => {
            if (senderId === mySocketId) {
                return;
            }

            setTypingUsers((currentUsers) => {
                if (isTyping) {
                    if (currentUsers.includes(typingUsername)) {
                        return currentUsers;
                    }

                    return [...currentUsers, typingUsername];
                }

                return currentUsers.filter((currentUsername) => currentUsername !== typingUsername);
            });
        });

        return () => {
            socket.off('connect');
            socket.off('chat:me');
            socket.off('chat:history');
            socket.off('chat:online');
            socket.off('chat:message');
            socket.off('chat:typing');
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [mySocketId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!username || !roomId) {
            return;
        }

        const url = new URL(window.location.href);
        url.searchParams.set('room', roomId);
        window.history.replaceState({}, '', url);
        socket.emit('chat:room:join', { roomId, username });
        socket.emit('chat:user:set', { username });
    }, [username, roomId]);

    const handleCopyRoomLink = async () => {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('room', roomId);
            await navigator.clipboard.writeText(url.toString());
            setCopyStatus('Link copiado!');
        } catch (error) {
            setCopyStatus('Nao foi possivel copiar o link');
        }

        setTimeout(() => {
            setCopyStatus('');
        }, 1800);
    };

    const handleFormSubmit = (event) => {
        event.preventDefault();
        if (message.trim()) {
            socket.emit('chat:message', {
                id: uuidv4(),
                message,
                username,
            });
            socket.emit('chat:typing', { isTyping: false });
            updateMessage('');
        }
    };

    const handleInputChange = (event) => {
        updateMessage(event.target.value);
        socket.emit('chat:typing', { isTyping: true });
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('chat:typing', { isTyping: false });
        }, 1200);
    };

    const handleStartUsernameEdit = () => {
        setEditingUsername(username);
        setIsEditingUsername(true);
    };

    const handleSaveUsername = () => {
        const nextUsername = editingUsername.trim() || 'Anônimo';
        setUsername(nextUsername);
        localStorage.setItem('chat:username', nextUsername);
        setIsEditingUsername(false);
    };

    const handleCancelUsernameEdit = () => {
        setEditingUsername(username);
        setIsEditingUsername(false);
    };

    const handleStartRoomEdit = () => {
        setEditingRoomId(roomId);
        setIsEditingRoom(true);
    };

    const handleSaveRoom = () => {
        const nextRoom = (editingRoomId || 'geral').trim().toLowerCase() || 'geral';
        setRoomId(nextRoom);
        localStorage.setItem('chat:room', nextRoom);
        setIsEditingRoom(false);
    };

    const handleCancelRoomEdit = () => {
        setEditingRoomId(roomId);
        setIsEditingRoom(false);
    };

    const handleMessageKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleFormSubmit(event);
        }
    };

    const formatMessageTime = (timestamp) => {
        if (!timestamp) {
            return '';
        }

        return new Date(timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTypingText = () => {
        if (typingUsers.length === 1) {
            return `${typingUsers[0]} está digitando...`;
        }

        const lastUser = typingUsers[typingUsers.length - 1];
        const firstUsers = typingUsers.slice(0, -1);
        return `${firstUsers.join(', ')} e ${lastUser} estão digitando...`;
    };

    return (
        <main className='container'>
            <header className='chat-header'>
                <span className='chat-header__username'>
                    Sala: <strong>{roomId}</strong> | Logado como: <strong>{username}</strong> | Online: <strong>{onlineCount}</strong>
                </span>
                {isEditingUsername ? (
                    <div className='chat-header__actions'>
                        <input
                            className='chat-header__input'
                            onChange={(event) => setEditingUsername(event.target.value)}
                            value={editingUsername}
                        />
                        <button className='chat-header__button' onClick={handleSaveUsername} type='button'>
                            Salvar
                        </button>
                        <button className='chat-header__button chat-header__button--ghost' onClick={handleCancelUsernameEdit} type='button'>
                            Cancelar
                        </button>
                    </div>
                ) : (
                    <div className='chat-header__actions'>
                        {isEditingRoom ? (
                            <>
                                <input
                                    className='chat-header__input'
                                    onChange={(event) => setEditingRoomId(event.target.value)}
                                    value={editingRoomId}
                                />
                                <button className='chat-header__button' onClick={handleSaveRoom} type='button'>
                                    Entrar
                                </button>
                                <button className='chat-header__button chat-header__button--ghost' onClick={handleCancelRoomEdit} type='button'>
                                    Cancelar
                                </button>
                            </>
                        ) : (
                            <button className='chat-header__button' onClick={handleStartRoomEdit} type='button'>
                                Trocar sala
                            </button>
                        )}
                        <button className='chat-header__button' onClick={handleCopyRoomLink} type='button'>
                            Copiar link
                        </button>
                        <button className='chat-header__button' onClick={handleStartUsernameEdit} type='button'>
                            Trocar nome
                        </button>
                    </div>
                )}
            </header>
            {copyStatus && <div className='chat-status'>{copyStatus}</div>}
            <ul className='list'>
                {messages.map((m) => {
                    if (m.type === 'system') {
                        return (
                            <li className='list__item list__item--system' key={m.id}>
                                <span className='message message--system'>
                                    {m.message}
                                    <small className='message__time'>{formatMessageTime(m.createdAt)}</small>
                                </span>
                            </li>
                        );
                    }

                    const isMine = m.senderId === mySocketId;
                    return (
                    <li
                        className={`list__item ${isMine ? 'list__item--mine' : 'list__item--other'}`}
                        key={m.id}
                    >
                        <span className={`message ${isMine ? 'message--mine' : 'message--other'}`}>
                            <strong>{isMine ? 'Você' : m.username}: </strong>
                            {m.message}
                            <small className='message__time'>{formatMessageTime(m.createdAt)}</small>
                        </span>
                    </li>
                    );
                })}
                <li ref={messagesEndRef} />
            </ul>
            {typingUsers.length > 0 && (
                <div className='typing-indicator'>
                    {getTypingText()}
                </div>
            )}
            <form className='form' onSubmit={handleFormSubmit}>
                <textarea className='form__field'
                    onChange={handleInputChange}
                    onKeyDown={handleMessageKeyDown}
                    placeholder='Digite sua mensagem aqui...'
                    value={message}
                />
            </form>
        </main>

    );
};

export default Chat;