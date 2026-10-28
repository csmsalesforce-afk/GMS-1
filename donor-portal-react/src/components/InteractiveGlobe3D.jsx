import React, { useRef, useEffect, useState, useCallback } from 'react';
import './InteractiveGlobe3D.css';

/**
 * High-Precision Geographical Coastline Polygons for World Continents
 * [longitude, latitude] in degrees
 */
const CONTINENT_POLYGONS = [
  // 1. North America & Central America
  [
    [-168, 65], [-160, 71], [-140, 70], [-125, 69], [-105, 69], [-85, 70], [-80, 62],
    [-65, 58], [-55, 52], [-65, 44], [-70, 42], [-75, 35], [-80, 31], [-80, 25],
    [-82, 25], [-82, 29], [-90, 30], [-97, 26], [-97, 20], [-88, 16], [-83, 10],
    [-77, 8], [-80, 9], [-85, 12], [-96, 16], [-105, 20], [-110, 24], [-115, 30],
    [-124, 38], [-124, 48], [-130, 54], [-140, 60], [-150, 60], [-160, 56], [-168, 65]
  ],
  // 2. South America
  [
    [-77, 8], [-72, 11], [-60, 10], [-50, 0], [-35, -5], [-35, -8], [-38, -13],
    [-40, -22], [-45, -24], [-53, -33], [-65, -42], [-66, -54], [-75, -50], [-73, -40],
    [-70, -30], [-75, -18], [-80, -5], [-80, 2], [-77, 8]
  ],
  // 3. Europe & Scandinavia
  [
    [-9, 39], [-9, 43], [0, 43], [3, 47], [-4, 48], [1, 50], [8, 54], [10, 58],
    [5, 62], [15, 68], [28, 71], [40, 68], [35, 55], [30, 45], [24, 40], [15, 40],
    [12, 45], [5, 44], [0, 41], [-5, 36], [-9, 39]
  ],
  // 4. Africa
  [
    [-6, 36], [0, 36], [10, 37], [25, 32], [32, 31], [34, 27], [43, 12], [51, 10],
    [42, 0], [40, -10], [35, -20], [32, -28], [28, -32], [18, -34], [15, -23],
    [12, -15], [9, 4], [3, 6], [-5, 5], [-15, 11], [-17, 15], [-16, 21], [-12, 28], [-6, 36]
  ],
  // 5. Asia & Russia & Middle East
  [
    [35, 55], [40, 68], [60, 70], [80, 73], [105, 77], [130, 72], [160, 70], [170, 66],
    [178, 65], [162, 57], [150, 59], [140, 53], [130, 42], [122, 37], [121, 31],
    [118, 25], [108, 20], [105, 10], [100, 3], [98, 10], [90, 22], [80, 13], [77, 8],
    [73, 19], [68, 24], [62, 25], [56, 26], [50, 15], [44, 13], [35, 28], [36, 32],
    [36, 36], [35, 55]
  ],
  // 6. Australia
  [
    [114, -22], [115, -34], [120, -34], [130, -32], [138, -35], [147, -38], [153, -28],
    [148, -20], [142, -11], [136, -12], [130, -14], [124, -16], [114, -22]
  ],
  // 7. United Kingdom & Ireland
  [
    [-5, 50], [1, 51], [1, 53], [-2, 58], [-5, 58], [-5, 55], [-3, 53], [-5, 50]
  ],
  // 8. Japan
  [
    [131, 33], [135, 34], [140, 36], [141, 41], [141, 45], [145, 44], [140, 39], [136, 35], [131, 33]
  ],
  // 9. Madagascar
  [
    [44, -13], [50, -15], [48, -24], [44, -25], [44, -13]
  ],
  // 10. Greenland
  [
    [-50, 60], [-40, 60], [-25, 70], [-20, 78], [-35, 83], [-55, 80], [-60, 75], [-50, 60]
  ]
];

/**
 * Verified Global Impact Hubs with geographical coordinates
 */
