# ESP-NOW Integration for Bruce Engine

## Overview

ESP-NOW is a peer-to-peer wireless communication protocol developed by Espressif Systems for their ESP32 and ESP8266 microcontrollers. It enables direct device-to-device communication without requiring WiFi access points or network infrastructure, offering significantly lower latency and faster connection times than traditional WiFi multiplayer.

Bruce Engine includes full ESP-NOW integration, allowing multiple Bruce devices to play multiplayer games together with minimal latency and no network setup required.

## Why ESP-NOW?

### Advantages over WiFi Multiplayer

| Feature | ESP-NOW | WiFi UDP | WiFi TCP |
|---------|---------|----------|----------|
| Latency | 1-5ms | 10-50ms | 20-100ms |
| Setup Time | <1s | 2-5s | 2-5s |
| Power Usage | Low | Medium | High |
| Range (indoors) | ~100m | ~50m | ~50m |
| Range (outdoors) | ~400m | ~200m | ~200m |
| Infrastructure | None | WiFi Network | WiFi Network |

### Use Cases

- **Fast-Paced Games**: Fighting games, racing games, real-time multiplayer
- **Local Multiplayer**: Same room or nearby devices
- **Battery-Powered**: Remote controllers, portable devices
- **Quick Sessions**: Drop-in multiplayer without network configuration
- **Events**: Game nights, parties, demonstrations

## Getting Started

### Prerequisites

- ESP32 or ESP8266 based Bruce device
- Firmware with ESP-NOW support
- At least 2 Bruce devices for multiplayer

### Quick Start

1. Power on all Bruce devices
2. Navigate to main menu
3. Select **"ESP-NOW Multiplayer"** (option 6)
4. Choose **"Host ESP-NOW Game"** or **"Join ESP-NOW Game"**

## Menu Options

### Host ESP-NOW Game

Start a new ESP-NOW multiplayer session as the host.

**Steps:**
1. Select "Host ESP-NOW Game"
2. (Optional) Enter a custom device name
3. (Optional) Set the communication channel (default: 1)
4. Share the **pairing code** displayed on screen
5. Wait for players to join

**What happens:**
- Device generates a unique 6-character pairing code
- Device becomes the session host
- Host manages game state and synchronization
- Other players join using your pairing code

### Join ESP-NOW Game

Connect to an existing ESP-NOW session as a client.

**Steps:**
1. Select "Join ESP-NOW Game"
2. Enter the **pairing code** from the host
3. Enter the **host's MAC address**
4. Wait for connection confirmation

**Requirements:**
- Valid 6-character pairing code
- Host MAC address in format: `AA:BB:CC:DD:EE:FF`

### Pair Devices

Manage device pairing for future connections.

**Options:**
- **Start Pairing (30s)**: Enable pairing mode for 30 seconds
- **Start Pairing (60s)**: Enable pairing mode for 60 seconds
- **Stop Pairing**: Disable pairing mode immediately
- **Enter MAC Manually**: Pair by MAC address and pairing code

**After pairing:**
- Devices remember each other by MAC address
- Future connections don't require pairing codes
- View paired devices in "Paired Devices" menu

### Paired Devices

View and manage devices you've paired with.

**Options:**
- View list of paired devices with names and MAC addresses
- See last connection time for each device
- Remove paired devices

### ESP-NOW Status

View detailed connection and statistics information:

```
Connection: connected
MAC Address: AA:BB:CC:DD:EE:FF
Channel: 1

Paired Devices: 3

Statistics:
  TX Success: 1523
  TX Failed: 0
  RX Count: 2105
```

## Pairing Code System

### How It Works

Each Bruce device generates a random 6-character pairing code when hosting:

```
Valid Characters: A-Z, 2-9
Excluded: 0, 1, O, I (to avoid confusion)
Example: "A3K9MP"
```

### Automatic Pairing Flow

1. Host starts "Host ESP-NOW Game"
2. Host shares pairing code with players
3. Guest enters "Join ESP-NOW Game"
4. Guest enters pairing code + host MAC
5. Devices exchange connection info
6. Pairing successful - devices remember each other

### Manual Pairing Flow

For devices that can't use automatic pairing:

1. Host goes to "Pair Devices" > "Start Pairing (60s)"
2. Guest enters host's MAC address
3. Guest enters displayed pairing code
4. Pairing complete

