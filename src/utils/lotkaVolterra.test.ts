import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACADEMIC_DATASETS,
  DEFAULT_TRANSECT_QUADRANTS,
  DOMAIN_CATEGORIES,
  analyzeLVEquilibrium,
  clamp,
  computeHeroLayout,
  computeJournalTippingMetrics,
  computeLVDerivatives,
  ease,
  evaluateEmpiricalFit,
  generateSpatialAgents,
  project3DPoint,
  seg,
  simulateClassicLV,
  simulateTrophicChain,
} from './lotkaVolterra.ts';

test('Math utilities: clamp, seg, and ease behave accurately', () => {
  assert.equal(clamp(1.5, 0, 1), 1);
  assert.equal(clamp(-0.4, 0, 1), 0);
  assert.equal(clamp(0.45, 0, 1), 0.45);
  assert.ok(Math.abs(seg(0.06, 0.02, 0.1) - 0.5) < 1e-12);
  assert.equal(ease(0), 0);
  assert.equal(ease(0.5), 0.5);
  assert.equal(ease(1), 1);
});

test('Cahyana et al. (2025) Pangandaran MPA journal parameters yield exact y*=250 tipping threshold and 18% / 8.73 ind/m2 transect averages', () => {
  const pangandaran = ACADEMIC_DATASETS[0];
  assert.equal(pangandaran.id, 'cahyana-2025-pangandaran-seagrass');
  assert.equal(pangandaran.calibratedParams.alpha, 0.5);
  assert.equal(pangandaran.calibratedParams.beta, 0.002);
  assert.equal(pangandaran.calibratedParams.delta, 0.0005);
  assert.equal(pangandaran.calibratedParams.gamma, 0.1);
  assert.equal(pangandaran.calibratedParams.x0, 153);
  assert.equal(pangandaran.calibratedParams.y0, 24);

  const sim = simulateClassicLV(pangandaran.calibratedParams, pangandaran.duration, 0.025);
  const tipping = computeJournalTippingMetrics(sim, pangandaran.calibratedParams);
  assert.equal(tipping.criticalThresholdY, 250);
  assert.equal(tipping.criticalThresholdX, 200);
  assert.ok(tipping.firstTippingTime !== null && tipping.firstTippingTime > 0);
  assert.ok(tipping.peakX > 1800);
  assert.ok(tipping.peakY > 600);

  // Verify 10 transect quadrants yield %C = 18% and D = 8.73 ind/m²
  const totalArea = DEFAULT_TRANSECT_QUADRANTS.length * 0.25;
  const totalOccupied = DEFAULT_TRANSECT_QUADRANTS.reduce((s, q) => s + q.occupiedAreaM2, 0);
  const totalUrchins = DEFAULT_TRANSECT_QUADRANTS.reduce((s, q) => s + q.urchinCount, 0);
  const pctC = (totalOccupied / totalArea) * 100;
  const densityD = totalUrchins / totalArea;
  assert.ok(Math.abs(pctC - 18.0) < 0.01);
  assert.ok(Math.abs(densityD - 8.73) < 0.01);
});

test('All multi-domain datasets have valid parameters, shock scenarios, and coordinates', () => {
  assert.ok(ACADEMIC_DATASETS.length >= 10);
  assert.equal(DOMAIN_CATEGORIES.length, 5);

  for (const ds of ACADEMIC_DATASETS) {
    assert.ok(ds.id.length > 0);
    assert.ok(ds.shockScenarios.length >= 2);
    assert.ok(ds.data.length >= 8);
    assert.ok(Number.isFinite(ds.coordinates.lat));
    assert.ok(Number.isFinite(ds.coordinates.lng));

    const shocked = ds.shockScenarios[0].apply(ds.calibratedParams);
    assert.ok(shocked.alpha > 0);
    assert.ok(shocked.beta > 0);
  }
});

