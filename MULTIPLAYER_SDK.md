# Bruce Engine Multiplayer SDK Documentation

## Overview

Bruce Engine includes a custom co-op multiplayer SDK that enables multiple devices on the same network to play multiplayer games together. The SDK provides real-time player synchronization, game state synchronization, and session management.

## Features

- **Host/Client Architecture**: One device hosts the game, others join as clients
- **Real-time Position Sync**: Player movements are synchronized across all devices
- **Game Event Sync**: Coin collection, player damage, and other events are broadcast
- **Session Management**: Create, join, and manage multiplayer sessions
- **Chat Support**: Built-in chat functionality for player communication
- **Auto Discovery**: Network discovery for finding available games

## Getting Started

### Menu Options

From the main menu, select "Multiplayer" (option 5) to access multiplayer features:

1. **Host Game** - Start a new multiplayer session as host
2. **Join Game** - Connect to an existing game by IP address
3. **Start Co-op** - Begin a co-op game with connected players
4. **Back** - Return to main menu

## API Reference

### Starting a Multiplayer Session

```javascript
// Host a new game
BruceEngine.hostMultiplayerGame();

// Join an existing game
BruceEngine.joinMultiplayerGame(ip, port);
```

### Session Management

```javascript
// Check if running as host
BruceEngine.isMultiplayerHost();

// Check if running as client
BruceEngine.isMultiplayerClient();

// Get local player ID
var playerId = BruceEngine.getLocalPlayerId();

// Get all connected players
var players = BruceEngine.getMultiplayerPlayers();

// Leave the current session
BruceEngine.leaveMultiplayerSession();
```

### Broadcasting Events

```javascript
// Broadcast a custom event to all players
BruceEngine.broadcastEvent("CUSTOM_EVENT", {
    data: "your data here"
});
```

### Message Types

The SDK supports the following message types:

| Message Type | Description | Fields |
|-------------|-------------|--------|
| `PLAYER_JOINED` | Player joined the session | `playerId`, `playerName` |
| `PLAYER_LEFT` | Player left the session | `playerId` |
| `PLAYER_MOVE` | Player position update | `playerId`, `x`, `y`, `timestamp` |
| `GAME_START` | Game has started | `levelData`, `playerId` |
| `SYNC_STATE` | Game state synchronization | `player`, `events` |
| `COIN_COLLECTED` | Coin was collected | `x`, `y`, `coinId` |
| `PLAYER_DAMAGE` | Player took damage | `playerId`, `lives` |
| `CHAT` | Chat message | `sender`, `text` |
| `GAME_END` | Game ended | `reason` |

## Network Configuration

### Default Ports

- **Game Port**: 8765
- **Discovery Port**: 8766

### Connection

Devices must be on the same network (WiFi). The host creates an access point or connects to an existing network, and clients connect to the host's IP address.

## Architecture

### Host Responsibilities

- Maintains the authoritative game state
- Broadcasts state updates to all clients
- Handles player connections and disconnections
- Manages game events and synchronizes them

### Client Responsibilities

- Sends player input to the host
- Receives and renders state updates from host
- Displays other players' positions

### Synchronization

The SDK uses a tick-based synchronization system:
- Position updates are sent every 50ms
- Game events are broadcast immediately
- State synchronization happens at regular intervals

## Example: Custom Multiplayer Game

```javascript
// On the host
BruceEngine.hostMultiplayerGame();

// Wait for players to join, then start
BruceEngine.startMultiplayerMenu();

// Broadcast custom game events
BruceEngine.broadcastEvent("POWERUP_COLLECTED", {
    playerId: localPlayerId,
    powerupType: "SPEED_BOOST"
});

// On clients, handle the event
BruceEngine.handleMultiplayerMessage = function(message) {
    if (message.type === "POWERUP_COLLECTED") {
        // Apply powerup effect
        applySpeedBoost(message.playerId);
    }
};
```

## Troubleshooting

### Connection Issues

1. Ensure both devices are on the same network
2. Verify the host IP address is correct
3. Check that port 8765 is not blocked by firewall

### Sync Issues

1. High latency may cause visual lag
2. Position interpolation is handled automatically
3. Events are queued for reliable delivery

## Menu Controls

- **Arrow Keys**: Navigate menu options
- **OK/Enter**: Select option
- **Back**: Return to previous menu

### In-Game Controls

- **Arrow Keys**: Move player
- **Menu**: Open multiplayer game menu
- **Back**: Leave session

## ESP-NOW Multiplayer

ESP-NOW is a lightweight peer-to-peer wireless communication protocol developed by Espressif for ESP32 microcontrollers. It enables direct device-to-device communication without requiring WiFi infrastructure, offering lower latency and faster connection times than traditional WiFi multiplayer.

### Features

- **Direct Peer-to-Peer**: Devices communicate directly without access point
- **Low Latency**: Faster response times ideal for multiplayer gaming
- **Quick Pairing**: Simple pairing code system for easy device connection
- **No Network Required**: Works without WiFi network infrastructure
- **Energy Efficient**: Lower power consumption than WiFi
- **Broadcast Support**: Send to multiple peers simultaneously