### Remembered Devices

Once paired, devices store each other's MAC addresses:

- Future connections skip pairing code requirement
- View paired devices in "Paired Devices" menu
- Remove devices to forget their MAC address

## MAC Address

### Format

ESP-NOW uses 6-byte MAC addresses in hexadecimal:

```
AA:BB:CC:DD:EE:FF
```

Each byte is represented as two hex digits (00-FF), separated by colons.

### Finding Your MAC Address

**Option 1:** Check ESP-NOW Status menu
**Option 2:** Check device firmware/boot messages
**Option 3:** Use API: `BruceEngine.getMACAddress()`

### MAC Address Example

```
Valid:    AA:BB:CC:DD:EE:FF
Valid:    00:11:22:33:44:55
Invalid:  AA:BB:CC:DD:EE      (too short)
Invalid:  GG:HH:II:JJ:KK:LL   (not hex)
```

## API Reference

### Initialization

```javascript
// Initialize ESP-NOW manager
var result = BruceEngine.initESPNOW();

// Returns:
// {
//   success: true,
//   mac: "AA:BB:CC:DD:EE:FF",
//   pairingCode: "A3K9MP",
//   channel: 1
// }
```

### Connection Management

```javascript
// Get device MAC address
var mac = BruceEngine.getMACAddress();
// Returns: "AA:BB:CC:DD:EE:FF"

// Get current pairing code
var code = BruceEngine.getPairingCode();
// Returns: "A3K9MP"

// Start pairing mode (default 30s timeout)
var result = BruceEngine.startPairingMode();
// Returns: { success: true, pairingCode: "A3K9MP", timeout: 30000 }

// Start pairing with custom timeout (max 120s)
var result = BruceEngine.startPairingMode(60000);

// Stop pairing mode
BruceEngine.stopPairingMode();

// Get connection state
var state = BruceEngine.getConnectionState();
// Returns: "disconnected" | "initialized" | "pairing" | "connected" | "ready"

// Check if connected
var connected = BruceEngine.isConnected();
```

### Device Pairing

```javascript
// Pair with device using MAC and code
var result = BruceEngine.pairWithDevice("AA:BB:CC:DD:EE:FF", "A3K9MP");
// Returns: { success: true, peerMac: "AA:BB:CC:DD:EE:FF" }

// Get all paired devices
var peers = BruceEngine.getPairedPeers();
// Returns: [
//   { mac: "AA:BB:CC:DD:EE:FF", name: "Device1", pairedAt: 1234567890, lastSeen: 1234567900 },
//   { mac: "11:22:33:44:55:66", name: "Device2", pairedAt: 1234568000, lastSeen: 1234568500 }
// ]

// Get number of paired devices
var count = BruceEngine.getPeerCount();

// Remove a paired device
var removed = BruceEngine.removePeer("AA:BB:CC:DD:EE:FF");
// Returns: true

// Remove all paired devices
BruceEngine.removeAllPeers();
```

### Sending Messages

```javascript
// Send message to specific peer
var result = BruceEngine.sendToPeer("AA:BB:CC:DD:EE:FF", {
    type: "PLAYER_MOVE",
    playerId: 1,
    x: 100,
    y: 200
});
// Returns: { success: true, bytes: 45 }

// Broadcast to all peers
var result = BruceEngine.broadcast({
    type: "GAME_START",
    levelData: levelData
});
// Returns: true

// Send with priority (high/medium/low)
BruceEngine.sendToPeer(mac, data, "high");
```

### Statistics and Status

```javascript
// Get detailed statistics
var stats = BruceEngine.getStats();
// Returns: {
//   txSuccess: 1523,
//   txFailed: 0,
//   rxCount: 2105,
//   peerCount: 3,
//   isInitialized: true,
//   connectionState: "connected",
//   channel: 1
// }

// Cleanup and disconnect
BruceEngine.cleanup();
```

### Multiplayer Game Integration

```javascript
// Check if running as ESP-NOW host
BruceEngine.isESPMultiplayerHost();

// Check if running as ESP-NOW client
BruceEngine.isESPMultiplayerClient();

// Get local player ID
var playerId = BruceEngine.getLocalPlayerId();

// Broadcast custom event
BruceEngine.broadcastESPEvent("POWERUP_COLLECTED", {
    playerId: localPlayerId,
    powerupType: "SPEED_BOOST"
});

// Get all connected players
var players = BruceEngine.getESPPlayers();
// Returns: { "AA:BB:CC:DD:EE:FF": { id: 1, name: "Player1", x: 100, y: 200 }, ... }

// Leave multiplayer session
BruceEngine.leaveESPMultiplayerSession();
```

