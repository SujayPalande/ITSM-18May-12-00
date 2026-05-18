import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import session from 'express-session';
// @ts-ignore - cookie package doesn't have types
import cookie from 'cookie';

interface AuthenticatedWebSocket extends WebSocket {
    userId?: number;
    sessionId?: string;
    isAlive?: boolean;
}

interface WebSocketMessage {
    type: 'TICKET_UPDATED' | 'COMMENT_ADDED' | 'TICKET_CREATED' | 'TICKET_DELETED' | 'STATUS_CHANGED' | 'ASSIGNMENT_CHANGED';
    ticketId?: number;
    userId?: number;
    data: any;
    timestamp: string;
}

// Extend session data type for passport
declare module 'express-session' {
    interface SessionData {
        passport?: {
            user: number;
        };
    }
}

// Store active connections by userId
const connections = new Map<number, Set<AuthenticatedWebSocket>>();

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: HTTPServer, sessionStore: session.Store, sessionSecret: string) {
    wss = new WebSocketServer({
        server,
        path: '/ws',
        verifyClient: (info, callback) => {
            // Allow all connections for now, we'll authenticate after connection
            callback(true);
        }
    });

    wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
        console.log('WebSocket connection attempt');

        // Extract session from cookie
        const cookies = cookie.parse(req.headers.cookie || '');
        const sessionId = cookies['connect.sid']?.split('.')[0]?.substring(2); // Extract session ID

        if (!sessionId) {
            console.log('No session ID found, closing connection');
            ws.close(1008, 'Authentication required');
            return;
        }

        // Verify session
        sessionStore.get(sessionId, (err, session) => {
            if (err || !session || !session.passport?.user) {
                console.log('Invalid session, closing connection');
                ws.close(1008, 'Authentication failed');
                return;
            }

            const userId = session.passport.user;
            ws.userId = userId;
            ws.sessionId = sessionId;
            ws.isAlive = true;

            // Add to connections map
            if (!connections.has(userId)) {
                connections.set(userId, new Set());
            }
            connections.get(userId)!.add(ws);

            console.log(`WebSocket authenticated for user ${userId}. Total connections: ${getTotalConnections()}`);

            // Send welcome message
            ws.send(JSON.stringify({
                type: 'CONNECTED',
                data: { userId },
                timestamp: new Date().toISOString()
            }));

            // Handle incoming messages
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    handleClientMessage(ws, data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            });

            // Handle pong responses
            ws.on('pong', () => {
                ws.isAlive = true;
            });

            // Handle disconnection
            ws.on('close', () => {
                if (ws.userId) {
                    const userConnections = connections.get(ws.userId);
                    if (userConnections) {
                        userConnections.delete(ws);
                        if (userConnections.size === 0) {
                            connections.delete(ws.userId);
                        }
                    }
                    console.log(`WebSocket disconnected for user ${ws.userId}. Total connections: ${getTotalConnections()}`);
                }
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
        });
    });

    // Heartbeat mechanism - ping clients every 30 seconds
    const heartbeatInterval = setInterval(() => {
        wss?.clients.forEach((ws: WebSocket) => {
            const authWs = ws as AuthenticatedWebSocket;
            if (authWs.isAlive === false) {
                console.log('Terminating stale connection');
                return authWs.terminate();
            }

            authWs.isAlive = false;
            authWs.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(heartbeatInterval);
    });

    console.log('WebSocket server initialized on path /ws');
}

function handleClientMessage(ws: AuthenticatedWebSocket, message: any) {
    // Handle ping/pong
    if (message.type === 'PING') {
        ws.send(JSON.stringify({
            type: 'PONG',
            timestamp: new Date().toISOString()
        }));
    }
}

function getTotalConnections(): number {
    let total = 0;
    connections.forEach(set => total += set.size);
    return total;
}

// Broadcast functions

export function broadcastTicketUpdate(ticketId: number, data: any) {
    const message: WebSocketMessage = {
        type: 'TICKET_UPDATED',
        ticketId,
        data,
        timestamp: new Date().toISOString()
    };
    broadcastToAll(message);
    console.log(`Broadcasted TICKET_UPDATED for ticket ${ticketId} to ${getTotalConnections()} connections`);
}

export function broadcastCommentAdded(ticketId: number, comment: any) {
    const message: WebSocketMessage = {
        type: 'COMMENT_ADDED',
        ticketId,
        data: comment,
        timestamp: new Date().toISOString()
    };
    broadcastToAll(message);
    console.log(`Broadcasted COMMENT_ADDED for ticket ${ticketId} to ${getTotalConnections()} connections`);
}

export function broadcastTicketCreated(ticket: any) {
    const message: WebSocketMessage = {
        type: 'TICKET_CREATED',
        ticketId: ticket.id,
        data: ticket,
        timestamp: new Date().toISOString()
    };
    broadcastToAll(message);
    console.log(`Broadcasted TICKET_CREATED for ticket ${ticket.id} to ${getTotalConnections()} connections`);
}

export function broadcastTicketDeleted(ticketId: number) {
    const message: WebSocketMessage = {
        type: 'TICKET_DELETED',
        ticketId,
        data: { ticketId },
        timestamp: new Date().toISOString()
    };
    broadcastToAll(message);
    console.log(`Broadcasted TICKET_DELETED for ticket ${ticketId} to ${getTotalConnections()} connections`);
}

export function broadcastStatusChanged(ticketId: number, newStatus: string) {
    const message: WebSocketMessage = {
        type: 'STATUS_CHANGED',
        ticketId,
        data: { status: newStatus },
        timestamp: new Date().toISOString()
    };
    broadcastToAll(message);
    console.log(`Broadcasted STATUS_CHANGED for ticket ${ticketId} to ${getTotalConnections()} connections`);
}

export function broadcastAssignmentChanged(ticketId: number, assignedToId: number | null) {
    const message: WebSocketMessage = {
        type: 'ASSIGNMENT_CHANGED',
        ticketId,
        data: { assignedToId },
        timestamp: new Date().toISOString()
    };
    broadcastToAll(message);
    console.log(`Broadcasted ASSIGNMENT_CHANGED for ticket ${ticketId} to ${getTotalConnections()} connections`);
}

export function broadcastToUser(userId: number, message: WebSocketMessage) {
    const userConnections = connections.get(userId);
    if (userConnections) {
        const messageStr = JSON.stringify(message);
        userConnections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(messageStr);
            }
        });
    }
}

export function broadcastToAll(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    connections.forEach((userConnections) => {
        userConnections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(messageStr);
            }
        });
    });
}

export function getConnectionCount(): number {
    return getTotalConnections();
}
