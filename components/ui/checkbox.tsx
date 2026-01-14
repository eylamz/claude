'use client';

import { FC } from 'react';

interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  variant?: 'sign' | 'default' | 'brand' | 'purple' | 'red';
}

export const Checkbox: FC<CheckboxProps> = ({ id, checked, onChange, label, variant = 'default' }) => {
  if (variant === 'sign') {
    return (
      <>
        <style jsx>{`
          .checkbox-wrapper-61 input[type="checkbox"] {
            visibility: hidden;
            display: none;
          }
          .checkbox-wrapper-61 *,
          .checkbox-wrapper-61 ::after,
          .checkbox-wrapper-61 ::before {
            box-sizing: border-box;
          }
          .checkbox-wrapper-61 {
            position: relative;
            display: block;
            overflow: hidden;
          }
          .checkbox-wrapper-61 .check {
            width: 50px;
            height: 50px;
            position: absolute;
            opacity: 0;
          }
          .checkbox-wrapper-61 .label svg {
            vertical-align: middle;
          }
          .checkbox-wrapper-61 .path1 {
            stroke-dasharray: 400;
            stroke-dashoffset: 400;
            transition: 0.5s stroke-dashoffset;
            opacity: 0;
          }
          .checkbox-wrapper-61 .check:checked + label svg g path {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        `}</style>
        <div className="checkbox-wrapper-61">
          <input
            type="checkbox"
            className="check"
            id={id}
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <label htmlFor={id} className="label">
            <svg width="45" height="45" viewBox="0 0 95 95">
              <rect x="30" y="20" width="50" height="50" stroke="black" fill="none" />
              <g transform="translate(0,-952.36222)">
                <path
                  d="m 56,963 c -102,122 6,9 7,9 17,-5 -66,69 -38,52 122,-77 -7,14 18,4 29,-11 45,-43 23,-4 "
                  stroke="black"
                  strokeWidth="3"
                  fill="none"
                  className="path1"
                />
              </g>
            </svg>
            <span>{label}</span>
          </label>
        </div>
      </>
    );
  }

  if (variant === 'brand') {
    return (
      <>
        <style jsx>{`
          .checkbox-wrapper-brand * {
            box-sizing: border-box;
          }
          .checkbox-wrapper-brand .cbx {
            -webkit-user-select: none;
            user-select: none;
            cursor: pointer;
            padding: 6px 8px;
            border-radius: 6px;
            overflow: hidden;
            transition: all 0.2s ease;
            display: inline-block;
          }
          .checkbox-wrapper-brand .cbx:not(:last-child) {
            margin-right: 6px;
          }
          .checkbox-wrapper-brand .cbx:hover {
            background: hsla(123, 48%, 45%, 0.06);
          }
          .dark .checkbox-wrapper-brand .cbx:hover {
            background: hsla(123, 44%, 50%, 0.1);
          }
          .checkbox-wrapper-brand .cbx span {
            float: left;
            vertical-align: middle;
            transform: translate3d(0, 0, 0);
          }
          .checkbox-wrapper-brand .cbx span:first-child {
            position: relative;
            width: 18px;
            height: 18px;
            border-radius: 4px;
            transform: scale(1);
            border: 1px solid #cccfdb;
            transition: all 0.2s ease;
            box-shadow: 0 1px 1px rgba(0, 16, 75, 0.05);
          }
          .dark .checkbox-wrapper-brand .cbx span:first-child {
            border-color: #4b5563;
          }
          .checkbox-wrapper-brand .cbx span:first-child svg {
            position: absolute;
            top: 3px;
            left: 2px;
            fill: none;
            stroke: #fff;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: 16px;
            stroke-dashoffset: 16px;
            transition: all 0.3s ease;
            transition-delay: 0.1s;
            transform: translate3d(0, 0, 0);
          }
          .checkbox-wrapper-brand .cbx span:last-child {
            padding-left: 8px;
            line-height: 18px;
          }
          .checkbox-wrapper-brand .cbx:hover span:first-child {
            border-color: hsl(123, 48%, 45%);
          }
          .dark .checkbox-wrapper-brand .cbx:hover span:first-child {
            border-color: hsl(123, 44%, 50%);
          }
          .checkbox-wrapper-brand .inp-cbx {
            position: absolute;
            visibility: hidden;
          }
          .checkbox-wrapper-brand .inp-cbx:checked + .cbx span:first-child {
            background: hsl(123, 48%, 45%);
            border-color: hsl(123, 48%, 45%);
            animation: wave-brand 0.4s ease;
          }
          .dark .checkbox-wrapper-brand .inp-cbx:checked + .cbx span:first-child {
            background: hsl(123, 44%, 50%);
            border-color: hsl(123, 44%, 50%);
          }
          .checkbox-wrapper-brand .inp-cbx:checked + .cbx span:first-child svg {
            stroke-dashoffset: 0;
          }
          .checkbox-wrapper-brand .inline-svg {
            position: absolute;
            width: 0;
            height: 0;
            pointer-events: none;
            user-select: none;
          }
          @media screen and (max-width: 640px) {
            .checkbox-wrapper-brand .cbx {
              width: 100%;
              display: inline-block;
            }
          }
          @keyframes wave-brand {
            50% {
              transform: scale(0.9);
            }
          }
        `}</style>
        <div className="checkbox-wrapper-brand">
          <input
            className="inp-cbx"
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <label className="cbx" htmlFor={id}>
            <span>
              <svg width="12px" height="10px">
                <use href={`#check-brand-${id}`}></use>
              </svg>
            </span>
            <span>{label}</span>
          </label>
          <svg className="inline-svg">
            <symbol id={`check-brand-${id}`} viewBox="0 0 12 10">
              <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
            </symbol>
          </svg>
        </div>
      </>
    );
  }

  if (variant === 'purple') {
    return (
      <>
        <style jsx>{`
          .checkbox-wrapper-purple * {
            box-sizing: border-box;
          }
          .checkbox-wrapper-purple .cbx {
            -webkit-user-select: none;
            user-select: none;
            cursor: pointer;
            padding: 6px 8px;
            border-radius: 6px;
            overflow: hidden;
            transition: all 0.2s ease;
            display: inline-block;
          }
          .checkbox-wrapper-purple .cbx:not(:last-child) {
            margin-right: 6px;
          }
          .checkbox-wrapper-purple .cbx:hover {
            background: hsla(270, 50%, 50%, 0.06);
          }
          .dark .checkbox-wrapper-purple .cbx:hover {
            background: hsla(270, 45%, 55%, 0.1);
          }
          .checkbox-wrapper-purple .cbx span {
            float: left;
            vertical-align: middle;
            transform: translate3d(0, 0, 0);
          }
          .checkbox-wrapper-purple .cbx span:first-child {
            position: relative;
            width: 18px;
            height: 18px;
            border-radius: 4px;
            transform: scale(1);
            border: 1px solid #cccfdb;
            transition: all 0.2s ease;
            box-shadow: 0 1px 1px rgba(0, 16, 75, 0.05);
          }
          .dark .checkbox-wrapper-purple .cbx span:first-child {
            border-color: #4b5563;
          }
          .checkbox-wrapper-purple .cbx span:first-child svg {
            position: absolute;
            top: 3px;
            left: 2px;
            fill: none;
            stroke: #fff;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: 16px;
            stroke-dashoffset: 16px;
            transition: all 0.3s ease;
            transition-delay: 0.1s;
            transform: translate3d(0, 0, 0);
          }
          .checkbox-wrapper-purple .cbx span:last-child {
            padding-left: 8px;
            line-height: 18px;
          }
          .checkbox-wrapper-purple .cbx:hover span:first-child {
            border-color: hsl(270, 50%, 50%);
          }
          .dark .checkbox-wrapper-purple .cbx:hover span:first-child {
            border-color: hsl(270, 45%, 55%);
          }
          .checkbox-wrapper-purple .inp-cbx {
            position: absolute;
            visibility: hidden;
          }
          .checkbox-wrapper-purple .inp-cbx:checked + .cbx span:first-child {
            background: hsl(270, 50%, 50%);
            border-color: hsl(270, 50%, 50%);
            animation: wave-purple 0.4s ease;
          }
          .dark .checkbox-wrapper-purple .inp-cbx:checked + .cbx span:first-child {
            background: hsl(270, 45%, 55%);
            border-color: hsl(270, 45%, 55%);
          }
          .checkbox-wrapper-purple .inp-cbx:checked + .cbx span:first-child svg {
            stroke-dashoffset: 0;
          }
          .checkbox-wrapper-purple .inline-svg {
            position: absolute;
            width: 0;
            height: 0;
            pointer-events: none;
            user-select: none;
          }
          @media screen and (max-width: 640px) {
            .checkbox-wrapper-purple .cbx {
              width: 100%;
              display: inline-block;
            }
          }
          @keyframes wave-purple {
            50% {
              transform: scale(0.9);
            }
          }
        `}</style>
        <div className="checkbox-wrapper-purple">
          <input
            className="inp-cbx"
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <label className="cbx" htmlFor={id}>
            <span>
              <svg width="12px" height="10px">
                <use href={`#check-purple-${id}`}></use>
              </svg>
            </span>
            <span>{label}</span>
          </label>
          <svg className="inline-svg">
            <symbol id={`check-purple-${id}`} viewBox="0 0 12 10">
              <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
            </symbol>
          </svg>
        </div>
      </>
    );
  }

  if (variant === 'red') {
    return (
      <>
        <style jsx>{`
          .checkbox-wrapper-red * {
            box-sizing: border-box;
          }
          .checkbox-wrapper-red .cbx {
            -webkit-user-select: none;
            user-select: none;
            cursor: pointer;
            padding: 6px 8px;
            border-radius: 6px;
            overflow: hidden;
            transition: all 0.2s ease;
            display: inline-block;
          }
          .checkbox-wrapper-red .cbx:not(:last-child) {
            margin-right: 6px;
          }
          .checkbox-wrapper-red .cbx:hover {
            background: hsla(0, 70%, 50%, 0.06);
          }
          .dark .checkbox-wrapper-red .cbx:hover {
            background: hsla(0, 65%, 55%, 0.1);
          }
          .checkbox-wrapper-red .cbx span {
            float: left;
            vertical-align: middle;
            transform: translate3d(0, 0, 0);
          }
          .checkbox-wrapper-red .cbx span:first-child {
            position: relative;
            width: 18px;
            height: 18px;
            border-radius: 4px;
            transform: scale(1);
            border: 1px solid #cccfdb;
            transition: all 0.2s ease;
            box-shadow: 0 1px 1px rgba(0, 16, 75, 0.05);
          }
          .dark .checkbox-wrapper-red .cbx span:first-child {
            border-color: #4b5563;
          }
          .checkbox-wrapper-red .cbx span:first-child svg {
            position: absolute;
            top: 3px;
            left: 2px;
            fill: none;
            stroke: #fff;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke-dasharray: 16px;
            stroke-dashoffset: 16px;
            transition: all 0.3s ease;
            transition-delay: 0.1s;
            transform: translate3d(0, 0, 0);
          }
          .checkbox-wrapper-red .cbx span:last-child {
            padding-left: 8px;
            line-height: 18px;
          }
          .checkbox-wrapper-red .cbx:hover span:first-child {
            border-color: hsl(0, 70%, 50%);
          }
          .dark .checkbox-wrapper-red .cbx:hover span:first-child {
            border-color: hsl(0, 65%, 55%);
          }
          .checkbox-wrapper-red .inp-cbx {
            position: absolute;
            visibility: hidden;
          }
          .checkbox-wrapper-red .inp-cbx:checked + .cbx span:first-child {
            background: hsl(0, 70%, 50%);
            border-color: hsl(0, 70%, 50%);
            animation: wave-red 0.4s ease;
          }
          .dark .checkbox-wrapper-red .inp-cbx:checked + .cbx span:first-child {
            background: hsl(0, 65%, 55%);
            border-color: hsl(0, 65%, 55%);
          }
          .checkbox-wrapper-red .inp-cbx:checked + .cbx span:first-child svg {
            stroke-dashoffset: 0;
          }
          .checkbox-wrapper-red .inline-svg {
            position: absolute;
            width: 0;
            height: 0;
            pointer-events: none;
            user-select: none;
          }
          @media screen and (max-width: 640px) {
            .checkbox-wrapper-red .cbx {
              width: 100%;
              display: inline-block;
            }
          }
          @keyframes wave-red {
            50% {
              transform: scale(0.9);
            }
          }
        `}</style>
        <div className="checkbox-wrapper-red">
          <input
            className="inp-cbx"
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <label className="cbx" htmlFor={id}>
            <span>
              <svg width="12px" height="10px">
                <use href={`#check-red-${id}`}></use>
              </svg>
            </span>
            <span>{label}</span>
          </label>
          <svg className="inline-svg">
            <symbol id={`check-red-${id}`} viewBox="0 0 12 10">
              <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
            </symbol>
          </svg>
        </div>
      </>
    );
  }

  return (
    <>
      <style jsx>{`
        .checkbox-wrapper-4 * {
          box-sizing: border-box;
        }
        .checkbox-wrapper-4 .cbx {
          -webkit-user-select: none;
          user-select: none;
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 6px;
          overflow: hidden;
          transition: all 0.2s ease;
          display: inline-block;
        }
        .checkbox-wrapper-4 .cbx:not(:last-child) {
          margin-right: 6px;
        }
        .checkbox-wrapper-4 .cbx:hover {
          background: rgba(0, 119, 255, 0.06);
        }
        .checkbox-wrapper-4 .cbx span {
          float: left;
          vertical-align: middle;
          transform: translate3d(0, 0, 0);
        }
        .checkbox-wrapper-4 .cbx span:first-child {
          position: relative;
          width: 18px;
          height: 18px;
          border-radius: 4px;
          transform: scale(1);
          border: 1px solid #cccfdb;
          transition: all 0.2s ease;
          box-shadow: 0 1px 1px rgba(0, 16, 75, 0.05);
        }
        .checkbox-wrapper-4 .cbx span:first-child svg {
          position: absolute;
          top: 3px;
          left: 2px;
          fill: none;
          stroke: #fff;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 16px;
          stroke-dashoffset: 16px;
          transition: all 0.3s ease;
          transition-delay: 0.1s;
          transform: translate3d(0, 0, 0);
        }
        .checkbox-wrapper-4 .cbx span:last-child {
          padding-left: 8px;
          line-height: 18px;
        }
        .checkbox-wrapper-4 .cbx:hover span:first-child {
          border-color: #07f;
        }
        .checkbox-wrapper-4 .inp-cbx {
          position: absolute;
          visibility: hidden;
        }
        .checkbox-wrapper-4 .inp-cbx:checked + .cbx span:first-child {
          background: #07f;
          border-color: #07f;
          animation: wave-4 0.4s ease;
        }
        .checkbox-wrapper-4 .inp-cbx:checked + .cbx span:first-child svg {
          stroke-dashoffset: 0;
        }
        .checkbox-wrapper-4 .inline-svg {
          position: absolute;
          width: 0;
          height: 0;
          pointer-events: none;
          user-select: none;
        }
        @media screen and (max-width: 640px) {
          .checkbox-wrapper-4 .cbx {
            width: 100%;
            display: inline-block;
          }
        }
        @keyframes wave-4 {
          50% {
            transform: scale(0.9);
          }
        }
      `}</style>
      <div className="checkbox-wrapper-4">
        <input
          className="inp-cbx"
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label className="cbx" htmlFor={id}>
          <span>
            <svg width="12px" height="10px">
              <use href={`#check-4-${id}`}></use>
            </svg>
          </span>
          <span>{label}</span>
        </label>
        <svg className="inline-svg">
          <symbol id={`check-4-${id}`} viewBox="0 0 12 10">
            <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
          </symbol>
        </svg>
      </div>
    </>
  );
};

