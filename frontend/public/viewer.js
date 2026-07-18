import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function yawPitchAVector3(yaw, pitch, radio) {
  const yawRad = THREE.MathUtils.degToRad(yaw);
  const pitchRad = THREE.MathUtils.degToRad(pitch);
  return new THREE.Vector3(
    radio * Math.cos(pitchRad) * Math.sin(yawRad),
    radio * Math.sin(pitchRad),
    -radio * Math.cos(pitchRad) * Math.cos(yawRad)
  );
}

function crearTexturaFlecha() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(64, 64, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 60px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('↑', 64, 68);
  return new THREE.CanvasTexture(canvas);
}

export function crearVisor360({ contenedor, onNavegar }) {
  const RADIO_ESFERA = 500;
  let escenaActualId = null;
  let hotspotsActuales = [];

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, contenedor.clientWidth / contenedor.clientHeight, 0.1, 1000);
  camera.position.set(0.1, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
  contenedor.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = -0.4;
  controls.target.set(0, 0, -1);

  const geometria = new THREE.SphereGeometry(RADIO_ESFERA, 60, 40);
  const material = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide });
  const esfera = new THREE.Mesh(geometria, material);
  scene.add(esfera);

  const texturaFlecha = crearTexturaFlecha();
  const grupoHotspots = new THREE.Group();
  scene.add(grupoHotspots);

  const raycaster = new THREE.Raycaster();
  const cargadorTexturas = new THREE.TextureLoader();

  function pintarHotspots(hotspots) {
    grupoHotspots.clear();
    hotspotsActuales = hotspots;
    hotspots.forEach((h) => {
      const material = new THREE.SpriteMaterial({ map: texturaFlecha, depthTest: false });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(yawPitchAVector3(Number(h.yaw), Number(h.pitch), RADIO_ESFERA * 0.9));
      sprite.scale.set(30, 30, 1);
      sprite.userData.hotspot = h;
      grupoHotspots.add(sprite);
    });
  }

  function irAEscena(escena, hotspotsDeEscena) {
    escenaActualId = escena.id;
    cargadorTexturas.load(escena.url, (textura) => {
      textura.colorSpace = THREE.SRGBColorSpace;
      material.map = textura;
      material.color.set(0xffffff);
      material.needsUpdate = true;
    });
    pintarHotspots(hotspotsDeEscena);
  }

  renderer.domElement.addEventListener('click', (evento) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const puntero = new THREE.Vector2(
      ((evento.clientX - rect.left) / rect.width) * 2 - 1,
      -((evento.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(puntero, camera);
    const intersecciones = raycaster.intersectObjects(grupoHotspots.children);
    if (intersecciones.length > 0) {
      const hotspot = intersecciones[0].object.userData.hotspot;
      if (hotspot.escena_destino_id && onNavegar) onNavegar(hotspot.escena_destino_id);
    }
  });

  function animar() {
    requestAnimationFrame(animar);
    controls.update();
    renderer.render(scene, camera);
  }
  animar();

  function ajustarTamano() {
    camera.aspect = contenedor.clientWidth / contenedor.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
  }
  window.addEventListener('resize', ajustarTamano);

  return { irAEscena, ajustarTamano };
}
