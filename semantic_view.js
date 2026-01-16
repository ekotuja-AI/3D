import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'https://unpkg.com/three@0.158.0/examples/jsm/renderers/CSS2DRenderer.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 80);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0x88ccff, 1);
dirLight.position.set(10, 20, 30);
scene.add(dirLight);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.zIndex = '1000';
document.body.appendChild(labelRenderer.domElement);

const nodes = [];
const geometry = new THREE.SphereGeometry(2.2, 32, 32);

function createTextSprite(message, parameters = {}) {
  const fontface = parameters.fontface || 'Arial';
  const fontsize = parameters.fontsize || 48;
  const borderThickness = parameters.borderThickness || 4;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = fontsize + 'px ' + fontface;
  const metrics = context.measureText(message);
  const textWidth = Math.ceil(metrics.width);
  const padding = borderThickness * 2;
  const textHeight = Math.ceil(fontsize * 1.2);
  canvas.width = textWidth + padding * 2;
  canvas.height = textHeight + padding * 2;
  context.font = fontsize + 'px ' + fontface;
  context.textBaseline = 'top';
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = Math.max(2, Math.floor(fontsize * 0.08));
  context.strokeStyle = 'rgba(0,0,0,0.9)';
  context.fillStyle = 'white';
  const x = padding;
  const y = padding;
  context.strokeText(message, x, y);
  context.fillText(message, x, y);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  material.depthTest = false;
  material.depthWrite = false;
  const sprite = new THREE.Sprite(material);
  const scaleFactor = parameters.scaleFactor || 0.12;
  sprite.scale.set(canvas.width * scaleFactor, canvas.height * scaleFactor, 1);
  sprite.renderOrder = 9999;
  sprite.userData.canvasWidth = canvas.width;
  sprite.userData.canvasHeight = canvas.height;
  return sprite;
}

async function loadCollections() {
  let data = null;
  try {
    const resp = await fetch('data/collections.json');
    if (!resp.ok) throw new Error('HTTP error ' + resp.status);
    data = await resp.json();
  } catch (err) {
    console.error('Falha ao carregar data/collections.json:', err);
    const notice = document.createElement('div');
    notice.style.position = 'absolute';
    notice.style.left = '12px';
    notice.style.top = '80px';
    notice.style.padding = '8px 12px';
    notice.style.background = 'rgba(255,80,80,0.12)';
    notice.style.color = '#ffb3b3';
    notice.style.border = '1px solid rgba(255,80,80,0.18)';
    notice.style.borderRadius = '6px';
    notice.style.fontSize = '13px';
    notice.textContent = 'Aviso: não foi possível carregar data/collections.json — usando dados de fallback.';
    document.body.appendChild(notice);
    data = { collections: [ { name: 'Teste A', position: [-15, 8, 0], color: 0xff8844 }, { name: 'Teste B', position: [0, 0, 0], color: 0x44ff88 }, { name: 'Teste C', position: [15, -6, 5], color: 0x4488ff } ] };
  }

  const sidebar = document.createElement('div');
  sidebar.id = 'sidebar';
  sidebar.innerHTML = '<h3>Coleções</h3>';
  document.body.appendChild(sidebar);

  data.collections.forEach(t => {
    const material = new THREE.MeshStandardMaterial({ color: t.color, emissive: t.color, emissiveIntensity: 0.25 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(...t.position);
    sphere.userData = { name: t.name };
    scene.add(sphere);
    nodes.push(sphere);

    const sprite = createTextSprite(t.name, { fontsize: 48 });
    sprite.position.set(0, 0, 0.6);
    sphere.add(sprite);
    sphere.userData.sprite = sprite;

    const item = document.createElement('div');
    item.className = 'col-item';
    item.textContent = t.name;
    item.addEventListener('click', () => focusOnNode(sphere));
    sidebar.appendChild(item);
  });
}

loadCollections();

const AXIS_LEN = 18;
(function createFullAxes(len) {
  const positions = new Float32Array([ -len, 0, 0,  len, 0, 0, 0, -len, 0,  0, len, 0, 0, 0, -len,  0, 0, len ]);
  const colors = new Float32Array([ 1, 0, 0,  1, 0, 0, 0, 1, 0,  0, 1, 0, 0, 0, 1,  0, 0, 1 ]);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 });
  const lines = new THREE.LineSegments(geom, mat);
  scene.add(lines);
  const labelData = [ { t: '+X', p: [len + 1.2, 0, 0] }, { t: '-X', p: [-len - 1.2, 0, 0] }, { t: '+Y', p: [0, len + 1.2, 0] }, { t: '-Y', p: [0, -len - 1.2, 0] }, { t: '+Z', p: [0, 0, len + 1.2] }, { t: '-Z', p: [0, 0, -len - 1.2] } ];
  labelData.forEach(ld => {
    const s = createTextSprite(ld.t, { fontsize: 36, scaleFactor: 0.08 });
    s.position.set(ld.p[0], ld.p[1], ld.p[2]);
    scene.add(s);
  });
})(AXIS_LEN);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById("tooltip");
let hovered = null;
let lastMouseScreen = { x: 0, y: 0 };

window.addEventListener("mousemove", e => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  lastMouseScreen.x = e.clientX;
  lastMouseScreen.y = e.clientY;
});

window.addEventListener("click", () => {
  if (hovered) {
    alert("Assunto selecionado: " + hovered.userData.name);
  }
});

function focusOnNode(node) {
  const targetPos = new THREE.Vector3().copy(node.position);
  const offset = new THREE.Vector3(0, 0, 30);
  const newPos = targetPos.clone().add(offset);
  camera.position.copy(newPos);
  controls.target.copy(targetPos);
}

function updateSpriteScales(desiredPixelHeight = 36) {
  const vFOV = THREE.MathUtils.degToRad(camera.fov);
  const canvasHeight = renderer.domElement.clientHeight;
  nodes.forEach(node => {
    const sprite = node.userData.sprite;
    if (!sprite || !sprite.userData) return;
    const worldPos = new THREE.Vector3();
    node.getWorldPosition(worldPos);
    const distance = camera.position.distanceTo(worldPos);
    const heightInWorld = 2 * Math.tan(vFOV / 2) * distance;
    const worldUnitsPerPixel = heightInWorld / canvasHeight;
    const desiredWorldHeight = desiredPixelHeight * worldUnitsPerPixel;
    const aspect = sprite.userData.canvasWidth / sprite.userData.canvasHeight;
    const desiredWorldWidth = desiredWorldHeight * aspect;
    const minWorld = 0.5;
    const maxWorld = 20;
    const finalWidth = Math.min(maxWorld, Math.max(minWorld, desiredWorldWidth));
    const finalHeight = Math.min(maxWorld, Math.max(minWorld, desiredWorldHeight));
    sprite.scale.set(finalWidth, finalHeight, 1);
  });
}

function animate() {
  requestAnimationFrame(animate);
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(nodes);
  if (intersects.length > 0) {
    const obj = intersects[0].object;
    if (hovered !== obj) {
      if (hovered) hovered.scale.set(1, 1, 1);
      hovered = obj;
      hovered.scale.set(1.4, 1.4, 1.4);
    }
    tooltip.style.display = "block";
    tooltip.style.left = lastMouseScreen.x + 12 + "px";
    tooltip.style.top = lastMouseScreen.y + 12 + "px";
    tooltip.innerText = obj.userData.name;
  } else {
    if (hovered) hovered.scale.set(1, 1, 1);
    hovered = null;
    tooltip.style.display = "none";
  }
  controls.update();
  updateSpriteScales(36);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
