// script.js
document.getElementById("playButton").addEventListener("click", startQueue);
document.getElementById("leftArrow").addEventListener("click", () => changeCharacter(-1));
document.getElementById("rightArrow").addEventListener("click", () => changeCharacter(1));

let selectedCharacterIndex = 0;

function changeCharacter(direction) {
    selectedCharacterIndex = (selectedCharacterIndex + direction + getTotalCharacters()) % getTotalCharacters();
    updateCharacterDisplay();
}

function updateCharacterDisplay() {
    const character = getCharacter(selectedCharacterIndex);
    document.getElementById("characterImage").src = character.img;
    document.getElementById("characterStats").textContent = `
        Name: ${character.name}
        Health: ${character.stats.health}
        Attack: ${character.stats.attack}
        Special: ${character.stats.special}
    `;
}

function startQueue() {
    document.getElementById("loadingScreen").classList.remove("hidden");

    ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
        console.log("Connected to the server.");
        document.getElementById("home").classList.add("hidden");
        ws.send(JSON.stringify({ action: "join_queue", character: selectedCharacterIndex }));
    };

    ws.onmessage = (message) => {
        const data = JSON.parse(message.data);

        if (data.action === "waiting") {
            console.log("Waiting for an opponent...");
        } else if (data.action === "match_found") {
            console.log("Match found!");

            const playerCharacterIndex = selectedCharacterIndex;
            const opponentCharacterIndex = data.opponentCharacterIndex;
            const playerId = data.playerId;
            const opponentId = data.opponentId;

            console.log(`Redirecting to match screen with playerCharacterIndex: ${playerCharacterIndex}, opponentCharacterIndex: ${opponentCharacterIndex}, playerId: ${playerId}, opponentId: ${opponentId}`);

            // Include playerId and opponentId in the URL
            window.location.href = `match.html?playerCharacterIndex=${playerCharacterIndex}&opponentCharacterIndex=${opponentCharacterIndex}&playerId=${playerId}&opponentId=${opponentId}`;
        }
    };

    ws.onclose = () => {
        console.log("Disconnected from server.");
    };
}

// Initialize display
updateCharacterDisplay();
