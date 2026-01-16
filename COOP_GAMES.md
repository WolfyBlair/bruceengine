# Bruce Engine Co-op Game Examples

This document provides example co-op games built using the Bruce Engine CO-OP SDK.

## Quick Start

```javascript
var Bruce = require("BruceEngine");
Bruce.init();
Bruce.run();
```

From the main menu, select "Multiplayer" to access co-op features.

---

## Example 1: Cooperative Coin Collector

A simple co-op game where multiple players collect coins together.

### Complete Game Code

```javascript
var BruceEngine = require("BruceEngine");

function createCoopCoinGame() {
    BruceEngine.init();

    var level = {
        name: "Co-op Coin Rush",
        width: 20,
        height: 12,
        tileSize: 16,
        tiles: []
    };

    var row;
    for (var y = 0; y < level.height; y++) {
        row = [];
        for (var x = 0; x < level.width; x++) {
            if (y === 0 || y === level.height - 1 || x === 0 || x === level.width - 1) {
                row.push(1);
            } else if (Math.random() < 0.1) {
                row.push(1);
            } else if (Math.random() < 0.05) {
                row.push(3);
            } else {
                row.push(0);
            }
        }
        level.tiles.push(row);
    }
    level.tiles[1][1] = 2;

    return level;
}

function startCoopCoinGame() {
    var level = createCoopCoinGame();
    BruceEngine.loadLevel(level);

    BruceEngine.setMultiplayerCallback(function(event) {
        if (event.type === "COIN_COLLECTED") {
            handleRemoteCoinCollection(event.x, event.y, event.playerId);
        } else if (event.type === "PLAYER_DAMAGE") {
            updateRemotePlayerLives(event.playerId, event.lives);
        }
    });

    BruceEngine.startMultiplayerGameLoop();
}

function handleRemoteCoinCollection(x, y, playerId) {
    console.log("Player " + playerId + " collected coin at " + x + ", " + y);
}

function updateRemotePlayerLives(playerId, lives) {
    console.log("Player " + playerId + " lives: " + lives);
}
```

---

## Example 2: Co-op Dungeon Explorer

A more complex co-op game with multiple rooms and objectives.

```javascript
var BruceEngine = require("BruceEngine");

function createDungeonLevel() {
    return {
        name: "Dungeon of Doom",
        width: 32,
        height: 16,
        tileSize: 16,
        tiles: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,2,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,1,1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,1,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,3,3,1,0,0,0,0,1,3,3,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,3,3,1,0,0,0,0,1,3,3,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,5,5,5,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ]
    };
}

function startCoopDungeon() {
    var level = createDungeonLevel();
    BruceEngine.loadLevel(level);

    BruceEngine.startMultiplayerGame();

    var coopConfig = {
        sharedLives: true,
        shareScore: true,
        respawnDelay: 3000,
        requireAllPlayers: false
    };

    BruceEngine.configureCoop(coopConfig);
}
```

---

## Example 3: Competitive vs Co-op Mode

A game that supports both cooperative and competitive play.

```javascript
var BruceEngine = require("BruceEngine");

function createArenaLevel() {
    return {
        name: "Battle Arena",
        width: 24,
        height: 14,
        tileSize: 16,
        tiles: []
    };
}

function initArenaLevel(level) {
    for (var y = 0; y < level.height; y++) {
        level.tiles[y] = [];
        for (var x = 0; x < level.width; x++) {
            if (y === 0 || y === level.height - 1 || x === 0 || x === level.width - 1) {
                level.tiles[y][x] = 1;
            } else if (x % 4 === 0 && y % 2 === 0) {
                level.tiles[y][x] = 1;
            } else if (x === 6 && y === 6) {
                level.tiles[y][x] = 3;
            } else if (x === 17 && y === 6) {
                level.tiles[y][x] = 3;
            } else {
                level.tiles[y][x] = 0;
            }
        }
    }

    level.tiles[2][2] = 2;
    level.tiles[2][21] = 2;
}

function startVersusGame() {
    var level = createArenaLevel();
    initArenaLevel(level);
    BruceEngine.loadLevel(level);

    var gameMode = {
        type: "versus",
        teams: [
            { id: 0, name: "Team Red", color: "#FF0000" },
            { id: 1, name: "Team Blue", color: "#0000FF" }
        ],
        winCondition: "score",
        targetScore: 10,
        friendlyFire: true
    };

    BruceEngine.setGameMode(gameMode);
    BruceEngine.startMultiplayerGame();
}
```

---

## Example 4: Co-op Puzzle Game

A cooperative puzzle-solving game where players must work together.

```javascript
var BruceEngine = require("BruceEngine");

function createPuzzleLevel() {
    return {
        name: "Laser Puzzle",
        width: 16,
        height: 12,
        tileSize: 16,
        tiles: []
    };
}

function setupPuzzleElements(level) {
    var switches = [];
    var doors = [];
    var lasers = [];

    for (var y = 0; y < level.height; y++) {
        level.tiles[y] = [];
        for (var x = 0; x < level.width; x++) {
            if (y === 0 || y === level.height - 1 || x === 0 || x === level.width - 1) {
                level.tiles[y][x] = 1;
            } else if (x === 3 && y === 3) {
                level.tiles[y][x] = 7;
                switches.push({ x: x, y: y, id: "switch1", active: false });
            } else if (x === 12 && y === 3) {
                level.tiles[y][x] = 7;
                switches.push({ x: x, y: y, id: "switch2", active: false });
            } else if (x === 7 && y === 8) {
                level.tiles[y][x] = 8;
                doors.push({ x: x, y: y, id: "door1", open: false });
            } else if (level.tiles[y][x] === undefined) {
                level.tiles[y][x] = 0;
            }
        }
    }

    return { switches: switches, doors: doors, lasers: lasers };
}

function startCoopPuzzle() {
    var level = createPuzzleLevel();
    setupPuzzleElements(level);
    BruceEngine.loadLevel(level);

    var puzzleRules = {
        type: "cooperative",
        objective: "All players must reach the exit",
        requiredSwitches: ["switch1", "switch2"],
        doorId: "door1",
        exitTile: 5
    };

    BruceEngine.setPuzzleRules(puzzleRules);
    BruceEngine.startMultiplayerGame();

    BruceEngine.setMultiplayerCallback(function(event) {
        if (event.type === "SWITCH_ACTIVATED") {
            handleSwitchActivation(event.switchId, event.playerId);
        } else if (event.type === "DOOR_OPENED") {
            notifyDoorOpened(event.doorId);
        }
    });
}

function handleSwitchActivation(switchId, playerId) {
    console.log("Player " + playerId + " activated " + switchId);
}

function notifyDoorOpened(doorId) {
    console.log(doorId + " has been opened!");
}
```

