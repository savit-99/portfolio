import './style.css';
import { portfolioContent } from './content.js';
import * as THREE from 'three';

const uiOverlay = document.getElementById('ui-overlay');
const terminalContent = document.getElementById('terminal-content');
const terminalTitle = document.querySelector('.terminal-title');
const closeBtn = document.getElementById('close-btn');
const apIndicator = document.getElementById('ap-indicator');
const surfaceIndicator = document.getElementById('surface-indicator');
const gforceText = document.getElementById('gforce-text');

// Cockpit UI
const navLockIndicator = document.getElementById('nav-lock-indicator');
const navLockText = document.getElementById('nav-lock-text');
const needleSpeed = document.getElementById('needle-speed');
const dialSpeedVal = document.getElementById('dial-speed-val');
const needleHeading = document.getElementById('needle-heading');
const dialHeadingVal = document.getElementById('dial-heading-val');
const needleAlt100 = document.getElementById('needle-alt-100');
const needleAlt1000 = document.getElementById('needle-alt-1000');
const dialAltVal = document.getElementById('dial-alt-val');
const btnApToggle = document.getElementById('btn-ap-toggle');
const waypointsContainer = document.getElementById('waypoints-container');
const atcBox = document.getElementById('atc-box');

let isPaused = true;
let isCrashed = false;
let autopilotEngaged = false;
let flightSequence = 'NONE';
let localizerEngaged = false;
let gearDown = true;
let activeDestination = null;
let currentWaypointIndex = 0;
let lastOpenedZone = null;
let isOnRunway = false;
let offRoadTimer = 0;
let typingInterval = null;

const crashScreen = document.getElementById('crash-screen');
const locIndicator = document.getElementById('loc-indicator');
const gearText = document.getElementById('gear-text');
const btnSeq = document.getElementById('btn-seq');
const stallWarning = document.getElementById('stall-warning');
const gpwsAlert = document.getElementById('gpws-alert');
const flightControls = document.getElementById('flight-controls');
const cockpitPanel = document.getElementById('cockpit-panel');
const introScreen = document.getElementById('intro-screen');
const btnStatic = document.getElementById('btn-static');
const btnFly = document.getElementById('btn-fly');
const staticPortfolio = document.getElementById('static-portfolio');
const staticContent = document.getElementById('static-content');
const btnBackToFly = document.getElementById('btn-back-to-fly');
const destCue = document.getElementById('dest-cue');

btnStatic.addEventListener('click', () => {
  introScreen.classList.add('hidden');
  introScreen.style.display = 'none';
  staticPortfolio.classList.remove('hidden');
  staticPortfolio.style.display = 'block';
  
  let html = '';
  const sections = [
    { id: 'about', title: 'ABOUT_ME.TXT' },
    { id: 'education', title: 'EDUCATION.DAT' },
    { id: 'experience', title: 'WORK_EXPERIENCE.EXE' },
    { id: 'projects', title: 'PROJECTS.BIN' },
    { id: 'skills', title: 'SKILLS_MATRIX.SYS' }
  ];
  
  sections.forEach(s => {
    html += `
      <div class="static-section">
        <h2>${s.title}</h2>
        <div>${portfolioContent[s.id]}</div>
      </div>
    `;
  });
  staticContent.innerHTML = html;
});

function resetKeys() {
  for (let k in keys) keys[k] = false;
}

btnFly.addEventListener('click', () => {
  introScreen.classList.add('hidden');
  introScreen.style.display = 'none';
  clock.getDelta(); // Clear accumulated delta
  resetKeys();
  isPaused = false;
  cockpitPanel.classList.remove('hidden');
  if (!activeDestination) {
    destCue.classList.remove('hidden');
  }
});

btnSeq.addEventListener('click', () => {
  if (flightSequence === 'NONE' || flightSequence === 'LANDING') {
    if (playerGroup.position.y <= 10) {
      flightSequence = 'TAKEOFF';
      autopilotEngaged = true;
      btnSeq.textContent = 'CANCEL SEQUENCE';
    } else if (activeDestination) {
      flightSequence = 'CRUISE';
      autopilotEngaged = true;
      btnSeq.textContent = 'CANCEL SEQUENCE';
    }
  } else {
    flightSequence = 'NONE';
    autopilotEngaged = false;
  }
});



// Three.js Setup
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.Fog(0x050505, 4000, 10000);

const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 2000;
const camera = new THREE.OrthographicCamera(frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, 1, 10000);
const keys = { w: false, a: false, s: false, d: false, ' ': false, Shift: false, f: false, g: false, l: false };
btnApToggle.addEventListener('click', () => {
  if (!isPaused && !isCrashed) {
    toggleAutopilot();
  }
});

function toggleAutopilot() {
  autopilotEngaged = !autopilotEngaged;
  
  if (autopilotEngaged) {
    btnApToggle.classList.add('active');
    btnApToggle.textContent = 'ON';
  } else {
    btnApToggle.classList.remove('active');
    btnApToggle.textContent = 'OFF';
  }
  
  if (autopilotEngaged) {
    if (flightSequence === 'NONE') {
      flightSequence = (playerGroup.position.y <= 10 && !activeDestination) ? 'TAKEOFF' : 'CRUISE';
    }
    btnSeq.textContent = 'CANCEL SEQUENCE';
    localizerEngaged = false;
    locIndicator.textContent = 'LOC: OFF [L]';
    locIndicator.classList.remove('ap-on');
    flightControls.style.display = 'none';
    for (let k in keys) keys[k] = false;
  } else {
    flightSequence = 'NONE';
    btnSeq.textContent = 'INITIATE ' + (playerGroup.position.y <= 10 ? 'TAKEOFF' : 'LANDING');
    flightControls.style.display = 'block';
  }
}

window.addEventListener('keydown', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (keys.hasOwnProperty(key)) keys[key] = true;
  if (key === 'f' && !isPaused && !isCrashed) {
    toggleAutopilot();
  }
  if (key === 'l' && !isPaused && !isCrashed && !autopilotEngaged && activeDestination) {
    localizerEngaged = !localizerEngaged;
    locIndicator.textContent = localizerEngaged ? 'LOC: LOCKED [L]' : 'LOC: OFF [L]';
    if (localizerEngaged) {
      locIndicator.classList.add('ap-on');
      atcBox.innerHTML = `<div>ATC: LOCALIZER ENGAGED.</div><div style="font-size:0.8em; color:#aaa;">MAINTAIN REQUIRED ALTITUDE AND SPEED MANUALLY.</div>`;
    } else {
      locIndicator.classList.remove('ap-on');
    }
  }
  if (key === 'g' && !isPaused && !isCrashed) {
    gearDown = !gearDown;
    gearText.textContent = gearDown ? 'DOWN [G]' : 'UP [G]';
    gearText.style.color = gearDown ? '#00ff00' : '#ffaa00';
    gearFront.visible = gearDown;
    gearLeft.visible = gearDown;
    gearRight.visible = gearDown;
  }
});
window.addEventListener('keyup', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (keys.hasOwnProperty(key)) keys[key] = false;
});

// Create Player (B-2 Spirit Wireframe)
const playerGroup = new THREE.Group();
playerGroup.position.set(0, 0, 0); // Spawn exactly on the runway tarmac
scene.add(playerGroup);

// Isometric Camera (do not attach to playerGroup)
camera.position.set(2000, 2000, 2000);
camera.lookAt(0, 0, 0);


// B-2 Shape
const b2Shape = new THREE.Shape();
const s = 100; // scale
b2Shape.moveTo(0, -s * 0.8);
b2Shape.lineTo(s * 1.5, s * 0.5);
b2Shape.lineTo(s * 0.8, 0);
b2Shape.lineTo(s * 0.3, s * 0.6);
b2Shape.lineTo(0, s * 0.2);
b2Shape.lineTo(-s * 0.3, s * 0.6);
b2Shape.lineTo(-s * 0.8, 0);
b2Shape.lineTo(-s * 1.5, s * 0.5);
b2Shape.lineTo(0, -s * 0.8);

const extrudeSettings = { depth: 5, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 1, bevelThickness: 1 };
const b2Geo = new THREE.ExtrudeGeometry(b2Shape, extrudeSettings);
b2Geo.translate(0, 0, -2.5); // Center extrusion
const b2Mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, side: THREE.DoubleSide });
const playerMesh = new THREE.Mesh(b2Geo, b2Mat);
// Rotate so nose points along -Z axis
playerMesh.rotation.x = Math.PI / 2; 
playerMesh.rotation.z = 0;
playerGroup.add(playerMesh);

