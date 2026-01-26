'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeProvider';

export const LoadingSpinner: React.FC<{ 
  className?: string;
  variant?: 'default' | 'error' | 'brand' | 'info' | 'success' | 'warning' | 'header' | 'blue';
  size?: number;
}> = ({ className, variant = 'default', size = 48 }) => {
  const { theme } = useTheme();

  const getVariantColors = () => {
    switch (variant) {
      case 'error':
        return theme === 'dark' 
          ? { active: '#f3394c', track: '#5d2227' }
          : { active: '#cc2a2a', track: '#5d2227' };
      case 'brand':
        return { active: '#143116', track: '#29652d' };
      case 'info':
        return { active: '#3b82f6', track: '#dbeafe' };
      case 'success':
        return { active: '#22c55e', track: '#dcfce7' };
      case 'warning':
        return { active: '#eab308', track: '#fef9c3' };
      case 'blue':
        return theme === 'dark' 
          ? { active: '#93c5fd', track: '#195570' }
          : { active: '#1d4ed8', track: '#b6d9fd' };
      case 'header':
        return theme === 'dark' 
          ? { active: '#f9fafb', track: '#374151' }
          : { active: '#111827', track: '#e5e7eb' };
      default:
        return { active: '#4d4d4d', track: '#cecece' };
    }
  };

  const colors = getVariantColors();

  return (
    <>
      <style jsx>{`
        .loader {
          width: ${size}px;
          overflow: visible;
          transform: rotate(-90deg);
          transform-origin: center;
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          0% {
            rotate: 0deg;
          }
          100% {
            rotate: 360deg;
          }
        }

        .active {
          stroke: ${colors.active};
          stroke-linecap: round;
          stroke-dashoffset: 360;
          animation: active-animation 8s ease-in-out infinite;
        }

        @keyframes active-animation {
          0% {
            stroke-dasharray: 0 0 0 360 0 360;
          }
          12.5% {
            stroke-dasharray: 0 0 270 90 270 90;
          }
          25% {
            stroke-dasharray: 0 270 0 360 0 360;
          }
          37.5% {
            stroke-dasharray: 0 270 270 90 270 90;
          }
          50% {
            stroke-dasharray: 0 540 0 360 0 360;
          }
          50.001% {
            stroke-dasharray: 0 180 0 360 0 360;
          }
          62.5% {
            stroke-dasharray: 0 180 270 90 270 90;
          }
          75% {
            stroke-dasharray: 0 450 0 360 0 360;
          }
          87.5% {
            stroke-dasharray: 0 450 270 90 270 90;
          }
          87.501% {
            stroke-dasharray: 0 90 270 90 270 90;
          }
          100% {
            stroke-dasharray: 0 360 1 360 0 360;
          }
        }

        .track {
          stroke: ${colors.track};
          stroke-linecap: round;
          stroke-dashoffset: 360;
          animation: track-animation 8s ease-in-out infinite;
        }

        @keyframes track-animation {
          0% {
            stroke-dasharray: 0 20 320 40 320 40;
          }
          12.5% {
            stroke-dasharray: 0 290 50 310 50 310;
          }
          25% {
            stroke-dasharray: 0 290 320 40 320 40;
          }
          37.5% {
            stroke-dasharray: 0 560 50 310 50 310;
          }
          37.501% {
            stroke-dasharray: 0 200 50 310 50 310;
          }
          50% {
            stroke-dasharray: 0 200 320 40 320 40;
          }
          62.5% {
            stroke-dasharray: 0 470 50 310 50 310;
          }
          62.501% {
            stroke-dasharray: 0 110 50 310 50 310;
          }
          75% {
            stroke-dasharray: 0 110 320 40 320 40;
          }
          87.5% {
            stroke-dasharray: 0 380 50 310 50 310;
          }
          100% {
            stroke-dasharray: 0 380 320 40 320 40;
          }
        }
      `}</style>
      <div className={`flex items-center justify-center h-full ${className || ''}`}>
        <svg 
          className="loader" 
          viewBox="0 0 384 384" 
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: size, height: size }}
        >
          <circle
            className="active"
            pathLength="360"
            fill="transparent"
            strokeWidth="32"
            cx="192"
            cy="192"
            r="176"
          />
          <circle
            className="track"
            pathLength="360"
            fill="transparent"
            strokeWidth="32"
            cx="192"
            cy="192"
            r="176"
          />
        </svg>
      </div>
    </>
  );
};

export default LoadingSpinner;



