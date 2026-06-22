import React, { useState } from 'react';
import LogSheet from './LogSheet';
import './LogSheetCarousel.css';

export default function LogSheetCarousel({ dailyLogs }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!dailyLogs || dailyLogs.length === 0) return null;

  const totalDays = dailyLogs.length;
  const currentLog = dailyLogs[currentIndex];

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(totalDays - 1, prev + 1));
  };

  const handleDownloadAll = () => {
    // Trigger download of each canvas
    const canvases = document.querySelectorAll('.log-sheet-canvas');
    canvases.forEach((canvas, i) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.download = `eld-log-day-${i + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }, i * 300);
    });
  };

  return (
    <div className="log-carousel glass-card animate-slide-up" id="eld-logs">
      <div className="carousel-header">
        <div className="carousel-title-group">
          <h3 className="carousel-title">📋 ELD Daily Log Sheets</h3>
          <p className="carousel-subtitle">
            {totalDays} {totalDays === 1 ? 'day' : 'days'} of logs generated
          </p>
        </div>
        <div className="carousel-actions">
          <button className="btn btn-outline btn-sm" onClick={handleDownloadAll}>
            ⬇️ Download All
          </button>
        </div>
      </div>

      {/* Day selector tabs */}
      <div className="day-tabs">
        {dailyLogs.map((log, i) => (
          <button
            key={i}
            className={`day-tab ${i === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(i)}
          >
            <span className="day-tab-num">Day {i + 1}</span>
            <span className="day-tab-date">
              {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </button>
        ))}
      </div>

      {/* Current log sheet */}
      <div className="carousel-body">
        <LogSheet
          key={currentIndex}
          dailyLog={currentLog}
          dayNumber={currentIndex + 1}
          totalDays={totalDays}
        />
      </div>

      {/* Navigation */}
      {totalDays > 1 && (
        <div className="carousel-nav">
          <button
            className="btn btn-outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            ← Previous Day
          </button>
          <span className="carousel-indicator">
            {currentIndex + 1} / {totalDays}
          </span>
          <button
            className="btn btn-outline"
            onClick={handleNext}
            disabled={currentIndex === totalDays - 1}
          >
            Next Day →
          </button>
        </div>
      )}
    </div>
  );
}