// Landing Gear
const gearGeo = new THREE.BoxGeometry(4, 15, 4);
const gearMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
const gearFront = new THREE.Mesh(gearGeo, gearMat);
gearFront.position.set(0, -5, -40);
const gearLeft = new THREE.Mesh(gearGeo, gearMat);
gearLeft.position.set(-30, -5, 20);
const gearRight = new THREE.Mesh(gearGeo, gearMat);
gearRight.position.set(30, -5, 20);
playerGroup.add(gearFront, gearLeft, gearRight);

// Engine Trails
const trailCount = 100;
const trailGeo = new THREE.BufferGeometry();
const trailPos = new Float32Array(trailCount * 3);
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
const trailMat = new THREE.PointsMaterial({ color: 0x00ff00, size: 3 });
const trailPoints = new THREE.Points(trailGeo, trailMat);
scene.add(trailPoints);
let trailIndex = 0;

// Skid Marks
const skidCount = 200;
const skidGeo = new THREE.BufferGeometry();
const skidPos = new Float32Array(skidCount * 3);
// Initialize off-screen
for (let i = 0; i < skidCount * 3; i++) skidPos[i] = -999999;
skidGeo.setAttribute('position', new THREE.BufferAttribute(skidPos, 3));
const skidMat = new THREE.PointsMaterial({ color: 0x111111, size: 15, depthWrite: false });
const skidPoints = new THREE.Points(skidGeo, skidMat);
scene.add(skidPoints);
let skidIndex = 0;

// Player Physics State
const physics = {
  speed: 0,
  maxSpeed: 75,
  minSpeed: 0,
  pitch: 0, // up/down angle
  roll: 0,  // banking angle
  yaw: 0    // heading
};

// Environment
const gridHelper = new THREE.GridHelper(300000, 6000, 0x003300, 0x001100);
scene.add(gridHelper);

// Background Particles (Dust/Stars)
const particleCount = 20000;
const particleGeo = new THREE.BufferGeometry();
const particlePos = new Float32Array(particleCount * 3);
for(let i=0; i<particleCount; i++) {
  particlePos[i*3] = (Math.random() - 0.5) * 300000;
  particlePos[i*3+1] = Math.random() * 4000;
  particlePos[i*3+2] = (Math.random() - 0.5) * 300000;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
const particleMat = new THREE.PointsMaterial({ color: 0x00ff00, size: 2 });
const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// Zones Data
const zonesData = [
  { id: 'start', title: 'START RUNWAY', content: '', x: 0, z: 0, elevation: 0, angle: 0, waypoints: [] },
  { id: 'about', title: 'ABOUT_ME.TXT', content: portfolioContent.about, x: 0, z: -80000, elevation: 0, angle: 0, waypoints: [] },
  { id: 'education', title: 'EDUCATION.DAT', content: portfolioContent.education, x: -70000, z: -110000, elevation: 0, angle: Math.PI / 4, waypoints: [
      {x: 0, z: -20000, alt: 1000}, {x: -30000, z: -50000, alt: 1000}, {x: -52322, z: -92322, alt: 1000}
  ]},
  { id: 'experience', title: 'WORK_EXPERIENCE.EXE', content: portfolioContent.experience, x: -40000, z: -40000, elevation: 0, angle: Math.PI / 2, waypoints: [
      {x: 0, z: -20000, alt: 1000}, {x: -15000, z: -40000, alt: 1000}
  ]},
  { id: 'projects', title: 'PROJECTS.BIN', content: portfolioContent.projects, x: 90000, z: -100000, elevation: 0, angle: -Math.PI / 4, waypoints: [
      {x: 0, z: -20000, alt: 1000}, {x: 40000, z: -50000, alt: 1000}, {x: 72322, z: -82322, alt: 1000}
  ]},
  { id: 'skills', title: 'SKILLS_MATRIX.SYS', content: portfolioContent.skills, x: 100000, z: -20000, elevation: 0, angle: -Math.PI / 2, waypoints: [
      {x: 0, z: -10000, alt: 1000}, {x: 50000, z: -20000, alt: 1000}, {x: 75000, z: -20000, alt: 1000}
  ]}
];

// Global Illumination
const ambientLight = new THREE.AmbientLight(0x223344, 1.5);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffddaa, 1.2);
sunLight.position.set(50000, 20000, 30000);
scene.add(sunLight);
const fillLight = new THREE.DirectionalLight(0x004488, 0.8);
fillLight.position.set(-50000, 10000, -30000);
scene.add(fillLight);

// Procedural Scenery (Generated after zones to avoid runway collisions)
const numBuildings = 16000;
const buildingGeo = new THREE.BoxGeometry(200, 1000, 200);
buildingGeo.translate(0, 500, 0); // pivot at bottom
const buildingMat = new THREE.MeshStandardMaterial({ 
  color: 0xffffff, // Base white, overridden by instanceColor
  roughness: 0.2, 
  metalness: 0.8,
  emissive: 0x001122,
  emissiveIntensity: 0.5
});
const buildings = new THREE.InstancedMesh(buildingGeo, buildingMat, numBuildings);
scene.add(buildings);

const numTrees = 30000;
const treeGeo = new THREE.ConeGeometry(50, 200, 4);
treeGeo.translate(0, 100, 0); // pivot at bottom
const treeMat = new THREE.MeshStandardMaterial({ 
  color: 0xffffff, 
  roughness: 0.8, 
  metalness: 0.1 
});
const forest = new THREE.InstancedMesh(treeGeo, treeMat, numTrees);
scene.add(forest);


const dummy = new THREE.Object3D();

// Data Cubes (High altitude)
const numCubes = 5000;
const cubeGeo = new THREE.BoxGeometry(200, 200, 200);
const cubeMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, wireframe: true, transparent: true, opacity: 0.3 });
const dataCubes = new THREE.InstancedMesh(cubeGeo, cubeMat, numCubes);
scene.add(dataCubes);

for (let i = 0; i < numCubes; i++) {
  dummy.position.set(
    (Math.random() - 0.5) * 300000, 
    3000 + Math.random() * 10000, 
    (Math.random() - 0.5) * 300000
  );
  dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
  dummy.scale.setScalar(0.5 + Math.random() * 1.5);
  dummy.updateMatrix();
  dataCubes.setMatrixAt(i, dummy.matrix);
}

// Smoke Particles for Touchdown
const smokeParticles = [];
const smokeGeo = new THREE.PlaneGeometry(30, 30);
const smokeMat = new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.5, depthWrite: false });

function isValidSpawn(x, z, excludeRadius) {
  for(let zData of zonesData) {
    const dx = x - zData.x;
    const dz = z - zData.z;
    if (Math.hypot(dx, dz) < excludeRadius) return false;
  }
  return true;
}

const buildingChunks = new Map();
const CHUNK_SIZE = 10000;

function addBuildingToChunk(x, z, r, h) {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cz = Math.floor(z / CHUNK_SIZE);
  const key = `${cx}_${cz}`;
  if (!buildingChunks.has(key)) buildingChunks.set(key, []);
  buildingChunks.get(key).push({x, z, r, h});
}

let bCount = 0;
const bColor = new THREE.Color();
const bPalette = [0x111111, 0x1a2a3a, 0x0a1a1a, 0x222222, 0x0f2f3f];

while(bCount < numBuildings) {
  const x = (Math.random() - 0.5) * 280000;
  const z = (Math.random() - 0.5) * 280000;
  if(isValidSpawn(x, z, 28000)) { // increased exclude radius for 50k runways
    const sx = 1 + Math.random();
    const sy = Math.random() * 0.4 + 0.2; // Max height 600 (0.6 * 1000)
    const sz = 1 + Math.random();
    dummy.position.set(x, 0, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0, Math.random() * Math.PI, 0);
    dummy.updateMatrix();
    buildings.setMatrixAt(bCount, dummy.matrix);
    
    // Store building bounding box in spatial grid
    const radius = Math.max(sx, sz) * 141 + 50; // 200 width box diagonal is ~282, half is 141
    const height = sy * 1000;
    addBuildingToChunk(x, z, radius, height);
    
    // Assign random dark neon color
    bColor.setHex(bPalette[Math.floor(Math.random() * bPalette.length)]);
    buildings.setColorAt(bCount, bColor);
    
    bCount++;
  }
}
buildings.instanceMatrix.needsUpdate = true;
if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;