const IMPACT_HUBS = [
  {
    id: 'nairobi',
    name: 'Nairobi',
    country: 'Kenya',
    flag: '🇰🇪',
    lat: -1.29,
    lon: 36.82,
    cause: 'Clean Water & Solar Wells',
    funded: '$120,000',
    status: 'Milestone 4/4 Verified',
    icon: '💧',
    color: '#10b981'
  },
  {
    id: 'san_francisco',
    name: 'San Francisco',
    country: 'USA',
    flag: '🇺🇸',
    lat: 37.77,
    lon: -122.42,
    cause: 'Cancer Vaccine Trials',
    funded: '$95,025',
    status: 'Phase II Escrow',
    icon: '🔬',
    color: '#06b6d4'
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    country: 'India',
    flag: '🇮🇳',
    lat: 19.07,
    lon: 72.87,
    cause: 'Girls STEM Classrooms',
    funded: '$64,500',
    status: '100% Disbursed',
    icon: '💻',
    color: '#8b5cf6'
  },
  {
    id: 'kyiv',
    name: 'Kyiv',
    country: 'Ukraine',
    flag: '🇺🇦',
    lat: 50.45,
    lon: 30.52,
    cause: 'Emergency Trauma Kits',
    funded: '$85,000',
    status: 'Verified Transit',
    icon: '🏥',
    color: '#f59e0b'
  },
  {
    id: 'amazon',
    name: 'Manaus',
    country: 'Brazil',
    flag: '🇧🇷',
    lat: -3.11,
    lon: -60.02,
    cause: 'Rainforest Agroforestry',
    funded: '$48,200',
    status: 'GPS Monitored',
    icon: '🌱',
    color: '#10b981'
  },
  {
    id: 'london',
    name: 'London',
    country: 'UK',
    flag: '🇬🇧',
    lat: 51.5,
    lon: -0.12,
    cause: 'Global Treasury Node',
    funded: '$390,025',
    status: 'Audited 501(c)(3)',
    icon: '🏛️',
    color: '#3b82f6'
  }
];

const FLIGHT_ARCS = [
  { from: 'london', to: 'nairobi', color: '#10b981', progress: 0.1, speed: 0.007 },
  { from: 'san_francisco', to: 'nairobi', color: '#06b6d4', progress: 0.45, speed: 0.006 },
  { from: 'london', to: 'kyiv', color: '#f59e0b', progress: 0.75, speed: 0.009 },
  { from: 'san_francisco', to: 'amazon', color: '#10b981', progress: 0.25, speed: 0.008 },
  { from: 'london', to: 'mumbai', color: '#8b5cf6', progress: 0.6, speed: 0.0065 }
];

const LIVE_EVENTS = [
  { id: 1, text: 'Ram Kanungo pledged $100/mo', sub: 'Cancer Vaccine Research', tag: 'Sustainer', icon: '⚡' },
  { id: 2, text: 'Milestone Disbursed: $18,400', sub: 'Turkana Clean Water Wells', tag: 'Escrow', icon: '💧' },
  { id: 3, text: '450 STEM Devices Reconciled', sub: 'Girls Digital Education Tranche', tag: 'Audited', icon: '🎓' },
  { id: 4, text: '100% Disbursed to Beneficiaries', sub: 'IRS 501(c)(3) Verified Treasury', tag: 'Direct', icon: '🛡️' }
];

/**
 * Accurate landmass classifier for high-density point cloud
 */
