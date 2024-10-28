const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 8080;

app.use(express.static(path.join(__dirname)));

const server = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

let players = {}; // Store players by their ID
let queue = [];

wss.on('connection', (ws) => {
    console.log("A new player connected.");

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (error) {
            console.error("Received invalid JSON:", message);
            return;
        }

        if (data.action === "join_queue") {
            const playerId = uuidv4();
            ws.id = playerId;
            ws.characterIndex = data.character;
            players[playerId] = ws;
            queue.push(ws);

            if (queue.length >= 2) {
                const player1 = queue.shift();
                const player2 = queue.shift();

                // Assign each other as opponents
                player1.opponentId = player2.id;
                player2.opponentId = player1.id;
                players[player1.id] = player1;
                players[player2.id] = player2;

                console.log("Match found between players:", player1.id, player2.id);

                // Notify player1
                player1.send(JSON.stringify({
                    action: "match_found",
                    playerCharacterIndex: player1.characterIndex,
                    opponentCharacterIndex: player2.characterIndex,
                    playerId: player1.id,
                    opponentId: player2.id
                }));

                // Notify player2
                player2.send(JSON.stringify({
                    action: "match_found",
                    playerCharacterIndex: player2.characterIndex,
                    opponentCharacterIndex: player1.characterIndex,
                    playerId: player2.id,
                    opponentId: player1.id
                }));
            } else {
                console.log("Waiting for another player to join the queue.");
                ws.send(JSON.stringify({ action: "waiting" }));
            }
        }

        if (data.action === "join_match") {
            console.log(`Player ${data.playerId} is joining the match`);
            ws.id = data.playerId;
            ws.opponentId = data.opponentId;
            players[ws.id] = ws;

            const opponentWs = players[ws.opponentId];
            if (opponentWs) {
                ws.opponent = opponentWs;
                opponentWs.opponent = ws;
                console.log(`Players connected: ${ws.id} vs ${opponentWs.id}`);
            } else {
                console.error(`Opponent ${ws.opponentId} not found`);
            }
        }

        // Handle movement and actions, broadcast to both players
        if (["move", "attack_glow", "damage_feedback"].includes(data.action)) {
            const opponentWs = players[ws.opponentId];
            if (opponentWs) {
                // Broadcast action to the opponent
                opponentWs.send(JSON.stringify(data));
            }

            // Also broadcast action to the initiating player's own client to ensure it stays synchronized
            ws.send(JSON.stringify(data));
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`A player disconnected: ${ws.id} (code: ${code}, reason: ${reason})`);
        if (ws.opponentId) {
            const opponentWs = players[ws.opponentId];
            if (opponentWs) {
                opponentWs.send(JSON.stringify({ action: "opponent_disconnected" }));
                console.log(`Notified opponent ${ws.opponentId} of disconnection`);
            }
        }
        delete players[ws.id];
        queue = queue.filter(player => player !== ws);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error on player ${ws.id}:`, error);
    });
});
