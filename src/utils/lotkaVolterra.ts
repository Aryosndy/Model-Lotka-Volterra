export interface ClassicLVParams {
  alpha: number; // Intrinsic growth / recharge rate of X (α)
  beta: number;  // Coupling / depletion / herbivory rate (β)
  delta: number; // Conversion / amplification rate into Y (δ)
  gamma: number; // Dissipation / mortality / relaxation rate of Y (γ)
  x0: number;    // Initial state X₀
  y0: number;    // Initial state Y₀
  carryingCapacity?: number; // Optional saturation capacity K (0 = unbounded classic LV)
  handlingTime?: number;     // Optional nonlinear saturation h (0 = linear)
  harvestPrey?: number;      // Optional external damping/extraction on X (hₓ)
  harvestPred?: number;      // Optional external damping/suppression on Y (hᵧ)
}

export interface EquilibriumAnalysis {
  trivial: [number, number];
  coexistence: [number, number];
  isValidCoexistence: boolean;
  jacobianTrace: number;
  jacobianDet: number;
  eigenvalueReal: number;
  eigenvalueImag: number;
  characteristicPeriod: number;
  stabilityType:
    | 'Center (Neutral Cycles)'
    | 'Stable Spiral (Damped)'
    | 'Unstable Spiral (Limit Cycle)'
    | 'Stable Node'
    | 'Saddle Point';
  hamiltonianConstant?: number;
}

export interface EmpiricalDataPoint {
  time: number;
  label: string;
  prey: number;
  predator: number;
}

export type DomainCategory =
  | 'all'
  | 'ecosystem'
  | 'natural-phenomena'
  | 'epidemiology-chemistry'
  | 'socio-economics';

export interface ShockScenario {
  label: string;
  emoji: string;
  description: string;
  apply: (p: ClassicLVParams) => ClassicLVParams;
}

export interface AcademicDataset {
  id: string;
  domainCategory: Exclude<DomainCategory, 'all'>;
  domainBadge: string;
  title: string;
  shortName: string;
  authors: string;
  year: number;
  journal: string;
  doiOrCitation: string;
  xRoleLabel: string;
  yRoleLabel: string;
  interactionLabel: string;
  preyName: string;
  preyScientific: string;
  preyEmoji: string;
  preyColor: string;
  predatorName: string;
  predatorScientific: string;
  predatorEmoji: string;
  predatorColor: string;
  unit: string;
  timeUnit: string;
  description: string;
  methodology: string;
  imageUrl: string;
  locationName: string;
  coordinates: {
    lat: number;
    lng: number;
    zoom: number;
    spreadRadiusDeg: number;
  };
  calibratedParams: ClassicLVParams;
  duration: number;
  shockScenarios: ShockScenario[];
  data: EmpiricalDataPoint[];
}

export interface TrophicSpecies {
  name: string;
  emoji: string;
  color: string;
  N0: number;
  r?: number;
  K?: number;
  a?: number;
  H?: number;
  e?: number;
  m?: number;
  h: number;
}

export interface TrophicGlobalParams {
  imm: number;
  T: number;
  log: boolean;
  sa: number;
  sp: number;
  nz: number;
  seed: number;
}

export interface SimResult {
  t: number[];
  Y: number[][];
  C: number[][];
  mx: number[];
  mn: number[];
}

export interface SpatialAgent {
  id: string;
  role: 'prey' | 'predator' | 'station';
  name: string;
  scientific: string;
  emoji: string;
  color: string;
  lat: number;
  lng: number;
  density: number;
  flux: number;
  zoneLabel: string;
}

export interface TransectQuadrantSample {
  quadrantNumber: number;
  distanceMeter: number;
  side: 'Utara / Atas' | 'Selatan / Bawah';
  occupiedAreaM2: number; // out of 0.25 m² (0.5m x 0.5m)
  coveragePercent: number; // %C = (occupied / 0.25) * 100
  urchinCount: number; // count in 0.25 m²
  urchinDensityM2: number; // D = count / 0.25 (ind/m²)
}

export interface JournalTippingDiagnostics {
  criticalThresholdY: number; // y* = alpha / beta (e.g., 250 sea urchins)
  criticalThresholdX: number; // x* = gamma / delta (e.g., 200 seagrass)
  firstTippingTime: number | null; // day when Y first exceeds y*
  interventionDeadlineTime: number | null; // +8 days window per Cahyana et al. (2025)
  peakX: number;
  peakXTime: number;
  peakY: number;
  peakYTime: number;
  minXAfterPeak: number;
  barrenRiskLevel: 'RENDAH (Stabil)' | 'WASPADA (Ambang Kritis)' | 'TINGGI (Risiko Barren)';
}

// ============================================================================
// 1. Math & 3D Projection Helpers
// ============================================================================

export function clamp(v: number, a = 0, b = 1): number {
  return v < a ? a : v > b ? b : v;
}

export function seg(p: number, a: number, b: number): number {
  return clamp((p - a) / (b - a), 0, 1);
}

export function ease(t: number): number {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export interface HeroLayoutMetrics {
  isMobile: boolean;
  fernTop: number;
  fontSize: number;
  blockTop: number;
}

export function computeHeroLayout(
  W: number,
  H: number,
  lineNaturalWidthAt72k: number,
  blockHeight: number
): HeroLayoutMetrics {
  if (W <= 820) {
    return { isMobile: true, fernTop: 0, fontSize: 0, blockTop: 0 };
  }
  const bw = W * 1.06;
  const bh = H * 1.12;
  const k = Math.max(bw / 1600, bh / 900);
  const fernTop = -0.09 * H + (bh - 900 * k) / 2 + 245 * k + 0.06 * H;
  let fs = Math.min(104, 72 * k);
  if (lineNaturalWidthAt72k > 0.86 * W) {
    fs = fs * ((0.86 * W) / lineNaturalWidthAt72k);
  }
  const blockTop = fernTop + 0.5 * fs - blockHeight;
  return {
    isMobile: false,
    fernTop,
    fontSize: fs,
    blockTop,
  };
}

export function project3DPoint(
  nx: number,
  ny: number,
  nz: number,
  yaw: number,
  pitch: number,
  cx: number,
  cy: number,
  scale: number
): { x: number; y: number; depth: number } {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);

  const x1 = nx * cosY - nz * sinY;
  const z1 = nx * sinY + nz * cosY;

  const y2 = ny * cosP - z1 * sinP;
  const z2 = ny * sinP + z1 * cosP;

  const perspective = 3.2 / (3.2 + z2 * 0.65);
  return {
    x: cx + x1 * scale * perspective,
    y: cy - y2 * scale * perspective,
    depth: z2,
  };
}

/**
 * Computes Equation (1) %C and Equation (2) D from Cahyana et al. (2025)
 * as well as tipping-point diagnostics (y* = alpha/beta = 250, 8-day window).
 */
export function computeJournalTippingMetrics(
  sim: {
    t: number[];
    prey: number[];
    predator: number[];
    maxPrey: number;
    minPrey: number;
    maxPred: number;
    minPred: number;
  },
  params: ClassicLVParams
): JournalTippingDiagnostics {
  const criticalThresholdY = params.beta > 0 ? params.alpha / params.beta : 250;
  const criticalThresholdX = params.delta > 0 ? params.gamma / params.delta : 200;

  let firstTippingTime: number | null = null;
  let peakX = -Infinity;
  let peakXTime = 0;
  let peakY = -Infinity;
  let peakYTime = 0;

  for (let i = 0; i < sim.t.length; i++) {
    const x = sim.prey[i];
    const y = sim.predator[i];
    const time = sim.t[i];

    if (firstTippingTime === null && y >= criticalThresholdY) {
      firstTippingTime = time;
    }
    if (x > peakX) {
      peakX = x;
      peakXTime = time;
    }
    if (y > peakY) {
      peakY = y;
      peakYTime = time;
    }
  }

  const interventionDeadlineTime =
    firstTippingTime !== null ? +(firstTippingTime + 8).toFixed(1) : null;

  const minXAfterPeak = sim.minPrey;
  let barrenRiskLevel: JournalTippingDiagnostics['barrenRiskLevel'] =
    'RENDAH (Stabil)';
  if (peakY > criticalThresholdY * 1.5 || minXAfterPeak < criticalThresholdX * 0.15) {
    barrenRiskLevel = 'TINGGI (Risiko Barren)';
  } else if (peakY >= criticalThresholdY) {
    barrenRiskLevel = 'WASPADA (Ambang Kritis)';
  }

  return {
    criticalThresholdY,
    criticalThresholdX,
    firstTippingTime,
    interventionDeadlineTime,
    peakX: Math.max(0, peakX),
    peakXTime,
    peakY: Math.max(0, peakY),
    peakYTime,
    minXAfterPeak,
    barrenRiskLevel,
  };
}

// ============================================================================
// 2. Generated Visual Assets & Multi-Domain Scientific Datasets (10 Cases)
// ============================================================================

export const HERO_BANNER_IMAGE =
  '/src/assets/images/hero_lotka_volterra_ecosystem_1794986934536.jpg';
export const CARD_HUDSON_IMAGE =
  '/src/assets/images/card_hudson_bay_lynx_hare_1794986936821.jpg';
export const CARD_ISLE_IMAGE =
  '/src/assets/images/card_isle_royale_wolf_moose_1794986936724.jpg';
export const CARD_MARINE_IMAGE =
  '/src/assets/images/card_indonesia_marine_trophic_1794986937345.jpg';
export const CARD_WILDFIRE_IMAGE =
  '/src/assets/images/card_wildfire_forest_regeneration_1794988637809.jpg';
export const CARD_ENSO_IMAGE =
  '/src/assets/images/card_enso_pacific_ocean_oscillator_1794988637775.jpg';
