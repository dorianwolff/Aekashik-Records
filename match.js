let ws;
let playerPos, opponentPos;
let canAttack = true;
let playerHealthBar, opponentHealthBar;

document.addEventListener("DOMContentLoaded", () => {
    let playerCharacter = document.getElementById("playerCharacter");
    let opponentCharacter = document.getElementById("opponentCharacter");
    const playingField = document.querySelector(".playing-field");
    const viewport = document.querySelector(".viewport");

    const urlParams = new URLSearchParams(window.location.search);
    const playerCharacterIndex = parseInt(urlParams.get("playerCharacterIndex"));
    const opponentCharacterIndex = parseInt(urlParams.get("opponentCharacterIndex"));

    const playerId = urlParams.get("playerId");
    const opponentId = urlParams.get("opponentId");

    const playerChar = getCharacter(playerCharacterIndex);
    const opponentChar = getCharacter(opponentCharacterIndex);

    // Create health bars
    playerHealthBar = createHealthBar("green");
    opponentHealthBar = createHealthBar("blue");

    playingField.appendChild(playerHealthBar);
    playingField.appendChild(opponentHealthBar);

    // Set initial player positions
    if (playerCharacterIndex < opponentCharacterIndex) {
        playerPos = { x: 150, y: 150 };
        opponentPos = { x: 2850, y: 2850 };
        playerCharacter.style.transform = "scaleX(1)"; // Face right at start
    } else {
        playerPos = { x: 2850, y: 2850 };
        opponentPos = { x: 150, y: 150 };
        playerCharacter.style.transform = "scaleX(-1)"; // Face left at start
    }

    if (playerChar) {
        playerCharacter.src = playerChar.img;
        updateCharacterPosition(playerCharacter, playerPos);
    }

    if (opponentChar) {
        opponentCharacter.src = opponentChar.img;
        updateCharacterPosition(opponentCharacter, opponentPos);
    }

    ws = new WebSocket(`ws://localhost:8080`);

    ws.onopen = () => {
        console.log("Connected to the server.");
        ws.send(JSON.stringify({ action: "join_match", playerId, opponentId }));
    };

    ws.onclose = (event) => {
        console.log(`Disconnected from server. Code: ${event.code}, Reason: ${event.reason}`);
        alert("You have been disconnected from the server.");
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
    };

    ws.onmessage = (message) => {
        try {
            const data = JSON.parse(message.data);
            console.log("Received from server:", data);
            handleWebSocketMessage(data);
        } catch (error) {
            console.error("Failed to parse incoming message:", message.data, error);
        }
    };

    function handleWebSocketMessage(data) {
        if (data.action === "move") {
            if (data.playerId === opponentId) {
                // Update opponent's position
                opponentPos.x = data.x;
                opponentPos.y = data.y;
                updateCharacterPosition(opponentCharacter, opponentPos);

                // Correctly flip opponent character based on direction
                if (data.facing === "left") {
                    opponentCharacter.style.transform = "scaleX(1)"; // Face right
                } else if (data.facing === "right") {
                    opponentCharacter.style.transform = "scaleX(-1)"; // Face left
                }
            }
        }

        if (data.action === "attack_glow") {
            const targetCharacter = data.playerId === opponentId ? opponentCharacter : playerCharacter;
            triggerShockwave(targetCharacter, data.glowColor);
        }

        if (data.action === "damage_feedback" && data.playerId === playerId) {
            // If this message is sent from the opponent's ID, apply damage to the player
            applyDamageVisual(playerCharacter);
            updateHealthBar(playerHealthBar, data.damage, playerChar.stats.health);
        } else if (data.action === "damage_feedback" && data.playerId === opponentId) {
            // If this message is sent for the opponent, apply damage to opponent's health bar
            applyDamageVisual(opponentCharacter);
            updateHealthBar(opponentHealthBar, data.damage, opponentChar.stats.health);
        }
    }


    document.addEventListener("keydown", (e) => {
        const movementSpeed = playerChar.stats.movementSpeed;

        switch (e.key) {
            case "ArrowUp":
                if (playerPos.y > 0) {
                    playerPos.y -= movementSpeed;
                    ws.send(JSON.stringify({ action: "move", character: "player", playerId: playerId, x: playerPos.x, y: playerPos.y, facing: "up" }));
                }
                break;
            case "ArrowDown":
                if (playerPos.y < 3000 - 150) {
                    playerPos.y += movementSpeed;
                    ws.send(JSON.stringify({ action: "move", character: "player", playerId: playerId, x: playerPos.x, y: playerPos.y, facing: "down" }));
                }
                break;
            case "ArrowLeft":
                if (playerPos.x > 0) {
                    playerPos.x -= movementSpeed;
                    playerCharacter.style.transform = "scaleX(1)"; // Face right
                    ws.send(JSON.stringify({ action: "move", character: "player", playerId: playerId, x: playerPos.x, y: playerPos.y, facing: "left" }));
                }
                break;
            case "ArrowRight":
                if (playerPos.x < 3000 - 150) {
                    playerPos.x += movementSpeed;
                    playerCharacter.style.transform = "scaleX(-1)"; // Face left
                    ws.send(JSON.stringify({ action: "move", character: "player", playerId: playerId, x: playerPos.x, y: playerPos.y, facing: "right" }));
                }
                break;
            case " ":
                if (canAttack) {
                    performAttack(playerChar.stats);
                    canAttack = false;
                    setTimeout(() => { canAttack = true; }, playerChar.stats.attackSpeed * 1000);
                }
                break;
        }

        updateCharacterPosition(playerCharacter, playerPos);
        updateCamera();
    });

    function performAttack(stats) {
        // Show attack glow even if opponent is not in range
        triggerShockwave(playerCharacter, "green");
        ws.send(JSON.stringify({ action: "attack_glow", character: "player", playerId: playerId, glowColor: "green" }));

        // Check if opponent is within attack range
        const distance = Math.sqrt(Math.pow(opponentPos.x - playerPos.x, 2) + Math.pow(opponentPos.y - playerPos.y, 2));
        if (distance <= stats.attackRange) {
            // Broadcast damage to opponent
            ws.send(JSON.stringify({ action: "damage_feedback", character: "player", playerId: opponentId, damage: stats.attack, maxHealth: opponentChar.stats.health }));
        }
    }


    function triggerShockwave(characterElement, color) {
        const shockwave = document.createElement("div");
        shockwave.className = "shockwave";
        shockwave.style.background = color === "green" ? "rgba(0, 255, 0, 0.3)" : "rgba(0, 0, 255, 0.3)";
        characterElement.parentElement.appendChild(shockwave);
        shockwave.style.left = characterElement.style.left;
        shockwave.style.top = characterElement.style.top;

        setTimeout(() => {
            shockwave.remove();
        }, 500);
    }

    function updateHealthBar(healthBar, damage, maxHealth) {
        const currentWidth = parseFloat(healthBar.firstChild.style.width);
        const newWidth = Math.max(0, currentWidth - (damage / maxHealth) * 100);
        healthBar.firstChild.style.width = `${newWidth}%`;

        if (newWidth < 100) {
            healthBar.style.backgroundColor = "red"; // Change lost health section to red
            healthBar.firstChild.style.backgroundColor = healthBar.firstChild.style.backgroundColor;
        }
    }

    function createHealthBar(color) {
        const barContainer = document.createElement("div");
        barContainer.className = "health-bar-container";

        const bar = document.createElement("div");
        bar.className = "health-bar";
        bar.style.width = "100%";
        bar.style.backgroundColor = color;

        barContainer.appendChild(bar);
        return barContainer;
    }

    function applyDamageVisual(characterElement) {
        characterElement.style.filter = "brightness(0.5)";
        setTimeout(() => {
            characterElement.style.filter = "brightness(1)";
        }, 200);
    }

    function updateCharacterPosition(character, position) {
        character.style.left = `${position.x}px`;
        character.style.top = `${position.y}px`;

        const healthBar = character === playerCharacter ? playerHealthBar : opponentHealthBar;
        healthBar.style.left = `${position.x + 75}px`; // Adjust to align over character
        healthBar.style.top = `${position.y - 20}px`; // Adjust to be above the character
    }

    function updateCamera() {
        const viewportWidth = viewport.offsetWidth;
        const viewportHeight = viewport.offsetHeight;
        const centerX = playerPos.x - viewportWidth / 2 + 75;
        const centerY = playerPos.y - viewportHeight / 2 + 75;
        const maxScrollX = 3000 - viewportWidth;
        const maxScrollY = 3000 - viewportHeight;
        const scrollX = Math.max(0, Math.min(centerX, maxScrollX));
        const scrollY = Math.max(0, Math.min(centerY, maxScrollY));
        playingField.style.transform = `translate(${-scrollX}px, ${-scrollY}px)`;
    }

    updateCamera();
});