let tCount = 0;
const tColor = new THREE.Color();
const tPalette = [0x003300, 0x004411, 0x002200, 0x113300, 0x005511];

while(tCount < numTrees) {
  const x = (Math.random() - 0.5) * 280000;
  const z = (Math.random() - 0.5) * 280000;
  if(isValidSpawn(x, z, 27000)) { // increased exclude radius
    dummy.position.set(x, 0, z);
    dummy.scale.set(1, Math.random() + 0.5, 1);
    dummy.rotation.set(0, Math.random() * Math.PI, 0);
    dummy.updateMatrix();
    forest.setMatrixAt(tCount, dummy.matrix);
    
    tColor.setHex(tPalette[Math.floor(Math.random() * tPalette.length)]);
    forest.setColorAt(tCount, tColor);
    
    tCount++;
  }
}
forest.instanceMatrix.needsUpdate = true;
if (forest.instanceColor) forest.instanceColor.needsUpdate = true;

const zoneMeshes = [];

// Visual Approach Path (Pre-defined flight path)
const approachPathGroup = new THREE.Group();
const approachBoxes = [];
const appBoxGeo = new THREE.BoxGeometry(800, 30, 2000);
const appBoxMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.15 });
for (let i = 0; i < 20; i++) {
  const box = new THREE.Mesh(appBoxGeo, appBoxMat);
  approachPathGroup.add(box);
  approachBoxes.push(box);
}
approachPathGroup.visible = false;
scene.add(approachPathGroup);
const textCanvas = document.createElement('canvas');
const textCtx = textCanvas.getContext('2d');

function createZone(data) {
  const group = new THREE.Group();
  group.position.set(data.x, data.elevation, data.z);
  group.rotation.y = data.angle;
  
  // Runway
  const rwLength = 50000;
  const rwGeo = new THREE.PlaneGeometry(800, rwLength);
  const rwMat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
  const runway = new THREE.Mesh(rwGeo, rwMat);
  runway.rotation.x = -Math.PI / 2;
  group.add(runway);
  
  // Centerline (Dashed)
  const dashGeo = new THREE.PlaneGeometry(15, 100);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const instancedDashes = new THREE.InstancedMesh(dashGeo, dashMat, 250);
  const dummy = new THREE.Object3D();
  let dashIndex = 0;
  for (let dz = -rwLength/2 + 200; dz < rwLength/2 - 200; dz += 200) {
    if (dashIndex >= 250) break;
    dummy.position.set(0, 0.5, dz);
    dummy.rotation.x = -Math.PI / 2;
    dummy.updateMatrix();
    instancedDashes.setMatrixAt(dashIndex++, dummy.matrix);
  }
  group.add(instancedDashes);
  
  // Central Archway
  const cArchGeo = new THREE.TorusGeometry(300, 20, 16, 100, Math.PI);
  const cArchMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true, transparent: true, opacity: 0.8 });
  const cArch = new THREE.Mesh(cArchGeo, cArchMat);
  cArch.rotation.y = Math.PI / 2; // Face down the runway
  cArch.position.set(0, 0, 0); // Exact center
  group.add(cArch);
  
  // Archway Base Glow
  const archBaseGeo = new THREE.PlaneGeometry(800, 100);
  const archBaseMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.5 });
  const archBase = new THREE.Mesh(archBaseGeo, archBaseMat);
  archBase.rotation.x = -Math.PI / 2;
  archBase.position.y = 1.0;
  group.add(archBase);

  // Threshold Markings
  const threshGeo = new THREE.PlaneGeometry(250, 40);
  const threshMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
  const thresh1 = new THREE.Mesh(threshGeo, threshMat);
  thresh1.rotation.x = -Math.PI / 2;
  thresh1.position.set(0, 0.5, rwLength/2 - 50);
  group.add(thresh1);
  const thresh2 = new THREE.Mesh(threshGeo, threshMat);
  thresh2.rotation.x = -Math.PI / 2;
  thresh2.position.set(0, 0.5, -rwLength/2 + 50);
  group.add(thresh2);
  
  // Touchdown Zone Markers
  const tzGeo = new THREE.PlaneGeometry(20, 80);
  for (let tz = 1; tz <= 5; tz++) {
    const tz1 = new THREE.Mesh(tzGeo, threshMat);
    tz1.rotation.x = -Math.PI / 2;
    tz1.position.set(100, 0.5, rwLength/2 - 200 - tz*250);
    group.add(tz1);
    const tz2 = new THREE.Mesh(tzGeo, threshMat);
    tz2.rotation.x = -Math.PI / 2;
    tz2.position.set(-100, 0.5, rwLength/2 - 200 - tz*250);
    group.add(tz2);
  }
  
  // Aim Point Markings (The big bold ones at TDZ)
  const aimGeo = new THREE.PlaneGeometry(40, 300);
  const aim1 = new THREE.Mesh(aimGeo, threshMat);
  aim1.rotation.x = -Math.PI / 2;
  aim1.position.set(120, 0.6, rwLength/2 - 2000); // 2000 units past threshold
  group.add(aim1);
  const aim2 = new THREE.Mesh(aimGeo, threshMat);
  aim2.rotation.x = -Math.PI / 2;
  aim2.position.set(-120, 0.6, rwLength/2 - 2000);
  group.add(aim2);
  
  // 3D Control Tower
  const towerGeo = new THREE.BoxGeometry(60, 200, 60);
  const towerMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
  const tower = new THREE.Mesh(towerGeo, towerMat);
  tower.position.set(250, 100, 0); // Side of runway
  group.add(tower);

  // Data Gate Archway
  const archGeo = new THREE.TorusGeometry(300, 10, 8, 20, Math.PI);
  const archMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
  const arch = new THREE.Mesh(archGeo, archMat);
  arch.position.set(0, 0, -600); // Near the end of the runway
  group.add(arch);

  // Holographic Data Cubes
  const cubeGeo = new THREE.BoxGeometry(60, 60, 60);
  const cubeMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
  const cubes = [];
  for (let i = 0; i < 4; i++) {
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    cube.position.set(i % 2 === 0 ? 200 : -200, 60, -400 - (Math.floor(i / 2) * 300));
    group.add(cube);
    cubes.push(cube);
  }

  // Warning Ring (Red)
  const ringGeo = new THREE.RingGeometry(290, 300, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  group.add(ring);
  
  scene.add(group);
  zoneMeshes.push({ data, group, ring, cubes });
}

zonesData.forEach(createZone);

// Window Resize
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 2000;
  camera.left = -frustumSize * aspect / 2;
  camera.right = frustumSize * aspect / 2;
  camera.top = frustumSize / 2;
  camera.bottom = -frustumSize / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// UI Handling
const radarNavBtn = document.getElementById('radar-nav-btn');
const radarOverlay = document.getElementById('radar-overlay');
const closeRadarBtn = document.getElementById('close-radar-btn');
const radarCanvas = document.getElementById('radar-canvas');
const radarCtx = radarCanvas.getContext('2d');
let isRadarVisible = false;

radarNavBtn.addEventListener('click', () => {
  radarOverlay.classList.remove('hidden');
  isRadarVisible = true;
  // resize canvas to match its CSS size
  radarCanvas.width = radarCanvas.clientWidth;
  radarCanvas.height = radarCanvas.clientHeight;
});

closeRadarBtn.addEventListener('click', () => {
  radarOverlay.classList.add('hidden');
  isRadarVisible = false;
});

function drawRadar() {
  if (!isRadarVisible) return;
  const w = radarCanvas.width;
  const h = radarCanvas.height;
  radarCtx.clearRect(0, 0, w, h);
  
  radarCtx.strokeStyle = '#003300';
  radarCtx.lineWidth = 1;
  for (let i = 0; i < w; i += 50) {
    radarCtx.beginPath(); radarCtx.moveTo(i, 0); radarCtx.lineTo(i, h); radarCtx.stroke();
  }
  for (let i = 0; i < h; i += 50) {
    radarCtx.beginPath(); radarCtx.moveTo(0, i); radarCtx.lineTo(w, i); radarCtx.stroke();
  }

  const scale = Math.min(w, h) / 250000;
  const cx = w / 2;
  const cy = h / 2;

  for (let z of zonesData) {
    if (z.id === 'start') continue;
    const rX = cx + z.x * scale;
    const rY = cy + z.z * scale;
    
    radarCtx.strokeStyle = '#00aa00';
    radarCtx.lineWidth = 3;
    radarCtx.beginPath();
    const rwLen = 5000 * scale;
    const dxx = Math.sin(z.angle) * rwLen;
    const dyy = Math.cos(z.angle) * rwLen;
    radarCtx.moveTo(rX - dxx, rY - dyy);
    radarCtx.lineTo(rX + dxx, rY + dyy);
    radarCtx.stroke();

    radarCtx.fillStyle = '#00ff00';
    radarCtx.font = '14px monospace';
    radarCtx.fillText(z.title, rX + 10, rY);
  }

  const px = cx + playerGroup.position.x * scale;
  const py = cy + playerGroup.position.z * scale;
  
  radarCtx.fillStyle = '#ff0000';
  radarCtx.beginPath();
  radarCtx.arc(px, py, 4, 0, Math.PI * 2);
  radarCtx.fill();
  
  radarCtx.strokeStyle = '#ff0000';
  radarCtx.beginPath();
  radarCtx.moveTo(px, py);
  // Negative sine/cosine because ThreeJS -Z is forward
  radarCtx.lineTo(px - Math.sin(physics.yaw) * 25, py - Math.cos(physics.yaw) * 25);
  radarCtx.stroke();
}

