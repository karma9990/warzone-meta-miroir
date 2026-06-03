'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { glassVertexShader, glassFragmentShader } from '@/lib/liquidGlassShader';
import { getPanels, subscribe } from '@/lib/glassStore';

interface Props {
  backgroundSrc: string;
}

export default function GlassScene({ backgroundSrc }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || typeof window === 'undefined') return;

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      premultipliedAlpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    Object.assign(renderer.domElement.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '0',
    });
    container.appendChild(renderer.domElement);

    // ── Orthographic camera (pixel-perfect) ───────────────────────────────
    const W = window.innerWidth;
    const H = window.innerHeight;
    const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0.1, 100);
    camera.position.z = 10;

    // ── Background scene ──────────────────────────────────────────────────
    const bgScene = new THREE.Scene();

    const bgTexture = new THREE.TextureLoader().load(backgroundSrc, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      fitCover(tex);
    });

    const bgGeo = new THREE.PlaneGeometry(1, 1);
    const bgMat = new THREE.MeshBasicMaterial({ map: bgTexture });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    bgMesh.scale.set(W, H, 1);
    bgScene.add(bgMesh);

    function fitCover(tex: THREE.Texture) {
      const img = tex.image as HTMLImageElement;
      if (!img) return;
      const vp = window.innerWidth / window.innerHeight;
      const ta = img.naturalWidth / img.naturalHeight;
      if (vp > ta) {
        tex.repeat.set(1, ta / vp);
        tex.offset.set(0, (1 - ta / vp) / 2);
      } else {
        tex.repeat.set(vp / ta, 1);
        tex.offset.set((1 - vp / ta) / 2, 0);
      }
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
    }

    // ── Render target (background capture) ───────────────────────────────
    const rt = new THREE.WebGLRenderTarget(W, H, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    // ── Glass scene ───────────────────────────────────────────────────────
    const glassScene = new THREE.Scene();
    const glassMeshMap = new Map<string, THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>();
    const neutralNormal = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1, THREE.RGBAFormat);
    neutralNormal.needsUpdate = true;
    const neutralEnv = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
    neutralEnv.needsUpdate = true;
    const normalMap = new THREE.TextureLoader().load('/assets/liquid/NormalMap3.png');
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(1, 1);
    let envTexture: THREE.Texture = neutralEnv;

    new HDRLoader().load('/assets/liquid/photo_studio_broadway_hall_4k.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      envTexture = texture;
      glassMeshMap.forEach(mesh => {
        mesh.material.uniforms.tEnv.value = envTexture;
      });
    });

    function makeMaterial(borderRadius: number) {
      return new THREE.ShaderMaterial({
        vertexShader: glassVertexShader,
        fragmentShader: glassFragmentShader,
        uniforms: {
          tBackground: { value: rt.texture },
          tNormal: { value: normalMap || neutralNormal },
          tEnv: { value: envTexture },
          uSize: { value: new THREE.Vector2(1, 1) },
          uRadius: { value: borderRadius },
          uTime: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
    }

    function syncPanels() {
      const panels = getPanels();
      const currentIds = new Set<string>();

      panels.forEach((entry, id) => {
        currentIds.add(id);
        const rect = entry.element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        let mesh = glassMeshMap.get(id);
        if (!mesh) {
          const geo = new THREE.PlaneGeometry(1, 1);
          const mat = makeMaterial(entry.borderRadius);
          mesh = new THREE.Mesh(geo, mat);
          glassMeshMap.set(id, mesh);
          glassScene.add(mesh);
        }

        // Screen → Three.js ortho coords
        const cx = rect.left + rect.width / 2 - window.innerWidth / 2;
        const cy = -(rect.top + rect.height / 2 - window.innerHeight / 2);

        mesh.position.set(cx, cy, 0);
        mesh.scale.set(rect.width, rect.height, 1);
        mesh.material.uniforms.uSize.value.set(rect.width, rect.height);
        mesh.material.uniforms.uRadius.value = entry.borderRadius;
      });

      // Remove stale meshes
      glassMeshMap.forEach((mesh, id) => {
        if (!currentIds.has(id)) {
          glassScene.remove(mesh);
          mesh.geometry.dispose();
          mesh.material.dispose();
          glassMeshMap.delete(id);
        }
      });
    }

    // ── Animation loop ────────────────────────────────────────────────────
    let raf: number;
    const startTime = performance.now();
    let needsSync = true;
    let lastFrame = 0;
    const TARGET_FPS = 30;
    const FRAME_MS = 1000 / TARGET_FPS;

    function animate(now: number) {
      raf = requestAnimationFrame(animate);
      if (now - lastFrame < FRAME_MS) return;
      lastFrame = now;

      const elapsed = (now - startTime) / 1000;

      if (needsSync) {
        syncPanels();
        needsSync = false;
      }

      glassMeshMap.forEach(mesh => {
        mesh.material.uniforms.uTime.value = elapsed;
      });
      normalMap.offset.set(Math.sin(elapsed * 0.035) * 0.01, Math.cos(elapsed * 0.028) * 0.01);

      // Pass 1: background → render target
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(bgScene, camera);

      // Pass 2: background + glass → screen
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(bgScene, camera);
      renderer.clearDepth();
      renderer.render(glassScene, camera);
    }

    animate(0);

    // ── Subscribe to panel changes ────────────────────────────────────────
    const unsubscribe = subscribe(() => { needsSync = true; });
    const onScroll = () => { needsSync = true; };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── Resize ────────────────────────────────────────────────────────────
    function onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      renderer.setSize(w, h);
      rt.setSize(w, h);

      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();

      bgMesh.scale.set(w, h, 1);
      if (bgTexture.image) fitCover(bgTexture);
    }

    const onResizeWrapped = () => { onResize(); needsSync = true; };
    window.addEventListener('resize', onResizeWrapped);

    return () => {
      cancelAnimationFrame(raf);
      unsubscribe();
      window.removeEventListener('resize', onResizeWrapped);
      window.removeEventListener('scroll', onScroll);

      glassMeshMap.forEach(mesh => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      bgGeo.dispose();
      bgMat.dispose();
      neutralNormal.dispose();
      neutralEnv.dispose();
      normalMap.dispose();
      if (envTexture !== neutralEnv) envTexture.dispose();
      rt.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [backgroundSrc]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
