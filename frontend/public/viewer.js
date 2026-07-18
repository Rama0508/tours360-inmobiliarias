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

// Convierte alpha/beta/gamma del sensor de orientación del celular en la
// rotación de la cámara. Basado en el DeviceOrientationControls clásico de
// three.js (quitado de las versiones nuevas de la librería).
function crearControlesGiroscopio(camera) {
  const zee = new THREE.Vector3(0, 0, 1);
  const euler = new THREE.Euler();
  const q0 = new THREE.Quaternion();
  const qCorreccion = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

  let alpha = 0;
  let beta = 0;
  let gamma = 0;
  let orientacionPantalla = 0;
  let activo = false;

  function onOrientacion(evento) {
    alpha = evento.alpha ? THREE.MathUtils.degToRad(evento.alpha) : 0;
    beta = evento.beta ? THREE.MathUtils.degToRad(evento.beta) : 0;
    gamma = evento.gamma ? THREE.MathUtils.degToRad(evento.gamma) : 0;
  }

  function onOrientacionPantalla() {
    orientacionPantalla = THREE.MathUtils.degToRad(window.orientation || 0);
  }

  async function activar() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permiso = await DeviceOrientationEvent.requestPermission();
      if (permiso !== 'granted') return false;
    }
    window.addEventListener('deviceorientation', onOrientacion);
    window.addEventListener('orientationchange', onOrientacionPantalla);
    onOrientacionPantalla();
    activo = true;
    return true;
  }

  function desactivar() {
    window.removeEventListener('deviceorientation', onOrientacion);
    window.removeEventListener('orientationchange', onOrientacionPantalla);
    activo = false;
  }

  function actualizarCamara() {
    if (!activo) return;
    euler.set(beta, alpha, -gamma, 'YXZ');
    camera.quaternion.setFromEuler(euler);
    camera.quaternion.multiply(qCorreccion);
    camera.quaternion.multiply(q0.setFromAxisAngle(zee, -orientacionPantalla));
  }

  return { activar, desactivar, actualizarCamara, get activo() { return activo; } };
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

  contenedor.style.position = 'relative';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, contenedor.clientWidth / contenedor.clientHeight, 0.1, 1000);
  camera.position.set(0.1, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
  contenedor.appendChild(renderer.domElement);

  const overlayFade = document.createElement('div');
  overlayFade.style.cssText =
    'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;' +
    'transition:opacity 350ms ease;z-index:2;';
  contenedor.appendChild(overlayFade);

  const botonFullscreen = document.createElement('button');
  botonFullscreen.type = 'button';
  botonFullscreen.textContent = '⛶';
  botonFullscreen.title = 'Pantalla completa';
  botonFullscreen.style.cssText =
    'position:absolute;top:12px;right:12px;z-index:3;width:40px;height:40px;border:none;' +
    'border-radius:8px;background:rgba(0,0,0,0.55);color:#fff;font-size:1.2rem;cursor:pointer;';
  botonFullscreen.addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      contenedor.requestFullscreen();
    }
  });
  contenedor.appendChild(botonFullscreen);
  document.addEventListener('fullscreenchange', () => setTimeout(ajustarTamano, 50));

  const hayEventoOrientacion = typeof window.DeviceOrientationEvent !== 'undefined';
  const botonGiroscopio = document.createElement('button');
  botonGiroscopio.type = 'button';
  botonGiroscopio.textContent = '📱 Mover con el celular';
  botonGiroscopio.style.cssText =
    'position:absolute;bottom:12px;left:12px;z-index:3;padding:8px 14px;border:none;' +
    'border-radius:20px;background:rgba(0,0,0,0.55);color:#fff;font-size:0.8rem;cursor:pointer;' +
    (hayEventoOrientacion ? '' : 'display:none;');
  contenedor.appendChild(botonGiroscopio);

  const avisoInicial = document.createElement('div');
  avisoInicial.textContent = 'Arrastrá o mové el celular para mirar alrededor';
  avisoInicial.style.cssText =
    'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:3;' +
    'background:rgba(0,0,0,0.6);color:#fff;padding:10px 18px;border-radius:20px;' +
    'font-size:0.85rem;pointer-events:none;transition:opacity 500ms ease;white-space:nowrap;';
  contenedor.appendChild(avisoInicial);
  function ocultarAviso() {
    avisoInicial.style.opacity = '0';
  }
  renderer.domElement.addEventListener('pointerdown', ocultarAviso, { once: true });
  setTimeout(ocultarAviso, 4000);

  const controlesGiroscopio = crearControlesGiroscopio(camera);
  botonGiroscopio.addEventListener('click', async () => {
    if (controlesGiroscopio.activo) {
      controlesGiroscopio.desactivar();
      controls.enabled = true;
      botonGiroscopio.textContent = '📱 Mover con el celular';
      return;
    }
    ocultarAviso();
    const activado = await controlesGiroscopio.activar();
    if (activado) {
      controls.enabled = false;
      botonGiroscopio.textContent = '🖐 Volver a arrastrar';
    } else {
      alert('No pudimos activar el sensor de movimiento. Revisá los permisos de movimiento del navegador.');
    }
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = -0.4;
  controls.target.set(0, 0, -1);

  // Dos esferas superpuestas para el cross-fade: "materialBase" es lo que se
  // ve normalmente, "materialEntrante" arranca invisible y se usa solo
  // durante la transición, subiendo su opacidad mientras materialBase se
  // mantiene debajo. Al terminar, su textura se copia a materialBase y
  // vuelve a opacidad 0, lista para la próxima vez.
  const geometria = new THREE.SphereGeometry(RADIO_ESFERA, 60, 40);
  const materialBase = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide });
  const materialEntrante = new THREE.MeshBasicMaterial({
    color: 0xffffff, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false,
  });
  const esferaBase = new THREE.Mesh(geometria, materialBase);
  const esferaEntrante = new THREE.Mesh(geometria, materialEntrante);
  esferaEntrante.renderOrder = 1;
  scene.add(esferaBase);
  scene.add(esferaEntrante);

  const texturaFlecha = crearTexturaFlecha();
  const grupoHotspots = new THREE.Group();
  scene.add(grupoHotspots);

  const raycaster = new THREE.Raycaster();
  const cargadorTexturas = new THREE.TextureLoader();

  // --- Mudanza virtual: fotos propias del usuario "pegadas" a un punto de
  // la esfera (no hay geometría real de la habitación, así que no hay
  // perspectiva/escala verdaderas — es una ilusión visual para tener una
  // idea de cómo quedaría el mueble, no una medición precisa). ---
  const RADIO_MUEBLES = RADIO_ESFERA * 0.6;
  const TAMANO_BASE_MUEBLE = 70;
  const grupoMuebles = new THREE.Group();
  scene.add(grupoMuebles);
  let siguienteIdMueble = 1;
  let muebleArrastrando = null;
  let onCambioSeleccionMueble = null;
  let muebleSeleccionadoId = null;

  function agregarMueble(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onerror = () => reject(new Error('No pudimos leer esa imagen'));
      lector.onload = () => {
        cargadorTexturas.load(lector.result, (textura) => {
          textura.colorSpace = THREE.SRGBColorSpace;
          const material = new THREE.SpriteMaterial({ map: textura, transparent: true, depthTest: false });
          const sprite = new THREE.Sprite(material);

          const relacionAspecto = textura.image.width / textura.image.height;
          const escalaBase = new THREE.Vector2(
            relacionAspecto >= 1 ? TAMANO_BASE_MUEBLE : TAMANO_BASE_MUEBLE * relacionAspecto,
            relacionAspecto >= 1 ? TAMANO_BASE_MUEBLE / relacionAspecto : TAMANO_BASE_MUEBLE
          );
          sprite.userData.escalaBase = escalaBase;
          sprite.userData.factorEscala = 1;
          sprite.scale.set(escalaBase.x, escalaBase.y, 1);

          const direccion = new THREE.Vector3();
          camera.getWorldDirection(direccion);
          sprite.position.copy(direccion.multiplyScalar(RADIO_MUEBLES));

          const id = siguienteIdMueble++;
          sprite.userData.id = id;
          sprite.renderOrder = 2;
          grupoMuebles.add(sprite);
          resolve(id);
        });
      };
      lector.readAsDataURL(archivo);
    });
  }

  function quitarMueble(id) {
    const sprite = grupoMuebles.children.find((s) => s.userData.id === id);
    if (!sprite) return;
    sprite.material.map?.dispose();
    sprite.material.dispose();
    grupoMuebles.remove(sprite);
    if (muebleSeleccionadoId === id) seleccionarMueble(null);
  }

  function escalarMueble(id, factor) {
    const sprite = grupoMuebles.children.find((s) => s.userData.id === id);
    if (!sprite) return;
    sprite.userData.factorEscala = factor;
    const base = sprite.userData.escalaBase;
    sprite.scale.set(base.x * factor, base.y * factor, 1);
  }

  function seleccionarMueble(id) {
    muebleSeleccionadoId = id;
    if (onCambioSeleccionMueble) onCambioSeleccionMueble(id);
  }

  function definirCallbackSeleccionMueble(callback) {
    onCambioSeleccionMueble = callback;
  }

  // Los muebles están "pegados" a la foto de la habitación actual — al
  // cambiar de ambiente no tendría sentido que sigan flotando ahí, así que
  // se limpian solos en cada salto (ver irAEscena más abajo).
  function limpiarMuebles() {
    grupoMuebles.children.slice().forEach((sprite) => {
      sprite.material.map?.dispose();
      sprite.material.dispose();
      grupoMuebles.remove(sprite);
    });
    if (muebleSeleccionadoId !== null) seleccionarMueble(null);
  }

  const FOV_NORMAL = 75;
  const FOV_CAMINANDO = 52;

  // Anima un valor de "ahora" a "hasta" durante duracionMs, con ease-out,
  // llamando a onPaso(t) en cada frame y a onFin() cuando termina.
  function animar_valor(duracionMs, onPaso, onFin) {
    const inicio = performance.now();
    function paso(ahora) {
      const t = Math.min((ahora - inicio) / duracionMs, 1);
      onPaso(t * (2 - t));
      if (t < 1) requestAnimationFrame(paso);
      else if (onFin) onFin();
    }
    requestAnimationFrame(paso);
  }

  function pintarHotspots(hotspots) {
    grupoHotspots.clear();
    hotspots.forEach((h) => {
      const material = new THREE.SpriteMaterial({ map: texturaFlecha, depthTest: false });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(yawPitchAVector3(Number(h.yaw), Number(h.pitch), RADIO_ESFERA * 0.9));
      sprite.scale.set(30, 30, 1);
      sprite.userData.hotspot = h;
      grupoHotspots.add(sprite);
    });
  }

  let enTransicion = false;

  function irAEscena(escena, hotspotsDeEscena) {
    if (escena.id === escenaActualId || enTransicion) return;
    escenaActualId = escena.id;
    limpiarMuebles();

    // Primera carga (no hay nada dibujado todavía): fundido simple desde negro.
    if (!materialBase.map) {
      overlayFade.style.opacity = '1';
      cargadorTexturas.load(escena.url, (textura) => {
        textura.colorSpace = THREE.SRGBColorSpace;
        materialBase.map = textura;
        materialBase.color.set(0xffffff);
        materialBase.needsUpdate = true;
        pintarHotspots(hotspotsDeEscena);
        requestAnimationFrame(() => { overlayFade.style.opacity = '0'; });
      });
      return;
    }

    enTransicion = true;
    grupoHotspots.visible = false;

    cargadorTexturas.load(escena.url, (textura) => {
      textura.colorSpace = THREE.SRGBColorSpace;
      materialEntrante.map = textura;
      materialEntrante.needsUpdate = true;

      const fovInicial = camera.fov;
      const DURACION_AVANCE = 900;

      // Avanzar: la foto nueva se funde encima de la actual mientras la
      // cámara hace zoom, como si uno caminara hacia el punto elegido.
      animar_valor(
        DURACION_AVANCE,
        (t) => {
          materialEntrante.opacity = t;
          camera.fov = fovInicial + (FOV_CAMINANDO - fovInicial) * t;
          camera.updateProjectionMatrix();
        },
        () => {
          // Consolidar: la foto nueva pasa a ser la base, la capa de
          // transición vuelve a quedar invisible lista para la próxima vez.
          if (materialBase.map) materialBase.map.dispose();
          materialBase.map = materialEntrante.map;
          materialBase.needsUpdate = true;
          materialEntrante.opacity = 0;

          pintarHotspots(hotspotsDeEscena);
          grupoHotspots.visible = true;

          // Asentarse: volver el FOV a la normalidad, como si dejaras de avanzar.
          const fovDesde = camera.fov;
          animar_valor(350, (t2) => {
            camera.fov = fovDesde + (FOV_NORMAL - fovDesde) * t2;
            camera.updateProjectionMatrix();
          }, () => { enTransicion = false; });
        }
      );
    });
  }

  function puntoNormalizado(evento) {
    const rect = renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((evento.clientX - rect.left) / rect.width) * 2 - 1,
      -((evento.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  renderer.domElement.addEventListener('click', (evento) => {
    if (muebleArrastrando) return; // el pointerup ya limpia esto, pero por las dudas
    raycaster.setFromCamera(puntoNormalizado(evento), camera);

    const hitMuebles = raycaster.intersectObjects(grupoMuebles.children);
    if (hitMuebles.length > 0) {
      seleccionarMueble(hitMuebles[0].object.userData.id);
      return;
    }

    const intersecciones = raycaster.intersectObjects(grupoHotspots.children);
    if (intersecciones.length > 0) {
      const hotspot = intersecciones[0].object.userData.hotspot;
      if (hotspot.escena_destino_id && onNavegar) onNavegar(hotspot.escena_destino_id);
      return;
    }

    if (muebleSeleccionadoId !== null) seleccionarMueble(null);
  });

  renderer.domElement.addEventListener('pointerdown', (evento) => {
    raycaster.setFromCamera(puntoNormalizado(evento), camera);
    const hit = raycaster.intersectObjects(grupoMuebles.children);
    if (hit.length === 0) return;

    muebleArrastrando = hit[0].object;
    controls.enabled = false;
  });

  renderer.domElement.addEventListener('pointermove', (evento) => {
    if (!muebleArrastrando) return;
    raycaster.setFromCamera(puntoNormalizado(evento), camera);
    const hit = raycaster.intersectObject(esferaBase);
    if (hit.length === 0) return;
    muebleArrastrando.position.copy(hit[0].point.normalize().multiplyScalar(RADIO_MUEBLES));
  });

  window.addEventListener('pointerup', () => {
    if (!muebleArrastrando) return;
    seleccionarMueble(muebleArrastrando.userData.id);
    muebleArrastrando = null;
    if (!controlesGiroscopio.activo) controls.enabled = true;
  });

  function animar() {
    requestAnimationFrame(animar);
    if (controlesGiroscopio.activo) {
      controlesGiroscopio.actualizarCamara();
    } else {
      controls.update();
    }
    renderer.render(scene, camera);
  }
  animar();

  function ajustarTamano() {
    camera.aspect = contenedor.clientWidth / contenedor.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
  }
  window.addEventListener('resize', ajustarTamano);

  return {
    irAEscena,
    ajustarTamano,
    agregarMueble,
    quitarMueble,
    escalarMueble,
    definirCallbackSeleccionMueble,
  };
}
