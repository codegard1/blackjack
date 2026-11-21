import React from 'react';
import { Text, makeStyles, tokens } from '@fluentui/react-components';

const CHART_WIDTH = 320;
const CHART_HEIGHT = 84;
const PADDING_X = 6;
const PADDING_Y = 8;

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  svg: {
    display: 'block',
    width: '100%',
    height: `${CHART_HEIGHT}px`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  baseline: {
    stroke: tokens.colorNeutralStroke1,
    strokeWidth: '1',
    strokeDasharray: '4 3',
  },
  area: {
    fill: tokens.colorBrandBackground2,
    opacity: 0.65,
  },
  line: {
    fill: 'none',
    stroke: tokens.colorBrandStroke1,
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  dot: {
    fill: tokens.colorBrandStroke1,
  },
  legend: {
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: 'tabular-nums',
  },
});

export interface IBalanceChartProps {
  /** balance values in chronological order */
  values: number[];
  /** accessible label prefix, such as the player's or character's name */
  label: string;
  /** optional reference level (such as a character's return threshold or starting bank) */
  referenceValue?: number;
  referenceLabel?: string;
}

/**
 * Hand-rolled SVG line chart of a bank balance over time, styled with Fluent UI tokens
 * so it follows the chosen theme mode and accent color. Shared by character cards and
 * session summaries.
 */
export const BalanceChart: React.FC<IBalanceChartProps> = ({
  values,
  label,
  referenceValue,
  referenceLabel,
}) => {
  const styles = useStyles();
  const points = values.length > 0 ? values : [0];
  const allValues = referenceValue !== undefined ? [...points, referenceValue] : points;
  const minVal = Math.min(0, ...allValues);
  const maxVal = Math.max(100, ...allValues);
  const span = Math.max(1, maxVal - minVal);

  const innerWidth = CHART_WIDTH - PADDING_X * 2;
  const innerHeight = CHART_HEIGHT - PADDING_Y * 2;

  const toX = (index: number): number => (
    points.length <= 1
      ? PADDING_X + innerWidth / 2
      : PADDING_X + (index / (points.length - 1)) * innerWidth
  );
  const toY = (value: number): number => (
    PADDING_Y + innerHeight - ((value - minVal) / span) * innerHeight
  );

  const coords = points.map((value, index) => ({ x: toX(index), y: toY(value) }));
  const polylinePoints = coords.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const bottomY = (PADDING_Y + innerHeight).toFixed(1);
  const areaPoints = coords.length > 1
    ? `${coords[0].x.toFixed(1)},${bottomY} ${polylinePoints} ${coords[coords.length - 1].x.toFixed(1)},${bottomY}`
    : undefined;
  const last = coords[coords.length - 1];
  const refY = referenceValue !== undefined ? toY(referenceValue) : undefined;

  const startBalance = points[0];
  const currentBalance = points[points.length - 1];
  const highBalance = Math.max(...points);
  const lowBalance = Math.min(...points);

  return (
    <div className={styles.root}>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} balance over time: started at $${startBalance}, now $${currentBalance}, high $${highBalance}, low $${lowBalance}`}
        className={styles.svg}
      >
        {refY !== undefined && (
          <line
            x1={PADDING_X}
            y1={refY.toFixed(1)}
            x2={CHART_WIDTH - PADDING_X}
            y2={refY.toFixed(1)}
            className={styles.baseline}
          />
        )}
        {areaPoints && <polygon points={areaPoints} className={styles.area} />}
        {coords.length > 1 && <polyline points={polylinePoints} className={styles.line} />}
        <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="3" className={styles.dot} />
      </svg>
      <div className={styles.legend}>
        <Text size={200}>{`Start: $${startBalance}`}</Text>
        {referenceValue !== undefined && (
          <Text size={200}>{`${referenceLabel ?? 'Target'}: $${referenceValue}`}</Text>
        )}
        <Text size={200}>{`Now: $${currentBalance}`}</Text>
      </div>
    </div>
  );
};
