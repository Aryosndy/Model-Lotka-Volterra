import React, { useState, useMemo } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import {
  AcademicDataset,
  ClassicLVParams,
  SpatialAgent,
  generateSpatialAgents,
} from '../utils/lotkaVolterra';

interface GoogleMapEcosystemSimProps {
  dataset: AcademicDataset;
  datasets: AcademicDataset[];
  onSelectDataset: (id: string) => void;
  params: ClassicLVParams;
  currentPrey: number;
  currentPredator: number;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onInjectPopulation: (deltaPrey: number, deltaPredator: number) => void;
}

type MapTypeIdOption = 'hybrid' | 'satellite' | 'terrain' | 'roadmap';

export default function GoogleMapEcosystemSim({
  dataset,
  datasets,
  onSelectDataset,
  params,
  currentPrey,
  currentPredator,
  currentTime,
  isPlaying,
  onTogglePlay,
  onInjectPopulation,
}: GoogleMapEcosystemSimProps) {
  const [mapTypeId, setMapTypeId] = useState<MapTypeIdOption>('hybrid');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [customSpawns, setCustomSpawns] = useState<
    Array<{
      id: string;
      role: 'prey' | 'predator';
      lat: number;
      lng: number;
      emoji: string;
      label: string;
    }>
  >([]);
  const [spawnMode, setSpawnMode] = useState<'prey' | 'predator'>('prey');

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    (import.meta as unknown as { env?: Record<string, string> }).env
      ?.VITE_GOOGLE_MAPS_API_KEY ||
    '';

  const agents = useMemo(
    () =>
      generateSpatialAgents(
        dataset,
        currentPrey,
        currentPredator,
        currentTime,
        params.beta
      ),
    [dataset, currentPrey, currentPredator, currentTime, params.beta]
  );

  const selectedAgent: SpatialAgent | undefined = useMemo(
    () => agents.find((a) => a.id === selectedAgentId),
    [agents, selectedAgentId]
  );

  const couplingFlux = +(params.beta * currentPrey * currentPredator).toFixed(2);
  const netRateX = +(
    params.alpha * currentPrey -
    params.beta * currentPrey * currentPredator
  ).toFixed(2);

  const handleMapClick = (ev: {
    detail?: { latLng?: { lat: number; lng: number } | null };
  }) => {
    const latLng = ev?.detail?.latLng;
    if (!latLng) return;

    const newItem = {
      id: `spawn-${Date.now()}`,
      role: spawnMode,
      lat: +latLng.lat.toFixed(4),
      lng: +latLng.lng.toFixed(4),
      emoji: spawnMode === 'prey' ? dataset.preyEmoji : dataset.predatorEmoji,
      label:
        spawnMode === 'prey'
          ? `Injeksi ${dataset.preyName} (+5)`
          : `Injeksi ${dataset.predatorName} (+3)`,
    };

    setCustomSpawns((prev) => [...prev.slice(-7), newItem]);
    if (spawnMode === 'prey') {
      onInjectPopulation(5, 0);
    } else {
      onInjectPopulation(0, 3);
    }
  };

  return (
    <div className="lv-card" style={{ padding: '22px' }}>
      {/* Header & Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px',
            }}
          >
            <span className="chip">GOOGLE MAPS SPATIAL DYNAMICS SIMULATOR</span>
            <span
              className="mono"
              style={{
                fontSize: '10.5px',
                color: '#0d5c31',
                background: '#e6f5ec',
                padding: '3px 8px',
                borderRadius: '4px',
                fontWeight: 700,
              }}
            >
              {dataset.domainBadge}
            </span>
            <span
              className="mono"
              style={{
                fontSize: '10.5px',
                color: '#108548',
                background: '#eef6f0',
                padding: '3px 8px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              GPS: {dataset.coordinates.lat.toFixed(3)}°,{' '}
              {dataset.coordinates.lng.toFixed(3)}°
            </span>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Pemetaan Spasial &amp; Telemetri Fenomena — {dataset.locationName}
          </h3>
          <p style={{ fontSize: '12.5px', color: '#425949', marginTop: '3px' }}>
            Visualisasi interaktif di atas Google Maps Basemap. Klik marker untuk inspeksi{' '}
            <strong>{dataset.interactionLabel}</strong>, atau klik langsung pada peta untuk
            menyuntikkan impuls{' '}
            <strong>
              {spawnMode === 'prey' ? dataset.preyName : dataset.predatorName}
            </strong>
            .
          </p>
        </div>

        {/* Basemap Mode & Play Switcher */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              background: '#eef2ee',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #d5dfd7',
            }}
          >
            {(['hybrid', 'satellite', 'terrain', 'roadmap'] as MapTypeIdOption[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMapTypeId(type)}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    textTransform: 'uppercase',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: mapTypeId === type ? 600 : 500,
                    background: mapTypeId === type ? '#10291a' : 'transparent',
                    color: mapTypeId === type ? '#c6f35c' : '#2c4434',
                  }}
                >
                  {type}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={onTogglePlay}
            className="lv-btn lv-btn-primary"
            style={{ padding: '7px 14px', fontSize: '12px' }}
          >
            {isPlaying ? '⏸ Jeda Simulasi Peta' : '▶ Jalankan Dinamika Peta'}
          </button>
        </div>
      </div>

      {/* Quick Study Location Selector & Click-to-Inject Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '14px',
          padding: '10px 14px',
          background: '#f6f8f6',
          borderRadius: '10px',
          border: '1px solid #dce5de',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            className="mono"
            style={{ fontSize: '10px', color: '#425949', marginRight: '4px' }}
          >
            LOKASI FENOMENA:
          </span>
          {datasets.map((ds) => (
            <button
              key={ds.id}
              type="button"
              onClick={() => {
                setSelectedAgentId(null);
                setCustomSpawns([]);
                onSelectDataset(ds.id);
              }}
              style={{
                padding: '5px 9px',
                fontSize: '11px',
                borderRadius: '6px',
                border:
                  ds.id === dataset.id
                    ? '1.5px solid #10291a'
                    : '1px solid #cbd7ce',
                background: ds.id === dataset.id ? '#10291a' : '#ffffff',
                color: ds.id === dataset.id ? '#c6f35c' : '#10291a',
                fontWeight: ds.id === dataset.id ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {ds.preyEmoji}
              {ds.predatorEmoji} {ds.shortName}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span className="mono" style={{ fontSize: '10px', color: '#425949' }}>
            KLIK PETA UNTUK INJEKSI:
          </span>
          <button
            type="button"
            onClick={() => setSpawnMode('prey')}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              borderRadius: '6px',
              border:
                spawnMode === 'prey'
                  ? '1.5px solid #108548'
                  : '1px solid #cbd7ce',
              background: spawnMode === 'prey' ? '#e6f5ec' : '#ffffff',
              color: '#0d5c31',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + {dataset.preyEmoji} {dataset.preyName.split(' ')[0]} (+5)
          </button>
          <button
            type="button"
            onClick={() => setSpawnMode('predator')}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              borderRadius: '6px',
              border:
                spawnMode === 'predator'
                  ? '1.5px solid #d95f02'
                  : '1px solid #cbd7ce',
              background: spawnMode === 'predator' ? '#fff1e6' : '#ffffff',
              color: '#9a3412',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + {dataset.predatorEmoji} {dataset.predatorName.split(' ')[0]} (+3)
          </button>
        </div>
      </div>

      {/* Main Google Map Container with explicit height */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '470px',
          borderRadius: '14px',
          overflow: 'hidden',
          border: '1px solid #c9d6cc',
          background: '#0d2216',
        }}
      >
        <APIProvider apiKey={apiKey}>
          <GoogleMap
            key={dataset.id}
            defaultCenter={{
              lat: dataset.coordinates.lat,
              lng: dataset.coordinates.lng,
            }}
            defaultZoom={dataset.coordinates.zoom}
            mapId="DEMO_MAP_ID"
            mapTypeId={mapTypeId}
            gestureHandling="greedy"
            disableDefaultUI={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            onClick={handleMapClick}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Central Observation Station Marker */}
            <AdvancedMarker
              position={{
                lat: dataset.coordinates.lat,
                lng: dataset.coordinates.lng,
              }}
              title={`Pusat Observasi: ${dataset.locationName}`}
            >
              <div
                style={{
                  background: '#10291a',
                  color: '#c6f35c',
                  border: '2px solid #c6f35c',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'var(--mono)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
                  whiteSpace: 'nowrap',
                }}
              >
                📡 STASIUN OBSERVASI ({dataset.timeUnit} {currentTime.toFixed(1)})
              </div>
            </AdvancedMarker>

            {/* Dynamic X & Y Variable Cluster Markers */}
            {agents.map((agent) => (
              <AdvancedMarker
                key={agent.id}
                position={{ lat: agent.lat, lng: agent.lng }}
                onClick={() => setSelectedAgentId(agent.id)}
                title={`${agent.name} (${agent.density} ${dataset.unit})`}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background:
                      agent.role === 'prey'
                        ? dataset.preyColor
                        : dataset.predatorColor,
                    color: '#ffffff',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    border: '2px solid #ffffff',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.38)',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    transform:
                      selectedAgentId === agent.id ? 'scale(1.16)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <span>{agent.emoji}</span>
                  <span className="mono" style={{ fontSize: '10px' }}>
                    {agent.density.toFixed(1)}
                  </span>
                </div>
              </AdvancedMarker>
            ))}

            {/* User-Spawned Impulse Markers */}
            {customSpawns.map((sp) => (
              <AdvancedMarker
                key={sp.id}
                position={{ lat: sp.lat, lng: sp.lng }}
                title={sp.label}
              >
                <div
                  style={{
                    background: '#c6f35c',
                    color: '#10291a',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1.5px solid #10291a',
                    fontSize: '11px',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  {sp.emoji} +Impuls
                </div>
              </AdvancedMarker>
            ))}

            {/* Selected Cluster Telemetry InfoWindow */}
            {selectedAgent && (
              <InfoWindow
                position={{ lat: selectedAgent.lat, lng: selectedAgent.lng }}
                onCloseClick={() => setSelectedAgentId(null)}
              >
                <div
                  style={{
                    minWidth: '215px',
                    padding: '4px',
                    color: '#10291a',
                    fontFamily: 'var(--sans)',
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: '10px',
                      color:
                        selectedAgent.role === 'prey'
                          ? dataset.preyColor
                          : dataset.predatorColor,
                      fontWeight: 700,
                      marginBottom: '2px',
                    }}
                  >
                    {selectedAgent.zoneLabel}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>
                    {selectedAgent.emoji} {selectedAgent.name}
                  </div>
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontStyle: 'italic',
                      color: '#425949',
                      marginBottom: '6px',
                    }}
                  >
                    {selectedAgent.scientific}
                  </div>
                  <div
                    style={{
                      fontSize: '11.5px',
                      borderTop: '1px solid #dfe7e1',
                      paddingTop: '6px',
                      display: 'grid',
                      gap: '3px',
                    }}
                  >
                    <div>
                      <strong>Intensitas Lokal:</strong> {selectedAgent.density}{' '}
                      {dataset.unit}
                    </div>
                    <div>
                      <strong>{dataset.interactionLabel}:</strong>{' '}
                      {selectedAgent.flux} / {dataset.timeUnit}
                    </div>
                    <div>
                      <strong>Koordinat GPS:</strong>{' '}
                      {selectedAgent.lat.toFixed(4)}°,{' '}
                      {selectedAgent.lng.toFixed(4)}°
                    </div>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </APIProvider>

        {/* Floating Live Telemetry HUD on Map */}
        <div
          style={{
            position: 'absolute',
            left: '14px',
            bottom: '14px',
            background: 'rgba(16, 41, 26, 0.92)',
            backdropFilter: 'blur(10px)',
            color: '#f6f7f4',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(198, 243, 92, 0.35)',
            maxWidth: '370px',
            pointerEvents: 'none',
          }}
        >
          <div
            className="mono"
            style={{ fontSize: '10px', color: '#c6f35c', marginBottom: '6px' }}
          >
            TELEMETRI GEOSPASIAL ({dataset.shortName} · t = {currentTime.toFixed(1)}{' '}
            {dataset.timeUnit})
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontSize: '12px',
            }}
          >
            <div>
              <span style={{ color: '#a7f3d0' }}>
                {dataset.preyEmoji} Variabel X:
              </span>{' '}
              <strong className="mono">{currentPrey.toFixed(2)}</strong>
            </div>
            <div>
              <span style={{ color: '#fdba74' }}>
                {dataset.predatorEmoji} Variabel Y:
              </span>{' '}
              <strong className="mono">{currentPredator.toFixed(2)}</strong>
            </div>
            <div>
              <span style={{ opacity: 0.8 }}>Kopel Nonlinier βxy:</span>{' '}
              <strong className="mono">{couplingFlux}</strong>
            </div>
            <div>
              <span style={{ opacity: 0.8 }}>Laju Sesaat dx/dt:</span>{' '}
              <strong
                className="mono"
                style={{ color: netRateX >= 0 ? '#86efac' : '#fca5a5' }}
              >
                {netRateX >= 0 ? `+${netRateX}` : netRateX}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
