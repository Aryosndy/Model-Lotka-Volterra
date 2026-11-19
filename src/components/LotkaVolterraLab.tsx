import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACADEMIC_DATASETS,
  AcademicDataset,
  ClassicLVParams,
  DOMAIN_CATEGORIES,
  DomainCategory,
  HERO_BANNER_IMAGE,
  TrophicGlobalParams,
  TrophicSpecies,
  analyzeLVEquilibrium,
  evaluateEmpiricalFit,
  simulateClassicLV,
  simulateTrophicChain,
} from '../utils/lotkaVolterra';
import GoogleMapEcosystemSim from './GoogleMapEcosystemSim';
import JournalPublicationOutputs from './JournalPublicationOutputs';
import Simulation2D3DView from './Simulation2D3DView';

const CASCADE_PRESETS: Record<
  string,
  {
    category: string;
    label: string;
    subtitle: string;
    species: TrophicSpecies[];
  }
> = {
  pangandaran_seagrass: {
    category: 'JURNAL EJABF 2025 · PANGANDARAN MPA',
    label: '🌿 Kaskade Padang Lamun & Bulu Babi (Pangandaran MPA)',
    subtitle:
      'Nutrisi Pesisir → Lamun (Cymodocea rotundata) → Bulu Babi (Echinometra lucunter) → Ikan Karnivora Terumbu / Triggerfish',
    species: [
      { name: 'Lamun (Cymodocea rotundata)', emoji: '🌿', color: '#16a34a', N0: 153, r: 0.85, K: 380, h: 0 },
      { name: 'Epifit & Mikroalga Lamun', emoji: '🦠', color: '#0d9488', N0: 95, a: 0.76, H: 60, e: 0.36, m: 0.14, h: 0 },
      { name: 'Bulu Babi (Echinometra lucunter)', emoji: '🟣', color: '#7e22ce', N0: 24, a: 0.68, H: 52, e: 0.34, m: 0.12, h: 0 },
      { name: 'Ikan Predator Bulu Babi', emoji: '🐠', color: '#dc2626', N0: 16, a: 0.54, H: 45, e: 0.28, m: 0.1, h: 0 },
    ],
  },
  enso_fire_cascade: {
    category: 'FENOMENA ALAM & IKLIM',
    label: '🔥 Kaskade Iklim El Niño & Kebakaran Gambut',
    subtitle:
      'Anomali Panas Laut (ENSO) → Defisit Kelembapan Gambut → Akumulasi Bahan Bakar Kering → Titik Api & Kabut Asap',
    species: [
      { name: 'Energi Kolam Hangat ENSO', emoji: '🌊', color: '#0284c7', N0: 210, r: 0.82, K: 380, h: 0 },
      { name: 'Defisit Air Tanah Gambut', emoji: '☀️', color: '#d97706', N0: 105, a: 0.76, H: 62, e: 0.38, m: 0.14, h: 0 },
      { name: 'Biomassa Serasah Kering', emoji: '🌲', color: '#15803d', N0: 56, a: 0.68, H: 54, e: 0.34, m: 0.12, h: 0 },
      { name: 'Intensitas Titik Api & Asap', emoji: '🔥', color: '#dc2626', N0: 24, a: 0.56, H: 46, e: 0.3, m: 0.1, h: 0 },
    ],
  },
  volcano_cascade: {
    category: 'GEOFISIKA & VULKANOLOGI',
    label: '🌋 Kaskade Tekanan Magma & Erupsi Kaldera',
    subtitle:
      'Suplai Magma Mantel Dalam → Tekanan Gas Kantung Magma → Erupsi Kepundan → Sebaran Abu & Aerosol Sulfat',
    species: [
      { name: 'Fluks Magma Mantel Dalam', emoji: '🪨', color: '#b45309', N0: 220, r: 0.78, K: 390, h: 0 },
      { name: 'Tekanan Volatil Kantung Magma', emoji: '🌡️', color: '#ea580c', N0: 98, a: 0.75, H: 60, e: 0.36, m: 0.14, h: 0 },
      { name: 'Kolom Erupsi Eksplosif', emoji: '🌋', color: '#dc2626', N0: 46, a: 0.64, H: 52, e: 0.32, m: 0.12, h: 0 },
      { name: 'Aerosol Sulfat Stratosfer', emoji: '☁️', color: '#6366f1', N0: 20, a: 0.52, H: 45, e: 0.28, m: 0.09, h: 0 },
    ],
  },
  epidemic_cascade: {
    category: 'EPIDEMIOLOGI & KIMIA',
    label: '🧪 Kaskade Gelombang Epidemi & Respons Imunitas',
    subtitle:
      'Mobilitas & Kepadatan Urban → Populasi Rentan S(t) → Infeksius Aktif I(t) → Imunitas Komunitas & Antibodi',
    species: [
      { name: 'Kepadatan Kontak Urban', emoji: '🏙️', color: '#0284c7', N0: 200, r: 0.8, K: 370, h: 0 },
      { name: 'Populasi Rentan (Susceptible)', emoji: '🛡️', color: '#0d9488', N0: 92, a: 0.74, H: 58, e: 0.36, m: 0.14, h: 0 },
      { name: 'Kasus Infeksius Aktif', emoji: '🦠', color: '#e11d48', N0: 44, a: 0.66, H: 50, e: 0.33, m: 0.12, h: 0 },
      { name: 'Respons Imunitas / Mitigasi', emoji: '💉', color: '#7c3aed', N0: 19, a: 0.54, H: 44, e: 0.29, m: 0.1, h: 0 },
    ],
  },
  pelagic: {
    category: 'EKOSISTEM LAUT',
    label: '🐟 Ekosistem Laut Pelagis Indonesia',
    subtitle:
      'Fitoplankton → Zooplankton → Sardinella lemuru → Tuna Sirip Kuning (Laut Banda & Raja Ampat)',
    species: [
      { name: 'Fitoplankton', emoji: '🦠', color: '#108548', N0: 190, r: 0.85, K: 360, h: 0 },
      { name: 'Zooplankton', emoji: '🦐', color: '#0284c7', N0: 95, a: 0.78, H: 65, e: 0.36, m: 0.14, h: 0 },
      { name: 'Ikan Pelagis (Sardinella)', emoji: '🐟', color: '#d97706', N0: 48, a: 0.65, H: 55, e: 0.32, m: 0.12, h: 0 },
      { name: 'Tuna Sirip Kuning', emoji: '🦈', color: '#dc2626', N0: 20, a: 0.52, H: 45, e: 0.28, m: 0.1, h: 0 },
    ],
  },
};