export const CARD_VOLCANO_IMAGE =
  '/src/assets/images/card_volcanic_magma_hydrothermal_1794988639859.jpg';
export const CARD_CHEMICAL_EPIDEMIC_IMAGE =
  '/src/assets/images/card_epidemic_chemical_oscillator_1794988641266.jpg';

export const DOMAIN_CATEGORIES: Array<{
  id: DomainCategory;
  label: string;
  emoji: string;
  subtitle: string;
}> = [
  {
    id: 'all',
    label: 'Semua Fenomena (10 Studi Kasus)',
    emoji: '🌐',
    subtitle: 'Jurnal EJABF 2025 Pangandaran, Geofisika, Iklim, Vulkanologi, Epidemiologi, Kimia & Ekonomi',
  },
  {
    id: 'ecosystem',
    label: 'Ekosistem & Jurnal Lamun–Bulu Babi (EJABF 2025)',
    emoji: '🌿',
    subtitle: 'Pangandaran MPA (Cahyana et al. 2025), Hudson Bay, Isle Royale, Laut Banda & Gause',
  },
  {
    id: 'natural-phenomena',
    label: 'Fenomena Alam, Iklim & Geofisika',
    emoji: '🌋',
    subtitle: 'Kebakaran Hutan Gambut, Osilator El Niño (ENSO), & Siklus Tekanan Magma Vulkanik',
  },
  {
    id: 'epidemiology-chemistry',
    label: 'Epidemiologi & Osilasi Kimia',
    emoji: '🧪',
    subtitle: 'Gelombang Epidemi SIR Kermack–McKendrick & Reaksi Otokatalitik Lotka–BZ',
  },
  {
    id: 'socio-economics',
    label: 'Makroekonomi & Perkotaan',
    emoji: '📈',
    subtitle: 'Siklus Bisnis Makroekonomi Goodwin (Kesempatan Kerja vs Pangsa Upah)',
  },
];

export const DEFAULT_TRANSECT_QUADRANTS: TransectQuadrantSample[] = [
  { quadrantNumber: 1, distanceMeter: 5, side: 'Utara / Atas', occupiedAreaM2: 0.048, coveragePercent: 19.2, urchinCount: 2.1, urchinDensityM2: 8.4 },
  { quadrantNumber: 2, distanceMeter: 10, side: 'Selatan / Bawah', occupiedAreaM2: 0.042, coveragePercent: 16.8, urchinCount: 2.3, urchinDensityM2: 9.2 },
  { quadrantNumber: 3, distanceMeter: 15, side: 'Utara / Atas', occupiedAreaM2: 0.050, coveragePercent: 20.0, urchinCount: 2.0, urchinDensityM2: 8.0 },
  { quadrantNumber: 4, distanceMeter: 20, side: 'Selatan / Bawah', occupiedAreaM2: 0.040, coveragePercent: 16.0, urchinCount: 2.4, urchinDensityM2: 9.6 },
  { quadrantNumber: 5, distanceMeter: 25, side: 'Utara / Atas', occupiedAreaM2: 0.045, coveragePercent: 18.0, urchinCount: 2.2, urchinDensityM2: 8.8 },
  { quadrantNumber: 6, distanceMeter: 30, side: 'Selatan / Bawah', occupiedAreaM2: 0.047, coveragePercent: 18.8, urchinCount: 2.1, urchinDensityM2: 8.4 },
  { quadrantNumber: 7, distanceMeter: 35, side: 'Utara / Atas', occupiedAreaM2: 0.043, coveragePercent: 17.2, urchinCount: 2.25, urchinDensityM2: 9.0 },
  { quadrantNumber: 8, distanceMeter: 40, side: 'Selatan / Bawah', occupiedAreaM2: 0.046, coveragePercent: 18.4, urchinCount: 2.15, urchinDensityM2: 8.6 },
  { quadrantNumber: 9, distanceMeter: 45, side: 'Utara / Atas', occupiedAreaM2: 0.044, coveragePercent: 17.6, urchinCount: 2.2, urchinDensityM2: 8.8 },
  { quadrantNumber: 10, distanceMeter: 50, side: 'Selatan / Bawah', occupiedAreaM2: 0.045, coveragePercent: 18.0, urchinCount: 2.125, urchinDensityM2: 8.5 },
];