### Getting Started with ESP-NOW

From the main menu, select "ESP-NOW Multiplayer" (option 6):

1. **Host ESP-NOW Game** - Start a new session as host
2. **Join ESP-NOW Game** - Connect to an existing game
3. **Pair Devices** - Manually pair with other devices
4. **Paired Devices** - View and manage paired devices
5. **ESP-NOW Status** - View connection statistics

### Hosting an ESP-NOW Game

```javascript
// Select "Host ESP-NOW Game" from menu
// A pairing code will be displayed
// Share this code with other players
// They can join using "Join ESP-NOW Game"
```

### Joining an ESP-NOW Game

```javascript
// Get the pairing code from the host
// Get the host's MAC address
// Select "Join ESP-NOW Game" from menu
// Enter the pairing code and MAC address
```

### Manual Device Pairing

For devices that don't support automatic pairing:

1. Both devices go to "Pair Devices" menu
2. Host starts pairing mode (30s or 60s timeout)
3. Guest enters host's MAC address and pairing code
4. Devices are now paired for future connections

### ESP-NOW API Reference

```javascript
// Initialize ESP-NOW
BruceEngine.initESPNOW();

// Get pairing information
var mac = BruceEngine.getMACAddress();
var code = BruceEngine.getPairingCode();

// Send data to a peer
BruceEngine.sendToPeer(macAddress, {
    type: "CUSTOM_MESSAGE",
    data: "your data"
});

// Broadcast to all paired peers
BruceEngine.broadcast({
    type: "GAME_EVENT",
    event: "powerup_collected"
});

// Get paired devices list
var peers = BruceEngine.getPairedPeers();

// Remove a paired device
BruceEngine.removePeer(macAddress);

// Get connection statistics
var stats = BruceEngine.getStats();
// Returns: { txSuccess, txFailed, rxCount, peerCount, connectionState }
```

### Pairing Code System

Each device generates a random 6-character pairing code when hosting:

- Codes use characters: `A-Z`, `2-9` (excluding confusing characters)
- Codes are case-insensitive
- Default pairing timeout: 30 seconds (configurable to 60s)
- After pairing, devices remember each other by MAC address

### MAC Address Format

ESP-NOW uses 6-byte MAC addresses in colon-separated hex format:

```
AA:BB:CC:DD:EE:FF
```

Example MAC addresses:
- `AA:BB:CC:DD:EE:FF`
- `00:11:22:33:44:55`

### Connection States

| State | Description |
|-------|-------------|
| `disconnected` | ESP-NOW not initialized |
| `initialized` | ESP-NOW ready but not connected |
| `pairing` | Waiting for pairing requests |
| `connected` | At least one peer connected |
| `ready` | Full multiplayer session active |

### Message Types

ESP-NOW multiplayer supports the same message types as WiFi multiplayer:

| Message Type | Description | Fields |
|-------------|-------------|--------|
| `PLAYER_JOINED` | Player joined session | `playerId`, `playerName` |
| `PLAYER_LEFT` | Player left session | `playerId` |
| `PLAYER_MOVE` | Position update | `playerId`, `x`, `y` |
| `GAME_START` | Game starting | `levelData` |
| `SYNC_STATE` | State synchronization | `player`, `events` |
| `CHAT` | Chat message | `sender`, `text` |
| `HEARTBEAT` | Keep-alive ping | `timestamp` |

### Latency Comparison

| Protocol | Typical Latency | Use Case |
|----------|-----------------|----------|
| ESP-NOW | 1-5ms | Local multiplayer, fast response |
| WiFi UDP | 10-50ms | Network multiplayer |
| WiFi TCP | 20-100ms | Reliable but slower |

### Limitations

- Maximum 20 paired devices per device
- Maximum 10 active connections recommended
- Range: ~100m indoors, ~400m outdoors (line of sight)
- Payload limit: 250 bytes per packet
- Only works on ESP32/ESP8266 hardware
- Requires ESP-NOW support in device firmware

### Troubleshooting

#### Pairing Issues

1. Ensure both devices have ESP-NOW support
2. Verify pairing code matches exactly
3. Check devices are within range
4. Try manual pairing with MAC addresses
5. Restart pairing mode on both devices

#### Connection Issues

1. Check ESP-NOW status in menu
2. Verify peer is still in range
3. Restart ESP-NOW manager
4. Remove and re-pair the device

#### Performance Issues

1. Reduce message frequency
2. Use smaller payloads
3. Increase sync interval
4. Limit number of connected players

### Best Practices

1. **For Fast-Paced Games**: Use ESP-NOW with 20-30ms sync interval
2. **For Turn-Based Games**: Use longer sync intervals (100ms+)
3. **Payload Size**: Keep messages under 100 bytes for reliability
4. **Error Handling**: Implement message resend for critical events
5. **Player Count**: Maximum 6-8 players recommended for ESP-NOW

## Limitations

- Maximum 8 players recommended per session (WiFi)
- Maximum 10 players recommended per session (ESP-NOW)
- Requires UDP or HTTP network support (WiFi)
- ESP-NOW requires ESP32/ESP8266 hardware
- Performance depends on network quality
- Host device must remain connected