## Message Types

### Standard Messages

```javascript
// Player joined the session
{
    type: "PLAYER_JOINED",
    playerId: 1234,
    playerName: "Player 1234",
    mac: "AA:BB:CC:DD:EE:FF"
}

// Player left the session
{
    type: "PLAYER_LEFT",
    playerId: 1234,
    mac: "AA:BB:CC:DD:EE:FF"
}

// Player position update
{
    type: "PLAYER_MOVE",
    playerId: 1234,
    x: 100,
    y: 200,
    timestamp: 1234567890000
}

// Game is ready to start
{
    type: "GAME_READY",
    hostId: 1234,
    levelData: { ... }
}

// Game has started
{
    type: "GAME_START",
    levelData: { ... },
    playerId: 1234
}

// Game state synchronization
{
    type: "SYNC_STATE",
    player: { id: 1234, x: 100, y: 200 },
    events: [
        { type: "COIN_COLLECTED", x: 50, y: 75, coinId: 5 }
    ]
}

// Chat message
{
    type: "CHAT",
    sender: "Player 1234",
    text: "Hello everyone!"
}

// Keep-alive heartbeat
{
    type: "HEARTBEAT",
    timestamp: 1234567890000,
    mac: "AA:BB:CC:DD:EE:FF"
}
```

### Custom Messages

```javascript
// Send custom event type
BruceEngine.broadcastESPEvent("CUSTOM_EVENT", {
    customField: "value"
});

// Handle custom messages
BruceEngine.handleESPMultiplayerMessage = function(message) {
    if (message.type === "CUSTOM_EVENT") {
        // Process custom event
    }
};
```

## Performance Optimization

### Message Frequency

| Game Type | Recommended Interval | Max Players |
|-----------|---------------------|-------------|
| Fighting Game | 20ms | 2-4 |
| Platformer | 30ms | 4-6 |
| RPG | 50ms | 6-8 |
| Turn-Based | 100ms+ | 8-10 |

### Payload Size Guidelines

| Size | Reliability | Use Case |
|------|-------------|----------|
| < 50 bytes | Excellent | Position updates, inputs |
| 50-100 bytes | Good | Game events, state sync |
| 100-200 bytes | Good | Medium game states |
| 200-250 bytes | Moderate | Large data, use sparingly |

### Latency Compensation

For games requiring smooth player movement:

```javascript
// Enable latency compensation
BruceEngine.enableLatencyCompensation(50); // 50ms compensation

// Configure prediction
BruceEngine.setPredictionEnabled(true);

// Adjust interpolation
BruceEngine.setInterpolationAlpha(0.3);
```

### Bandwidth Management

```javascript
// Limit update rate per player
BruceEngine.setMaxUpdateRate(30); // 30 updates per second

// Enable adaptive quality
BruceEngine.setAdaptiveQuality(true);

// Monitor bandwidth usage
var stats = BruceEngine.getStats();
var bandwidthUsed = stats.bytesPerSecond;
```

## Troubleshooting

### Common Issues

#### Pairing Fails

**Problem:** Devices won't pair

**Solutions:**
1. Verify both devices are in pairing mode
2. Check pairing code matches exactly (case-insensitive)
3. Ensure devices are within range
4. Try manual pairing with MAC address
5. Restart pairing on both devices
6. Check for interference on current channel

#### Connection Drops

**Problem:** Connection is unstable

**Solutions:**
1. Move devices closer together
2. Change channel (less interference)
3. Remove and re-pair the device
4. Reduce number of simultaneous players
5. Check battery level (low power can cause drops)
6. Update firmware to latest version

#### High Latency

**Problem:** Lag during gameplay

**Solutions:**
1. Reduce distance between devices
2. Remove obstacles between devices
3. Switch to less crowded channel
4. Reduce message frequency
5. Limit number of active players
6. Use smaller payload sizes

#### Messages Not Received

**Problem:** Messages appear to send but not receive

