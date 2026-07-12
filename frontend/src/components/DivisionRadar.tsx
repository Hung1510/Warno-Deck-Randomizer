import type { CategoryCode, DivisionProfile } from '../types';

const AXES: CategoryCode[] = ['LOG', 'REC', 'INF', 'ART', 'TNK', 'AA', 'HEL', 'AIR'];
const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 110;
const MAX = 10;
const RINGS = [2, 4, 6, 8, 10];

function point(index: number, value: number): [number, number] {
  const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
  const r = (value / MAX) * RADIUS;
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

interface DivisionRadarProps {
  profile: DivisionProfile;
}

// Plain SVG, no charting library -- keeps this consistent with the rest of the
// frontend, which doesn't pull in Chart.js/recharts/d3 anywhere else.
export default function DivisionRadar({ profile }: DivisionRadarProps) {
  const values = AXES.map((cat) => profile.categories[cat].strength);
  const polygonPoints = AXES.map((cat, i) => point(i, profile.categories[cat].strength).join(',')).join(' ');

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="div-radar"
      role="img"
      aria-label={`Category strength radar: ${AXES.map((c, i) => `${c} ${values[i]}/10`).join(', ')}`}
    >
      {RINGS.map((ring) => {
        const ringPoints = AXES.map((_, i) => point(i, ring).join(',')).join(' ');
        return <polygon key={ring} points={ringPoints} className="div-radar__ring" />;
      })}
      {AXES.map((cat, i) => {
        const [x, y] = point(i, MAX);
        return <line key={cat} x1={CENTER} y1={CENTER} x2={x} y2={y} className="div-radar__axis" />;
      })}
      <polygon points={polygonPoints} className="div-radar__shape" />
      {AXES.map((cat, i) => {
        const [x, y] = point(i, values[i]);
        return <circle key={cat} cx={x} cy={y} r={3} className="div-radar__dot" />;
      })}
      {AXES.map((cat, i) => {
        const [lx, ly] = point(i, MAX + 1.8);
        return (
          <text key={cat} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="div-radar__label">
            {cat}
          </text>
        );
      })}
    </svg>
  );
}