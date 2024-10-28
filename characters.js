const characters = [
    {
        name: "Warrior",
        img: "/Aekashic/Boss Abomination Aqua.png",
        stats: {
            health: 150,
            attack: 25,
            attackSpeed: 0.8, // Attack frequency in seconds
            movementSpeed: 18, // Pixels per key press or update cycle
            cooldown: 5, // Ultimate ability cooldown in seconds (for future use)
            attackRange: 150, // Attack range in pixels
            special: "Berserk Slash"
        }
    },
    {
        name: "Mage",
        img: "/Aekashic/Boss The Fallen.png",
        stats: {
            health: 100,
            attack: 35,
            attackSpeed: 1.2,
            movementSpeed: 20,
            cooldown: 8,
            attackRange: 180,
            special: "Fireball"
        }
    },
    {
        name: "Rogue",
        img: "/Aekashic/Boss Sun Goddess.png",
        stats: {
            health: 120,
            attack: 20,
            attackSpeed: 0.6,
            movementSpeed: 25,
            cooldown: 6,
            attackRange: 200,
            special: "Backstab"
        }
    }
];

function getCharacter(index) {
    return characters[index];
}

function getTotalCharacters() {
    return characters.length;
}