function isLandmass(lat, lon) {
  if (lat < -58) return false;

  // North America & Central America
  if (lat >= 15 && lat <= 72 && lon >= -168 && lon <= -52) {
    if (lat > 50 && lon < -140) return true; // Alaska
    if (lat >= 25 && lat <= 55 && lon >= -125 && lon <= -65) return true; // USA
    if (lat >= 15 && lat < 25 && lon >= -105 && lon <= -80) return true; // Mexico
    if (lat > 55 && lon >= -140 && lon <= -60) return true; // Canada
  }

  // South America
  if (lat >= -56 && lat <= 13 && lon >= -82 && lon <= -34) {
    if (lat >= -20 && lon >= -75 && lon <= -38) return true; // Brazil/Amazon
    if (lat < -20 && lon >= -72 && lon <= -55) return true; // Argentina/Chile
    if (lat > -20 && lat <= 13 && lon >= -80 && lon <= -60) return true; // North SA
  }

  // Europe
  if (lat >= 35 && lat <= 71 && lon >= -11 && lon <= 42) {
    if (lat >= 36 && lat <= 44 && lon >= -10 && lon <= 4) return true; // Spain/Portugal
    if (lat >= 44 && lat <= 58 && lon >= -5 && lon <= 30) return true; // France/Germany/Poland
    if (lat >= 50 && lat <= 60 && lon >= -10 && lon <= 2) return true; // UK/Ireland
    if (lat >= 55 && lat <= 71 && lon >= 5 && lon <= 32) return true; // Scandinavia
    if (lat >= 36 && lat <= 48 && lon >= 12 && lon <= 30) return true; // Italy/Balkans
  }

  // Africa & Madagascar
  if (lat >= -35 && lat <= 37 && lon >= -18 && lon <= 52) {
    if (lat >= 15 && lon >= -15 && lon <= 38) return true; // North Africa / Sahara
    if (lat >= -5 && lat < 15 && lon >= -15 && lon <= 45) return true; // Central / East Africa
    if (lat >= -35 && lat < -5 && lon >= 10 && lon <= 36) return true; // Southern Africa
    if (lat >= -26 && lat <= -12 && lon >= 43 && lon <= 51) return true; // Madagascar
  }

  // Asia & Russia & Middle East
  if (lat >= 5 && lat <= 75 && lon >= 26 && lon <= 180) {
    if (lat >= 12 && lat <= 35 && lon >= 34 && lon <= 62) return true; // Middle East
    if (lat >= 8 && lat <= 36 && lon >= 68 && lon <= 92) return true; // India Subcontinent
    if (lat >= 18 && lat <= 55 && lon >= 75 && lon <= 135) return true; // China / East Asia
    if (lat >= 50 && lat <= 75 && lon >= 40 && lon <= 175) return true; // Russia / Siberia
    if (lat >= 30 && lat <= 46 && lon >= 129 && lon <= 146) return true; // Japan
    if (lat >= -11 && lat <= 22 && lon >= 95 && lon <= 142) return true; // SE Asia / Indonesia
  }

  // Australia & New Zealand
  if (lat >= -47 && lat <= -10 && lon >= 112 && lon <= 179) {
    if (lat >= -39 && lat <= -11 && lon >= 113 && lon <= 154) return true; // Australia
    if (lat >= -47 && lat <= -34 && lon >= 165 && lon <= 179) return true; // New Zealand
  }

  // Greenland
  if (lat >= 60 && lat <= 83 && lon >= -55 && lon <= -20) return true;

  return false;
}

function latLonToSphere(lat, lon, r) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return {
    x: -(r * Math.sin(phi) * Math.cos(theta)),
    y: r * Math.cos(phi),
    z: r * Math.sin(phi) * Math.sin(theta)
  };
}