closeBtn.addEventListener('click', () => {
  uiOverlay.classList.add('hidden');
  clock.getDelta(); // Clear accumulated delta
  resetKeys();
  isPaused = false;
  // Push player slightly forward and up so they don't immediately re-collide
  physics.speed = 15;
  physics.pitch = 0.2; 
  playerGroup.position.y += 50;
});

// Corner Nav Links (Sets Destination)
document.querySelectorAll('#corner-nav button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const zoneId = e.target.getAttribute('data-zone');
    const zoneData = zonesData.find(z => z.id === zoneId);
    if (zoneData) {
      const appX1 = zoneData.x + Math.sin(zoneData.angle) * 8000;
      const appZ1 = zoneData.z + Math.cos(zoneData.angle) * 8000;
      const dist1 = Math.hypot(appX1 - playerGroup.position.x, appZ1 - playerGroup.position.z);
      
      const oppAngle = zoneData.angle + Math.PI;
      const appX2 = zoneData.x + Math.sin(oppAngle) * 8000;
      const appZ2 = zoneData.z + Math.cos(oppAngle) * 8000;
      const dist2 = Math.hypot(appX2 - playerGroup.position.x, appZ2 - playerGroup.position.z);
      
      const approachAngle = dist1 < dist2 ? zoneData.angle : oppAngle;
      activeDestination = { ...zoneData, approachAngle };
      currentWaypointIndex = 0;
      destCue.classList.add('hidden');
      
      navLockText.textContent = zoneData.title;
      navLockIndicator.classList.remove('hidden');
      
      const reqHdg = Math.round(((-approachAngle * 180 / Math.PI) + 360) % 360);
      const reqAlt = zoneData.elevation + 20;
      
      atcBox.innerHTML = `
        <div style="font-weight:bold; margin-bottom: 5px;">ATC: CLEARED TO ${zoneData.title.toUpperCase()} (RWY ${reqHdg.toString().padStart(3, '0')})</div>
        <div style="font-size:0.85em; color:#aaa; margin-bottom: 3px;">
          INBOUND HDG: ${reqHdg.toString().padStart(3, '0')}° | ALT: ~${reqAlt} FT | SPD: &lt; 35 KTS
        </div>
        <div style="font-size:0.75em; color:#ffaa00;">
          [F] FULL AUTOPILOT | [L] ALIGN LOCALIZER (MANUAL THROTTLE/PITCH)
        </div>
      `;
      atcBox.style.color = '#00ffff';
      atcBox.style.borderColor = '#00ffff';
      atcBox.style.boxShadow = '0 0 10px #00ffff';
      
      // Reset after 3 seconds so normal ATC logic resumes
      setTimeout(() => {
        atcBox.style.color = 'var(--primary-color)';
        atcBox.style.borderColor = 'var(--primary-color)';
        atcBox.style.boxShadow = 'var(--glow)';
      }, 3000);
    }
  });
});

function showTerminal(zone) {
  isPaused = true;
  terminalTitle.textContent = zone.title;
  terminalContent.innerHTML = zone.content;
  uiOverlay.classList.remove('hidden');
  // Reset keys
  for (let k in keys) keys[k] = false;
  
  // Terminal reveal wipe effect
  terminalContent.style.clipPath = 'inset(0 100% 0 0)';
  let progress = 100;
  if (typingInterval) clearInterval(typingInterval);
  typingInterval = setInterval(() => {
    progress -= 2;
    if (progress < 0) progress = 0;
    terminalContent.style.clipPath = `inset(0 ${progress}% 0 0)`;
    if (progress <= 0) clearInterval(typingInterval);
  }, 20);
}

let expVel = [];

function triggerCrash() {
  if (isCrashed) return;
  isCrashed = true;
  crashScreen.classList.remove('hidden');
  destCue.classList.add('hidden');

  
  // Create Explosion Particles
  const expGeo = new THREE.BufferGeometry();
  const expPos = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) {
    expPos[i*3] = playerGroup.position.x;
    expPos[i*3+1] = playerGroup.position.y;
    expPos[i*3+2] = playerGroup.position.z;
    expVel.push({
      x: (Math.random() - 0.5) * 40,
      y: Math.random() * 40,
      z: (Math.random() - 0.5) * 40
    });
  }
  expGeo.setAttribute('position', new THREE.BufferAttribute(expPos, 3));
  const expMat = new THREE.PointsMaterial({ color: 0xff4400, size: 5 });
  const explosion = new THREE.Points(expGeo, expMat);
  scene.add(explosion);
  
  // Hide plane geometry
  playerGroup.children[0].visible = false;
  
  const expInterval = setInterval(() => {
    const pos = explosion.geometry.attributes.position.array;
    for (let i = 0; i < 500; i++) {
      pos[i*3] += expVel[i].x;
      pos[i*3+1] += expVel[i].y;
      pos[i*3+2] += expVel[i].z;
      expVel[i].y -= 1.0; // Gravity
    }
    explosion.geometry.attributes.position.needsUpdate = true;
  }, 16);
  
  setTimeout(() => {
    clearInterval(expInterval);
    scene.remove(explosion);
    expGeo.dispose();
    expMat.dispose();
    expVel = [];
    
    // Reset Plane
    playerGroup.position.set(0, 0, 0);
    playerGroup.rotation.set(0, 0, 0);
    physics.speed = 0;
    physics.pitch = 0;
    physics.yaw = 0;
    physics.roll = 0;
    playerGroup.children[0].visible = true;
    
    // Reset state
    isCrashed = false;
    flightSequence = 'NONE';
    autopilotEngaged = false;
    crashScreen.classList.add('hidden');
    destCue.classList.remove('hidden');
    if (activeDestination) {
      activeDestination = null;
      navLockIndicator.classList.add('hidden');
    }
    
    // Reset camera position immediately to prevent sweeping across map
    camera.position.set(2000, 2000, 2000);
    camera.lookAt(playerGroup.position);
  }, 3000);
}

// Fast Forward Logic
let timeScale = 1;
const ffBtn = document.getElementById('fast-forward-btn');
if (ffBtn) {
  ffBtn.addEventListener('click', () => {
    if (timeScale === 1) timeScale = 2;
    else if (timeScale === 2) timeScale = 4;
    else if (timeScale === 4) timeScale = 10;
    else timeScale = 1;
    ffBtn.textContent = `⏩ TIME ${timeScale}x`;
  });
}

// Main Game Loop
const clock = new THREE.Clock();