**Solutions:**
1. Verify peer is still in range
2. Check connection state is "connected"
3. Ensure message isn't exceeding 250 byte limit
4. Test with simple heartbeat messages
5. Verify receive callback is set
6. Check for MAC address changes

### Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "ESP-NOW not available" | Hardware/driver missing | Use ESP32 device with ESP-NOW firmware |
| "Invalid MAC address" | MAC format incorrect | Use format AA:BB:CC:DD:EE:FF |
| "Invalid pairing code" | Code wrong length/format | 6 characters, A-Z, 2-9 |
| "Send failed" | Message couldn't send | Verify connection, retry |
| "Timeout" | Operation timed out | Increase timeout, check range |

### Debug Mode

Enable debug logging for troubleshooting:

```javascript
BruceEngine.setDebugMode(true);

// View logs
// Output includes:
// - All sent/received messages
// - Connection state changes
// - Pairing attempts
// - Error details
```

### Testing Tools

```javascript
// Test connection to peer
var ping = BruceEngine.pingPeer("AA:BB:CC:DD:EE:FF");
// Returns: { success: true, latency: 5 } in milliseconds

// Test broadcast
var result = BruceEngine.testBroadcast();
// Returns: { success: true, peersReceived: 3 }

// Measure bandwidth
var bandwidth = BruceEngine.measureBandwidth(10000);
// Measures for 10 seconds, returns stats
```

## Channel Selection

### Understanding Channels

ESP-NOW operates on WiFi channels (1-14 depending on region). Choose a channel with minimal interference.

### Best Practices

1. **Scan for interference** before selecting channel
2. **Use channel 1, 6, or 11** (non-overlapping in 2.4GHz)
3. **Avoid channels** used by nearby WiFi networks
4. **All devices must use same channel** to communicate

### Changing Channel

```javascript
// Set channel during initialization
BruceEngine.initESPNOW({ channel: 6 });

// Or change channel dynamically
BruceEngine.setChannel(6);
// All peers must also change channel
```

## Security Considerations

### Pairing Security

- Pairing codes are 6 random characters
- Codes expire after 30-60 seconds
- Devices remember paired MAC addresses
- No encryption in pairing mode (intentional for simplicity)

### Data Security

- ESP-NOW has no built-in encryption
- Sensitive data should be encrypted at application level
- Consider using application-level encryption for sensitive games

### MAC Address Privacy

- MAC addresses are visible to paired devices
- MAC addresses could be used to track devices
- Consider using random/rotating identifiers for privacy

## Platform Differences

### ESP32 vs ESP8266

| Feature | ESP32 | ESP8266 |
|---------|-------|---------|
| Max Peers | 20 | 10 |
| Encryption | Yes | No |
| Performance | Faster | Slower |
| Power Use | Higher | Lower |

### Simulation Mode

On devices without ESP-NOW hardware, the system runs in simulation mode:

```javascript
// In simulation mode:
// - All operations report success
// - No actual data is sent
// - Useful for testing game logic
// - Real ESP-NOW works on actual ESP32 hardware
```

## Examples

### Simple Two-Player Game

```javascript
// Host
BruceEngine.initESPNOW();
BruceEngine.startPairingMode(60000);
// Share code "X7K2MP" with player 2

// Player 2 (Guest)
BruceEngine.initESPNOW();
BruceEngine.pairWithDevice("AA:BB:CC:DD:EE:FF", "X7K2MP");

// Both can now send/receive messages
BruceEngine.sendToPeer(peerMAC, {
    type: "PLAYER_MOVE",
    x: player.x,
    y: player.y
});
```

### Four-Player Party Game

```javascript
// Host creates session
BruceEngine.initESPNOW({ channel: 6 });
BruceEngine.startPairingMode(60000);

// 3 guests pair using MAC and code
// Each guest pairs with host
// Host maintains list of 3 peers

// Broadcast game state to all
BruceEngine.broadcast({
    type: "SYNC_STATE",
    playerStates: playerStates,
    gameEvents: events
});

// Each player receives and renders
```

### Turn-Based Game

```javascript
// Lower frequency updates for turn-based
var syncInterval = 1000; // 1 second

// Send turn data when changed
BruceEngine.sendToPeer(hostMAC, {
    type: "TURN_DATA",
    playerId: localPlayerId,
    action: actionData
});

// Request state sync periodically
if (Date.now() - lastSync > syncInterval) {
    BruceEngine.sendToPeer(hostMAC, { type: "REQUEST_SYNC" });
}
```

