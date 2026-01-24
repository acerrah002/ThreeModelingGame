import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/DRACOLoader.js';

/**
 * Function to initialize a 3D scene in a specific HTML element
 */
function init3DScene(elementId, modelPath) {
    const container = document.getElementById(elementId);
    if (!container) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // 2. Setup Camera
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 1, 2); // Moves camera much closer to the model
    
    // 3. Setup Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2);
    mainLight.position.set(5, 10, 7.5);
    scene.add(mainLight);

    // 5. Orbit Controls (Mouse interaction)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 6. Load Model with Draco support
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./draco/'); // Make sure this folder exists!

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(modelPath, (gltf) => {
        const model = gltf.scene;
        
        // Rotates the model 180 degrees (Math.PI)
        model.rotation.y = Math.PI/-2;
        // Auto-Center Logic
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        model.position.x += (model.position.x - center.x);
        model.position.y += (model.position.y - center.y);
        model.position.z += (model.position.z - center.z);

        // Adjust camera to fit model size
        const maxDim = Math.max(size.x, size.y, size.z);
        camera.position.z = maxDim * 1.2;

        scene.add(model);
    }, 
    (xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% loaded'); },
    (error) => { console.error('Error loading model:', error); });

    // 7. Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // 8. Handle Resizing for this specific box
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

// --- INITIALIZE YOUR MODELS ---

// Use your specific model filenames here
init3DScene('box1', './VTuberModelv4Clean.glb');
init3DScene('box2', './VTuberModelGirlv3.glb');