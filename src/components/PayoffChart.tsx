import React, { useState } from 'react';
import {
  Activity,
  Sliders,
  TrendingUp,
  TrendingDown,
  Info,
  Shield,
  Zap,
} from 'lucide-react';
import { Strategy, StrategyPayoffAnalysis } from '../types/trading';
import {
  calculateStrategyPayoff,
  UNDERLYING_CONFIGS,
} from '../services/optionPricer';

interface PayoffChartProps {
  strategy: Strategy;
}

export const PayoffChart: React.FC<PayoffChartProps> = ({ strategy }) => {
  const config = UNDERLYING_CONFIGS[strategy.underlying];
  const [spotPrice, setSpotPrice] = useState<number>(config.baseSpotPrice);
  const [daysToExpiry, setDaysToExpiry] = useState<number>(3);
  const [hoveredPoint, setHoveredPoint] = useState<{
    spot: number;
    pnlExpiry: number;
    pnlCurrent: number;
    x: number;
    y: number;
  } | null>(null);

  // Compute payoff analysis
  const analysis: StrategyPayoffAnalysis = calculateStrategyPayoff(
    strategy.legs,
    strategy.underlying,
    spotPrice,
    daysToExpiry,
    0.14
  );

  const {
    maxProfit,
    maxLoss,
    riskRewardRatio,
    lowerBreakeven,
    upperBreakeven,
    netDelta,
    netTheta,
    netGamma,
    netVega,
    payoffPoints,
  } = analysis;

  // Chart Geometry
  const chartWidth = 900;
  const chartHeight = 320;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;

  const innerWidth = chartWidth - padLeft - padRight;
  const innerHeight = chartHeight - padTop - padBottom;

  const allPnls = [
    ...payoffPoints.map((p) => p.pnlAtExpiry),
    ...payoffPoints.map((p) => p.pnlCurrent),
  ];
  const minPnl = Math.min(-1000, ...allPnls);
  const maxPnl = Math.max(1000, ...allPnls);
  const pnlRange = maxPnl - minPnl || 1;

  const minSpot = payoffPoints[0]?.spotPrice || spotPrice * 0.95;
  const maxSpot = payoffPoints[payoffPoints.length - 1]?.spotPrice || spotPrice * 1.05;
  const spotRange = maxSpot - minSpot || 1;

  const getX = (spot: number) => {
    return padLeft + ((spot - minSpot) / spotRange) * innerWidth;
  };

  const getY = (pnl: number) => {
    return padTop + innerHeight - ((pnl - minPnl) / pnlRange) * innerHeight;
  };

  const zeroY = getY(0);
  const currentSpotX = getX(spotPrice);

  // SVG Paths
  const expiryLine = payoffPoints.reduce((acc, pt, i) => {
    const x = getX(pt.spotPrice);
    const y = getY(pt.pnlAtExpiry);
    return i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
  }, '');

  const currentLine = payoffPoints.reduce((acc, pt, i) => {
    const x = getX(pt.spotPrice);
    const y = getY(pt.pnlCurrent);
    return i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
  }, '');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Payoff & Greeks Analysis</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
              {strategy.underlying}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulate option payoff curves at expiry (T+0 to Expiration) and evaluate portfolio delta, theta decay, and breakevens.
          </p>
        </div>

        {/* Spot & Expiry Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400">Underlying Spot:</span>
            <input
              type="number"
              step={config.strikeInterval}
              value={spotPrice}
              onChange={(e) => setSpotPrice(Number(e.target.value))}
              className="w-20 font-mono font-bold text-emerald-400 bg-transparent focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400">Days to Expiry:</span>
            <select
              value={daysToExpiry}
              onChange={(e) => setDaysToExpiry(Number(e.target.value))}
              className="font-mono text-white bg-transparent focus:outline-none cursor-pointer"
            >
              <option value={0}>0 Days (Expiry Day)</option>
              <option value={1}>1 Day</option>
              <option value={2}>2 Days</option>
              <option value={3}>3 Days</option>
              <option value={5}>5 Days</option>
              <option value={7}>7 Days (Weekly)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Greeks & Risk Profile Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Max Profit */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-xs text-slate-400">Max Profit</span>
          <div className="text-base font-bold font-mono text-emerald-400 tabular-nums">
            {maxProfit === 'UNLIMITED' ? 'Unlimited' : `₹${maxProfit.toLocaleString('en-IN')}`}
          </div>
        </div>

        {/* Max Loss */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-xs text-slate-400">Max Loss</span>
          <div className="text-base font-bold font-mono text-rose-400 tabular-nums">
            {maxLoss === 'UNLIMITED' ? 'Unlimited' : `₹${maxLoss.toLocaleString('en-IN')}`}
          </div>
        </div>

        {/* Lower Breakeven */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-xs text-slate-400">Lower BE</span>
          <div className="text-base font-bold font-mono text-slate-200 tabular-nums">
            {lowerBreakeven ? lowerBreakeven.toLocaleString('en-IN') : '--'}
          </div>
        </div>

        {/* Upper Breakeven */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-xs text-slate-400">Upper BE</span>
          <div className="text-base font-bold font-mono text-slate-200 tabular-nums">
            {upperBreakeven ? upperBreakeven.toLocaleString('en-IN') : '--'}
          </div>
        </div>

        {/* Net Delta */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-xs text-slate-400">Net Delta (Δ)</span>
          <div className="text-base font-bold font-mono text-sky-400 tabular-nums">
            {netDelta > 0 ? '+' : ''}{netDelta}
          </div>
        </div>

        {/* Net Theta (Daily income) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-xs text-slate-400">Net Theta (Θ/day)</span>
          <div className={`text-base font-bold font-mono tabular-nums ${netTheta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {netTheta >= 0 ? '+' : ''}₹{netTheta.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Net Gamma */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-xs text-slate-400">Net Gamma (Γ)</span>
          <div className="text-base font-bold font-mono text-amber-400 tabular-nums">
            {netGamma}
          </div>
        </div>

        {/* Net Vega */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
          <span className="text-xs text-slate-400">Net Vega (ν)</span>
          <div className="text-base font-bold font-mono text-indigo-400 tabular-nums">
            ₹{netVega}
          </div>
        </div>
      </div>

      {/* Payoff Curve SVG Display */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
              <span className="text-slate-300">Expiry Payoff</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-sky-400 border-dashed inline-block" />
              <span className="text-slate-300">T+{daysToExpiry} Current Payoff</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400 inline-block" />
              <span className="text-slate-300">Spot ({spotPrice})</span>
            </div>
          </div>
        </div>

        {/* SVG Viewport */}
        <div className="relative w-full overflow-hidden select-none">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto select-none"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = padTop + innerHeight * pct;
              const val = Math.round(maxPnl - pct * pnlRange);
              return (
                <g key={i}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={chartWidth - padRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    ₹{val.toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Zero Axis Reference Line */}
            <line
              x1={padLeft}
              y1={zeroY}
              x2={chartWidth - padRight}
              y2={zeroY}
              stroke="#64748b"
              strokeWidth="1.5"
            />

            {/* Current Spot Vertical Marker */}
            <line
              x1={currentSpotX}
              y1={padTop}
              x2={currentSpotX}
              y2={chartHeight - padBottom}
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeDasharray="4,4"
            />
            <text
              x={currentSpotX}
              y={chartHeight - padBottom + 16}
              fill="#fbbf24"
              fontSize="10"
              fontFamily="monospace"
              textAnchor="middle"
            >
              Spot: {spotPrice}
            </text>

            {/* Breakeven Vertical Markers */}
            {lowerBreakeven && (
              <g>
                <line
                  x1={getX(lowerBreakeven)}
                  y1={padTop}
                  x2={getX(lowerBreakeven)}
                  y2={chartHeight - padBottom}
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={getX(lowerBreakeven)}
                  y={chartHeight - padBottom + 28}
                  fill="#ef4444"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  BE: {lowerBreakeven}
                </text>
              </g>
            )}

            {upperBreakeven && (
              <g>
                <line
                  x1={getX(upperBreakeven)}
                  y1={padTop}
                  x2={getX(upperBreakeven)}
                  y2={chartHeight - padBottom}
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={getX(upperBreakeven)}
                  y={chartHeight - padBottom + 28}
                  fill="#ef4444"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  BE: {upperBreakeven}
                </text>
              </g>
            )}

            {/* T+0 Current Payoff Line */}
            <path
              d={currentLine}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              strokeDasharray="4,2"
            />

            {/* Expiry Payoff Line */}
            <path
              d={expiryLine}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Hover Circles */}
            {payoffPoints.map((pt, i) => (
              <circle
                key={i}
                cx={getX(pt.spotPrice)}
                cy={getY(pt.pnlAtExpiry)}
                r="6"
                className="opacity-0 hover:opacity-100 cursor-pointer fill-emerald-400"
                onMouseEnter={() =>
                  setHoveredPoint({
                    spot: pt.spotPrice,
                    pnlExpiry: pt.pnlAtExpiry,
                    pnlCurrent: pt.pnlCurrent,
                    x: getX(pt.spotPrice),
                    y: getY(pt.pnlAtExpiry),
                  })
                }
              />
            ))}
          </svg>

          {/* Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none bg-slate-950/95 border border-slate-700 rounded-lg p-2.5 shadow-xl text-xs font-mono space-y-1 transform -translate-x-1/2 -translate-y-full"
              style={{
                left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                top: `${(hoveredPoint.y / chartHeight) * 100 - 8}%`,
              }}
            >
              <div className="text-amber-400 font-bold">Index Spot: {hoveredPoint.spot}</div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">At Expiry:</span>
                <span
                  className={
                    hoveredPoint.pnlExpiry >= 0
                      ? 'text-emerald-400 font-bold'
                      : 'text-rose-400 font-bold'
                  }
                >
                  {hoveredPoint.pnlExpiry >= 0 ? '+' : ''}₹{hoveredPoint.pnlExpiry.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">T+{daysToExpiry} P&L:</span>
                <span
                  className={
                    hoveredPoint.pnlCurrent >= 0
                      ? 'text-sky-400 font-bold'
                      : 'text-rose-400 font-bold'
                  }
                >
                  {hoveredPoint.pnlCurrent >= 0 ? '+' : ''}₹{hoveredPoint.pnlCurrent.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