export default function InteractiveGlobe3D() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);

  // Auto-rotation and drag physics (smooth momentum)
  const rotRef = useRef({ x: 0.28, y: 1.15 });
  const mouseRef = useRef({
    isDown: false,
    lastX: 0,
    lastY: 0,
    velX: 0.003,
    velY: 0.0004
  });

  const latestProjectedHubsRef = useRef([]);
  const hoveredHubRef = useRef(null);

  const [isRotating, setIsRotating] = useState(true);
  const isRotatingRef = useRef(true);
  useEffect(() => {
    isRotatingRef.current = isRotating;
  }, [isRotating]);

  const [activeHubIndex, setActiveHubIndex] = useState(0);
  const [hoveredHub, setHoveredHub] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [currentEventIdx, setCurrentEventIdx] = useState(0);

  // Cycle live event feed safely
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentEventIdx(prev => (prev + 1) % LIVE_EVENTS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Smooth camera navigation to specific hub
  const handleFocusHub = useCallback((idx) => {
    const hub = IMPACT_HUBS[idx];
    if (!hub) return;
    setActiveHubIndex(idx);
    hoveredHubRef.current = hub;
    setHoveredHub(hub);

    // Target rotation: bring hub to front center (z > 0)
    const targetY = -((hub.lon + 180) * (Math.PI / 180)) + Math.PI / 2;
    const targetX = (hub.lat * (Math.PI / 180)) * 0.45;

    rotRef.current.y = targetY;
    rotRef.current.x = Math.max(-0.6, Math.min(0.6, targetX));
    mouseRef.current.velX = 0;
    mouseRef.current.velY = 0;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let radius = 190;

    const updateDimensions = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || canvas.offsetWidth || 440;
      const h = rect.height || canvas.offsetHeight || 380;
      width = canvas.width = Math.floor(w * dpr);
      height = canvas.height = Math.floor(h * dpr);
      radius = Math.min(width, height) * 0.42;
    };

    updateDimensions();

    const handleResize = () => {
      updateDimensions();
    };
    window.addEventListener('resize', handleResize);

    // 1. Generate High-Density Fibonacci 3D Points (~950 points)
    const totalPoints = 950;
    const phiAngle = Math.PI * (3 - Math.sqrt(5));
    const globePoints = [];

    for (let i = 0; i < totalPoints; i++) {
      const yNorm = totalPoints > 1 ? 1 - (i / (totalPoints - 1)) * 2 : 0;
      const clampedY = Math.max(-1, Math.min(1, yNorm));
      const rAtY = Math.sqrt(Math.max(0, 1 - clampedY * clampedY));
      const theta = phiAngle * i;

      const xNorm = Math.cos(theta) * rAtY;
      const zNorm = Math.sin(theta) * rAtY;

      const lat = Math.asin(clampedY) * (180 / Math.PI);
      const lon = Math.atan2(zNorm, -xNorm) * (180 / Math.PI) - 180;
      const isLand = isLandmass(lat, lon);

      globePoints.push({
        baseXNorm: xNorm,
        baseYNorm: -clampedY,
        baseZNorm: zNorm,
        isLand
      });
    }

    // 2. Sample dense points along Continent Coastlines for smooth 3D curves
    const denseContinentPaths = CONTINENT_POLYGONS.map(polygon => {
      const denseRing = [];
      for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
        const steps = Math.max(1, Math.ceil(dist / 4.0)); // sample every ~4 degrees
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const lon = p1[0] + (p2[0] - p1[0]) * t;
          const lat = p1[1] + (p2[1] - p1[1]) * t;
          denseRing.push({ lon, lat });
        }
      }
      return denseRing;
    });

    let time = 0;

    const render = () => {
      try {
        time += 0.016;
        ctx.clearRect(0, 0, width, height);

        const dpr = window.devicePixelRatio || 1;
        const cx = width / 2;
        const cy = height / 2;
        const fov = 460 * dpr;

        // Auto-rotation handling
        if (!mouseRef.current.isDown && isRotatingRef.current) {
          rotRef.current.y += mouseRef.current.velX || 0.003;
          rotRef.current.x += mouseRef.current.velY || 0.0004;
        }

        // Dampen momentum
        if (!mouseRef.current.isDown) {
          mouseRef.current.velX *= 0.96;
          mouseRef.current.velY *= 0.96;
          if (Math.abs(mouseRef.current.velX) < 0.0001) mouseRef.current.velX = 0.0028;
          if (Math.abs(mouseRef.current.velY) < 0.00005) mouseRef.current.velY = 0.0003;
        }

        rotRef.current.x = Math.max(-0.62, Math.min(0.62, rotRef.current.x));

        const cosY = Math.cos(rotRef.current.y);
        const sinY = Math.sin(rotRef.current.y);
        const cosX = Math.cos(rotRef.current.x);
        const sinX = Math.sin(rotRef.current.x);

        // Project 3D coordinate function
        const project = (x3, y3, z3) => {
          const x1 = x3 * cosY - z3 * sinY;
          const z1 = z3 * cosY + x3 * sinY;
          const y2 = y3 * cosX - z1 * sinX;
          const z2 = z1 * cosX + y3 * sinX;

          const denom = fov + z2;
          const scale = denom > 1 ? fov / denom : 1;
          const px = cx + x1 * scale;
          const py = cy + y2 * scale;
          const alpha = Math.max(0.08, Math.min(1, (z2 + radius) / (2 * radius)));

          return { px, py, z: z2, scale, alpha };
        };

        // 1. Atmosphere Halo
        const haloGrad = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 1.35);
        haloGrad.addColorStop(0, 'rgba(16, 185, 129, 0.09)');
        haloGrad.addColorStop(0.4, 'rgba(37, 99, 235, 0.07)');
        haloGrad.addColorStop(0.8, 'rgba(56, 189, 248, 0.025)');
        haloGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
        ctx.fill();

        // 2. 3D Shaded Inner Globe Sphere
        const sphereGrad = ctx.createRadialGradient(
          cx - radius * 0.3,
          cy - radius * 0.3,
          radius * 0.1,
          cx,
          cy,
          radius
        );
        sphereGrad.addColorStop(0, 'rgba(240, 253, 250, 0.96)');
        sphereGrad.addColorStop(0.5, 'rgba(224, 242, 254, 0.74)');
        sphereGrad.addColorStop(0.85, 'rgba(203, 213, 225, 0.42)');
        sphereGrad.addColorStop(1, 'rgba(148, 163, 184, 0.18)');
        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Sphere Rim Stroke
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.2 * dpr;
        ctx.stroke();

        // 3. Graticule Lat/Long Grid Rings (Equator & Meridians)
        // Equator ring
        ctx.beginPath();
        for (let a = 0; a <= 360; a += 10) {
          const rad = (a * Math.PI) / 180;
          const p = project(Math.cos(rad) * radius, 0, Math.sin(rad) * radius);
          if (p.z > -radius * 0.15) {
            if (a === 0) ctx.moveTo(p.px, p.py);
            else ctx.lineTo(p.px, p.py);
          }
        }
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.28)';
        ctx.setLineDash([4 * dpr, 6 * dpr]);
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
        ctx.setLineDash([]);

        // 4. Draw Authentic Continent Coastline Polygons & Fills
        denseContinentPaths.forEach(denseRing => {
          const projectedRing = denseRing.map(pt => {
            const p3 = latLonToSphere(pt.lat, pt.lon, radius);
            const proj = project(p3.x, -p3.y, p3.z);
            return proj;
          });

          // Draw visible polygon segments on front hemisphere
          ctx.beginPath();
          let isDrawing = false;

          for (let i = 0; i < projectedRing.length; i++) {
            const pt = projectedRing[i];
            const isFront = pt.z > -radius * 0.18;

            if (isFront) {
              if (!isDrawing) {
                ctx.moveTo(pt.px, pt.py);
                isDrawing = true;
              } else {
                ctx.lineTo(pt.px, pt.py);
              }
            } else {
              isDrawing = false;
            }
          }

          // Land stroke & soft fill
          ctx.strokeStyle = 'rgba(5, 150, 105, 0.85)';
          ctx.lineWidth = 1.6 * dpr;
          ctx.stroke();
          ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
          ctx.fill();
        });

        // 5. High-Density Matrix Dots (Distinguishing Land vs Oceans)
        const projectedGlobe = globePoints.map(p => {
          const proj = project(p.baseXNorm * radius, p.baseYNorm * radius, p.baseZNorm * radius);
          return { ...p, ...proj };
        });
        projectedGlobe.sort((a, b) => a.z - b.z);

        projectedGlobe.forEach(p => {
          const isFront = p.z > -radius * 0.15;
          const ptRadius = (p.isLand ? 2.6 : 1.2) * p.scale * dpr;

          ctx.beginPath();
          ctx.arc(p.px, p.py, Math.max(0.6 * dpr, ptRadius), 0, Math.PI * 2);

          if (p.isLand) {
            // High-visibility green landmass points
            if (isFront) {
              ctx.fillStyle = `rgba(5, 150, 105, ${Math.min(0.95, p.alpha * 1.15)})`;
            } else {
              ctx.fillStyle = `rgba(16, 185, 129, ${p.alpha * 0.35})`;
            }
          } else {
            // Muted ocean matrix points
            ctx.fillStyle = isFront
              ? `rgba(148, 163, 184, ${p.alpha * 0.25})`
              : `rgba(203, 213, 225, ${p.alpha * 0.10})`;
          }
          ctx.fill();
        });

        // 6. Project Impact Hubs
        const projectedHubs = IMPACT_HUBS.map(hub => {
          const p = latLonToSphere(hub.lat, hub.lon, radius);
          const proj = project(p.x, -p.y, p.z);
          return { ...hub, ...proj };
        });

        latestProjectedHubsRef.current = projectedHubs;

        // 7. Great-Circle Flight Arcs with Photons
        FLIGHT_ARCS.forEach(arc => {
          arc.progress = (arc.progress + arc.speed) % 1;
          const h1 = projectedHubs.find(h => h.id === arc.from);
          const h2 = projectedHubs.find(h => h.id === arc.to);

          if (h1 && h2 && (h1.z > -radius * 0.35 || h2.z > -radius * 0.35)) {
            const midX = (h1.px + h2.px) / 2;
            const midY = (h1.py + h2.py) / 2 - 38 * dpr;

            // Arc Line
            ctx.beginPath();
            ctx.moveTo(h1.px, h1.py);
            ctx.quadraticCurveTo(midX, midY, h2.px, h2.py);
            ctx.strokeStyle = `rgba(16, 185, 129, ${Math.min(h1.alpha, h2.alpha) * 0.45})`;
            ctx.lineWidth = 1.6 * dpr;
            ctx.stroke();

            // Moving Photon
            const tP = arc.progress;
            const beamX = (1 - tP) * (1 - tP) * h1.px + 2 * (1 - tP) * tP * midX + tP * tP * h2.px;
            const beamY = (1 - tP) * (1 - tP) * h1.py + 2 * (1 - tP) * tP * midY + tP * tP * h2.py;

            ctx.beginPath();
            ctx.arc(beamX, beamY, 3.6 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = arc.color;
            ctx.shadowColor = arc.color;
            ctx.shadowBlur = 10 * dpr;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });

        // 8. Draw Active Hub Nodes with Country Flags & Sonar Waves
        projectedHubs.forEach(hub => {
          const isFront = hub.z > 0;
          const hubSize = (isFront ? 6.5 : 3.8) * hub.scale * dpr;
          const isHovered = hoveredHubRef.current?.id === hub.id;

          // Pulsating Sonar Ripple
          if (isFront) {
            const pulsePhase = (time * 2.5 + Math.abs(hub.lat)) % 1;
            const rippleRadius = (hubSize + pulsePhase * 20) * dpr;
            ctx.beginPath();
            ctx.arc(hub.px, hub.py, rippleRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(16, 185, 129, ${(1 - pulsePhase) * hub.alpha * 0.72})`;
            ctx.lineWidth = 1.4 * dpr;
            ctx.stroke();
          }

          // Hub Node Core
          ctx.beginPath();
          ctx.arc(hub.px, hub.py, Math.max(2 * dpr, hubSize), 0, Math.PI * 2);
          ctx.fillStyle = isFront ? hub.color : `rgba(148, 163, 184, ${hub.alpha * 0.45})`;
          ctx.shadowColor = hub.color;
          ctx.shadowBlur = isFront ? (isHovered ? 18 : 10) * dpr : 0;
          ctx.fill();
          ctx.shadowBlur = 0;

          // White Center Beacon
          if (isFront) {
            ctx.beginPath();
            ctx.arc(hub.px, hub.py, hubSize * 0.42, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // Floating Label with Country Flag & Name right on the globe!
            ctx.font = `bold ${Math.max(10, Math.floor(10.5 * dpr))}px Inter, system-ui, sans-serif`;
            const labelText = `${hub.flag} ${hub.country}`;
            const textMetrics = ctx.measureText(labelText);
            const pillW = textMetrics.width + 12 * dpr;
            const pillH = 18 * dpr;
            const pillX = hub.px + 9 * dpr;
            const pillY = hub.py - 10 * dpr;

            // Label pill background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
            ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
            ctx.lineWidth = 1 * dpr;
            ctx.beginPath();
            ctx.roundRect(pillX, pillY - pillH / 2, pillW, pillH, 6 * dpr);
            ctx.fill();
            ctx.stroke();

            // Label text
            ctx.fillStyle = '#0f172a';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelText, pillX + 6 * dpr, pillY);
          }
        });
      } catch (err) {
        console.warn('[InteractiveGlobe3D] Render tick error:', err);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Pointer Interaction (Smooth Drag & Momentum)
  const handlePointerDown = (e) => {
    mouseRef.current.isDown = true;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    mouseRef.current.lastX = clientX;
    mouseRef.current.lastY = clientY;
  };

  const handlePointerMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    const pointerX = (clientX - rect.left) * dpr;
    const pointerY = (clientY - rect.top) * dpr;

    // Hover hit test
    const hubs = latestProjectedHubsRef.current || [];
    let matchHub = null;

    for (const hub of hubs) {
      if (hub.z > 0) {
        const dist = Math.hypot(pointerX - hub.px, pointerY - hub.py);
        if (dist < 26 * dpr) {
          matchHub = hub;
          break;
        }
      }
    }

    if (matchHub?.id !== hoveredHubRef.current?.id) {
      hoveredHubRef.current = matchHub;
      setHoveredHub(matchHub);
      if (matchHub) {
        setTooltipPos({ x: matchHub.px / dpr, y: matchHub.py / dpr });
      }
    }

    if (!mouseRef.current.isDown) return;

    const dx = clientX - mouseRef.current.lastX;
    const dy = clientY - mouseRef.current.lastY;

    rotRef.current.y += dx * 0.0075;
    rotRef.current.x += dy * 0.0075;

    mouseRef.current.velX = dx * 0.0008;
    mouseRef.current.velY = dy * 0.0008;

    mouseRef.current.lastX = clientX;
    mouseRef.current.lastY = clientY;
  };

  const handlePointerUp = () => {
    mouseRef.current.isDown = false;
  };

  const handlePointerLeave = () => {
    mouseRef.current.isDown = false;
    if (hoveredHubRef.current !== null) {
      hoveredHubRef.current = null;
      setHoveredHub(null);
    }
  };

  const currentEvent = LIVE_EVENTS[currentEventIdx] || LIVE_EVENTS[0] || {
    id: 1,
    text: 'Active Field Telemetry Reconciled',
    sub: 'Verified Milestone Escrows',
    tag: '100% Direct Impact',
    icon: '⚡'
  };

  return (
    <div
      ref={containerRef}
      className="globe-3d-wrapper"
      role="region"
      aria-label="Interactive Global Philanthropy 3D Visualizer"
    >
      {/* 3D Canvas Container */}
      <div
        className="globe-canvas-box"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerLeave}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <canvas ref={canvasRef} className="globe-3d-canvas" />

        {/* Live Interactive Hover Tooltip */}
        {hoveredHub && (
          <div
            className="globe-hub-tooltip"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y - 15}px`
            }}
          >
            <div className="tooltip-head">
              <span className="tooltip-flag">{hoveredHub.flag}</span>
              <strong>{hoveredHub.name}, {hoveredHub.country}</strong>
            </div>
            <div className="tooltip-body">
              <span className="tooltip-cause">{hoveredHub.icon} {hoveredHub.cause}</span>
              <div className="tooltip-stats">
                <span className="tooltip-amount">{hoveredHub.funded}</span>
                <span className="tooltip-status">✓ {hoveredHub.status}</span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Holographic Telemetry Pill */}
        <div className="globe-telemetry-badge">
          <span className="telemetry-icon-badge">{currentEvent.icon}</span>
          <div className="telemetry-info">
            <div className="telemetry-row">
              <strong>{currentEvent.text}</strong>
              <span className="telemetry-tag">{currentEvent.tag}</span>
            </div>
            <span className="telemetry-sub">{currentEvent.sub}</span>
          </div>
        </div>

        {/* Active Nodes Floating Badge */}
        <div className="globe-floating-badge badge-top-right">
          <span className="pulse-indicator-emerald"></span>
          <div className="badge-text-block">
            <strong>6 Active Field Nodes</strong>
            <span>Continuous Telemetry Sync</span>
          </div>
        </div>
      </div>

      {/* Interactive Micro HUD Controls Bar */}
      <div className="globe-hud-bar">
        <div className="hud-status-group">
          <span className="hud-live-beacon"></span>
          <span className="hud-title">Global Impact Network</span>
        </div>

        <div className="hud-actions-group">
          {/* Hub Quick Select Buttons */}
          <div className="hud-hub-pills">
            {IMPACT_HUBS.map((hub, idx) => (
              <button
                type="button"
                key={hub.id}
                className={`hud-pill-btn ${activeHubIndex === idx ? 'active' : ''}`}
                onClick={() => handleFocusHub(idx)}
                title={`Center on ${hub.name}, ${hub.country} (${hub.cause})`}
              >
                <span>{hub.flag}</span>
                <span className="hub-btn-name">{hub.country}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`hud-control-toggle ${isRotating ? 'rotating' : ''}`}
            onClick={() => setIsRotating(prev => !prev)}
            title={isRotating ? 'Pause globe rotation' : 'Resume auto rotation'}
          >
            {isRotating ? '⏸️ Pause' : '▶️ Rotate'}
          </button>
        </div>
      </div>
    </div>
  );
}