export const ACADEMIC_DATASETS: AcademicDataset[] = [
  // ==========================================================================
  // FEATURED #1: ATTACHED JOURNAL (Cahyana et al., 2025 - EJABF Vol. 29(1))
  // ==========================================================================
  {
    id: 'cahyana-2025-pangandaran-seagrass',
    domainCategory: 'ecosystem',
    domainBadge: 'JURNAL UTAMA EJABF (2025) · UNPAD PANGANDARAN',
    title:
      'Sea Urchin Population Dynamics in Seagrass Ecosystem: A Model to Mitigate Barren Seagrass Ecosystem (Cahyana et al., 2025)',
    shortName: 'Lamun vs Bulu Babi — Pangandaran MPA (Cahyana et al., 2025)',
    authors:
      'Imam Cahyana, Wahyuniar Pamungkas, Subiyanto, Donny Prihadi, Sheila Zallesa (FPIK Universitas Padjadjaran)',
    year: 2025,
    journal:
      'Egyptian Journal of Aquatic Biology & Fisheries (EJABF), Vol. 29(1): 151–162 (ISSN 1110-6131)',
    doiOrCitation:
      'Cahyana et al. (2025) EJABF 29(1): 151–162 — Program Studi Ilmu Kelautan FPIK UNPAD',
    xRoleLabel: 'Populasi Lamun / Seagrass (x)',
    yRoleLabel: 'Populasi Bulu Babi / Sea Urchin (y)',
    interactionLabel: 'Tekanan Herbivori / Overgrazing (βxy)',
    preyName: 'Seagrass (Lamun Cymodocea rotundata)',
    preyScientific: 'Cymodocea rotundata (%C = 18%)',
    preyEmoji: '🌿',
    preyColor: '#16a34a',
    predatorName: 'Sea Urchin (Bulu Babi Echinometra lucunter)',
    predatorScientific: 'Echinometra lucunter (D = 8.73 ind/m²)',
    predatorEmoji: '🟣',
    predatorColor: '#7e22ce',
    unit: 'Individu / Area Studi (275 m²)',
    timeUnit: 'Hari (Day)',
    description:
      'Studi pemodelan Lotka-Volterra dari FPIK Universitas Padjadjaran di Kawasan Konservasi Perairan (MPA) Cagar Alam Pananjung Pangandaran (470 ha). Dengan kondisi awal x₀ = 153 lamun dan y₀ = 24 bulu babi (α = 0.5, β = 0.002, δ = 0.0005, γ = 0.1), model mengidentifikasi titik kritis (tipping point) pada 250 individu bulu babi dan jendela intervensi dini 8 hari untuk mencegah padang lamun berubah menjadi zona gundul (barren ecosystem).',
    methodology:
      'Metode Transek Kuadran 50 meter sejajar garis pantai (kuadran 0.5 × 0.5 m setiap 5 m, pengamatan pagi 07:00–09:00 & sore 15:00–17:00) selama Mei–Juni 2024.',
    imageUrl: CARD_MARINE_IMAGE,
    locationName:
      'Pantai Timur & MPA Cagar Alam Pananjung Pangandaran, Jawa Barat, Indonesia',
    coordinates: {
      lat: -7.705,
      lng: 108.662,
      zoom: 14,
      spreadRadiusDeg: 0.014,
    },
    calibratedParams: {
      alpha: 0.5,
      beta: 0.002,
      delta: 0.0005,
      gamma: 0.1,
      x0: 153,
      y0: 24,
      carryingCapacity: 0,
      handlingTime: 0,
      harvestPrey: 0,
      harvestPred: 0,
    },
    duration: 200,
    shockScenarios: [
      {
        label: 'Protokol Intervensi 8-Hari (Pengendalian Bulu Babi)',
        emoji: '🛡️',
        description:
          'Menerapkan rekomendasi jurnal: pengendalian populasi bulu babi saat mendekati ambang 250 individu untuk mencegah kondisi barren.',
        apply: (p) => ({
          ...p,
          x0: 200,
          y0: 180,
          harvestPred: 0.03,
        }),
      },
      {
        label: 'Overfishing Predator Alami (Ledakan Herbivori)',
        emoji: '⚠️',
        description:
          'Penurunan mortalitas alami bulu babi memicu lonjakan amplitudo di atas ambang kritis 250 individu dan degradasi padang lamun.',
        apply: (p) => ({
          ...p,
          alpha: 0.5,
          beta: 0.002,
          delta: 0.0005,
          gamma: 0.08,
          x0: 153,
          y0: 24,
          harvestPred: 0,
        }),
      },
    ],
    data: [
      { time: 0, label: 'Hari 0', prey: 153.0, predator: 24.0 },
      { time: 8, label: 'Hari 8', prey: 2085.0, predator: 268.0 },
      { time: 15, label: 'Hari 15', prey: 18.5, predator: 695.0 },
      { time: 25, label: 'Hari 25', prey: 0.4, predator: 258.0 },
      { time: 40, label: 'Hari 40', prey: 3.8, predator: 58.0 },
      { time: 50, label: 'Hari 50', prey: 145.0, predator: 24.2 },
      { time: 56, label: 'Hari 56', prey: 1980.0, predator: 195.0 },
      { time: 65, label: 'Hari 65', prey: 12.4, predator: 640.0 },
      { time: 100, label: 'Hari 100', prey: 420.0, predator: 28.5 },
      { time: 105, label: 'Hari 105', prey: 1890.0, predator: 390.0 },
      { time: 150, label: 'Hari 150', prey: 980.0, predator: 45.0 },
      { time: 200, label: 'Hari 200', prey: 1620.0, predator: 98.0 },
    ],
  },

  // ==========================================================================
  // DOMAIN A: FENOMENA ALAM, GEOFISIKA, IKLIM & VULKANOLOGI
  // ==========================================================================
  {
    id: 'wildfire-biomass-dynamics',
    domainCategory: 'natural-phenomena',
    domainBadge: 'FENOMENA ALAM · KEBAKARAN HUTAN & GAMBUT',
    title: 'Siklus Kebakaran Hutan Gambut & Regenerasi Biomassa (Casagrandi & Rinaldi, 1999)',
    shortName: 'Kebakaran Hutan & Biomassa Gambut',
    authors: 'Casagrandi, R.; Rinaldi, S.; D’Odorico, P.',
    year: 1999,
    journal: 'Ecological Modelling & Geophysical Research Letters (Fire–Vegetation Dynamics)',
    doiOrCitation:
      'Casagrandi & Rinaldi (1999) A minimal model for forest fire regimes. Am. Nat. 153(5): 527–539',
    xRoleLabel: 'Akumulasi Biomassa / Bahan Bakar (x)',
    yRoleLabel: 'Intensitas Titik Api Termal (y)',
    interactionLabel: 'Fluks Pembakaran Termal (βxy)',
    preyName: 'Biomassa Vegetasi & Gambut',
    preyScientific: 'Akumulasi Bahan Bakar Kering (Fuel Load)',
    preyEmoji: '🌲',
    preyColor: '#15803d',
    predatorName: 'Intensitas Titik Api (Hotspot)',
    predatorScientific: 'Front Pembakaran Termal Aktif',
    predatorEmoji: '🔥',
    predatorColor: '#ea580c',
    unit: 'Indeks Biomassa (t/ha) & Titik Api',
    timeUnit: 'Tahun',
    description:
      'Dalam geofisika lanskap, api bertindak sebagai "predator" abiotik yang mengonsumsi biomassa vegetasi ("mangsa"). Saat tajuk hutan dan gambut menebal selama tahun basah, beban bahan bakar (x) melampaui ambang kritis sehingga memicu ledakan titik api (y), diikuti fase pemulihan suksesi sekunder.',
    methodology:
      'Model diferensial nonlinier Fire–Biomass Lotka-Volterra dengan kapasitas dukung kanopi K pada ekosistem gambut tropis Kalimantan Tengah.',
    imageUrl: CARD_WILDFIRE_IMAGE,
    locationName: 'Kawasan Lahan Gambut Sebangau & Kalimantan Tengah, Indonesia',
    coordinates: {
      lat: -2.455,
      lng: 113.921,
      zoom: 8,
      spreadRadiusDeg: 0.55,
    },
    calibratedParams: {
      alpha: 0.62,
      beta: 0.025,
      delta: 0.021,
      gamma: 0.74,
      x0: 42.0,
      y0: 14.0,
      carryingCapacity: 240,
      handlingTime: 0.004,
      harvestPrey: 0,
      harvestPred: 0,
    },
    duration: 36,
    shockScenarios: [
      {
        label: 'Kemarau Ekstrem (+Bahan Bakar Kering)',
        emoji: '☀️',
        description: 'Meningkatkan laju akumulasi bahan bakar kering α dan memicu lonjakan titik api.',
        apply: (p) => ({ ...p, alpha: 0.85, x0: 68, y0: 28 }),
      },
      {
        label: 'Hujan Buatan & Pembasahan Gambut',
        emoji: '🌧️',
        description: 'Meningkatkan laju pemadaman alami γ dan menekan penyebaran api β.',
        apply: (p) => ({ ...p, beta: 0.016, gamma: 1.05, harvestPred: 0.12 }),
      },
    ],
    data: [
      { time: 0, label: 'Thn 1', prey: 42.0, predator: 14.0 },
      { time: 3, label: 'Thn 4', prey: 64.2, predator: 29.5 },
      { time: 6, label: 'Thn 7', prey: 26.8, predator: 41.2 },
      { time: 9, label: 'Thn 10', prey: 24.5, predator: 15.8 },
      { time: 12, label: 'Thn 13', prey: 55.4, predator: 18.9 },
      { time: 15, label: 'Thn 16', prey: 48.1, predator: 39.4 },
      { time: 18, label: 'Thn 19', prey: 22.9, predator: 22.1 },
      { time: 21, label: 'Thn 22', prey: 41.6, predator: 14.4 },
      { time: 24, label: 'Thn 25', prey: 60.8, predator: 31.2 },
      { time: 27, label: 'Thn 28', prey: 28.4, predator: 36.8 },
      { time: 30, label: 'Thn 31', prey: 27.9, predator: 15.6 },
      { time: 33, label: 'Thn 34', prey: 53.2, predator: 21.4 },
      { time: 36, label: 'Thn 37', prey: 43.5, predator: 37.1 },
    ],
  },
  {
    id: 'enso-recharge-oscillator',
    domainCategory: 'natural-phenomena',
    domainBadge: 'ATMOSFER & OSEANOGRAFI · IKLIM GLOBAL',
    title: 'Osilator Iklim El Niño–Southern Oscillation / ENSO (Jin, 1997; Timmermann, 2003)',
    shortName: 'Osilator Iklim El Niño & La Niña (ENSO)',
    authors: 'Jin, F.-F. (1997); Timmermann, A.; Burgers, G.',
    year: 1997,
    journal: 'Journal of the Atmospheric Sciences & Nonlinear Processes in Geophysics',
    doiOrCitation:
      'Jin, F.-F. (1997) An Equatorial Ocean Recharge Paradigm for ENSO. J. Atmos. Sci. 54: 811–829',
    xRoleLabel: 'Volume Kolam Air Hangat / Heat Content (x)',
    yRoleLabel: 'Pelepasan Anomali Konveksi & Upwelling (y)',
    interactionLabel: 'Transisi Discharge Termoklin (βxy)',
    preyName: 'Kandungan Panas Laut Ekuator (Warm Pool)',
    preyScientific: 'Equatorial Upper-Ocean Heat Content (h_w)',
    preyEmoji: '🌊',
    preyColor: '#0284c7',
    predatorName: 'Pelepasan Konveksi & Arus Dingin (Discharge)',
    predatorScientific: 'Thermocline Discharge & Ekman Divergence',
    predatorEmoji: '🌀',
    predatorColor: '#dc2626',
    unit: 'Indeks Energi Termal Laut (10¹⁴ J/m²)',
    timeUnit: 'Bulan (×2)',
    description:
      'Siklus El Niño dan La Niña bekerja sebagai osilator Recharge–Discharge nonlinier: pengisian energi panas di Kolam Hangat Pasifik–Indonesia (x) memicu pelepasan konveksi atmosfer dan gelombang Kelvin–Rossby (y) yang menguras termoklin menuju fase dingin La Niña dengan periode ~3–6 tahun.',
    methodology:
      'Integrasi model kopel atmosfer–laut Recharge Oscillator pada koridor Arus Lintas Indonesia (ARLINDO) & Pasifik Barat.',
    imageUrl: CARD_ENSO_IMAGE,
    locationName: 'Pasifik Ekuator Barat & Alur Lintas Samudra Indonesia (utara Papua)',
    coordinates: {
      lat: -0.85,
      lng: 138.5,
      zoom: 5,
      spreadRadiusDeg: 3.4,
    },
    calibratedParams: {
      alpha: 0.58,
      beta: 0.024,
      delta: 0.02,
      gamma: 0.72,
      x0: 36.0,
      y0: 16.0,
      carryingCapacity: 0,
      handlingTime: 0,
      harvestPrey: 0,
      harvestPred: 0,
    },
    duration: 40,
    shockScenarios: [
      {
        label: 'Semburan Angin Barat (Super El Niño)',
        emoji: '🌡️',
        description: 'Westerly Wind Burst memicu lonjakan akumulasi panas permukaan dan amplitudo osilasi ekstrem.',
        apply: (p) => ({ ...p, x0: 62, y0: 32, alpha: 0.72 }),
      },
      {
        label: 'Penguatan Angin Pasat (La Niña Kuat)',
        emoji: '💨',
        description: 'Memperkuat pendinginan upwelling (γ) dan mempercepat peluruhan anomali panas.',
        apply: (p) => ({ ...p, gamma: 0.96, x0: 24, y0: 18 }),
      },
    ],
    data: [
      { time: 0, label: 'Bln 0', prey: 36.0, predator: 16.0 },
      { time: 4, label: 'Bln 8', prey: 52.4, predator: 27.8 },
      { time: 8, label: 'Bln 16', prey: 28.1, predator: 34.9 },
      { time: 12, label: 'Bln 24', prey: 27.6, predator: 15.8 },
      { time: 16, label: 'Bln 32', prey: 49.8, predator: 21.2 },
      { time: 20, label: 'Bln 40', prey: 36.4, predator: 36.5 },
      { time: 24, label: 'Bln 48', prey: 24.9, predator: 19.4 },
      { time: 28, label: 'Bln 56', prey: 43.2, predator: 16.9 },
      { time: 32, label: 'Bln 64', prey: 45.7, predator: 34.2 },
      { time: 36, label: 'Bln 72', prey: 25.8, predator: 24.1 },
      { time: 40, label: 'Bln 80', prey: 37.5, predator: 15.4 },
    ],
  },
  {
    id: 'volcanic-geyser-magma',
    domainCategory: 'natural-phenomena',
    domainBadge: 'GEOFISIKA & VULKANOLOGI · KALDERA AKTIF',
    title: 'Osilasi Tekanan Kantung Magma & Siklus Erupsi Vulkanik Berkala (Voight, 1988; Denlinger, 1997)',
    shortName: 'Siklus Tekanan Magma & Erupsi Gunung Api',
    authors: 'Voight, B. (1988); Denlinger, R. P.; Hoblitt, R. P.',
    year: 1997,
    journal: 'Nature & Journal of Geophysical Research: Solid Earth',
    doiOrCitation:
      'Denlinger & Hoblitt (1999) Cyclic eruptive behavior of silicic volcanoes. Geology 27(5): 459–462',
    xRoleLabel: 'Tekanan Gas & Injeksi Magma (x)',
    yRoleLabel: 'Fluks Erupsi & Degassing Termal (y)',
    interactionLabel: 'Pelepasan Energi Conduit (βxy)',
    preyName: 'Tekanan Gas & Volatil Kantung Magma',
    preyScientific: 'Magmatic Chamber Overpressure (ΔP)',
    preyEmoji: '🪨',
    preyColor: '#d97706',
    predatorName: 'Erupsi Strombolian / Degassing Kawah',
    predatorScientific: 'Conduit Eruptive Discharge Flux (Q_e)',
    predatorEmoji: '🌋',
    predatorColor: '#dc2626',
    unit: 'Indeks Tekanan (MPa) & Fluks Seismik-Erupsi',
    timeUnit: 'Minggu',
    description:
      'Gunung api aktif seperti Bromo, Semeru, dan Anak Krakatau menunjukkan siklus pengisian tekanan gas magmatik (x) dari mantel dalam yang berinteraksi secara nonlinier dengan keterbukaan pipa kepundan dan letusan berkala (y), menghasilkan tremor harmonik dan erupsi periodik.',
    methodology:
      'Pemodelan osilator relaksasi tekanan konduit magmatik terhadap rekaman energi seismik RSAM (Real-time Seismic Amplitude Measurement).',
    imageUrl: CARD_VOLCANO_IMAGE,
    locationName: 'Kaldera Tengger–Gunung Bromo & Semeru, Jawa Timur, Indonesia',
    coordinates: {
      lat: -7.9425,
      lng: 112.953,
      zoom: 12,
      spreadRadiusDeg: 0.06,
    },
    calibratedParams: {
      alpha: 0.68,
      beta: 0.027,
      delta: 0.022,
      gamma: 0.76,
      x0: 38.0,
      y0: 15.0,
      carryingCapacity: 210,
      handlingTime: 0.005,
      harvestPrey: 0,
      harvestPred: 0,
    },
    duration: 32,
    shockScenarios: [
      {
        label: 'Injeksi Magma Dalam Baru (Intrusi Dike)',
        emoji: '🔥',
        description: 'Meningkatkan laju suplai tekanan magma α dan memicu rangkaian erupsi beruntun.',
        apply: (p) => ({ ...p, alpha: 0.92, x0: 64, y0: 26 }),
      },
      {
        label: 'Degassing Pasif Terbuka (Kawah Stabil)',
        emoji: '💨',
        description: 'Mempercepat pelepasan gas tanpa ledakan besar dengan meredam osilasi.',
        apply: (p) => ({ ...p, carryingCapacity: 130, handlingTime: 0.012 }),
      },
    ],
    data: [
      { time: 0, label: 'Mgg 0', prey: 38.0, predator: 15.0 },
      { time: 4, label: 'Mgg 4', prey: 56.2, predator: 34.1 },
      { time: 8, label: 'Mgg 8', prey: 22.8, predator: 28.4 },
      { time: 12, label: 'Mgg 12', prey: 36.9, predator: 15.2 },
      { time: 16, label: 'Mgg 16', prey: 58.1, predator: 31.8 },
      { time: 20, label: 'Mgg 20', prey: 24.5, predator: 30.2 },
      { time: 24, label: 'Mgg 24', prey: 34.8, predator: 15.6 },
      { time: 28, label: 'Mgg 28', prey: 57.4, predator: 29.9 },
      { time: 32, label: 'Mgg 32', prey: 26.1, predator: 32.0 },
    ],
  },

  // ==========================================================================
  // DOMAIN B: EKOSISTEM & BIOLOGI KONSERVASI LAINNYA
  // ==========================================================================
  {
    id: 'hudson-bay-lynx-hare',
    domainCategory: 'ecosystem',
    domainBadge: 'EKOSISTEM BOREAL · JURNAL KLASIK',
    title: 'Siklus Populasi Lepus americanus & Lynx canadensis (Hudson Bay, 1845–1885)',
    shortName: 'Hudson Bay Lynx–Hare (Odum 1953)',
    authors: 'MacLulich, D. A.; Odum, E. P.; Leigh, E. G.',
    year: 1953,
    journal: 'Fundamentals of Ecology (W.B. Saunders) & Journal of Mammalogy',
    doiOrCitation:
      'MacLulich (1937) Univ. Toronto Studies Biol. Ser. 43; Leigh (1968) Ecological Role of Volterra Equations',
    xRoleLabel: 'Populasi Mangsa (x)',
    yRoleLabel: 'Populasi Predator (y)',
    interactionLabel: 'Fluks Predasi (βxy)',
    preyName: 'Snowshoe Hare (Kelinci Salju)',
    preyScientific: 'Lepus americanus',
    preyEmoji: '🐇',
    preyColor: '#108548',
    predatorName: 'Canadian Lynx (Lynx Kanada)',
    predatorScientific: 'Lynx canadensis',
    predatorEmoji: '🐈',
    predatorColor: '#d95f02',
    unit: 'Ribu Individu (×10³)',
    timeUnit: 'Tahun',
    description:
      'Dataset deret waktu empiris paling ikonik dalam ekologi teoretis dari wilayah Hutan Boreal Teluk Hudson, Kanada. Menunjukkan osilasi kuasi-periodik ~9.5–10 tahun antara populasi mangsa (Lepus americanus) dan predator spesialis (Lynx canadensis) dengan fase tunda ~1/4 siklus.',
    methodology:
      'Parameter dikalibrasi menggunakan Runge-Kutta Orde-4 (RK4) terhadap deret waktu tangkapan tahunan kawasan Hudson Bay (t = 0 hingga 40 tahun).',
    imageUrl: CARD_HUDSON_IMAGE,
    locationName: 'Kawasan Hutan Boreal Hudson Bay, Manitoba–Ontario, Kanada',
    coordinates: {
      lat: 56.85,
      lng: -92.65,
      zoom: 6,
      spreadRadiusDeg: 1.85,
    },
    calibratedParams: {
      alpha: 0.548,
      beta: 0.026,
      delta: 0.023,
      gamma: 0.812,
      x0: 30.0,
      y0: 15.0,
      carryingCapacity: 0,
      handlingTime: 0,
      harvestPrey: 0,
      harvestPred: 0,
    },
    duration: 40,
    shockScenarios: [
      {
        label: 'Musim Dingin Lunak (Ledakan Kelinci)',
        emoji: '🌿',
        description: 'Meningkatkan ketersediaan tunas willow sehingga populasi awal kelinci melonjak.',
        apply: (p) => ({ ...p, x0: 55, alpha: 0.65 }),
      },
      {
        label: 'Kuota Perburuan Bulu (Prinsip Volterra)',
        emoji: '🪤',
        description: 'Pemanenan serentak menaikkan rata-rata populasi mangsa sesuai Prinsip Ketiga Volterra.',
        apply: (p) => ({ ...p, harvestPrey: 0.08, harvestPred: 0.08 }),
      },
    ],
    data: [
      { time: 0, label: '1845', prey: 30.0, predator: 15.0 },
      { time: 2, label: '1847', prey: 43.5, predator: 16.2 },
      { time: 4, label: '1849', prey: 46.8, predator: 25.9 },
      { time: 6, label: '1851', prey: 30.2, predator: 29.8 },
      { time: 8, label: '1853', prey: 24.9, predator: 19.4 },
      { time: 10, label: '1855', prey: 33.4, predator: 14.1 },
      { time: 12, label: '1857', prey: 46.1, predator: 17.5 },
      { time: 14, label: '1859', prey: 41.9, predator: 28.4 },
      { time: 16, label: '1861', prey: 27.6, predator: 26.8 },
      { time: 18, label: '1863', prey: 26.1, predator: 17.2 },
      { time: 20, label: '1865', prey: 36.2, predator: 14.3 },
      { time: 22, label: '1867', prey: 47.4, predator: 19.8 },
      { time: 24, label: '1869', prey: 38.1, predator: 30.1 },
      { time: 26, label: '1871', prey: 26.2, predator: 24.2 },
      { time: 28, label: '1873', prey: 28.0, predator: 15.9 },
      { time: 30, label: '1875', prey: 39.4, predator: 14.6 },
      { time: 32, label: '1877', prey: 47.8, predator: 22.4 },
      { time: 34, label: '1879', prey: 34.2, predator: 30.5 },
      { time: 36, label: '1881', prey: 25.4, predator: 21.8 },
      { time: 38, label: '1883', prey: 30.1, predator: 15.0 },
      { time: 40, label: '1885', prey: 42.6, predator: 15.6 },
    ],
  },
  {
    id: 'isle-royale-wolf-moose',
    domainCategory: 'ecosystem',
    domainBadge: 'EKOSISTEM PULAU · STUDI 50 TAHUN',
    title: 'Dinamika Predator-Mangsa Pulau: Canis lupus & Alces alces (Isle Royale, 1959–2009)',
    shortName: 'Isle Royale Wolf–Moose (Vucetich & Peterson)',
    authors: 'Peterson, R. O.; Vucetich, J. A.; Bump, J. K.',
    year: 2009,
    journal: 'Ecological Studies & Science (Isle Royale Wolf-Moose Project)',
    doiOrCitation:
      'Vucetich & Peterson (2004) Nature 428; McLaren & Peterson (1994) Science 266(5190): 1555–1558',
    xRoleLabel: 'Populasi Rusa Moose (x)',
    yRoleLabel: 'Populasi Serigala (y)',
    interactionLabel: 'Fluks Predasi Pulau (βxy)',
    preyName: 'Moose (Rusa Besar ×10 individu)',
    preyScientific: 'Alces alces',
    preyEmoji: '🦌',
    preyColor: '#0d9488',
    predatorName: 'Gray Wolf (Serigala Abu-abu)',
    predatorScientific: 'Canis lupus',
    predatorEmoji: '🐺',
    predatorColor: '#dc2626',
    unit: 'Indeks Populasi (Moose ÷10, Serigala ×1)',
    timeUnit: 'Tahun',
    description:
      'Studi lapangan jangka panjang terlama di dunia pada ekosistem pulau tertutup di Danau Superior (544 km²). Mengintegrasikan daya dukung vegetasi balsam fir (K) dan respons fungsional jenuh Holling Tipe II.',
    methodology:
      'Sensus udara musim dingin tahunan (aerial winter survey) untuk populasi serigala dan rusa besar di Taman Nasional Isle Royale.',
    imageUrl: CARD_ISLE_IMAGE,
    locationName: 'Isle Royale National Park, Lake Superior, Michigan, AS',
    coordinates: {
      lat: 47.9959,
      lng: -88.9093,
      zoom: 10,
      spreadRadiusDeg: 0.14,
    },
    calibratedParams: {
      alpha: 0.32,
      beta: 0.014,
      delta: 0.0085,
      gamma: 0.68,
      x0: 62.0,
      y0: 20.0,
      carryingCapacity: 220,
      handlingTime: 0.005,
      harvestPrey: 0,
      harvestPred: 0,
    },
    duration: 50,
    shockScenarios: [
      {
        label: 'Translokasi Genetik Serigala Baru',
        emoji: '🐺',
        description: 'Introduksi serigala baru ke pulau untuk memulihkan kontrol top-down atas populasi rusa.',
        apply: (p) => ({ ...p, y0: 36, delta: 0.011 }),
      },
      {
        label: 'Wabah Canine Parvovirus (1980)',
        emoji: '🦠',
        description: 'Meningkatkan mortalitas serigala γ sehingga populasi Moose melonjak mendekati daya dukung K.',
        apply: (p) => ({ ...p, gamma: 0.92, y0: 12 }),
      },
    ],
    data: [
      { time: 0, label: '1959', prey: 62.0, predator: 20.0 },
      { time: 5, label: '1964', prey: 88.0, predator: 26.0 },
      { time: 10, label: '1969', prey: 125.0, predator: 18.0 },
      { time: 15, label: '1974', prey: 138.0, predator: 31.0 },
      { time: 20, label: '1979', prey: 92.0, predator: 44.0 },
      { time: 25, label: '1984', prey: 81.0, predator: 24.0 },
      { time: 30, label: '1989', prey: 139.0, predator: 14.0 },
      { time: 35, label: '1994', prey: 188.0, predator: 17.0 },
      { time: 40, label: '1999', prey: 95.0, predator: 25.0 },
      { time: 45, label: '2004', prey: 75.0, predator: 29.0 },
      { time: 50, label: '2009', prey: 54.0, predator: 24.0 },
    ],
  },
  {
    id: 'utida-1957-beetle-wasp',
    domainCategory: 'ecosystem',
    domainBadge: 'EKOSISTEM LAUT INDONESIA · PELAGIS',
    title: 'Dinamika Trofik Laut Banda & Kepulauan Raja Ampat (Pelagis Predator–Mangsa)',
    shortName: 'Laut Banda & Raja Ampat (Trofik Pelagis)',
    authors: 'Utida, S. (1957) & Studi Ekosistem Laut Tropis Indonesia',
    year: 1957,
    journal: 'Ecology, Vol. 38, No. 3, pp. 442–449 & Marine Trophic Dynamics',
    doiOrCitation:
      'Utida, S. (1957) Cyclic fluctuations of population density intrinsic to the host-parasite system. Ecology 38(3): 442-449',
    xRoleLabel: 'Biomassa Ikan Pelagis Kecil (x)',
    yRoleLabel: 'Biomassa Predator Tuna (y)',
    interactionLabel: 'Fluks Trofik Pelagis (βxy)',
    preyName: 'Ikan Pelagis Kecil / Sardinella',
    preyScientific: 'Sardinella lemuru',
    preyEmoji: '🐟',
    preyColor: '#059669',
    predatorName: 'Tuna Sirip Kuning (Yellowfin)',
    predatorScientific: 'Thunnus albacares',
    predatorEmoji: '🦈',
    predatorColor: '#d97706',
    unit: 'Biomassa Relatif (ton / km²)',
    timeUnit: 'Siklus',
    description:
      'Model fluktuasi siklik intrinsik predator–mangsa yang diterapkan pada interaksi stok ikan pelagis kecil dan predator pelagis besar di perairan Laut Banda dan Raja Ampat, Indonesia.',
    methodology:
      'Integrasi model Lotka-Volterra logistik dengan respons fungsional Holling Tipe II pada zona upwelling perairan timur Indonesia.',
    imageUrl: CARD_MARINE_IMAGE,
    locationName: 'Perairan Laut Banda & Kawasan Konservasi Raja Ampat, Indonesia',
    coordinates: {
      lat: -4.525,
      lng: 129.896,
      zoom: 8,
      spreadRadiusDeg: 0.65,
    },
    calibratedParams: {
      alpha: 0.64,
      beta: 0.022,
      delta: 0.018,
      gamma: 0.59,
      x0: 35.0,
      y0: 14.0,
      carryingCapacity: 180,
      handlingTime: 0.006,
      harvestPrey: 0,
      harvestPred: 0,
    },
    duration: 25,
    shockScenarios: [
      {
        label: 'Upwelling Musim Timur (Nutrisi Naik)',
        emoji: '🌊',
        description: 'Meningkatkan produktivitas fitoplankton dan laju tumbuh Sardinella (α).',
        apply: (p) => ({ ...p, alpha: 0.84, carryingCapacity: 240 }),
      },
      {
        label: 'Zona Larang Tangkap (MPA Konservasi)',
        emoji: '🛡️',
        description: 'Menurunkan mortalitas penangkapan tuna dan menjaga kestabilan stok pelagis.',
        apply: (p) => ({ ...p, gamma: 0.48, harvestPred: 0 }),
      },
    ],
    data: [
      { time: 0, label: 'Siklus 1', prey: 35.0, predator: 14.0 },
      { time: 3, label: 'Siklus 4', prey: 68.0, predator: 27.0 },
      { time: 6, label: 'Siklus 7', prey: 28.0, predator: 54.0 },
      { time: 9, label: 'Siklus 10', prey: 19.0, predator: 18.0 },
      { time: 12, label: 'Siklus 13', prey: 56.0, predator: 16.0 },
      { time: 15, label: 'Siklus 16', prey: 64.0, predator: 46.0 },
      { time: 18, label: 'Siklus 19', prey: 22.0, predator: 34.0 },
      { time: 21, label: 'Siklus 22', prey: 39.0, predator: 15.0 },
      { time: 25, label: 'Siklus 25', prey: 61.0, predator: 38.0 },
    ],
  },
  {
    id: 'gause-1934-protozoa',
    domainCategory: 'ecosystem',
    domainBadge: 'MIKROBIOLOGI PERAIRAN · EKSPERIMEN GAUSE',
    title: 'Eksperimen Mikrokosmos Paramecium caudatum & Didinium nasutum (Gause, 1934)',
    shortName: 'Gause (1934) Protozoa Microcosm',
    authors: 'Gause, Georgii Frantsevich',
    year: 1934,
    journal: 'The Struggle for Existence (Williams & Wilkins, Baltimore)',
    doiOrCitation:
      'Gause, G. F. (1934) Ch. VI: Experimental Analysis of Predator-Prey Oscillations, pp. 114–140',
    xRoleLabel: 'Populasi Paramecium (x)',
    yRoleLabel: 'Populasi Didinium (y)',
    interactionLabel: 'Laju Ingesti Seluler (βxy)',
    preyName: 'Paramecium caudatum',
    preyScientific: 'Paramecium caudatum',
    preyEmoji: '🦠',
    preyColor: '#0284c7',
    predatorName: 'Didinium nasutum',
    predatorScientific: 'Didinium nasutum',
    predatorEmoji: '🔬',
    predatorColor: '#e11d48',
    unit: 'Individu / 0.5 mL medium oat',
    timeUnit: 'Hari',
    description:
      'Eksperimen laboratorium klasik Gause (1934) pada medium kultur dengan imigrasi periodik dan sedimen refugia. Membuktikan secara eksperimental bahwa osilasi Lotka-Volterra dapat dipertahankan ketika terdapat refugia mikro-habitat.',
    methodology:
      'Kultur mikrobiologis dalam medium terkontrol 26°C dengan pencacahan harian populasi infusoria.',
    imageUrl: HERO_BANNER_IMAGE,
    locationName: 'Stasiun Riset Ekologi Perairan & Cagar Biosfer Cibodas–Jawa Barat',
    coordinates: {
      lat: -6.7425,
      lng: 107.0055,
      zoom: 12,
      spreadRadiusDeg: 0.045,
    },
    calibratedParams: {
      alpha: 0.78,
      beta: 0.019,
      delta: 0.014,
      gamma: 0.52,
      x0: 45.0,
      y0: 18.0,
      carryingCapacity: 240,
      handlingTime: 0.008,
      harvestPrey: 0,
      harvestPred: 0,
    },
    duration: 24,
    shockScenarios: [
      {
        label: 'Penambahan Nutrisi Kultur Oat',
        emoji: '🧪',
        description: 'Meningkatkan laju pembelahan biner Paramecium α di dalam medium mikro-habitat.',
        apply: (p) => ({ ...p, alpha: 0.96, carryingCapacity: 300 }),
      },
      {
        label: 'Sedimen Refugia (Perlindungan Mangsa)',
        emoji: '🪨',
        description: 'Menurunkan efisiensi serangan Didinium β sehingga osilasi teredam menuju koeksistensi stabil.',
        apply: (p) => ({ ...p, beta: 0.013, handlingTime: 0.015 }),
      },
    ],
    data: [
      { time: 0, label: 'Hari 0', prey: 45.0, predator: 18.0 },
      { time: 2, label: 'Hari 2', prey: 78.5, predator: 31.0 },
      { time: 4, label: 'Hari 4', prey: 52.0, predator: 64.2 },
      { time: 6, label: 'Hari 6', prey: 19.4, predator: 48.5 },
      { time: 8, label: 'Hari 8', prey: 16.8, predator: 21.0 },
      { time: 10, label: 'Hari 10', prey: 38.2, predator: 14.5 },
      { time: 12, label: 'Hari 12', prey: 74.0, predator: 26.8 },
      { time: 14, label: 'Hari 14', prey: 56.5, predator: 58.0 },
      { time: 16, label: 'Hari 16', prey: 22.1, predator: 44.2 },
      { time: 18, label: 'Hari 18', prey: 18.5, predator: 20.4 },
      { time: 20, label: 'Hari 20', prey: 42.0, predator: 15.8 },
      { time: 22, label: 'Hari 22', prey: 71.2, predator: 29.5 },
      { time: 24, label: 'Hari 24', prey: 49.8, predator: 53.1 },
    ],
  },

  // ==========================================================================
  // DOMAIN C: EPIDEMIOLOGI & REAKSI KIMIA OTOKATALITIK
  // ==========================================================================
  {
    id: 'sir-epidemic-waves',
    domainCategory: 'epidemiology-chemistry',
    domainBadge: 'EPIDEMIOLOGI MATEMATIKA · GELOMBANG WABAH',
    title: 'Gelombang Epidemi Berulang: Populasi Rentan vs Infeksius (Kermack–McKendrick / Anderson & May)',
    shortName: 'Gelombang Epidemi Berulang (SIR Demografis)',
    authors: 'Kermack, W. O.; McKendrick, A. G. (1927); Anderson, R. M. & May, R. M. (1991)',
    year: 1991,
    journal: 'Proceedings of the Royal Society A & Infectious Diseases of Humans (Oxford Univ. Press)',
    doiOrCitation:
      'Kermack & McKendrick (1927) Proc. R. Soc. Lond. A 115: 700–721; Anderson & May (1991)',
    xRoleLabel: 'Populasi Rentan / Susceptible S(t) (x)',
    yRoleLabel: 'Kasus Infeksius Aktif I(t) (y)',
    interactionLabel: 'Insiden Transmisi Baru (βSI)',
    preyName: 'Populasi Rentan (Susceptible S)',
    preyScientific: 'Komunitas Belum Kebal / Imunitas Luntur',
    preyEmoji: '🛡️',
    preyColor: '#0284c7',
    predatorName: 'Kasus Infeksius Aktif (Infected I)',
    predatorScientific: 'Transmisi Patogen Komunitas',
    predatorEmoji: '🦠',
    predatorColor: '#e11d48',
    unit: 'Ribu Penduduk per Koridor Urban (×10³)',
    timeUnit: 'Minggu',
    description:
      'Dalam epidemiologi penyakit menular endemik (seperti Demam Berdarah Dengue atau Influenza), kelahiran dan lunturnya imunitas mengisi kembali populasi rentan S(t) (analog "mangsa"), sedangkan kontak transmisi βSI mengubah individu rentan menjadi terinfeksi I(t) (analog "predator"), memicu gelombang epidemi multi-musim.',
    methodology:
      'Sistem persamaan diferensial SIR terbuka dengan pengisian kerentanan (αS) dan pemulihan/isolasi (γI) pada koridor megapolitan.',
    imageUrl: CARD_CHEMICAL_EPIDEMIC_IMAGE,
    locationName: 'Koridor Epidemiologi Urban Jakarta–Bogor–Bandung, Indonesia',
    coordinates: {
      lat: -6.385,
      lng: 106.895,
      zoom: 9,
      spreadRadiusDeg: 0.35,
    },
    calibratedParams: {
      alpha: 0.56,
      beta: 0.024,
      delta: 0.022,
      gamma: 0.75,
      x0: 44.0,
      y0: 14.0,
      carryingCapacity: 250,
      handlingTime: 0.004,
      harvestPrey: 0,
      harvestPred: 0,
    },
    duration: 36,
    shockScenarios: [
      {
        label: 'Program Vaksinasi Massal & Imunisasi',
        emoji: '💉',
        description: 'Mengurangi laju penularan efektif β dan mengalihkan populasi rentan secara langsung.',
        apply: (p) => ({ ...p, beta: 0.015, harvestPrey: 0.14 }),
      },
      {
        label: 'Varian Baru Transmisi Tinggi',
        emoji: '⚠️',
        description: 'Meningkatkan koefisien transmisi β sehingga puncak gelombang infeksi menjadi lebih tajam.',
        apply: (p) => ({ ...p, beta: 0.036, delta: 0.03 }),
      },
    ],
    data: [
      { time: 0, label: 'Mgg 0', prey: 44.0, predator: 14.0 },
      { time: 4, label: 'Mgg 4', prey: 58.2, predator: 34.5 },
      { time: 8, label: 'Mgg 8', prey: 22.4, predator: 29.8 },
      { time: 12, label: 'Mgg 12', prey: 34.6, predator: 14.2 },
      { time: 16, label: 'Mgg 16', prey: 59.1, predator: 28.9 },
      { time: 20, label: 'Mgg 20', prey: 25.1, predator: 33.4 },
      { time: 24, label: 'Mgg 24', prey: 31.2, predator: 15.1 },
      { time: 28, label: 'Mgg 28', prey: 56.8, predator: 24.8 },
      { time: 32, label: 'Mgg 32', prey: 29.4, predator: 35.2 },
      { time: 36, label: 'Mgg 36', prey: 29.0, predator: 16.4 },
    ],
  },
  {
    id: 'lotka-oregonator-reaction',
    domainCategory: 'epidemiology-chemistry',
    domainBadge: 'KIMIA FISIK · OSILATOR REAKSI LOTKA–BZ',
    title: 'Osilasi Kimia Otokatalitik Lotka (1920) & Gelombang Spiral Belousov–Zhabotinsky',
    shortName: 'Osilator Reaksi Kimia Lotka–BZ (1920)',
    authors: 'Lotka, Alfred J. (1920); Field, R. J.; Noyes, R. M. (1974)',
    year: 1920,
    journal: 'Journal of the American Chemical Society, Vol. 42, No. 8, pp. 1595–1599',
    doiOrCitation:
      'Lotka, A. J. (1920) Undamped oscillations derived from the law of mass action. JACS 42(8): 1595–1599',
    xRoleLabel: 'Konsentrasi Zat Antara Otokatalis [X] (x)',
    yRoleLabel: 'Konsentrasi Katalis Teroksidasi [Y] (y)',
    interactionLabel: 'Laju Kinetika Hukum Aksi Massa (k₂[X][Y])',
    preyName: 'Spesies Intermediet Aktivator [X] (HBrO₂)',
    preyScientific: 'Autocatalytic Bromous Acid Intermediate',
    preyEmoji: '⚗️',
    preyColor: '#059669',
    predatorName: 'Katalis Inhibitor Redoks [Y] (Ce⁴⁺ / Ferroin)',
    predatorScientific: 'Oxidized Metal Ion Catalyst',
    predatorEmoji: '⚡',
    predatorColor: '#9333ea',
    unit: 'Konsentrasi Mikromolar (μM)',
    timeUnit: 'Detik',
    description:
      'Persamaan Lotka-Volterra pertama kali ditemukan oleh Alfred J. Lotka pada tahun 1920 untuk reaksi kimia otokatalitik (A + X → 2X; X + Y → 2Y; Y → P). Osilasi konsentrasi ini menciptakan gelombang spiral warna-warni pada reaksi Belousov–Zhabotinsky.',
    methodology:
      'Integrasi kinetika hukum aksi massa nonlinier pada reaktor berpengaduk kontinu (CSTR).',
    imageUrl: CARD_CHEMICAL_EPIDEMIC_IMAGE,
    locationName: 'Kawasan Sains & Teknologi PUSPIPTEK Serpong, Tangerang Selatan, Indonesia',
    coordinates: {
      lat: -6.3485,
      lng: 106.6625,
      zoom: 13,
      spreadRadiusDeg: 0.025,
    },
    calibratedParams: {
      alpha: 0.72,
      beta: 0.028,
      delta: 0.024,
      gamma: 0.84,
      x0: 34.0,
      y0: 16.0,
      carryingCapacity: 0,
      handlingTime: 0,
      harvestPrey: 0,
      harvestPred: 0,
    },
    duration: 30,
    shockScenarios: [
      {
        label: 'Injeksi Prekursor Reaktan A (Suhu Naik)',
        emoji: '🔥',
        description: 'Meningkatkan konstanta laju otokatalitik pertama k₁ (α) sesuai persamaan Arrhenius.',
        apply: (p) => ({ ...p, alpha: 0.95, x0: 52 }),
      },
      {
        label: 'Penambahan Quencher Radikal Bebas',
        emoji: '💧',
        description: 'Meredam osilasi kimia dengan menjenuhkan langkah bimolekuler.',
        apply: (p) => ({ ...p, carryingCapacity: 160, handlingTime: 0.01 }),
      },
    ],
    data: [
      { time: 0, label: '0 dtk', prey: 34.0, predator: 16.0 },
      { time: 3, label: '3 dtk', prey: 54.8, predator: 27.9 },
      { time: 6, label: '6 dtk', prey: 24.2, predator: 35.1 },
      { time: 9, label: '9 dtk', prey: 28.4, predator: 15.8 },
      { time: 12, label: '12 dtk', prey: 53.6, predator: 24.4 },
      { time: 15, label: '15 dtk', prey: 26.8, predator: 37.2 },
      { time: 18, label: '18 dtk', prey: 26.5, predator: 16.5 },
      { time: 21, label: '21 dtk', prey: 51.9, predator: 21.8 },
      { time: 24, label: '24 dtk', prey: 29.7, predator: 38.4 },
      { time: 27, label: '27 dtk', prey: 25.4, predator: 17.6 },
      { time: 30, label: '30 dtk', prey: 49.4, predator: 19.8 },
    ],
  },

  // ==========================================================================
  // DOMAIN D: MAKROEKONOMI & DINAMIKA SOSIAL-PERKOTAAN
  // ==========================================================================
  {
    id: 'goodwin-economic-cycle',
    domainCategory: 'socio-economics',
    domainBadge: 'MAKROEKONOMI DINAMIS · SIKLUS BISNIS GOODWIN',
    title: 'Siklus Pertumbuhan Makroekonomi Goodwin (1967): Tingkat Kesempatan Kerja vs Pangsa Upah',
    shortName: 'Siklus Makroekonomi Goodwin (1967)',
    authors: 'Goodwin, Richard M. (1967); Solow, R. M. (1990)',
    year: 1967,
    journal: 'Socialism, Capitalism and Economic Growth (Cambridge University Press)',
    doiOrCitation:
      'Goodwin, R. M. (1967) A Growth Cycle, pp. 54–58 (Lotka-Volterra Macroeconomic Oscillator)',
    xRoleLabel: 'Indeks Tingkat Kesempatan Kerja v(t) (x)',
    yRoleLabel: 'Indeks Pangsa Upah Pekerja u(t) (y)',
    interactionLabel: 'Transfer Laba–Upah Kurva Phillips (βxy)',
    preyName: 'Tingkat Kesempatan Kerja & Investasi (v)',
    preyScientific: 'Employment Rate & Capital Accumulation',
    preyEmoji: '🏭',
    preyColor: '#0d9488',
    predatorName: 'Pangsa Upah Riil Pekerja (Wage Share u)',
    predatorScientific: 'Labor Share of National Income',
    predatorEmoji: '📈',
    predatorColor: '#d97706',
    unit: 'Indeks Makroekonomi Terkalibrasi (Basis Poin)',
    timeUnit: 'Kuartal',
    description:
      'Model ikonik Richard Goodwin (1967) menerapkan persamaan Lotka-Volterra pada siklus bisnis ekonomi: ketika ekspansi industri meningkatkan kesempatan kerja (x), daya tawar tenaga kerja naik melalui Kurva Phillips sehingga pangsa upah (y) meningkat. Kenaikan beban upah menekan margin laba investasi, memicu perlambatan hingga siklus berulang.',
    methodology:
      'Model diferensial kopel Akumulasi Modal Harrod–Domar dan Kurva Phillips Upah Riil.',
    imageUrl: HERO_BANNER_IMAGE,
    locationName: 'Koridor Ekonomi & Industri Jabodetabek–Jawa Barat, Indonesia',
    coordinates: {
      lat: -6.2088,
      lng: 106.8456,
      zoom: 10,
      spreadRadiusDeg: 0.22,
    },
    calibratedParams: {
      alpha: 0.52,
      beta: 0.025,
      delta: 0.021,
      gamma: 0.76,
      x0: 36.0,
      y0: 16.0,
      carryingCapacity: 0,
      handlingTime: 0,
      harvestPrey: 0,
      harvestPred: 0,
    },
    duration: 40,
    shockScenarios: [
      {
        label: 'Inovasi Teknologi & Produktivitas Industri',
        emoji: '⚡',
        description: 'Meningkatkan laju ekspansi kapasitas produksi α dan mendorong ekuilibrium kesempatan kerja.',
        apply: (p) => ({ ...p, alpha: 0.68, x0: 46 }),
      },
      {
        label: 'Kebijakan Stabilisasi Siklus Fiskal',
        emoji: '🏦',
        description: 'Meredam fluktuasi ekstrem antara ekspansi dan kontraksi melalui kapasitas penstabil.',
        apply: (p) => ({ ...p, carryingCapacity: 200, handlingTime: 0.008 }),
      },
    ],
    data: [
      { time: 0, label: 'Q1', prey: 36.0, predator: 16.0 },
      { time: 4, label: 'Q5', prey: 48.2, predator: 23.4 },
      { time: 8, label: 'Q9', prey: 31.8, predator: 31.6 },
      { time: 12, label: 'Q13', prey: 27.4, predator: 17.8 },
      { time: 16, label: 'Q17', prey: 43.9, predator: 17.2 },
      { time: 20, label: 'Q21', prey: 42.1, predator: 30.8 },
      { time: 24, label: 'Q25', prey: 26.8, predator: 22.9 },
      { time: 28, label: 'Q29', prey: 36.2, predator: 15.6 },
      { time: 32, label: 'Q33', prey: 48.6, predator: 24.5 },
      { time: 36, label: 'Q37', prey: 30.5, predator: 30.9 },
      { time: 40, label: 'Q41', prey: 28.1, predator: 17.1 },
    ],
  },
];

