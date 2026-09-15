import { useEffect, useRef, useState } from 'react';

export interface SceneResolution {
  id: number;
  pot: number;
  stack: number;
  streets: 2 | 3;
  selectedPercent: number;
  targetPercent: number;
  correct: boolean;
}

interface Props {
  pot: number;
  stack: number;
  streets: 2 | 3;
  resolution?: SceneResolution | null;
  reducedMotion?: boolean;
  compact?: boolean;
}

interface Readout {
  street: string;
  pot: number;
  stack: number;
  state: 'ready' | 'running' | 'fit' | 'residue' | 'early';
}

const streetNames = ['FLOP', 'TURN', 'RIVER'];

function lineAt(pot: number, stack: number, streets: number, fraction: number, stage: number) {
  let currentPot = pot;
  let remaining = stack;
  for (let index = 0; index < Math.min(stage, streets); index += 1) {
    const bet = Math.min(remaining, currentPot * fraction);
    currentPot += bet * 2;
    remaining -= bet;
  }
  return { pot: currentPot, stack: Math.max(0, remaining) };
}

export function StackoffScene({ pot, stack, streets, resolution, reducedMotion = false, compact = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneApi = useRef<{ set: (potRatio: number, stackRatio: number, gate: number, state: Readout['state'], streetCount: number) => void; dispose: () => void } | null>(null);
  const [fallback, setFallback] = useState(false);
  const [readout, setReadout] = useState<Readout>({ street: 'LINE ARMED', pot, stack, state: 'ready' });

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;
    let frame = 0;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    void import('three').then((THREE) => {
      if (cancelled) return;
      try {
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !compact, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.6));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 80);
        camera.position.set(0, 5.2, 8.8);
        camera.lookAt(0, 0.3, 0);

        scene.add(new THREE.HemisphereLight(0xa9ddff, 0x061017, 2.4));
        const key = new THREE.PointLight(0xffb96e, 18, 16);
        key.position.set(-4, 5, 5);
        scene.add(key);
        const cyan = new THREE.PointLight(0x54dcff, 20, 12);
        cyan.position.set(4, 3, 1);
        scene.add(cyan);

        const group = new THREE.Group();
        group.rotation.x = -0.06;
        scene.add(group);

        const floor = new THREE.Mesh(
          new THREE.CylinderGeometry(4.5, 4.8, 0.22, 72),
          new THREE.MeshStandardMaterial({ color: 0x09111c, metalness: 0.85, roughness: 0.28 }),
        );
        floor.position.y = -0.32;
        group.add(floor);
        const rail = new THREE.Mesh(
          new THREE.TorusGeometry(3.55, 0.15, 12, 72),
          new THREE.MeshStandardMaterial({ color: 0x16283a, emissive: 0x2cbfe8, emissiveIntensity: 0.28, metalness: 0.8, roughness: 0.2 }),
        );
        rail.rotation.x = Math.PI / 2;
        rail.position.y = -0.08;
        group.add(rail);

        const felt = new THREE.Mesh(
          new THREE.CylinderGeometry(3.35, 3.35, 0.14, 64),
          new THREE.MeshStandardMaterial({ color: 0x0a2630, roughness: 0.58, metalness: 0.25 }),
        );
        felt.position.y = -0.16;
        group.add(felt);

        const stackChips: Array<InstanceType<typeof THREE.Mesh>> = [];
        const potChips: Array<InstanceType<typeof THREE.Mesh>> = [];
        const chipGeometry = new THREE.CylinderGeometry(0.29, 0.29, 0.1, 32);
        for (let index = 0; index < 18; index += 1) {
          const material = new THREE.MeshStandardMaterial({
            color: index % 3 === 0 ? 0xffb05a : 0x4edcff,
            emissive: index % 3 === 0 ? 0x6d3211 : 0x0c5c72,
            emissiveIntensity: 0.35,
            metalness: 0.48,
            roughness: 0.3,
          });
          const source = new THREE.Mesh(chipGeometry, material);
          source.position.set(-2.35 + (index % 2) * 0.12, index * 0.105, 0.4 + (index % 2) * 0.08);
          group.add(source);
          stackChips.push(source);
          const target = new THREE.Mesh(chipGeometry, material.clone());
          target.position.set(0.25 + (index % 4) * 0.2, (index % 5) * 0.105, -0.15 + Math.floor(index / 5) * 0.18);
          group.add(target);
          potChips.push(target);
        }

        const gates: Array<InstanceType<typeof THREE.Mesh>> = [];
        for (let index = 0; index < 3; index += 1) {
          const gate = new THREE.Mesh(
            new THREE.TorusGeometry(0.66 + index * 0.36, 0.022, 8, 64, Math.PI),
            new THREE.MeshBasicMaterial({ color: index < streets ? 0x49dfff : 0x24323d, transparent: true, opacity: index < streets ? 0.38 : 0.1 }),
          );
          gate.position.set(-0.05, 0.02, -0.2);
          gate.rotation.set(Math.PI / 2, 0, index * 0.36);
          group.add(gate);
          gates.push(gate);
        }

        const targetRing = new THREE.Mesh(
          new THREE.RingGeometry(1.45, 1.49, 80),
          new THREE.MeshBasicMaterial({ color: 0xffba63, transparent: true, opacity: 0.34, side: THREE.DoubleSide }),
        );
        targetRing.rotation.x = -Math.PI / 2;
        targetRing.position.y = 0.01;
        group.add(targetRing);

        const setScene = (potRatio: number, stackRatio: number, activeGate: number, state: Readout['state'], streetCount: number) => {
          const visibleStack = Math.round(stackRatio * stackChips.length);
          const visiblePot = Math.max(2, Math.round(potRatio * potChips.length));
          stackChips.forEach((chip, index) => {
            chip.visible = index < visibleStack;
            if (state === 'early' && index === 0) (chip.material as InstanceType<typeof THREE.MeshStandardMaterial>).emissiveIntensity = 1.1;
          });
          potChips.forEach((chip, index) => { chip.visible = index < visiblePot; });
          gates.forEach((gate, index) => {
            const mat = gate.material as InstanceType<typeof THREE.MeshBasicMaterial>;
            mat.opacity = index === activeGate ? 0.95 : index < streetCount ? 0.28 : 0.07;
            mat.color.setHex(state === 'residue' || state === 'early' ? 0xff6e78 : 0x49dfff);
          });
          (targetRing.material as InstanceType<typeof THREE.MeshBasicMaterial>).opacity = state === 'fit' ? 0.85 : 0.3;
          (targetRing.material as InstanceType<typeof THREE.MeshBasicMaterial>).color.setHex(state === 'fit' ? 0x73ffc2 : state === 'ready' ? 0xffba63 : 0xff6e78);
        };
        setScene(Math.min(1, pot / (pot + stack * 2)), 1, -1, 'ready', streets);

        let yawTarget = 0;
        let pitchTarget = 0;
        let dragging = false;
        let lastX = 0;
        let lastY = 0;
        const onDown = (event: PointerEvent) => {
          dragging = true;
          lastX = event.clientX;
          lastY = event.clientY;
          canvas.setPointerCapture(event.pointerId);
        };
        const onMove = (event: PointerEvent) => {
          if (!dragging) return;
          yawTarget += (event.clientX - lastX) * 0.006;
          pitchTarget = Math.max(-0.12, Math.min(0.18, pitchTarget + (event.clientY - lastY) * 0.002));
          lastX = event.clientX;
          lastY = event.clientY;
        };
        const onUp = () => { dragging = false; };
        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointercancel', onUp);

        const resize = () => {
          const bounds = host.getBoundingClientRect();
          const width = Math.max(240, Math.floor(bounds.width));
          const height = Math.max(190, Math.floor(bounds.height));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();

        const started = performance.now();
        let lastRender = 0;
        const render = (time: number) => {
          if (cancelled) return;
          if (time - lastRender >= (reducedMotion ? 100 : 32)) {
            group.rotation.y += (yawTarget - group.rotation.y) * 0.12;
            group.rotation.x += (pitchTarget - group.rotation.x) * 0.12;
            if (!reducedMotion && !dragging) targetRing.rotation.z = (time - started) * 0.00012;
            renderer.render(scene, camera);
            lastRender = time;
          }
          frame = requestAnimationFrame(render);
        };
        frame = requestAnimationFrame(render);
        sceneApi.current = {
          set: setScene,
          dispose: () => {
            cancelAnimationFrame(frame);
            resizeObserver?.disconnect();
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerup', onUp);
            canvas.removeEventListener('pointercancel', onUp);
            renderer.dispose();
            chipGeometry.dispose();
          },
        };
      } catch {
        setFallback(true);
      }
    }).catch(() => setFallback(true));

    return () => {
      cancelled = true;
      sceneApi.current?.dispose();
      sceneApi.current = null;
      resizeObserver?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [compact, reducedMotion]);

  useEffect(() => {
    if (!resolution) {
      setReadout({ street: 'LINE ARMED', pot, stack, state: 'ready' });
      sceneApi.current?.set(Math.min(1, pot / (pot + stack * 2)), 1, -1, 'ready', streets);
      return;
    }
    const duration = reducedMotion ? 120 : 1_650;
    const start = performance.now();
    let previousStage = -1;
    let animationFrame = 0;
    const targetFinal = pot + stack * 2;
    const animate = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);
      const stage = Math.min(resolution.streets, Math.floor(progress * resolution.streets + 0.001));
      if (stage !== previousStage || progress === 1) {
        previousStage = stage;
        const line = lineAt(resolution.pot, resolution.stack, resolution.streets, resolution.selectedPercent / 100, stage);
        let state: Readout['state'] = progress < 1 ? 'running' : resolution.correct ? 'fit' : line.stack > resolution.stack * 0.025 ? 'residue' : 'early';
        const streetIndex = Math.max(0, Math.min(2, (resolution.streets === 2 ? 1 : 0) + Math.min(stage, resolution.streets - 1)));
        setReadout({
          street: progress === 1 ? state === 'fit' ? 'GEOMETRY LOCK' : state === 'residue' ? 'RUNWAY EXHAUSTED' : 'STACK EXHAUSTED EARLY' : streetNames[streetIndex],
          pot: line.pot,
          stack: line.stack,
          state,
        });
        sceneApi.current?.set(Math.min(1, line.pot / targetFinal), resolution.stack ? line.stack / resolution.stack : 0, Math.min(stage, resolution.streets - 1), state, resolution.streets);
      }
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [pot, reducedMotion, resolution, stack, streets]);

  return (
    <div className={`stackoff-scene ${compact ? 'stackoff-scene--compact' : ''} is-${readout.state}`} ref={hostRef} data-testid="stackoff-3d">
      {!fallback && <canvas ref={canvasRef} aria-label="Interactive three-dimensional stackoff line. Drag to rotate." />}
      {fallback && (
        <div className="scene-fallback" data-testid="webgl-fallback">
          <div className="fallback-stack" style={{ '--remaining': `${Math.max(0.04, readout.stack / Math.max(stack, 1)) * 100}%` } as React.CSSProperties} />
          <div className="fallback-runway">{Array.from({ length: streets }, (_, index) => <i key={index} className={index <= (readout.street === 'LINE ARMED' ? -1 : streets) ? 'active' : ''} />)}</div>
          <div className="fallback-pot" style={{ '--growth': `${Math.min(100, readout.pot / (pot + stack * 2) * 100)}%` } as React.CSSProperties} />
        </div>
      )}
      <div className="scene-vignette" />
      <div className="scene-readout scene-readout--stack"><span>EFFECTIVE</span><strong>{readout.stack.toFixed(1)}<small>bb</small></strong></div>
      <div className="scene-readout scene-readout--pot"><span>LIVE POT</span><strong>{readout.pot.toFixed(1)}<small>bb</small></strong></div>
      <div className="scene-status" aria-live="polite"><i />{readout.street}</div>
      <div className="scene-drag-hint" aria-hidden="true">DRAG TO INSPECT</div>
    </div>
  );
}
