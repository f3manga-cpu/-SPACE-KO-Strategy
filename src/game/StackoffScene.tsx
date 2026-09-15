import { useEffect, useMemo, useRef, useState } from 'react';
import { geometricBetFraction, sprFromPotStack, streetScheduleForFraction } from '../core/geometry';

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
  stage: number;
  state: 'ready' | 'running' | 'fit' | 'residue' | 'early';
}

const streetNames = ['FLOP', 'TURN', 'RIVER'];

const streetName = (streets: 2 | 3, index: number) =>
  streetNames[(streets === 2 ? 1 : 0) + index] ?? `STREET ${index + 1}`;

const formatBb = (value: number) => value.toFixed(1);
const formatPercent = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
};

export function StackoffScene({ pot, stack, streets, resolution, reducedMotion = false, compact = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneApi = useRef<{ set: (potRatio: number, stackRatio: number, gate: number, state: Readout['state'], streetCount: number) => void; dispose: () => void } | null>(null);
  const [fallback, setFallback] = useState(false);
  const [readout, setReadout] = useState<Readout>({ street: 'LINE ARMED', pot, stack, stage: 0, state: 'ready' });

  const line = useMemo(() => {
    if (!resolution) return null;
    const targetFraction = geometricBetFraction(
      sprFromPotStack(resolution.pot, resolution.stack),
      resolution.streets,
    );
    const submittedFraction = Number.isFinite(resolution.selectedPercent)
      ? Math.max(0, resolution.selectedPercent / 100)
      : 0;
    const playbackFraction = resolution.correct ? targetFraction : submittedFraction;
    return {
      targetPercent: targetFraction * 100,
      playbackPercent: playbackFraction * 100,
      schedule: streetScheduleForFraction(
        resolution.pot,
        resolution.stack,
        resolution.streets,
        playbackFraction,
      ),
    };
  }, [resolution]);

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
      setReadout({ street: 'LINE ARMED', pot, stack, stage: 0, state: 'ready' });
      sceneApi.current?.set(Math.min(1, pot / (pot + stack * 2)), 1, -1, 'ready', streets);
      return;
    }
    if (!line) return;
    const duration = reducedMotion ? 120 : 1_650;
    const start = performance.now();
    let previousStage = -1;
    let animationFrame = 0;
    const targetFinal = resolution.pot + resolution.stack * 2;
    const finalState: Readout['state'] = resolution.correct
      ? 'fit'
      : resolution.selectedPercent < line.targetPercent
        ? 'residue'
        : 'early';
    const animate = (time: number) => {
      const progress = Math.min(1, (time - start) / duration);
      const stage = Math.min(resolution.streets, Math.floor(progress * resolution.streets + 0.001));
      if (stage !== previousStage || progress === 1) {
        previousStage = stage;
        const point = stage > 0 ? line.schedule[stage - 1] : undefined;
        const currentPot = point?.potAfterCall ?? resolution.pot;
        const currentStack = point?.stackRemaining ?? resolution.stack;
        const state: Readout['state'] = progress < 1 ? 'running' : finalState;
        const streetIndex = Math.max(0, Math.min(2, (resolution.streets === 2 ? 1 : 0) + Math.min(stage, resolution.streets - 1)));
        setReadout({
          street: progress === 1 ? state === 'fit' ? 'GEOMETRY LOCK' : state === 'residue' ? 'RUNWAY EXHAUSTED' : 'STACK EXHAUSTED EARLY' : streetNames[streetIndex],
          pot: currentPot,
          stack: currentStack,
          stage,
          state,
        });
        sceneApi.current?.set(Math.min(1, currentPot / targetFinal), resolution.stack ? currentStack / resolution.stack : 0, Math.min(stage, resolution.streets - 1), state, resolution.streets);
      }
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [line, pot, reducedMotion, resolution, stack, streets]);

  return (
    <div className={`stackoff-scene ${compact ? 'stackoff-scene--compact' : ''} ${line ? 'has-schedule' : ''} is-${readout.state}`} ref={hostRef} data-testid="stackoff-3d">
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
      {resolution && line && (
        <div className="scene-action-hud" data-testid="stackoff-schedule">
          <div className="scene-action-hud__heading">
            <span>{resolution.correct ? 'GEOMETRIC LINE' : 'YOUR LINE // CONSEQUENCE'}</span>
            <strong>{formatPercent(line.playbackPercent)}% POT</strong>
            <em data-testid="stackoff-target">GEOMETRIC TARGET {formatPercent(line.targetPercent)}%</em>
          </div>
          <div className={`scene-street-grid scene-street-grid--${resolution.streets}`}>
            {line.schedule.map((point, index) => {
              const phase = readout.stage > index ? 'is-complete' : readout.stage === index ? 'is-active' : 'is-pending';
              const name = streetName(resolution.streets, index);
              return (
                <article
                  className={`scene-street-card ${phase}`}
                  data-testid="stackoff-street"
                  data-street={name.toLowerCase()}
                  key={point.streetIndex}
                  aria-label={`${name}: pot before ${formatBb(point.potBefore)} big blinds, ${formatPercent(point.betPercent)} percent pot, hero bets ${formatBb(point.heroBetBb)} big blinds, villain calls ${formatBb(point.villainCallBb)} big blinds, pot after call ${formatBb(point.potAfterCall)} big blinds, ${formatBb(point.stackRemaining)} big blinds remaining`}
                >
                  <header><span>0{point.streetIndex}</span><strong>{name}</strong><em>{formatPercent(line.playbackPercent)}%</em></header>
                  <div className="scene-pot-flow">
                    <span><small>POT BEFORE</small><b>{formatBb(point.potBefore)}</b></span>
                    <i>→</i>
                    <span><small>POT AFTER CALL</small><b>{formatBb(point.potAfterCall)}</b></span>
                  </div>
                  <div className="scene-contributions">
                    <span><small>HERO BET</small><b>{formatBb(point.heroBetBb)}<i>bb</i></b></span>
                    <span><small>VILLAIN CALL</small><b>{formatBb(point.villainCallBb)}<i>bb</i></b></span>
                  </div>
                  <footer><span>STACK REMAINING</span><strong>{formatBb(point.stackRemaining)}<small>bb</small></strong></footer>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