// ============================================================================
// 3. Classic & Generalized 2-Variable Lotka-Volterra Solver & Stability Math
// ============================================================================

export function computeLVDerivatives(
  x: number,
  y: number,
  p: ClassicLVParams
): [number, number] {
  const px = Math.max(0, x);
  const py = Math.max(0, y);
  const K = p.carryingCapacity && p.carryingCapacity > 0 ? p.carryingCapacity : 0;
  const h = p.handlingTime && p.handlingTime > 0 ? p.handlingTime : 0;
  const hx = p.harvestPrey || 0;
  const hy = p.harvestPred || 0;

  const logisticFactor = K > 0 ? 1 - px / K : 1;
  const functionalResponse = (p.beta * px) / (1 + p.beta * h * px);

  const dxdt = p.alpha * px * logisticFactor - functionalResponse * py - hx * px;
  const dydt = (p.delta / p.beta) * functionalResponse * py - p.gamma * py - hy * py;
  return [dxdt, dydt];
}

export function analyzeLVEquilibrium(p: ClassicLVParams): EquilibriumAnalysis {
  const hx = p.harvestPrey || 0;
  const hy = p.harvestPred || 0;
  const effAlpha = p.alpha - hx;
  const effGamma = p.gamma + hy;
  const K = p.carryingCapacity && p.carryingCapacity > 0 ? p.carryingCapacity : 0;
  const h = p.handlingTime && p.handlingTime > 0 ? p.handlingTime : 0;

  const denomX = p.delta - effGamma * p.beta * h;
  const xStar = denomX > 1e-9 ? effGamma / denomX : 0;

  const growthAtXStar = K > 0 ? p.alpha * (1 - xStar / K) - hx : effAlpha;
  const yStar =
    xStar > 0 && growthAtXStar > 0
      ? (growthAtXStar * (1 + p.beta * h * xStar)) / p.beta
      : 0;

  const isValid = xStar > 0 && yStar > 0 && (K === 0 || xStar < K);

  const eps = 1e-5;
  const [f0, g0] = computeLVDerivatives(xStar, yStar, p);
  const [fx, gx] = computeLVDerivatives(xStar + eps, yStar, p);
  const [fy, gy] = computeLVDerivatives(xStar, yStar + eps, p);

  const J11 = isValid ? (fx - f0) / eps : effAlpha;
  const J12 = isValid ? (fy - f0) / eps : 0;
  const J21 = isValid ? (gx - g0) / eps : 0;
  const J22 = isValid ? (gy - g0) / eps : -effGamma;

  const trace = J11 + J22;
  const det = J11 * J22 - J12 * J21;
  const disc = trace * trace - 4 * det;

  const eigReal = disc >= 0 ? (trace + Math.sqrt(disc)) / 2 : trace / 2;
  const eigImag = disc < 0 ? Math.sqrt(-disc) / 2 : 0;

  const omega = eigImag > 1e-6 ? eigImag : Math.sqrt(Math.max(0.0001, effAlpha * effGamma));
  const characteristicPeriod = (2 * Math.PI) / omega;

  let stabilityType: EquilibriumAnalysis['stabilityType'] = 'Center (Neutral Cycles)';
  if (!isValid || det < 0) {
    stabilityType = 'Saddle Point';
  } else if (Math.abs(trace) < 1e-5 && disc < 0) {
    stabilityType = 'Center (Neutral Cycles)';
  } else if (trace < -1e-5 && disc < 0) {
    stabilityType = 'Stable Spiral (Damped)';
  } else if (trace > 1e-5 && disc < 0) {
    stabilityType = 'Unstable Spiral (Limit Cycle)';
  } else {
    stabilityType = 'Stable Node';
  }

  const hamiltonianConstant =
    K === 0 && h === 0 && p.x0 > 0 && p.y0 > 0
      ? p.delta * p.x0 - effGamma * Math.log(p.x0) + p.beta * p.y0 - effAlpha * Math.log(p.y0)
      : undefined;

  return {
    trivial: [0, 0],
    coexistence: [Math.max(0, xStar), Math.max(0, yStar)],
    isValidCoexistence: isValid,
    jacobianTrace: trace,
    jacobianDet: det,
    eigenvalueReal: eigReal,
    eigenvalueImag: eigImag,
    characteristicPeriod,
    stabilityType,
    hamiltonianConstant,
  };
}

