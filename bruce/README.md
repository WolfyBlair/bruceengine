# Bruce Engine

A comprehensive game engine for the Bruce device with 2D gameplay, level editing, and 3D rendering capabilities.

## Features

- **2D Game Engine**: Entity management, collision detection, game loop
- **Level Editor**: Visual level editor with tile placement
- **Player System**: Controllable player character
- **Object Types**: Walls, coins, enemies, exits
- **3D Mode**: Full 3D rendering with cubes, pyramids, wireframe and filled modes
- **Save/Load**: Store levels to device storage

## Files

- `BruceEngine.js` - Complete merged game engine (single file containing all features)

## Quick Start

```javascript
var Bruce = require("BruceEngine");
Bruce.init();
Bruce.run();
```

## Main Menu Options

1. **Play Game** - Start playing the current level
2. **Level Editor** - Create and edit game levels
3. **Load Level** - Load a saved level
4. **3D Mode** - Launch 3D demo showcase
5. **About** - Show engine information
6. **Exit** - Exit the application

## 2D Game Engine API

### Initialization
```javascript
var Bruce = require("BruceEngine");
Bruce.init();
```

### Level Management
```javascript
var level = {
    name: "My Level",
    width: 16,
    height: 8,
    tileSize: 16,
    tiles: [[1,1,1...], [1,0,0...], ...]
};
Bruce.loadLevel(level);
```

### Entity Types
- Player (green) - Controllable character
- Wall (gray) - Solid obstacle
- Coin (yellow) - Collectible item
- Enemy (red) - Moving obstacle
- Exit (cyan) - Level completion point

## Level Editor Controls

- **Arrow Keys**: Move cursor
- **OK/Enter**: Place selected tile
- **BACK**: Cycle through tile types
- **MENU**: Open editor menu

### Editor Menu Options
- **Save Level**: Save current level to storage
- **Load Level**: Load a level from storage
- **New Level**: Create a new blank level
- **Toggle Grid**: Show/hide tile grid
- **Play Level**: Test the current level
- **Exit Editor**: Return to main menu

## 3D Mode API

### Initialization
```javascript
Bruce.start3DMode();
```

### Creating 3D Objects

#### Cube
```javascript
var cube = createCube(x, y, z, size, color);
cube.rotationSpeed = 1;
cube.rotationAxis = "y";
entities3D.push(cube);
```

#### Pyramid
```javascript
var pyramid = createPyramid(x, y, z, size, color);
pyramid.rotationSpeed = 0.8;
entities3D.push(pyramid);
```

#### Grid
```javascript
var grid = createGrid(size, spacing, color);
entities3D.push(grid);
```

### Rendering Modes
- **wireframe**: Line-only rendering
- **filled**: Shaded polygon rendering

### VR Split Screen Mode
VR Split Screen renders the 3D scene twice with offset cameras for stereoscopic vision:
```javascript
// VR mode renders left and right eye views side by side
// Left eye: offset camera -15 units
// Right eye: offset camera +15 units
```

### Camera Controls (in 3D Mode)
- **Arrow Left/Right**: Rotate camera yaw
- **Arrow Up/Down**: Rotate camera pitch
- **Back/Menu**: Exit 3D mode

## Requirements

- Bruce device with firmware supporting JavaScript interpreter
- ES5 syntax only (var, function, no arrow functions)
- Display module for graphics
- Keyboard module for input
- Storage module for saving levels
- Dialog module for UI
# bruceengine
