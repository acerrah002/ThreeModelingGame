import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

// --- GLOBALS ---
const loader = new GLTFLoader();
const keys = { w: false, a: false, s: false, d: false, space: false };
const zombies = [];
const clock = new THREE.Clock(); // Add this at the top
let currentHealth = 100000;

// --- INITIALIZE ENGINES ---
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Materials
const playerMaterial = new CANNON.Material('player');
const groundMaterial = new CANNON.Material('ground');

// Physical Objects (Bodies)
let playerBody, groundBody;
// Visual Objects (Meshes)
let playerMesh;

// --- 1. SETUP FUNCTIONS ---

function initGame() {
    setupRenderer();
    setupPhysics();
    setupLights();
    setupEnvironment();
    setupPlayer();
    setupInputs();
    
    // Spawn initial enemies
    spawnZombie(10, -10);
    spawnZombie(-10, -5);
    spawnZombie(5, -15);

    animate();
}

function setupRenderer() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
}

function setupPhysics() {
    const contactMaterial = new CANNON.ContactMaterial(groundMaterial, playerMaterial, {
        friction: 0.0,
        restitution: 0.1 
    });
    world.addContactMaterial(contactMaterial);

    groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);
}

function setupLights() {
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    scene.add(light, new THREE.AmbientLight(0x404040));
}

function setupEnvironment() {
    const floorMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100), 
        new THREE.MeshPhongMaterial({ color: 0x444444 })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    scene.add(floorMesh);
}

function setupPlayer() {
    // Physics
    playerBody = new CANNON.Body({ 
        mass: 1, 
        position: new CANNON.Vec3(0, 2, 0),
        fixedRotation: true,
        material: playerMaterial
    });
    playerBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)));
    world.addBody(playerBody);

    // Visuals
    //Task 1 replace the CUBE with your player mode
    //loader.load('/YourPlayerModel.glb', (gltf) => {
    //    playerMesh = gltf.scene;
    //    scene.add(playerMesh);
    //});
    playerMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1), 
        new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    );
    scene.add(playerMesh);
}

// --- 2. LOGIC FUNCTIONS ---

function handleMovement() {
    const moveSpeed = 7;
    playerBody.velocity.x = (keys.d ? moveSpeed : 0) + (keys.a ? -moveSpeed : 0);
    playerBody.velocity.z = (keys.s ? moveSpeed : 0) + (keys.w ? -moveSpeed : 0);
    if (keys.space) playerJump();
}

function playerJump() {
    if (Math.abs(playerBody.velocity.y) < 0.1 && playerBody.position.y < 0.6) {
        playerBody.velocity.y = 6; 
    }
}

function updateZombies() {
    zombies.forEach((zombie) => {
        if (!zombie.mesh) return;

        // 1. Calculate direction
        const dx = playerBody.position.x - zombie.body.position.x;
        const dz = playerBody.position.z - zombie.body.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // 2. FACE THE PLAYER (Visual Only)
        zombie.mesh.lookAt(playerBody.position.x, zombie.body.position.y, playerBody.position.z);

        // 3. MOVEMENT LOGIC
        if (distance > 2) {
            zombie.body.velocity.x = (dx / distance) * 2;
            zombie.body.velocity.z = (dz / distance) * 2;
        } else {
            updateHealth(-0.5); 
            zombie.body.velocity.x += -1;
            zombie.body.velocity.z += -1;
        }

        // 4. SYNC POSITION
        zombie.mesh.position.copy(zombie.body.position);
        zombie.mesh.position.y -= 0.4; 
        
    });
}

function updateAnimations() {
    const delta = clock.getDelta();

    zombies.forEach((zombie) => {
        if (!zombie.mixer || !zombie.actions['Idle']) return;

        // 1. Advance the animation clock
        zombie.mixer.update(delta);

        // 2. Determine which animation SHOULD be playing
        const dx = playerBody.position.x - zombie.body.position.x;
        const dz = playerBody.position.z - zombie.body.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const speed = zombie.body.velocity.length();

        let nextAction = zombie.actions['Idle'];

        if (distance < 2.2) {
            nextAction = zombie.actions['Attack'];
        } else if (speed > 0.5) {
            nextAction = zombie.actions['Run'];
        }

        // 3. If the state changed, crossfade to the new animation
        if (nextAction && zombie.currentAction !== nextAction) {
            nextAction.reset().fadeIn(0.2).play();
            if (zombie.currentAction) zombie.currentAction.fadeOut(0.2);
            zombie.currentAction = nextAction;
        }
    });
}

function spawnZombie(x, z) {
    const zombieBody = new CANNON.Body({ 
        mass: 1, 
        position: new CANNON.Vec3(x, 2, z),
        fixedRotation: true,
        material: playerMaterial
    });
    zombieBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)));
    world.addBody(zombieBody);

    loader.load('/Skeleton.glb', (gltf) => {
    const zombieMesh = gltf.scene;
    scene.add(zombieMesh);

    const mixer = new THREE.AnimationMixer(zombieMesh);
    const actions = {};

    gltf.animations.forEach((clip) => {
        // This 'find' logic looks for the word "Idle" or "Run" inside that long name
        if (clip.name.includes("Idle")) actions['Idle'] = mixer.clipAction(clip);
        if (clip.name.includes("Run")) actions['Run'] = mixer.clipAction(clip);
        if (clip.name.includes("Attack")) actions['Attack'] = mixer.clipAction(clip);
        if (clip.name.includes("Death")) actions['Death'] = mixer.clipAction(clip);
    });

    // Start with Idle
    if (actions['Idle']) actions['Idle'].play();

    zombies.push({ 
        body: zombieBody, 
        mesh: zombieMesh, 
        mixer: mixer, 
        actions: actions,
        currentAction: actions['Idle'] 
    });
});
}

function updateHealth(amount) {
    currentHealth = Math.max(0, Math.min(100000, currentHealth + amount));
    const healthBarFill = document.getElementById('health-bar-fill');
    if (healthBarFill) healthBarFill.style.width = currentHealth + "%";
    if (currentHealth <= 0) resetGame();
}

function resetGame() {
    currentHealth = 100;
    updateHealth(0);
    playerBody.position.set(0, 5, 0);
    playerBody.velocity.set(0, 0, 0);
}

function setupInputs() {
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (key === ' ') keys.space = true;
        if (keys.hasOwnProperty(key)) keys[key] = true;
    });
    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (key === ' ') keys.space = false;
        if (keys.hasOwnProperty(key)) keys[key] = false;
    });
}

// --- 3. THE LOOP ---

function animate() {
    requestAnimationFrame(animate);
    
    handleMovement();
    world.fixedStep(); 
    updateZombies(); 
    updateAnimations(); // <--- Add this here

    // Sync Player
    playerMesh.position.copy(playerBody.position);
    playerMesh.quaternion.copy(playerBody.quaternion);

    // Camera Follow
    camera.position.set(playerMesh.position.x, playerMesh.position.y + 5, playerMesh.position.z + 10);
    camera.lookAt(playerMesh.position);

    renderer.render(scene, camera);
}

// START THE GAME
initGame();