### Real-Time Action Game

```javascript
// Higher frequency for real-time
var syncInterval = 20; // 20ms (50 updates/sec)

// Send player input immediately
BruceEngine.sendToPeer(hostMAC, {
    type: "INPUT",
    playerId: localPlayerId,
    input: {
        left: keyState.left,
        right: keyState.right,
        jump: keyState.jump
    }
}, "high"); // High priority

// Host broadcasts authoritative state
BruceEngine.broadcast({
    type: "GAME_STATE",
    entities: entityPositions,
    timestamp: Date.now()
}, "high");
```

## Technical Details

### Protocol Specifications

| Parameter | Value |
|-----------|-------|
| MAC Address | 6 bytes (48-bit) |
| Max Payload | 250 bytes |
| Max Peers | 20 (ESP32), 10 (ESP8266) |
| Data Rate | 1 Mbps |
| Frequency | 2.4 GHz |

### Message Format

Internal message format before transmission:

```
+------------------+------------------+------------------+
| Type (1 byte)    | Length (2 bytes) | Payload (N bytes)|
+------------------+------------------+------------------+
```

### Packet Structure

```
+------------------+------------------+------------------+
| Dest MAC (6)     | Src MAC (6)      | Data (N)         |
+------------------+------------------+------------------+
```

### Timing Characteristics

| Operation | Typical Time |
|-----------|--------------|
| Pairing | 100-500ms |
| Send (local) | <1ms |
| Send (peer) | 1-5ms |
| Broadcast | 5-15ms |

## Migration from WiFi Multiplayer

### Key Differences

| Aspect | WiFi Multiplayer | ESP-NOW |
|--------|------------------|---------|
| Setup | IP address, port | Pairing code, MAC |
| Latency | 10-50ms | 1-5ms |
| Range | Network dependent | 100-400m |
| Infrastructure | WiFi network | None |
| Max players | 8 | 10 |

### Code Migration Example

```javascript
// WiFi Multiplayer (old)
BruceEngine.hostMultiplayerGame();
BruceEngine.joinMultiplayerGame(ip, port);

// ESP-NOW Multiplayer (new)
BruceEngine.initESPNOW();
BruceEngine.startPairingMode();
BruceEngine.pairWithDevice(mac, code);

// Same API for sending
BruceEngine.broadcast({ type: "EVENT", data: ... });
BruceEngine.sendToPeer(peer, { type: "MOVE", ... });
```

### Hybrid Approach

Use both protocols in the same game:

```javascript
// Prefer ESP-NOW for local devices
if (peer.isESPNOW) {
    BruceEngine.sendToPeer(peer.mac, data, "high");
} else {
    BruceEngine.sendWiFi(peer.ip, data);
}
```

## FAQ

**Q: Can ESP-NOW work with non-ESP devices?**
A: No, ESP-NOW is specific to ESP32 and ESP8266 devices.

**Q: What's the maximum range?**
A: Up to 400m outdoors with line of sight, ~100m indoors.

**Q: Can I use ESP-NOW and WiFi simultaneously?**
A: Yes, ESP32 supports both at the same time.

**Q: Is encryption supported?**
A: ESP32 supports encrypted ESP-NOW; ESP8266 does not.

**Q: How many devices can connect?**
A: Up to 20 paired devices, 10 recommended for games.

**Q: Does ESP-NOW work through walls?**
A: Yes, but range is reduced. Concrete walls attenuate signal significantly.

**Q: Can I send files over ESP-NOW?**
A: Not efficiently. ESP-NOW is designed for small, frequent messages, not bulk transfers.

**Q: What's the battery impact?**
A: ESP-NOW uses less power than WiFi. For low-power applications, use deep sleep between messages.

**Q: Can devices connect while one is in deep sleep?**
A: No. Devices must be awake to receive pairing requests and messages.

**Q: Do MAC addresses change?**
A: Factory MAC addresses are fixed. Some applications use random MACs for privacy.

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Enable debug mode and review logs
3. Verify hardware compatibility
4. Check for firmware updates
5. Review example code for your use case

## Changelog

### Version 1.0

- Initial ESP-NOW implementation
- Pairing code system
- Broadcast support
- Statistics and monitoring
- Simulation mode for testing
- Full multiplayer integration
- Documentation and examples