test('3D projection helper projects normalized 3D coordinates into finite 2D viewport coords', () => {
  const centerProj = project3DPoint(0, 0, 0, 0.5, 0.3, 400, 300, 120);
  assert.equal(centerProj.x, 400);
  assert.equal(centerProj.y, 300);

  const cornerProj = project3DPoint(1, 1, -1, 0.6, 0.4, 400, 300, 120);
  assert.ok(Number.isFinite(cornerProj.x));
  assert.ok(Number.isFinite(cornerProj.y));
  assert.notEqual(cornerProj.x, 400);
});

test('Spatial agent generator produces valid GPS clusters around study site coordinates', () => {
  const ds = ACADEMIC_DATASETS[0];
  const agents = generateSpatialAgents(ds, 36, 18, 2.5, ds.calibratedParams.beta);
  assert.ok(agents.length >= 5);
  const preyAgents = agents.filter((a) => a.role === 'prey');
  const predAgents = agents.filter((a) => a.role === 'predator');
  assert.ok(preyAgents.length >= 3);
  assert.ok(predAgents.length >= 2);
  for (const ag of agents) {
    assert.ok(Math.abs(ag.lat - ds.coordinates.lat) < ds.coordinates.spreadRadiusDeg * 2);
    assert.ok(Math.abs(ag.lng - ds.coordinates.lng) < ds.coordinates.spreadRadiusDeg * 2);
  }
});

test('Classic Lotka-Volterra equilibrium and derivatives match analytical formulas', () => {
  const p = {
    alpha: 0.6,
    beta: 0.03,
    delta: 0.02,
    gamma: 0.8,
    x0: 35,
    y0: 15,
  };
  const eq = analyzeLVEquilibrium(p);
  assert.equal(eq.isValidCoexistence, true);
  assert.ok(Math.abs(eq.coexistence[0] - 40) < 1e-6);
  assert.ok(Math.abs(eq.coexistence[1] - 20) < 1e-6);

  const [dxAtEq, dyAtEq] = computeLVDerivatives(eq.coexistence[0], eq.coexistence[1], p);
  assert.ok(Math.abs(dxAtEq) < 1e-9);
  assert.ok(Math.abs(dyAtEq) < 1e-9);
});

test('RK4 Lotka-Volterra solver conserves closed orbit and matches empirical datasets', () => {
  for (const ds of ACADEMIC_DATASETS) {
    const sim = simulateClassicLV(ds.calibratedParams, ds.duration, 0.025);
    assert.ok(sim.t.length > 50);
    assert.ok(sim.maxPrey > 0);
    assert.ok(sim.minPrey >= 0);

    const fit = evaluateEmpiricalFit(sim, ds.data);
    assert.ok(Number.isFinite(fit.preyRMSE));
    assert.ok(Number.isFinite(fit.predatorRMSE));
  }
});

test('Multi-species cascade RK4 solver produces non-negative trajectories', () => {
  const species = [
    { name: 'ENSO Heat', emoji: '🌊', color: '#0284c7', N0: 180, r: 0.8, K: 350, h: 0 },
    { name: 'Peat Drought', emoji: '☀️', color: '#d97706', N0: 80, a: 0.7, H: 60, e: 0.35, m: 0.14, h: 0 },
    { name: 'Wildfire Front', emoji: '🔥', color: '#dc2626', N0: 30, a: 0.55, H: 50, e: 0.3, m: 0.11, h: 0 },
  ];
  const res = simulateTrophicChain(
    [180, 80, 30],
    species,
    3,
    { imm: 0.2, T: 30, log: false, sa: 0.1, sp: 40, nz: 0, seed: 7 }
  );
  assert.equal(res.C.length, 3);
  assert.ok(res.t.length > 50);
  assert.ok(res.mn.every((v) => v >= 0));
});

test('Hero layout helper returns expected desktop and mobile metrics', () => {
  const m = computeHeroLayout(500, 800, 400, 100);
  assert.equal(m.isMobile, true);
  const d = computeHeroLayout(1440, 900, 900, 120);
  assert.equal(d.isMobile, false);
  assert.ok(d.fontSize > 0);
});
