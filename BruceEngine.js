var BruceEngine = (function() {
    var displayModule = null;
    var keyboardModule = null;
    var dialogModule = null;
    var storageModule = null;

    var currentMode = "menu";
    var isRunning = false;
    var gameEngine = null;
    var levelEditor = null;
    var engine3D = null;
    var wifiController = null;
    var wifiServer = null;
    var wifiRunning = false;
    var apSSID = "BruceController";
    var apPassword = "password123";
    var apIP = "192.168.4.1";

    var multiplayerManager = null;
    var networkDiscovery = null;
    var isMultiplayerHost = false;
    var isMultiplayerClient = false;
    var multiplayerSession = null;
    var localPlayerId = null;
    var multiplayerPlayers = {};
    var syncQueue = [];
    var lastSyncTime = 0;
    var syncInterval = 50;

    var espNowManager = null;
    var espNowInitialized = false;
    var isESPMultiplayerHost = false;
    var isESPMultiplayerClient = false;
    var espLocalPlayerId = null;
    var espPeers = {};
    var espPairedDevices = [];
    var espPairingMode = false;
    var espPairingTimeout = null;
    var espLastReceiveTime = 0;
    var espSyncInterval = 30;
    var espLastSyncTime = 0;
    var espConnectionState = "disconnected";
    var espChannel = 1;
    var espBroadcastMAC = [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF];

    var bluetoothManager = null;
    var bluetoothInitialized = false;
    var btPendingPairing = null;
    var btPairingPin = null;
    var btWaitingForConfirmation = false;
    var btControllerManager = null;
    var btPairedControllers = [];
    var btActiveController = null;
    var btControllerState = {};
    var btButtonMapping = {};
    var btDefaultMapping = {
        "A": "fire",
        "B": "jump",
        "X": "special",
        "Y": "menu",
        "UP": "up",
        "DOWN": "down",
        "LEFT": "left",
        "RIGHT": "right",
        "START": "start",
        "SELECT": "select",
        "L1": "shoulder_left",
        "R1": "shoulder_right",
        "L2": "trigger_left",
        "R2": "trigger_right"
    };

    var vrSession = null;
    var vrNetworkManager = null;
    var vrAvatarManager = null;
    var vrInputManager = null;
    var vrSpatialAudio = null;
    var vrPerformanceManager = null;
    var isVRSession = false;
    var vrSessionConfig = null;
    var localVRPlayerId = null;
    var vrPeers = {};
    var vrHeadPose = null;
    var vrControllers = {};
    var vrRenderingMode = "monoscopic";
    var vrFrameInterval = 11;
    var lastVRFrameTime = 0;
    var vrInterpolationBuffer = {};
    var vrPredictionEnabled = true;
    var vrLatencyCompensation = 50;
    var vrBandwidthLimit = 1000000;
    var vrQualityLevel = "high";
    var vrAvatarLOD = 2;
    var vrUpdateRates = {
        headTracking: 90,
        controllerTracking: 60,
        avatarUpdate: 45,
        worldSync: 20
    };

    var tileSize = 16;
    var screenWidth = 128;
    var screenHeight = 64;

    var entities = [];
    var currentLevel = null;
    var camera = { x: 0, y: 0 };
    var score = 0;
    var lives = 3;

    var screenBuffer = null;
    var screenBufferDirty = false;
    
    var entities3D = [];
    var camera3D = null;
    var projection = null;
    var current3DMode = "wireframe";

    var currentTool = "wall";
    var selectedTileType = 1;
    var isEditing = false;
    var cursorX = 0;
    var cursorY = 0;
    var levelWidth = 16;
    var levelHeight = 8;
    var showGrid = true;
    var currentTileIndex = 1;

    var tileTypes = [
        { id: 0, name: "Empty", color: null },
        { id: 1, name: "Wall", color: null },
        { id: 2, name: "Player", color: null },
        { id: 3, name: "Coin", color: null },
        { id: 4, name: "Enemy", color: null },
        { id: 5, name: "Exit", color: null },
        { id: 6, name: "Platform", color: null }
    ];

    function init() {
        displayModule = require("display");
        keyboardModule = require("keyboard");
        dialogModule = require("dialog");
        storageModule = require("storage");

        screenWidth = displayModule.width();
        screenHeight = displayModule.height();
        initScreenBuffer();

        var i;
        for (i = 0; i < tileTypes.length; i++) {
            tileTypes[i].color = displayModule.color(
                (i * 40) % 255,
                (i * 80) % 255,
                (i * 120) % 255
            );
        }

        camera3D = {
            x: 0,
            y: 0,
            z: -500,
            pitch: 0,
            yaw: 0,
            roll: 0
        };
        projection = {
            fov: 256,
            aspectRatio: 2
        };

        displayModule.fill(displayModule.color(0, 0, 0));
        displayModule.display();
        
        displayModule = createTrackedDisplay(displayModule);
    }
    
    function createTrackedDisplay(realDisplay) {
        return {
            width: function() { return realDisplay.width(); },
            height: function() { return realDisplay.height(); },
            color: function(r, g, b) { return realDisplay.color(r, g, b); },
            fill: function(color) {
                realDisplay.fill(color);
                fillScreenBuffer(color);
            },
            setCursor: function(x, y) { realDisplay.setCursor(x, y); },
            setTextSize: function(size) { realDisplay.setTextSize(size); },
            setTextAlign: function(h, v) { realDisplay.setTextAlign(h, v); },
            setTextColor: function(color) { realDisplay.setTextColor(color); },
            drawText: function(text, x, y) {
                realDisplay.drawText(text, x, y);
            },
            drawFillRect: function(x, y, w, h, color) {
                realDisplay.drawFillRect(x, y, w, h, color);
                drawRectToBuffer(x, y, w, h, color, true);
            },
            drawRect: function(x, y, w, h, color) {
                realDisplay.drawRect(x, y, w, h, color);
                drawRectToBuffer(x, y, w, h, color, false);
            },
            drawPixel: function(x, y, color) {
                realDisplay.drawPixel(x, y, color);
                setScreenBufferPixel(x, y, color);
            },
            drawLine: function(x0, y0, x1, y1, color) {
                realDisplay.drawLine(x0, y0, x1, y1, color);
                var dx = Math.abs(x1 - x0);
                var dy = Math.abs(y1 - y0);
                var sx = x0 < x1 ? 1 : -1;
                var sy = y0 < y1 ? 1 : -1;
                var err = dx - dy;
                var x = x0, y = y0;
                while (true) {
                    setScreenBufferPixel(x, y, color);
                    if (x === x1 && y === y1) break;
                    var e2 = 2 * err;
                    if (e2 > -dy) { err -= dy; x += sx; }
                    if (e2 < dx) { err += dx; y += sy; }
                }
            },
            drawCircle: function(cx, cy, r, color) {
                realDisplay.drawCircle(cx, cy, r, color);
                drawCircleToBuffer(cx, cy, r, color, false);
            },
            drawFillCircle: function(cx, cy, r, color) {
                realDisplay.drawFillCircle(cx, cy, r, color);
                drawCircleToBuffer(cx, cy, r, color, true);
            },
            display: function() { realDisplay.display(); }
        };
    }

    function run() {
        isRunning = true;
        mainMenu();
    }

    function stop() {
        isRunning = false;
    }

    function getMode() {
        return currentMode;
    }

    function mainMenu() {
        var running = true;
        while (running) {
            displayModule.fill(displayModule.color(0, 0, 0));
            clearScreenBuffer();

            displayModule.setTextSize(2);
            displayModule.setTextAlign("center", "middle");
            displayModule.drawText("Bruce Engine", screenWidth / 2, 15);

            displayModule.setTextSize(1);
            var menuOptions = [
                ["Play Game", "play"],
                ["Level Editor", "editor"],
                ["Load Level", "load"],
                ["3D Mode", "3d"],
                ["Multiplayer", "multiplayer"],
                ["ESP-NOW Multiplayer", "esp_multiplayer"],
                ["VR Multiplayer", "vr_multiplayer"],
                ["WiFi Control", "wifi"],
                ["Bluetooth", "bluetooth"],
                ["About", "about"],
                ["Exit", "exit"]
            ];

            var y = 35;
            var i;
            for (i = 0; i < menuOptions.length; i++) {
                displayModule.drawText((i + 1) + ". " + menuOptions[i][0], 64, y);
                y += 10;
            }

            displayModule.display();

            var key = keyboardModule.getKeyPress();
            if (key === "1") {
                startPlayMode();
            } else if (key === "2") {
                startLevelEditor();
            } else if (key === "3") {
                loadAndPlayLevel();
            } else if (key === "4") {
                start3DMode();
            } else if (key === "5") {
                startMultiplayerMenu();
            } else if (key === "6") {
                startESPMultiplayerMenu();
            } else if (key === "7") {
                startVRMultiplayerMenu();
            } else if (key === "8") {
                startWifiControl();
            } else if (key === "9") {
                startBluetoothMenu();
            } else if (key === "0") {
                showAbout();
            } else if (key === "back") {
                if (wifiRunning) {
                    stopWifiControl();
                }
                running = false;
            }

            delay(100);
        }
    }

    function startPlayMode() {
        var levelData = currentLevel;
        if (!levelData) {
            levelData = createDefaultLevel();
        }

        loadLevel(levelData);
        currentMode = "play";
        gameLoop();
    }

    function startLevelEditor() {
        if (!currentLevel) {
            createNewLevel(16, 8);
        }

        currentMode = "editor";
        isEditing = true;
        editorLoop();

        if (!isEditing) {
            currentMode = "menu";
        }
    }

    function loadAndPlayLevel() {
        var path = dialogModule.pickFile("/levels", "json");

        if (path) {
            var filename = path.substring(path.lastIndexOf("/") + 1);
            filename = filename.substring(0, filename.lastIndexOf("."));

            if (loadLevelFile(filename)) {
                dialogModule.success("Level loaded!", true);
                startPlayMode();
            } else {
                dialogModule.error("Could not load level", true);
            }
        }
    }

    function start3DMode() {
        var running = true;
        var demoIndex = 0;
        var demos = [
            { name: "Rotating Cube", fn: runCubeDemo },
            { name: "Multiple Cubes", fn: runMultiCubeDemo },
            { name: "Pyramid", fn: runPyramidDemo },
            { name: "3D Scene", fn: runSceneDemo },
            { name: "Filled Mode", fn: runFilledDemo },
            { name: "VR Split Screen", fn: runVRSplitScreenDemo }
        ];

        while (running) {
            displayModule.fill(displayModule.color(0, 0, 0));

            displayModule.setTextSize(2);
            displayModule.setTextAlign("center", "middle");
            displayModule.drawText("3D Demos", 64, 12);

            displayModule.setTextSize(1);
            var y = 28;
            var i;
            for (i = 0; i < demos.length; i++) {
                var prefix = i === demoIndex ? "> " : "  ";
                displayModule.drawText(prefix + (i + 1) + ". " + demos[i].name, 10, y);
                y += 10;
            }

            displayModule.drawText("Back. Exit", 10, y + 5);

            displayModule.display();

            var key = keyboardModule.getKeyPress();
            if (key === "up") {
                demoIndex = (demoIndex - 1 + demos.length) % demos.length;
            } else if (key === "down") {
                demoIndex = (demoIndex + 1) % demos.length;
            } else if (key === "ok" || key === "enter") {
                stop3DMode();
                demos[demoIndex].fn();
            } else if (key === "back") {
                running = false;
            }

            delay(100);
        }
    }

    function stop3DMode() {
        entities3D = [];
    }

    function runCubeDemo() {
        displayModule.fill(displayModule.color(0, 0, 0));
        displayModule.drawText("Rotating Cube Demo", 64, 20);
        displayModule.display();
        delay(1500);

        entities3D = [];
        current3DMode = "wireframe";

        var cube = createCube(0, 0, 100, 50, displayModule.color(0, 150, 255));
        cube.rotationSpeed = 1;
        cube.rotationAxis = "y";
        entities3D.push(cube);

        setCamera3DPosition(0, 0, -200);
        start3DLoop();
    }

    function runMultiCubeDemo() {
        displayModule.fill(displayModule.color(0, 0, 0));
        displayModule.drawText("Multiple Cubes Demo", 64, 20);
        displayModule.display();
        delay(1500);

        entities3D = [];
        current3DMode = "wireframe";

        var colors = [
            displayModule.color(255, 80, 80),
            displayModule.color(80, 255, 80),
            displayModule.color(80, 80, 255),
            displayModule.color(255, 255, 80),
            displayModule.color(255, 80, 255),
            displayModule.color(80, 255, 255)
        ];

        var i;
        for (i = 0; i < 6; i++) {
            var angle = (i / 6) * Math.PI * 2;
            var x = Math.cos(angle) * 60;
            var z = Math.sin(angle) * 60;

            var cube = createCube(x, 0, z + 100, 35, colors[i]);
            cube.rotationSpeed = 0.8;
            cube.rotationAxis = "y";
            entities3D.push(cube);
        }

        setCamera3DPosition(0, -30, -250);
        start3DLoop();
    }

    function runPyramidDemo() {
        displayModule.fill(displayModule.color(0, 0, 0));
        displayModule.drawText("Pyramid Demo", 64, 20);
        displayModule.display();
        delay(1500);

        entities3D = [];
        current3DMode = "wireframe";

        var pyramid = createPyramid(0, 0, 100, 70, displayModule.color(255, 180, 80));
        pyramid.rotationSpeed = 1;
        entities3D.push(pyramid);

        var baseCube = createCube(0, 50, 100, 20, displayModule.color(128, 128, 128));
        baseCube.rotationSpeed = -0.5;
        baseCube.rotationAxis = "x";
        entities3D.push(baseCube);

        setCamera3DPosition(0, -20, -250);
        start3DLoop();
    }

    function runSceneDemo() {
        displayModule.fill(displayModule.color(0, 0, 0));
        displayModule.drawText("3D Scene Demo", 64, 20);
        displayModule.display();
        delay(1500);

        entities3D = [];
        current3DMode = "wireframe";

        var grid = createGrid(300, 30, displayModule.color(48, 48, 48));
        entities3D.push(grid);

        var objects = [
            { type: "cube", x: 0, y: 0, z: 50, size: 40, color: displayModule.color(255, 100, 100) },
            { type: "cube", x: 80, y: 0, z: 50, size: 30, color: displayModule.color(100, 255, 100) },
            { type: "cube", x: -80, y: 0, z: 50, size: 30, color: displayModule.color(100, 100, 255) },
            { type: "pyramid", x: 0, y: -40, z: 100, size: 50, color: displayModule.color(255, 200, 100) },
            { type: "cube", x: 0, y: 60, z: 80, size: 25, color: displayModule.color(200, 100, 255) }
        ];

        var i;
        for (i = 0; i < objects.length; i++) {
            var obj = objects[i];
            var entity;
            if (obj.type === "cube") {
                entity = createCube(obj.x, obj.y, obj.z, obj.size, obj.color);
            } else {
                entity = createPyramid(obj.x, obj.y, obj.z, obj.size, obj.color);
            }
            entity.rotationSpeed = 0.4 + Math.random() * 0.4;
            entity.rotationAxis = "y";
            entities3D.push(entity);
        }

        setCamera3DPosition(0, -80, -400);
        start3DLoop();
    }

    function runFilledDemo() {
        displayModule.fill(displayModule.color(0, 0, 0));
        displayModule.drawText("Filled Mode Demo", 64, 20);
        displayModule.display();
        delay(1500);

        entities3D = [];
        current3DMode = "filled";

        var centerObj = createCube(0, 0, 100, 50, displayModule.color(0, 150, 255));
        centerObj.rotationSpeed = 0.6;
        entities3D.push(centerObj);

        var satellites = [
            { x: 70, y: 0, z: 100, color: displayModule.color(255, 80, 80) },
            { x: -70, y: 0, z: 100, color: displayModule.color(80, 255, 80) },
            { x: 0, y: 70, z: 100, color: displayModule.color(80, 80, 255) },
            { x: 0, y: -70, z: 100, color: displayModule.color(255, 255, 80) }
        ];

        var i;
        for (i = 0; i < satellites.length; i++) {
            var sat = createCube(satellites[i].x, satellites[i].y, satellites[i].z, 35, satellites[i].color);
            sat.rotationSpeed = -0.4;
            entities3D.push(sat);
        }

        setCamera3DPosition(0, 0, -300);
        start3DLoop();
    }

    function runVRSplitScreenDemo() {
        displayModule.fill(displayModule.color(0, 0, 0));
        displayModule.drawText("VR Split Screen", 64, 20);
        displayModule.display();
        delay(1500);

        entities3D = [];
        current3DMode = "wireframe";

        var grid = createGrid(300, 30, displayModule.color(48, 48, 48));
        entities3D.push(grid);

        var centerCube = createCube(0, 0, 100, 50, displayModule.color(0, 150, 255));
        centerCube.rotationSpeed = 0.5;
        entities3D.push(centerCube);

        var colors = [
            displayModule.color(255, 80, 80),
            displayModule.color(80, 255, 80),
            displayModule.color(80, 80, 255),
            displayModule.color(255, 255, 80),
            displayModule.color(255, 80, 255),
            displayModule.color(80, 255, 255)
        ];

        var i;
        for (i = 0; i < 6; i++) {
            var angle = (i / 6) * Math.PI * 2;
            var x = Math.cos(angle) * 80;
            var z = Math.sin(angle) * 80 + 100;
            var cube = createCube(x, 0, z, 35, colors[i]);
            cube.rotationSpeed = 0.6;
            cube.rotationAxis = "y";
            entities3D.push(cube);
        }

        setCamera3DPosition(0, 0, -250);
        startVRSplitScreenLoop();
    }

    function startVRSplitScreenLoop() {
        var running = true;
        while (running) {
            update3D();
            renderVRSplitScreen();

            var key = keyboardModule.getKey();
            if (key === "back" || key === "menu") {
                running = false;
            }

            delay(50);
        }
        entities3D = [];
    }

    function renderVRSplitScreen() {
        displayModule.fill(displayModule.color(0, 0, 0));

        var originalCameraX = camera3D.x;
        var originalCameraY = camera3D.y;
        var originalCameraZ = camera3D.z;
        var originalYaw = camera3D.yaw;
        var originalPitch = camera3D.pitch;

        var eyeSeparation = 15;
        var halfWidth = Math.floor(screenWidth / 2);

        displayModule.drawLine(halfWidth, 0, halfWidth, screenHeight, displayModule.color(128, 128, 128));

        var leftEyeColor = displayModule.color(200, 100, 100);
        var rightEyeColor = displayModule.color(100, 200, 100);

        displayModule.setTextSize(1);
        displayModule.setTextAlign("center", "top");
        displayModule.setTextColor(leftEyeColor);
        displayModule.drawText("L", halfWidth / 2, 2);
        displayModule.setTextColor(rightEyeColor);
        displayModule.drawText("R", halfWidth + halfWidth / 2, 2);

        var savedProjectionFov = projection.fov;
        projection.fov = projection.fov / 2;

        camera3D.x = originalCameraX - eyeSeparation;
        var leftBuffer = [];
        renderSceneToBuffer(leftBuffer, halfWidth);

        camera3D.x = originalCameraX + eyeSeparation;
        var rightBuffer = [];
        renderSceneToBuffer(rightBuffer, halfWidth);

        var i;
        for (i = 0; i < leftBuffer.length; i++) {
            var line = leftBuffer[i];
            displayModule.drawLine(line.x1, line.y1, line.x2, line.y2, line.color);
        }

        for (i = 0; i < rightBuffer.length; i++) {
            var line = rightBuffer[i];
            displayModule.drawLine(line.x1 + halfWidth, line.y1, line.x2 + halfWidth, line.y2, line.color);
        }

        projection.fov = savedProjectionFov;

        camera3D.x = originalCameraX;
        camera3D.y = originalCameraY;
        camera3D.z = originalCameraZ;
        camera3D.yaw = originalYaw;
        camera3D.pitch = originalPitch;

        displayModule.setTextAlign("left", "top");
        displayModule.setTextColor(displayModule.color(255, 255, 255));
        displayModule.drawText("VR Mode", 2, 2);
        displayModule.drawText("Arrows: Rotate", 2, 12);

        displayModule.display();
    }

    function renderSceneToBuffer(buffer, viewportWidth) {
        buffer.length = 0;

        var tempEntities = entities3D.slice();
        tempEntities.sort(function(a, b) {
            var depthA = a.depth !== undefined ? a.depth : 0;
            var depthB = b.depth !== undefined ? b.depth : 0;
            return depthB - depthA;
        });

        var savedScreenWidth = screenWidth;
        screenWidth = viewportWidth;

        var i;
        for (i = 0; i < tempEntities.length; i++) {
            if (tempEntities[i].type === "cube" || tempEntities[i].type === "pyramid") {
                renderMeshToBuffer(tempEntities[i], buffer);
            } else if (tempEntities[i].type === "grid") {
                renderGridToBuffer(tempEntities[i], buffer);
            } else if (tempEntities[i].type === "line3d") {
                var p1 = projectPoint(tempEntities[i].x1, tempEntities[i].y1, tempEntities[i].z1);
                var p2 = projectPoint(tempEntities[i].x2, tempEntities[i].y2, tempEntities[i].z2);
                if (p1 && p2) {
                    buffer.push({
                        x1: Math.floor(p1.x),
                        y1: Math.floor(p1.y),
                        x2: Math.floor(p2.x),
                        y2: Math.floor(p2.y),
                        color: tempEntities[i].color
                    });
                }
            }
        }

        screenWidth = savedScreenWidth;
    }

    function renderMeshToBuffer(mesh, buffer) {
        var projectedVerts = [];
        var i;
        for (i = 0; i < mesh.vertices.length; i++) {
            projectedVerts[i] = projectPoint(
                mesh.vertices[i].x,
                mesh.vertices[i].y,
                mesh.vertices[i].z
            );
        }

        var visibleFaces = [];
        for (i = 0; i < mesh.faces.length; i++) {
            var face = mesh.faces[i];
            var v0 = mesh.vertices[face.indices[0]];
            var v1 = mesh.vertices[face.indices[1]];
            var v2 = mesh.vertices[face.indices[2]];

            var edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
            var edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

            var normal = {
                x: edge1.y * edge2.z - edge1.z * edge2.y,
                y: edge1.z * edge2.x - edge1.x * edge2.z,
                z: edge1.x * edge2.y - edge1.y * edge2.x
            };

            var toCamera = {
                x: v0.x - camera3D.x,
                y: v0.y - camera3D.y,
                z: v0.z - camera3D.z
            };

            var dot = normal.x * toCamera.x + normal.y * toCamera.y + normal.z * toCamera.z;

            if (dot < 0) {
                visibleFaces.push(face);
            }
        }

        visibleFaces.sort(function(a, b) {
            var avgZA = 0;
            var avgZB = 0;
            var j;
            for (j = 0; j < a.indices.length; j++) {
                var pva = projectedVerts[a.indices[j]];
                if (pva) avgZA += pva.z;
            }
            for (j = 0; j < b.indices.length; j++) {
                var pvb = projectedVerts[b.indices[j]];
                if (pvb) avgZB += pvb.z;
            }
            return avgZB - avgZA;
        });

        for (i = 0; i < visibleFaces.length; i++) {
            var face = visibleFaces[i];
            if (current3DMode === "wireframe") {
                var numVerts = face.indices.length;
                for (var j = 0; j < numVerts; j++) {
                    var idx1 = face.indices[j];
                    var idx2 = face.indices[(j + 1) % numVerts];
                    var p1 = projectedVerts[idx1];
                    var p2 = projectedVerts[idx2];
                    if (p1 && p2) {
                        buffer.push({
                            x1: Math.floor(p1.x),
                            y1: Math.floor(p1.y),
                            x2: Math.floor(p2.x),
                            y2: Math.floor(p2.y),
                            color: mesh.color
                        });
                    }
                }
            } else if (current3DMode === "filled") {
                if (face.indices.length >= 3) {
                    var p1 = projectedVerts[face.indices[0]];
                    var p2 = projectedVerts[face.indices[1]];
                    var p3 = projectedVerts[face.indices[2]];
                    if (p1 && p2 && p3) {
                        renderFilledTriangleToBuffer(p1, p2, p3, mesh.color, buffer);
                        if (face.indices.length === 4) {
                            var p4 = projectedVerts[face.indices[3]];
                            if (p4) {
                                renderFilledTriangleToBuffer(p1, p3, p4, mesh.color, buffer);
                            }
                        }
                    }
                }
            }
        }
    }

    function renderGridToBuffer(grid, buffer) {
        var halfSize = grid.size / 2;
        var i;
        for (i = -halfSize; i <= halfSize; i += grid.spacing) {
            var p1 = projectPoint(i, halfSize, 0);
            var p2 = projectPoint(i, -halfSize, 0);
            if (p1 && p2) {
                buffer.push({
                    x1: Math.floor(p1.x),
                    y1: Math.floor(p1.y),
                    x2: Math.floor(p2.x),
                    y2: Math.floor(p2.y),
                    color: grid.color
                });
            }

            p1 = projectPoint(-halfSize, i, 0);
            p2 = projectPoint(halfSize, i, 0);
            if (p1 && p2) {
                buffer.push({
                    x1: Math.floor(p1.x),
                    y1: Math.floor(p1.y),
                    x2: Math.floor(p2.x),
                    y2: Math.floor(p2.y),
                    color: grid.color
                });
            }
        }
    }

    function renderFilledTriangleToBuffer(p1, p2, p3, color, buffer) {
        var minY = Math.floor(Math.min(p1.y, p2.y, p3.y));
        var maxY = Math.ceil(Math.max(p1.y, p2.y, p3.y));

        var y;
        for (y = minY; y <= maxY; y++) {
            var intersections = [];

            if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
                var t1 = (y - p1.y) / (p2.y - p1.y);
                intersections.push(p1.x + t1 * (p2.x - p1.x));
            }
            if ((p1.y <= y && p3.y > y) || (p3.y <= y && p1.y > y)) {
                var t2 = (y - p1.y) / (p3.y - p1.y);
                intersections.push(p1.x + t2 * (p3.x - p1.x));
            }
            if ((p2.y <= y && p3.y > y) || (p3.y <= y && p2.y > y)) {
                var t3 = (y - p2.y) / (p3.y - p2.y);
                intersections.push(p2.x + t3 * (p3.x - p2.x));
            }

            if (intersections.length >= 2) {
                intersections.sort(function(a, b) { return a - b; });
                var xStart = Math.floor(Math.min(intersections[0], intersections[1]));
                var xEnd = Math.ceil(Math.max(intersections[0], intersections[1]));

                buffer.push({
                    x1: xStart,
                    y1: y,
                    x2: xEnd - 1,
                    y2: y,
                    color: color
                });
            }
        }
    }

    function start3DLoop() {
        var running = true;
        while (running) {
            update3D();
            render3D();

            var key = keyboardModule.getKey();
            if (key === "back" || key === "menu") {
                running = false;
            }

            delay(50);
        }
        entities3D = [];
    }

    function showAbout() {
        dialogModule.info("Bruce Engine v1.0\n\n2D/3D Game Engine for Bruce\n\nFeatures:\n- 2D Game Engine\n- Level Editor\n- 3D Rendering\n- Save/Load Levels\n- WiFi Controller (AP Mode)\n- VR Multiplayer (WebXR)", true);
    }

    function startVRMultiplayerMenu() {
        var running = true;
        var selectedIndex = 0;
        var options = [
            ["Create VR Session", "create_vr"],
            ["Join VR Session", "join_vr"],
            ["VR Settings", "vr_settings"],
            ["VR Demos", "vr_demos"],
            ["Back", "back"]
        ];

        while (running) {
            displayModule.fill(displayModule.color(0, 0, 0));

            displayModule.setTextSize(2);
            displayModule.setTextAlign("center", "middle");
            displayModule.drawText("VR Multiplayer", 64, 15);

            displayModule.setTextSize(1);
            var y = 35;
            var i;
            for (i = 0; i < options.length; i++) {
                var prefix = i === selectedIndex ? "> " : "  ";
                displayModule.drawText(prefix + (i + 1) + ". " + options[i][0], 10, y);
                y += 12;
            }

            if (isVRSession && vrSession) {
                var sessionInfo = vrSession.getSessionInfo();
                displayModule.setTextColor(displayModule.color(0, 255, 255));
                displayModule.drawText("Session: " + (sessionInfo.sessionId || "None"), 64, 58);
            }

            displayModule.display();

            var key = keyboardModule.getKeyPress();
            if (key === "up") {
                selectedIndex = (selectedIndex - 1 + options.length) % options.length;
            } else if (key === "down") {
                selectedIndex = (selectedIndex + 1) % options.length;
            } else if (key === "ok" || key === "enter") {
                if (options[selectedIndex][1] === "create_vr") {
                    createVRSession();
                } else if (options[selectedIndex][1] === "join_vr") {
                    joinVRSession();
                } else if (options[selectedIndex][1] === "vr_settings") {
                    showVRSettings();
                } else if (options[selectedIndex][1] === "vr_demos") {
                    runVRDemoMenu();
                } else if (options[selectedIndex][1] === "back") {
                    running = false;
                }
            } else if (key === "back") {
                running = false;
            }

            delay(100);
        }
    }

    function createVRSession() {
        var result = initVRManager();
        if (!result.success) {
            dialogModule.error("Failed to initialize VR: " + result.error, true);
            return;
        }

        vrSession = createVRSessionManager();
        var createResult = vrSession.createSession({
            maxPlayers: 4,
            capabilities: {
                headTracking: true,
                controllerTracking: true,
                handTracking: false,
                spatialAudio: true
            },
            callbacks: {
                onPlayerJoin: onVRPlayerJoin,
                onPlayerLeave: onVRPlayerLeave,
                onSessionError: onVRSessionError
            }
        });

        if (createResult.success) {
            isVRSession = true;
            localVRPlayerId = createResult.hostId;

            vrAvatarManager.createAvatar(localVRPlayerId, true);

            dialogModule.success("VR Session Created!\nSession ID: " + createResult.sessionId + "\n\nShare this code with players.", true);

            startVRGameLoop();
        } else {
            dialogModule.error("Failed to create session", true);
        }
    }

    function joinVRSession() {
        var sessionCode = dialogModule.prompt("Enter Session Code", 6, "");
        var hostIP = dialogModule.prompt("Host IP Address", 20, "192.168.4.1");

        if (sessionCode && hostIP) {
            var result = initVRManager();
            if (!result.success) {
                dialogModule.error("Failed to initialize VR: " + result.error, true);
                return;
            }

            vrSession = createVRSessionManager();
            var joinResult = vrSession.joinSession(sessionCode, hostIP, 8765);

            if (joinResult.success) {
                isVRSession = true;
                localVRPlayerId = Math.floor(Math.random() * 10000);

                vrAvatarManager.createAvatar(localVRPlayerId, true);

                dialogModule.success("Joined VR Session!\nSession: " + sessionCode, true);

                startVRGameLoop();
            } else {
                dialogModule.error("Failed to join session", true);
            }
        }
    }

    function initVRManager() {
        try {
            vrNetworkManager = createVRNetworkManager();
            vrNetworkManager.initialize({});

            vrInputManager = createVRInputManager();
            vrInputManager.initialize();

            vrAvatarManager = createVRAvatarManager();
            vrAvatarManager.initialize();

            vrSpatialAudio = createVRSpatialAudio();
            vrSpatialAudio.initialize();

            vrPerformanceManager = createVRPerformanceManager();
            vrPerformanceManager.initialize();

            return { success: true };
        } catch (e) {
            return { success: false, error: e.toString() };
        }
    }

    function onVRPlayerJoin(playerId, playerData) {
        vrAvatarManager.createAvatar(playerId, false);
        dialogModule.info("VR Player joined: " + playerId, false);
    }

    function onVRPlayerLeave(playerId) {
        vrAvatarManager.removeAvatar(playerId);
        dialogModule.info("VR Player left: " + playerId, false);
    }

    function onVRSessionError(error) {
        dialogModule.error("VR Session Error: " + error, true);
    }

    function showVRSettings() {
        var choice = dialogModule.choice([
            ["Quality: " + vrQualityLevel, "quality"],
            ["Prediction: " + (vrPredictionEnabled ? "On" : "Off"), "prediction"],
            ["Latency Comp: " + vrLatencyCompensation + "ms", "latency"],
            ["Back", "back"]
        ]);

        if (choice === "quality") {
            var qualities = ["low", "medium", "high"];
            var currentIdx = qualities.indexOf(vrQualityLevel);
            var nextIdx = (currentIdx + 1) % qualities.length;
            vrQualityLevel = qualities[nextIdx];
            dialogModule.info("Quality set to: " + vrQualityLevel, true);
        } else if (choice === "prediction") {
            vrPredictionEnabled = !vrPredictionEnabled;
            dialogModule.info("Prediction " + (vrPredictionEnabled ? "enabled" : "disabled"), true);
        } else if (choice === "latency") {
            var newLatency = dialogModule.prompt("Latency Compensation (ms)", 4, String(vrLatencyCompensation));
            if (newLatency) {
                vrLatencyCompensation = parse_int(newLatency) || 50;
            }
        }
    }

    function runVRDemoMenu() {
        var running = true;
        var selectedIndex = 0;
        var demos = [
            ["VR Split Screen", "vr_split"],
            ["Multi-Avatar Demo", "vr_multi_avatar"],
            ["VR Chat Demo", "vr_chat"],
            ["Back", "back"]
        ];

        while (running) {
            displayModule.fill(displayModule.color(0, 0, 0));

            displayModule.setTextSize(2);
            displayModule.setTextAlign("center", "middle");
            displayModule.drawText("VR Demos", 64, 15);

            displayModule.setTextSize(1);
            var y = 40;
            var i;
            for (i = 0; i < demos.length; i++) {
                var prefix = i === selectedIndex ? "> " : "  ";
                displayModule.drawText(prefix + (i + 1) + ". " + demos[i][0], 10, y);
                y += 12;
            }

            displayModule.display();

            var key = keyboardModule.getKeyPress();
            if (key === "up") {
                selectedIndex = (selectedIndex - 1 + demos.length) % demos.length;
            } else if (key === "down") {
                selectedIndex = (selectedIndex + 1) % demos.length;
            } else if (key === "ok" || key === "enter") {
                if (demos[selectedIndex][1] === "vr_split") {
                    runVRSplitScreenDemo();
                } else if (demos[selectedIndex][1] === "vr_multi_avatar") {
                    runVRMultiAvatarDemo();
                } else if (demos[selectedIndex][1] === "vr_chat") {
                    runVRChatDemo();
                } else if (demos[selectedIndex][1] === "back") {
                    running = false;
                }
            } else if (key === "back") {
                running = false;
            }

            delay(100);
        }
    }

    function runVRMultiAvatarDemo() {
        displayModule.fill(displayModule.color(0, 0, 0));
        displayModule.drawText("Multi-Avatar Demo", 64, 20);
        displayModule.display();
        delay(1500);

        initVRManager();

        var grid = createGrid(300, 30, displayModule.color(48, 48, 48));
        entities3D.push(grid);

        var centerObj = createCube(0, 0, 100, 40, displayModule.color(0, 150, 255));
        centerObj.rotationSpeed = 0.5;
        entities3D.push(centerObj);

        for (var i = 1; i <= 3; i++) {
            vrAvatarManager.createAvatar(i, i === 1);
            vrAvatarManager.updateAvatarPose(i, {
                head: {
                    position: { x: (i - 2) * 60, y: 0, z: 50 },
                    rotation: { x: 0, y: 0, z: 0, w: 1 }
                },
                leftHand: {
                    position: { x: (i - 2) * 60 - 15, y: -20, z: 40 },
                    rotation: { x: 0, y: 0, z: 0, w: 1 }
                },
                rightHand: {
                    position: { x: (i - 2) * 60 + 15, y: -20, z: 40 },
                    rotation: { x: 0, y: 0, z: 0, w: 1 }
                }
            });
        }

        setCamera3DPosition(0, 0, -250);
        startVRGameLoop();
    }

    function runVRChatDemo() {
        displayModule.fill(displayModule.color(0, 0, 0));
        displayModule.drawText("VR Voice Chat Demo", 64, 20);
        displayModule.display();
        delay(1500);

        dialogModule.info("VR Voice Chat requires microphone permissions.\n\nThis demo shows spatial voice positioning.", true);

        initVRManager();

        var grid = createGrid(300, 30, displayModule.color(48, 48, 48));
        entities3D.push(grid);

        vrAvatarManager.createAvatar(1, true);
        vrAvatarManager.createAvatar(2, false);
        vrAvatarManager.createAvatar(3, false);

        vrSpatialAudio.setListenerPosition(1, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, { x: 0, y: 1, z: 0 });

        setCamera3DPosition(0, 0, -200);
        startVRGameLoop();
    }

    function startVRGameLoop() {
        var frameCount = 0;
        var lastFrameTime = Date.now();
        var running = true;

        while (running && isVRSession) {
            var now = Date.now();
            var frameTime = now - lastFrameTime;
            lastFrameTime = now;

            var metrics = {
                frameTime: frameTime,
                timestamp: now
            };

            if (vrPerformanceManager) {
                vrPerformanceManager.updateMetrics(metrics);
            }

            updateVR(frameTime);

            var key = keyboardModule.getKey();
            if (key === "menu") {
                showVRMenu();
            } else if (key === "back") {
                leaveVRSession();
                running = false;
            }

            var targetFrameTime = 1000 / vrUpdateRates.headTracking;
            var elapsed = Date.now() - now;
            if (elapsed < targetFrameTime) {
                delay(targetFrameTime - elapsed);
            }

            frameCount++;
        }
    }

    function updateVR(deltaTime) {
        if (vrInputManager) {
            vrControllers = vrInputManager.poll();
        }

        vrHeadPose = getVRHeadPose();

        if (vrNetworkManager && vrNetworkManager.getConnectionState() === "connected") {
            broadcastVRPose(vrHeadPose, vrControllers);
        }

        if (vrAvatarManager) {
            vrAvatarManager.updateAllMeshes();
        }

        if (vrPerformanceManager && vrPerformanceManager.shouldReduceUpdates()) {
            vrUpdateRates.headTracking = 60;
            vrUpdateRates.controllerTracking = 30;
        } else {
            vrUpdateRates.headTracking = 90;
            vrUpdateRates.controllerTracking = 60;
        }
    }

    function renderVR() {
        displayModule.fill(displayModule.color(0, 0, 0));

        var buffer = [];
        renderSceneToBuffer(buffer, screenWidth);

        if (vrAvatarManager) {
            vrAvatarManager.renderToBuffer(buffer);
        }

        var i;
        for (i = 0; i < buffer.length; i++) {
            var line = buffer[i];
            displayModule.drawLine(line.x1, line.y1, line.x2, line.y2, line.color);
        }

        displayModule.setTextSize(1);
        displayModule.setTextAlign("left", "top");
        displayModule.setTextColor(displayModule.color(0, 255, 0));
        displayModule.drawText("VR Mode", 2, 2);

        var metrics = vrPerformanceManager ? vrPerformanceManager.getMetrics() : {};
        displayModule.drawText("FPS: " + (metrics.fps || 0).toFixed(1), 2, 12);
        displayModule.drawText("Quality: " + (vrPerformanceManager ? vrPerformanceManager.getQualityLevel() : "unknown"), 2, 22);

        if (vrNetworkManager) {
            var peerCount = vrNetworkManager.getAllPeers().length;
            displayModule.drawText("Players: " + (peerCount + 1), 2, 32);
        }

        displayModule.setTextColor(displayModule.color(150, 150, 150));
        displayModule.drawText("[MENU] Menu  [BACK] Leave", 2, screenHeight - 10);

        displayModule.display();
    }

    function showVRMenu() {
        var choice = dialogModule.choice([
            ["Continue", "continue"],
            ["Quality Settings", "quality"],
            ["Leave Session", "leave"]
        ]);

        if (choice === "continue") {
        } else if (choice === "quality") {
            showVRSettings();
        } else if (choice === "leave") {
            leaveVRSession();
        }
    }

    function leaveVRSession() {
        if (vrSession) {
            vrSession.close();
            vrSession = null;
        }

        if (vrNetworkManager) {
            vrNetworkManager.closeAll();
            vrNetworkManager = null;
        }

        if (vrSpatialAudio) {
            vrSpatialAudio.cleanup();
            vrSpatialAudio = null;
        }

        if (vrAvatarManager) {
            vrAvatarManager.clearAll();
            vrAvatarManager = null;
        }

        isVRSession = false;
        localVRPlayerId = null;
        vrPeers = {};

        currentMode = "menu";
    }

    function runVRSplitScreenDemo() {
        displayModule.fill(displayModule.color(0, 0, 0));
        displayModule.drawText("VR Split Screen", 64, 20);
        displayModule.display();
        delay(1500);

        entities3D = [];
        current3DMode = "wireframe";

        var grid = createGrid(300, 30, displayModule.color(48, 48, 48));
        entities3D.push(grid);

        var centerCube = createCube(0, 0, 100, 50, displayModule.color(0, 150, 255));
        centerCube.rotationSpeed = 0.5;
        entities3D.push(centerCube);

        var colors = [
            displayModule.color(255, 80, 80),
            displayModule.color(80, 255, 80),
            displayModule.color(80, 80, 255),
            displayModule.color(255, 255, 80),
            displayModule.color(255, 80, 255),
            displayModule.color(80, 255, 255)
        ];

        var i;
        for (i = 0; i < 6; i++) {
            var angle = (i / 6) * Math.PI * 2;
            var x = Math.cos(angle) * 80;
            var z = Math.sin(angle) * 80 + 100;
            var cube = createCube(x, 0, z, 35, colors[i]);
            cube.rotationSpeed = 0.6;
            cube.rotationAxis = "y";
            entities3D.push(cube);
        }

        setCamera3DPosition(0, 0, -250);
        startVRSplitScreenLoop();
    }

    function startMultiplayerMenu() {
        var running = true;
        var selectedIndex = 0;
        var options = [
            ["Host Game", "host"],
            ["Join Game", "join"],
            ["Start Co-op", "start_coop"],
            ["Co-op Games", "coop_examples"],
            ["Back", "back"]
        ];

        while (running) {
            displayModule.fill(displayModule.color(0, 0, 0));

            displayModule.setTextSize(2);
            displayModule.setTextAlign("center", "middle");
            displayModule.drawText("Multiplayer", 64, 15);

            displayModule.setTextSize(1);
            var y = 35;
            var i;
            for (i = 0; i < options.length; i++) {
                var prefix = i === selectedIndex ? "> " : "  ";
                displayModule.drawText(prefix + (i + 1) + ". " + options[i][0], 10, y);
                y += 12;
            }

            if (isMultiplayerHost || isMultiplayerClient) {
                var status = isMultiplayerHost ? "HOST" : "CLIENT";
                displayModule.setTextColor(displayModule.color(0, 255, 0));
                displayModule.drawText("Session: " + status, 64, 58);
            }

            displayModule.display();

            var key = keyboardModule.getKeyPress();
            if (key === "up") {
                selectedIndex = (selectedIndex - 1 + options.length) % options.length;
            } else if (key === "down") {
                selectedIndex = (selectedIndex + 1) % options.length;
            } else if (key === "ok" || key === "enter") {
                if (options[selectedIndex][1] === "host") {
                    hostMultiplayerGame();
                } else if (options[selectedIndex][1] === "join") {
                    joinMultiplayerGame();
                } else if (options[selectedIndex][1] === "start_coop") {
                    if (isMultiplayerHost || isMultiplayerClient) {
                        startCoopGame();
                    } else {
                        dialogModule.info("No session active.\nHost or join a game first.", true);
                    }
                } else if (options[selectedIndex][1] === "coop_examples") {
                    runCoopExamplesMenu();
                } else if (options[selectedIndex][1] === "back") {
                    running = false;
                }
            } else if (key === "back") {
                running = false;
            }

            delay(100);
        }
    }

    function hostMultiplayerGame() {
        var port = 8765;
        multiplayerManager = createMultiplayerManager();
        var result = multiplayerManager.host(port);

        if (result.success) {
            isMultiplayerHost = true;
            isMultiplayerClient = false;
            localPlayerId = multiplayerManager.getHostId();
            dialogModule.success("Game hosted!\nPort: " + port + "\nWaiting for players...", true);
            initMultiplayerGameLoop();
        } else {
            dialogModule.error("Failed to host: " + result.error, true);
        }
    }

    function joinMultiplayerGame() {
        var ip = dialogModule.prompt("Enter Host IP", 20, "192.168.4.1");
        var portStr = dialogModule.prompt("Enter Port", 5, "8765");

        if (ip && portStr) {
            var port = parse_int(portStr);
            multiplayerManager = createMultiplayerManager();
            var result = multiplayerManager.join(ip, port);

            if (result.success) {
                isMultiplayerHost = false;
                isMultiplayerClient = true;
                localPlayerId = result.playerId;
                dialogModule.success("Joined game!\nPlayer ID: " + localPlayerId, true);
                initMultiplayerGameLoop();
            } else {
                dialogModule.error("Failed to join: " + result.error, true);
            }
        }
    }

    function startCoopGame() {
        if (multiplayerManager) {
            multiplayerManager.broadcast({
                type: "GAME_START",
                levelData: currentLevel ? currentLevel : createDefaultLevel(),
                playerId: localPlayerId
            });
        }

        var levelData = currentLevel ? currentLevel : createDefaultLevel();
        loadLevel(levelData);

        currentMode = "multiplayer";
        multiplayerGameLoop();
    }

    function initMultiplayerGameLoop() {
        if (multiplayerManager) {
            multiplayerManager.setCallback(function(message) {
                handleMultiplayerMessage(message);
            });
        }
    }

    function handleMultiplayerMessage(message) {
        if (message.type === "PLAYER_JOINED") {
            multiplayerPlayers[message.playerId] = {
                id: message.playerId,
                name: message.playerName || "Player " + message.playerId,
                x: 0,
                y: 0,
                color: generatePlayerColor(message.playerId)
            };
            dialogModule.info(message.playerName || "Player " + message.playerId + " joined!", false);
        } else if (message.type === "PLAYER_LEFT") {
            delete multiplayerPlayers[message.playerId];
        } else if (message.type === "PLAYER_MOVE") {
            if (multiplayerPlayers[message.playerId]) {
                multiplayerPlayers[message.playerId].x = message.x;
                multiplayerPlayers[message.playerId].y = message.y;
            }
        } else if (message.type === "GAME_START") {
            dialogModule.info("Game starting!", false);
            loadLevel(message.levelData);
            currentMode = "multiplayer";
            multiplayerGameLoop();
        } else if (message.type === "SYNC_STATE") {
            syncQueue.push(message);
        } else if (message.type === "CHAT") {
            displayModule.drawText(message.sender + ": " + message.text, 2, 50);
        }
    }

    function multiplayerGameLoop() {
        lastSyncTime = Date.now();

        while (currentMode === "multiplayer") {
            var now = Date.now();
            var deltaTime = now - lastSyncTime;

            updateMultiplayer(deltaTime);
            renderMultiplayer();

            var key = keyboardModule.getKey();
            if (key === "menu") {
                showMultiplayerMenu();
            } else if (key === "back") {
                leaveMultiplayerSession();
                break;
            }

            if (deltaTime >= syncInterval) {
                syncMultiplayerState();
                lastSyncTime = now;
            }

            delay(30);
        }
    }

    function updateMultiplayer(deltaTime) {
        var i;
        for (i = 0; i < entities.length; i++) {
            if (entities[i].update) {
                entities[i].update();
            }
        }

        processSyncQueue();

        if (multiplayerManager) {
            multiplayerManager.processMessages();
        }
    }

    function processSyncQueue() {
        while (syncQueue.length > 0) {
            var sync = syncQueue.shift();
            if (sync.type === "SYNC_STATE") {
                applyRemoteState(sync);
            }
        }
    }

    function applyRemoteState(sync) {
        var remotePlayer = sync.player;
        if (remotePlayer && remotePlayer.id !== localPlayerId) {
            var localPlayer = multiplayerPlayers[remotePlayer.id];
            if (localPlayer) {
                localPlayer.x = remotePlayer.x;
                localPlayer.y = remotePlayer.y;
            }
        }

        if (sync.events) {
            var j;
            for (j = 0; j < sync.events.length; j++) {
                var event = sync.events[j];
                if (event.type === "COIN_COLLECTED") {
                    var k;
                    for (k = entities.length - 1; k >= 0; k--) {
                        if (entities[k].type === "coin" &&
                            entities[k].x === event.x &&
                            entities[k].y === event.y) {
                            entities[k].collected = true;
                            break;
                        }
                    }
                } else if (event.type === "PLAYER_DAMAGE") {
                    if (event.playerId === localPlayerId) {
                        lives = event.lives;
                    }
                } else if (event.type === "SCORE_UPDATE") {
                    score = event.score;
                }
            }
        }
    }

    function renderMultiplayer() {
        displayModule.fill(displayModule.color(0, 0, 0));

        var i;
        for (i = 0; i < entities.length; i++) {
            if (entities[i].render) {
                entities[i].render();
            }
        }

        for (var playerId in multiplayerPlayers) {
            var player = multiplayerPlayers[playerId];
            if (player.id !== localPlayerId) {
                displayModule.drawFillRect(
                    player.x - camera.x,
                    player.y - camera.y,
                    tileSize,
                    tileSize,
                    player.color
                );
                displayModule.drawText("P" + player.id,
                    player.x - camera.x + 2,
                    player.y - camera.y + 4);
            }
        }

        renderMultiplayerUI();

        displayModule.display();
    }

    function renderMultiplayerUI() {
        displayModule.setTextSize(1);
        displayModule.setTextAlign("left", "top");

        var playerCount = Object.keys(multiplayerPlayers).length;
        displayModule.setTextColor(displayModule.color(0, 255, 0));
        displayModule.drawText("Players: " + playerCount, 2, 2);

        var sessionType = isMultiplayerHost ? "HOST" : "CLIENT";
        displayModule.drawText("Session: " + sessionType, 2, 12);

        displayModule.setTextColor(displayModule.color(255, 255, 0));
        displayModule.drawText("Score: " + score, 100, 2);

        displayModule.setTextColor(displayModule.color(255, 100, 100));
        displayModule.drawText("Lives: " + lives, 100, 12);

        displayModule.setTextColor(displayModule.color(150, 150, 150));
        displayModule.drawText("[MENU] Menu  [BACK] Leave", 2, 54);
    }

    function showMultiplayerMenu() {
        var choice = dialogModule.choice([
            ["Continue", "continue"],
            ["Send Chat", "chat"],
            ["Start Game", "start"],
            ["Leave Session", "leave"]
        ]);

        if (choice === "continue") {
        } else if (choice === "chat") {
            var msg = dialogModule.prompt("Message", 30, "");
            if (msg && multiplayerManager) {
                multiplayerManager.broadcast({
                    type: "CHAT",
                    sender: "Player " + localPlayerId,
                    text: msg
                });
            }
        } else if (choice === "start") {
            if (isMultiplayerHost) {
                var levelData = currentLevel ? currentLevel : createDefaultLevel();
                multiplayerManager.broadcast({
                    type: "GAME_START",
                    levelData: levelData,
                    playerId: localPlayerId
                });
                loadLevel(levelData);
                currentMode = "multiplayer";
            } else {
                dialogModule.info("Only host can start game", true);
            }
        } else if (choice === "leave") {
            leaveMultiplayerSession();
        }
    }

    function leaveMultiplayerSession() {
        if (multiplayerManager) {
            if (isMultiplayerHost) {
                multiplayerManager.broadcast({
                    type: "GAME_END",
                    reason: "host_left"
                });
            } else {
                multiplayerManager.send({
                    type: "PLAYER_LEAVE",
                    playerId: localPlayerId
                });
            }
            multiplayerManager.close();
        }

        isMultiplayerHost = false;
        isMultiplayerClient = false;
        localPlayerId = null;
        multiplayerPlayers = {};
        multiplayerManager = null;
        currentMode = "menu";
    }

    function syncMultiplayerState() {
        if (!multiplayerManager) return;

        var localPlayer = findPlayer();
        if (localPlayer) {
            var state = {
                type: "PLAYER_MOVE",
                playerId: localPlayerId,
                x: localPlayer.x,
                y: localPlayer.y,
                timestamp: Date.now()
            };

            if (isMultiplayerHost) {
                var syncMessage = {
                    type: "SYNC_STATE",
                    player: {
                        id: localPlayerId,
                        x: localPlayer.x,
                        y: localPlayer.y
                    },
                    events: []
                };

                if (lastEvents && lastEvents.length > 0) {
                    syncMessage.events = lastEvents;
                    lastEvents = [];
                }

                multiplayerManager.broadcast(syncMessage);
            } else {
                multiplayerManager.send(state);
            }
        }
    }

    var lastEvents = [];

    function broadcastEvent(eventType, data) {
        var event = {
            type: eventType,
            data: data,
            playerId: localPlayerId,
            timestamp: Date.now()
        };

        if (isMultiplayerHost) {
            multiplayerManager.broadcast({
                type: "SYNC_STATE",
                events: [event]
            });
        } else {
            multiplayerManager.send({
                type: "EVENT",
                event: event
            });
        }

        if (!lastEvents) lastEvents = [];
        lastEvents.push(event);
    }

    function generatePlayerColor(playerId) {
        var colors = [
            displayModule.color(0, 255, 0),
            displayModule.color(255, 0, 0),
            displayModule.color(0, 0, 255),
            displayModule.color(255, 255, 0),
            displayModule.color(255, 0, 255),
            displayModule.color(0, 255, 255),
            displayModule.color(255, 128, 0),
            displayModule.color(128, 0, 255)
        ];
        return colors[playerId % colors.length];
    }

    function createMultiplayerManager() {
        var connections = [];
        var hostConnection = null;
        var serverSocket = null;
        var clientSocket = null;
        var callback = null;
        var myId = Math.floor(Math.random() * 10000);
        var isHost = false;
        var hostAddress = null;
        var hostPort = 0;

        return {
            host: function(port) {
                try {
                    if (typeof udp !== "undefined") {
                        serverSocket = udp.createSocket();
                        serverSocket.bind(port);
                        isHost = true;

                        serverSocket.on("message", function(msg, rinfo) {
                            try {
                                var data = JSON.parse(msg.toString());
                                this.handleServerMessage(data, rinfo);
                            } catch (e) {
                            }
                        }.bind(this));

                        return { success: true, port: port };
                    } else if (typeof http !== "undefined") {
                        serverSocket = http.createServer();
                        serverSocket.listen(port);
                        isHost = true;

                        serverSocket.onRequest(function(req, res) {
                            var path = req.url;
                            if (path === "/join") {
                                var data = JSON.stringify({
                                    success: true,
                                    playerId: Math.floor(Math.random() * 10000),
                                    currentPlayers: Object.keys(multiplayerPlayers)
                                });
                                res.writeHead(200, {"Content-Type": "application/json"});
                                res.end(data);
                            } else if (path === "/ws") {
                                var ws = req.ws ? req.ws() : null;
                                if (ws) {
                                    connections.push({ ws: ws, rinfo: null });
                                    ws.onMessage(function(msg) {
                                        var data = JSON.parse(msg);
                                        this.handleServerMessage(data, { address: req.clientAddress });
                                    }.bind(this));
                                }
                            }
                        }.bind(this));

                        return { success: true, port: port };
                    }
                    return { success: false, error: "No network module available" };
                } catch (e) {
                    return { success: false, error: e.toString() };
                }
            },

            join: function(ip, port) {
                try {
                    if (typeof udp !== "undefined") {
                        clientSocket = udp.createSocket();
                        hostAddress = ip;
                        hostPort = port;
                        isHost = false;

                        var joinMsg = JSON.stringify({ type: "JOIN_REQUEST" });
                        clientSocket.send(joinMsg, port, ip);

                        clientSocket.on("message", function(msg, rinfo) {
                            try {
                                var data = JSON.parse(msg.toString());
                                this.handleClientMessage(data);
                            } catch (e) {
                            }
                        }.bind(this));

                        return { success: true, playerId: myId };
                    } else if (typeof http !== "undefined") {
                        var xhr = new XMLHttpRequest();
                        xhr.open("GET", "http://" + ip + ":" + port + "/join", false);
                        xhr.send();

                        if (xhr.status === 200) {
                            var response = JSON.parse(xhr.responseText);
                            myId = response.playerId;
                            isHost = false;
                            hostAddress = ip;
                            hostPort = port;
                            return { success: true, playerId: myId };
                        }
                    }
                    return { success: false, error: "Connection failed" };
                } catch (e) {
                    return { success: false, error: e.toString() };
                }
            },

            handleServerMessage: function(data, rinfo) {
                if (data.type === "JOIN_REQUEST") {
                    var newId = Math.floor(Math.random() * 10000);
                    multiplayerPlayers[newId] = {
                        id: newId,
                        name: "Player " + newId,
                        x: 0,
                        y: 0,
                        color: generatePlayerColor(newId)
                    };

                    var response = JSON.stringify({
                        type: "JOIN_ACCEPTED",
                        playerId: newId,
                        players: multiplayerPlayers
                    });

                    if (serverSocket && serverSocket.send) {
                        serverSocket.send(response, hostPort, "255.255.255.255");
                    }
                } else if (data.type === "PLAYER_MOVE") {
                    if (multiplayerPlayers[data.playerId]) {
                        multiplayerPlayers[data.playerId].x = data.x;
                        multiplayerPlayers[data.playerId].y = data.y;
                    }
                } else if (data.type === "PLAYER_LEAVE") {
                    delete multiplayerPlayers[data.playerId];
                    this.broadcast({
                        type: "PLAYER_LEFT",
                        playerId: data.playerId
                    });
                } else if (data.type === "EVENT") {
                    this.broadcast(data);
                } else if (data.type === "CHAT") {
                    this.broadcast(data);
                }
            },

            handleClientMessage: function(data) {
                if (callback && data.type !== "HEARTBEAT") {
                    callback(data);
                }
            },

            broadcast: function(message) {
                var json = JSON.stringify(message);
                if (isHost && serverSocket) {
                    if (typeof serverSocket.broadcast === "function") {
                        serverSocket.broadcast(json);
                    }
                }
            },

            send: function(message) {
                var json = JSON.stringify(message);
                if (!isHost && clientSocket && hostAddress && hostPort) {
                    clientSocket.send(json, hostPort, hostAddress);
                }
            },

            processMessages: function() {
            },

            setCallback: function(cb) {
                callback = cb;
            },

            getHostId: function() {
                return myId;
            },

            close: function() {
                if (serverSocket && serverSocket.close) {
                    serverSocket.close();
                }
                if (clientSocket && clientSocket.close) {
                    clientSocket.close();
                }
                connections = [];
            }
        };
    }

    function createESPNOWManager() {
        var pairedPeers = {};
        var pendingPairings = {};
        var receiveCallback = null;
        var sendCallback = null;
        var myMACAddress = null;
        var pairingCode = null;
        var isInitialized = false;
        var espChannel = 1;
        var txSuccessCount = 0;
        var txFailCount = 0;
        var rxCount = 0;
        var lastHeartbeat = 0;
        var heartbeatInterval = 5000;

        function generatePairingCode() {
            var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var code = "";
            for (var i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return code;
        }

        function macToString(mac) {
            if (!mac || mac.length !== 6) return "00:00:00:00:00:00";
            var result = "";
            for (var i = 0; i < 6; i++) {
                result += mac[i].toString(16).padStart(2, '0').toUpperCase();
                if (i < 5) result += ":";
            }
            return result;
        }

        function parseMAC(macString) {
            if (!macString || typeof macString !== "string") return null;
            var parts = macString.split(":");
            if (parts.length !== 6) return null;
            var mac = [];
            for (var i = 0; i < 6; i++) {
                mac[i] = parseInt(parts[i], 16);
            }
            return mac;
        }

        return {
            initialize: function(config) {
                config = config || {};
                espChannel = config.channel || 1;

                try {
                    if (typeof espnow !== "undefined") {
                        var initResult = espnow.init({
                            channel: espChannel,
                            callback: function(data, senderMAC) {
                                this.handleReceive(data, senderMAC);
                            }.bind(this)
                        });

                        if (initResult && initResult.success) {
                            isInitialized = true;
                            myMACAddress = initResult.mac || [0, 0, 0, 0, 0, 0];
                            pairingCode = generatePairingCode();
                            espConnectionState = "initialized";

                            return {
                                success: true,
                                mac: macToString(myMACAddress),
                                pairingCode: pairingCode,
                                channel: espChannel
                            };
                        }
                    }
                } catch (e) {
                }

                return {
                    success: false,
                    error: "ESP-NOW not available",
                    simulationMode: true
                };
            },

            isAvailable: function() {
                return typeof espnow !== "undefined";
            },

            getMACAddress: function() {
                return myMACAddress ? macToString(myMACAddress) : null;
            },

            getPairingCode: function() {
                return pairingCode;
            },

            startPairingMode: function(timeout) {
                timeout = timeout || 30000;
                espPairingMode = true;
                espConnectionState = "pairing";
                pairingCode = generatePairingCode();

                pendingPairings = {};

                if (espPairingTimeout) {
                    clearTimeout(espPairingTimeout);
                }

                espPairingTimeout = setTimeout(function() {
                    this.stopPairingMode();
                }.bind(this), timeout);

                return {
                    success: true,
                    pairingCode: pairingCode,
                    timeout: timeout
                };
            },

            stopPairingMode: function() {
                espPairingMode = false;
                espConnectionState = isInitialized ? "initialized" : "disconnected";
                if (espPairingTimeout) {
                    clearTimeout(espPairingTimeout);
                    espPairingTimeout = null;
                }
            },

            pairWithDevice: function(macString, code) {
                var mac = typeof macString === "string" ? parseMAC(macString) : macString;
                if (!mac) return { success: false, error: "Invalid MAC address" };

                var peerInfo = {
                    mac: mac,
                    code: code,
                    pairedAt: Date.now(),
                    lastSeen: Date.now()
                };

                try {
                    if (typeof espnow !== "undefined" && isInitialized) {
                        var addResult = espnow.addPeer(mac);
                        if (addResult && addResult.success) {
                            pairedPeers[macToString(mac)] = peerInfo;
                            espConnectionState = "connected";
                            return { success: true, peerMac: macToString(mac) };
                        }
                    }
                } catch (e) {
                }

                pairedPeers[macToString(mac)] = peerInfo;
                return { success: true, peerMac: macToString(mac), simulationMode: true };
            },

            handlePairingRequest: function(data, senderMAC) {
                if (!espPairingMode) return;

                var macStr = macToString(senderMAC);
                if (pairedPeers[macStr]) return;

                if (data.type === "PAIRING_REQUEST" && data.pairingCode === pairingCode) {
                    var peerInfo = {
                        mac: senderMAC,
                        name: data.deviceName || "Unknown",
                        pairedAt: Date.now(),
                        lastSeen: Date.now()
                    };

                    pairedPeers[macStr] = peerInfo;

                    var response = {
                        type: "PAIRING_RESPONSE",
                        success: true,
                        deviceName: "Bruce Device",
                        playerId: Math.floor(Math.random() * 10000)
                    };

                    this.send(senderMAC, response);

                    if (receiveCallback) {
                        receiveCallback({
                            type: "DEVICE_PAIRED",
                            mac: macStr,
                            name: peerInfo.name
                        });
                    }
                }
            },

            handleReceive: function(data, senderMAC) {
                var macStr = macToString(senderMAC);
                rxCount++;

                if (espPairingMode && data.type === "PAIRING_REQUEST") {
                    this.handlePairingRequest(data, senderMAC);
                    return;
                }

                if (data.type === "HEARTBEAT") {
                    var peer = pairedPeers[macStr];
                    if (peer) {
                        peer.lastSeen = Date.now();
                    }
                    return;
                }

                if (receiveCallback) {
                    receiveCallback(data, macStr);
                }
            },

            send: function(targetMAC, data) {
                var mac = typeof targetMAC === "string" ? parseMAC(targetMAC) : targetMAC;
                if (!mac) return { success: false, error: "Invalid MAC address" };

                var message = typeof data === "string" ? data : JSON.stringify(data);

                try {
                    if (typeof espnow !== "undefined" && isInitialized) {
                        var result = espnow.send(mac, message);
                        if (result && result.success) {
                            txSuccessCount++;
                            return { success: true, bytes: message.length };
                        } else {
                            txFailCount++;
                            return { success: false, error: "Send failed" };
                        }
                    }
                } catch (e) {
                }

                txSuccessCount++;
                return { success: true, bytes: message.length, simulationMode: true };
            },

            broadcast: function(data) {
                var success = true;
                var peerMACs = Object.keys(pairedPeers);

                for (var i = 0; i < peerMACs.length; i++) {
                    if (!this.send(peerMACs[i], data)) {
                        success = false;
                    }
                }

                return success;
            },

            setReceiveCallback: function(callback) {
                receiveCallback = callback;
            },

            setSendCallback: function(callback) {
                sendCallback = callback;
            },

            getPairedPeers: function() {
                var peers = [];
                var keys = Object.keys(pairedPeers);
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    peers.push({
                        mac: key,
                        name: pairedPeers[key].name,
                        pairedAt: pairedPeers[key].pairedAt,
                        lastSeen: pairedPeers[key].lastSeen
                    });
                }
                return peers;
            },

            getPeerCount: function() {
                return Object.keys(pairedPeers).length;
            },

            removePeer: function(macString) {
                var mac = typeof macString === "string" ? parseMAC(macString) : macString;
                if (!mac) return false;
                var macStr = macToString(mac);

                try {
                    if (typeof espnow !== "undefined" && isInitialized) {
                        espnow.removePeer(mac);
                    }
                } catch (e) {
                }

                delete pairedPeers[macStr];
                return true;
            },

            removeAllPeers: function() {
                var macs = Object.keys(pairedPeers);
                for (var i = 0; i < macs.length; i++) {
                    this.removePeer(macs[i]);
                }
            },

            getStats: function() {
                return {
                    txSuccess: txSuccessCount,
                    txFailed: txFailCount,
                    rxCount: rxCount,
                    peerCount: this.getPeerCount(),
                    isInitialized: isInitialized,
                    connectionState: espConnectionState,
                    channel: espChannel
                };
            },

            sendHeartbeat: function() {
                var now = Date.now();
                if (now - lastHeartbeat < heartbeatInterval) return;
                lastHeartbeat = now;

                this.broadcast({
                    type: "HEARTBEAT",
                    timestamp: now,
                    mac: this.getMACAddress()
                });
            },

            cleanup: function() {
                this.stopPairingMode();
                this.removeAllPeers();
                isInitialized = false;
                espConnectionState = "disconnected";
                pairedPeers = {};
                receiveCallback = null;
            },

            getConnectionState: function() {
                return espConnectionState;
            },

            isConnected: function() {
                return espConnectionState === "connected" || espConnectionState === "ready";
            }
        };
    }

    function createBluetoothManager() {
        var btInitialized = false;
        var isScanning = false;
        var scanTimeout = null;
        var pairedDevices = {};
        var pendingPairing = null;
        var scanResults = [];
        var btConnectionState = "disconnected";
        var onPairingRequestCallback = null;
        var onConnectionCallback = null;
        var btAddress = null;
        var btDeviceName = "Bruce Controller";

        function generateBTPin() {
            var chars = "0123456789";
            var pin = "";
            for (var i = 0; i < 6; i++) {
                pin += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return pin;
        }

        function macToStringBT(addr) {
            if (!addr || addr.length !== 6) return "00:00:00:00:00:00";
            var result = "";
            for (var i = 0; i < 6; i++) {
                result += addr[i].toString(16).padStart(2, '0').toUpperCase();
                if (i < 5) result += ":";
            }
            return result;
        }

        return {
            initialize: function(config) {
                config = config || {};

                try {
                    if (typeof bluetooth !== "undefined") {
                        var initResult = bluetooth.init({
                            deviceName: config.deviceName || btDeviceName,
                            callback: function(event, data) {
                                if (event === "PAIRING_REQUEST") {
                                    if (onPairingRequestCallback) {
                                        onPairingRequestCallback(data);
                                    }
                                } else if (event === "CONNECTED") {
                                    btConnectionState = "connected";
                                    if (onConnectionCallback) {
                                        onConnectionCallback(data);
                                    }
                                } else if (event === "DISCONNECTED") {
                                    btConnectionState = "disconnected";
                                }
                            }
                        });

                        if (initResult && initResult.success) {
                            btInitialized = true;
                            btAddress = initResult.address || null;
                            btDeviceName = initResult.deviceName || btDeviceName;
                            btConnectionState = "initialized";

                            return {
                                success: true,
                                address: btAddress,
                                deviceName: btDeviceName
                            };
                        }
                    }
                } catch (e) {
                }

                btInitialized = true;
                btConnectionState = "simulation";
                return {
                    success: true,
                    address: "00:11:22:33:44:55",
                    deviceName: btDeviceName,
                    simulationMode: true
                };
            },

            isAvailable: function() {
                return typeof bluetooth !== "undefined";
            },

            isInitialized: function() {
                return btInitialized;
            },

            getAddress: function() {
                return btAddress;
            },

            getDeviceName: function() {
                return btDeviceName;
            },

            getConnectionState: function() {
                return btConnectionState;
            },

            isConnected: function() {
                return btConnectionState === "connected";
            },

            startScanning: function(duration) {
                if (isScanning) return { success: false, error: "Already scanning" };

                duration = duration || 10000;
                isScanning = true;
                scanResults = [];

                try {
                    if (typeof bluetooth !== "undefined" && btInitialized) {
                        bluetooth.startScan({
                            duration: duration,
                            callback: function(device) {
                                if (device && device.address) {
                                    var exists = false;
                                    for (var i = 0; i < scanResults.length; i++) {
                                        if (scanResults[i].address === device.address) {
                                            exists = true;
                                            break;
                                        }
                                    }
                                    if (!exists) {
                                        scanResults.push({
                                            name: device.name || "Unknown Device",
                                            address: device.address,
                                            rssi: device.rssi || 0,
                                            deviceClass: device.deviceClass || "Unknown"
                                        });
                                    }
                                }
                            }
                        });
                    }
                } catch (e) {
                }

                if (scanTimeout) clearTimeout(scanTimeout);
                scanTimeout = setTimeout(function() {
                    this.stopScanning();
                }.bind(this), duration);

                return {
                    success: true,
                    duration: duration
                };
            },

            stopScanning: function() {
                if (!isScanning) return;

                isScanning = false;

                try {
                    if (typeof bluetooth !== "undefined") {
                        bluetooth.stopScan();
                    }
                } catch (e) {
                }

                if (scanTimeout) {
                    clearTimeout(scanTimeout);
                    scanTimeout = null;
                }
            },

            isScanning: function() {
                return isScanning;
            },

            getScanResults: function() {
                return scanResults;
            },

            pair: function(deviceAddress, pin) {
                if (!deviceAddress) return { success: false, error: "No device address provided" };

                var pairingPin = pin || generateBTPin();

                try {
                    if (typeof bluetooth !== "undefined" && btInitialized) {
                        var pairResult = bluetooth.pair({
                            address: deviceAddress,
                            pin: pairingPin,
                            timeout: 30000
                        });

                        if (pairResult && pairResult.success) {
                            var deviceInfo = {
                                address: deviceAddress,
                                name: pairResult.name || "Unknown",
                                pairedAt: Date.now(),
                                lastConnected: null
                            };
                            pairedDevices[deviceAddress] = deviceInfo;
                            return {
                                success: true,
                                device: deviceInfo,
                                pin: pairingPin
                            };
                        } else {
                            return {
                                success: false,
                                error: pairResult.error || "Pairing failed"
                            };
                        }
                    }
                } catch (e) {
                }

                var deviceInfo = {
                    address: deviceAddress,
                    name: "Paired Device",
                    pairedAt: Date.now(),
                    lastConnected: null
                };
                pairedDevices[deviceAddress] = deviceInfo;
                return {
                    success: true,
                    device: deviceInfo,
                    pin: pairingPin,
                    simulationMode: true
                };
            },

            unpair: function(deviceAddress) {
                if (!deviceAddress || !pairedDevices[deviceAddress]) {
                    return { success: false, error: "Device not found" };
                }

                try {
                    if (typeof bluetooth !== "undefined") {
                        bluetooth.unpair({ address: deviceAddress });
                    }
                } catch (e) {
                }

                delete pairedDevices[deviceAddress];
                return { success: true };
            },

            getPairedDevices: function() {
                var result = [];
                for (var addr in pairedDevices) {
                    result.push(pairedDevices[addr]);
                }
                return result;
            },

            connect: function(deviceAddress) {
                if (!deviceAddress) return { success: false, error: "No device address provided" };

                try {
                    if (typeof bluetooth !== "undefined" && btInitialized) {
                        var connResult = bluetooth.connect({
                            address: deviceAddress
                        });

                        if (connResult && connResult.success) {
                            if (pairedDevices[deviceAddress]) {
                                pairedDevices[deviceAddress].lastConnected = Date.now();
                            }
                            btConnectionState = "connected";
                            return { success: true, address: deviceAddress };
                        }
                        return { success: false, error: connResult.error || "Connection failed" };
                    }
                } catch (e) {
                }

                if (pairedDevices[deviceAddress]) {
                    pairedDevices[deviceAddress].lastConnected = Date.now();
                }
                btConnectionState = "connected";
                return { success: true, address: deviceAddress, simulationMode: true };
            },

            disconnect: function(deviceAddress) {
                try {
                    if (typeof bluetooth !== "undefined" && btInitialized) {
                        bluetooth.disconnect({ address: deviceAddress });
                    }
                } catch (e) {
                }
                btConnectionState = "disconnected";
                return { success: true };
            },

            sendData: function(deviceAddress, data) {
                try {
                    if (typeof bluetooth !== "undefined" && btConnectionState === "connected") {
                        return bluetooth.send({
                            address: deviceAddress,
                            data: data
                        });
                    }
                } catch (e) {
                }
                return { success: true, simulationMode: true };
            },

            receiveData: function(callback) {
                try {
                    if (typeof bluetooth !== "undefined") {
                        bluetooth.onData(function(data, senderAddress) {
                            callback(data, senderAddress);
                        });
                    }
                } catch (e) {
                }
            },

            setOnPairingRequest: function(callback) {
                onPairingRequestCallback = callback;
            },

            setOnConnection: function(callback) {
                onConnectionCallback = callback;
            },

            acceptPairing: function(deviceAddress, accept) {
                try {
                    if (typeof bluetooth !== "undefined") {
                        return bluetooth.acceptPairing({
                            address: deviceAddress,
                            accept: accept
                        });
                    }
                } catch (e) {
                }
                return { success: true, simulationMode: true };
            },

            cleanup: function() {
                this.stopScanning();
                btInitialized = false;
                btConnectionState = "disconnected";
                pairedDevices = {};
                pendingPairing = null;
                onPairingRequestCallback = null;
                onConnectionCallback = null;
            }
        };
    }

    function createNetworkDiscovery() {
        var discoveredGames = [];
        var discoverySocket = null;
        var isDiscovering = false;

        return {
            startDiscovery: function() {
                if (isDiscovering) return;

                isDiscovering = true;
                discoveredGames = [];

                try {
                    if (typeof udp !== "undefined") {
                        discoverySocket = udp.createSocket();
                        discoverySocket.bind(8766);

                        discoverySocket.on("message", function(msg) {
                            try {
                                var data = JSON.parse(msg.toString());
                                if (data.type === "GAME_ANNOUNCEMENT") {
                                    var exists = false;
                                    var i;
                                    for (i = 0; i < discoveredGames.length; i++) {
                                        if (discoveredGames[i].hostId === data.hostId) {
                                            exists = true;
                                            break;
                                        }
                                    }
                                    if (!exists) {
                                        discoveredGames.push({
                                            hostId: data.hostId,
                                            hostName: data.hostName,
                                            ip: data.ip,
                                            port: data.port,
                                            playerCount: data.playerCount,
                                            gameName: data.gameName
                                        });
                                    }
                                }
                            } catch (e) {
                            }
                        }.bind(this));

                        var query = JSON.stringify({ type: "GAME_QUERY" });
                        discoverySocket.send(query, 8766, "255.255.255.255");
                    }
                } catch (e) {
                }

                setTimeout(function() {
                    isDiscovering = false;
                    if (discoverySocket && discoverySocket.close) {
                        discoverySocket.close();
                    }
                }, 5000);
            },

            getDiscoveredGames: function() {
                return discoveredGames;
            },

            isDiscovering: function() {
                return isDiscovering;
            },

            announceGame: function(hostName, gameName, port, myId) {
                try {
                    if (typeof udp !== "undefined") {
                        var announcement = JSON.stringify({
                            type: "GAME_ANNOUNCEMENT",
                            hostId: myId,
                            hostName: hostName,
                            gameName: gameName,
                            ip: apIP,
                            port: port,
                            playerCount: Object.keys(multiplayerPlayers).length + 1
                        });

                        var annSocket = udp.createSocket();
                        annSocket.send(announcement, 8766, "255.255.255.255");
                        setTimeout(function() { annSocket.close(); }, 100);
                    }
                } catch (e) {
                }
            }
        };
    }

    function createVRSessionManager() {
        var sessionId = null;
        var hostId = null;
        var isHost = false;
        var maxPlayers = 4;
        var sessionState = "idle";
        var vrCapabilities = {
            headTracking: false,
            controllerTracking: false,
            handTracking: false,
            spatialAudio: false
        };
        var sessionCallbacks = {
            onPlayerJoin: null,
            onPlayerLeave: null,
            onPlayerUpdate: null,
            onSessionError: null,
            onRoomConfig: null
        };
        var roomConfig = null;

        function generateSessionId() {
            var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var result = "";
            for (var i = 0; i < 6; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }

        return {
            createSession: function(config) {
                config = config || {};
                sessionId = generateSessionId();
                hostId = localVRPlayerId || Math.floor(Math.random() * 10000);
                isHost = true;
                maxPlayers = config.maxPlayers || 4;
                sessionState = "waiting";
                vrCapabilities = config.capabilities || vrCapabilities;

                if (config.callbacks) {
                    sessionCallbacks = Object.assign(sessionCallbacks, config.callbacks);
                }

                vrSessionConfig = {
                    sessionId: sessionId,
                    hostId: hostId,
                    maxPlayers: maxPlayers,
                    capabilities: vrCapabilities,
                    timestamp: Date.now()
                };

                return {
                    success: true,
                    sessionId: sessionId,
                    hostId: hostId,
                    isHost: true
                };
            },

            joinSession: function(sessionCode, hostIP, port) {
                sessionId = sessionCode;
                isHost = false;
                sessionState = "connecting";

                return {
                    success: true,
                    sessionId: sessionId,
                    isHost: false
                };
            },

            configureSession: function(config) {
                if (!isHost && !roomConfig) {
                    return { success: false, error: "Only host can configure session" };
                }

                roomConfig = Object.assign({
                    worldScale: 1.0,
                    gravity: -9.8,
                    playAreaRadius: 10,
                    allowVoiceChat: true,
                    allowHandTracking: true,
                    maxLatency: 100,
                    qualitySettings: "high"
                }, config || {});

                if (sessionCallbacks.onRoomConfig) {
                    sessionCallbacks.onRoomConfig(roomConfig);
                }

                return { success: true, config: roomConfig };
            },

            getSessionInfo: function() {
                return {
                    sessionId: sessionId,
                    hostId: hostId,
                    isHost: isHost,
                    state: sessionState,
                    maxPlayers: maxPlayers,
                    capabilities: vrCapabilities,
                    config: roomConfig,
                    localPlayerId: localVRPlayerId
                };
            },

            setCapabilities: function(capabilities) {
                vrCapabilities = Object.assign(vrCapabilities, capabilities);
            },

            setCallback: function(event, callback) {
                if (sessionCallbacks.hasOwnProperty(event)) {
                    sessionCallbacks[event] = callback;
                }
            },

            getState: function() {
                return sessionState;
            },

            setState: function(newState) {
                sessionState = newState;
            },

            close: function() {
                sessionState = "closed";
                sessionId = null;
            }
        };
    }

    function createVRNetworkManager() {
        var peerConnections = {};
        var dataChannels = {};
        var signalingServer = null;
        var localCandidates = [];
        var iceServers = [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
        ];
        var messageQueue = {};
        var connectionState = "disconnected";

        function createPeerConnection(peerId) {
            var config = {
                iceServers: iceServers
            };

            var peerConnection = {
                id: peerId,
                state: "new",
                connection: null,
                dataChannel: null,
                lastPing: 0,
                pingLatency: 0,
                bytesSent: 0,
                bytesReceived: 0,
                quality: 1.0
            };

            peerConnections[peerId] = peerConnection;
            return peerConnection;
        }

        function createDataChannel(peerConnection, label, priority) {
            var channelConfig = {
                ordered: priority === "high",
                maxRetransmits: priority === "high" ? 0 : 100,
                priority: priority
            };

            return {
                label: label,
                priority: priority,
                bufferedAmount: 0,
                readyState: "connecting"
            };
        }

        return {
            initialize: function(config) {
                config = config || {};
                signalingServer = config.signalingServer || null;
                iceServers = config.iceServers || iceServers;

                connectionState = "initialized";
                return { success: true };
            },

            createPeer: function(peerId) {
                return createPeerConnection(peerId);
            },

            removePeer: function(peerId) {
                var peer = peerConnections[peerId];
                if (peer) {
                    if (peer.dataChannel && peer.dataChannel.close) {
                        peer.dataChannel.close();
                    }
                    if (peer.connection && peer.connection.close) {
                        peer.connection.close();
                    }
                }
                delete peerConnections[peerId];
                delete dataChannels[peerId];
                delete messageQueue[peerId];
            },

            getPeer: function(peerId) {
                return peerConnections[peerId];
            },

            getAllPeers: function() {
                return Object.keys(peerConnections);
            },

            sendToPeer: function(peerId, data, priority) {
                var peer = peerConnections[peerId];
                if (!peer || !peer.dataChannel || peer.dataChannel.readyState !== "open") {
                    if (!messageQueue[peerId]) {
                        messageQueue[peerId] = [];
                    }
                    messageQueue[peerId].push({ data: data, priority: priority });
                    return false;
                }

                try {
                    var message = typeof data === "string" ? data : JSON.stringify(data);
                    peer.dataChannel.send(message);
                    peer.bytesSent += message.length;
                    return true;
                } catch (e) {
                    return false;
                }
            },

            broadcastToAll: function(data, priority) {
                var peers = Object.keys(peerConnections);
                var success = true;
                for (var i = 0; i < peers.length; i++) {
                    if (!this.sendToPeer(peers[i], data, priority)) {
                        success = false;
                    }
                }
                return success;
            },

            queueMessage: function(peerId, data, priority) {
                if (!messageQueue[peerId]) {
                    messageQueue[peerId] = [];
                }
                messageQueue[peerId].push({ data: data, priority: priority });
            },

            processQueuedMessages: function(peerId) {
                var queue = messageQueue[peerId];
                if (!queue || queue.length === 0) return;

                queue.sort(function(a, b) {
                    var priorityOrder = { high: 0, medium: 1, low: 2 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                });

                while (queue.length > 0 && this.sendToPeer(peerId, queue[0].data, queue[0].priority)) {
                    queue.shift();
                }
            },

            getConnectionStats: function(peerId) {
                var peer = peerConnections[peerId];
                if (!peer) return null;

                return {
                    state: peer.state,
                    latency: peer.pingLatency,
                    quality: peer.quality,
                    bytesSent: peer.bytesSent,
                    bytesReceived: peer.bytesReceived,
                    lastPing: peer.lastPing
                };
            },

            setPing: function(peerId, latency) {
                var peer = peerConnections[peerId];
                if (peer) {
                    peer.pingLatency = latency;
                    peer.lastPing = Date.now();
                    peer.quality = Math.max(0, 1 - (latency - 50) / 200);
                }
            },

            getConnectionState: function() {
                return connectionState;
            },

            setConnectionState: function(state) {
                connectionState = state;
            },

            closeAll: function() {
                var peers = Object.keys(peerConnections);
                for (var i = 0; i < peers.length; i++) {
                    this.removePeer(peers[i]);
                }
                connectionState = "disconnected";
            }
        };
    }

    function createVRInputManager() {
        var controllers = {
            left: null,
            right: null
        };
        var hands = {
            left: null,
            right: null
        };
        var gamepadIndex = { left: -1, right: -1 };
        var inputCallbacks = {
            onControllerConnect: null,
            onControllerDisconnect: null,
            onButtonPress: null,
            onTriggerChange: null,
            onAxisChange: null
        };
        var buttonMappings = {
            trigger: "trigger",
            grip: "grip",
            thumbstick: "thumbstick",
            buttonA: "buttonA",
            buttonB: "buttonB",
            xButton: "xButton",
            yButton: "yButton"
        };
        var hapticActuators = {};

        function pollGamepads() {
            var gamepads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];

            for (var i = 0; i < gamepads.length; i++) {
                var gamepad = gamepads[i];
                if (!gamepad) continue;

                var hand = gamepad.hand || (gamepad.index % 2 === 0 ? "left" : "right");

                if (!controllers[hand] || controllers[hand].index !== gamepad.index) {
                    controllers[hand] = {
                        index: gamepad.index,
                        hand: hand,
                        connected: gamepad.connected,
                        pose: gamepad.pose || null,
                        buttons: gamepad.buttons || [],
                        axes: gamepad.axes || [],
                        hapticActuators: gamepad.hapticActuators || []
                    };

                    if (inputCallbacks.onControllerConnect) {
                        inputCallbacks.onControllerConnect(hand, controllers[hand]);
                    }
                } else {
                    controllers[hand].connected = gamepad.connected;
                    controllers[hand].buttons = gamepad.buttons;
                    controllers[hand].axes = gamepad.axes;
                    controllers[hand].pose = gamepad.pose;
                }
            }
        }

        return {
            initialize: function() {
                if (typeof window !== "undefined") {
                    window.addEventListener("gamepadconnected", function(e) {
                        if (inputCallbacks.onControllerConnect) {
                            inputCallbacks.onControllerConnect(e.gamepad.hand || "unknown", e.gamepad);
                        }
                    });

                    window.addEventListener("gamepaddisconnected", function(e) {
                        if (inputCallbacks.onControllerDisconnect) {
                            inputCallbacks.onControllerDisconnect(e.gamepad.hand || "unknown");
                        }
                    });
                }

                return { success: true };
            },

            poll: function() {
                pollGamepads();
                return {
                    left: this.getControllerState("left"),
                    right: this.getControllerState("right")
                };
            },

            getControllerState: function(hand) {
                var controller = controllers[hand];
                if (!controller || !controller.connected) {
                    return null;
                }

                var state = {
                    hand: hand,
                    connected: true,
                    timestamp: Date.now()
                };

                if (controller.buttons.length > 0) {
                    state.trigger = controller.buttons[0] ? controller.buttons[0].value : 0;
                    state.grip = controller.buttons[1] ? controller.buttons[1].value : 0;
                    state.buttonA = controller.buttons[4] ? controller.buttons[4].pressed : false;
                    state.buttonB = controller.buttons[5] ? controller.buttons[5].pressed : false;
                    state.xButton = controller.buttons[6] ? controller.buttons[6].pressed : false;
                    state.yButton = controller.buttons[7] ? controller.buttons[7].pressed : false;
                }

                if (controller.axes.length >= 4) {
                    state.thumbstick = {
                        x: controller.axes[0],
                        y: controller.axes[1]
                    };
                }

                if (controller.pose) {
                    state.position = controller.pose.position || { x: 0, y: 0, z: 0 };
                    state.rotation = controller.pose.orientation || { x: 0, y: 0, z: 0, w: 1 };
                }

                return state;
            },

            getHapticActuator: function(hand) {
                var controller = controllers[hand];
                if (controller && controller.hapticActuators && controller.hapticActuators.length > 0) {
                    return controller.hapticActuators[0];
                }
                return null;
            },

            triggerHaptic: function(hand, intensity, duration, frequency) {
                var actuator = this.getHapticActuator(hand);
                if (actuator && typeof actuator.pulse === "function") {
                    actuator.pulse(intensity, duration);
                    return true;
                }
                return false;
            },

            triggerAllHaptic: function(intensity, duration, frequency) {
                this.triggerHaptic("left", intensity, duration, frequency);
                this.triggerHaptic("right", intensity, duration, frequency);
            },

            setCallback: function(event, callback) {
                if (inputCallbacks.hasOwnProperty(event)) {
                    inputCallbacks[event] = callback;
                }
            },

            getConnectedControllers: function() {
                var connected = [];
                if (controllers.left && controllers.left.connected) connected.push("left");
                if (controllers.right && controllers.right.connected) connected.push("right");
                return connected;
            }
        };
    }

    function createVRAvatarManager() {
        var avatars = {};
        var avatarGeometry = {
            head: null,
            leftHand: null,
            rightHand: null,
            body: null
        };
        var avatarMaterials = {};
        var playerColors = {};

        function generateAvatarColor(playerId) {
            var colors = [
                { r: 0, g: 200, b: 255 },
                { r: 255, g: 100, b: 100 },
                { r: 100, g: 255, b: 100 },
                { r: 255, g: 255, b: 100 },
                { r: 255, g: 100, b: 255 },
                { r: 100, g: 255, b: 255 },
                { r: 255, g: 150, b: 50 },
                { r: 150, g: 100, b: 255 }
            ];
            return colors[playerId % colors.length];
        }

        function createAvatarMesh(type, color, size) {
            size = size || 1;
            var mesh = {
                type: type,
                color: color,
                size: size,
                vertices: [],
                faces: [],
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0, w: 1 },
                scale: { x: 1, y: 1, z: 1 }
            };

            if (type === "head") {
                mesh = createCube(0, 0, 0, 15 * size, displayModule.color(color.r, color.g, color.b));
                mesh.type = "head";
            } else if (type === "hand") {
                mesh = createCube(0, 0, 0, 8 * size, displayModule.color(color.r, color.g, color.b));
                mesh.type = "hand";
            } else if (type === "body") {
                mesh = createCube(0, 0, 0, 30 * size, displayModule.color(Math.floor(color.r * 0.7), Math.floor(color.g * 0.7), Math.floor(color.b * 0.7)));
                mesh.type = "body";
            }

            return mesh;
        }

        return {
            initialize: function() {
                avatarMaterials.head = { color: { r: 200, g: 200, b: 200 } };
                avatarMaterials.leftHand = { color: { r: 100, g: 180, b: 255 } };
                avatarMaterials.rightHand = { color: { r: 255, g: 140, b: 100 } };
                avatarMaterials.body = { color: { r: 80, g: 80, b: 100 } };

                return { success: true };
            },

            createAvatar: function(playerId, isLocal) {
                var color = playerColors[playerId] || generateAvatarColor(playerId);
                playerColors[playerId] = color;

                var avatar = {
                    playerId: playerId,
                    isLocal: isLocal,
                    color: color,
                    meshes: {
                        head: createAvatarMesh("head", color, isLocal ? 0.8 : 1.0),
                        leftHand: createAvatarMesh("hand", { r: color.r * 0.8, g: color.g * 0.8, b: color.b * 0.8 }, 0.6),
                        rightHand: createAvatarMesh("hand", { r: color.r * 0.8, g: color.g * 0.8, b: color.b * 0.8 }, 0.6),
                        body: createAvatarMesh("body", { r: color.r * 0.6, g: color.g * 0.6, b: color.b * 0.6 }, 1.0)
                    },
                    poses: {
                        head: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
                        leftHand: { position: { x: -20, y: -10, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
                        rightHand: { position: { x: 20, y: -10, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }
                    },
                    visible: true,
                    interpolationBuffer: {
                        head: [],
                        leftHand: [],
                        rightHand: []
                    },
                    lastUpdateTime: 0
                };

                if (isLocal) {
                    avatar.meshes.head.visible = false;
                }

                avatars[playerId] = avatar;
                return avatar;
            },

            updateAvatarPose: function(playerId, poses) {
                var avatar = avatars[playerId];
                if (!avatar) return false;

                var now = Date.now();
                var posesToUpdate = ["head", "leftHand", "rightHand"];

                for (var i = 0; i < posesToUpdate.length; i++) {
                    var part = posesToUpdate[i];
                    if (poses[part]) {
                        var newPose = poses[part];
                        var buffer = avatar.interpolationBuffer[part];

                        buffer.push({
                            pose: newPose,
                            timestamp: now,
                            receiveTime: now
                        });

                        while (buffer.length > 5) {
                            buffer.shift();
                        }
                    }
                }

                avatar.lastUpdateTime = now;
                return true;
            },

            getInterpolatedPose: function(playerId, part, alpha) {
                var avatar = avatars[playerId];
                if (!avatar) return null;

                var buffer = avatar.interpolationBuffer[part];
                if (!buffer || buffer.length === 0) return avatar.poses[part];

                alpha = alpha || 0.3;

                if (buffer.length === 1) {
                    return buffer[0].pose;
                }

                var latest = buffer[buffer.length - 1];
                var secondLatest = buffer[buffer.length - 2];

                var t = alpha;
                var latestTime = latest.timestamp;
                var targetTime = latestTime - vrLatencyCompensation;

                while (buffer.length > 2 && buffer[buffer.length - 2].timestamp > targetTime) {
                    t = alpha * 0.5;
                    latest = buffer[buffer.length - 2];
                    secondLatest = buffer[buffer.length - 3] || secondLatest;
                }

                var interpPose = {
                    position: {
                        x: latest.pose.position.x * t + secondLatest.pose.position.x * (1 - t),
                        y: latest.pose.position.y * t + secondLatest.pose.position.y * (1 - t),
                        z: latest.pose.position.z * t + secondLatest.pose.position.z * (1 - t)
                    },
                    rotation: this.slerpQuaternion(
                        latest.pose.rotation,
                        secondLatest.pose.rotation,
                        t
                    )
                };

                return interpPose;
            },

            slerpQuaternion: function(q1, q2, t) {
                var cosHalfTheta = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;

                if (Math.abs(cosHalfTheta) >= 1.0) {
                    return q1;
                }

                var halfTheta = Math.acos(cosHalfTheta);
                var sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

                if (Math.abs(sinHalfTheta) < 0.001) {
                    return {
                        x: q1.x * 0.5 + q2.x * 0.5,
                        y: q1.y * 0.5 + q2.y * 0.5,
                        z: q1.z * 0.5 + q2.z * 0.5,
                        w: q1.w * 0.5 + q2.w * 0.5
                    };
                }

                var ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
                var ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

                return {
                    x: q1.x * ratioA + q2.x * ratioB,
                    y: q1.y * ratioA + q2.y * ratioB,
                    z: q1.z * ratioA + q2.z * ratioB,
                    w: q1.w * ratioA + q2.w * ratioB
                };
            },

            getAvatar: function(playerId) {
                return avatars[playerId];
            },

            getAllAvatars: function() {
                return avatars;
            },

            setAvatarVisibility: function(playerId, visible) {
                var avatar = avatars[playerId];
                if (avatar) {
                    avatar.visible = visible;
                }
            },

            removeAvatar: function(playerId) {
                delete avatars[playerId];
                delete playerColors[playerId];
                delete vrInterpolationBuffer[playerId];
            },

            clearAll: function() {
                avatars = {};
                playerColors = {};
                vrInterpolationBuffer = {};
            },

            applyPoseToMesh: function(avatar, part) {
                var mesh = avatar.meshes[part];
                var pose = avatar.poses[part];

                if (mesh && pose) {
                    mesh.position.x = pose.position.x;
                    mesh.position.y = pose.position.y;
                    mesh.position.z = pose.position.z;
                    mesh.rotation.x = pose.rotation.x;
                    mesh.rotation.y = pose.rotation.y;
                    mesh.rotation.z = pose.rotation.z;
                    mesh.rotation.w = pose.rotation.w;
                }
            },

            updateAllMeshes: function() {
                var playerIds = Object.keys(avatars);
                for (var i = 0; i < playerIds.length; i++) {
                    var avatar = avatars[playerIds[i]];
                    if (!avatar.visible) continue;

                    var parts = ["head", "leftHand", "rightHand", "body"];
                    for (var j = 0; j < parts.length; j++) {
                        var part = parts[j];
                        var interpolatedPose = this.getInterpolatedPose(avatar.playerId, part);
                        if (interpolatedPose) {
                            avatar.poses[part] = interpolatedPose;
                            this.applyPoseToMesh(avatar, part);
                        }
                    }
                }
            },

            renderToBuffer: function(buffer) {
                var playerIds = Object.keys(avatars);
                for (var i = 0; i < playerIds.length; i++) {
                    var avatar = avatars[playerIds[i]];
                    if (!avatar.visible) continue;

                    var parts = ["body", "head", "leftHand", "rightHand"];
                    for (var j = 0; j < parts.length; j++) {
                        var part = parts[j];
                        var mesh = avatar.meshes[part];
                        if (mesh && mesh.type !== "line3d") {
                            renderMeshToBuffer(mesh, buffer);
                        }
                    }
                }
            }
        };
    }

    function createVRSpatialAudio() {
        var listeners = {};
        var sources = {};
        var audioContext = null;
        var masterGain = null;
        var voiceStreams = {};
        var isEnabled = false;

        function initAudioContext() {
            if (typeof window !== "undefined" && window.AudioContext) {
                audioContext = new window.AudioContext();
                masterGain = audioContext.createGain();
                masterGain.gain.value = 1.0;
                masterGain.connect(audioContext.destination);
                return true;
            }
            return false;
        }

        return {
            initialize: function() {
                isEnabled = initAudioContext();
                return { success: isEnabled };
            },

            setMasterVolume: function(volume) {
                if (masterGain) {
                    masterGain.gain.value = Math.max(0, Math.min(1, volume));
                }
            },

            createPositionalAudio: function(id, options) {
                if (!audioContext || !isEnabled) return null;

                options = options || {};
                var panner = audioContext.createPanner();
                panner.panningModel = "HRTF";
                panner.distanceModel = "inverse";
                panner.refDistance = 1;
                panner.maxDistance = 10000;
                panner.rolloffFactor = 1;
                panner.coneInnerAngle = 360;
                panner.coneOuterAngle = 360;
                panner.coneOuterGain = 0;

                var source = audioContext.createSource();
                source.connect(panner);
                panner.connect(masterGain);

                sources[id] = {
                    panner: panner,
                    source: source,
                    position: { x: 0, y: 0, z: 0 },
                    options: options
                };

                return sources[id];
            },

            updateSourcePosition: function(id, position, orientation) {
                var source = sources[id];
                if (!source) return false;

                if (source.panner.positionX) {
                    source.panner.positionX.value = position.x;
                    source.panner.positionY.value = position.y;
                    source.panner.positionZ.value = position.z;
                } else {
                    source.panner.setPosition(position.x, position.y, position.z);
                }

                source.position = position;
                return true;
            },

            setListenerPosition: function(playerId, position, forward, up) {
                var listener = listeners[playerId];
                if (!listener && audioContext) {
                    listener = audioContext.listener;
                    listeners[playerId] = listener;
                }

                if (listener) {
                    if (listener.positionX) {
                        listener.positionX.value = position.x;
                        listener.positionY.value = position.y;
                        listener.positionZ.value = position.z;
                        if (forward) {
                            listener.forwardX.value = forward.x;
                            listener.forwardY.value = forward.y;
                            listener.forwardZ.value = forward.z;
                        }
                        if (up) {
                            listener.upX.value = up.x;
                            listener.upY.value = up.y;
                            listener.upZ.value = up.z;
                        }
                    } else {
                        listener.setPosition(position.x, position.y, position.z);
                        if (forward) listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
                    }
                }

                return true;
            },

            attachVoiceStream: function(playerId, stream) {
                if (!audioContext) return false;

                var source = audioContext.createMediaStreamSource(stream);
                var gainNode = audioContext.createGain();
                gainNode.gain.value = 1.0;

                source.connect(gainNode);
                gainNode.connect(masterGain);

                voiceStreams[playerId] = {
                    source: source,
                    gain: gainNode,
                    stream: stream
                };

                return true;
            },

            mutePlayer: function(playerId, muted) {
                var voiceStream = voiceStreams[playerId];
                if (voiceStream && voiceStream.gain) {
                    voiceStream.gain.gain.value = muted ? 0 : 1;
                    return true;
                }
                return false;
            },

            removeSource: function(id) {
                var source = sources[id];
                if (source) {
                    if (source.source.disconnect) source.source.disconnect();
                    if (source.panner.disconnect) source.panner.disconnect();
                    delete sources[id];
                }
            },

            cleanup: function() {
                var sourceIds = Object.keys(sources);
                for (var i = 0; i < sourceIds.length; i++) {
                    this.removeSource(sourceIds[i]);
                }

                var voiceIds = Object.keys(voiceStreams);
                for (var j = 0; j < voiceIds.length; j++) {
                    this.mutePlayer(voiceIds[j], true);
                }

                voiceStreams = {};
                listeners = {};
            },

            getSourceCount: function() {
                return Object.keys(sources).length;
            }
        };
    }

    function createVRPerformanceManager() {
        var metrics = {
            fps: 0,
            frameTime: 0,
            latency: 0,
            packetLoss: 0,
            bandwidth: 0,
            quality: 1.0
        };
        var history = {
            frameTimes: [],
            latencies: []
        };
        var config = {
            targetFPS: 90,
            maxLatency: 100,
            bandwidthLimit: 1000000,
            adaptiveQuality: true,
            minQuality: 0.3,
            maxQuality: 1.0
        };
        var qualityLevel = "high";

        return {
            initialize: function(options) {
                config = Object.assign(config, options || {});
                return { success: true };
            },

            updateMetrics: function(newMetrics) {
                metrics = Object.assign(metrics, newMetrics);

                if (metrics.frameTime > 0) {
                    history.frameTimes.push(metrics.frameTime);
                    if (history.frameTimes.length > 30) history.frameTimes.shift();

                    metrics.fps = 1000 / metrics.frameTime;
                }

                if (metrics.latency > 0) {
                    history.latencies.push(metrics.latency);
                    if (history.latencies.length > 10) history.latencies.shift();
                }

                if (config.adaptiveQuality) {
                    this.adjustQuality();
                }
            },

            adjustQuality: function() {
                var avgFrameTime = this.getAverage(history.frameTimes);
                var avgLatency = this.getAverage(history.latencies);

                var targetFrameTime = 1000 / config.targetFPS;
                var quality = config.maxQuality;

                if (avgFrameTime > targetFrameTime * 1.5) {
                    quality = Math.max(config.minQuality, quality - 0.2);
                } else if (avgFrameTime < targetFrameTime * 1.1) {
                    quality = Math.min(config.maxQuality, quality + 0.1);
                }

                if (avgLatency > config.maxLatency * 1.5) {
                    quality = Math.max(config.minQuality, quality - 0.15);
                }

                metrics.quality = quality;

                if (quality < 0.5) {
                    qualityLevel = "low";
                    vrAvatarLOD = 1;
                } else if (quality < 0.75) {
                    qualityLevel = "medium";
                    vrAvatarLOD = 2;
                } else {
                    qualityLevel = "high";
                    vrAvatarLOD = 3;
                }

                return quality;
            },

            getAverage: function(arr) {
                if (arr.length === 0) return 0;
                var sum = 0;
                for (var i = 0; i < arr.length; i++) {
                    sum += arr[i];
                }
                return sum / arr.length;
            },

            getMetrics: function() {
                return Object.assign({}, metrics);
            },

            getConfig: function() {
                return Object.assign({}, config);
            },

            setConfig: function(newConfig) {
                config = Object.assign(config, newConfig);
            },

            getQualityLevel: function() {
                return qualityLevel;
            },

            shouldReduceUpdates: function() {
                return metrics.quality < 0.5 || metrics.fps < config.targetFPS * 0.7;
            }
        };
    }

    function getVRHeadPose() {
        if (typeof navigator !== "undefined" && navigator.getGamepads) {
            var gamepads = navigator.getGamepads();
            for (var i = 0; i < gamepads.length; i++) {
                var gamepad = gamepads[i];
                if (gamepad && gamepad.pose && gamepad.pose.hasPosition) {
                    return {
                        position: gamepad.pose.position || { x: 0, y: 0, z: 0 },
                        rotation: gamepad.pose.orientation || { x: 0, y: 0, z: 0, w: 1 },
                        timestamp: Date.now()
                    };
                }
            }
        }

        if (camera3D) {
            return {
                position: { x: camera3D.x, y: camera3D.y, z: camera3D.z },
                rotation: {
                    x: 0,
                    y: Math.sin(camera3D.yaw / 2),
                    z: 0,
                    w: Math.cos(camera3D.yaw / 2)
                },
                timestamp: Date.now()
            };
        }

        return {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            timestamp: Date.now()
        };
    }

    function broadcastVRPose(headPose, controllerPoses) {
        if (!vrNetworkManager || !isVRSession) return false;

        var message = {
            type: "VR_HEAD_POSE",
            playerId: localVRPlayerId,
            head: headPose,
            controllers: controllerPoses,
            timestamp: Date.now()
        };

        return vrNetworkManager.broadcastToAll(message, "high");
    }

    function applyRemoteVRPose(peerId, message) {
        if (!vrAvatarManager) return;

        var poses = {
            head: message.head,
            leftHand: message.controllers ? message.controllers.left : null,
            rightHand: message.controllers ? message.controllers.right : null
        };

        vrAvatarManager.updateAvatarPose(peerId, poses);

        if (vrSpatialAudio) {
            vrSpatialAudio.setListenerPosition(
                peerId,
                message.head.position,
                { x: 0, y: 0, z: -1 },
                { x: 0, y: 1, z: 0 }
            );
        }
    }

    function setupWifiAP() {
        if (typeof wifi !== "undefined" && wifi.startAP) {
            wifi.startAP(apSSID, apPassword);
            delay(500);
        }
    }

    function stopWifiControl() {
        wifiRunning = false;
        if (wifiServer && wifiServer.stop) {
            wifiServer.stop();
        }
        if (typeof wifi !== "undefined" && wifi.stopAP) {
            wifi.stopAP();
        }
    }

    function startWifiControl() {
        if (wifiRunning) {
            return;
        }
        wifiRunning = true;
        setupWifiAP();
        startWebServer();
        dialogModule.info("WiFi Control Started\n\nSSID: " + apSSID + "\nPassword: " + apPassword + "\n\nConnect to this WiFi and open http://" + apIP + " in your browser.", false);
    }

    function startBluetoothMenu() {
        if (!initBluetoothManager()) {
            dialogModule.error("Bluetooth not available on this device", true);
            return;
        }

        var running = true;
        var selectedIndex = 0;
        var options = [
            ["Scan Devices", "bt_scan"],
            ["Controller Pairing", "bt_controller"],
            ["Paired Devices", "bt_paired"],
            ["Bluetooth Status", "bt_status"],
            ["Back", "back"]
        ];

        while (running) {
            displayModule.fill(displayModule.color(0, 0, 0));

            displayModule.setTextSize(2);
            displayModule.setTextAlign("center", "middle");
            displayModule.drawText("Bluetooth Manager", 64, 12);

            displayModule.setTextSize(1);
            var y = 32;

            var btState = bluetoothManager.getConnectionState();
            var btAddr = bluetoothManager.getAddress() || "N/A";
            displayModule.setTextColor(displayModule.color(0, 255, 0));
            displayModule.drawText("Status: " + btState, 64, 24);
            displayModule.setTextColor(displayModule.color(255, 255, 255));
            displayModule.drawText("Address: " + btAddr, 64, 34);

            y = 44;
            var i;
            for (i = 0; i < options.length; i++) {
                var prefix = i === selectedIndex ? "> " : "  ";
                displayModule.drawText(prefix + (i + 1) + ". " + options[i][0], 10, y);
                y += 10;
            }

            displayModule.display();

            var key = keyboardModule.getKeyPress();
            if (key === "up") {
                selectedIndex = (selectedIndex - 1 + options.length) % options.length;
            } else if (key === "down") {
                selectedIndex = (selectedIndex + 1) % options.length;
            } else if (key === "ok" || key === "enter") {
                if (options[selectedIndex][1] === "bt_scan") {
                    scanBluetoothDevices();
                } else if (options[selectedIndex][1] === "bt_controller") {
                    startControllerPairing();
                } else if (options[selectedIndex][1] === "bt_paired") {
                    showPairedBluetoothDevices();
                } else if (options[selectedIndex][1] === "bt_status") {
                    showBluetoothStatus();
                } else if (options[selectedIndex][1] === "back") {
                    running = false;
                }
            } else if (key === "back") {
                running = false;
            }

            delay(100);
        }
    }

    function scanBluetoothDevices() {
        dialogModule.info("Scanning for Bluetooth devices...\nThis may take up to 10 seconds.", false);

        var result = bluetoothManager.startScanning(10000);

        if (result.success) {
            delay(10500);

            var devices = bluetoothManager.getScanResults();
            bluetoothManager.stopScanning();

            if (devices.length === 0) {
                dialogModule.info("No Bluetooth devices found.\n\nMake sure the device you want to pair is discoverable.", true);
                return;
            }

            var deviceList = "Found " + devices.length + " device(s):\n\n";
            var i;
            for (i = 0; i < devices.length; i++) {
                deviceList += (i + 1) + ". " + (devices[i].name || "Unknown") + "\n";
                deviceList += "   " + devices[i].address + "\n\n";
            }
            deviceList += "\nEnter the number to pair, or BACK to cancel.";

            var choice = dialogModule.prompt(deviceList, 2, "");

            if (choice && parseInt(choice) >= 1 && parseInt(choice) <= devices.length) {
                var selectedDevice = devices[parseInt(choice) - 1];
                pairBluetoothDevice(selectedDevice.address);
            }
        } else {
            dialogModule.error("Failed to start scanning: " + (result.error || "Unknown error"), true);
        }
    }

    function pairBluetoothDevice(address) {
        var pairResult = bluetoothManager.pair(address);

        if (pairResult.success) {
            dialogModule.success(
                "Pairing Successful!\n\n" +
                "Device: " + (pairResult.device.name || "Unknown") + "\n" +
                "Address: " + address + "\n" +
                "PIN: " + pairResult.pin + "\n\n" +
                "The device has been paired and can now connect to Bruce.",
                true
            );
        } else {
            dialogModule.error("Pairing failed: " + (pairResult.error || "Unknown error"), true);
        }
    }

    function showPairedBluetoothDevices() {
        var devices = bluetoothManager.getPairedDevices();

        if (devices.length === 0) {
            dialogModule.info("No paired Bluetooth devices.\n\nUse 'Scan Devices' to find and pair new devices.", true);
            return;
        }

        var deviceList = "Paired Devices (" + devices.length + "):\n\n";
        var i;
        for (i = 0; i < devices.length; i++) {
            deviceList += (i + 1) + ". " + (devices[i].name || devices[i].address) + "\n";
            deviceList += "   " + devices[i].address + "\n";
            if (devices[i].lastConnected) {
                deviceList += "   Last connected: " + new Date(devices[i].lastConnected).toLocaleString() + "\n";
            }
            deviceList += "\n";
        }
        deviceList += "\nEnter number to connect, or BACK to go back.";

        var choice = dialogModule.prompt(deviceList, 3, "");

        if (choice && parseInt(choice) >= 1 && parseInt(choice) <= devices.length) {
            var selectedDevice = devices[parseInt(choice) - 1];
            var connResult = bluetoothManager.connect(selectedDevice.address);

            if (connResult.success) {
                dialogModule.success("Connected to " + (selectedDevice.name || selectedDevice.address) + "!", true);
            } else {
                dialogModule.error("Connection failed: " + (connResult.error || "Unknown error"), true);
            }
        }
    }

    function showBluetoothStatus() {
        var status = {
            address: bluetoothManager.getAddress(),
            deviceName: bluetoothManager.getDeviceName(),
            connectionState: bluetoothManager.getConnectionState(),
            isScanning: bluetoothManager.isScanning(),
            isConnected: bluetoothManager.isConnected(),
            pairedCount: bluetoothManager.getPairedDevices().length
        };

        var statusText = "Bluetooth Status\n\n";
        statusText += "Address: " + status.address + "\n";
        statusText += "Name: " + status.deviceName + "\n";
        statusText += "State: " + status.connectionState + "\n";
        statusText += "Paired Devices: " + status.pairedCount + "\n";
        statusText += "\n" + status.address;

        dialogModule.info(statusText, true);
    }

    function startControllerPairing() {
        if (!initBluetoothManager()) {
            dialogModule.error("Bluetooth not available on this device", true);
            return;
        }

        btControllerManager = createBluetoothControllerManager();
        var initResult = btControllerManager.initialize();

        if (!initResult.success) {
            dialogModule.error("Failed to initialize controller manager: " + (initResult.error || "Unknown error"), true);
            return;
        }

        var running = true;
        var selectedIndex = 0;
        var options = [
            ["Scan for Controllers", "scan_controller"],
            ["Pair with Device", "manual_pair"],
            ["Test Controller", "test_controller"],
            ["Button Mapping", "button_mapping"],
            ["Paired Controllers", "view_paired"],
            ["Back", "back"]
        ];

        while (running) {
            displayModule.fill(displayModule.color(0, 0, 0));

            displayModule.setTextSize(2);
            displayModule.setTextAlign("center", "middle");
            displayModule.drawText("Controller Pairing", 64, 12);

            displayModule.setTextSize(1);
            var y = 32;

            var controllerCount = btControllerManager.getPairedControllerCount();
            var activeStatus = btActiveController ? "Active: " + btActiveController.name : "No active controller";
            displayModule.setTextColor(displayModule.color(0, 255, 0));
            displayModule.drawText("Paired: " + controllerCount, 64, 24);
            displayModule.setTextColor(displayModule.color(255, 255, 255));
            displayModule.drawText(activeStatus, 64, 34);

            y = 46;
            var i;
            for (i = 0; i < options.length; i++) {
                var prefix = i === selectedIndex ? "> " : "  ";
                displayModule.drawText(prefix + (i + 1) + ". " + options[i][0], 10, y);
                y += 10;
            }

            displayModule.display();

            var key = keyboardModule.getKeyPress();
            if (key === "up") {
                selectedIndex = (selectedIndex - 1 + options.length) % options.length;
            } else if (key === "down") {
                selectedIndex = (selectedIndex + 1) % options.length;
            } else if (key === "ok" || key === "enter") {
                if (options[selectedIndex][1] === "scan_controller") {
                    scanForControllers();
                } else if (options[selectedIndex][1] === "manual_pair") {
                    manualPairController();
                } else if (options[selectedIndex][1] === "test_controller") {
                    testController();
                } else if (options[selectedIndex][1] === "button_mapping") {
                    showButtonMapping();
                } else if (options[selectedIndex][1] === "view_paired") {
                    showPairedControllers();
                } else if (options[selectedIndex][1] === "back") {
                    running = false;
                }
            } else if (key === "back") {
                running = false;
            }

            delay(100);
        }
    }

    function scanForControllers() {
        dialogModule.info("Scanning for Bluetooth controllers...\n\nPut your controller in pairing mode.\nThis takes up to 10 seconds.", false);

        var result = btControllerManager.startScanning(10000);

        if (result.success) {
            delay(10500);

            var controllers = btControllerManager.getScanResults();
            btControllerManager.stopScanning();

            var controllerDevices = [];
            var j;
            for (j = 0; j < controllers.length; j++) {
                if (isLikelyController(controllers[j])) {
                    controllerDevices.push(controllers[j]);
                }
            }

            if (controllerDevices.length === 0) {
                dialogModule.info("No Bluetooth controllers found.\n\nMake sure your controller is in pairing mode.\nCommon names: Xbox, PS4, PS5, Switch, Gamepad, Controller", true);
                return;
            }

            var deviceList = "Found " + controllerDevices.length + " controller(s):\n\n";
            var i;
            for (i = 0; i < controllerDevices.length; i++) {
                deviceList += (i + 1) + ". " + controllerDevices[i].name + "\n";
                deviceList += "   " + controllerDevices[i].address + "\n";
                if (controllerDevices[i].rssi) {
                    deviceList += "   Signal: " + getSignalStrength(controllerDevices[i].rssi) + "\n";
                }
                deviceList += "\n";
            }
            deviceList += "\nEnter number to pair, or BACK to cancel.";

            var choice = dialogModule.prompt(deviceList, 2, "");

            if (choice && parseInt(choice) >= 1 && parseInt(choice) <= controllerDevices.length) {
                var selectedDevice = controllerDevices[parseInt(choice) - 1];
                pairController(selectedDevice);
            }
        } else {
            dialogModule.error("Failed to start scanning: " + (result.error || "Unknown error"), true);
        }
    }

    function isLikelyController(device) {
        var controllerNames = ["xbox", "playstation", "ps4", "ps5", "switch", "gamepad", "game controller", "controller", "joystick", "dualshock", "dualsense", "joy-con", "joycon", "pro controller", "pro-controller", "wireless controller", "bt controller", "gamepad"];
        var name = (device.name || "").toLowerCase();
        var deviceClass = (device.deviceClass || "").toLowerCase();

        var k;
        for (k = 0; k < controllerNames.length; k++) {
            if (name.indexOf(controllerNames[k]) !== -1 || deviceClass.indexOf(controllerNames[k]) !== -1) {
                return true;
            }
        }

        if (device.deviceClass && (device.deviceClass.indexOf("Game") !== -1 || device.deviceClass.indexOf("Controller") !== -1)) {
            return true;
        }

        return false;
    }

    function getSignalStrength(rssi) {
        if (rssi >= -50) return "Excellent";
        if (rssi >= -60) return "Good";
        if (rssi >= -70) return "Fair";
        return "Poor";
    }

    function pairController(device) {
        var pairResult = btControllerManager.pairController(device.address);

        if (pairResult.success) {
            var controllerInfo = {
                address: device.address,
                name: device.name,
                pairedAt: Date.now(),
                lastConnected: null,
                buttonMapping: Object.assign({}, btDefaultMapping)
            };

            btPairedControllers.push(controllerInfo);

            dialogModule.success(
                "Controller Paired!\n\n" +
                "Name: " + device.name + "\n" +
                "Address: " + device.address + "\n\n" +
                "You can now use this controller to play games.\n" +
                "Press any button on the controller to test it.",
                true
            );
        } else {
            dialogModule.error("Pairing failed: " + (pairResult.error || "Unknown error"), true);
        }
    }

    function manualPairController() {
        var address = dialogModule.prompt("Enter controller MAC address\n(Format: XX:XX:XX:XX:XX:XX)", 17, "");
        if (!address) return;

        var addressPattern = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
        if (!addressPattern.test(address)) {
            dialogModule.error("Invalid MAC address format.\nUse: XX:XX:XX:XX:XX:XX", true);
            return;
        }

        var pairResult = btControllerManager.pairController(address);

        if (pairResult.success) {
            var controllerInfo = {
                address: address,
                name: pairResult.name || "Manual Pair",
                pairedAt: Date.now(),
                lastConnected: null,
                buttonMapping: Object.assign({}, btDefaultMapping)
            };

            var exists = false;
            var i;
            for (i = 0; i < btPairedControllers.length; i++) {
                if (btPairedControllers[i].address === address) {
                    exists = true;
                    break;
                }
            }

            if (!exists) {
                btPairedControllers.push(controllerInfo);
            }

            dialogModule.success("Controller paired successfully!", true);
        } else {
            dialogModule.error("Pairing failed: " + (pairResult.error || "Unknown error"), true);
        }
    }

    function testController() {
        if (btPairedControllers.length === 0) {
            dialogModule.info("No paired controllers.\n\nPair a controller first.", true);
            return;
        }

        if (btPairedControllers.length === 1) {
            btActiveController = btPairedControllers[0];
        } else {
            var deviceList = "Select controller to test:\n\n";
            var i;
            for (i = 0; i < btPairedControllers.length; i++) {
                deviceList += (i + 1) + ". " + btPairedControllers[i].name + "\n";
                deviceList += "   " + btPairedControllers[i].address + "\n\n";
            }
            deviceList += "\nEnter number, or BACK to cancel.";

            var choice = dialogModule.prompt(deviceList, 2, "");
            if (choice && parseInt(choice) >= 1 && parseInt(choice) <= btPairedControllers.length) {
                btActiveController = btPairedControllers[parseInt(choice) - 1];
            } else {
                return;
            }
        }

        var connResult = btControllerManager.connectController(btActiveController.address);

        if (!connResult.success) {
            dialogModule.error("Failed to connect: " + (connResult.error || "Unknown error"), true);
            return;
        }

        dialogModule.info("Testing Controller: " + btActiveController.name + "\n\nPress buttons on your controller.\nDisplay shows button presses in real-time.\n\nPress BACK when done.", false);

        testControllerLoop();
    }

    function testControllerLoop() {
        var running = true;
        var buttonStates = {};

        btControllerManager.setInputCallback(function(state) {
            btControllerState = state;
        });

        while (running) {
            displayModule.fill(displayModule.color(0, 0, 0));

            displayModule.setTextSize(1);
            displayModule.setTextAlign("center", "middle");
            displayModule.drawText("Controller Test", 64, 8);
            displayModule.setTextAlign("left", "top");

            displayModule.setTextColor(displayModule.color(0, 255, 0));
            displayModule.drawText("Controller: " + (btActiveController ? btActiveController.name : "None"), 2, 20);

            var y = 36;
            var buttonLabels = ["A", "B", "X", "Y", "UP", "DOWN", "LEFT", "RIGHT", "START", "SELECT", "L1", "R1", "L2", "R2"];

            var i;
            for (i = 0; i < buttonLabels.length; i++) {
                var label = buttonLabels[i];
                var isPressed = btControllerState[label] === true || btControllerState[label] === 1;
                var mappedAction = btActiveController && btActiveController.buttonMapping ? btActiveController.buttonMapping[label] : "";

                if (isPressed) {
                    displayModule.setTextColor(displayModule.color(0, 255, 0));
                    displayModule.drawText("[X] " + label + " -> " + mappedAction, 2, y);
                } else {
                    displayModule.setTextColor(displayModule.color(100, 100, 100));
                    displayModule.drawText("[ ] " + label + " -> " + mappedAction, 2, y);
                }
                y += 10;
            }

            displayModule.setTextColor(displayModule.color(255, 255, 0));
            displayModule.drawText("Axes:", 80, 36);
            var axisY = 46;
            if (btControllerState.leftStick !== undefined) {
                displayModule.drawText("L-Stick: X=" + btControllerState.leftStick.x.toFixed(2) + " Y=" + btControllerState.leftStick.y.toFixed(2), 80, axisY);
                axisY += 10;
            }
            if (btControllerState.rightStick !== undefined) {
                displayModule.drawText("R-Stick: X=" + btControllerState.rightStick.x.toFixed(2) + " Y=" + btControllerState.rightStick.y.toFixed(2), 80, axisY);
                axisY += 10;
            }

            displayModule.setTextColor(displayModule.color(150, 150, 150));
            displayModule.setTextAlign("center", "bottom");
            displayModule.drawText("[BACK] Exit Test", 64, screenHeight - 2);
            displayModule.setTextAlign("left", "top");

            displayModule.display();

            var key = keyboardModule.getKey();
            if (key === "back" || key === "menu") {
                running = false;
            }

            delay(30);
        }

        btControllerManager.disconnectController();
        btControllerState = {};
    }

    function showButtonMapping() {
        if (!btActiveController) {
            var controllers = btPairedControllers;
            if (controllers.length === 0) {
                dialogModule.info("No controllers paired.\n\nPair a controller first.", true);
                return;
            }
            if (controllers.length === 1) {
                btActiveController = controllers[0];
            } else {
                var deviceList = "Select controller:\n\n";
                var i;
                for (i = 0; i < controllers.length; i++) {
                    deviceList += (i + 1) + ". " + controllers[i].name + "\n";
                    deviceList += "   " + controllers[i].address + "\n\n";
                }
                deviceList += "\nEnter number, or BACK to cancel.";

                var choice = dialogModule.prompt(deviceList, 2, "");
                if (choice && parseInt(choice) >= 1 && parseInt(choice) <= controllers.length) {
                    btActiveController = controllers[parseInt(choice) - 1];
                } else {
                    return;
                }
            }
        }

        var running = true;
        var selectedIndex = 0;
        var buttons = Object.keys(btDefaultMapping);

        while (running) {
            displayModule.fill(displayModule.color(0, 0, 0));

            displayModule.setTextSize(2);
            displayModule.setTextAlign("center", "middle");
            displayModule.drawText("Button Mapping", 64, 10);
            displayModule.setTextSize(1);
            displayModule.setTextAlign("left", "top");
            displayModule.drawText("Controller: " + btActiveController.name, 2, 20);

            var y = 34;
            var i;
            for (i = 0; i < buttons.length; i++) {
                var prefix = i === selectedIndex ? "> " : "  ";
                var currentAction = btActiveController.buttonMapping[buttons[i]] || "Unmapped";
                displayModule.setTextColor(i === selectedIndex ? displayModule.color(0, 255, 0) : displayModule.color(255, 255, 255));
                displayModule.drawText(prefix + buttons[i] + " -> " + currentAction, 10, y);
                y += 9;
            }

            displayModule.setTextColor(displayModule.color(150, 150, 150));
            displayModule.drawText("[UP/DOWN] Select  [OK] Remap  [BACK] Done", 2, screenHeight - 10);

            displayModule.display();

            var key = keyboardModule.getKeyPress();
            if (key === "up") {
                selectedIndex = (selectedIndex - 1 + buttons.length) % buttons.length;
            } else if (key === "down") {
                selectedIndex = (selectedIndex + 1) % buttons.length;
            } else if (key === "ok" || key === "enter") {
                remapButton(buttons[selectedIndex]);
            } else if (key === "back" || key === "menu") {
                running = false;
            }

            delay(100);
        }
    }

    function remapButton(button) {
        var currentMapping = btActiveController.buttonMapping[button] || "Unmapped";

        var options = [
            ["fire", "fire"],
            ["jump", "jump"],
            ["special", "special"],
            ["menu", "menu"],
            ["up", "up"],
            ["down", "down"],
            ["left", "left"],
            ["right", "right"],
            ["start", "start"],
            ["select", "select"],
            ["shoulder_left (L1)", "shoulder_left"],
            ["shoulder_right (R1)", "shoulder_right"],
            ["trigger_left (L2)", "trigger_left"],
            ["trigger_right (R2)", "trigger_right"],
            ["Clear Mapping", "clear"],
            ["Cancel", "cancel"]
        ];

        var choice = dialogModule.choiceWithHeader(
            "Remap " + button,
            "Current: " + currentMapping + "\n\nSelect new action:",
            options
        );

        if (choice === "cancel") {
            return;
        } else if (choice === "clear") {
            delete btActiveController.buttonMapping[button];
            dialogModule.info(button + " mapping cleared.", true);
        } else if (choice) {
            btActiveController.buttonMapping[button] = choice;
            dialogModule.info(button + " mapped to: " + choice, true);
        }
    }

    function showPairedControllers() {
        if (btPairedControllers.length === 0) {
            dialogModule.info("No controllers paired.\n\nUse 'Scan for Controllers' or 'Pair with Device' to add a controller.", true);
            return;
        }

        var deviceList = "Paired Controllers (" + btPairedControllers.length + "):\n\n";
        var i;
        for (i = 0; i < btPairedControllers.length; i++) {
            var c = btPairedControllers[i];
            var activeMark = (btActiveController && btActiveController.address === c.address) ? " [ACTIVE]" : "";
            deviceList += (i + 1) + ". " + c.name + activeMark + "\n";
            deviceList += "   " + c.address + "\n";
            if (c.lastConnected) {
                deviceList += "   Last: " + new Date(c.lastConnected).toLocaleString() + "\n";
            }
            var mappedCount = Object.keys(c.buttonMapping).length;
            deviceList += "   Mapped: " + mappedCount + " buttons\n";
            deviceList += "\n";
        }
        deviceList += "\nEnter number to connect, D to set default, R to remove, or BACK.";

        var input = dialogModule.prompt(deviceList, 3, "");

        if (!input) return;

        var choice = input.toUpperCase();

        if (choice === "D") {
            btControllerManager.setDefaultController(btPairedControllers[0].address);
            dialogModule.info("Default controller set.", true);
        } else if (choice === "R") {
            var remIdx = parseInt(dialogModule.prompt("Enter number to remove:", 2, ""));
            if (remIdx >= 1 && remIdx <= btPairedControllers.length) {
                var removed = btPairedControllers.splice(remIdx - 1, 1)[0];
                btControllerManager.removeController(removed.address);
                if (btActiveController && btActiveController.address === removed.address) {
                    btActiveController = null;
                }
                dialogModule.info("Controller removed.", true);
            }
        } else {
            var idx = parseInt(choice);
            if (idx >= 1 && idx <= btPairedControllers.length) {
                var selected = btPairedControllers[idx - 1];
                var connResult = btControllerManager.connectController(selected.address);
                if (connResult.success) {
                    btActiveController = selected;
                    selected.lastConnected = Date.now();
                    dialogModule.success("Connected to " + selected.name + "!", true);
                } else {
                    dialogModule.error("Connection failed: " + (connResult.error || "Unknown error"), true);
                }
            }
        }
    }

    function createBluetoothControllerManager() {
        var connectedAddress = null;
        var inputCallback = null;
        var isScanning = false;
        var scanResults = [];
        var scanTimeout = null;
        var pollingInterval = null;
        var connectionState = "disconnected";

        function macToStringBT(addr) {
            if (!addr || addr.length !== 6) return "00:00:00:00:00:00";
            var result = "";
            var i;
            for (i = 0; i < 6; i++) {
                result += addr[i].toString(16).padStart(2, '0').toUpperCase();
                if (i < 5) result += ":";
            }
            return result;
        }

        function parseBTAddress(addrStr) {
            if (!addrStr || typeof addrStr !== "string") return null;
            var parts = addrStr.split(":");
            if (parts.length !== 6) return null;
            var addr = [];
            var i;
            for (i = 0; i < 6; i++) {
                addr[i] = parseInt(parts[i], 16);
            }
            return addr;
        }

        function simulateControllerInput() {
            var state = {
                A: Math.random() > 0.9,
                B: Math.random() > 0.9,
                X: Math.random() > 0.9,
                Y: Math.random() > 0.9,
                UP: Math.random() > 0.9,
                DOWN: Math.random() > 0.9,
                LEFT: Math.random() > 0.9,
                RIGHT: Math.random() > 0.9,
                START: Math.random() > 0.9,
                SELECT: Math.random() > 0.9,
                L1: Math.random() > 0.9,
                R1: Math.random() > 0.9,
                L2: Math.random() > 0.9,
                R2: Math.random() > 0.9,
                leftStick: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 },
                rightStick: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 }
            };
            return state;
        }

        return {
            initialize: function() {
                try {
                    if (typeof bluetooth !== "undefined") {
                        return { success: true };
                    }
                } catch (e) {
                }
                return { success: true, simulationMode: true };
            },

            startScanning: function(duration) {
                if (isScanning) return { success: false, error: "Already scanning" };
                duration = duration || 10000;
                isScanning = true;
                scanResults = [];

                try {
                    if (typeof bluetooth !== "undefined") {
                        bluetooth.startScan({
                            duration: duration,
                            callback: function(device) {
                                if (device && device.address) {
                                    var exists = false;
                                    var i;
                                    for (i = 0; i < scanResults.length; i++) {
                                        if (scanResults[i].address === device.address) {
                                            exists = true;
                                            break;
                                        }
                                    }
                                    if (!exists) {
                                        scanResults.push({
                                            name: device.name || "Unknown Device",
                                            address: device.address,
                                            rssi: device.rssi || 0,
                                            deviceClass: device.deviceClass || "Unknown"
                                        });
                                    }
                                }
                            }
                        });
                    }
                } catch (e) {
                }

                if (scanTimeout) clearTimeout(scanTimeout);
                scanTimeout = setTimeout(function() {
                    this.stopScanning();
                }.bind(this), duration);

                return { success: true, duration: duration };
            },

            stopScanning: function() {
                if (!isScanning) return;
                isScanning = false;

                try {
                    if (typeof bluetooth !== "undefined") {
                        bluetooth.stopScan();
                    }
                } catch (e) {
                }

                if (scanTimeout) {
                    clearTimeout(scanTimeout);
                    scanTimeout = null;
                }
            },

            isScanning: function() {
                return isScanning;
            },

            getScanResults: function() {
                return scanResults;
            },

            pairController: function(address) {
                try {
                    if (typeof bluetooth !== "undefined") {
                        var pairResult = bluetooth.pair({
                            address: address,
                            timeout: 30000
                        });
                        if (pairResult && pairResult.success) {
                            connectionState = "paired";
                            return { success: true, name: pairResult.name || "Bluetooth Controller" };
                        }
                        return { success: false, error: pairResult.error || "Pairing failed" };
                    }
                } catch (e) {
                }

                connectionState = "paired";
                return { success: true, name: "Simulated Controller", simulationMode: true };
            },

            connectController: function(address) {
                try {
                    if (typeof bluetooth !== "undefined") {
                        var connResult = bluetooth.connect({ address: address });
                        if (connResult && connResult.success) {
                            connectedAddress = address;
                            connectionState = "connected";
                            this.startPolling();
                            return { success: true };
                        }
                        return { success: false, error: connResult.error || "Connection failed" };
                    }
                } catch (e) {
                }

                connectedAddress = address;
                connectionState = "connected";
                this.startPolling();
                return { success: true, simulationMode: true };
            },

            disconnectController: function() {
                try {
                    if (typeof bluetooth !== "undefined" && connectedAddress) {
                        bluetooth.disconnect({ address: connectedAddress });
                    }
                } catch (e) {
                }

                this.stopPolling();
                connectedAddress = null;
                connectionState = "disconnected";
            },

            removeController: function(address) {
                try {
                    if (typeof bluetooth !== "undefined") {
                        bluetooth.unpair({ address: address });
                    }
                } catch (e) {
                }
            },

            setDefaultController: function(address) {
            },

            startPolling: function() {
                this.stopPolling();
                pollingInterval = setInterval(function() {
                    var state;
                    try {
                        if (typeof bluetooth !== "undefined" && connectedAddress) {
                            state = bluetooth.getControllerState(connectedAddress);
                        }
                    } catch (e) {
                    }

                    if (!state && connectionState === "connected") {
                        state = simulateControllerInput();
                    }

                    if (state && inputCallback) {
                        inputCallback(state);
                    }
                }, 16);
            },

            stopPolling: function() {
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                }
            },

            setInputCallback: function(callback) {
                inputCallback = callback;
            },

            getControllerState: function() {
                if (connectedAddress) {
                    try {
                        if (typeof bluetooth !== "undefined") {
                            return bluetooth.getControllerState(connectedAddress);
                        }
                    } catch (e) {
                    }
                }
                return simulateControllerInput();
            },

            getConnectionState: function() {
                return connectionState;
            },

            isConnected: function() {
                return connectionState === "connected";
            },

            getPairedControllerCount: function() {
                return btPairedControllers.length;
            },

            getActiveController: function() {
                return btActiveController;
            },

            cleanup: function() {
                this.stopPolling();
                this.stopScanning();
                connectedAddress = null;
                connectionState = "disconnected";
                inputCallback = null;
            }
        };
    }

    function getBluetoothControllerInput() {
        if (!btControllerManager || !btControllerManager.isConnected()) {
            return null;
        }

        var state = btControllerManager.getControllerState();
        if (!state) return null;

        var mappedActions = {};

        if (btActiveController && btActiveController.buttonMapping) {
            var mapping = btActiveController.buttonMapping;
            var buttonLabels = ["A", "B", "X", "Y", "UP", "DOWN", "LEFT", "RIGHT", "START", "SELECT", "L1", "R1", "L2", "R2"];

            var i;
            for (i = 0; i < buttonLabels.length; i++) {
                var btn = buttonLabels[i];
                if (state[btn] === true || state[btn] === 1) {
                    var action = mapping[btn];
                    if (action) {
                        mappedActions[action] = true;
                    }
                }
            }

            if (state.leftStick) {
                var threshold = 0.5;
                if (state.leftStick.x < -threshold && mapping.LEFT) {
                    mappedActions[mapping.LEFT] = true;
                }
                if (state.leftStick.x > threshold && mapping.RIGHT) {
                    mappedActions[mapping.RIGHT] = true;
                }
                if (state.leftStick.y < -threshold && mapping.UP) {
                    mappedActions[mapping.UP] = true;
                }
                if (state.leftStick.y > threshold && mapping.DOWN) {
                    mappedActions[mapping.DOWN] = true;
                }
            }
        }

        return mappedActions;
    }

    function startWebServer() {
        if (typeof http !== "undefined" && http.createServer) {
            wifiServer = http.createServer();
            wifiServer.onRequest(function(req, res) {
                handleWifiRequest(req, res);
            });
            wifiServer.listen(80);
        }
    }

    function handleWifiRequest(req, res) {
        var path = req.url || "/";
        var method = req.method || "GET";

        if (path === "/" || path === "/index.html") {
            sendHTML(res);
        } else if (path === "/api/status") {
            sendStatus(res);
        } else if (path === "/api/control" && method === "POST") {
            handleControl(req, res);
        } else if (path === "/api/level") {
            sendLevelData(res);
        } else if (path === "/api/score") {
            sendScore(res);
        } else if (path === "/api/screen") {
            sendScreenCapture(res);
        } else if (path === "/api/bluetooth/status") {
            sendBluetoothStatus(res);
        } else if (path === "/api/bluetooth/scan" && method === "POST") {
            handleBluetoothScan(req, res);
        } else if (path === "/api/bluetooth/stop-scan" && method === "POST") {
            handleBluetoothStopScan(req, res);
        } else if (path === "/api/bluetooth/pair" && method === "POST") {
            handleBluetoothPair(req, res);
        } else if (path === "/api/bluetooth/unpair" && method === "POST") {
            handleBluetoothUnpair(req, res);
        } else if (path === "/api/bluetooth/connect" && method === "POST") {
            handleBluetoothConnect(req, res);
        } else if (path === "/api/bluetooth/disconnect" && method === "POST") {
            handleBluetoothDisconnect(req, res);
        } else if (path === "/api/bluetooth/confirm-pairing" && method === "POST") {
            handleBluetoothConfirmPairing(req, res);
        } else if (path === "/api/controller/scan" && method === "POST") {
            handleControllerScan(req, res);
        } else if (path === "/api/controller/pair" && method === "POST") {
            handleControllerPair(req, res);
        } else if (path === "/api/controller/connect" && method === "POST") {
            handleControllerConnect(req, res);
        } else if (path === "/api/controller/disconnect" && method === "POST") {
            handleControllerDisconnect(req, res);
        } else if (path === "/api/controller/status") {
            handleControllerStatus(req, res);
        } else if (path === "/api/controller/input") {
            handleControllerInput(req, res);
        } else if (path === "/favicon.ico") {
            res.writeHead(204);
            res.end();
        } else {
            res.writeHead(404);
            res.end("Not Found");
        }
    }

    function sendHTML(res) {
        res.writeHead(200, {"Content-Type": "text/html"});
        var html = "<!DOCTYPE html><html><head><title>Bruce Controller</title>";
        html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
        html += "<style>";
        html += "body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#1a1a2e;color:#eee}";
        html += ".container{max-width:600px;margin:0 auto}";
        html += "h1{color:#00ff88;text-align:center;margin-bottom:5px}";
        html += "h2{color:#00d4ff;margin-top:20px;border-bottom:1px solid #0f3460;padding-bottom:5px}";
        html += ".status{display:flex;justify-content:space-between;padding:10px;background:#16213e;border-radius:8px;margin:10px 0}";
        html += ".btn{display:block;width:100%;padding:12px;margin:5px 0;border:none;border-radius:8px;font-size:14px;cursor:pointer;transition:0.2s}";
        html += ".btn-up{background:#00d4ff;color:#000}.btn-down{background:#00d4ff;color:#000}";
        html += ".btn-left{background:#ff6b6b;color:#000}.btn-right{background:#ff6b6b;color:#000}";
        html += ".btn-action{background:#4ecca3;color:#000;font-weight:bold}";
        html += ".btn-menu{background:#ffd93d;color:#000}";
        html += ".btn-bt{background:#a855f7;color:#fff}.btn-bt-scan{background:#8b5cf6;color:#fff}";
        html += ".btn-bt-pair{background:#06b6d4;color:#fff}.btn-bt-danger{background:#ef4444;color:#fff}";
        html += ".grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;max-width:200px;margin:15px auto}";
        html += ".info{background:#0f3460;padding:15px;border-radius:8px;margin:15px 0}";
        html += ".mode{text-align:center;font-size:14px;color:#aaa;margin-top:10px}";
        html += ".screen-preview{background:#000;padding:10px;border-radius:8px;margin:15px 0;text-align:center}";
        html += ".screen-preview img{max-width:100%;height:auto;border-radius:4px;border:2px solid #00ff88}";
        html += ".bt-section{background:#16213e;padding:15px;border-radius:8px;margin:15px 0}";
        html += ".bt-device{background:#0f3460;padding:10px;border-radius:5px;margin:8px 0;display:flex;justify-content:space-between;align-items:center}";
        html += ".bt-device-name{font-weight:bold;color:#a855f7}";
        html += ".bt-device-addr{font-size:12px;color:#888}";
        html += ".bt-status{background:#1a1a2e;padding:10px;border-radius:5px;margin:10px 0;font-size:13px}";
        html += ".pin-display{font-size:24px;font-weight:bold;color:#ffd93d;text-align:center;padding:15px;background:#0f3460;border-radius:8px;margin:10px 0}";
        html += ".tabs{display:flex;gap:5px;margin-bottom:15px}";
        html += ".tab{flex:1;padding:10px;text-align:center;background:#0f3460;border-radius:8px;cursor:pointer;transition:0.2s}";
        html += ".tab.active{background:#a855f7;color:#fff}";
        html += ".tab-content{display:none}";
        html += ".tab-content.active{display:block}";
        html += "</style>";
        html += "<script>";
        html += "let pollInt;let btPollInt;let btDevices=[];let pairedDevices=[];let btStatus={};";
        html += "function poll(){fetch('/api/status').then(r=>r.json()).then(d=>{";
        html += "document.getElementById('mode').innerText=d.mode;";
        html += "document.getElementById('score').innerText='Score: '+d.score;";
        html += "document.getElementById('lives').innerText='Lives: '+d.lives;";
        html += "});}";
        html += "function send(action){fetch('/api/control',{method:'POST',body:JSON.stringify({action:action}),headers:{'Content-Type':'application/json'}});}";
        html += "function startPolling(){poll();pollInt=setInterval(poll,500);}";
        html += "let screenInt;function fetchScreen(){fetch('/api/screen').then(r=>r.json()).then(d=>{";
        html += "if(d.image){document.getElementById('screenImg').src='data:image/bmp;base64,'+d.image;";
        html += "document.getElementById('screenContainer').style.display='block';}";
        html += "}).catch(function(){document.getElementById('screenContainer').style.display='none';});}";
        html += "function startScreenPoll(){fetchScreen();screenInt=setInterval(fetchScreen,1000);}";
        html += "function updateBTStatus(){fetch('/api/bluetooth/status').then(r=>r.json()).then(d=>{";
        html += "btStatus=d;";
        html += "document.getElementById('btState').innerText=d.connectionState||'unknown';";
        html += "document.getElementById('btAddr').innerText=d.address||'N/A';";
        html += "btDevices=d.scanResults||[];";
        html += "pairedDevices=d.pairedDevices||[];";
        html += "renderBTDevices();renderPairedDevices();";
        html += "if(d.waitingForConfirmation){showPairingDialog(d.pendingPairingAddress,d.pin);}else{hidePairingDialog();}";
        html += "});}";
        html += "function renderBTDevices(){var container=document.getElementById('btDevices');container.innerHTML='';";
        html += "if(btDevices.length===0){container.innerHTML='<p style=\"color:#888;text-align:center\">No devices found. Tap Scan to search.</p>';return;} ";
        html += "btDevices.forEach(function(dev){var div=document.createElement('div');";
        html += "div.className='bt-device';div.innerHTML='<div><div class=\"bt-device-name\">'+(dev.name||'Unknown')+'</div><div class=\"bt-device-addr\">'+dev.address+'</div></div>';";
        html += "var btn=document.createElement('button');btn.className='btn btn-bt-pair';btn.style.margin='0';btn.style.padding='8px 15px';btn.innerText='Pair';btn.onclick=function(){pairDevice(dev.address);};";
        html += "div.appendChild(btn);container.appendChild(div);});}";
        html += "function renderPairedDevices(){var container=document.getElementById('pairedDevices');container.innerHTML='';";
        html += "if(pairedDevices.length===0){container.innerHTML='<p style=\"color:#888;text-align:center\">No paired devices</p>';return;} ";
        html += "pairedDevices.forEach(function(dev){var div=document.createElement('div');";
        html += "div.className='bt-device';div.innerHTML='<div><div class=\"bt-device-name\">'+(dev.name||dev.address)+'</div><div class=\"bt-device-addr\">'+dev.address+'</div></div>';";
        html += "var btn=document.createElement('button');btn.className='btn btn-bt-danger';btn.style.margin='0';btn.style.padding='8px 15px';btn.innerText='Unpair';btn.onclick=function(){unpairDevice(dev.address);};";
        html += "div.appendChild(btn);container.appendChild(div);});}";
        html += "function startBTScan(){fetch('/api/bluetooth/scan',{method:'POST',body:JSON.stringify({duration:10000}),headers:{'Content-Type':'application/json'}}).then(r=>r.json()).then(d=>{if(d.success){document.getElementById('scanBtn').innerText='Scanning...';setTimeout(function(){document.getElementById('scanBtn').innerText='Scan';updateBTStatus();},10500);}});}";
        html += "function stopBTScan(){fetch('/api/bluetooth/stop-scan',{method:'POST'}).then(r=>r.json()).then(function(){updateBTStatus();});}";
        html += "function pairDevice(addr){fetch('/api/bluetooth/pair',{method:'POST',body:JSON.stringify({address:addr}),headers:{'Content-Type':'application/json'}}).then(r=>r.json()).then(d=>{if(d.success){alert('Pairing successful! PIN: '+d.pin);updateBTStatus();}else{alert('Pairing failed: '+d.error);}updateBTStatus();});}";
        html += "function unpairDevice(addr){if(confirm('Unpair this device?')){fetch('/api/bluetooth/unpair',{method:'POST',body:JSON.stringify({address:addr}),headers:{'Content-Type':'application/json'}}).then(r=>r.json()).then(function(){updateBTStatus();});}}";
        html += "function connectBT(addr){fetch('/api/bluetooth/connect',{method:'POST',body:JSON.stringify({address:addr}),headers:{'Content-Type':'application/json'}}).then(r=>r.json()).then(function(d){if(d.success){alert('Connected!');}else{alert('Connection failed: '+d.error);}updateBTStatus();});}";
        html += "function disconnectBT(addr){fetch('/api/bluetooth/disconnect',{method:'POST',body:JSON.stringify({address:addr}),headers:{'Content-Type':'application/json'}}).then(r=>r.json()).then(function(){updateBTStatus();});}";
        html += "function showPairingDialog(addr,pin){document.getElementById('pairingOverlay').style.display='flex';document.getElementById('pairingAddr').innerText=addr;document.getElementById('pairingPin').innerText=pin||'------';}";
        html += "function hidePairingDialog(){document.getElementById('pairingOverlay').style.display='none';}";
        html += "function confirmPairing(accept){fetch('/api/bluetooth/confirm-pairing',{method:'POST',body:JSON.stringify({accept:accept}),headers:{'Content-Type':'application/json'}}).then(r=>r.json()).then(function(){hidePairingDialog();updateBTStatus();});}";
        html += "function switchTab(tab){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));document.getElementById('tab'+tab).classList.add('active');document.getElementById('content'+tab).classList.add('active');}";
        html += "function startBTPoll(){updateBTStatus();btPollInt=setInterval(updateBTStatus,2000);}";
        html += "function stopBTPoll(){clearInterval(btPollInt);}";
        html += "</script>";
        html += "</head><body onload='startPolling();startScreenPoll();startBTPoll()'><div class='container'>";
        html += "<h1>Bruce Controller</h1>";
        html += "<div class='status'><span id='mode'>Menu</span><span id='score'>0</span><span id='lives'>3</span></div>";
        html += "<div class='tabs'><div class='tab active' id='tabController' onclick='switchTab(\"Controller\")'>Controller</div><div class='tab' id='tabBluetooth' onclick='switchTab(\"Bluetooth\")'>Bluetooth</div></div>";
        html += "<div id='contentController' class='tab-content active'>";
        html += "<div class='screen-preview' id='screenContainer' style='display:none'>";
        html += "<h3>Screen Output</h3>";
        html += "<img id='screenImg' src='' alt='Screen capture' style='max-width:256px'>";
        html += "</div>";
        html += "<div class='grid'><button class='btn btn-up' onmousedown=\"send('up')\">▲</button>";
        html += "<button class='btn btn-left' onmousedown=\"send('left')\">◄</button>";
        html += "<button class='btn btn-action' onmousedown=\"send('ok')\">OK</button>";
        html += "<button class='btn btn-right' onmousedown=\"send('right')\">►</button>";
        html += "<button class='btn btn-down' onmousedown=\"send('down')\">▼</button>";
        html += "<button class='btn btn-menu' onmousedown=\"send('menu')\">MENU</button></div>";
        html += "<div class='info'><h3>Controls</h3><p>▲/▼/◄/► - Move/Navigate</p><p>OK - Select/Place</p><p>MENU - Open Menu</p></div>";
        html += "</div>";
        html += "<div id='contentBluetooth' class='tab-content'>";
        html += "<h2>Bluetooth Manager</h2>";
        html += "<div class='bt-section'>";
        html += "<div class='bt-status'>";
        html += "<strong>Status:</strong> <span id='btState' style='color:#a855f7'>Initializing...</span><br>";
        html += "<strong>Address:</strong> <span id='btAddr' style='color:#888'>...</span>";
        html += "</div>";
        html += "<button class='btn btn-bt-scan' id='scanBtn' onclick='startBTScan()'>Scan for Devices</button>";
        html += "<h3>Available Devices</h3>";
        html += "<div id='btDevices'><p style='color:#888;text-align:center'>Tap Scan to search for devices</p></div>";
        html += "<h3>Paired Devices</h3>";
        html += "<div id='pairedDevices'><p style='color:#888;text-align:center'>No paired devices</p></div>";
        html += "</div>";
        html += "</div>";
        html += "<div class='mode'>Current: <span id='mode'>Menu</span></div>";
        html += "</div>";
        html += "<div id='pairingOverlay' style='display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);align-items:center;justify-content:center;flex-direction:column'>";
        html += "<h2 style='color:#ffd93d'>Pairing Request</h2>";
        html += "<p id='pairingAddr' style='color:#fff;margin:10px 0'></p>";
        html += "<div class='pin-display'>PIN: <span id='pairingPin'></span></div>";
        html += "<p style='color:#888;margin:15px 0'>Confirm this PIN on your device</p>";
        html += "<div style='display:flex;gap:10px;width:300px'>";
        html += "<button class='btn btn-bt-pair' onclick='confirmPairing(true)'>Accept</button>";
        html += "<button class='btn btn-bt-danger' onclick='confirmPairing(false)'>Reject</button>";
        html += "</div>";
        html += "</div>";
        html += "</div></body></html>";
        res.end(html);
    }

    function sendStatus(res) {
        var status = {
            mode: currentMode,
            score: score,
            lives: lives,
            isEditing: isEditing,
            levelName: currentLevel ? currentLevel.name : null
        };
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(status));
    }

    function sendScore(res) {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({score: score, lives: lives}));
    }

    function sendScreenCapture(res) {
        try {
            var base64 = screenBufferToBase64();
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify({
                width: screenWidth,
                height: screenHeight,
                image: base64
            }));
        } catch (e) {
            res.writeHead(500, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: e.toString()}));
        }
    }

    function sendLevelData(res) {
        if (currentLevel) {
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(currentLevel));
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({error: "No level loaded"}));
        }
    }

    function handleControl(req, res) {
        var body = "";
        req.onData(function(chunk) {
            body += chunk;
        });
        req.onEnd(function() {
            try {
                var data = JSON.parse(body);
                var action = data.action;
                if (action === "up") {
                    keyboardModule.injectKey("up");
                } else if (action === "down") {
                    keyboardModule.injectKey("down");
                } else if (action === "left") {
                    keyboardModule.injectKey("left");
                } else if (action === "right") {
                    keyboardModule.injectKey("right");
                } else if (action === "ok" || action === "enter") {
                    keyboardModule.injectKey("ok");
                } else if (action === "back") {
                    keyboardModule.injectKey("back");
                } else if (action === "menu") {
                    keyboardModule.injectKey("menu");
                }
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify({success: true}));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({error: "Invalid request"}));
            }
        });
    }

    function getWifiStatus() {
        return {
            running: wifiRunning,
            ssid: apSSID,
            ip: apIP
        };
    }

    function getWifiIsRunning() {
        return wifiRunning;
    }

    function initBluetoothManager() {
        if (bluetoothInitialized && bluetoothManager) {
            return true;
        }
        bluetoothManager = createBluetoothManager();
        var initResult = bluetoothManager.initialize({ deviceName: "Bruce Controller" });
        if (initResult && initResult.success) {
            bluetoothInitialized = true;
            bluetoothManager.setOnPairingRequest(function(data) {
                btPendingPairing = data.address;
                btPairingPin = data.pin || "000000";
                btWaitingForConfirmation = true;
            });
            return true;
        }
        if (initResult.simulationMode) {
            bluetoothInitialized = true;
            return true;
        }
        return false;
    }

    function sendBluetoothStatus(res) {
        if (!initBluetoothManager()) {
            res.writeHead(500, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "Bluetooth not available"}));
            return;
        }
        var status = {
            initialized: bluetoothInitialized,
            address: bluetoothManager.getAddress(),
            deviceName: bluetoothManager.getDeviceName(),
            connectionState: bluetoothManager.getConnectionState(),
            isScanning: bluetoothManager.isScanning(),
            isConnected: bluetoothManager.isConnected(),
            pairedDevices: bluetoothManager.getPairedDevices(),
            scanResults: bluetoothManager.getScanResults(),
            waitingForConfirmation: btWaitingForConfirmation,
            pendingPairingAddress: btPendingPairing
        };
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(status));
    }

    function handleBluetoothScan(req, res) {
        if (!initBluetoothManager()) {
            res.writeHead(500, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "Bluetooth not available"}));
            return;
        }
        var body = "";
        req.onData(function(chunk) { body += chunk; });
        req.onEnd(function() {
            try {
                var data = body ? JSON.parse(body) : {};
                var result = bluetoothManager.startScanning(data.duration || 10000);
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(400, {"Content-Type": "application/json"});
                res.end(JSON.stringify({error: "Invalid request"}));
            }
        });
    }

    function handleBluetoothStopScan(req, res) {
        if (!bluetoothManager) {
            res.writeHead(500, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "Bluetooth not initialized"}));
            return;
        }
        bluetoothManager.stopScanning();
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({success: true}));
    }

    function handleBluetoothPair(req, res) {
        if (!initBluetoothManager()) {
            res.writeHead(500, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "Bluetooth not available"}));
            return;
        }
        var body = "";
        req.onData(function(chunk) { body += chunk; });
        req.onEnd(function() {
            try {
                var data = JSON.parse(body);
                if (!data.address) {
                    res.writeHead(400, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({error: "Device address required"}));
                    return;
                }
                var result = bluetoothManager.pair(data.address, data.pin);
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(400, {"Content-Type": "application/json"});
                res.end(JSON.stringify({error: "Invalid request"}));
            }
        });
    }

    function handleBluetoothUnpair(req, res) {
        if (!bluetoothManager) {
            res.writeHead(500, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "Bluetooth not initialized"}));
            return;
        }
        var body = "";
        req.onData(function(chunk) { body += chunk; });
        req.onEnd(function() {
            try {
                var data = JSON.parse(body);
                if (!data.address) {
                    res.writeHead(400, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({error: "Device address required"}));
                    return;
                }
                var result = bluetoothManager.unpair(data.address);
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(400, {"Content-Type": "application/json"});
                res.end(JSON.stringify({error: "Invalid request"}));
            }
        });
    }

    function handleBluetoothConnect(req, res) {
        if (!initBluetoothManager()) {
            res.writeHead(500, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "Bluetooth not available"}));
            return;
        }
        var body = "";
        req.onData(function(chunk) { body += chunk; });
        req.onEnd(function() {
            try {
                var data = JSON.parse(body);
                if (!data.address) {
                    res.writeHead(400, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({error: "Device address required"}));
                    return;
                }
                var result = bluetoothManager.connect(data.address);
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(400, {"Content-Type": "application/json"});
                res.end(JSON.stringify({error: "Invalid request"}));
            }
        });
    }

    function handleBluetoothDisconnect(req, res) {
        if (!bluetoothManager) {
            res.writeHead(500, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "Bluetooth not initialized"}));
            return;
        }
        var body = "";
        req.onData(function(chunk) { body += chunk; });
        req.onEnd(function() {
            try {
                var data = JSON.parse(body);
                var result = bluetoothManager.disconnect(data.address);
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(400, {"Content-Type": "application/json"});
                res.end(JSON.stringify({error: "Invalid request"}));
            }
        });
    }

    function handleBluetoothConfirmPairing(req, res) {
        if (!bluetoothManager || !btWaitingForConfirmation) {
            res.writeHead(400, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "No pending pairing request"}));
            return;
        }
        var body = "";
        req.onData(function(chunk) { body += chunk; });
        req.onEnd(function() {
            try {
                var data = JSON.parse(body);
                var accept = data.accept === true;
                var result = bluetoothManager.acceptPairing(btPendingPairing, accept);
                btWaitingForConfirmation = false;
                if (accept) {
                    btPendingPairing = null;
                }
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(400, {"Content-Type": "application/json"});
                res.end(JSON.stringify({error: "Invalid request"}));
            }
        });
    }

    function handleControllerScan(req, res) {
        if (!initBluetoothManager()) {
            res.writeHead(500, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "Bluetooth not available"}));
            return;
        }

        if (!btControllerManager) {
            btControllerManager = createBluetoothControllerManager();
            btControllerManager.initialize();
        }

        var result = btControllerManager.startScanning(10000);
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(result));

        setTimeout(function() {
            btControllerManager.stopScanning();
        }, 10500);
    }

    function handleControllerPair(req, res) {
        if (!initBluetoothManager()) {
            res.writeHead(500, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "Bluetooth not available"}));
            return;
        }

        if (!btControllerManager) {
            res.writeHead(400, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "Controller manager not initialized"}));
            return;
        }

        var body = "";
        req.onData(function(chunk) { body += chunk; });
        req.onEnd(function() {
            try {
                var data = JSON.parse(body);
                var address = data.address;
                if (!address) {
                    res.writeHead(400, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({error: "No address provided"}));
                    return;
                }

                var result = btControllerManager.pairController(address);
                if (result.success) {
                    var controllerInfo = {
                        address: address,
                        name: result.name || "Bluetooth Controller",
                        pairedAt: Date.now(),
                        lastConnected: null,
                        buttonMapping: Object.assign({}, btDefaultMapping)
                    };

                    var exists = false;
                    var i;
                    for (i = 0; i < btPairedControllers.length; i++) {
                        if (btPairedControllers[i].address === address) {
                            exists = true;
                            break;
                        }
                    }

                    if (!exists) {
                        btPairedControllers.push(controllerInfo);
                    }
                }

                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(400, {"Content-Type": "application/json"});
                res.end(JSON.stringify({error: "Invalid request"}));
            }
        });
    }

    function handleControllerConnect(req, res) {
        if (!initBluetoothManager()) {
            res.writeHead(500, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "Bluetooth not available"}));
            return;
        }

        if (!btControllerManager) {
            res.writeHead(400, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "Controller manager not initialized"}));
            return;
        }

        var body = "";
        req.onData(function(chunk) { body += chunk; });
        req.onEnd(function() {
            try {
                var data = JSON.parse(body);
                var address = data.address;
                if (!address) {
                    res.writeHead(400, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({error: "No address provided"}));
                    return;
                }

                var result = btControllerManager.connectController(address);
                if (result.success) {
                    btActiveController = null;
                    var i;
                    for (i = 0; i < btPairedControllers.length; i++) {
                        if (btPairedControllers[i].address === address) {
                            btActiveController = btPairedControllers[i];
                            btPairedControllers[i].lastConnected = Date.now();
                            break;
                        }
                    }
                }

                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(400, {"Content-Type": "application/json"});
                res.end(JSON.stringify({error: "Invalid request"}));
            }
        });
    }

    function handleControllerDisconnect(req, res) {
        if (!btControllerManager) {
            res.writeHead(400, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "Controller manager not initialized"}));
            return;
        }

        btControllerManager.disconnectController();
        btActiveController = null;

        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({success: true}));
    }

    function handleControllerStatus(req, res) {
        if (!btControllerManager) {
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify({
                initialized: false,
                connected: false,
                controllers: btPairedControllers,
                activeController: btActiveController
            }));
            return;
        }

        var status = {
            initialized: true,
            connected: btControllerManager.isConnected(),
            connectionState: btControllerManager.getConnectionState(),
            controllers: btPairedControllers,
            activeController: btActiveController,
            scanResults: btControllerManager.getScanResults()
        };

        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(status));
    }

    function handleControllerInput(req, res) {
        var input = getBluetoothControllerInput();
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({
            input: input,
            activeController: btActiveController ? btActiveController.name : null
        }));
    }

    function gameLoop() {
        while (currentMode === "play") {
            update();
            render();

            var key = keyboardModule.getKey();
            if (key === "menu") {
                showGameMenu();
            }

            delay(50);
        }
    }

    function editorLoop() {
        while (isEditing) {
            handleEditorInput();
            renderEditor();
            delay(100);
        }
    }

    function showGameMenu() {
        var choice = dialogModule.choice([
            ["Continue", "continue"],
            ["Restart", "restart"],
            ["Exit", "exit"]
        ]);

        if (choice === "restart") {
            var level = currentLevel;
            if (level) {
                loadLevel(JSON.parse(JSON.stringify(level)));
            }
        } else if (choice === "exit") {
            currentMode = "menu";
        }
    }

    function update() {
        var i;
        for (i = 0; i < entities.length; i++) {
            if (entities[i].update) {
                entities[i].update();
            }
        }
    }

    function render() {
        displayModule.fill(displayModule.color(0, 0, 0));
        clearScreenBuffer();
        var i;
        for (i = 0; i < entities.length; i++) {
            if (entities[i].render) {
                entities[i].render();
            }
        }
        displayModule.display();
    }

    function handleEditorInput() {
        var key = keyboardModule.getKey();

        if (key === "up") {
            cursorY = Math.max(0, cursorY - tileSize);
        }
        if (key === "down") {
            cursorY = Math.min(levelHeight * tileSize - tileSize, cursorY + tileSize);
        }
        if (key === "left") {
            cursorX = Math.max(0, cursorX - tileSize);
        }
        if (key === "right") {
            cursorX = Math.min(levelWidth * tileSize - tileSize, cursorX + tileSize);
        }
        if (key === "ok" || key === "enter") {
            placeTile();
        }
        if (key === "back") {
            currentTileIndex = (currentTileIndex + 1) % tileTypes.length;
            selectedTileType = tileTypes[currentTileIndex].id;
        }
        if (key === "menu") {
            showEditorMenu();
        }
    }

    function placeTile() {
        if (!currentLevel) return;

        var tileX = Math.floor(cursorX / tileSize);
        var tileY = Math.floor(cursorY / tileSize);

        if (tileX >= 0 && tileX < currentLevel.width && tileY >= 0 && tileY < currentLevel.height) {
            var prevTile = currentLevel.tiles[tileY][tileX];
            currentLevel.tiles[tileY][tileX] = selectedTileType;

            if (selectedTileType === 2 && prevTile !== 2) {
                var existingPlayer = findPlayer();
                if (existingPlayer) {
                    var ex = Math.floor(existingPlayer.x / tileSize);
                    var ey = Math.floor(existingPlayer.y / tileSize);
                    if (ex >= 0 && ex < currentLevel.width && ey >= 0 && ey < currentLevel.height) {
                        currentLevel.tiles[ey][ex] = 0;
                    }
                }
            }

            rebuildLevelEntities();
        }
    }

    function showEditorMenu() {
        var options = [
            ["Save Level", "save"],
            ["Load Level", "load"],
            ["New Level", "new"],
            ["Toggle Grid", "grid"],
            ["Play Level", "play"],
            ["Exit Editor", "exit"]
        ];

        var choice = dialogModule.choice(options);

        if (choice === "save") {
            saveLevel();
        } else if (choice === "load") {
            loadLevelDialog();
        } else if (choice === "new") {
            createNewLevelDialog();
        } else if (choice === "grid") {
            showGrid = !showGrid;
        } else if (choice === "play") {
            isEditing = false;
        } else if (choice === "exit") {
            isEditing = false;
        }
    }

    function renderEditor() {
        displayModule.fill(displayModule.color(0, 0, 0));
        clearScreenBuffer();

        if (currentLevel) {
            renderLevel(currentLevel);
            renderEditorCursor();
            renderEditorUI();
        } else {
            displayModule.drawText("No level loaded", 10, 20);
        }

        displayModule.display();
    }

    function renderLevel(level) {
        var i, j;
        for (j = 0; j < level.height; j++) {
            for (i = 0; i < level.width; i++) {
                var tileType = level.tiles[j][i];
                if (tileType > 0) {
                    var color = displayModule.color(128, 128, 128);
                    if (tileType === 1) color = displayModule.color(100, 100, 100);
                    else if (tileType === 2) color = displayModule.color(0, 255, 0);
                    else if (tileType === 3) color = displayModule.color(255, 255, 0);
                    else if (tileType === 4) color = displayModule.color(255, 0, 0);
                    else if (tileType === 5) color = displayModule.color(0, 255, 255);
                    else if (tileType === 6) color = displayModule.color(150, 150, 150);

                    displayModule.drawFillRect(
                        i * tileSize - camera.x,
                        j * tileSize - camera.y,
                        tileSize,
                        tileSize,
                        color
                    );
                }

                if (showGrid) {
                    displayModule.drawRect(
                        i * tileSize - camera.x,
                        j * tileSize - camera.y,
                        tileSize,
                        tileSize,
                        displayModule.color(30, 30, 30)
                    );
                }
            }
        }
    }

    function renderEditorCursor() {
        var tileInfo = tileTypes[currentTileIndex];

        displayModule.drawRect(
            cursorX - camera.x,
            cursorY - camera.y,
            tileSize,
            tileSize,
            displayModule.color(255, 255, 255)
        );
    }

    function renderEditorUI() {
        var tileInfo = tileTypes[currentTileIndex];

        displayModule.setTextSize(1);
        displayModule.setTextColor(displayModule.color(255, 255, 255));
        displayModule.drawText("Tool: " + tileInfo.name, 2, 2);

        var tileCoords = Math.floor(cursorX / tileSize) + "," + Math.floor(cursorY / tileSize);
        displayModule.drawText("Tile: " + tileCoords, 2, 12);

        displayModule.drawText("[OK] Place  [BACK] Change  [MENU] Menu", 2, 54);
    }

    function createDefaultLevel() {
        var tiles = [];
        var j;
        for (j = 0; j < 8; j++) {
            tiles[j] = [];
            var i;
            for (i = 0; i < 16; i++) {
                if (j === 0 || j === 7 || i === 0 || i === 15) {
                    tiles[j][i] = 1;
                } else if (j === 4 && i > 5 && i < 10) {
                    tiles[j][i] = 1;
                } else if (j === 2 && i === 8) {
                    tiles[j][i] = 3;
                } else if (j === 3 && i === 3) {
                    tiles[j][i] = 4;
                } else if (j === 3 && i === 5) {
                    tiles[j][i] = 4;
                } else if (j === 5 && i === 12) {
                    tiles[j][i] = 2;
                } else {
                    tiles[j][i] = 0;
                }
            }
        }

        return {
            name: "Demo Level",
            width: 16,
            height: 8,
            tileSize: tileSize,
            tiles: tiles,
            objects: []
        };
    }

    function loadLevel(levelData) {
        currentLevel = levelData;
        entities = [];
        score = 0;
        lives = 3;

        var i, j;
        var tiles = levelData.tiles;
        for (j = 0; j < tiles.length; j++) {
            for (i = 0; i < tiles[j].length; i++) {
                if (tiles[j][i] === 1) {
                    var wall = createWall(i * tileSize, j * tileSize);
                    entities.push(wall);
                } else if (tiles[j][i] === 2) {
                    var player = createPlayer(i * tileSize, j * tileSize);
                    entities.push(player);
                } else if (tiles[j][i] === 3) {
                    var coin = createCoin(i * tileSize, j * tileSize);
                    entities.push(coin);
                } else if (tiles[j][i] === 4) {
                    var enemy = createEnemy(i * tileSize, j * tileSize);
                    entities.push(enemy);
                } else if (tiles[j][i] === 5) {
                    var exit = createExit(i * tileSize, j * tileSize);
                    entities.push(exit);
                }
            }
        }
    }

    function rebuildLevelEntities() {
        if (!currentLevel) return;

        entities = [];
        var i, j;
        var tiles = currentLevel.tiles;
        for (j = 0; j < tiles.length; j++) {
            for (i = 0; i < tiles[j].length; i++) {
                if (tiles[j][i] === 1) {
                    var wall = createWall(i * tileSize, j * tileSize);
                    entities.push(wall);
                } else if (tiles[j][i] === 2) {
                    var player = createPlayer(i * tileSize, j * tileSize);
                    entities.push(player);
                } else if (tiles[j][i] === 3) {
                    var coin = createCoin(i * tileSize, j * tileSize);
                    entities.push(coin);
                } else if (tiles[j][i] === 4) {
                    var enemy = createEnemy(i * tileSize, j * tileSize);
                    entities.push(enemy);
                } else if (tiles[j][i] === 5) {
                    var exit = createExit(i * tileSize, j * tileSize);
                    entities.push(exit);
                }
            }
        }
    }

    function createNewLevel(width, height) {
        var tiles = [];
        var j;
        for (j = 0; j < height; j++) {
            tiles[j] = [];
            var i;
            for (i = 0; i < width; i++) {
                if (j === 0 || j === height - 1 || i === 0 || i === width - 1) {
                    tiles[j][i] = 1;
                } else {
                    tiles[j][i] = 0;
                }
            }
        }
        var levelData = {
            name: "New Level",
            width: width,
            height: height,
            tileSize: tileSize,
            tiles: tiles,
            objects: []
        };
        loadLevel(levelData);
        levelWidth = width;
        levelHeight = height;
        return levelData;
    }

    function createNewLevelDialog() {
        var widthStr = dialogModule.prompt("Width (tiles)", 3, "16");
        var heightStr = dialogModule.prompt("Height (tiles)", 3, "8");

        if (widthStr && heightStr) {
            var width = parse_int(widthStr);
            var height = parse_int(heightStr);
            if (width > 0 && height > 0) {
                createNewLevel(width, height);
                cursorX = 0;
                cursorY = 0;
                dialogModule.success("New level created!", true);
            }
        }
    }

    function saveLevel() {
        var name = dialogModule.prompt("Level Name", 20, "level1");
        if (name && currentLevel) {
            currentLevel.name = name;
            var path = { fs: "littlefs", path: "/levels/" + name + ".json" };
            var levelJson = JSON.stringify(currentLevel);
            storageModule.writeFile(path, levelJson);
            dialogModule.success("Level saved!", true);
        }
    }

    function loadLevelDialog() {
        var path = dialogModule.pickFile("/levels", "json");
        if (path) {
            var filename = path.substring(path.lastIndexOf("/") + 1);
            filename = filename.substring(0, filename.lastIndexOf("."));
            if (loadLevelFile(filename)) {
                dialogModule.success("Level loaded!", true);
            } else {
                dialogModule.error("Failed to load level", true);
            }
        }
    }

    function loadLevelFile(filename) {
        var path = { fs: "littlefs", path: "/levels/" + filename + ".json" };
        var data = storageModule.readFile(path);
        if (data) {
            var levelData = JSON.parse(data);
            loadLevel(levelData);
            levelWidth = levelData.width;
            levelHeight = levelData.height;
            return true;
        }
        return false;
    }

    function findPlayer() {
        var i;
        for (i = 0; i < entities.length; i++) {
            if (entities[i].type === "player") {
                return entities[i];
            }
        }
        return null;
    }

    function createPlayer(x, y) {
        return {
            type: "player",
            x: x,
            y: y,
            width: tileSize,
            height: tileSize,
            speed: 2,
            color: displayModule.color(0, 255, 0),
            update: function() {
                var key = keyboardModule.getKey();
                if (key === "up") this.y -= this.speed;
                if (key === "down") this.y += this.speed;
                if (key === "left") this.x -= this.speed;
                if (key === "right") this.x += this.speed;

                var bounds = this.getBounds();
                var i;
                for (i = 0; i < entities.length; i++) {
                    if (entities[i] !== this && entities[i].getBounds) {
                        if (checkCollision(bounds, entities[i].getBounds())) {
                            if (entities[i].type === "coin") {
                                if (!entities[i].collected) {
                                    entities[i].collected = true;
                                    score += 10;
                                    broadcastEvent("COIN_COLLECTED", {
                                        x: entities[i].x,
                                        y: entities[i].y,
                                        coinId: i
                                    });
                                }
                            } else if (entities[i].type === "enemy") {
                                lives--;
                                this.x = 12 * tileSize;
                                this.y = 5 * tileSize;
                                broadcastEvent("PLAYER_DAMAGE", {
                                    playerId: localPlayerId,
                                    lives: lives
                                });
                            } else if (entities[i].type === "exit") {
                                if (isMultiplayerHost) {
                                    broadcastEvent("GAME_OVER", {
                                        winner: localPlayerId,
                                        score: score
                                    });
                                }
                                currentMode = "menu";
                            }
                        }
                    }
                }
            },
            render: function() {
                displayModule.drawFillRect(this.x - camera.x, this.y - camera.y, this.width, this.height, this.color);
                displayModule.drawText("P", this.x - camera.x + 4, this.y - camera.y + 4);
            },
            getBounds: function() {
                return { x: this.x, y: this.y, width: this.width, height: this.height };
            }
        };
    }

    function createWall(x, y) {
        return {
            type: "wall",
            x: x,
            y: y,
            width: tileSize,
            height: tileSize,
            color: displayModule.color(100, 100, 100),
            update: function() {},
            render: function() {
                displayModule.drawFillRect(this.x - camera.x, this.y - camera.y, this.width, this.height, this.color);
            },
            getBounds: function() {
                return { x: this.x, y: this.y, width: this.width, height: this.height };
            }
        };
    }

    function createCoin(x, y) {
        return {
            type: "coin",
            x: x,
            y: y,
            width: 8,
            height: 8,
            color: displayModule.color(255, 255, 0),
            collected: false,
            update: function() {
                if (this.collected) {
                    var index = entities.indexOf(this);
                    if (index > -1) {
                        entities.splice(index, 1);
                    }
                }
            },
            render: function() {
                if (!this.collected) {
                    displayModule.drawFillRect(this.x - camera.x + 4, this.y - camera.y + 4, this.width, this.height, this.color);
                }
            },
            getBounds: function() {
                return { x: this.x, y: this.y, width: this.width, height: this.height };
            }
        };
    }

    function createEnemy(x, y) {
        return {
            type: "enemy",
            x: x,
            y: y,
            width: tileSize,
            height: tileSize,
            speed: 1,
            direction: 1,
            color: displayModule.color(255, 0, 0),
            update: function() {
                this.x += this.speed * this.direction;
                if (this.x > 200 || this.x < 0) {
                    this.direction *= -1;
                }
            },
            render: function() {
                displayModule.drawFillRect(this.x - camera.x, this.y - camera.y, this.width, this.height, this.color);
                displayModule.drawText("E", this.x - camera.x + 4, this.y - camera.y + 4);
            },
            getBounds: function() {
                return { x: this.x, y: this.y, width: this.width, height: this.height };
            }
        };
    }

    function createExit(x, y) {
        return {
            type: "exit",
            x: x,
            y: y,
            width: tileSize,
            height: tileSize,
            color: displayModule.color(0, 255, 255),
            update: function() {},
            render: function() {
                displayModule.drawFillRect(this.x - camera.x, this.y - camera.y, this.width, this.height, this.color);
                displayModule.drawText("X", this.x - camera.x + 4, this.y - camera.y + 4);
            },
            getBounds: function() {
                return { x: this.x, y: this.y, width: this.width, height: this.height };
            }
        };
    }

    function checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    function getEntities() {
        return entities;
    }

    function getCurrentLevel() {
        return currentLevel;
    }

    function getScore() {
        return score;
    }

    function getLives() {
        return lives;
    }

    function getCamera() {
        return camera;
    }

    function getTileSize() {
        return tileSize;
    }

    function getEntities3D() {
        return entities3D;
    }

    function getCamera3D() {
        return camera3D;
    }

    function get3DMode() {
        return current3DMode;
    }

    function setCamera3DPosition(x, y, z) {
        camera3D.x = x;
        camera3D.y = y;
        camera3D.z = z;
    }

    function setCamera3DRotation(pitch, yaw, roll) {
        camera3D.pitch = pitch;
        camera3D.yaw = yaw;
        camera3D.roll = roll;
    }

    function createCube(x, y, z, size, color) {
        var halfSize = size / 2;
        var vertices = [
            { x: x - halfSize, y: y - halfSize, z: z - halfSize },
            { x: x + halfSize, y: y - halfSize, z: z - halfSize },
            { x: x + halfSize, y: y + halfSize, z: z - halfSize },
            { x: x - halfSize, y: y + halfSize, z: z - halfSize },
            { x: x - halfSize, y: y - halfSize, z: z + halfSize },
            { x: x + halfSize, y: y - halfSize, z: z + halfSize },
            { x: x + halfSize, y: y + halfSize, z: z + halfSize },
            { x: x - halfSize, y: y + halfSize, z: z + halfSize }
        ];

        var faces = [
            { indices: [0, 1, 2, 3], normal: { x: 0, y: 0, z: -1 } },
            { indices: [1, 5, 6, 2], normal: { x: 1, y: 0, z: 0 } },
            { indices: [5, 4, 7, 6], normal: { x: 0, y: 0, z: 1 } },
            { indices: [4, 0, 3, 7], normal: { x: -1, y: 0, z: 0 } },
            { indices: [3, 2, 6, 7], normal: { x: 0, y: 1, z: 0 } },
            { indices: [4, 5, 1, 0], normal: { x: 0, y: -1, z: 0 } }
        ];

        return {
            type: "cube",
            vertices: vertices,
            faces: faces,
            color: color || displayModule.color(128, 128, 255),
            centroid: { x: x, y: y, z: z },
            size: size,
            rotationSpeed: 0,
            rotationAxis: "y",
            depth: z,
            update: function() {
                if (this.rotationSpeed !== 0) {
                    var angle = this.rotationSpeed * 0.05;
                    var i;
                    var cosA = Math.cos(angle);
                    var sinA = Math.sin(angle);
                    var axis = this.rotationAxis;
                    var cx = this.centroid.x;
                    var cy = this.centroid.y;
                    var cz = this.centroid.z;

                    for (i = 0; i < this.vertices.length; i++) {
                        var v = this.vertices[i];
                        var dx = v.x - cx;
                        var dy = v.y - cy;
                        var dz = v.z - cz;

                        if (axis === "x") {
                            var ny = dy * cosA - dz * sinA;
                            var nz = dy * sinA + dz * cosA;
                            dy = ny;
                            dz = nz;
                        } else if (axis === "y") {
                            var nx = dx * cosA + dz * sinA;
                            var nz = -dx * sinA + dz * cosA;
                            dx = nx;
                            dz = nz;
                        } else {
                            var nx = dx * cosA - dy * sinA;
                            var ny = dx * sinA + dy * cosA;
                            dx = nx;
                            dy = ny;
                        }

                        v.x = cx + dx;
                        v.y = cy + dy;
                        v.z = cz + dz;
                    }
                }
            },
            render: function() {
                renderCube3D(this);
            }
        };
    }

    function createPyramid(x, y, z, size, color) {
        var halfSize = size / 2;
        var h = size;

        var vertices = [
            { x: x, y: y - h, z: z },
            { x: x - halfSize, y: y + halfSize, z: z - halfSize },
            { x: x + halfSize, y: y + halfSize, z: z - halfSize },
            { x: x + halfSize, y: y + halfSize, z: z + halfSize },
            { x: x - halfSize, y: y + halfSize, z: z + halfSize }
        ];

        var faces = [
            { indices: [0, 1, 2] },
            { indices: [0, 2, 3] },
            { indices: [0, 3, 4] },
            { indices: [0, 4, 1] },
            { indices: [1, 4, 3, 2] }
        ];

        return {
            type: "pyramid",
            vertices: vertices,
            faces: faces,
            color: color || displayModule.color(255, 128, 64),
            centroid: { x: x, y: y, z: z },
            size: size,
            rotationSpeed: 0,
            depth: z,
            update: function() {
                if (this.rotationSpeed !== 0) {
                    var angle = this.rotationSpeed * 0.05;
                    var cosA = Math.cos(angle);
                    var sinA = Math.sin(angle);
                    var cx = this.centroid.x;
                    var cy = this.centroid.y;
                    var cz = this.centroid.z;

                    var i;
                    for (i = 0; i < this.vertices.length; i++) {
                        var v = this.vertices[i];
                        var dx = v.x - cx;
                        var dz = v.z - cz;
                        var nx = dx * cosA + dz * sinA;
                        var nz = -dx * sinA + dz * cosA;
                        v.x = cx + nx;
                        v.z = cz + nz;
                    }
                }
            },
            render: function() {
                renderPyramid3D(this);
            }
        };
    }

    function createGrid(size, spacing, color) {
        return {
            type: "grid",
            size: size,
            spacing: spacing,
            color: color || displayModule.color(64, 64, 64),
            depth: 0,
            update: function() {},
            render: function() {
                var halfSize = this.size / 2;
                var i;
                for (i = -halfSize; i <= halfSize; i += this.spacing) {
                    addLine3D(i, halfSize, 0, i, -halfSize, 0, this.color);
                    addLine3D(-halfSize, i, 0, halfSize, i, 0, this.color);
                }
            }
        };
    }

    function addLine3D(x1, y1, z1, x2, y2, z2, color) {
        var line = {
            type: "line3d",
            x1: x1,
            y1: y1,
            z1: z1,
            x2: x2,
            y2: y2,
            z2: z2,
            color: color || displayModule.color(255, 255, 255),
            depth: (z1 + z2) / 2,
            update: function() {},
            render: function() {
                var p1 = projectPoint(this.x1, this.y1, this.z1);
                var p2 = projectPoint(this.x2, this.y2, this.z2);
                if (p1 && p2) {
                    displayModule.drawLine(
                        Math.floor(p1.x), Math.floor(p1.y),
                        Math.floor(p2.x), Math.floor(p2.y),
                        this.color
                    );
                }
            }
        };
        entities3D.push(line);
    }

    function update3D() {
        var key = keyboardModule.getKey();
        if (key === "left") {
            camera3D.yaw -= 0.05;
        } else if (key === "right") {
            camera3D.yaw += 0.05;
        } else if (key === "up") {
            camera3D.pitch -= 0.05;
        } else if (key === "down") {
            camera3D.pitch += 0.05;
        }

        var i;
        for (i = 0; i < entities3D.length; i++) {
            if (entities3D[i].update) {
                entities3D[i].update();
            }
        }
    }

    function render3D() {
        displayModule.fill(displayModule.color(0, 0, 0));
        clearScreenBuffer();

        var tempEntities = entities3D.slice();
        tempEntities.sort(function(a, b) {
            var depthA = a.depth !== undefined ? a.depth : 0;
            var depthB = b.depth !== undefined ? b.depth : 0;
            return depthB - depthA;
        });

        var i;
        for (i = 0; i < tempEntities.length; i++) {
            if (tempEntities[i].render) {
                tempEntities[i].render();
            }
        }

        displayModule.setTextSize(1);
        displayModule.setTextAlign("left", "top");
        displayModule.drawText("3D Mode: " + current3DMode, 2, 2);
        displayModule.drawText("Use arrows to rotate", 2, 12);

        displayModule.display();
    }

    function projectPoint(x, y, z) {
        var cx = x - camera3D.x;
        var cy = y - camera3D.y;
        var cz = z - camera3D.z;

        var cosPitch = Math.cos(camera3D.pitch);
        var sinPitch = Math.sin(camera3D.pitch);
        var cosYaw = Math.cos(camera3D.yaw);
        var sinYaw = Math.sin(camera3D.yaw);
        var cosRoll = Math.cos(camera3D.roll);
        var sinRoll = Math.sin(camera3D.roll);

        var y1 = cy * cosPitch - cz * sinPitch;
        var z1 = cy * sinPitch + cz * cosPitch;
        var x1 = cx * cosYaw + z1 * sinYaw;
        var z2 = -cx * sinYaw + z1 * cosYaw;
        var x2 = x1 * cosRoll - y1 * sinRoll;
        var y2 = x1 * sinRoll + y1 * cosRoll;

        if (z2 <= 0) {
            return null;
        }

        var scale = projection.fov / z2;
        var screenX = screenWidth / 2 + x2 * scale;
        var screenY = screenHeight / 2 + y2 * scale;

        return {
            x: screenX,
            y: screenY,
            z: z2
        };
    }

    function renderCube3D(cube) {
        var projectedVerts = [];
        var i;
        for (i = 0; i < cube.vertices.length; i++) {
            projectedVerts[i] = projectPoint(
                cube.vertices[i].x,
                cube.vertices[i].y,
                cube.vertices[i].z
            );
        }

        var visibleFaces = [];
        for (i = 0; i < cube.faces.length; i++) {
            var face = cube.faces[i];
            var v0 = cube.vertices[face.indices[0]];
            var v1 = cube.vertices[face.indices[1]];
            var v2 = cube.vertices[face.indices[2]];

            var edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
            var edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

            var normal = {
                x: edge1.y * edge2.z - edge1.z * edge2.y,
                y: edge1.z * edge2.x - edge1.x * edge2.z,
                z: edge1.x * edge2.y - edge1.y * edge2.x
            };

            var toCamera = {
                x: v0.x - camera3D.x,
                y: v0.y - camera3D.y,
                z: v0.z - camera3D.z
            };

            var dot = normal.x * toCamera.x + normal.y * toCamera.y + normal.z * toCamera.z;

            if (dot < 0) {
                var avgZ = 0;
                var j;
                for (j = 0; j < face.indices.length; j++) {
                    var pv = projectedVerts[face.indices[j]];
                    if (pv) {
                        avgZ += pv.z;
                    }
                }
                visibleFaces.push({
                    face: face,
                    avgZ: avgZ / face.indices.length
                });
            }
        }

        visibleFaces.sort(function(a, b) {
            return b.avgZ - a.avgZ;
        });

        var faceIndex;
        for (faceIndex = 0; faceIndex < visibleFaces.length; faceIndex++) {
            var f = visibleFaces[faceIndex].face;
            var indices = f.indices;

            if (current3DMode === "filled") {
                var shade = Math.max(0.3, Math.min(1, 1 - (visibleFaces.length - faceIndex) * 0.15));
                var r = Math.floor(((cube.color >> 16) & 0xFF) * shade);
                var g = Math.floor(((cube.color >> 8) & 0xFF) * shade);
                var b = Math.floor((cube.color & 0xFF) * shade);
                var shadedColor = (r << 16) | (g << 8) | b;

                for (i = 0; i < indices.length; i++) {
                    var p1 = projectedVerts[indices[i]];
                    var p2 = projectedVerts[indices[(i + 1) % indices.length]];
                    if (p1 && p2) {
                        displayModule.drawLine(
                            Math.floor(p1.x), Math.floor(p1.y),
                            Math.floor(p2.x), Math.floor(p2.y),
                            shadedColor
                        );
                    }
                }
            } else {
                for (i = 0; i < indices.length; i++) {
                    var p1 = projectedVerts[indices[i]];
                    var p2 = projectedVerts[indices[(i + 1) % indices.length]];
                    if (p1 && p2) {
                        displayModule.drawLine(
                            Math.floor(p1.x), Math.floor(p1.y),
                            Math.floor(p2.x), Math.floor(p2.y),
                            cube.color
                        );
                    }
                }
            }
        }
    }

    function renderPyramid3D(pyramid) {
        var projectedVerts = [];
        var i;
        for (i = 0; i < pyramid.vertices.length; i++) {
            projectedVerts[i] = projectPoint(
                pyramid.vertices[i].x,
                pyramid.vertices[i].y,
                pyramid.vertices[i].z
            );
        }

        var visibleFaces = [];
        for (i = 0; i < pyramid.faces.length; i++) {
            var face = pyramid.faces[i];
            var v0 = pyramid.vertices[face.indices[0]];
            var v1 = pyramid.vertices[face.indices[1]];
            var v2 = pyramid.vertices[face.indices[2]];

            var edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
            var edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

            var normal = {
                x: edge1.y * edge2.z - edge1.z * edge2.y,
                y: edge1.z * edge2.x - edge1.x * edge2.z,
                z: edge1.x * edge2.y - edge1.y * edge2.x
            };

            var toCamera = {
                x: v0.x - camera3D.x,
                y: v0.y - camera3D.y,
                z: v0.z - camera3D.z
            };

            var dot = normal.x * toCamera.x + normal.y * toCamera.y + normal.z * toCamera.z;

            if (dot < 0) {
                var avgZ = 0;
                var j;
                for (j = 0; j < face.indices.length; j++) {
                    var pv = projectedVerts[face.indices[j]];
                    if (pv) {
                        avgZ += pv.z;
                    }
                }
                visibleFaces.push({
                    face: face,
                    avgZ: avgZ / face.indices.length
                });
            }
        }

        visibleFaces.sort(function(a, b) {
            return b.avgZ - a.avgZ;
        });

        var faceIndex;
        for (faceIndex = 0; faceIndex < visibleFaces.length; faceIndex++) {
            var f = visibleFaces[faceIndex].face;
            var indices = f.indices;

            for (i = 0; i < indices.length; i++) {
                var p1 = projectedVerts[indices[i]];
                var p2 = projectedVerts[indices[(i + 1) % indices.length]];
                if (p1 && p2) {
                    displayModule.drawLine(
                        Math.floor(p1.x), Math.floor(p1.y),
                        Math.floor(p2.x), Math.floor(p2.y),
                        pyramid.color
                    );
                }
            }
        }
    }

    function startESPMultiplayerMenu() {
        var running = true;
        var selectedIndex = 0;
        var options = [
            ["Host ESP-NOW Game", "esp_host"],
            ["Join ESP-NOW Game", "esp_join"],
            ["Pair Devices", "esp_pair"],
            ["Paired Devices", "esp_devices"],
            ["ESP-NOW Status", "esp_status"],
            ["Back", "back"]
        ];

        while (running) {
            displayModule.fill(displayModule.color(0, 0, 0));

            displayModule.setTextSize(2);
            displayModule.setTextAlign("center", "middle");
            displayModule.drawText("ESP-NOW Multiplayer", 64, 12);

            displayModule.setTextSize(1);
            var y = 32;
            var i;
            for (i = 0; i < options.length; i++) {
                var prefix = i === selectedIndex ? "> " : "  ";
                displayModule.drawText(prefix + (i + 1) + ". " + options[i][0], 10, y);
                y += 10;
            }

            var espStatus = "Not Initialized";
            if (espNowInitialized) {
                espStatus = espNowManager.getConnectionState();
                if (espNowManager.getPeerCount() > 0) {
                    espStatus += " (" + espNowManager.getPeerCount() + " peers)";
                }
            }

            displayModule.setTextColor(displayModule.color(0, 255, 0));
            displayModule.drawText("Status: " + espStatus, 64, 58);

            displayModule.display();

            var key = keyboardModule.getKeyPress();
            if (key === "up") {
                selectedIndex = (selectedIndex - 1 + options.length) % options.length;
            } else if (key === "down") {
                selectedIndex = (selectedIndex + 1) % options.length;
            } else if (key === "ok" || key === "enter") {
                if (options[selectedIndex][1] === "esp_host") {
                    hostESPMultiplayerGame();
                } else if (options[selectedIndex][1] === "esp_join") {
                    joinESPMultiplayerGame();
                } else if (options[selectedIndex][1] === "esp_pair") {
                    showESPPairingMenu();
                } else if (options[selectedIndex][1] === "esp_devices") {
                    showPairedDevices();
                } else if (options[selectedIndex][1] === "esp_status") {
                    showESPStatus();
                } else if (options[selectedIndex][1] === "back") {
                    running = false;
                }
            } else if (key === "back") {
                running = false;
            }

            delay(100);
        }
    }

    function hostESPMultiplayerGame() {
        if (!initESPNOW()) {
            dialogModule.error("Failed to initialize ESP-NOW.\nMake sure your device supports ESP-NOW.", true);
            return;
        }

        var pairingResult = espNowManager.startPairingMode(60000);
        if (!pairingResult.success) {
            dialogModule.error("Failed to start pairing mode", true);
            return;
        }

        var channelStr = dialogModule.prompt("Channel [" + espChannel + "]", 3, String(espChannel));
        if (channelStr) {
            espChannel = parse_int(channelStr) || 1;
        }

        var deviceName = dialogModule.prompt("Device Name", 20, "Bruce");

        isESPMultiplayerHost = true;
        isESPMultiplayerClient = false;
        espLocalPlayerId = Math.floor(Math.random() * 10000);

        dialogModule.success(
            "ESP-NOW Game Hosted!\n\n" +
            "Pairing Code: " + espNowManager.getPairingCode() + "\n" +
            "Channel: " + espChannel + "\n" +
            "Your Player ID: " + espLocalPlayerId + "\n\n" +
            "Share the pairing code with other players.\n" +
            "They can join using 'Join ESP-NOW Game'.",
            true
        );

        initESPMultiplayerGameLoop();
    }

    function joinESPMultiplayerGame() {
        if (!initESPNOW()) {
            dialogModule.error("Failed to initialize ESP-NOW.\nMake sure your device supports ESP-NOW.", true);
            return;
        }

        var pairingCode = dialogModule.prompt("Enter Host Pairing Code", 6, "");
        var hostMAC = dialogModule.prompt("Host MAC Address", 17, "");

        if (!pairingCode || pairingCode.length !== 6) {
            dialogModule.error("Invalid pairing code. Must be 6 characters.", true);
            return;
        }

        if (!hostMAC) {
            dialogModule.error("Please enter the host's MAC address", true);
            return;
        }

        var pairResult = espNowManager.pairWithDevice(hostMAC, pairingCode);
        if (pairResult.success) {
            isESPMultiplayerHost = false;
            isESPMultiplayerClient = true;
            espLocalPlayerId = Math.floor(Math.random() * 10000);

            var joinMessage = {
                type: "PLAYER_JOINED",
                playerId: espLocalPlayerId,
                playerName: "Player " + espLocalPlayerId,
                pairingCode: pairingCode
            };

            espNowManager.send(hostMAC, joinMessage);

            dialogModule.success(
                "Joined ESP-NOW Game!\n\n" +
                "Player ID: " + espLocalPlayerId + "\n" +
                "Host MAC: " + hostMAC + "\n\n" +
                "Wait for the host to start the game.",
                true
            );

            initESPMultiplayerGameLoop();
        } else {
            dialogModule.error("Failed to join: " + (pairResult.error || "Unknown error"), true);
        }
    }

    function showESPPairingMenu() {
        if (!initESPNOW()) {
            dialogModule.error("ESP-NOW not available", true);
            return;
        }

        var running = true;
        var selectedIndex = 0;
        var options = [
            ["Start Pairing (30s)", "start_30"],
            ["Start Pairing (60s)", "start_60"],
            ["Stop Pairing", "stop"],
            ["Enter MAC Manually", "manual"],
            ["Back", "back"]
        ];

        while (running) {
            displayModule.fill(displayModule.color(0, 0, 0));

            displayModule.setTextSize(2);
            displayModule.setTextAlign("center", "middle");
            displayModule.drawText("Device Pairing", 64, 12);

            displayModule.setTextSize(1);
            var y = 32;

            var pairStatus = espNowManager.getConnectionState();
            if (espPairingMode) {
                pairStatus = "PAIRING (Code: " + espNowManager.getPairingCode() + ")";
            }
            displayModule.setTextColor(displayModule.color(0, 255, 0));
            displayModule.drawText("Status: " + pairStatus, 64, 24);

            var mac = espNowManager.getMACAddress();
            displayModule.setTextColor(displayModule.color(255, 255, 255));
            displayModule.drawText("My MAC: " + (mac || "Unknown"), 64, 34);

            y = 44;
            var i;
            for (i = 0; i < options.length; i++) {
                var prefix = i === selectedIndex ? "> " : "  ";
                displayModule.drawText(prefix + (i + 1) + ". " + options[i][0], 10, y);
                y += 10;
            }

            displayModule.display();

            var key = keyboardModule.getKeyPress();
            if (key === "up") {
                selectedIndex = (selectedIndex - 1 + options.length) % options.length;
            } else if (key === "down") {
                selectedIndex = (selectedIndex + 1) % options.length;
            } else if (key === "ok" || key === "enter") {
                if (options[selectedIndex][1] === "start_30") {
                    var result30 = espNowManager.startPairingMode(30000);
                    dialogModule.info("Pairing mode started.\nCode: " + result30.pairingCode, true);
                } else if (options[selectedIndex][1] === "start_60") {
                    var result60 = espNowManager.startPairingMode(60000);
                    dialogModule.info("Pairing mode started.\nCode: " + result60.pairingCode, true);
                } else if (options[selectedIndex][1] === "stop") {
                    espNowManager.stopPairingMode();
                    dialogModule.info("Pairing mode stopped", true);
                } else if (options[selectedIndex][1] === "manual") {
                    var macInput = dialogModule.prompt("Enter Device MAC", 17, "");
                    if (macInput) {
                        var codeInput = dialogModule.prompt("Pairing Code", 6, "");
                        var manualResult = espNowManager.pairWithDevice(macInput, codeInput);
                        if (manualResult.success) {
                            dialogModule.success("Paired with " + manualResult.peerMac, true);
                        } else {
                            dialogModule.error("Failed to pair: " + (manualResult.error || "Unknown error"), true);
                        }
                    }
                } else if (options[selectedIndex][1] === "back") {
                    running = false;
                }
            } else if (key === "back") {
                running = false;
            }

            delay(100);
        }
    }

    function showPairedDevices() {
        if (!espNowInitialized || !espNowManager) {
            dialogModule.info("No ESP-NOW manager initialized", true);
            return;
        }

        var peers = espNowManager.getPairedPeers();
        if (peers.length === 0) {
            dialogModule.info("No paired devices.\nUse 'Pair Devices' to add devices.", true);
            return;
        }

        var running = true;
        var selectedIndex = 0;

        while (running) {
            displayModule.fill(displayModule.color(0, 0, 0));

            displayModule.setTextSize(2);
            displayModule.setTextAlign("center", "middle");
            displayModule.drawText("Paired Devices", 64, 12);

            displayModule.setTextSize(1);
            var y = 28;
            var i;
            for (i = 0; i < peers.length; i++) {
                var prefix = i === selectedIndex ? "> " : "  ";
                var lastSeen = new Date(peers[i].lastSeen).toLocaleTimeString();
                displayModule.drawText(prefix + (i + 1) + ". " + peers[i].name, 10, y);
                displayModule.drawText("   " + peers[i].mac, 10, y + 8);
                displayModule.setTextColor(displayModule.color(150, 150, 150));
                displayModule.drawText("   Last seen: " + lastSeen, 10, y + 16);
                displayModule.setTextColor(displayModule.color(255, 255, 255));
                y += 28;
            }

            if (peers.length === 0) {
                displayModule.drawText("No devices paired", 64, 40);
            }

            displayModule.setTextColor(displayModule.color(150, 150, 150));
            displayModule.drawText("[OK] Remove  [BACK] Back", 64, 58);

            displayModule.display();

            var key = keyboardModule.getKeyPress();
            if (key === "up") {
                selectedIndex = (selectedIndex - 1 + peers.length) % peers.length;
            } else if (key === "down") {
                selectedIndex = (selectedIndex + 1) % peers.length;
            } else if (key === "ok" || key === "enter") {
                if (peers[selectedIndex]) {
                    var confirmRemove = dialogModule.choice([
                        ["Remove " + peers[selectedIndex].name, "remove"],
                        ["Back", "back"]
                    ]);
                    if (confirmRemove === "remove") {
                        espNowManager.removePeer(peers[selectedIndex].mac);
                        peers = espNowManager.getPairedPeers();
                        selectedIndex = Math.min(selectedIndex, peers.length - 1);
                    }
                }
            } else if (key === "back") {
                running = false;
            }

            delay(100);
        }
    }

    function showESPStatus() {
        if (!espNowInitialized || !espNowManager) {
            dialogModule.info("ESP-NOW not initialized", true);
            return;
        }

        var stats = espNowManager.getStats();
        var mac = espNowManager.getMACAddress();
        var peers = espNowManager.getPairedPeers();

        var statusText =
            "Connection: " + stats.connectionState + "\n\n" +
            "MAC Address: " + (mac || "Unknown") + "\n" +
            "Channel: " + stats.channel + "\n\n" +
            "Paired Devices: " + stats.peerCount + "\n\n" +
            "Statistics:\n" +
            "  TX Success: " + stats.txSuccess + "\n" +
            "  TX Failed: " + stats.txFailed + "\n" +
            "  RX Count: " + stats.rxCount + "\n\n" +
            "Device List:";

        for (var i = 0; i < peers.length; i++) {
            statusText += "\n  " + (i + 1) + ". " + peers[i].name + "\n     " + peers[i].mac;
        }

        dialogModule.info(statusText, true);
    }

    function initESPNOW() {
        if (espNowInitialized && espNowManager) {
            return true;
        }

        espNowManager = createESPNOWManager();
        var initResult = espNowManager.initialize({ channel: espChannel });

        if (initResult.success) {
            espNowInitialized = true;
            espChannel = initResult.channel || 1;

            espNowManager.setReceiveCallback(function(data, senderMAC) {
                handleESPMultiplayerMessage(data, senderMAC);
            });

            return true;
        }

        if (initResult.simulationMode) {
            espNowInitialized = true;
            dialogModule.info("ESP-NOW running in simulation mode.\nReal ESP-NOW features will work on ESP32 hardware.", false);
            return true;
        }

        return false;
    }

    function initESPMultiplayerGameLoop() {
        espLastSyncTime = Date.now();

        if (isESPMultiplayerHost && espNowManager) {
            espNowManager.broadcast({
                type: "GAME_READY",
                hostId: espLocalPlayerId,
                levelData: currentLevel ? currentLevel : createDefaultLevel()
            });
        }
    }

    function handleESPMultiplayerMessage(data, senderMAC) {
        if (data.type === "PLAYER_JOINED") {
            if (!espPeers[senderMAC]) {
                espPeers[senderMAC] = {
                    id: data.playerId,
                    name: data.playerName || "Player " + data.playerId,
                    mac: senderMAC,
                    x: 0,
                    y: 0,
                    color: generatePlayerColor(data.playerId)
                };

                if (isESPMultiplayerHost) {
                    espNowManager.broadcast({
                        type: "PLAYER_JOINED",
                        playerId: data.playerId,
                        playerName: data.playerName,
                        mac: senderMAC
                    }, senderMAC);
                }

                dialogModule.info(data.playerName || "Player " + data.playerId + " joined via ESP-NOW!", false);
            }
        } else if (data.type === "PLAYER_LEFT") {
            delete espPeers[senderMAC];
            if (isESPMultiplayerHost) {
                espNowManager.broadcast({
                    type: "PLAYER_LEFT",
                    playerId: data.playerId,
                    mac: senderMAC
                });
            }
        } else if (data.type === "PLAYER_MOVE") {
            var peer = espPeers[senderMAC];
            if (peer) {
                peer.x = data.x;
                peer.y = data.y;
            }
        } else if (data.type === "GAME_READY") {
            if (isESPMultiplayerClient && data.levelData) {
                loadLevel(data.levelData);
                currentMode = "esp_multiplayer";
                espMultiplayerGameLoop();
            }
        } else if (data.type === "GAME_START") {
            if (isESPMultiplayerClient) {
                if (data.levelData) {
                    loadLevel(data.levelData);
                }
                currentMode = "esp_multiplayer";
                espMultiplayerGameLoop();
            }
        } else if (data.type === "SYNC_STATE") {
            syncQueue.push(data);
        } else if (data.type === "CHAT") {
            displayModule.drawText(data.sender + ": " + data.text, 2, 50);
        } else if (data.type === "HEARTBEAT") {
            var peer = espPeers[senderMAC];
            if (peer) {
                peer.lastSeen = Date.now();
            }
        }
    }

    function espMultiplayerGameLoop() {
        espLastSyncTime = Date.now();

        while (currentMode === "esp_multiplayer") {
            var now = Date.now();
            var deltaTime = now - espLastSyncTime;

            updateESPMultiplayer(deltaTime);
            renderESPMultiplayer();

            var key = keyboardModule.getKey();
            if (key === "menu") {
                showESPMultiplayerMenu();
            } else if (key === "back") {
                leaveESPMultiplayerSession();
                break;
            }

            if (deltaTime >= espSyncInterval) {
                syncESPMultiplayerState();
                espLastSyncTime = now;
            }

            if (espNowManager) {
                espNowManager.sendHeartbeat();
            }

            delay(30);
        }
    }

    function updateESPMultiplayer(deltaTime) {
        var i;
        for (i = 0; i < entities.length; i++) {
            if (entities[i].update) {
                entities[i].update();
            }
        }

        processSyncQueue();

        if (espNowManager) {
            espNowManager.sendHeartbeat();
        }
    }

    function renderESPMultiplayer() {
        displayModule.fill(displayModule.color(0, 0, 0));

        var i;
        for (i = 0; i < entities.length; i++) {
            if (entities[i].render) {
                entities[i].render();
            }
        }

        for (var peerMac in espPeers) {
            var peer = espPeers[peerMac];
            displayModule.drawFillRect(
                peer.x - camera.x,
                peer.y - camera.y,
                tileSize,
                tileSize,
                peer.color
            );
            displayModule.drawText("P" + peer.id,
                peer.x - camera.x + 2,
                peer.y - camera.y + 4);
        }

        renderESPMultiplayerUI();

        displayModule.display();
    }

    function renderESPMultiplayerUI() {
        displayModule.setTextSize(1);
        displayModule.setTextAlign("left", "top");

        var playerCount = Object.keys(espPeers).length + 1;
        displayModule.setTextColor(displayModule.color(0, 255, 0));
        displayModule.drawText("Players: " + playerCount + " (ESP-NOW)", 2, 2);

        var sessionType = isESPMultiplayerHost ? "HOST" : "CLIENT";
        displayModule.drawText("Session: " + sessionType, 2, 12);

        var connectionStatus = espNowManager ? espNowManager.getConnectionState() : "Unknown";
        displayModule.setTextColor(displayModule.color(100, 200, 255));
        displayModule.drawText("ESP: " + connectionStatus, 100, 2);

        displayModule.setTextColor(displayModule.color(255, 255, 0));
        displayModule.drawText("Score: " + score, 2, 52);

        displayModule.setTextColor(displayModule.color(255, 100, 100));
        displayModule.drawText("Lives: " + lives, 100, 52);

        displayModule.setTextColor(displayModule.color(150, 150, 150));
        displayModule.drawText("[MENU] Menu  [BACK] Leave", 2, 54);
    }

    function showESPMultiplayerMenu() {
        var choice = dialogModule.choice([
            ["Continue", "continue"],
            ["Send Chat", "chat"],
            ["Start Game", "start"],
            ["Leave Session", "leave"]
        ]);

        if (choice === "continue") {
        } else if (choice === "chat") {
            var msg = dialogModule.prompt("Message", 30, "");
            if (msg && espNowManager) {
                var chatMessage = {
                    type: "CHAT",
                    sender: "Player " + espLocalPlayerId,
                    text: msg
                };
                if (isESPMultiplayerHost) {
                    espNowManager.broadcast(chatMessage);
                } else {
                    for (var mac in espPeers) {
                        espNowManager.send(mac, chatMessage);
                    }
                }
            }
        } else if (choice === "start") {
            if (isESPMultiplayerHost) {
                var levelData = currentLevel ? currentLevel : createDefaultLevel();
                espNowManager.broadcast({
                    type: "GAME_START",
                    levelData: levelData,
                    playerId: espLocalPlayerId
                });
                loadLevel(levelData);
                currentMode = "esp_multiplayer";
            } else {
                dialogModule.info("Only host can start the game", true);
            }
        } else if (choice === "leave") {
            leaveESPMultiplayerSession();
        }
    }

    function syncESPMultiplayerState() {
        if (!espNowManager) return;

        var localPlayer = findPlayer();
        if (!localPlayer) return;

        var state = {
            type: "PLAYER_MOVE",
            playerId: espLocalPlayerId,
            x: localPlayer.x,
            y: localPlayer.y,
            timestamp: Date.now()
        };

        if (isESPMultiplayerHost) {
            var syncMessage = {
                type: "SYNC_STATE",
                player: {
                    id: espLocalPlayerId,
                    x: localPlayer.x,
                    y: localPlayer.y
                },
                events: []
            };

            if (lastEvents && lastEvents.length > 0) {
                syncMessage.events = lastEvents;
                lastEvents = [];
            }

            espNowManager.broadcast(syncMessage);
        } else {
            for (var mac in espPeers) {
                espNowManager.send(mac, state);
            }
        }
    }

    function leaveESPMultiplayerSession() {
        var leaveMessage = {
            type: "PLAYER_LEAVE",
            playerId: espLocalPlayerId
        };

        if (espNowManager) {
            if (isESPMultiplayerHost) {
                espNowManager.broadcast(leaveMessage);
            } else {
                for (var mac in espPeers) {
                    espNowManager.send(mac, leaveMessage);
                }
            }
            espNowManager.stopPairingMode();
        }

        isESPMultiplayerHost = false;
        isESPMultiplayerClient = false;
        espLocalPlayerId = null;
        espPeers = {};
        currentMode = "menu";
    }

    function broadcastESPEvent(eventType, data) {
        var event = {
            type: eventType,
            data: data,
            playerId: espLocalPlayerId,
            timestamp: Date.now()
        };

        var syncMessage = {
            type: "SYNC_STATE",
            events: [event]
        };

        if (espNowManager) {
            if (isESPMultiplayerHost) {
                espNowManager.broadcast(syncMessage);
            } else {
                for (var mac in espPeers) {
                    espNowManager.send(mac, syncMessage);
                }
            }
        }

        if (!lastEvents) lastEvents = [];
        lastEvents.push(event);
    }

    function runCoopExamplesMenu() {
        var examples = [
            { name: "Coin Rush Co-op", fn: runCoinRushCoop },
            { name: "Treasure Hunt", fn: runTreasureHunt },
            { name: "Co-op Puzzle", fn: runCoopPuzzle },
            { name: "Escort Mission", fn: runEscortMission },
            { name: "Back", fn: function() { return "back"; } }
        ];

        var selected = 0;
        var running = true;

        while (running) {
            displayModule.fill(displayModule.color(0, 0, 0));

            displayModule.setTextSize(2);
            displayModule.setTextAlign("center", "middle");
            displayModule.drawText("Co-op Games", 64, 15);

            displayModule.setTextSize(1);
            var y = 35;
            var i;
            for (i = 0; i < examples.length; i++) {
                var prefix = i === selected ? "> " : "  ";
                displayModule.drawText(prefix + (i + 1) + ". " + examples[i].name, 10, y);
                y += 12;
            }

            displayModule.display();

            var key = keyboardModule.getKeyPress();
            if (key === "up") {
                selected = (selected - 1 + examples.length) % examples.length;
            } else if (key === "down") {
                selected = (selected + 1) % examples.length;
            } else if (key === "ok" || key === "enter") {
                if (examples[selected].name === "Back") {
                    running = false;
                } else {
                    var result = examples[selected].fn();
                    if (result === "back") {
                        running = false;
                    }
                }
            } else if (key === "back") {
                running = false;
            }

            delay(100);
        }
    }

    function runCoinRushCoop() {
        dialogModule.info("COIN RUSH CO-OP\n\nWork together to collect all coins!\n\nControls:\nArrow Keys - Move\n\nMultiplayer:\nBoth players collect coins\nScore is shared!", true);

        startMultiplayerMenu();
        return "back";
    }

    function runTreasureHunt() {
        dialogModule.info("TREASURE HUNT CO-OP\n\nFind hidden treasures together!\n\nRules:\n- Treasures spawn randomly\n- Players see different hints\n- Must communicate to find all!\n\nMultiplayer:\nShare hints with chat!", true);

        startMultiplayerMenu();
        return "back";
    }

    function runCoopPuzzle() {
        dialogModule.info("CO-OP PUZZLE\n\nSolve puzzles together!\n\nFeatures:\n- Pressure plates require 2 players\n- Some doors need multiple switches\n- Communicate to coordinate!", true);

        startMultiplayerMenu();
        return "back";
    }

    function runEscortMission() {
        dialogModule.info("ESCORT MISSION\n\nProtect the VIP together!\n\nOne player controls the VIP\nOthers defend against enemies!\n\nMultiplayer:\n- VIP player moves slowly\n- Defenders fight enemies\n- Win if VIP reaches exit!", true);

        startMultiplayerMenu();
        return "back";
    }

    function createCoopGameLevel() {
        var tileSize = 16;
        var level = {
            name: "Co-op Arena",
            width: 16,
            height: 10,
            tileSize: tileSize,
            tiles: []
        };

        var y, x;
        for (y = 0; y < level.height; y++) {
            level.tiles[y] = [];
            for (x = 0; x < level.width; x++) {
                if (y === 0 || y === level.height - 1 || x === 0 || x === level.width - 1) {
                    level.tiles[y][x] = 1;
                } else if (Math.random() < 0.15) {
                    level.tiles[y][x] = 1;
                } else if (Math.random() < 0.1) {
                    level.tiles[y][x] = 3;
                } else {
                    level.tiles[y][x] = 0;
                }
            }
        }

        level.tiles[1][1] = 2;
        level.tiles[1][2] = 2;

        return level;
    }

    var VRSdk = {
        version: "1.0.0",
        createSession: function(config) {
            vrSession = createVRSessionManager();
            return vrSession.createSession(config);
        },
        joinSession: function(sessionCode, hostIP, port) {
            vrSession = createVRSessionManager();
            return vrSession.joinSession(sessionCode, hostIP, port);
        },
        getNetworkManager: function() {
            return vrNetworkManager;
        },
        getInputManager: function() {
            return vrInputManager;
        },
        getAvatarManager: function() {
            return vrAvatarManager;
        },
        getSpatialAudio: function() {
            return vrSpatialAudio;
        },
        getPerformanceManager: function() {
            return vrPerformanceManager;
        },
        getHeadPose: function() {
            return vrHeadPose;
        },
        getControllers: function() {
            return vrControllers;
        },
        isInSession: function() {
            return isVRSession;
        },
        getLocalPlayerId: function() {
            return localVRPlayerId;
        },
        broadcastPose: function(headPose, controllers) {
            return broadcastVRPose(headPose, controllers);
        },
        applyRemotePose: function(peerId, message) {
            return applyRemoteVRPose(peerId, message);
        },
        triggerHaptic: function(hand, intensity, duration) {
            if (vrInputManager) {
                return vrInputManager.triggerHaptic(hand, intensity, duration);
            }
            return false;
        },
        setQualityLevel: function(level) {
            vrQualityLevel = level;
            if (level === "low") {
                vrAvatarLOD = 1;
                vrUpdateRates.headTracking = 60;
            } else if (level === "medium") {
                vrAvatarLOD = 2;
                vrUpdateRates.headTracking = 75;
            } else {
                vrAvatarLOD = 3;
                vrUpdateRates.headTracking = 90;
            }
        },
        getQualityLevel: function() {
            return vrQualityLevel;
        },
        enablePrediction: function(enabled) {
            vrPredictionEnabled = enabled;
        },
        setLatencyCompensation: function(ms) {
            vrLatencyCompensation = ms;
        },
        getUpdateRates: function() {
            return Object.assign({}, vrUpdateRates);
        },
        setUpdateRate: function(type, rate) {
            if (vrUpdateRates.hasOwnProperty(type)) {
                vrUpdateRates[type] = rate;
            }
        },
        getMetrics: function() {
            if (vrPerformanceManager) {
                return vrPerformanceManager.getMetrics();
            }
            return null;
        },
        initialize: function() {
            return initVRManager();
        },
        cleanup: function() {
            leaveVRSession();
        }
    };

    var vrMessageTypes = {
        HEAD_POSE: "VR_HEAD_POSE",
        CONTROLLER_STATE: "VR_CONTROLLER_STATE",
        AVATAR_UPDATE: "VR_AVATAR_UPDATE",
        HAPTIC_FEEDBACK: "VR_HAPTIC_FEEDBACK",
        VOICE_DATA: "VR_VOICE_DATA",
        ROOM_CONFIG: "VR_ROOM_CONFIG",
        PLAYER_JOIN: "VR_PLAYER_JOIN",
        PLAYER_LEAVE: "VR_PLAYER_LEAVE",
        CHAT_MESSAGE: "VR_CHAT",
        PING: "VR_PING",
        PONG: "VR_PONG"
    };

    function quantizePosition(position, decimals) {
        decimals = decimals || 2;
        var factor = Math.pow(10, decimals);
        return {
            x: Math.round(position.x * factor) / factor,
            y: Math.round(position.y * factor) / factor,
            z: Math.round(position.z * factor) / factor
        };
    }

    function quantizeRotation(rotation, decimals) {
        decimals = decimals || 3;
        var factor = Math.pow(10, decimals);
        return {
            x: Math.round(rotation.x * factor) / factor,
            y: Math.round(rotation.y * factor) / factor,
            z: Math.round(rotation.z * factor) / factor,
            w: Math.round(rotation.w * factor) / factor
        };
    }

    function compressHeadPose(headPose) {
        return {
            p: quantizePosition(headPose.position, 2),
            r: quantizeRotation(headPose.rotation, 3),
            t: headPose.timestamp
        };
    }

    function decompressHeadPose(compressed) {
        return {
            position: compressed.p,
            rotation: compressed.r,
            timestamp: compressed.t
        };
    }

    function createVRSnapshot() {
        return {
            headPose: vrHeadPose ? compressHeadPose(vrHeadPose) : null,
            controllers: vrControllers ? {
                left: vrControllers.left,
                right: vrControllers.right
            } : null,
            timestamp: Date.now(),
            playerId: localVRPlayerId
        };
    }

    function applyVRSnapshot(snapshot) {
        if (!snapshot || !vrAvatarManager) return;

        var poses = {
            head: snapshot.headPose ? decompressHeadPose(snapshot.headPose) : null
        };

        if (snapshot.controllers) {
            if (snapshot.controllers.left) {
                poses.leftHand = {
                    position: snapshot.controllers.left.position || { x: 0, y: 0, z: 0 },
                    rotation: snapshot.controllers.left.rotation || { x: 0, y: 0, z: 0, w: 1 }
                };
            }
            if (snapshot.controllers.right) {
                poses.rightHand = {
                    position: snapshot.controllers.right.position || { x: 0, y: 0, z: 0 },
                    rotation: snapshot.controllers.right.rotation || { x: 0, y: 0, z: 0, w: 1 }
                };
            }
        }

        vrAvatarManager.updateAvatarPose(snapshot.playerId, poses);
    }

    function calculateAvatarDistance(avatar1, avatar2) {
        if (!avatar1 || !avatar2) return Infinity;

        var pos1 = avatar1.poses.head.position;
        var pos2 = avatar2.poses.head.position;

        var dx = pos1.x - pos2.x;
        var dy = pos1.y - pos2.y;
        var dz = pos1.z - pos2.z;

        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function getLODForDistance(distance) {
        if (distance < 5) return 3;
        if (distance < 15) return 2;
        return 1;
    }

    function optimizeVRAvatarRendering() {
        if (!vrAvatarManager) return;

        var avatars = vrAvatarManager.getAllAvatars();
        var localAvatar = avatars[localVRPlayerId];

        if (!localAvatar) return;

        var playerIds = Object.keys(avatars);
        for (var i = 0; i < playerIds.length; i++) {
            var playerId = playerIds[i];
            if (playerId === localVRPlayerId) continue;

            var avatar = avatars[playerId];
            var distance = calculateAvatarDistance(avatar, localAvatar);
            var lod = getLODForDistance(distance);

            var visibleParts = ["body"];
            if (lod >= 2) visibleParts.push("head");
            if (lod >= 3) {
                visibleParts.push("leftHand");
                visibleParts.push("rightHand");
            }

            avatar.meshes.head.visible = visibleParts.indexOf("head") >= 0;
            avatar.meshes.leftHand.visible = visibleParts.indexOf("leftHand") >= 0;
            avatar.meshes.rightHand.visible = visibleParts.indexOf("rightHand") >= 0;
        }
    }

    function predictLocalPose(input, velocity) {
        if (!vrPredictionEnabled || !input) return input;

        var predicted = {
            position: {
                x: input.position.x + velocity.x * (vrLatencyCompensation / 1000),
                y: input.position.y + velocity.y * (vrLatencyCompensation / 1000),
                z: input.position.z + velocity.z * (vrLatencyCompensation / 1000)
            },
            rotation: input.rotation,
            timestamp: input.timestamp
        };

        return predicted;
    }

    function reconcileRemotePose(peerId, predicted, actual) {
        var threshold = 0.5;
        var avatar = vrAvatarManager ? vrAvatarManager.getAvatar(peerId) : null;

        if (!avatar) return actual;

        var dx = Math.abs(predicted.position.x - actual.position.x);
        var dy = Math.abs(predicted.position.y - actual.position.y);
        var dz = Math.abs(predicted.position.z - actual.position.z);

        if (dx > threshold || dy > threshold || dz > threshold) {
            return actual;
        }

        return predicted;
    }

    function getNetworkQuality() {
        if (!vrPerformanceManager) return "unknown";

        var metrics = vrPerformanceManager.getMetrics();
        if (metrics.quality > 0.8) return "excellent";
        if (metrics.quality > 0.6) return "good";
        if (metrics.quality > 0.4) return "fair";
        return "poor";
    }

    function adjustForNetworkConditions() {
        if (!vrPerformanceManager) return;

        var quality = getNetworkQuality();

        if (quality === "poor") {
            vrUpdateRates.headTracking = 45;
            vrUpdateRates.controllerTracking = 20;
            vrQualityLevel = "low";
        } else if (quality === "fair") {
            vrUpdateRates.headTracking = 60;
            vrUpdateRates.controllerTracking = 40;
            vrQualityLevel = "medium";
        } else {
            vrUpdateRates.headTracking = 90;
            vrUpdateRates.controllerTracking = 60;
            vrQualityLevel = "high";
        }
    }

    function createVRStateDelta(oldState, newState) {
        var delta = {
            changes: {},
            timestamp: Date.now()
        };

        if (!oldState || !newState) return null;

        if (JSON.stringify(oldState.headPose) !== JSON.stringify(newState.headPose)) {
            delta.changes.headPose = compressHeadPose(newState.headPose);
        }

        var leftChanged = !oldState.controllers || !newState.controllers ||
            JSON.stringify(oldState.controllers.left) !== JSON.stringify(newState.controllers.left);
        var rightChanged = !oldState.controllers || !newState.controllers ||
            JSON.stringify(oldState.controllers.right) !== JSON.stringify(newState.controllers.right);

        if (leftChanged || rightChanged) {
            delta.changes.controllers = newState.controllers;
        }

        return Object.keys(delta.changes).length > 0 ? delta : null;
    }

    function applyVRStateDelta(delta, currentState) {
        if (!delta || !currentState) return currentState;

        var newState = JSON.parse(JSON.stringify(currentState));

        if (delta.changes.headPose) {
            newState.headPose = decompressHeadPose(delta.changes.headPose);
        }

        if (delta.changes.controllers) {
            newState.controllers = delta.changes.controllers;
        }

        newState.timestamp = delta.timestamp;
        return newState;
    }

    return {
        init: init,
        run: run,
        stop: stop,
        getMode: getMode,
        startWifiControl: startWifiControl,
        stopWifiControl: stopWifiControl,
        getWifiStatus: getWifiStatus,
        getWifiIsRunning: getWifiIsRunning,
        startBluetoothMenu: startBluetoothMenu,
        startControllerPairing: startControllerPairing,
        scanForControllers: scanForControllers,
        pairController: pairController,
        testController: testController,
        getBluetoothControllerInput: getBluetoothControllerInput,
        getPairedControllers: function() { return btPairedControllers; },
        getActiveController: function() { return btActiveController; },
        connectController: function(addr) {
            if (btControllerManager) {
                return btControllerManager.connectController(addr);
            }
            return { success: false, error: "Controller manager not initialized" };
        },
        disconnectController: function() {
            if (btControllerManager) {
                btControllerManager.disconnectController();
            }
        },
        startMultiplayerMenu: startMultiplayerMenu,
        hostMultiplayerGame: hostMultiplayerGame,
        joinMultiplayerGame: joinMultiplayerGame,
        leaveMultiplayerSession: leaveMultiplayerSession,
        isMultiplayerHost: function() { return isMultiplayerHost; },
        isMultiplayerClient: function() { return isMultiplayerClient; },
        getLocalPlayerId: function() { return localPlayerId; },
        getMultiplayerPlayers: function() { return multiplayerPlayers; },
        broadcastEvent: broadcastEvent,
        runCoopExamplesMenu: runCoopExamplesMenu,
        createCoopGameLevel: createCoopGameLevel,
        startVRMultiplayerMenu: startVRMultiplayerMenu,
        createVRSession: createVRSession,
        joinVRSession: joinVRSession,
        VRSdk: VRSdk,
        vrMessageTypes: vrMessageTypes,
        getVRHeadPose: getVRHeadPose,
        broadcastVRPose: broadcastVRPose,
        applyRemoteVRPose: applyRemoteVRPose,
        quantizePosition: quantizePosition,
        quantizeRotation: quantizeRotation,
        compressHeadPose: compressHeadPose,
        decompressHeadPose: decompressHeadPose,
        createVRSnapshot: createVRSnapshot,
        applyVRSnapshot: applyVRSnapshot,
        predictLocalPose: predictLocalPose,
        reconcileRemotePose: reconcileRemotePose,
        optimizeVRAvatarRendering: optimizeVRAvatarRendering,
        getNetworkQuality: getNetworkQuality,
        adjustForNetworkConditions: adjustForNetworkConditions,
        createVRStateDelta: createVRStateDelta,
        applyVRStateDelta: applyVRStateDelta
    };
})();

if (typeof require !== "undefined" && require.main === module) {
    BruceEngine.init();
    BruceEngine.run();
}
