"use client";

import type { MonthlySeriesPoint } from "@/context/zenith-preferences-context";
import { PALETTE } from "@/context/zenith-preferences-context";

type Palette = typeof PALETTE;

interface MonthlyIrradianceChartProps {
  series: MonthlySeriesPoint[];
  hoveredIdx: number;
  onHoverIdx: (idx: number) => void;
  palette?: Palette;
}

export function MonthlyIrradianceChart({
  series,
  hoveredIdx,
  onHoverIdx,
  palette = PALETTE,
}: MonthlyIrradianceChartProps) {
  const maxVal = 9.0;
  return (
    <svg className="h-full w-full overflow-visible" viewBox="0 0 660 210" aria-hidden>
      {[2, 4, 6, 8].map((val) => {
        const y = 175 - (val / maxVal) * 145;
        return (
          <g key={val}>
            <line
              x1="34"
              y1={y}
              x2="645"
              y2={y}
              stroke={palette.chartRule}
              strokeDasharray="2 2"
            />
            <text
              x="28"
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fontFamily="IBM Plex Mono, monospace"
              fill={palette.chartInk}
            >
              {val}.0
            </text>
          </g>
        );
      })}

      <polyline
        fill="none"
        stroke="#0EA5E9"
        strokeWidth="1.75"
        strokeDasharray="4 3"
        points={series
          .map((d, i) => {
            const x = 58 + i * 50;
            const y = 175 - (d.clear / maxVal) * 145;
            return `${x},${y}`;
          })
          .join(" ")}
      />

      {series.map((d, i) => {
        const x = 44 + i * 50;
        const barH = (d.irr / maxVal) * 145;
        const y = 175 - barH;
        const clearY = 175 - (d.clear / maxVal) * 145;
        const isHovered = i === hoveredIdx;

        return (
          <g
            key={d.m}
            className="cursor-pointer"
            onMouseEnter={() => onHoverIdx(i)}
          >
            <rect
              x={x}
              y={clearY}
              width="28"
              height={Math.max(0, y - clearY)}
              fill="#0EA5E9"
              opacity="0.16"
            />
            <rect
              x={x}
              y={y}
              width="28"
              height={barH}
              fill={isHovered ? "#D97706" : "#F59E0B"}
            />
            <circle cx={x + 14} cy={clearY} r="2.5" fill="#0EA5E9" />
            <text
              x={x + 14}
              y="194"
              textAnchor="middle"
              fontSize="10"
              fontFamily="IBM Plex Mono, monospace"
              fontWeight={isHovered ? 700 : 400}
              fill={palette.chartInk}
            >
              {d.m}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface CashflowYearPoint {
  year: number;
  cumulativeSavingsUsd: number;
}

interface CashflowCrossoverChartProps {
  yearlyBreakdown: CashflowYearPoint[];
  palette?: Palette;
}

export function CashflowCrossoverChart({
  yearlyBreakdown,
  palette = PALETTE,
}: CashflowCrossoverChartProps) {
  const values = yearlyBreakdown.map((d) => d.cumulativeSavingsUsd);
  const minVal = Math.min(...values, -4000);
  const maxVal = Math.max(...values, 15000);
  const range = Math.max(1, maxVal - minVal);
  const zeroY = 20 + (maxVal / range) * 145;
  const yFor = (v: number) => zeroY - (v / range) * 145;
  const usdShort = (v: number) =>
    `${v < 0 ? "-" : ""}$${Math.abs(v) >= 1000 ? `${Math.round(Math.abs(v) / 1000)}k` : Math.round(Math.abs(v))}`;
  const ticks = [maxVal, maxVal / 2, ...(minVal < 0 ? [minVal] : [])];

  return (
    <svg className="h-full w-full overflow-visible" viewBox="0 0 660 205" aria-hidden>
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1="36"
            y1={yFor(v)}
            x2="645"
            y2={yFor(v)}
            stroke={palette.chartRule}
            strokeDasharray="2 2"
          />
          <text
            x="30"
            y={yFor(v) + 3}
            textAnchor="end"
            fontSize="9"
            fontFamily="IBM Plex Mono, monospace"
            fill={palette.chartInk}
          >
            {usdShort(v)}
          </text>
        </g>
      ))}
      <line
        x1="36"
        y1={zeroY}
        x2="645"
        y2={zeroY}
        stroke="#18181B"
        strokeWidth="1.2"
      />
      <text
        x="30"
        y={zeroY + 3}
        textAnchor="end"
        fontSize="9"
        fontFamily="IBM Plex Mono, monospace"
        fill={palette.chartInk}
      >
        $0
      </text>

      {yearlyBreakdown.map((d, i) => {
        const x = 44 + i * 24;
        const val = d.cumulativeSavingsUsd;
        const barH = (Math.abs(val) / range) * 145;
        const y = val >= 0 ? zeroY - barH : zeroY;

        return (
          <g key={d.year}>
            <rect
              x={x}
              y={y}
              width="16"
              height={Math.max(2, barH)}
              fill={val >= 0 ? "#16A34A" : "#F59E0B"}
              opacity={val >= 0 ? 0.9 : 0.75}
            >
              <title>{`Year ${d.year}: ${val < 0 ? "-" : ""}$${Math.abs(Math.round(val)).toLocaleString()} cumulative`}</title>
            </rect>
            {(d.year === 1 || d.year % 5 === 0) && (
              <text
                x={x + 8}
                y="192"
                textAnchor="middle"
                fontSize="9"
                fontFamily="IBM Plex Mono, monospace"
                fill={palette.chartInk}
              >
                Y{d.year}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface RunCompareMonthlyChartProps {
  baseSeries: number[];
  compareSeries?: number[] | null;
  palette?: Palette;
}

export function RunCompareMonthlyChart({
  baseSeries,
  compareSeries = null,
  palette = PALETTE,
}: RunCompareMonthlyChartProps) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const maxVal = Math.max(...baseSeries, ...(compareSeries || [1600]), 1600);

  return (
    <svg className="h-full w-full overflow-visible" viewBox="0 0 600 185" aria-hidden>
      {[400, 800, 1200, 1600].map((v) => {
        const y = 155 - (v / maxVal) * 130;
        return (
          <g key={v}>
            <line
              x1="36"
              y1={y}
              x2="585"
              y2={y}
              stroke={palette.chartRule}
              strokeDasharray="2 2"
            />
            <text
              x="30"
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fontFamily="IBM Plex Mono, monospace"
              fill={palette.chartInk}
            >
              {v}
            </text>
          </g>
        );
      })}

      {months.map((m, i) => {
        const x = 46 + i * 45;
        const h = ((baseSeries[i] ?? 0) / maxVal) * 130;
        const y = 155 - h;
        return (
          <g key={m}>
            <rect x={x} y={y} width="24" height={Math.max(0, h)} fill="#F59E0B" />
            <text
              x={x + 12}
              y="174"
              textAnchor="middle"
              fontSize="9"
              fontFamily="IBM Plex Mono, monospace"
              fill={palette.chartInk}
            >
              {m}
            </text>
          </g>
        );
      })}

      {compareSeries ? (
        <>
          <polyline
            fill="none"
            stroke="#0EA5E9"
            strokeWidth="2.25"
            strokeDasharray="5 3"
            points={compareSeries
              .map((v, i) => {
                const x = 58 + i * 45;
                const y = 155 - (v / maxVal) * 130;
                return `${x},${y}`;
              })
              .join(" ")}
          />
          {compareSeries.map((v, i) => {
            const x = 58 + i * 45;
            const y = 155 - (v / maxVal) * 130;
            return <circle key={i} cx={x} cy={y} r="3" fill="#0EA5E9" />;
          })}
        </>
      ) : null}
    </svg>
  );
}

interface RunCompareCashflowChartProps {
  baseNetCostUsd: number;
  baseAnnualSavingsUsd: number;
  compareNetCostUsd?: number | null;
  compareAnnualSavingsUsd?: number | null;
  palette?: Palette;
}

export function RunCompareCashflowChart({
  baseNetCostUsd,
  baseAnnualSavingsUsd,
  compareNetCostUsd = null,
  compareAnnualSavingsUsd = null,
  palette = PALETTE,
}: RunCompareCashflowChartProps) {
  const buildCurve = (netCost: number, annualSavings: number) => {
    const pts: Array<{ yr: number; cum: number }> = [];
    let cum = -netCost;
    for (let yr = 1; yr <= 25; yr++) {
      cum += annualSavings * Math.pow(1.018, yr - 1);
      pts.push({ yr, cum });
    }
    return pts;
  };

  const basePts = buildCurve(baseNetCostUsd, baseAnnualSavingsUsd);
  const compPts =
    compareNetCostUsd != null && compareAnnualSavingsUsd != null
      ? buildCurve(compareNetCostUsd, compareAnnualSavingsUsd)
      : null;

  const allVals = [
    ...basePts.map((p) => p.cum),
    ...(compPts ? compPts.map((p) => p.cum) : []),
    -4000,
  ];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals, 20000);
  const range = Math.max(1, maxVal - minVal);
  const zeroY = 18 + (maxVal / range) * 135;

  const toCoords = (pts: Array<{ yr: number; cum: number }>) =>
    pts
      .map((p, i) => {
        const x = 44 + i * 22;
        const y = 18 + ((maxVal - p.cum) / range) * 135;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <svg className="h-full w-full overflow-visible" viewBox="0 0 600 185" aria-hidden>
      <line
        x1="36"
        y1={zeroY}
        x2="585"
        y2={zeroY}
        stroke={palette.chartInk}
        strokeWidth="1"
      />
      <text
        x="30"
        y={zeroY + 3}
        textAnchor="end"
        fontSize="9"
        fontFamily="IBM Plex Mono, monospace"
        fill={palette.chartInk}
      >
        $0
      </text>

      {compPts ? (
        <polyline
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeDasharray="5 3"
          points={toCoords(compPts)}
        />
      ) : null}

      <polyline
        fill="none"
        stroke="#16A34A"
        strokeWidth="2.5"
        points={toCoords(basePts)}
      />

      {[1, 5, 10, 15, 20, 25].map((yr) => {
        const x = 44 + (yr - 1) * 22;
        return (
          <text
            key={yr}
            x={x}
            y="174"
            textAnchor="middle"
            fontSize="9"
            fontFamily="IBM Plex Mono, monospace"
            fill={palette.chartInk}
          >
            Y{yr}
          </text>
        );
      })}
    </svg>
  );
}