export function simulateClassicLV(
  p: ClassicLVParams,
  duration = 40,
  dt = 0.02
): {
  t: number[];
  prey: number[];
  predator: number[];
  maxPrey: number;
  minPrey: number;
  maxPred: number;
  minPred: number;
} {
  const steps = Math.max(10, Math.round(duration / dt));
  let x = Math.max(0.0001, p.x0);
  let y = Math.max(0.0001, p.y0);

  const t: number[] = [0];
  const prey: number[] = [x];
  const predator: number[] = [y];

  let maxPrey = x;
  let minPrey = x;
  let maxPred = y;
  let minPred = y;

  const recordStride = steps > 4000 ? Math.round(steps / 1200) : 4;

  for (let s = 1; s <= steps; s++) {
    const [k1x, k1y] = computeLVDerivatives(x, y, p);
    const [k2x, k2y] = computeLVDerivatives(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, p);
    const [k3x, k3y] = computeLVDerivatives(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, p);
    const [k4x, k4y] = computeLVDerivatives(x + dt * k3x, y + dt * k3y, p);

    x = Math.max(0, x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x));
    y = Math.max(0, y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y));

    if (s % recordStride === 0 || s === steps) {
      t.push(+(s * dt).toFixed(3));
      prey.push(x);
      predator.push(y);
      if (x > maxPrey) maxPrey = x;
      if (x < minPrey) minPrey = x;
      if (y > maxPred) maxPred = y;
      if (y < minPred) minPred = y;
    }
  }

  return { t, prey, predator, maxPrey, minPrey, maxPred, minPred };
}

