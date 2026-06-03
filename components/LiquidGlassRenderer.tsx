'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

type GlassTarget = {
  selector: string;
  radius: number;
  depth: number;
};

const TARGETS: GlassTarget[] = [
  { selector: '.safari-bar', radius: 18, depth: 0.34 },
  { selector: '.content-row', radius: 12, depth: 0.18 },
];

function roundedShape(width: number, height: number, radius: number) {
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();

  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  return shape;
}

function makeGlassMesh(rect: DOMRect, radius: number, material: THREE.Material) {
  const geometry = new THREE.ExtrudeGeometry(roundedShape(rect.width, rect.height, radius), {
    depth: 10,
    bevelEnabled: true,
    bevelThickness: 8,
    bevelSize: 8,
    bevelSegments: 4,
    curveSegments: 8,
  });
  geometry.center();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = rect.left + rect.width / 2 - window.innerWidth / 2;
  mesh.position.y = window.innerHeight / 2 - rect.top - rect.height / 2;
  mesh.position.z = 0;
  mesh.scale.z = 0.08;
  return mesh;
}

export default function LiquidGlassRenderer() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      window.innerWidth / -2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight / -2,
      -1000,
      1000,
    );
    camera.position.z = 100;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    host.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const normalMap = textureLoader.load('/assets/liquid/NormalMap3.png');
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(1.2, 1.2);

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xffffff),
      metalness: 0,
      roughness: 0.025,
      transmission: 1,
      thickness: 1.65,
      ior: 1.68,
      transparent: true,
      opacity: 0.72,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      reflectivity: 1,
      envMapIntensity: 2.6,
      normalMap,
      normalScale: new THREE.Vector2(0.18, 0.18),
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const fillLight = new THREE.DirectionalLight(0xffffff, 2.2);
    fillLight.position.set(-1.8, 2.4, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xbfeeff, 1.6);
    rimLight.position.set(2.2, -1.4, 2);
    scene.add(rimLight);

    const meshes: THREE.Mesh[] = [];

    const rebuild = () => {
      meshes.splice(0).forEach((mesh) => {
        scene.remove(mesh);
        mesh.geometry.dispose();
      });

      TARGETS.forEach((target) => {
        document.querySelectorAll<HTMLElement>(target.selector).forEach((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.bottom < -80 || rect.top > window.innerHeight + 80 || rect.width < 12 || rect.height < 12) return;
          const mesh = makeGlassMesh(rect, target.radius, material);
          mesh.userData.depth = target.depth;
          meshes.push(mesh);
          scene.add(mesh);
        });
      });
    };

    new HDRLoader().load('/assets/liquid/photo_studio_broadway_hall_4k.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
      rebuild();
      renderer.render(scene, camera);
    });

    const resize = () => {
      camera.left = window.innerWidth / -2;
      camera.right = window.innerWidth / 2;
      camera.top = window.innerHeight / 2;
      camera.bottom = window.innerHeight / -2;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      rebuild();
    };

    let raf = 0;
    let lastFrame = 0;
    const FRAME_MS = 1000 / 30;
    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      if (now - lastFrame < FRAME_MS) return;
      lastFrame = now;
      const t = now * 0.001;
      normalMap.offset.set(Math.sin(t * 0.18) * 0.015, Math.cos(t * 0.14) * 0.015);
      meshes.forEach((mesh) => {
        const depth = mesh.userData.depth as number;
        mesh.rotation.x = Math.sin(t * 0.4 + mesh.position.x * 0.002) * depth * 0.045;
        mesh.rotation.y = Math.cos(t * 0.35 + mesh.position.y * 0.002) * depth * 0.045;
      });
      renderer.render(scene, camera);
    };

    let scrollRaf = 0;
    const scheduleRebuild = () => {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(rebuild);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', scheduleRebuild, { passive: true });
    rebuild();
    animate(0);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(scrollRaf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', scheduleRebuild);
      meshes.forEach((mesh) => {
        scene.remove(mesh);
        mesh.geometry.dispose();
      });
      normalMap.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="liquid-physical-layer" aria-hidden="true" />;
}