function update() {
  requestAnimationFrame(update);
  
  const delta = clock.getDelta() * timeScale;
  
  if (!isPaused && !isCrashed) {
    // G Force Calculation
    let currentG = 1.0;
    if (Math.abs(physics.roll) > 0.05) {
      currentG = 1.0 / Math.cos(physics.roll);
    }
    const currentAlt = playerGroup.position.y;
    
    
    // GPWS & Building Collision Checks
    let gpwsWarning = false;
    let crashBuilding = false;
    const px = playerGroup.position.x;
    const pz = playerGroup.position.z;
    const cx = Math.floor(px / CHUNK_SIZE);
    const cz = Math.floor(pz / CHUNK_SIZE);
    
    for (let dcx = -1; dcx <= 1; dcx++) {
      for (let dcz = -1; dcz <= 1; dcz++) {
        const key = `${cx + dcx}_${cz + dcz}`;
        if (buildingChunks.has(key)) {
          const bList = buildingChunks.get(key);
          for (let b of bList) {
            const dx = px - b.x;
            const dz = pz - b.z;
            const dist = Math.hypot(dx, dz);
            
            // GPWS proximity check (10ft radius)
            if (dist < 10 && currentAlt < b.h + 200) {
              gpwsWarning = true;
            }
            
            // Physical collision check (Disabled for better UX in isometric view)
            // if (dist < b.r + 50 && currentAlt < b.h) {
            //   crashBuilding = true;
            // }
          }
        }
      }
    }
    
    if (gpwsWarning) {
      gpwsAlert.classList.remove('hidden');
    } else {
      gpwsAlert.classList.add('hidden');
    }
    
    // --- RABBIT CHASING TARGET ACQUISITION ---
    let globalTargetX = null, globalTargetZ = null, globalTargetAlt = null, globalDistToZone = null, globalAlongTrack = null, globalCrossTrack = null;
    if (activeDestination) {
      const zone = activeDestination;
      const rx = zone.x;
      const rz = zone.z;
      const dx = playerGroup.position.x - rx;
      const dz = playerGroup.position.z - rz;
      globalDistToZone = Math.hypot(dx, dz);
      const vx = -Math.sin(zone.approachAngle);
      const vz = -Math.cos(zone.approachAngle);
      const alongTrack = dx * vx + dz * vz;
      const crossTrack = dx * vz - dz * vx;
      globalAlongTrack = alongTrack;
      globalCrossTrack = crossTrack;
      
      const lookahead = Math.max(15000, Math.min(40000, Math.abs(alongTrack) * 0.8));
      const targetAlongTrack = alongTrack + lookahead;
      
      // Target Touchdown Zone exactly 2000 units past threshold (alongTrack = -23000)
      const distToTDZ = Math.max(0, -alongTrack - 23000);
      const glideTargetAlt = zone.elevation + (distToTDZ / 20000) * 1000;
      
      if (flightSequence === 'CRUISE') {
        const waypoints = zone.waypoints;
        if (currentWaypointIndex < waypoints.length) {
           const wp = waypoints[currentWaypointIndex];
           globalTargetX = wp.x;
           globalTargetZ = wp.z;
           globalTargetAlt = wp.alt;
           
           // If we are close enough to the waypoint, sequence to the next one
           if (Math.hypot(playerGroup.position.x - wp.x, playerGroup.position.z - wp.z) < 20000) {
             currentWaypointIndex++;
           }
        } else {
           // Passed all waypoints, track runway centerline
           globalTargetX = rx + targetAlongTrack * vx;
           globalTargetZ = rz + targetAlongTrack * vz;
           globalTargetAlt = Math.max(1000, glideTargetAlt);
           
           // Transition to APPROACH if we are getting close and aligned
           if (alongTrack > -80000) {
             flightSequence = 'APPROACH';
             if (typeof apIndicator !== 'undefined' && autopilotEngaged) apIndicator.textContent = 'AP: APPROACH [F]';
           }
        }
      } else {
        // APPROACH or LANDING
        globalTargetX = rx + targetAlongTrack * vx;
        globalTargetZ = rz + targetAlongTrack * vz;
        globalTargetAlt = glideTargetAlt;
      }
    }

    // --- AUTOPILOT LOGIC ---
    if (autopilotEngaged) {
          activeDestination = z;
          currentWaypointIndex = 0; // Reset waypoints for the new route
          flightSequence = (playerGroup.position.y <= 10) ? 'TAKEOFF' : 'CRUISE';
          if (autopilotEngaged) apIndicator.textContent = 'AP: ' + flightSequence + ' [F]';
      const zone = activeDestination || { x: 0, z: 0, elevation: 0, angle: 0, approachAngle: 0 };
      let targetX, targetZ, targetAlt;
      
      if (flightSequence === 'TAKEOFF') {
        let closestZone = null;
        let minDist = Infinity;
        for (let z of zonesData) {
           let d = Math.hypot(playerGroup.position.x - z.x, playerGroup.position.z - z.z);
           if (d < minDist) { minDist = d; closestZone = z; }
        }
        
        let takeoffHeading = physics.yaw;
        if (closestZone && minDist < 25000) {
           let h1 = closestZone.angle;
           let h2 = closestZone.angle + Math.PI;
           let diff1 = Math.atan2(Math.sin(h1 - physics.yaw), Math.cos(h1 - physics.yaw));
           let diff2 = Math.atan2(Math.sin(h2 - physics.yaw), Math.cos(h2 - physics.yaw));
           takeoffHeading = (Math.abs(diff1) < Math.abs(diff2)) ? h1 : h2;
        }
        
        targetX = playerGroup.position.x - Math.sin(takeoffHeading) * 50000;
        targetZ = playerGroup.position.z - Math.cos(takeoffHeading) * 50000;
        targetAlt = 1000;
        if (currentAlt > 800) {
           flightSequence = 'CRUISE';
        }
      } else {
        if (flightSequence === 'CRUISE') {
          targetX = globalTargetX;
          targetZ = globalTargetZ;
          targetAlt = activeDestination.elevation + 1000;
          if (Math.abs(globalCrossTrack) < 10000 && globalAlongTrack < -40000) flightSequence = 'APPROACH';
        } else if (flightSequence === 'APPROACH') {
          targetX = globalTargetX;
          targetZ = globalTargetZ;
          targetAlt = globalTargetAlt;
          
          let yawDiffLocal = Math.atan2(-(targetX - playerGroup.position.x), -(targetZ - playerGroup.position.z)) - physics.yaw;
          yawDiffLocal = Math.atan2(Math.sin(yawDiffLocal), Math.cos(yawDiffLocal));
          
          if (Math.abs(yawDiffLocal) < 0.05 && Math.abs(globalCrossTrack) < 500) {
            flightSequence = 'STABILIZED_APPROACH';
            if (typeof apIndicator !== 'undefined' && autopilotEngaged) apIndicator.textContent = 'AP: STABILIZED [F]';
          } else if (globalDistToZone < 15000) {
            flightSequence = 'LANDING';
          }
        } else if (flightSequence === 'STABILIZED_APPROACH') {
          targetX = globalTargetX;
          targetZ = globalTargetZ;
          targetAlt = globalTargetAlt;
          if (globalDistToZone < 15000) flightSequence = 'LANDING';
        } else if (flightSequence === 'LANDING') {
          targetX = globalTargetX;
          targetZ = globalTargetZ;
          targetAlt = activeDestination.elevation;
          if (currentAlt <= activeDestination.elevation + 6 && physics.speed < 5) {
            autopilotEngaged = false;
            flightSequence = 'NONE';
            btnSeq.textContent = 'INITIATE TAKEOFF';
            apIndicator.classList.remove('ap-on');
            flightControls.style.display = 'block';
          }
        } else {
          flightSequence = 'CRUISE';
          targetX = globalTargetX; targetZ = globalTargetZ; targetAlt = activeDestination.elevation + 1000;
        }
      }
      
      const dx = targetX - playerGroup.position.x;
      const dz = targetZ - playerGroup.position.z;
      const targetDist = Math.hypot(dx, dz);
      let reqYaw = Math.atan2(-dx, -dz);
      
      let yawDiff = reqYaw - physics.yaw;
      yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff));
      
      // Hard stop on aircraft's turning when aligned on final approach
      if (flightSequence === 'STABILIZED_APPROACH' || flightSequence === 'LANDING') {
        if (Math.abs(yawDiff) < 0.02) {
          yawDiff = 0;
          physics.yaw = reqYaw; // Lock perfectly
          if (Math.abs(physics.roll) < 0.05) physics.roll = 0;
        }
      }
      
      // AP Bank (Smooth P-Controller to damp oscillation)
      const Kp = (flightSequence === 'LANDING') ? 0.3 : ((flightSequence === 'APPROACH') ? 0.6 : 1.0);
      const maxBank = (flightSequence === 'LANDING') ? Math.PI/12 : ((flightSequence === 'APPROACH') ? Math.PI/8 : Math.PI/4);

      if (flightSequence === 'TAKEOFF' || targetDist < 300) {
        physics.roll *= 0.95;
        physics.yaw += yawDiff * 2.0 * delta;
      } else {
        let desiredRoll = yawDiff * Kp;
        desiredRoll = Math.max(-maxBank, Math.min(maxBank, desiredRoll));
        // Smoothly bank towards desired roll to prevent twitching and overcorrecting
        physics.roll += (desiredRoll - physics.roll) * 1.5 * delta;
      }
      
      // Auto-deploy gear
      if (currentAlt < 500 && flightSequence !== 'TAKEOFF' && !gearDown) {
        gearDown = true;
        gearText.textContent = 'DOWN [G]';
        gearText.style.color = '#00ff00';
        gearFront.visible = true; gearLeft.visible = true; gearRight.visible = true;
      }
      // Auto-retract gear
      if (currentAlt > 1000 && gearDown) {
        gearDown = false;
        gearText.textContent = 'UP [G]';
        gearText.style.color = '#ffaa00';
        gearFront.visible = false; gearLeft.visible = false; gearRight.visible = false;
      }
      
      // Speed & Pitch
      if (gpwsWarning && flightSequence !== 'LANDING') {
        physics.speed = Math.min(physics.maxSpeed, physics.speed + 20 * delta); // Max thrust
        physics.pitch = Math.PI / 4; // Aggressive climb
      } else if (flightSequence === 'TAKEOFF') {
        physics.speed = Math.min(physics.maxSpeed, physics.speed + 15 * delta); // Gradual acceleration
        if (physics.speed > 25) { // Higher Vr rotation speed
          const altDiff = targetAlt - currentAlt;
          physics.pitch = Math.max(-Math.PI/16, Math.min(Math.PI/16, altDiff * 0.001)); // Graceful rotation and climb
        } else {
          physics.pitch = 0; // Keep nose down during ground roll
        }
      } else if (flightSequence === 'CRUISE') {
        physics.speed = Math.min(physics.maxSpeed, Math.max(12.0, physics.speed + 5 * delta));
        const altDiff = targetAlt - currentAlt;
        physics.pitch = Math.max(-Math.PI/8, Math.min(Math.PI/8, altDiff * 0.002));
      } else if (flightSequence === 'APPROACH' || flightSequence === 'STABILIZED_APPROACH') {
        const targetSpeed = (globalAlongTrack < -35000) ? 50 : 20; // 500 kts until 3000m from threshold, then 200 kts
        physics.speed = physics.speed > targetSpeed ? Math.max(targetSpeed, physics.speed - 5 * delta) : Math.min(targetSpeed, physics.speed + 5 * delta);
        const altDiff = targetAlt - currentAlt;
        physics.pitch = Math.max(-Math.PI/18, Math.min(Math.PI/18, altDiff * 0.0005)); // Stabilized pitch adjustments
      } else if (flightSequence === 'LANDING') {
        const altDiff = targetAlt - currentAlt;
        if (currentAlt > zone.elevation + 0.5) {
          // Final approach glideslope
          physics.speed = physics.speed > 21.5 ? Math.max(21.5, physics.speed - 5 * delta) : Math.min(21.5, physics.speed + 5 * delta);
          let p = altDiff * 0.002;
          if (p > -0.01) p = -0.01; // Ensure a firm touchdown descent
          physics.pitch = Math.max(-Math.PI/24, Math.min(Math.PI/24, p));
        } else {
          // Touchdown: taxi to destination then brake
          playerGroup.position.y = zone.elevation; // Force exactly onto ground to trigger RUNWAY surface
          if (globalAlongTrack < 0) {
            if (physics.speed < 10) physics.speed = Math.min(10, physics.speed + 15 * delta);
            else if (physics.speed > 10) physics.speed = Math.max(10, physics.speed - 15 * delta);
          } else {
            physics.speed = Math.max(0, physics.speed - 15 * delta);
          }
          physics.pitch = 0; // Lock to ground to prevent bounce
          if (physics.speed < 2 && globalAlongTrack >= 0) {
            autopilotEngaged = false;
            flightSequence = 'NONE';
            btnSeq.textContent = 'INITIATE TAKEOFF';
            apIndicator.textContent = 'AP: OFF [F]';
            flightControls.style.display = 'block';
          }
        }
      }
    } 
    // --- MANUAL CONTROLS ---
    else {
      const currentMaxSpeed = gearDown ? 35 : physics.maxSpeed;
      
      if (localizerEngaged && activeDestination) {
        const dx = globalTargetX - playerGroup.position.x;
        const dz = globalTargetZ - playerGroup.position.z;
        let reqYaw = Math.atan2(-dx, -dz);
        
        let yawDiff = reqYaw - physics.yaw;
        yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff));
        
        if (typeof window.lastManYawDiff === 'undefined') window.lastManYawDiff = 0;
        let yawRate = (yawDiff - window.lastManYawDiff) / delta;
        window.lastManYawDiff = yawDiff;
        
        const targetDist = Math.hypot(dx, dz);
        if (targetDist > 300) {
          let desiredRoll = yawDiff * 1.5 + yawRate * 0.5;
          physics.roll = Math.max(-Math.PI/4, Math.min(Math.PI/4, desiredRoll));
        } else {
          physics.roll *= 0.95;
        }
      } else {
        if (keys.a) physics.roll += 1.5 * delta;
        if (keys.d) physics.roll -= 1.5 * delta;
      }
      
      if (keys.w) {
        physics.pitch -= 1.0 * delta;
        currentG -= 0.5 + (physics.speed / 50);
      }
      if (keys.s) {
        if (currentAlt > 5 || physics.speed > 14) {
          physics.pitch += 1.0 * delta;
          currentG += 1.0 + (physics.speed / 14);
        }
      }
      
      if (keys[' ']) physics.speed = Math.min(currentMaxSpeed, physics.speed + 10 * delta);
      if (keys.Shift) physics.speed = Math.max(physics.minSpeed, physics.speed - 10 * delta);
      
      if (!keys.w && !keys.s) physics.pitch *= 0.98;
      if (!keys.a && !keys.d) physics.roll *= 0.98;
    }
    
    // Limit pitch/roll
    physics.pitch = Math.max(-Math.PI/4, Math.min(Math.PI/4, physics.pitch));
    physics.roll = Math.max(-Math.PI/3, Math.min(Math.PI/3, physics.roll));
    
    // Gravity / Energy Conversion
    const gravityAccel = -Math.sin(physics.pitch) * 40.0;
    physics.speed += gravityAccel * delta;
    const currentMaxSpeed = gearDown ? 35 : physics.maxSpeed;
    physics.speed = Math.max(physics.minSpeed, Math.min(currentMaxSpeed * 1.5, physics.speed));
    
    // Calculate Dynamic Ground Elevation & Runway Surface Detection
    let groundElevation = 0;
    isOnRunway = false;
    for (let z of zonesData) {
      const dx = playerGroup.position.x - z.x;
      const dz = playerGroup.position.z - z.z;
      if (Math.hypot(dx, dz) < 30000) {
        groundElevation = z.elevation;
        
        // Local coordinate check for runway boundaries (800x50000)
        const cos = Math.cos(z.angle);
        const sin = Math.sin(z.angle);
        const localX = dx * cos + dz * sin;
        const localZ = -dx * sin + dz * cos;
        if (Math.abs(localX) < 400 && Math.abs(localZ) < 25000) {
          isOnRunway = true;
        }
        break;
      }
    }

    // Stall Warning & Mechanics
    if (physics.speed < 9.0 && currentAlt > groundElevation + 10 && flightSequence !== 'LANDING') {
      stallWarning.classList.remove('hidden');
      physics.pitch -= 1.0 * delta; // Nose drops
      playerGroup.position.y -= (20 - Math.max(0, physics.speed)) * delta; // Sink
    } else {
      stallWarning.classList.add('hidden');
    }
    
    if (physics.speed > 1) {
      physics.yaw += physics.roll * 0.5 * delta;
    }
    
    // Update Player Rotation
    playerGroup.rotation.order = "YXZ";
    playerGroup.rotation.y = physics.yaw;
    playerGroup.rotation.x = physics.pitch;
    playerGroup.rotation.z = physics.roll;
    
    // Move Forward in the direction it's pointing. We use a 4x multiplier for gameplay scaling
    // so distances are covered faster (1 knot = 1.68781 ft/s * 4 = 6.75)
    const exactKts = physics.speed * 10;
    playerGroup.translateZ(-exactKts * 6.75 * delta);
    
    // Map & Floor boundaries
    playerGroup.position.x = Math.max(-149900, Math.min(149900, playerGroup.position.x));
    playerGroup.position.z = Math.max(-149900, Math.min(149900, playerGroup.position.z));
    
    // CRASH DETECTION (Hard Landing & Off-Road)
    if (playerGroup.position.y > groundElevation + 2) {
      surfaceIndicator.textContent = '[SURFACE: AIRBORNE]';
      surfaceIndicator.style.color = '#00ffff';
      offRoadTimer = 0;
    }
    
    if (playerGroup.position.y <= groundElevation) {
      if (!gearDown || physics.speed > 60 || physics.pitch < -0.15 || Math.abs(physics.roll) > 0.2) {
        triggerCrash();
      } else {
        playerGroup.position.y = groundElevation;
        physics.pitch = Math.max(0, physics.pitch); // Can't point down if on floor
        physics.roll *= 0.8; // Flatten wings to prevent clipping into the ground
        if (Math.abs(physics.roll) < 0.01) physics.roll = 0;
        
        // Manual braking on ground
        if (keys.Shift) physics.speed = Math.max(0, physics.speed - 20 * delta);
        
        if (isOnRunway) {
          if (physics.speed > 0) physics.speed = Math.max(0, physics.speed - 5 * delta); // normal friction
          offRoadTimer = 0;
          surfaceIndicator.textContent = physics.speed > 2 ? '[SURFACE: RUNWAY] - ROLLING' : '[SURFACE: RUNWAY]';
          surfaceIndicator.style.color = '#00ff00';
          skidMat.color.setHex(0x111111); // Black tire marks
        } else {
          // Off-road dirt/grass!
          if (physics.speed > 0) physics.speed = Math.max(0, physics.speed - 15 * delta); // high friction
          surfaceIndicator.textContent = physics.speed > 2 ? '[SURFACE: OFF-ROAD] - SKIDDING!' : '[SURFACE: OFF-ROAD]';
          surfaceIndicator.style.color = '#ff4400';
          skidMat.color.setHex(0x553311); // Brown dirt marks
          
          if (physics.speed > 15) {
            offRoadTimer += delta;
            if (offRoadTimer > 1.5) {
              triggerCrash(); // Fiery crash!
            }
          } else {
            offRoadTimer = Math.max(0, offRoadTimer - delta); // Cool down if slow
          }
        }
      }
    }
    
    // UI Update
    const alt = Math.floor(currentAlt);
    
    // Calculate heading 0-359 degrees. Yaw is around Y axis.
    // Calculate heading 0-359 degrees. Negate yaw so right turns increase heading.
    let hdgDeg = Math.floor((-physics.yaw * 180 / Math.PI) % 360);
    if (hdgDeg < 0) hdgDeg += 360;
    const hdgStr = hdgDeg.toString().padStart(3, '0');
    const currentKts = Math.floor(physics.speed * 10);
    
    // Update Cockpit Dials
    if (dialSpeedVal) dialSpeedVal.textContent = currentKts;
    if (needleSpeed) needleSpeed.style.transform = `rotate(${Math.min(270, (currentKts / 750) * 270) - 135}deg)`;
    
    if (dialHeadingVal) dialHeadingVal.textContent = hdgStr;
    if (needleHeading) needleHeading.style.transform = `rotate(${hdgDeg}deg)`;
    
    if (dialAltVal) dialAltVal.textContent = alt;
    if (needleAlt100) needleAlt100.style.transform = `rotate(${(alt % 1000) / 1000 * 360}deg)`;
    if (needleAlt1000) needleAlt1000.style.transform = `rotate(${(alt % 10000) / 10000 * 360}deg)`;
    gforceText.innerText = Math.max(0, currentG).toFixed(1);
    
    // ATC Logic and Visual Approach Path
    if (activeDestination) {
      if (flightSequence === 'APPROACH' || flightSequence === 'LANDING' || flightSequence === 'CRUISE' || flightSequence === 'STABILIZED_APPROACH') {
        approachPathGroup.visible = true;
        
        if (flightSequence === 'CRUISE' && activeDestination.waypoints && currentWaypointIndex < activeDestination.waypoints.length) {
          // Draw boxes along the current waypoint leg
          let prevX = 0, prevZ = 0, prevAlt = 1000;
          if (currentWaypointIndex > 0) {
            const pWP = activeDestination.waypoints[currentWaypointIndex - 1];
            prevX = pWP.x; prevZ = pWP.z; prevAlt = pWP.alt;
          }
          const currWP = activeDestination.waypoints[currentWaypointIndex];
          const dx = currWP.x - prevX;
          const dz = currWP.z - prevZ;
          const dAlt = currWP.alt - prevAlt;
          const legAngle = Math.atan2(dx, dz); // angle of this leg
          
          for (let i = 0; i < 20; i++) {
            const box = approachBoxes[i];
            const t = (i + 1) / 20; // 0.05 to 1.0
            box.position.set(prevX + dx * t, prevAlt + dAlt * t, prevZ + dz * t);
            box.rotation.y = legAngle;
          }
        } else {
          // Final Approach - draw boxes along the runway extended centerline
          for (let i = 0; i < 20; i++) {
            const box = approachBoxes[i];
            const dist = (i + 1) * 4000 + 25000;
            const yTarget = activeDestination.elevation + Math.max(0, (dist - 23000) / 20000 * 1000);
            box.position.set(
              activeDestination.x - Math.sin(activeDestination.approachAngle) * dist, 
              yTarget, 
              activeDestination.z - Math.cos(activeDestination.approachAngle) * dist
            );
            box.rotation.y = activeDestination.approachAngle;
          }
        }
      } else {
        approachPathGroup.visible = false;
      }
      
      const dx = globalTargetX - playerGroup.position.x;
      const dz = globalTargetZ - playerGroup.position.z;
      const targetDist = globalDistToZone;
      
      let reqYaw = Math.atan2(-dx, -dz);
      let reqHdg = Math.floor((-reqYaw * 180 / Math.PI) % 360);
      if (reqHdg < 0) reqHdg += 360;
      const reqHdgStr = reqHdg.toString().padStart(3, '0');
      
      const targetVec = new THREE.Vector3(dx, 0, dz).normalize();
      const playerForward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, physics.yaw, 0)).normalize();
      const dot = playerForward.dot(targetVec); 
      
      if (autopilotEngaged) {
        atcBox.innerHTML = `ATC: AUTOPILOT ENGAGED - LNAV/VNAV TRACKING`;
        atcBox.style.color = '#00ffff';
        atcBox.style.borderColor = '#00ffff';
        atcBox.style.boxShadow = '0 0 10px #00ffff';
      } else {
        atcBox.style.color = 'var(--primary-color)';
        atcBox.style.borderColor = 'var(--primary-color)';
        atcBox.style.boxShadow = 'var(--glow)';
        
        if (alt <= 5 && physics.speed < 25) {
          atcBox.innerHTML = `ATC: THROTTLE UP (HOLD SPACE) TO 250 KTS`;
        } else if (alt <= 5 && physics.speed >= 25) {
          atcBox.innerHTML = `ATC: ROTATE! PULL UP (HOLD S) TO TAKE OFF`;
        } else if (targetDist > 600) {
          if (dot < 0.95) {
             atcBox.innerHTML = `ATC: TURN TO HEADING ${reqHdgStr}° TO ALIGN WITH DESTINATION`;
          } else {
             atcBox.innerHTML = `ATC: ON COURSE. MAINTAIN HEADING ${reqHdgStr}° TO ${activeDestination.id.toUpperCase()}`;
          }
        } else if (targetDist <= 600 && alt > 50) {
          atcBox.innerHTML = `ATC: REDUCE SPEED (SHIFT) AND DESCEND TO ${activeDestination.elevation} FT`;
        } else {
          atcBox.innerHTML = `ATC: ALIGN WITH RUNWAY AND TOUCHDOWN`;
        }
      }
    } else {
      atcBox.innerHTML = `ATC: SELECT DESTINATION (TOP RIGHT) THEN PRESS [F] OR INITIATE TAKEOFF`;
      atcBox.style.color = 'var(--primary-color)';
      atcBox.style.borderColor = 'var(--primary-color)';
      atcBox.style.boxShadow = 'var(--glow)';
    }
    
    // Camera follows the player
    camera.position.x = playerGroup.position.x + 2000;
    camera.position.y = playerGroup.position.y + 2000;
    camera.position.z = playerGroup.position.z + 2000;
    camera.lookAt(playerGroup.position);
    
    // Update Engine Trails
    if (physics.speed > 2) {
      const exhaustPos = new THREE.Vector3(0, 0, 60);
      exhaustPos.applyMatrix4(playerGroup.matrixWorld);
      
      const positions = trailPoints.geometry.attributes.position.array;
      positions[trailIndex * 3] = exhaustPos.x + (Math.random() - 0.5) * 10;
      positions[trailIndex * 3 + 1] = exhaustPos.y + (Math.random() - 0.5) * 10;
      positions[trailIndex * 3 + 2] = exhaustPos.z + (Math.random() - 0.5) * 10;
      
      trailIndex = (trailIndex + 1) % trailCount;
      trailPoints.geometry.attributes.position.needsUpdate = true;
    }
    
    // Update Skid Marks
    if (playerGroup.position.y <= groundElevation + 0.5 && physics.speed > 2) {
      const pArr = skidPoints.geometry.attributes.position.array;
      const leftWheel = new THREE.Vector3(-30, -5, 20).applyMatrix4(playerGroup.matrixWorld);
      const rightWheel = new THREE.Vector3(30, -5, 20).applyMatrix4(playerGroup.matrixWorld);
      
      // Add left skid
      pArr[skidIndex * 3] = leftWheel.x;
      pArr[skidIndex * 3 + 1] = groundElevation + 1.5; // Always above surface
      pArr[skidIndex * 3 + 2] = leftWheel.z;
      skidIndex = (skidIndex + 1) % skidCount;
      
      // Add right skid
      pArr[skidIndex * 3] = rightWheel.x;
      pArr[skidIndex * 3 + 1] = groundElevation + 1.5;
      pArr[skidIndex * 3 + 2] = rightWheel.z;
      skidIndex = (skidIndex + 1) % skidCount;
      
      skidPoints.geometry.attributes.position.needsUpdate = true;
    }
    
    // Collision Detection
    for (let zm of zoneMeshes) {
      const zone = zm.data;
      const group = zm.group;
      const ring = zm.ring;
      
      const dx = playerGroup.position.x - zone.x;
      const dz = playerGroup.position.z - zone.z;
      const dist = Math.hypot(dx, dz);
      
      ring.visible = false;
      
      if (dist < 5500) {
        // Player is near airport, check alignment
        let pYaw = (physics.yaw % (Math.PI*2) + Math.PI*2) % (Math.PI*2);
        let zAngle = (zone.angle % (Math.PI*2) + Math.PI*2) % (Math.PI*2);
        
        let angleDiff = Math.abs(pYaw - zAngle);
        if (angleDiff > Math.PI) angleDiff = Math.PI*2 - angleDiff;
        if (angleDiff > Math.PI/2) angleDiff = Math.PI - angleDiff; // Can land either way
        
        const isAligned = angleDiff < (Math.PI / 6);
        const atElevation = Math.abs(playerGroup.position.y - zone.elevation) < 20;
        
        // Spin Data Cubes
        if (zm.cubes) {
          zm.cubes.forEach(cube => {
            cube.rotation.x += 1.0 * delta;
            cube.rotation.y += 2.0 * delta;
          });
        }
        
        if (atElevation && isAligned && dist < 500) {
          if (zone.id !== 'start' && lastOpenedZone !== zone.id) {
            showTerminal(zone);
            lastOpenedZone = zone.id;
          }
        } else if (dist > 6000 && lastOpenedZone === zone.id) {
          lastOpenedZone = null;
        } else if (dist > 500) {
          // Warning ring if close but not aligned/at elevation
          ring.visible = true;
        }
      }
    }

    // Smoke Particles Update
    if ((flightSequence === 'LANDING' && playerGroup.position.y <= groundElevation + 2) || (playerGroup.position.y <= groundElevation + 2 && physics.speed > 30)) {
      if (Math.random() < 0.5) {
        const mat = smokeMat.clone();
        mat.color.setHex(isOnRunway ? 0xffffff : 0x5c4033); // White on runway, dark brown off-road
        const smoke = new THREE.Mesh(smokeGeo, mat);
        smoke.position.copy(playerGroup.position);
        smoke.position.y = groundElevation + 2;
        smoke.rotation.x = -Math.PI / 2;
        scene.add(smoke);
        smokeParticles.push({ mesh: smoke, life: 1.0 });
      }
    }
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
      let p = smokeParticles[i];
      p.life -= delta * 0.5;
      p.mesh.scale.setScalar(2.0 - p.life);
      p.mesh.material.opacity = p.life * 0.5;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        p.mesh.material.dispose();
        smokeParticles.splice(i, 1);
      }
    }

    // Update Waypoints
    const tempV = new THREE.Vector3();
    for (let zm of zoneMeshes) {
      if (zm.data.id === 'start') continue;
      
      tempV.copy(zm.group.position);
      tempV.project(camera);
      
      let x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
      let y = (tempV.y * -0.5 + 0.5) * window.innerHeight;
      
      // Clamp to screen edges
      const padding = 50;
      x = Math.max(padding, Math.min(window.innerWidth - padding, x));
      y = Math.max(padding, Math.min(window.innerHeight - padding, y));
      
      let waypoint = document.getElementById(`waypoint-${zm.data.id}`);
      if (!waypoint) {
        waypoint = document.createElement('div');
        waypoint.id = `waypoint-${zm.data.id}`;
        waypoint.className = 'waypoint';
        waypointsContainer.appendChild(waypoint);
      }
      
      // Hide waypoints behind the camera
      if (tempV.z > 1) {
        waypoint.style.display = 'none';
        continue;
      } else {
        waypoint.style.display = 'block';
      }
      
      const dist = Math.floor(playerGroup.position.distanceTo(zm.group.position));
      waypoint.innerHTML = `${zm.data.title}<br/>${dist}m`;
      waypoint.style.left = `${x}px`;
      waypoint.style.top = `${y}px`;
    }
  }
  
  if (isRadarVisible) drawRadar();
  
  renderer.render(scene, camera);
}