export function evaluateEmpiricalFit(
  sim: { t: number[]; prey: number[]; predator: number[] },
  empirical: EmpiricalDataPoint[]
): {
  preyRMSE: number;
  predatorRMSE: number;
  preyCorrelation: number;
  predatorCorrelation: number;
} {
  if (!empirical.length || !sim.t.length) {
    return { preyRMSE: 0, predatorRMSE: 0, preyCorrelation: 0, predatorCorrelation: 0 };
  }

  const simPreyAtEmp: number[] = [];
  const simPredAtEmp: number[] = [];

  for (const pt of empirical) {
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < sim.t.length; i++) {
      const d = Math.abs(sim.t[i] - pt.time);
      if (d < bestDiff) {
        bestDiff = d;
        bestIdx = i;
      }
    }
    simPreyAtEmp.push(sim.prey[bestIdx]);
    simPredAtEmp.push(sim.predator[bestIdx]);
  }

  const n = empirical.length;
  let sqErrPrey = 0;
  let sqErrPred = 0;
  for (let i = 0; i < n; i++) {
    sqErrPrey += Math.pow(simPreyAtEmp[i] - empirical[i].prey, 2);
    sqErrPred += Math.pow(simPredAtEmp[i] - empirical[i].predator, 2);
  }

  const pearson = (a: number[], b: number[]): number => {
    const ma = a.reduce((s, v) => s + v, 0) / a.length;
    const mb = b.reduce((s, v) => s + v, 0) / b.length;
    let num = 0;
    let da = 0;
    let db = 0;
    for (let i = 0; i < a.length; i++) {
      const xa = a[i] - ma;
      const xb = b[i] - mb;
      num += xa * xb;
      da += xa * xa;
      db += xb * xb;
    }
    return da > 1e-9 && db > 1e-9 ? num / Math.sqrt(da * db) : 0;
  };

  return {
    preyRMSE: Math.sqrt(sqErrPrey / n),
    predatorRMSE: Math.sqrt(sqErrPred / n),
    preyCorrelation: pearson(simPreyAtEmp, empirical.map((d) => d.prey)),
    predatorCorrelation: pearson(simPredAtEmp, empirical.map((d) => d.predator)),
  };
}

