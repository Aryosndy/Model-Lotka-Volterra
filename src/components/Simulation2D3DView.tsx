import React, { useEffect, useRef, useState } from 'react';
import {
  AcademicDataset,
  ClassicLVParams,
  EquilibriumAnalysis,
  clamp,
  computeLVDerivatives,
  project3DPoint,
} from '../utils/lotkaVolterra';

interface Simulation2D3DViewProps {
  dataset: AcademicDataset;
  params: ClassicLVParams;
  sim: {
    t: number[];
    prey: number[];
    predator: number[];
    maxPrey: number;
    minPrey: number;
    maxPred: number;
    minPred: number;
  };
  eq: EquilibriumAnalysis;
  playIndex: number;
  isPlaying: boolean;
  onSelectInitialState: (x0: number, y0: number) => void;
}

type SimDimensionMode = '3d-helix' | '2d-arena' | '2d-wave' | '2d-phase';

interface ArenaParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  role: 'prey' | 'predator';
  energy: number;
}

export default function Simulation2D3DView({
  dataset,
  params,
  sim,
  eq,
  playIndex,
  isPlaying,
  onSelectInitialState,
}: Simulation2D3DViewProps) {
  const [mode, setMode] = useState<SimDimensionMode>('3d-helix');
  const [yaw, setYaw] = useState<number>(0.68);
  const [pitch, setPitch] = useState<number>(0.38);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [zAxisMode, setZAxisMode] = useState<'time' | 'energy'>('time');

  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);
  const canvas2DArenaRef = useRef<HTMLCanvasElement | null>(null);
  const canvas2DWaveRef = useRef<HTMLCanvasElement | null>(null);
  const canvas2DPhaseRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });
  const particlesRef = useRef<ArenaParticle[]>([]);

  const safeIdx = Math.min(playIndex, sim.t.length - 1);
  const currentPrey = sim.prey[safeIdx] ?? params.x0;
  const currentPredator = sim.predator[safeIdx] ?? params.y0;
  const currentTime = sim.t[safeIdx] ?? 0;

  // Auto-rotate 3D view gently when active
  useEffect(() => {
    if (mode !== '3d-helix' || !autoRotate) return;
    const id = window.setInterval(() => {
      if (!dragRef.current.active) {
        setYaw((prev) => prev + 0.012);
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [mode, autoRotate]);

  // 1. Render 3D Phase-Space Trajectory & Time Helix
  useEffect(() => {
    if (mode !== '3d-helix') return;
    const canvas = canvas3DRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 720;
    const H = canvas.clientHeight || 420;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#091910');
    grad.addColorStop(1, '#122c1d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const cx = W * 0.5;
    const cy = H * 0.54;
    const scale = Math.min(W, H) * 0.31;

    const maxX = Math.max(sim.maxPrey * 1.15, eq.coexistence[0] * 1.4, 20);
    const maxY = Math.max(sim.maxPred * 1.15, eq.coexistence[1] * 1.4, 20);
    const maxT = Math.max(sim.t[sim.t.length - 1] || 40, 1);

    // Draw 3D bounding cube wireframe (-1..1)
    const corners: [number, number, number][] = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ];
    const edges: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];

    const projCorners = corners.map(([nx, ny, nz]) =>
      project3DPoint(nx, ny, nz, yaw, pitch, cx, cy, scale)
    );

    ctx.strokeStyle = 'rgba(198, 243, 92, 0.22)';
    ctx.lineWidth = 1;
    edges.forEach(([i, j]) => {
      ctx.beginPath();
      ctx.moveTo(projCorners[i].x, projCorners[i].y);
      ctx.lineTo(projCorners[j].x, projCorners[j].y);
      ctx.stroke();
    });

    // Axis Labels
    ctx.fillStyle = '#c6f35c';
    ctx.font = '600 10.5px "JetBrains Mono", monospace';
    const xAxisEnd = project3DPoint(1.12, -1, -1, yaw, pitch, cx, cy, scale);
    const yAxisEnd = project3DPoint(-1, 1.12, -1, yaw, pitch, cx, cy, scale);
    const zAxisEnd = project3DPoint(-1, -1, 1.12, yaw, pitch, cx, cy, scale);
    ctx.fillText(
      `${dataset.preyEmoji} X(t) [0..${maxX.toFixed(0)}]`,
      xAxisEnd.x - 36,
      xAxisEnd.y
    );
    ctx.fillText(
      `${dataset.predatorEmoji} Y(t) [0..${maxY.toFixed(0)}]`,
      yAxisEnd.x - 40,
      yAxisEnd.y
    );
    ctx.fillText(
      zAxisMode === 'time'
        ? `WAKTU t [0..${maxT} ${dataset.timeUnit}]`
        : 'POTENSIAL HAMILTONIAN H(x,y)',
      zAxisEnd.x - 45,
      zAxisEnd.y
    );

    // Draw Equilibrium Core Line in 3D space
    if (eq.isValidCoexistence) {
      const eqNx = (eq.coexistence[0] / maxX) * 2 - 1;
      const eqNy = (eq.coexistence[1] / maxY) * 2 - 1;
      const pStart = project3DPoint(eqNx, eqNy, -1, yaw, pitch, cx, cy, scale);
      const pEnd = project3DPoint(eqNx, eqNy, 1, yaw, pitch, cx, cy, scale);
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.68)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();
      ctx.restore();
    }

    // Full 3D Trajectory Helix
    ctx.beginPath();
    for (let i = 0; i < sim.t.length; i++) {
      const nx = (sim.prey[i] / maxX) * 2 - 1;
      const ny = (sim.predator[i] / maxY) * 2 - 1;
      const nz =
        zAxisMode === 'time'
          ? (sim.t[i] / maxT) * 2 - 1
          : Math.cos((sim.t[i] / maxT) * Math.PI * 4) * 0.75;
      const pt = project3DPoint(nx, ny, nz, yaw, pitch, cx, cy, scale);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = 'rgba(198, 243, 92, 0.35)';
    ctx.lineWidth = 1.75;
    ctx.stroke();

    // Active Trajectory up to playIndex
    ctx.beginPath();
    for (let i = 0; i <= safeIdx; i++) {
      const nx = (sim.prey[i] / maxX) * 2 - 1;
      const ny = (sim.predator[i] / maxY) * 2 - 1;
      const nz =
        zAxisMode === 'time'
          ? (sim.t[i] / maxT) * 2 - 1
          : Math.cos((sim.t[i] / maxT) * Math.PI * 4) * 0.75;
      const pt = project3DPoint(nx, ny, nz, yaw, pitch, cx, cy, scale);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = '#c6f35c';
    ctx.lineWidth = 3.2;
    ctx.stroke();

    // Current 3D State Sphere
    const curNx = (currentPrey / maxX) * 2 - 1;
    const curNy = (currentPredator / maxY) * 2 - 1;
    const curNz =
      zAxisMode === 'time'
        ? (currentTime / maxT) * 2 - 1
        : Math.cos((currentTime / maxT) * Math.PI * 4) * 0.75;
    const curPt = project3DPoint(curNx, curNy, curNz, yaw, pitch, cx, cy, scale);

    ctx.beginPath();
    ctx.arc(curPt.x, curPt.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#c6f35c';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }, [
    mode,
    yaw,
    pitch,
    zAxisMode,
    sim,
    eq,
    safeIdx,
    currentPrey,
    currentPredator,
    currentTime,
    dataset.timeUnit,
    dataset.preyEmoji,
    dataset.predatorEmoji,
  ]);

  // 2. Render 2D Agent-Based Particle Interaction Arena
  useEffect(() => {
    if (mode !== '2d-arena') return;
    const canvas = canvas2DArenaRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.clientWidth || 720;
    const H = canvas.clientHeight || 420;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const targetPreyCount = Math.max(4, Math.min(48, Math.round(currentPrey * 0.85)));
    const targetPredCount = Math.max(2, Math.min(28, Math.round(currentPredator * 0.85)));

    const curParticles = particlesRef.current;
    const curPrey = curParticles.filter((p) => p.role === 'prey');
    const curPred = curParticles.filter((p) => p.role === 'predator');

    while (curPrey.length < targetPreyCount) {
      curPrey.push({
        x: Math.random() * (W - 40) + 20,
        y: Math.random() * (H - 40) + 20,
        vx: (Math.random() - 0.5) * 2.2,
        vy: (Math.random() - 0.5) * 2.2,
        role: 'prey',
        energy: 1,
      });
    }
    while (curPred.length < targetPredCount) {
      curPred.push({
        x: Math.random() * (W - 40) + 20,
        y: Math.random() * (H - 40) + 20,
        vx: (Math.random() - 0.5) * 2.6,
        vy: (Math.random() - 0.5) * 2.6,
        role: 'predator',
        energy: 1,
      });
    }

    particlesRef.current = [
      ...curPrey.slice(0, targetPreyCount),
      ...curPred.slice(0, targetPredCount),
    ];

    let animId = 0;
    const renderArena = () => {
      ctx.fillStyle = '#0c2015';
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(198, 243, 92, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 48) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 48) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      const pts = particlesRef.current;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.role === 'predator') {
          let nearestDist = Infinity;
          let nearestPrey: ArenaParticle | null = null;
          for (let j = 0; j < pts.length; j++) {
            if (pts[j].role === 'prey') {
              const dx = pts[j].x - p.x;
              const dy = pts[j].y - p.y;
              const d = Math.hypot(dx, dy);
              if (d < nearestDist) {
                nearestDist = d;
                nearestPrey = pts[j];
              }
            }
          }
          if (nearestPrey && nearestDist < 140) {
            p.vx += ((nearestPrey.x - p.x) / (nearestDist + 1)) * 0.12;
            p.vy += ((nearestPrey.y - p.y) / (nearestDist + 1)) * 0.12;
            if (nearestDist < 55) {
              ctx.strokeStyle = 'rgba(249, 115, 22, 0.48)';
              ctx.lineWidth = 1.3;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(nearestPrey.x, nearestPrey.y);
              ctx.stroke();
            }
          }
        }

        const speed = Math.hypot(p.vx, p.vy);
        const maxSpeed = p.role === 'predator' ? 2.4 : 1.9;
        if (speed > maxSpeed) {
          p.vx = (p.vx / speed) * maxSpeed;
          p.vy = (p.vy / speed) * maxSpeed;
        }

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 18 || p.x > W - 18) p.vx *= -1;
        if (p.y < 18 || p.y > H - 18) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.role === 'predator' ? 9 : 7, 0, Math.PI * 2);
        ctx.fillStyle = p.role === 'predator' ? dataset.predatorColor : dataset.preyColor;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          p.role === 'predator' ? dataset.predatorEmoji : dataset.preyEmoji,
          p.x,
          p.y
        );
      }

      if (isPlaying) {
        animId = window.requestAnimationFrame(renderArena);
      }
    };

    renderArena();
    return () => {
      if (animId) window.cancelAnimationFrame(animId);
    };
  }, [
    mode,
    currentPrey,
    currentPredator,
    isPlaying,
    dataset.preyColor,
    dataset.predatorColor,
    dataset.preyEmoji,
    dataset.predatorEmoji,
  ]);

  // 3. Render 2D Reaction-Diffusion / Thermal-Wave Spiral Field (Ideal for Natural Phenomena, ENSO, Volcano, Chemical BZ)
  useEffect(() => {
    if (mode !== '2d-wave') return;
    const canvas = canvas2DWaveRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.clientWidth || 720;
    const H = canvas.clientHeight || 420;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#07140d';
    ctx.fillRect(0, 0, W, H);

    const cols = 38;
    const rows = 22;
    const cellW = W / cols;
    const cellH = H / rows;

    const normX = currentPrey / Math.max(sim.maxPrey, 1);
    const normY = currentPredator / Math.max(sim.maxPred, 1);
    const phase = currentTime * 0.65;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = (c - cols / 2) / (cols / 2);
        const dy = (r - rows / 2) / (rows / 2);
        const radius = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);

        const spiralWave = Math.sin(radius * 9 - phase * 2.2 + angle * 2);
        const xDominance = clamp(0.5 + 0.5 * spiralWave * normX, 0, 1);
        const yDominance = clamp(0.5 - 0.5 * spiralWave * normY, 0, 1);

        const px = c * cellW + cellW * 0.5;
        const py = r * cellH + cellH * 0.5;

        ctx.beginPath();
        ctx.arc(
          px,
          py,
          Math.max(3, Math.min(cellW, cellH) * 0.38 * (0.55 + 0.45 * xDominance)),
          0,
          Math.PI * 2
        );
        ctx.fillStyle =
          spiralWave > 0 ? dataset.preyColor : dataset.predatorColor;
        ctx.globalAlpha = 0.25 + 0.65 * Math.max(xDominance, yDominance);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Overlay Wave Legend
    ctx.fillStyle = 'rgba(16, 41, 26, 0.88)';
    ctx.fillRect(14, H - 46, 440, 32);
    ctx.fillStyle = '#c6f35c';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillText(
      `MEDAN GELOMBANG SPASIAL: ${dataset.preyEmoji} X=${currentPrey.toFixed(1)} vs ${dataset.predatorEmoji} Y=${currentPredator.toFixed(1)}`,
      24,
      H - 26
    );
  }, [
    mode,
    currentPrey,
    currentPredator,
    currentTime,
    sim.maxPrey,
    sim.maxPred,
    dataset.preyColor,
    dataset.predatorColor,
    dataset.preyEmoji,
    dataset.predatorEmoji,
  ]);

  // 4. Render 2D Phase-Space Portrait + Nullclines + Direction Field
  useEffect(() => {
    if (mode !== '2d-phase') return;
    const canvas = canvas2DPhaseRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 720;
    const H = canvas.clientHeight || 420;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { l: 56, r: 26, t: 24, b: 44 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const maxX = Math.max(sim.maxPrey * 1.2, eq.coexistence[0] * 1.5, 25);
    const maxY = Math.max(sim.maxPred * 1.2, eq.coexistence[1] * 1.5, 25);

    const toX = (x: number) => pad.l + (x / maxX) * pw;
    const toY = (y: number) => pad.t + ph - (y / maxY) * ph;

    // Direction Vector Field
    const cols = 16;
    const rows = 11;
    ctx.strokeStyle = 'rgba(16, 41, 26, 0.22)';
    ctx.lineWidth = 1.1;
    for (let c = 1; c <= cols; c++) {
      for (let r = 1; r <= rows; r++) {
        const vxVal = (c / (cols + 1)) * maxX;
        const vyVal = (r / (rows + 1)) * maxY;
        const [dx, dy] = computeLVDerivatives(vxVal, vyVal, params);
        const mag = Math.hypot(dx, dy) || 1;
        const ux = (dx / mag) * 12;
        const uy = (-dy / mag) * 12;
        const sx = toX(vxVal);
        const sy = toY(vyVal);
        ctx.beginPath();
        ctx.moveTo(sx - ux * 0.5, sy - uy * 0.5);
        ctx.lineTo(sx + ux * 0.5, sy + uy * 0.5);
        ctx.stroke();
      }
    }

    // Nullclines
    if (eq.isValidCoexistence) {
      const [xStar, yStar] = eq.coexistence;
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = dataset.predatorColor;
      ctx.beginPath();
      ctx.moveTo(toX(xStar), pad.t);
      ctx.lineTo(toX(xStar), pad.t + ph);
      ctx.stroke();

      ctx.strokeStyle = dataset.preyColor;
      ctx.beginPath();
      ctx.moveTo(pad.l, toY(yStar));
      ctx.lineTo(pad.l + pw, toY(yStar));
      ctx.stroke();
      ctx.restore();
    }

    // Trajectory Orbit
    ctx.beginPath();
    for (let i = 0; i < sim.prey.length; i++) {
      const px = toX(sim.prey[i]);
      const py = toY(sim.predator[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#10291a';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Current state point
    ctx.beginPath();
    ctx.arc(toX(currentPrey), toY(currentPredator), 7, 0, Math.PI * 2);
    ctx.fillStyle = '#c6f35c';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#10291a';
    ctx.stroke();

    ctx.fillStyle = '#10291a';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillText(
      `Sumbu-X: ${dataset.xRoleLabel} — Klik pada bidang fase untuk mengubah kondisi awal (x₀, y₀)`,
      pad.l + 10,
      H - 12
    );
  }, [
    mode,
    sim,
    eq,
    params,
    currentPrey,
    currentPredator,
    dataset.preyColor,
    dataset.predatorColor,
    dataset.xRoleLabel,
  ]);

  return (
    <div className="lv-card" style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        <div>
          <span className="chip" style={{ marginBottom: '6px' }}>
            VISUALISASI MULTI-DIMENSI 2D &amp; 3D INTERAKTIF
          </span>
          <h3 style={{ fontSize: '16.5px', fontWeight: 600 }}>
            {mode === '3d-helix'
              ? `Ruang Fase 3D Heliks (X, Y, t) — ${dataset.shortName}`
              : mode === '2d-arena'
              ? `Arena Interaksi Partikel / Agen 2D — ${dataset.shortName}`
              : mode === '2d-wave'
              ? `Medan Gelombang Spasial Reaksi–Difusi 2D — ${dataset.shortName}`
              : `Potret Fase 2D, Isoklin Nol & Medan Vektor — ${dataset.shortName}`}
          </h3>
        </div>

        {/* 4-Mode Switcher */}
        <div
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            background: '#eef2ee',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid #d5dfd7',
            gap: '2px',
          }}
        >
          {[
            { id: '3d-helix' as const, label: '3D Heliks Fase (x,y,t)' },
            { id: '2d-arena' as const, label: '2D Arena Partikel' },
            { id: '2d-wave' as const, label: '2D Gelombang Spasial' },
            { id: '2d-phase' as const, label: '2D Potret Fase (x,y)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                background: mode === tab.id ? '#10291a' : 'transparent',
                color: mode === tab.id ? '#c6f35c' : '#10291a',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode-Specific Controls */}
      {mode === '3d-helix' && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center',
            marginBottom: '10px',
            fontSize: '12px',
          }}
        >
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            className="lv-btn"
            style={{ padding: '4px 10px', fontSize: '11.5px' }}
          >
            {autoRotate ? '⏸ Hentikan Rotasi 3D' : '🔄 Putar Otomatis 3D'}
          </button>
          <button
            type="button"
            onClick={() =>
              setZAxisMode((m) => (m === 'time' ? 'energy' : 'time'))
            }
            className="lv-btn"
            style={{ padding: '4px 10px', fontSize: '11.5px' }}
          >
            Sumbu-Z: {zAxisMode === 'time' ? 'Waktu (t)' : 'Potensial Energi H(x,y)'}
          </button>
          <span style={{ color: '#425949', fontSize: '11.5px' }}>
            Geser (drag) kanvas untuk memutar sudut pandang 3D (Yaw &amp; Pitch).
          </span>
        </div>
      )}

      {/* Canvas Viewport */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '410px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #cbd7ce',
        }}
      >
        {mode === '3d-helix' && (
          <canvas
            ref={canvas3DRef}
            style={{ width: '100%', height: '100%', cursor: 'grab', display: 'block' }}
            onPointerDown={(e) => {
              dragRef.current = {
                active: true,
                lastX: e.clientX,
                lastY: e.clientY,
              };
            }}
            onPointerMove={(e) => {
              if (!dragRef.current.active) return;
              const dx = e.clientX - dragRef.current.lastX;
              const dy = e.clientY - dragRef.current.lastY;
              dragRef.current.lastX = e.clientX;
              dragRef.current.lastY = e.clientY;
              setYaw((prev) => prev + dx * 0.01);
              setPitch((prev) =>
                Math.max(-1.1, Math.min(1.1, prev + dy * 0.01))
              );
            }}
            onPointerUp={() => {
              dragRef.current.active = false;
            }}
            onPointerLeave={() => {
              dragRef.current.active = false;
            }}
          />
        )}

        {mode === '2d-arena' && (
          <canvas
            ref={canvas2DArenaRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        )}

        {mode === '2d-wave' && (
          <canvas
            ref={canvas2DWaveRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        )}

        {mode === '2d-phase' && (
          <canvas
            ref={canvas2DPhaseRef}
            style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pad = { l: 56, r: 26, t: 24, b: 44 };
              const pw = rect.width - pad.l - pad.r;
              const ph = rect.height - pad.t - pad.b;
              const maxX = Math.max(sim.maxPrey * 1.2, eq.coexistence[0] * 1.5, 25);
              const maxY = Math.max(sim.maxPred * 1.2, eq.coexistence[1] * 1.5, 25);
              const nx = Math.max(
                1,
                Math.min(maxX, ((e.clientX - rect.left - pad.l) / pw) * maxX)
              );
              const ny = Math.max(
                1,
                Math.min(maxY, ((rect.height - (e.clientY - rect.top) - pad.b) / ph) * maxY)
              );
              onSelectInitialState(+nx.toFixed(1), +ny.toFixed(1));
            }}
          />
        )}
      </div>
    </div>
  );
}
