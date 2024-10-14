const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const PORT = process.env.PORT || 5000;
const wss = new WebSocket.Server({ port: PORT });
const clients = {};

wss.on("connection", (ws, req) => {
    try {
        console.log("Client connected");

        // Få boardId och jwtToken från URL
        const urlParams = new URLSearchParams(req.url.slice(1));
        const boardId = urlParams.get("boardId");
        const jwtToken = urlParams.get("jwtToken");

        // Ge error om boardId eller jwtToken saknas
        if (!boardId || !jwtToken) {
            ws.send(JSON.stringify({
                status: 1,
                msg: "ERROR: Missing boardId or jwtToken."
            }));
            ws.close();
            return;
        }

        // Validera JWT
        const userData = jwt.verify(jwtToken, process.env.JWT_SECRET);
        console.log(`JWT authorized for user: ${userData.sub} (${userData.name})`);

        if (!clients[boardId]) {
            clients[boardId] = new Set();
        }

        clients[boardId].add(ws);
        console.log(`Client connected with boardId: ${boardId}. Client count for this board: ${clients[boardId].size}`);

        // Hantera inkommande meddelanden från klienten
        ws.on("message", (message) => {
            const data = JSON.parse(message);

            if (!data.type || !data.note) {
                ws.send(JSON.stringify({
                    status: 1,
                    msg: "ERROR: Missing type or note in the message."
                }));
                return;
            }

            // Skicka meddelande till klienten
            if (clients[boardId]) {
                clients[boardId].forEach(client => {
                    if (client !== ws) {
                        client.send(JSON.stringify({
                            status: 0,
                            type: data.type,  // "create", "update", "delete"
                            note: data.note   // Hela note objektet
                        }));
                    }
                });
            }
        });

        ws.on("close", () => {
            console.log("Client disconnected");
            clients[boardId].delete(ws); // Ta bort klienten från listan
        });

    } catch (err) {
        console.error("Error during connection or message handling:", err);
        ws.send(JSON.stringify({
            status: 1,
            msg: "ERROR: Connection or message handling failed."
        }));
        ws.close();
    }
});

console.log(`WebSocket server is running on ws://localhost:${PORT}`);