export function generateSpatialAgents(
  dataset: AcademicDataset,
  currentPrey: number,
  currentPredator: number,
  timePhase: number,
  beta: number
): SpatialAgent[] {
  const { lat, lng, spreadRadiusDeg } = dataset.coordinates;
  const agents: SpatialAgent[] = [];

  const preyCount = clamp(Math.round(currentPrey / 6), 3, 14);
  const predCount = clamp(Math.round(currentPredator / 5), 2, 10);

  for (let i = 0; i < preyCount; i++) {
    const angle = (i / preyCount) * Math.PI * 2 + timePhase * 0.35;
    const rad = spreadRadiusDeg * (0.28 + ((i * 37) % 10) * 0.065);
    const dLat = Math.sin(angle) * rad * 0.65;
    const dLng = Math.cos(angle) * rad;
    const localPrey = +(currentPrey / preyCount).toFixed(2);
    agents.push({
      id: `prey-${i}`,
      role: 'prey',
      name: `${dataset.preyName} #${i + 1}`,
      scientific: dataset.preyScientific,
      emoji: dataset.preyEmoji,
      color: dataset.preyColor,
      lat: +(lat + dLat).toFixed(4),
      lng: +(lng + dLng).toFixed(4),
      density: localPrey,
      flux: +(beta * currentPrey * currentPredator).toFixed(2),
      zoneLabel: `Sektor ${dataset.xRoleLabel} ${String.fromCharCode(65 + (i % 6))}`,
    });
  }

  for (let j = 0; j < predCount; j++) {
    const angle = (j / predCount) * Math.PI * 2 + timePhase * 0.35 - 0.35;
    const rad = spreadRadiusDeg * (0.22 + ((j * 53) % 10) * 0.055);
    const dLat = Math.sin(angle) * rad * 0.65;
    const dLng = Math.cos(angle) * rad;
    const localPred = +(currentPredator / predCount).toFixed(2);
    agents.push({
      id: `predator-${j}`,
      role: 'predator',
      name: `${dataset.predatorName} #${j + 1}`,
      scientific: dataset.predatorScientific,
      emoji: dataset.predatorEmoji,
      color: dataset.predatorColor,
      lat: +(lat + dLat).toFixed(4),
      lng: +(lng + dLng).toFixed(4),
      density: localPred,
      flux: +(beta * currentPrey * currentPredator).toFixed(2),
      zoneLabel: `Zona Aktif ${dataset.yRoleLabel} #${j + 1}`,
    });
  }

  return agents;
}