export default function LotkaVolterraLab() {
  const [selectedCategory, setSelectedCategory] =
    useState<DomainCategory>('all');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(
    ACADEMIC_DATASETS[0].id
  );

  const filteredDatasets = useMemo(() => {
    if (selectedCategory === 'all') return ACADEMIC_DATASETS;
    return ACADEMIC_DATASETS.filter(
      (d) => d.domainCategory === selectedCategory
    );
  }, [selectedCategory]);

  const activeDataset: AcademicDataset = useMemo(
    () =>
      ACADEMIC_DATASETS.find((d) => d.id === selectedDatasetId) ||
      ACADEMIC_DATASETS[0],
    [selectedDatasetId]
  );

  const [params, setParams] = useState<ClassicLVParams>(
    ACADEMIC_DATASETS[0].calibratedParams
  );
  const [duration, setDuration] = useState<number>(
    ACADEMIC_DATASETS[0].duration
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playIndex, setPlayIndex] = useState<number>(0);

  // Multi-level cascade state
  const [activeBiomeKey, setActiveBiomeKey] = useState<string>(
    'pangandaran_seagrass'
  );
  const [trophicSpecies, setTrophicSpecies] = useState<TrophicSpecies[]>(
    CASCADE_PRESETS.pangandaran_seagrass.species
  );
  const [trophicGlobal, setTrophicGlobal] = useState<TrophicGlobalParams>({
    imm: 0.4,
    T: 120,
    log: false,
    sa: 0.15,
    sp: 50,
    nz: 0.02,
    seed: 42,
  });

  const timeSeriesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trophicCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleSelectDataset = (id: string) => {
    const found = ACADEMIC_DATASETS.find((d) => d.id === id);
    if (!found) return;
    setSelectedDatasetId(found.id);
    setParams({ ...found.calibratedParams });
    setDuration(found.duration);
    setPlayIndex(0);
  };

  const handleCategoryChange = (cat: DomainCategory) => {
    setSelectedCategory(cat);
    if (cat !== 'all') {
      const firstInCat = ACADEMIC_DATASETS.find(
        (d) => d.domainCategory === cat
      );
      if (firstInCat && firstInCat.id !== selectedDatasetId) {
        handleSelectDataset(firstInCat.id);
      }
    }
  };

  // Run RK4 Lotka-Volterra Solver
  const sim = useMemo(
    () => simulateClassicLV(params, duration, 0.025),
    [params, duration]
  );

  const eq = useMemo(() => analyzeLVEquilibrium(params), [params]);

  const fit = useMemo(
    () => evaluateEmpiricalFit(sim, activeDataset.data),
    [sim, activeDataset]
  );

  // Advance playhead for synchronized 2D, 3D, and Google Maps simulation
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setPlayIndex((prev) => (prev + 2 >= sim.t.length ? 0 : prev + 2));
    }, 85);
    return () => window.clearInterval(timer);
  }, [isPlaying, sim.t.length]);

  const safeIdx = Math.min(playIndex, sim.t.length - 1);
  const currentPrey = sim.prey[safeIdx] ?? params.x0;
  const currentPredator = sim.predator[safeIdx] ?? params.y0;
  const currentTime = sim.t[safeIdx] ?? 0;

  // Draw RK4 vs Empirical Time-Series Chart
  useEffect(() => {
    const canvas = timeSeriesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 720;
    const H = canvas.clientHeight || 300;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { l: 54, r: 24, t: 24, b: 40 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const empMax = activeDataset.data.reduce(
      (m, d) => Math.max(m, d.prey, d.predator),
      0
    );
    const maxY = Math.max(sim.maxPrey, sim.maxPred, empMax, 20) * 1.15;
    const maxT = Math.max(duration, 1);

    const toX = (tVal: number) => pad.l + (tVal / maxT) * pw;
    const toY = (yVal: number) => pad.t + ph - (yVal / maxY) * ph;

    // Horizontal grid lines
    ctx.strokeStyle = '#e5ece7';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#526858';
    ctx.font = '500 10.5px "JetBrains Mono", monospace';
    for (let i = 0; i <= 4; i++) {
      const val = (maxY * i) / 4;
      const y = toY(val);
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + pw, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(0), 8, y + 4);
    }

    // X variable RK4 curve
    ctx.beginPath();
    sim.t.forEach((tVal, i) => {
      const x = toX(tVal);
      const y = toY(sim.prey[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = activeDataset.preyColor;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Y variable RK4 curve
    ctx.beginPath();
    sim.t.forEach((tVal, i) => {
      const x = toX(tVal);
      const y = toY(sim.predator[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = activeDataset.predatorColor;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Empirical Journal Data Points
    activeDataset.data.forEach((pt) => {
      if (pt.time > maxT) return;
      const px = toX(pt.time);
      const pyPrey = toY(pt.prey);
      const pyPred = toY(pt.predator);

      ctx.beginPath();
      ctx.arc(px, pyPrey, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = activeDataset.preyColor;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(px, pyPred, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = activeDataset.predatorColor;
      ctx.stroke();
    });

    // Animated Playhead Cursor
    const playX = toX(currentTime);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#10291a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playX, pad.t);
    ctx.lineTo(playX, pad.t + ph);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#10291a';
    ctx.fillText(
      `Waktu (${activeDataset.timeUnit}) — Titik bulat = Observasi Jurnal, Garis tegas = Solusi RK4`,
      pad.l + 10,
      H - 12
    );
  }, [sim, activeDataset, duration, currentTime]);

  // Multi-level cascade simulation
  const trophicSim = useMemo(() => {
    const y0 = trophicSpecies.map((s) => s.N0);
    return simulateTrophicChain(
      y0,
      trophicSpecies,
      trophicSpecies.length,
      trophicGlobal
    );
  }, [trophicSpecies, trophicGlobal]);

  useEffect(() => {
    const canvas = trophicCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 720;
    const H = canvas.clientHeight || 280;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = { l: 52, r: 22, t: 20, b: 36 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const maxBio = Math.max(...trophicSim.mx, 50) * 1.1;
    const maxT = trophicGlobal.T || 120;

    const toX = (tVal: number) => pad.l + (tVal / maxT) * pw;
    const toY = (v: number) => pad.t + ph - (v / maxBio) * ph;

    ctx.strokeStyle = '#e5ece7';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (ph * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + pw, y);
      ctx.stroke();
    }

    trophicSim.C.forEach((curve, idx) => {
      const sp = trophicSpecies[idx];
      if (!sp) return;
      ctx.beginPath();
      trophicSim.t.forEach((tVal, i) => {
        const x = toX(tVal);
        const y = toY(curve[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = sp.color;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    });
  }, [trophicSim, trophicSpecies, trophicGlobal.T]);

  const handleExportCSV = () => {
    const lines = [
      '# SIMULASI MODEL LOTKA-VOLTERRA & SISTEM DINAMIS LINTAS FENOMENA ALAM',
      '# Peneliti / Penyusun: Aryo Sandy Prasetyo',
      '# NPM: 230210240028',
      `# Kategori Domain: ${activeDataset.domainBadge}`,
      `# Dataset Jurnal: ${activeDataset.title}`,
      `# Referensi: ${activeDataset.authors} (${activeDataset.year}) - ${activeDataset.journal}`,
      `# Parameter: alpha=${params.alpha}, beta=${params.beta}, delta=${params.delta}, gamma=${params.gamma}, x0=${params.x0}, y0=${params.y0}`,
      `Waktu,Label_Observasi,${activeDataset.xRoleLabel}_Empiris,${activeDataset.yRoleLabel}_Empiris,${activeDataset.xRoleLabel}_Model_RK4,${activeDataset.yRoleLabel}_Model_RK4`,
    ];

    activeDataset.data.forEach((pt) => {
      let bestIdx = 0;
      let bestDiff = Infinity;
      sim.t.forEach((tVal, idx) => {
        const d = Math.abs(tVal - pt.time);
        if (d < bestDiff) {
          bestDiff = d;
          bestIdx = idx;
        }
      });
      lines.push(
        `${pt.time},${pt.label},${pt.prey.toFixed(2)},${pt.predator.toFixed(
          2
        )},${(sim.prey[bestIdx] ?? 0).toFixed(2)},${(
          sim.predator[bestIdx] ?? 0
        ).toFixed(2)}`
      );
    });

    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LotkaVolterra_AryoSandyPrasetyo_NPM_230210240028_${activeDataset.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f2f5f2', color: '#10291a' }}>
      {/* Top Sticky Scientific Navigation Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(16, 41, 26, 0.96)',
          backdropFilter: 'blur(12px)',
          color: '#f6f7f4',
          borderBottom: '1px solid rgba(198, 243, 92, 0.25)',
          padding: '12px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#c6f35c',
                color: '#10291a',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '15px',
              }}
            >
              LV
            </span>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '15px',
                  letterSpacing: '-0.01em',
                }}
              >
                OmniDynamics Lab — Simulator Lotka-Volterra Jurnal EJABF 2025, Fenomena Alam &amp; Sains
              </div>
              <div
                className="mono"
                style={{
                  fontSize: '10.5px',
                  color: '#c6f35c',
                  letterSpacing: '0.08em',
                }}
              >
                ARYO SANDY PRASETYO · NPM: 230210240028
              </div>
            </div>
          </div>

          <nav
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '7px',
              alignItems: 'center',
            }}
          >
            {[
              { href: '#studi-kasus', label: '1. 10 Studi Kasus' },
              { href: '#output-jurnal', label: '2. Grafik Jurnal (Fig. 2–4)' },
              { href: '#peta-spasial', label: '3. Peta Google Maps' },
              { href: '#simulasi-2d-3d', label: '4. Simulasi 2D & 3D' },
              { href: '#rantai-makanan', label: '5. Kaskade Sistem' },
              { href: '#data-jurnal', label: '6. Tabel & CSV' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="mono"
                style={{
                  fontSize: '10.5px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#f6f7f4',
                  border: '1px solid rgba(255,255,255,0.14)',
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main
        style={{
          maxWidth: '1380px',
          margin: '0 auto',
          padding: '24px 20px 64px',
          display: 'grid',
          gap: '26px',
        }}
      >
        {/* 1. HERO BANNER & MULTI-DOMAIN PHENOMENON EXPLORER (10 CASES) */}
        <section
          id="studi-kasus"
          style={{
            borderRadius: '18px',
            overflow: 'hidden',
            background: '#10291a',
            color: '#f6f7f4',
            boxShadow: '0 16px 40px rgba(16, 41, 26, 0.14)',
          }}
        >
          <div
            style={{
              position: 'relative',
              padding: '30px 28px',
              backgroundImage: `linear-gradient(95deg, rgba(10, 26, 17, 0.94) 0%, rgba(16, 41, 26, 0.87) 60%, rgba(16, 41, 26, 0.72) 100%), url(${activeDataset.imageUrl || HERO_BANNER_IMAGE})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px',
                alignItems: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <span className="chip">
                    JURNAL EJABF (2025) UNPAD · SISTEM DINAMIS LINTAS DISIPLIN
                  </span>
                  <span
                    className="mono"
                    style={{
                      padding: '3px 9px',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.14)',
                      fontSize: '10.5px',
                      color: '#c6f35c',
                    }}
                  >
                    FIG. 2 TRANSEK · FIG. 3 TIME-SERIES · FIG. 4 PHASE DIAGRAM · 2D · 3D · GOOGLE MAPS
                  </span>
                </div>
                <h1
                  style={{
                    fontSize: 'clamp(25px, 3.2vw, 38px)',
                    fontWeight: 700,
                    lineHeight: 1.12,
                    letterSpacing: '-0.03em',
                    marginBottom: '12px',
                  }}
                >
                  Simulator Universal Model Lotka-Volterra: Replikasi Jurnal Lamun–Bulu Babi (Pangandaran MPA) &amp; Fenomena Alam
                </h1>
                <p
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: 'rgba(246, 247, 244, 0.9)',
                    maxWidth: '760px',
                  }}
                >
                  Dilengkapi replikasi grafik standar publikasi ilmiah dari{' '}
                  <strong>Cahyana et al. (2025) — FPIK Universitas Padjadjaran</strong> (
                  <em>Egyptian Journal of Aquatic Biology &amp; Fisheries</em>, Vol. 29(1):
                  151–162) serta 9 studi kasus fenomena alam lainnya: Kebakaran Hutan
                  Gambut, Osilator Iklim El Niño (ENSO), Tekanan Magma Gunung Api,
                  Gelombang Epidemi SIR, Reaksi Kimia Lotka–BZ, dan Siklus Ekonomi Goodwin.
                </p>
              </div>

              {/* Academic Researcher Attribution Card (NPM) */}
              <div
                style={{
                  background: 'rgba(10, 26, 17, 0.9)',
                  border: '1.5px solid rgba(198, 243, 92, 0.55)',
                  borderRadius: '14px',
                  padding: '20px 22px',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <span className="chip">IDENTITAS PENELITI / PENYUSUN</span>
                  <span
                    className="mono"
                    style={{ fontSize: '10px', color: '#c6f35c' }}
                  >
                    10 STUDI KASUS TERKALIBRASI
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '21px',
                    fontWeight: 700,
                    color: '#ffffff',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Aryo Sandy Prasetyo
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#c6f35c',
                    marginTop: '4px',
                    padding: '6px 10px',
                    background: 'rgba(198, 243, 92, 0.14)',
                    borderRadius: '6px',
                    display: 'inline-block',
                  }}
                >
                  NPM: 230210240028
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'rgba(246, 247, 244, 0.85)',
                    marginTop: '10px',
                    lineHeight: 1.45,
                  }}
                >
                  <strong>Studi Aktif:</strong> {activeDataset.shortName} (
                  {activeDataset.locationName})
                </div>
              </div>
            </div>

            {/* Domain Category Filter Tabs */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginTop: '24px',
                paddingBottom: '14px',
                borderBottom: '1px solid rgba(255,255,255,0.14)',
              }}
            >
              {DOMAIN_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '999px',
                      border: isActive
                        ? '1.5px solid #c6f35c'
                        : '1px solid rgba(255,255,255,0.22)',
                      background: isActive
                        ? '#c6f35c'
                        : 'rgba(15, 38, 24, 0.82)',
                      color: isActive ? '#10291a' : '#f6f7f4',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Interactive Phenomenon Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(275px, 1fr))',
                gap: '14px',
                marginTop: '18px',
              }}
            >
              {filteredDatasets.map((ds) => {
                const isSelected = ds.id === activeDataset.id;
                return (
                  <button
                    key={ds.id}
                    type="button"
                    onClick={() => handleSelectDataset(ds.id)}
                    style={{
                      textAlign: 'left',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: isSelected
                        ? '2px solid #c6f35c'
                        : '1px solid rgba(255,255,255,0.18)',
                      background: isSelected
                        ? 'rgba(22, 58, 37, 0.96)'
                        : 'rgba(12, 31, 20, 0.88)',
                      color: '#f6f7f4',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'transform 0.15s ease, border-color 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        height: '124px',
                        width: '100%',
                      }}
                    >
                      <img
                        src={ds.imageUrl}
                        alt={ds.shortName}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          background: 'rgba(12, 31, 20, 0.9)',
                          color: '#c6f35c',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          fontSize: '9.5px',
                          fontFamily: 'var(--mono)',
                          fontWeight: 700,
                        }}
                      >
                        {ds.domainBadge}
                      </div>
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: '#c6f35c',
                            color: '#10291a',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontSize: '10px',
                            fontFamily: 'var(--mono)',
                            fontWeight: 800,
                          }}
                        >
                          AKTIF
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px', flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 700,
                          marginBottom: '4px',
                          color: '#ffffff',
                        }}
                      >
                        {ds.preyEmoji} {ds.predatorEmoji} {ds.shortName}
                      </div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          color: '#c6f35c',
                          marginBottom: '5px',
                          fontWeight: 500,
                        }}
                      >
                        X: {ds.preyName.split('(')[0]} ⇄ Y:{' '}
                        {ds.predatorName.split('(')[0]}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'rgba(246,247,244,0.75)',
                          lineHeight: 1.4,
                        }}
                      >
                        📍 {ds.locationName}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 2. PUBLICATION-GRADE JOURNAL OUTPUTS (FIG. 2, FIG. 3, FIG. 4, TABLE 1-2, TIPPING POINT) */}
        <JournalPublicationOutputs
          dataset={activeDataset}
          params={params}
          sim={sim}
          duration={duration}
          onLoadPangandaranJournal={() =>
            handleSelectDataset('cahyana-2025-pangandaran-seagrass')
          }
          onApplyFieldSurveyToModel={(newX0, newY0) =>
            setParams((prev) => ({
              ...prev,
              x0: newX0,
              y0: newY0,
            }))
          }
        />

        {/* 3. GOOGLE MAPS SPATIAL BIOMASS & PHENOMENON SIMULATOR */}
        <section id="peta-spasial">
          <GoogleMapEcosystemSim
            dataset={activeDataset}
            datasets={ACADEMIC_DATASETS}
            onSelectDataset={handleSelectDataset}
            params={params}
            currentPrey={currentPrey}
            currentPredator={currentPredator}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onInjectPopulation={(dPrey, dPred) => {
              setParams((prev) => ({
                ...prev,
                x0: Math.max(2, +(prev.x0 + dPrey).toFixed(1)),
                y0: Math.max(2, +(prev.y0 + dPred).toFixed(1)),
              }));
            }}
          />
        </section>

        {/* 4. INTERACTIVE 2D & 3D SIMULATION + ODE PARAMETER & SHOCK WORKBENCH */}
        <section
          id="simulasi-2d-3d"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '22px',
            alignItems: 'start',
          }}
        >
          {/* Left Column: Parameter Controls, Shock Scenarios & Equilibrium Diagnostics */}
          <div className="lv-card" style={{ padding: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <span className="chip">KONTROL PARAMETER &amp; SKENARIO KEJUT</span>
              <button
                type="button"
                onClick={() => {
                  setParams({ ...activeDataset.calibratedParams });
                  setDuration(activeDataset.duration);
                }}
                className="lv-btn"
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                ↺ Reset ke Jurnal
              </button>
            </div>

            <div
              className="mono"
              style={{
                fontSize: '10px',
                color: '#108548',
                fontWeight: 700,
                marginBottom: '4px',
              }}
            >
              {activeDataset.domainBadge}
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
              {activeDataset.title}
            </h3>
            <p style={{ fontSize: '12px', color: '#425949', marginBottom: '10px' }}>
              {activeDataset.authors} ({activeDataset.year}) —{' '}
              <em>{activeDataset.journal}</em>
            </p>
            <p
              style={{
                fontSize: '12px',
                lineHeight: 1.5,
                color: '#2c4434',
                background: '#f4f8f5',
                padding: '10px 12px',
                borderRadius: '8px',
                borderLeft: '3px solid #108548',
                marginBottom: '14px',
              }}
            >
              {activeDataset.description}
            </p>

            {/* Domain-Specific Shock / Impulse Scenarios */}
            {activeDataset.shockScenarios.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div
                  className="mono"
                  style={{
                    fontSize: '10px',
                    color: '#425949',
                    marginBottom: '6px',
                    fontWeight: 700,
                  }}
                >
                  ⚡ UJI SKENARIO GANGGUAN / PROTOKOL INTERVENSI:
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  {activeDataset.shockScenarios.map((sc) => (
                    <button
                      key={sc.label}
                      type="button"
                      onClick={() => setParams((prev) => sc.apply(prev))}
                      style={{
                        textAlign: 'left',
                        padding: '8px 11px',
                        borderRadius: '8px',
                        border: '1px solid #cbd7ce',
                        background: '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#10291a',
                        }}
                      >
                        {sc.emoji} {sc.label}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#526858',
                          marginTop: '2px',
                        }}
                      >
                        {sc.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sliders */}
            <div style={{ display: 'grid', gap: '10px' }}>
              {[
                {
                  key: 'alpha' as const,
                  label: `Laju Pertumbuhan / Pengisian X (α) — ${activeDataset.preyEmoji}`,
                  min: 0.05,
                  max: 1.5,
                  step: 0.005,
                },
                {
                  key: 'beta' as const,
                  label: `Koefisien Herbivori / Interaksi (β)`,
                  min: 0.0005,
                  max: 0.08,
                  step: 0.0005,
                },
                {
                  key: 'delta' as const,
                  label: `Laju Konversi / Amplifikasi Y (δ) — ${activeDataset.predatorEmoji}`,
                  min: 0.0001,
                  max: 0.08,
                  step: 0.0001,
                },
                {
                  key: 'gamma' as const,
                  label: `Laju Mortalitas / Disipasi Y (γ)`,
                  min: 0.02,
                  max: 1.5,
                  step: 0.005,
                },
                {
                  key: 'x0' as const,
                  label: `Kondisi Awal x₀ (${activeDataset.xRoleLabel})`,
                  min: 2,
                  max: 300,
                  step: 1,
                },
                {
                  key: 'y0' as const,
                  label: `Kondisi Awal y₀ (${activeDataset.yRoleLabel})`,
                  min: 2,
                  max: 260,
                  step: 1,
                },
              ].map((s) => (
                <div key={s.key}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11.5px',
                      marginBottom: '2px',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{s.label}</span>
                    <span className="mono" style={{ fontWeight: 700 }}>
                      {params[s.key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={params[s.key]}
                    onChange={(e) =>
                      setParams((prev) => ({
                        ...prev,
                        [s.key]: parseFloat(e.target.value),
                      }))
                    }
                    style={{ width: '100%', accentColor: '#10291a' }}
                  />
                </div>
              ))}
            </div>

            {/* Analytical Equilibrium & Eigenvalue Summary */}
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: '#f4f7f4',
                border: '1px solid #d5e0d7',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '12px',
              }}
            >
              <div>
                <div className="mono" style={{ fontSize: '10px', color: '#425949' }}>
                  TITIK EKUILIBRIUM (x*, y*)
                </div>
                <div
                  className="mono"
                  style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}
                >
                  ({eq.coexistence[0].toFixed(1)}, {eq.coexistence[1].toFixed(1)})
                </div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: '10px', color: '#425949' }}>
                  PERIODE KARAKTERISTIK (2π/√αγ)
                </div>
                <div
                  className="mono"
                  style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}
                >
                  {eq.characteristicPeriod.toFixed(2)} {activeDataset.timeUnit}
                </div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: '10px', color: '#425949' }}>
                  TIPE KESTABILAN JACOBIAN
                </div>
                <div
                  style={{ fontWeight: 700, color: '#108548', marginTop: '2px' }}
                >
                  {eq.stabilityType}
                </div>
              </div>
              <div>
                <div className="mono" style={{ fontSize: '10px', color: '#425949' }}>
                  KORELASI EMPIRIS (rₓ / rᵧ)
                </div>
                <div className="mono" style={{ fontWeight: 700, marginTop: '2px' }}>
                  rₓ={fit.preyCorrelation.toFixed(2)} · rᵧ=
                  {fit.predatorCorrelation.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 2D & 3D Simulator + RK4 Time Series Chart */}
          <div style={{ display: 'grid', gap: '20px' }}>
            <Simulation2D3DView
              dataset={activeDataset}
              params={params}
              sim={sim}
              eq={eq}
              playIndex={playIndex}
              isPlaying={isPlaying}
              onSelectInitialState={(x0, y0) =>
                setParams((prev) => ({ ...prev, x0, y0 }))
              }
            />

            {/* Time Series RK4 vs Empirical Data Chart */}
            <div className="lv-card" style={{ padding: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '10px',
                }}
              >
                <div>
                  <span className="chip">
                    KURVA DERET WAKTU RK4 VS OBSERVASI EMPIRIS
                  </span>
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      marginTop: '4px',
                    }}
                  >
                    Evolusi {activeDataset.preyName} vs {activeDataset.predatorName} ({activeDataset.unit})
                  </h3>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: activeDataset.preyColor }}>
                    ● {activeDataset.preyEmoji} {activeDataset.preyName} (RMSE:{' '}
                    {fit.preyRMSE.toFixed(2)})
                  </span>
                  <span style={{ color: activeDataset.predatorColor }}>
                    ● {activeDataset.predatorEmoji} {activeDataset.predatorName}{' '}
                    (RMSE: {fit.predatorRMSE.toFixed(2)})
                  </span>
                </div>
              </div>
              <div style={{ width: '100%', height: '290px' }}>
                <canvas
                  ref={timeSeriesCanvasRef}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 5. MULTI-SYSTEM 4-LEVEL CASCADE SIMULATOR */}
        <section id="rantai-makanan" className="lv-card" style={{ padding: '22px' }}>
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
              <span className="chip">
                SIMULATOR KASKADE 4-TINGKAT LINTAS SISTEM (LAMUN PANGANDARAN, IKLIM &amp; GEOFISIKA)
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
                Propagasi Gelombang Kaskade Nonlinier: Padang Lamun–Bulu Babi, ENSO–Gambut, Magma–Vulkanik &amp; Epidemi
              </h3>
              <p style={{ fontSize: '12.5px', color: '#425949', marginTop: '2px' }}>
                {CASCADE_PRESETS[activeBiomeKey]?.subtitle}
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {Object.entries(CASCADE_PRESETS).map(([key, b]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveBiomeKey(key);
                    setTrophicSpecies(b.species.map((s) => ({ ...s })));
                  }}
                  style={{
                    padding: '6px 11px',
                    fontSize: '11.5px',
                    borderRadius: '8px',
                    border:
                      activeBiomeKey === key
                        ? '1.5px solid #10291a'
                        : '1px solid #cbd7ce',
                    background: activeBiomeKey === key ? '#10291a' : '#ffffff',
                    color: activeBiomeKey === key ? '#c6f35c' : '#10291a',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Cascade Levels Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {trophicSpecies.map((sp, idx) => (
              <div
                key={sp.name}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: '#f6f8f6',
                  borderLeft: `4px solid ${sp.color}`,
                  borderTop: '1px solid #dce5de',
                  borderRight: '1px solid #dce5de',
                  borderBottom: '1px solid #dce5de',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>
                    {sp.emoji} L{idx + 1}: {sp.name}
                  </span>
                  <span
                    className="mono"
                    style={{ fontSize: '11px', fontWeight: 700 }}
                  >
                    N₀={sp.N0}
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={320}
                  step={5}
                  value={sp.N0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setTrophicSpecies((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, N0: val } : item
                      )
                    );
                  }}
                  style={{ width: '100%', accentColor: sp.color }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: '#425949',
                    marginTop: '4px',
                  }}
                >
                  <span>Puncak: {(trophicSim.mx[idx] ?? 0).toFixed(1)}</span>
                  <span>
                    Akhir:{' '}
                    {(
                      trophicSim.C[idx]?.[trophicSim.C[idx].length - 1] ?? 0
                    ).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Multi-System Perturbation Buttons */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            <button
              type="button"
              className="lv-btn"
              onClick={() =>
                setTrophicSpecies((prev) =>
                  prev.map((s, i) =>
                    i === 0 ? { ...s, N0: 300, K: 480 } : s
                  )
                )
              }
            >
              ⚡ Restorasi Lamun / Lonjakan Sumber Dasar (Level 1 +60%)
            </button>
            <button
              type="button"
              className="lv-btn"
              onClick={() =>
                setTrophicSpecies((prev) =>
                  prev.map((s, i) =>
                    i === prev.length - 1 ? { ...s, N0: 70 } : s
                  )
                )
              }
            >
              🐠 Konservasi Predator Puncak Pengendali Bulu Babi (Level 4 ×3)
            </button>
            <button
              type="button"
              className="lv-btn"
              onClick={() =>
                setTrophicSpecies((prev) =>
                  prev.map((s, i) => (i === 2 ? { ...s, h: 0.18 } : s))
                )
              }
            >
              🛡️ Pengendalian Populasi Level 3 / Bulu Babi (h = 0.18)
            </button>
            <button
              type="button"
              className="lv-btn"
              onClick={() => {
                setTrophicSpecies(
                  CASCADE_PRESETS[activeBiomeKey].species.map((s) => ({
                    ...s,
                  }))
                );
                setTrophicGlobal((g) => ({ ...g, sa: 0.15, nz: 0.02 }));
              }}
            >
              ↺ Pulihkan Keseimbangan Sistem
            </button>
          </div>

          <div style={{ width: '100%', height: '270px' }}>
            <canvas
              ref={trophicCanvasRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        </section>

        {/* 6. EMPIRICAL JOURNAL DATA TABLE & CSV EXPORT */}
        <section id="data-jurnal" className="lv-card" style={{ padding: '22px' }}>
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
              <span className="chip">
                TABEL VERIFIKASI DATA EMPIRIS &amp; EKSPOR LAPORAN
              </span>
              <h3 style={{ fontSize: '17px', fontWeight: 700, marginTop: '4px' }}>
                Komparasi Kuantitatif Data Jurnal vs Integrasi Numerik RK4 —{' '}
                {activeDataset.shortName} (Aryo Sandy Prasetyo · NPM: 230210240028)
              </h3>
            </div>
            <button
              type="button"
              onClick={handleExportCSV}
              className="lv-btn lv-btn-primary"
              style={{ padding: '8px 16px', fontSize: '12.5px' }}
            >
              ⬇ Unduh Laporan CSV (NPM: 230210240028)
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12.5px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#10291a',
                    color: '#c6f35c',
                    fontFamily: 'var(--mono)',
                    fontSize: '11px',
                  }}
                >
                  <th style={{ padding: '10px 12px' }}>PERIODE / LABEL</th>
                  <th style={{ padding: '10px 12px' }}>WAKTU (t)</th>
                  <th style={{ padding: '10px 12px' }}>
                    {activeDataset.preyEmoji} {activeDataset.xRoleLabel} (REFERENSI)
                  </th>
                  <th style={{ padding: '10px 12px' }}>
                    {activeDataset.preyEmoji} {activeDataset.xRoleLabel} (RK4)
                  </th>
                  <th style={{ padding: '10px 12px' }}>
                    {activeDataset.predatorEmoji} {activeDataset.yRoleLabel} (REFERENSI)
                  </th>
                  <th style={{ padding: '10px 12px' }}>
                    {activeDataset.predatorEmoji} {activeDataset.yRoleLabel} (RK4)
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeDataset.data.map((pt, idx) => {
                  let bestIdx = 0;
                  let bestDiff = Infinity;
                  sim.t.forEach((tVal, i) => {
                    const d = Math.abs(tVal - pt.time);
                    if (d < bestDiff) {
                      bestDiff = d;
                      bestIdx = i;
                    }
                  });
                  const rkPrey = sim.prey[bestIdx] ?? 0;
                  const rkPred = sim.predator[bestIdx] ?? 0;
                  return (
                    <tr
                      key={pt.label}
                      style={{
                        borderBottom: '1px solid #e1e8e3',
                        background: idx % 2 === 0 ? '#ffffff' : '#f8faf8',
                      }}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                        {pt.label}
                      </td>
                      <td className="mono" style={{ padding: '8px 12px' }}>
                        {pt.time} {activeDataset.timeUnit}
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: '8px 12px',
                          color: activeDataset.preyColor,
                          fontWeight: 600,
                        }}
                      >
                        {pt.prey.toFixed(2)}
                      </td>
                      <td className="mono" style={{ padding: '8px 12px' }}>
                        {rkPrey.toFixed(2)}
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: '8px 12px',
                          color: activeDataset.predatorColor,
                          fontWeight: 600,
                        }}
                      >
                        {pt.predator.toFixed(2)}
                      </td>
                      <td className="mono" style={{ padding: '8px 12px' }}>
                        {rkPred.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Academic Footer */}
      <footer
        style={{
          background: '#10291a',
          color: '#f6f7f4',
          padding: '24px 20px',
          borderTop: '2px solid #c6f35c',
        }}
      >
        <div
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            fontSize: '12.5px',
          }}
        >
          <div>
            <strong>
              Simulator Universal Model Lotka-Volterra: Jurnal Lamun–Bulu Babi (EJABF 2025), Fenomena Alam &amp; Sains
            </strong>{' '}
            — Disusun oleh <strong>Aryo Sandy Prasetyo</strong> (
            <strong>NPM: 230210240028</strong>)
          </div>
          <div className="mono" style={{ fontSize: '11px', color: '#c6f35c' }}>
            FIG. 2–4 EJABF 2025 · 10 STUDI KASUS · 2D · 3D · GOOGLE MAPS · RK4 SOLVER
          </div>
        </div>
      </footer>
    </div>
  );
}
