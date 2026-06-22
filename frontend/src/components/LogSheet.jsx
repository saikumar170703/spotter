import React, { useRef, useEffect, useCallback } from 'react';
import './LogSheet.css';

/**
 * ELD Daily Log Sheet — Canvas-drawn FMCSA-style driver's daily log.
 *
 * Duty Status Codes:
 *   1 = Off Duty
 *   2 = Sleeper Berth
 *   3 = Driving
 *   4 = On Duty (Not Driving)
 */

const STATUS_LABELS = ['Off Duty', 'Sleeper\nBerth', 'Driving', 'On Duty\n(Not Driving)'];
const STATUS_ROW_MAP = { 1: 0, 2: 1, 3: 2, 4: 3 };

const COLORS = {
  bg: '#ffffff',
  headerBg: '#f8f9fa',
  gridLine: '#cccccc',
  gridLineLight: '#e5e5e5',
  gridLineDark: '#999999',
  text: '#1a1a1a',
  textLight: '#666666',
  textMuted: '#999999',
  statusLine: '#1a56db',
  statusLineShadow: 'rgba(26, 86, 219, 0.2)',
  labelBg: '#f0f4ff',
  hourText: '#333333',
  totalBg: '#f8f9fa',
  accent: '#3b82f6',
  remarksBg: '#fafafa',
};

// Canvas dimensions
const CANVAS_W = 950;
const CANVAS_H = 680;

// Layout regions
const HEADER_H = 110;
const GRID_TOP = HEADER_H + 10;
const GRID_LEFT = 120;
const GRID_RIGHT = CANVAS_W - 60;
const GRID_W = GRID_RIGHT - GRID_LEFT;
const ROW_H = 40;
const GRID_H = ROW_H * 4;
const GRID_BOTTOM = GRID_TOP + GRID_H;
const HOUR_W = GRID_W / 24;

const REMARKS_TOP = GRID_BOTTOM + 40;
const RECAP_TOP = REMARKS_TOP + 90;

