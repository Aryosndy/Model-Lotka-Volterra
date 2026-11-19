import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AcademicDataset,
  ClassicLVParams,
  DEFAULT_TRANSECT_QUADRANTS,
  TransectQuadrantSample,
  computeJournalTippingMetrics,
} from '../utils/lotkaVolterra';

interface JournalPublicationOutputsProps {
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
  duration: number;
  onLoadPangandaranJournal: () => void;
  onApplyFieldSurveyToModel: (x0: number, y0: number) => void;
}

export default function JournalPublicationOutputs({
  dataset,
  params,
  sim,
  duration,
  onLoadPangandaranJournal,
  onApplyFieldSurveyToModel,
}: JournalPublicationOutputsProps) {
  const fig3CanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fig4CanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [showThresholdOverlay, setShowThresholdOverlay] = useState<boolean>(true);
  const [quadrants, setQuadrants] = useState<TransectQuadrantSample[]>(
    DEFAULT_TRANSECT_QUADRANTS
  );
  const [studyAreaM2, setStudyAreaM2] = useState<number>(275);

  const tipping = useMemo(
    () => computeJournalTippingMetrics(sim, params),
    [sim, params]
  );

  // Compute Eq. (1) %C and Eq. (2) D from the 10 transect quadrants
  const surveySummary = useMemo(() => {
    const totalQuadrantArea = quadrants.length * 0.25; // 10 * (0.5m * 0.5m) = 2.5 m²
    const totalOccupiedArea = quadrants.reduce(
      (acc, q) => acc + q.occupiedAreaM2,
      0
    );
    const totalUrchins = quadrants.reduce((acc, q) => acc + q.urchinCount, 0);

    // Eq. (1): %C = (Area occupied by species / Total area) * 100
    const percentCoverage =
      totalQuadrantArea > 0 ? (totalOccupiedArea / totalQuadrantArea) * 100 : 0;

    // Eq. (2): D = Average count of species / Total area (individuals / m²)
    const densityPerM2 =
      totalQuadrantArea > 0 ? totalUrchins / totalQuadrantArea : 0;

    // Estimated starting individuals in the study area (matching x0=153, y0=24 in 275 m²)
    const estimatedSeagrassPop = Math.max(
      10,
      Math.round((percentCoverage / 18) * 153 * (studyAreaM2 / 275))
    );
    const estimatedUrchinPop = Math.max(
      2,
      Math.round((densityPerM2 / 8.73) * 24 * (studyAreaM2 / 275))
    );

    return {
      percentCoverage: +percentCoverage.toFixed(2),
      densityPerM2: +densityPerM2.toFixed(2),
      estimatedSeagrassPop,
      estimatedUrchinPop,
    };
  }, [quadrants, studyAreaM2]);

  const isPangandaranActive =
    dataset.id === 'cahyana-2025-pangandaran-seagrass';

  // ==========================================================================
  // Draw Fig. 3 Replication: Population Dynamics Graph Over Day (R-style box plot)
  // ==========================================================================
  useEffect(() => {
    const canvas = fig3CanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 580;
    const H = canvas.clientHeight || 360;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Crisp white publication paper background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const pad = { l: 68, r: 24, t: 24, b: 56 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    const maxPop = Math.max(sim.maxPrey, sim.maxPred, 20) * 1.04;
    const maxTime = Math.max(duration, 1);

    const toX = (tVal: number) => pad.l + (tVal / maxTime) * pw;
    const toY = (val: number) => pad.t + ph - (val / maxPop) * ph;

    // Optional 8-Day Early Intervention Window & Critical Threshold overlay
    if (showThresholdOverlay) {
      const threshY = toY(tipping.criticalThresholdY);
      if (threshY >= pad.t && threshY <= pad.t + ph) {
        // Highlight 8-day window after first tipping point
        if (tipping.firstTippingTime !== null) {
          const xStart = toX(tipping.firstTippingTime);
          const xEnd = toX(Math.min(maxTime, tipping.firstTippingTime + 8));
          ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
          ctx.fillRect(xStart, pad.t, Math.max(6, xEnd - xStart), ph);
        }

        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(pad.l, threshY);
        ctx.lineTo(pad.l + pw, threshY);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#b91c1c';
        ctx.font = '600 10px "Inter Tight", Arial, sans-serif';
        ctx.fillText(
          `Critical Tipping Point (y* = ${tipping.criticalThresholdY.toFixed(0)})`,
          pad.l + 8,
          Math.max(pad.t + 12, threshY - 5)
        );
      }
    }

    // Green Curve: Seagrass / X Variable (matching Fig. 3 bright green)
    ctx.beginPath();
    for (let i = 0; i < sim.t.length; i++) {
      const px = toX(sim.t[i]);
      const py = toY(sim.prey[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Purple Curve: Sea Urchin / Y Variable (matching Fig. 3 purple)
    ctx.beginPath();
    for (let i = 0; i < sim.t.length; i++) {
      const px = toX(sim.t[i]);
      const py = toY(sim.predator[i]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#7e22ce';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Publication Box Frame (4 sides, R plot style)
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(pad.l, pad.t, pw, ph);

    // X-Axis Ticks & Labels (0, 25%, 50%, 75%, 100% of duration, e.g., 0, 50, 100, 150, 200)
    ctx.fillStyle = '#111827';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const tVal = (maxTime * i) / 4;
      const tx = toX(tVal);
      ctx.beginPath();
      ctx.moveTo(tx, pad.t + ph);
      ctx.lineTo(tx, pad.t + ph + 6);
      ctx.stroke();
      ctx.fillText(
        Number.isInteger(tVal) ? String(tVal) : tVal.toFixed(0),
        tx,
        pad.t + ph + 20
      );
    }
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText(`Time (${dataset.timeUnit})`, pad.l + pw / 2, H - 12);

    // Y-Axis Ticks & Vertical Labels (R plot style: 0, 500, 1000, 1500, 2000)
    const niceMax =
      maxPop > 1500
        ? 2000
        : maxPop > 400
        ? Math.ceil(maxPop / 100) * 100
        : Math.ceil(maxPop / 10) * 10;
    for (let i = 0; i <= 4; i++) {
      const yVal = (niceMax * i) / 4;
      const ty = toY(yVal);
      if (ty < pad.t - 2) continue;
      ctx.beginPath();
      ctx.moveTo(pad.l, ty);
      ctx.lineTo(pad.l - 6, ty);
      ctx.stroke();

      ctx.save();
      ctx.translate(pad.l - 14, ty);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.font = '11px Arial, sans-serif';
      ctx.fillText(String(Math.round(yVal)), 0, 0);
      ctx.restore();
    }

    // Y-Axis Title
    ctx.save();
    ctx.translate(18, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText('Population', 0, 0);
    ctx.restore();

    // Top-Right Boxed Legend (exact Fig. 3 style)
    const legW = 148;
    const legH = 44;
    const legX = pad.l + pw - legW - 8;
    const legY = pad.t + 8;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.fillRect(legX, legY, legW, legH);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.strokeRect(legX, legY, legW, legH);

    // Legend Row 1 (Green)
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legX + 10, legY + 14);
    ctx.lineTo(legX + 34, legY + 14);
    ctx.stroke();
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'left';
    ctx.font = '11px Arial, sans-serif';
    ctx.fillText(
      isPangandaranActive
        ? 'Seagrass'
        : dataset.preyName.slice(0, 16),
      legX + 42,
      legY + 18
    );

    // Legend Row 2 (Purple)
    ctx.strokeStyle = '#7e22ce';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(legX + 10, legY + 31);
    ctx.lineTo(legX + 34, legY + 31);
    ctx.stroke();
    ctx.fillStyle = '#111827';
    ctx.fillText(
      isPangandaranActive
        ? 'Sea Urchin'
        : dataset.predatorName.slice(0, 16),
      legX + 42,
      legY + 35
    );
  }, [sim, duration, dataset, showThresholdOverlay, tipping, isPangandaranActive]);

  // ==========================================================================
  // Draw Fig. 4 Replication: Discrete Circle Phase Diagram (R-style `o` markers)
  // ==========================================================================
  useEffect(() => {
    const canvas = fig4CanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 580;
    const H = canvas.clientHeight || 360;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const pad = { l: 68, r: 24, t: 24, b: 56 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    const maxX = Math.max(sim.maxPrey, 20) * 1.05;
    const maxY = Math.max(sim.maxPred, 20) * 1.05;

    const toX = (xVal: number) => pad.l + (xVal / maxX) * pw;
    const toY = (yVal: number) => pad.t + ph - (yVal / maxY) * ph;

    // Optional Critical Tipping Point Line (y* = 250) & Equilibrium Point
    if (showThresholdOverlay) {
      const ty = toY(tipping.criticalThresholdY);
      const tx = toX(tipping.criticalThresholdX);

      if (ty >= pad.t && ty <= pad.t + ph) {
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(pad.l, ty);
        ctx.lineTo(pad.l + pw, ty);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#b91c1c';
        ctx.font = '600 10px "Inter Tight", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(
          `Ambang Kritis y* = ${tipping.criticalThresholdY.toFixed(0)} ind`,
          pad.l + pw - 8,
          Math.max(pad.t + 14, ty - 5)
        );
      }

      if (tx >= pad.l && tx <= pad.l + pw && ty >= pad.t && ty <= pad.t + ph) {
        ctx.beginPath();
        ctx.arc(tx, ty, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    // Sample discrete points along the orbit to replicate Fig. 4's hollow circles `o`
    const targetPoints = 190;
    const step = Math.max(1, Math.floor(sim.t.length / targetPoints));
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 1.15;

    for (let i = 0; i < sim.t.length; i += step) {
      const px = toX(sim.prey[i]);
      const py = toY(sim.predator[i]);
      ctx.beginPath();
      ctx.arc(px, py, 3.1, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Publication Box Frame
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(pad.l, pad.t, pw, ph);

    // X-Axis Ticks & Labels (0, 500, 1000, 1500, 2000)
    const niceMaxX =
      maxX > 1500
        ? 2000
        : maxX > 400
        ? Math.ceil(maxX / 100) * 100
        : Math.ceil(maxX / 10) * 10;

    ctx.fillStyle = '#111827';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const xVal = (niceMaxX * i) / 4;
      const tx = toX(xVal);
      if (tx > pad.l + pw + 2) continue;
      ctx.beginPath();
      ctx.moveTo(tx, pad.t + ph);
      ctx.lineTo(tx, pad.t + ph + 6);
      ctx.stroke();
      ctx.fillText(String(Math.round(xVal)), tx, pad.t + ph + 20);
    }
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText(
      isPangandaranActive
        ? 'Seagrass Population'
        : `${dataset.preyName} Population`,
      pad.l + pw / 2,
      H - 12
    );

    // Y-Axis Ticks & Vertical Labels (0, 200, 400, 600, 800)
    const niceMaxY =
      maxY > 700
        ? 800
        : maxY > 200
        ? Math.ceil(maxY / 100) * 100
        : Math.ceil(maxY / 10) * 10;
    for (let i = 0; i <= 4; i++) {
      const yVal = (niceMaxY * i) / 4;
      const ty = toY(yVal);
      if (ty < pad.t - 2) continue;
      ctx.beginPath();
      ctx.moveTo(pad.l, ty);
      ctx.lineTo(pad.l - 6, ty);
      ctx.stroke();

      ctx.save();
      ctx.translate(pad.l - 14, ty);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.font = '11px Arial, sans-serif';
      ctx.fillText(String(Math.round(yVal)), 0, 0);
      ctx.restore();
    }

    // Y-Axis Title
    ctx.save();
    ctx.translate(18, pad.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText(
      isPangandaranActive
        ? 'Sea Urchin Population'
        : `${dataset.predatorName} Population`,
      0,
      0
    );
    ctx.restore();
  }, [sim, dataset, showThresholdOverlay, tipping, isPangandaranActive]);

  const downloadCanvasAsPng = (
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
    filename: string
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <section
      id="output-jurnal"
      className="lv-card"
      style={{
        padding: '24px',
        border: '1.5px solid #10291a',
        background: '#ffffff',
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '14px',
          paddingBottom: '16px',
          borderBottom: '1px solid #dce5de',
          marginBottom: '20px',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <span className="chip">
              OUTPUT STANDAR PUBLIKASI JURNAL ILMIAH (SCOPUS / ELSEVIER / EJABF 2025)
            </span>
            <span
              className="mono"
              style={{
                fontSize: '10.5px',
                background: '#eef6f0',
                color: '#108548',
                padding: '3px 8px',
                borderRadius: '4px',
                fontWeight: 700,
              }}
            >
              CAHYANA ET AL. (2025) · VOL. 29(1): 151–162
            </span>
          </div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#10291a',
            }}
          >
            Replikasi Grafik &amp; Instrumen Analitik Jurnal (Fig. 2 Transek Kuadran, Fig. 3 Time-Series, Fig. 4 Diagram Fase Diskrit &amp; Tipping Point)
          </h2>
          <p style={{ fontSize: '13px', color: '#425949', marginTop: '4px' }}>
            Menampilkan format grafik standar publikasi jurnal ilmiah{' '}
            <em>Egyptian Journal of Aquatic Biology &amp; Fisheries</em> (FPIK Universitas
            Padjadjaran) beserta kalkulator Transek Kuadran Persamaan (1)–(2) dan analisis{' '}
            <strong>Ambang Kritis (Tipping Point) &amp; Jendela Intervensi 8 Hari</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {!isPangandaranActive && (
            <button
              type="button"
              onClick={onLoadPangandaranJournal}
              className="lv-btn lv-btn-primary"
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              🌿 Muat Parameter Asli Jurnal Pangandaran (x₀=153, y₀=24, T=200)
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowThresholdOverlay((v) => !v)}
            className="lv-btn"
            style={{ padding: '8px 12px', fontSize: '12px' }}
          >
            {showThresholdOverlay
              ? '🎯 Sembunyikan Garis Tipping Point'
              : '🎯 Tampilkan Garis Tipping Point (y*)'}
          </button>
          <a
            href="/assets/aistudio/EJABF_Volume29_Issue1_Pages151-162_5a569542.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="lv-btn"
            style={{ padding: '8px 12px', fontSize: '12px' }}
          >
            📄 Buka PDF Jurnal Asli (EJABF 2025)
          </a>
        </div>
      </div>

      {/* ROW 1: Fig. 3 and Fig. 4 Side-by-Side Publication Figures */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
          marginBottom: '22px',
        }}
      >
        {/* Figure 3 Box */}
        <div
          style={{
            border: '1px solid #cbd7ce',
            borderRadius: '12px',
            padding: '16px',
            background: '#fafcfa',
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
            <div>
              <span
                className="mono"
                style={{
                  fontSize: '10px',
                  color: '#108548',
                  fontWeight: 700,
                }}
              >
                FORMAT GRAFIK JURNAL — FIG. 3 (HAL. 156)
              </span>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>
                Fig. 3. Population Dynamics Graph over {dataset.timeUnit}
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadCanvasAsPng(
                  fig3CanvasRef,
                  `Fig3_Population_Dynamics_${dataset.id}_NPM_230210240028.png`
                )
              }
              className="lv-btn"
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              ⬇ Unduh PNG (Fig. 3)
            </button>
          </div>

          <div
            style={{
              width: '100%',
              height: '340px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <canvas
              ref={fig3CanvasRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>

          <p
            style={{
              fontSize: '12px',
              color: '#334155',
              marginTop: '10px',
              lineHeight: 1.5,
              fontFamily: 'Georgia, serif',
            }}
          >
            <strong>Fig. 3.</strong> Population dynamics graph over{' '}
            {dataset.timeUnit.toLowerCase()}; <em>x</em> axis units ={' '}
            {dataset.timeUnit} (0–{duration}), <em>y</em> axis units = Individual /
            Population. Kondisi awal: <strong>x₀ = {params.x0}</strong> (
            {dataset.preyName}) dan <strong>y₀ = {params.y0}</strong> (
            {dataset.predatorName}) dengan parameter α = {params.alpha}, β ={' '}
            {params.beta}, δ = {params.delta}, γ = {params.gamma}.
          </p>
        </div>

        {/* Figure 4 Box */}
        <div
          style={{
            border: '1px solid #cbd7ce',
            borderRadius: '12px',
            padding: '16px',
            background: '#fafcfa',
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
            <div>
              <span
                className="mono"
                style={{
                  fontSize: '10px',
                  color: '#7e22ce',
                  fontWeight: 700,
                }}
              >
                FORMAT GRAFIK JURNAL — FIG. 4 (HAL. 157)
              </span>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>
                Fig. 4. Discrete Phase Diagram (Orbit Titik Diskrit &apos;o&apos;)
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                downloadCanvasAsPng(
                  fig4CanvasRef,
                  `Fig4_Phase_Diagram_${dataset.id}_NPM_230210240028.png`
                )
              }
              className="lv-btn"
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              ⬇ Unduh PNG (Fig. 4)
            </button>
          </div>

          <div
            style={{
              width: '100%',
              height: '340px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <canvas
              ref={fig4CanvasRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>

          <p
            style={{
              fontSize: '12px',
              color: '#334155',
              marginTop: '10px',
              lineHeight: 1.5,
              fontFamily: 'Georgia, serif',
            }}
          >
            <strong>Fig. 4.</strong> Phase diagram; X axis units ={' '}
            {dataset.preyName} (Individual), Y axis units = {dataset.predatorName}{' '}
            (Individual). Kerapatan lingkaran diskrit (<code>o</code>) menunjukkan
            kecepatan perubahan fase: titik yang renggang menandakan lonjakan cepat,
            sedangkan titik yang rapat di dekat sumbu kiri menunjukkan fase kritis
            pasca-konsumsi berlebih (<em>overgrazing / depletion</em>).
          </p>
        </div>
      </div>

      {/* ROW 2: Critical Tipping Point & 8-Day Intervention Window Diagnostics (Page 157-159) */}
      <div
        style={{
          padding: '18px 20px',
          borderRadius: '12px',
          background: '#10291a',
          color: '#f6f7f4',
          marginBottom: '22px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '12px',
          }}
        >
          <div>
            <span className="chip">
              ANALISIS AMBANG KRITIS (CRITICAL TIPPING POINT) &amp; JENDELA INTERVENSI DINI
            </span>
            <h3 style={{ fontSize: '16.5px', fontWeight: 700, marginTop: '6px' }}>
               Evaluasi Risiko Degradasi Sistem &amp; Rekomendasi Manajemen (Metode Cahyana et al., 2025)
            </h3>
          </div>
          <span
            className="mono"
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              background:
                tipping.barrenRiskLevel === 'TINGGI (Risiko Barren)'
                  ? '#dc2626'
                  : '#c6f35c',
              color:
                tipping.barrenRiskLevel === 'TINGGI (Risiko Barren)'
                  ? '#ffffff'
                  : '#10291a',
              fontWeight: 700,
              fontSize: '11px',
            }}
          >
            STATUS: {tipping.barrenRiskLevel}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '12px',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.07)',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(198,243,92,0.25)',
            }}
          >
            <div className="mono" style={{ fontSize: '10px', color: '#c6f35c' }}>
              AMBANG KRITIS HERBIVORI / Y* (α/β)
            </div>
            <div
              className="mono"
              style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}
            >
              {tipping.criticalThresholdY.toFixed(1)} Individu
            </div>
            <div style={{ fontSize: '11.5px', opacity: 0.82, marginTop: '3px' }}>
              Di atas ambang ini, laju perubahan {dataset.preyName} menjadi negatif
              (dx/dt &lt; 0) dan memicu penurunan tajam.
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.07)',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(198,243,92,0.25)',
            }}
          >
            <div className="mono" style={{ fontSize: '10px', color: '#c6f35c' }}>
              WAKTU TEMBUS AMBANG &amp; JENDELA 8 HARI
            </div>
            <div
              className="mono"
              style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}
            >
              {tipping.firstTippingTime !== null
                ? `t = ${tipping.firstTippingTime.toFixed(1)} → ${tipping.interventionDeadlineTime} ${dataset.timeUnit}`
                : 'Di Bawah Ambang'}
            </div>
            <div style={{ fontSize: '11.5px', opacity: 0.82, marginTop: '3px' }}>
              Sesuai jurnal (hal. 157–159), protokol mitigasi wajib diaktifkan dalam
              jendela <strong>8 {dataset.timeUnit}</strong> sejak terdeteksi.
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.07)',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(198,243,92,0.25)',
            }}
          >
            <div className="mono" style={{ fontSize: '10px', color: '#c6f35c' }}>
              PUNCAK POPULASI X vs PUNCAK Y
            </div>
            <div
              className="mono"
              style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}
            >
              Xₘₐₓ={tipping.peakX.toFixed(0)} · Yₘₐₓ={tipping.peakY.toFixed(0)}
            </div>
            <div style={{ fontSize: '11.5px', opacity: 0.82, marginTop: '3px' }}>
              Puncak X pada t={tipping.peakXTime.toFixed(1)}, diikuti puncak Y pada
              t={tipping.peakYTime.toFixed(1)} {dataset.timeUnit}.
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,0.07)',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(198,243,92,0.25)',
            }}
          >
            <div className="mono" style={{ fontSize: '10px', color: '#c6f35c' }}>
              TITIK MINIMUM X (INDIKATOR BARREN)
            </div>
            <div
              className="mono"
              style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}
            >
              Xₘᵢₙ = {tipping.minXAfterPeak.toFixed(2)}
            </div>
            <div style={{ fontSize: '11.5px', opacity: 0.82, marginTop: '3px' }}>
              Ketika Xₘᵢₙ mendekati 0 pasca-ledakan Y, ekosistem berisiko kolaps
              menjadi <em>barren zone</em>.
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3: Fig. 2 Transect Quadrants Configuration + Eq (1) %C & Eq (2) D + Table 1 & Table 2 */}
      <div
        style={{
          border: '1px solid #cbd7ce',
          borderRadius: '12px',
          padding: '18px 20px',
          background: '#f8faf8',
        }}
      >
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
            <span
              className="mono"
              style={{ fontSize: '10px', color: '#108548', fontWeight: 700 }}
            >
              INSTRUMEN SAMPLING LAPANGAN — FIG. 2, PERSAMAAN (1)–(2), TABEL 1 &amp; TABEL 2 (HAL. 154–156)
            </span>
            <h3 style={{ fontSize: '16.5px', fontWeight: 700, marginTop: '3px' }}>
              Simulasi Transek Kuadran 50 Meter (0.5 m × 0.5 m per 5 m) — Pangandaran MPA
            </h3>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              className="lv-btn"
              onClick={() => setQuadrants(DEFAULT_TRANSECT_QUADRANTS)}
            >
              ↺ Reset Data Lapangan Jurnal (%C = 18%, D = 8.73 ind/m²)
            </button>
            <button
              type="button"
              className="lv-btn lv-btn-primary"
              onClick={() =>
                onApplyFieldSurveyToModel(
                  surveySummary.estimatedSeagrassPop,
                  surveySummary.estimatedUrchinPop
                )
              }
            >
              ▶ Terapkan Hasil Transek ke Kondisi Awal (x₀={surveySummary.estimatedSeagrassPop}, y₀={surveySummary.estimatedUrchinPop})
            </button>
          </div>
        </div>

        {/* Visual Diagram of Fig. 2: 50m Transect Line with Alternating 0.5m x 0.5m Quadrants */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #d5e0d7',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '16px',
            overflowX: 'auto',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '8px',
              fontFamily: 'Georgia, serif',
            }}
          >
            ←―――――――――――――――――――――――――――― 50 m Transect Line (Spacing = 5 m, Quadrant = 0.5 m × 0.5 m) ――――――――――――――――――――――――――――→
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, minmax(88px, 1fr))',
              gap: '8px',
              alignItems: 'center',
              padding: '8px 0',
            }}
          >
            {quadrants.map((q, idx) => (
              <div
                key={q.quadrantNumber}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <div
                  className="mono"
                  style={{ fontSize: '10px', color: '#475569' }}
                >
                  Q{q.quadrantNumber} ({q.distanceMeter}m)
                </div>
                <div
                  style={{
                    width: '80px',
                    padding: '6px',
                    borderRadius: '6px',
                    border: '2px solid #10291a',
                    background:
                      q.side === 'Utara / Atas' ? '#ecfdf5' : '#f5f3ff',
                    textAlign: 'center',
                    transform:
                      q.side === 'Utara / Atas'
                        ? 'translateY(-4px)'
                        : 'translateY(4px)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: '#16a34a',
                    }}
                  >
                    🌿 {q.coveragePercent.toFixed(1)}%
                  </div>
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: '#7e22ce',
                    }}
                  >
                    🟣 {q.urchinDensityM2.toFixed(1)}/m²
                  </div>
                </div>
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={1}
                  value={q.coveragePercent}
                  title={`Ubah tutupan lamun Kuadran ${q.quadrantNumber}`}
                  onChange={(e) => {
                    const newPct = parseFloat(e.target.value);
                    setQuadrants((prev) =>
                      prev.map((item, i) =>
                        i === idx
                          ? {
                              ...item,
                              coveragePercent: newPct,
                              occupiedAreaM2: +((newPct / 100) * 0.25).toFixed(4),
                            }
                          : item
                      )
                    );
                  }}
                  style={{ width: '76px', accentColor: '#16a34a' }}
                />
              </div>
            ))}
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: '11.5px',
              color: '#475569',
              marginTop: '6px',
              fontFamily: 'Georgia, serif',
            }}
          >
            <strong>Fig. 2.</strong> Transect quadrants configuration (geser slider pada setiap kuadran untuk mensimulasikan variasi tutupan lamun lapangan).
          </div>
        </div>

        {/* Equations (1)-(2) and Tables 1 & 2 Side by Side */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Equations (1), (2), (3), (4) Box */}
          <div
            style={{
              background: '#ffffff',
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid #d5e0d7',
              fontSize: '12.5px',
              display: 'grid',
              gap: '8px',
            }}
          >
            <div className="mono" style={{ fontSize: '10.5px', color: '#108548', fontWeight: 700 }}>
              FORMULASI MATEMATIKA JURNAL (HAL. 154–155)
            </div>
            <div>
              <strong>Persamaan (1) — Tutupan Lamun (%C):</strong>
              <div
                className="mono"
                style={{
                  background: '#f1f5f9',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  marginTop: '3px',
                  fontSize: '11.5px',
                }}
              >
                %C = (Area occupied / Total area) × 100 ={' '}
                <strong>{surveySummary.percentCoverage}%</strong>
              </div>
            </div>
            <div>
              <strong>Persamaan (2) — Kepadatan Bulu Babi (D):</strong>
              <div
                className="mono"
                style={{
                  background: '#f1f5f9',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  marginTop: '3px',
                  fontSize: '11.5px',
                }}
              >
                D = Average count / Total area ={' '}
                <strong>{surveySummary.densityPerM2} ind/m²</strong>
              </div>
            </div>
            <div>
              <strong>Persamaan (3) &amp; (4) — Model Lotka-Volterra:</strong>
              <div
                className="mono"
                style={{
                  background: '#f1f5f9',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  marginTop: '3px',
                  fontSize: '11.5px',
                }}
              >
                dx/dt = αx − βxy &nbsp;|&nbsp; dy/dt = δxy − γy
              </div>
            </div>
          </div>

          {/* Table 1 & Table 2 Exact Journal Format */}
          <div
            style={{
              background: '#ffffff',
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid #d5e0d7',
              display: 'grid',
              gap: '12px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  marginBottom: '4px',
                  fontFamily: 'Georgia, serif',
                }}
              >
                Table 1. Seagrass coverage (Hasil Transek Kuadran)
              </div>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  borderTop: '2px solid #111827',
                  borderBottom: '2px solid #111827',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid #111827' }}>
                    <th style={{ padding: '5px 8px', textAlign: 'left' }}>No.</th>
                    <th style={{ padding: '5px 8px', textAlign: 'left' }}>Species</th>
                    <th style={{ padding: '5px 8px', textAlign: 'right' }}>%C</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 8px' }}>1</td>
                    <td style={{ padding: '6px 8px', fontStyle: 'italic' }}>
                      Cymodocea rotundata
                    </td>
                    <td
                      className="mono"
                      style={{
                        padding: '6px 8px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#16a34a',
                      }}
                    >
                      {surveySummary.percentCoverage}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  marginBottom: '4px',
                  fontFamily: 'Georgia, serif',
                }}
              >
                Table 2. Sea urchin density (Hasil Transek Kuadran)
              </div>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  borderTop: '2px solid #111827',
                  borderBottom: '2px solid #111827',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid #111827' }}>
                    <th style={{ padding: '5px 8px', textAlign: 'left' }}>No.</th>
                    <th style={{ padding: '5px 8px', textAlign: 'left' }}>Species</th>
                    <th style={{ padding: '5px 8px', textAlign: 'right' }}>
                      D (ind/m²)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 8px' }}>1</td>
                    <td style={{ padding: '6px 8px', fontStyle: 'italic' }}>
                      Echinometra lucunter
                    </td>
                    <td
                      className="mono"
                      style={{
                        padding: '6px 8px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: '#7e22ce',
                      }}
                    >
                      {surveySummary.densityPerM2}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