---

## Example 5: Wave Defense Co-op

Survival-style co-op game where players defend against waves of enemies.

```javascript
var BruceEngine = require("BruceEngine");

function createDefenseLevel() {
    return {
        name: "Wave Defense",
        width: 20,
        height: 12,
        tileSize: 16,
        tiles: []
    };
}

function setupDefenseLevel(level) {
    for (var y = 0; y < level.height; y++) {
        level.tiles[y] = [];
        for (var x = 0; x < level.width; x++) {
            if (y === 0 || y === level.height - 1 || x === 0 || x === level.width - 1) {
                level.tiles[y][x] = 6;
            } else if (y === 1 && (x === 3 || x === 8 || x === 11 || x === 16)) {
                level.tiles[y][x] = 5;
            } else {
                level.tiles[y][x] = 0;
            }
        }
    }
}

function startWaveDefense() {
    var level = createDefenseLevel();
    setupDefenseLevel(level);
    BruceEngine.loadLevel(level);

    var defenseMode = {
        type: "wave_survival",
        waves: [
            { enemyCount: 5, enemyType: "basic", spawnInterval: 2000 },
            { enemyCount: 10, enemyType: "fast", spawnInterval: 1500 },
            { enemyCount: 15, enemyType: "tank", spawnInterval: 2500 }
        ],
        sharedLives: true,
        baseLives: 20,
        powerups: ["health", "speed", "damage"]
    };

    BruceEngine.setGameMode(defenseMode);
    BruceEngine.startMultiplayerGame();

    BruceEngine.setMultiplayerCallback(function(event) {
        if (event.type === "WAVE_STARTED") {
            announceWave(event.waveNumber, event.enemyCount);
        } else if (event.type === "BASE_DAMAGE") {
            handleBaseDamage(event.damage);
        } else if (event.type === "WAVE_COMPLETE") {
            celebrateWaveComplete();
        }
    });
}

function announceWave(waveNumber, enemyCount) {
    console.log("Wave " + waveNumber + "! " + enemyCount + " enemies incoming!");
}

function handleBaseDamage(damage) {
    console.log("Base took " + damage + " damage!");
}

function celebrateWaveComplete() {
    console.log("Wave complete! Get ready for the next one!");
}
```

---

## API Reference Summary

### Multiplayer Setup

```javascript
BruceEngine.hostMultiplayerGame();           // Host a new game
BruceEngine.joinMultiplayerGame(ip, port);   // Join existing game
BruceEngine.startMultiplayerGame();          // Start the game session
BruceEngine.leaveMultiplayerSession();       // Leave current session
```

### Player Management

```javascript
var playerId = BruceEngine.getLocalPlayerId();
var players = BruceEngine.getMultiplayerPlayers();
var isHost = BruceEngine.isMultiplayerHost();
var isClient = BruceEngine.isMultiplayerClient();
```

### Event Broadcasting

```javascript
BruceEngine.broadcastEvent("CUSTOM_EVENT", {
    data: "value"
});

BruceEngine.broadcastEvent("COIN_COLLECTED", {
    x: coinX,
    y: coinY,
    coinId: coinId
});

BruceEngine.broadcastEvent("PLAYER_DAMAGE", {
    playerId: playerId,
    lives: newLives
});
```

### Callbacks

```javascript
BruceEngine.setMultiplayerCallback(function(message) {
    if (message.type === "PLAYER_MOVE") {
        updateRemotePlayerPosition(message.playerId, message.x, message.y);
    } else if (message.type === "CHAT") {
        displayChatMessage(message.sender, message.text);
    }
});
```

### Game Modes

```javascript
var coopConfig = {
    sharedLives: true,
    shareScore: true,
    respawnDelay: 3000,
    requireAllPlayers: false
};
BruceEngine.configureCoop(coopConfig);
```

---

## Best Practices

1. **Position Sync Interval**: Default is 50ms. Adjust based on network conditions.
2. **Event Batching**: Group multiple events together when possible.
3. **Player Colors**: Use `generatePlayerColor()` for consistent player colors.
4. **Error Handling**: Always handle connection failures gracefully.
5. **Session Cleanup**: Always call `leaveMultiplayerSession()` when exiting.

---

## Troubleshooting

### Connection Issues
- Verify all devices are on the same network
- Check firewall settings for ports 8765 and 8766
- Ensure host IP address is correct

### Sync Issues
- High latency may cause visual lag
- Position interpolation is handled automatically
- Events are queued for reliable delivery

### Performance
- Maximum 8 players recommended
- Reduce sync interval for smoother gameplay
- Use local prediction for better responsiveness