export default function LogSheet({ dailyLog, dayNumber, totalDays, carrierName = 'Spotter ELD Carrier' }) {
  const canvasRef = useRef(null);

  const drawLog = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${CANVAS_H}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    drawHeader(ctx, dailyLog);
    drawGrid(ctx);
    drawStatusLine(ctx, dailyLog.segments);
    drawTotals(ctx, dailyLog.totals);
    drawRemarks(ctx, dailyLog);
    drawRecap(ctx, dailyLog);
  }, [dailyLog]);

  useEffect(() => {
    drawLog();
  }, [drawLog]);

  function drawHeader(ctx, log) {
    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText("Driver's Daily Log", 20, 30);

    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = COLORS.textLight;
    ctx.fillText('(24 hours)', 20, 44);

    // Date
    const dateObj = new Date(log.date + 'T00:00:00');
    const dateStr = dateObj.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = COLORS.textLight;
    ctx.fillText('Date:', 220, 28);
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(dateStr, 252, 28);

    // Day number
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = COLORS.textLight;
    ctx.fillText(`Day ${log.day_number}`, 220, 44);

    // File info
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'right';
    ctx.fillText('Original — File at home terminal.', CANVAS_W - 20, 22);
    ctx.fillText('Duplicate — Driver retains in his/her possession for 8 days.', CANVAS_W - 20, 36);
    ctx.textAlign = 'left';

    // Horizontal divider
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 52);
    ctx.lineTo(CANVAS_W - 20, 52);
    ctx.stroke();

    // Row 2: From / To
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = COLORS.textLight;
    ctx.fillText('From:', 20, 68);
    ctx.fillText('To:', 300, 68);

    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    const from = (log.from_location || '').substring(0, 35);
    const to = (log.to_location || '').substring(0, 35);
    ctx.fillText(from, 55, 68);
    ctx.fillText(to, 320, 68);

    // Row 3: Miles, Carrier
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = COLORS.textLight;
    ctx.fillText('Total Miles Driving Today:', 20, 86);
    ctx.fillText('Name of Carrier:', 400, 86);

    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(String(Math.round(log.total_miles || 0)), 170, 86);
    ctx.fillText(carrierName, 500, 86);

    // Row 4: Truck/Trailer info
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = COLORS.textLight;
    ctx.fillText('Truck/Tractor and Trailer Numbers:', 20, 104);
    ctx.fillText('Home Terminal Address:', 400, 104);
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('Unit 101 / Trailer 5542', 215, 104);
  }

  function drawGrid(ctx) {
    // Background for label column
    ctx.fillStyle = COLORS.labelBg;
    ctx.fillRect(20, GRID_TOP, GRID_LEFT - 20, GRID_H);

    // Background for totals column
    ctx.fillStyle = COLORS.totalBg;
    ctx.fillRect(GRID_RIGHT, GRID_TOP, CANVAS_W - 20 - GRID_RIGHT, GRID_H);

    // Draw status labels on the left
    ctx.textAlign = 'left';
    for (let i = 0; i < 4; i++) {
      const y = GRID_TOP + i * ROW_H;

      // Row number
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillStyle = COLORS.accent;
      ctx.fillText(`${i + 1}.`, 24, y + ROW_H / 2 + 1);

      // Status label (handle multi-line)
      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = COLORS.text;
      const lines = STATUS_LABELS[i].split('\n');
      const lineH = 13;
      const startY = y + (ROW_H - lines.length * lineH) / 2 + 10;
      lines.forEach((line, li) => {
        ctx.fillText(line, 42, startY + li * lineH);
      });

      // Horizontal row line
      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(CANVAS_W - 20, y);
      ctx.stroke();
    }

    // Bottom border of grid
    ctx.strokeStyle = COLORS.gridLineDark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, GRID_BOTTOM);
    ctx.lineTo(CANVAS_W - 20, GRID_BOTTOM);
    ctx.stroke();

    // Top border of grid
    ctx.beginPath();
    ctx.moveTo(20, GRID_TOP);
    ctx.lineTo(CANVAS_W - 20, GRID_TOP);
    ctx.stroke();

    // Draw hour lines and labels
    ctx.textAlign = 'center';
    for (let h = 0; h <= 24; h++) {
      const x = GRID_LEFT + h * HOUR_W;
      const isMajor = h === 0 || h === 12 || h === 24;
      const isNoon = h === 12;

      // Vertical line
      ctx.strokeStyle = isMajor ? COLORS.gridLineDark : COLORS.gridLine;
      ctx.lineWidth = isMajor ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, GRID_TOP);
      ctx.lineTo(x, GRID_BOTTOM);
      ctx.stroke();

      // Hour label
      if (h < 24) {
        let label;
        if (h === 0) label = 'Mid-\nnight';
        else if (h === 12) label = 'Noon';
        else if (h < 12) label = String(h);
        else label = String(h - 12);

        ctx.font = h === 0 || h === 12 ? 'bold 9px Inter, sans-serif' : '9px Inter, sans-serif';
        ctx.fillStyle = h === 0 || h === 12 ? COLORS.text : COLORS.textLight;

        if (h === 0) {
          ctx.fillText('Mid-', x + HOUR_W / 2, GRID_TOP - 14);
          ctx.fillText('night', x + HOUR_W / 2, GRID_TOP - 4);
        } else {
          ctx.fillText(label, x + HOUR_W / 2, GRID_TOP - 6);
        }
      }

      // 15-minute tick marks
      if (h < 24) {
        for (let q = 1; q < 4; q++) {
          const qx = x + (q / 4) * HOUR_W;
          ctx.strokeStyle = COLORS.gridLineLight;
          ctx.lineWidth = 0.3;
          ctx.beginPath();
          ctx.moveTo(qx, GRID_TOP);
          ctx.lineTo(qx, GRID_BOTTOM);
          ctx.stroke();
        }
      }
    }

    // "Total Hours" label on right
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.translate(CANVAS_W - 30, GRID_TOP + GRID_H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Total Hours', 0, 0);
    ctx.restore();

    // Left border
    ctx.strokeStyle = COLORS.gridLineDark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(GRID_LEFT, GRID_TOP);
    ctx.lineTo(GRID_LEFT, GRID_BOTTOM);
    ctx.stroke();

    // Right border of grid
    ctx.beginPath();
    ctx.moveTo(GRID_RIGHT, GRID_TOP);
    ctx.lineTo(GRID_RIGHT, GRID_BOTTOM);
    ctx.stroke();
  }

  function drawStatusLine(ctx, segments) {
    if (!segments || segments.length === 0) return;

    // Sort segments by start_hour
    const sorted = [...segments].sort((a, b) => a.start_hour - b.start_hour);

    ctx.strokeStyle = COLORS.statusLine;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw shadow first
    ctx.save();
    ctx.shadowColor = COLORS.statusLineShadow;
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();

    let isFirst = true;
    let prevRow = null;

    for (const seg of sorted) {
      const row = STATUS_ROW_MAP[seg.status];
      if (row === undefined) continue;

      const x1 = GRID_LEFT + (seg.start_hour / 24) * GRID_W;
      const x2 = GRID_LEFT + (seg.end_hour / 24) * GRID_W;
      const y = GRID_TOP + row * ROW_H + ROW_H / 2;

      if (isFirst) {
        ctx.moveTo(x1, y);
        isFirst = false;
      } else if (prevRow !== null && prevRow !== row) {
        // Vertical transition
        ctx.lineTo(x1, y);
      }

      // Horizontal line for this status duration
      ctx.lineTo(x2, y);
      prevRow = row;
    }

    ctx.stroke();
    ctx.restore();

    // Draw dots at transition points
    prevRow = null;
    for (const seg of sorted) {
      const row = STATUS_ROW_MAP[seg.status];
      if (row === undefined) continue;

      const x1 = GRID_LEFT + (seg.start_hour / 24) * GRID_W;
      const y = GRID_TOP + row * ROW_H + ROW_H / 2;

      if (prevRow !== null && prevRow !== row) {
        ctx.fillStyle = COLORS.statusLine;
        ctx.beginPath();
        ctx.arc(x1, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      prevRow = row;
    }
  }

  function drawTotals(ctx, totals) {
    if (!totals) return;

    const values = [
      totals.off_duty || 0,
      totals.sleeper_berth || 0,
      totals.driving || 0,
      totals.on_duty || 0,
    ];

    ctx.textAlign = 'center';

    for (let i = 0; i < 4; i++) {
      const y = GRID_TOP + i * ROW_H + ROW_H / 2 + 5;
      const val = values[i].toFixed(1);
      ctx.font = 'bold 13px JetBrains Mono, monospace';
      ctx.fillStyle = COLORS.text;
      ctx.fillText(val, GRID_RIGHT + (CANVAS_W - 20 - GRID_RIGHT) / 2, y);
    }

    // Total at bottom
    const total = values.reduce((s, v) => s + v, 0);
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    ctx.fillStyle = COLORS.accent;
    ctx.fillText(total.toFixed(1), GRID_RIGHT + (CANVAS_W - 20 - GRID_RIGHT) / 2, GRID_BOTTOM + 16);
  }

  function drawRemarks(ctx, log) {
    // Remarks section
    ctx.fillStyle = COLORS.remarksBg;
    ctx.fillRect(20, REMARKS_TOP - 5, CANVAS_W - 40, 80);

    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(20, REMARKS_TOP - 5, CANVAS_W - 40, 80);

    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.fillText('Remarks', 30, REMARKS_TOP + 12);

    // Show stop descriptions as remarks
    const stops = (log.segments || [])
      .filter(s => s.status !== 1 && s.description && s.description !== 'Off Duty')
      .slice(0, 4);

    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = COLORS.textLight;
    stops.forEach((s, i) => {
      const timeStr = `${formatHour(s.start_hour)} - ${formatHour(s.end_hour)}`;
      const text = `${timeStr}: ${s.description}`;
      ctx.fillText(text.substring(0, 100), 30, REMARKS_TOP + 30 + i * 14);
    });
  }

  function drawRecap(ctx, log) {
    const y = RECAP_TOP;

    // Recap border
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(20, y, CANVAS_W - 40, 50);
    ctx.strokeRect(20, y, CANVAS_W - 40, 50);

    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.fillText('Recap: Complete at end of day', 30, y + 15);

    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = COLORS.textLight;
    ctx.fillText('70 Hour / 8 Day', 30, y + 32);

    // Boxes
    const boxW = 80;
    const boxH = 30;
    const startX = 250;

    const recapLabels = ['On Duty\nhours today', 'Total hours\nduty last 7\ndays', 'Total hours\navailable\ntomorrow'];
    const recapValues = [
      ((log.totals?.driving || 0) + (log.totals?.on_duty || 0)).toFixed(1),
      '—',
      '—',
    ];

    for (let i = 0; i < 3; i++) {
      const bx = startX + i * (boxW + 40);
      ctx.strokeStyle = COLORS.gridLine;
      ctx.strokeRect(bx, y + 5, boxW, boxH);

      ctx.font = 'bold 13px JetBrains Mono, monospace';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.fillText(recapValues[i], bx + boxW / 2, y + 25);
    }

    // DVL info at bottom
    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText(
      'Enter name of place you reported and where released from duty, when and where each change of duty occurred.',
      CANVAS_W / 2, y + 60
    );
    ctx.fillText('Use time standard of home terminal.', CANVAS_W / 2, y + 72);
  }

  function formatHour(h) {
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayH = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayH}:${String(mins).padStart(2, '0')} ${ampm}`;
  }

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `eld-log-day-${dailyLog.day_number}-${dailyLog.date}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="log-sheet-wrapper">
      <div className="log-sheet-header-bar">
        <span className="log-sheet-day-label">
          Day {dayNumber} of {totalDays}
        </span>
        <span className="log-sheet-date">
          {new Date(dailyLog.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
          })}
        </span>
        <button className="btn btn-outline btn-sm" onClick={handleDownload} title="Download as PNG">
          ⬇️ Download PNG
        </button>
      </div>
      <div className="log-sheet-canvas-container">
        <canvas ref={canvasRef} className="log-sheet-canvas" />
      </div>
    </div>
  );
}
