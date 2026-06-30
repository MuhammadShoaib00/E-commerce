'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Box, ImageIcon, Rotate3d } from 'lucide-react';
// Type-only import (erased at build); the runtime module is imported lazily below.
import type * as THREE from 'three';

interface ProductMediaProps {
  imageUrl?: string;
  name: string;
}

type View = 'image' | '3d';

/**
 * Product media with a flat image view and an interactive 3D preview.
 *
 * The 3D view renders a rounded "product block" textured with the product image
 * (a self-contained stand-in for a real GLB mesh — see NOTES.md). Drag to orbit;
 * it auto-rotates when idle. Three.js is imported dynamically and only when the
 * 3D tab is opened, so it never weighs down the initial product-page load.
 */
export function ProductMedia({ imageUrl, name }: ProductMediaProps) {
  const [view, setView] = useState<View>('image');

  return (
    <div className="relative bg-neutral-50">
      {/* Tabs */}
      <div className="absolute left-4 top-4 z-10 flex gap-1 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur">
        <TabButton active={view === 'image'} onClick={() => setView('image')} icon={<ImageIcon className="h-4 w-4" />} label="Photo" />
        <TabButton active={view === '3d'} onClick={() => setView('3d')} icon={<Rotate3d className="h-4 w-4" />} label="3D" />
      </div>

      <div className="relative aspect-square w-full">
        {view === 'image' ? (
          imageUrl ? (
            <Image src={imageUrl} alt={name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-300">
              <Box className="h-24 w-24" />
            </div>
          )
        ) : (
          <ThreeScene imageUrl={imageUrl} />
        )}
      </div>

      {view === '3d' && (
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
          Drag to rotate · scroll to zoom
        </p>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
        active ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:text-neutral-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ThreeScene({ imageUrl }: { imageUrl?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      if (disposed || !mount) return;

      const width = mount.clientWidth || 480;
      const height = mount.clientHeight || 480;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#f3f4f6');

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(2.4, 1.8, 3);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);

      // Lighting
      scene.add(new THREE.AmbientLight(0xffffff, 0.85));
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(5, 6, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x88aaff, 0.5);
      rim.position.set(-5, 2, -4);
      scene.add(rim);

      // Material — textured with the product image when available.
      const makeMaterial = (map?: THREE.Texture) =>
        new THREE.MeshStandardMaterial({
          map,
          color: map ? 0xffffff : 0x6b7280,
          roughness: 0.45,
          metalness: 0.1,
        });

      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const mesh = new THREE.Mesh(geometry, makeMaterial());
      scene.add(mesh);

      if (imageUrl) {
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(
          imageUrl,
          (texture) => {
            if (disposed) return;
            texture.colorSpace = THREE.SRGBColorSpace;
            mesh.material = makeMaterial(texture);
            setLoading(false);
          },
          undefined,
          () => setLoading(false), // texture failed → keep the plain block
        );
      } else {
        setLoading(false);
      }

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.4;
      controls.minDistance = 2.2;
      controls.maxDistance = 6;
      // Stop auto-rotation once the user grabs it.
      controls.addEventListener('start', () => (controls.autoRotate = false));

      let frame = 0;
      const animate = () => {
        frame = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        if (!mount) return;
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', onResize);
        controls.dispose();
        geometry.dispose();
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => {
          (m as THREE.MeshStandardMaterial).map?.dispose();
          m.dispose();
        });
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [imageUrl]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full" />
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
          Loading 3D preview…
        </div>
      )}
    </div>
  );
}
