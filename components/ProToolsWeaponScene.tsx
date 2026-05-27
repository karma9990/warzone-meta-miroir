'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const MODEL_URL = '/assets/3d/czbren2.glb';
const BULLET_URL = '/assets/3d/bullet-762.obj';
const RIGHT_YAW = -0.48;
const LEFT_YAW = RIGHT_YAW + Math.PI;
const BULLET_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xc38a38,
  roughness: 0.34,
  metalness: 0.82,
});
const FLASH_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xfff2a8,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
const TRACER_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xffd36a,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});

function normalizeModel(model: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  model.position.sub(center);
  const maxAxis = Math.max(size.x, size.y, size.z, 1);
  model.scale.setScalar(4.9 / maxAxis);

  model.rotation.set(0.12, Math.PI * 0.5, -0.04);
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.frustumCulled = false;
      object.castShadow = false;
      object.receiveShadow = false;

      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if ('metalness' in material) material.metalness = Math.max(material.metalness, 0.28);
        if ('roughness' in material) material.roughness = Math.min(Math.max(material.roughness, 0.34), 0.82);
      });
    }
  });
}

function normalizeBullet(model: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  model.position.sub(center);
  const maxAxis = Math.max(size.x, size.y, size.z, 1);
  model.scale.setScalar(0.92 / maxAxis);
  model.rotation.z = -Math.PI / 2;

  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.frustumCulled = false;
      object.material = BULLET_MATERIAL;
    }
  });
}

export default function ProToolsWeaponScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d8d8, 2.4));

    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(3.8, 4.4, 5.2);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 1.15);
    fill.position.set(-3.5, 1.2, 3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xb8c9ff, 1.7);
    rim.position.set(-4, 2.6, -4);
    scene.add(rim);

    const weapon = new THREE.Group();
    scene.add(weapon);

    const bullet = new THREE.Group();
    bullet.visible = false;
    scene.add(bullet);

    const flash = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.72, 18), FLASH_MATERIAL);
    flash.rotation.z = -Math.PI / 2;
    flash.visible = false;
    scene.add(flash);

    const tracer = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 12), TRACER_MATERIAL);
    tracer.rotation.z = Math.PI / 2;
    tracer.visible = false;
    scene.add(tracer);

    const gltfLoader = new GLTFLoader();
    const objLoader = new OBJLoader();
    let loadedModel: THREE.Object3D | null = null;
    let loadedBullet: THREE.Object3D | null = null;
    let disposed = false;

    gltfLoader.load(MODEL_URL, (gltf) => {
      if (disposed) return;
      loadedModel = gltf.scene;
      normalizeModel(loadedModel);
      weapon.add(loadedModel);
    });

    objLoader.load(BULLET_URL, (object) => {
      if (disposed) return;
      loadedBullet = object;
      normalizeBullet(loadedBullet);
      bullet.add(loadedBullet);
    });

    const target = new THREE.Vector3(2.45, 1.25, 0);
    const current = target.clone();
    const muzzleWorld = new THREE.Vector3();
    const shotDirection = new THREE.Vector3();
    const muzzleLocal = new THREE.Vector3(2.42, 0.08, 0);
    const directionLocal = new THREE.Vector3(1, 0, 0);
    let targetYaw = RIGHT_YAW;
    let targetFacingYaw = RIGHT_YAW;
    let currentYaw = targetYaw;
    let raf = 0;
    let scrollProgress = 0;
    let shotStart = 0;
    let shotReady = true;

    const updateTarget = () => {
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      scrollProgress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
      const lane = Math.sin(scrollProgress * Math.PI * 5);
      const isMobile = window.innerWidth < 720;
      target.x = lane * (isMobile ? 1.05 : 2.55);
      target.y = 1.34 - scrollProgress * (isMobile ? 2.45 : 3.36);
      target.z = Math.sin(scrollProgress * Math.PI * 2) * 0.24;
      const sideThreshold = isMobile ? 0.16 : 0.28;
      if (target.x > sideThreshold) {
        targetFacingYaw = LEFT_YAW;
      } else if (target.x < -sideThreshold) {
        targetFacingYaw = RIGHT_YAW;
      }
      targetYaw = targetFacingYaw + lane * 0.05;
    };

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
      renderer.setSize(window.innerWidth, window.innerHeight);
      updateTarget();
    };

    const triggerShot = () => {
      shotStart = performance.now();
      shotReady = false;
      bullet.visible = Boolean(loadedBullet);
      flash.visible = true;
    };

    const animate = () => {
      current.lerp(target, 0.075);
      currentYaw += (targetYaw - currentYaw) * 0.075;

      if (scrollProgress > 0.965 && shotReady && loadedBullet) {
        triggerShot();
      }
      if (scrollProgress < 0.86) {
        shotReady = true;
        bullet.visible = false;
        flash.visible = false;
      }

      const shotElapsed = shotStart > 0 ? performance.now() - shotStart : 9999;
      const shotProgress = Math.min(shotElapsed / 1250, 1);
      const recoil = shotProgress < 1 ? Math.sin((1 - shotProgress) * Math.PI) * 0.16 : 0;

      weapon.position.copy(current);
      weapon.rotation.y = currentYaw;
      weapon.rotation.x = -0.16 + Math.sin(scrollProgress * Math.PI * 4) * 0.055 - recoil * 0.06;
      weapon.rotation.z = 0.06 + Math.sin(performance.now() * 0.0012) * 0.018;

      weapon.updateMatrixWorld();
      muzzleWorld.copy(muzzleLocal).applyMatrix4(weapon.matrixWorld);
      shotDirection.copy(directionLocal).applyQuaternion(weapon.quaternion).normalize();

      if (shotProgress < 1 && loadedBullet) {
        bullet.visible = true;
        bullet.position.copy(muzzleWorld).addScaledVector(shotDirection, 0.38 + shotProgress * 4.35);
        bullet.quaternion.copy(weapon.quaternion);
        bullet.scale.setScalar(1.45 + shotProgress * 0.38);

        flash.visible = shotProgress < 0.32;
        flash.position.copy(muzzleWorld).addScaledVector(shotDirection, 0.12);
        flash.quaternion.copy(weapon.quaternion);
        flash.rotateZ(-Math.PI / 2);
        FLASH_MATERIAL.opacity = Math.max(0, 0.85 - shotProgress * 2.65);

        tracer.visible = shotProgress > 0.04 && shotProgress < 0.74;
        tracer.position.copy(muzzleWorld).addScaledVector(shotDirection, 0.24 + shotProgress * 2.15);
        tracer.quaternion.copy(weapon.quaternion);
        tracer.rotateZ(Math.PI / 2);
        tracer.scale.set(1, Math.max(0.1, 1.15 - shotProgress * 0.55), 1);
        TRACER_MATERIAL.opacity = Math.max(0, 0.72 - shotProgress * 0.9);
      } else if (!shotReady) {
        bullet.visible = false;
        flash.visible = false;
        tracer.visible = false;
      }

      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };

    updateTarget();
    animate();
    window.addEventListener('scroll', updateTarget, { passive: true });
    window.addEventListener('resize', resize);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', updateTarget);
      window.removeEventListener('resize', resize);

      if (loadedModel) {
        loadedModel.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material.dispose());
          }
        });
      }
      if (loadedBullet) {
        loadedBullet.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
          }
        });
      }
      flash.geometry.dispose();
      tracer.geometry.dispose();

      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="pro-tools-weapon-scene" aria-hidden="true" />;
}