// Draw actual markings on the dials
function drawDialMarks(dialId, maxVal, sweepAngle, tickStep, labelStep, options = {}) {
  const dial = document.getElementById(dialId);
  if (!dial) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "dial-marks");
  svg.setAttribute("viewBox", "-100 -100 200 200");
  svg.style.position = "absolute";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.pointerEvents = "none";
  
  const offsetAngle = options.offsetAngle || 0;
  const innerRBase = options.innerRBase || 80;
  const outerR = options.outerR || 90;
  const textR = options.textR || 55;
  const fontSize = options.fontSize || 18;
  const labelFormatter = options.labelFormatter;
  
  for (let val = 0; val <= maxVal; val += tickStep) {
    if (val === maxVal && sweepAngle === 360 && offsetAngle === 0) continue; // Don't overlap 360 and 0
    const isLabel = val % labelStep === 0;
    const angle = (val / maxVal) * sweepAngle + offsetAngle - 90;
    const rad = angle * Math.PI / 180;
    const innerR = isLabel ? innerRBase - 10 : innerRBase;
    const x1 = Math.cos(rad) * innerR;
    const y1 = Math.sin(rad) * innerR;
    const x2 = Math.cos(rad) * outerR;
    const y2 = Math.sin(rad) * outerR;
    
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", isLabel ? "#00ff00" : "rgba(0,255,0,0.4)");
    line.setAttribute("stroke-width", isLabel ? "3" : "1");
    svg.appendChild(line);
    
    if (isLabel) {
      const tx = Math.cos(rad) * textR;
      const ty = Math.sin(rad) * textR;
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", tx);
      text.setAttribute("y", ty + (fontSize/3));
      text.setAttribute("fill", "#00ff00");
      text.setAttribute("font-size", fontSize.toString());
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-family", "monospace");
      text.textContent = labelFormatter ? labelFormatter(val) : val.toString();
      svg.appendChild(text);
    }
  }
  dial.querySelector('.dial-bg').appendChild(svg);
}

// Speed: 0 to 750, 270 deg sweep
drawDialMarks('dial-speed', 750, 270, 30, 150, { offsetAngle: 225 });

// Heading: 0 to 360, 360 deg sweep
drawDialMarks('dial-heading', 360, 360, 10, 30, { 
  offsetAngle: 0,
  labelFormatter: (v) => {
    if (v === 0 || v === 360) return 'N';
    if (v === 90) return 'E';
    if (v === 180) return 'S';
    if (v === 270) return 'W';
    return (v / 10).toString();
  }
});

// Altimeter Outer Circle (100s of feet)
drawDialMarks('dial-alt', 10, 360, 0.5, 1, { offsetAngle: 0 });

// Altimeter Inner Circle (1000s of feet)
drawDialMarks('dial-alt', 10, 360, 1, 2, { 
  offsetAngle: 0, 
  innerRBase: 45, 
  outerR: 50, 
  textR: 25, 
  fontSize: 12 
});

update();