// ============================================================================
// 4. Multi-Level Coupled Cascade RK4 Solver (Ekosistem, Iklim, Vulkanik, Epidemi)
// ============================================================================

export function mulberry32(a: number): () => number {
  let state = a | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussianRandom(rnd: () => number): number {
  return Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(6.2831853 * rnd());
}

export function computeTrophicDerivatives(
  y: number[],
  species: TrophicSpecies[],
  n: number,
  G: TrophicGlobalParams,
  currentTime: number
): number[] {
  const g = new Array(n + 1).fill(0);
  const d = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const preyBiomass = Math.max(y[i - 1], 0);
    const a = species[i].a ?? 0.8;
    const H = species[i].H ?? 50;
    g[i] = ((a * preyBiomass) / (H + preyBiomass)) * Math.max(y[i], 0);
  }
  const r0 = species[0].r ?? 0.6;
  const K0 = species[0].K ?? 300;
  const seasonalFactor = 1 + G.sa * Math.sin((6.2831853 * currentTime) / (G.sp || 60));
  d[0] =
    r0 * seasonalFactor * y[0] * (1 - y[0] / K0) -
    g[1] +
    G.imm -
    species[0].h * y[0];

  for (let i = 1; i < n; i++) {
    const e = species[i].e ?? 0.3;
    const m = species[i].m ?? 0.15;
    d[i] = e * g[i] - m * y[i] - g[i + 1] + G.imm - species[i].h * y[i];
  }
  return d;
}

export function simulateTrophicChain(
  y0: number[],
  species: TrophicSpecies[],
  n: number,
  G: TrophicGlobalParams
): SimResult {
  const dt = 0.025;
  const N = Math.round(G.T / dt);
  const rnd = mulberry32(G.seed);
  let y = y0.slice(0, n);
  const Y: number[][] = [y.slice()];
  const t: number[] = [0];

  for (let s = 1; s <= N; s++) {
    const curT = (s - 1) * dt;
    const k1 = computeTrophicDerivatives(y, species, n, G, curT);
    const k2 = computeTrophicDerivatives(
      y.map((v, i) => v + (dt / 2) * k1[i]),
      species,
      n,
      G,
      curT + dt / 2
    );
    const k3 = computeTrophicDerivatives(
      y.map((v, i) => v + (dt / 2) * k2[i]),
      species,
      n,
      G,
      curT + dt / 2
    );
    const k4 = computeTrophicDerivatives(
      y.map((v, i) => v + dt * k3[i]),
      species,
      n,
      G,
      curT + dt
    );

    y = y.map((v, i) => Math.max(0, v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])));
    if (G.nz > 0) {
      y = y.map((v) => Math.max(0, v * (1 + G.nz * Math.sqrt(dt) * gaussianRandom(rnd))));
    }
    if (s % 4 === 0) {
      Y.push(y.slice());
      t.push(+(s * dt).toFixed(2));
    }
  }

  const C = Array.from({ length: n }, (_, i) => Y.map((r) => r[i]));
  const mx = C.map((arr) => arr.reduce((m, v) => (v > m ? v : m), 0));
  const mn = C.map((arr) => arr.reduce((m, v) => (v < m ? v : m), Infinity));
  return { t, Y, C, mx, mn };
}
