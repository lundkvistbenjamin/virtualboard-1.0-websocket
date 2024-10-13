const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const wss = new WebSocket.Server({ port: PORT });
const clients = {};

wss.on('connection', (ws, req) => {
    try {
        console.log('Client connected');

        // Extract boardId and jwtToken from the URL
        const urlParams = new URLSearchParams(req.url.slice(1));
        const boardId = urlParams.get('boardId');
        const jwtToken = urlParams.get('jwtToken');

        // Send error if boardId or jwtToken is missing
        if (!boardId || !jwtToken) {
            ws.send(JSON.stringify({
                status: 1,
                msg: 'ERROR: Missing boardId or jwtToken.'
            }));
            ws.close();
            return;
        }

        // Validate JWT
        const userData = jwt.verify(jwtToken, process.env.JWT_SECRET);
        console.log(`JWT authorized for user: ${userData.sub} (${userData.name})`);

        // Create a new set if clients[boardId] does not exist
        if (!clients[boardId]) {
            clients[boardId] = new Set();
        }

        // Add client to clients[boardId]
        clients[boardId].add(ws);
        console.log(`Client connected with boardId: ${boardId}. Client count for this board: ${clients[boardId].size}`);

        // Handle incoming messages from clients
        ws.on('message', (message) => {
            const data = JSON.parse(message);

            // Ensure the message contains the required fields
            if (!data.type || !data.note) {
                ws.send(JSON.stringify({
                    status: 1,
                    msg: 'ERROR: Missing type or note in the message.'
                }));
                return;
            }

            // Broadcast the message to other clients
            if (clients[boardId]) {
                clients[boardId].forEach(client => {
                    // Don't send the message back to the sender
                    if (client !== ws) {
                        client.send(JSON.stringify({
                            status: 0,
                            type: data.type,  // Pass the type (e.g., "create", "update", etc.)
                            note: data.note   // Pass the entire note object
                        }));
                    }
                });
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
            clients[boardId].delete(ws); // Remove the client from the board's clients set
        });

    } catch (err) {
        console.error('Error during connection or message handling:', err);
        ws.send(JSON.stringify({
            status: 1,
            msg: 'ERROR: Connection or message handling failed.'
        }));
        ws.close();
    }
});

console.log(`WebSocket server is running on ws://localhost:${PORT}`);
