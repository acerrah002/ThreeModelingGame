import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const loader = new GLTFLoader();
import * as CANNON from 'cannon-es';

const keys = { w: false, a: false, s: false, d: false, space: false };

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

// --- 1. SETUP PHYSICS ---
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });

// MAKE IT SLIPPERY (Move this OUTSIDE the loop)
const groundMaterial = new CANNON.Material('ground');
const playerMaterial = new CANNON.Material('player');
const contactMaterial = new CANNON.ContactMaterial(groundMaterial, playerMaterial, {
    friction: 0.0, // This removes the ground drag
    restitution: 0.1 
});
world.addContactMaterial(contactMaterial);

const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
groundBody.addShape(new CANNON.Plane());
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

const playerBody = new CANNON.Body({ 
    mass: 1, 
    position: new CANNON.Vec3(0, 2, 0),
    fixedRotation: true,
    material: playerMaterial // Apply the slippery material here
});
playerBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)));
world.addBody(playerBody);

// --- 2. SETUP VISUALS ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100), 
    new THREE.MeshPhongMaterial({ color: 0x444444 })
);
floorMesh.rotation.x = -Math.PI / 2;
scene.add(floorMesh);

const playerMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1), 
    new THREE.MeshPhongMaterial({ color: 0x00ff00 })
);
scene.add(playerMesh);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light, new THREE.AmbientLight(0x404040));

// --- 3. FUNCTIONS ---
function playerJump() {
    if (Math.abs(playerBody.velocity.y) < 0.1 && playerBody.position.y < 0.6) {
        playerBody.velocity.y = 6; 
    }
}

// Variables
let currentHealth = 100; 
const zombies = []; // A list to keep track of all zombies

function updateZombies() {
    zombies.forEach((zombie) => {
        // 1. Calculate direction toward player
        const dx = playerBody.position.x - zombie.body.position.x;
        const dz = playerBody.position.z - zombie.body.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // 2. Movement Logic
        const zombieSpeed = 3;
        if (distance > 1.2) {
            // Move toward player
            zombie.body.velocity.x = (dx / distance) * zombieSpeed;
            zombie.body.velocity.z = (dz / distance) * zombieSpeed;
            
            // Make the zombie mesh "look" at the player
            zombie.mesh.lookAt(playerBody.position.x, zombie.body.position.y, playerBody.position.z);
        } else {
            // 3. Attack Logic (if touching)
            updateHealth(-0.2); 
            // Apply a small bounce-back so they don't overlap the player
            zombie.body.velocity.x *= -0.5;
            zombie.body.velocity.z *= -0.5;
        }

        // 4. Sync Visuals to Physics
        zombie.mesh.position.copy(zombie.body.position);
        zombie.mesh.quaternion.copy(zombie.body.quaternion);
    });
}

function spawnZombie(x, z) {
    // 1. Physics
    const zombieBody = new CANNON.Body({ mass: 1, position: new CANNON.Vec3(x, 2, z) });
    zombieBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)));
    world.addBody(zombieBody);

    // 2. Visuals (Red Cube)
    const zombieMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshPhongMaterial({ color: 0xff0000 })
    );
    scene.add(zombieMesh);

    zombies.push({ body: zombieBody, mesh: zombieMesh });
}

// Spawn 3 zombies to start
spawnZombie(10, -10);
spawnZombie(-10, -5);
spawnZombie(5, -15);

function updateHealth(amount) {
    // Modify the existing health
    currentHealth += amount;

    // Constrain health between 0 and 100
    if (currentHealth > 100) currentHealth = 100;
    if (currentHealth < 0) currentHealth = 0;

    // Update the UI
    const healthBarFill = document.getElementById('health-bar-fill');
    if (healthBarFill) {
        healthBarFill.style.width = currentHealth + "%";
    }

    // Check for Death
    if (currentHealth <= 0) {
        console.log("Player Died!");
        resetGame();
    }
}

function resetGame() {
    currentHealth = 100; // Reset the value
    updateHealth(0);     // Update the UI bar back to 100%
    playerBody.position.set(0, 5, 0);
    playerBody.velocity.set(0, 0, 0);
}

// --- 4. THE GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);

    const moveSpeed = 7; // Increased speed slightly for better feel
    
    let xVel = 0;
    let zVel = 0;

    if (keys.w) zVel = -moveSpeed;
    if (keys.s) zVel = moveSpeed;
    if (keys.a) xVel = -moveSpeed;
    if (keys.d) xVel = moveSpeed;

    playerBody.velocity.x = xVel;
    playerBody.velocity.z = zVel;

    if (keys.space) playerJump();

    world.fixedStep(); 

    // 3. Call our new AI function
    updateZombies(); 
    
    // Sync Mesh to Physics Body
    playerMesh.position.copy(playerBody.position);
    playerMesh.quaternion.copy(playerBody.quaternion);

    // Camera Follow
    camera.position.set(
        playerMesh.position.x, 
        playerMesh.position.y + 5, 
        playerMesh.position.z + 10
    );
    camera.lookAt(playerMesh.position);

    renderer.render(scene, camera);
}

animate();