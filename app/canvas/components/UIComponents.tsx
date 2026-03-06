/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Wifi, WifiOff, RefreshCw } from 'lucide-react';

// ─── Remote Cursor ────────────────────────────────────────────────────────────
interface RemoteCursorProps {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}

export const RemoteCursor: React.FC<RemoteCursorProps> = ({ userName, x, y, color }) => {
  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{
        left: x,
        top: y,
        transform: 'translate(-2px, -2px)',
        transition: 'left 60ms linear, top 60ms linear',
      }}
    >
      {/* Cursor SVG */}
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M4 2L16.5 10.5L10.5 11.5L8 17.5L4 2Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* Name tag */}
      <div
        className="absolute top-4 left-3 px-2 py-0.5 rounded-md text-[11px] font-semibold
                   text-white whitespace-nowrap shadow-lg"
        style={{
          backgroundColor: color,
          letterSpacing: '0.01em',
        }}
      >
        {userName}
      </div>
    </div>
  );
};

// ─── Notification Toast ───────────────────────────────────────────────────────
interface NotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ type, message, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const config = {
    success: {
      icon: <CheckCircle2 size={16} />,
      classes: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      iconClass: 'text-emerald-500',
    },
    error: {
      icon: <AlertCircle size={16} />,
      classes: 'bg-red-50 border-red-200 text-red-800',
      iconClass: 'text-red-500',
    },
    info: {
      icon: <Info size={16} />,
      classes: 'bg-sky-50 border-sky-200 text-sky-800',
      iconClass: 'text-sky-500',
    },
  }[type];

  return (
    <div
      className={`flex items-center gap-2.5 pl-3 pr-2 py-2.5 rounded-xl border text-sm
                  shadow-lg backdrop-blur-sm font-medium ${config.classes}
                  animate-in slide-in-from-top-2 duration-200`}
    >
      <span className={config.iconClass}>{config.icon}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="w-5 h-5 flex items-center justify-center rounded-md
                   opacity-50 hover:opacity-100 transition-opacity"
      >
        <X size={13} />
      </button>
    </div>
  );
};

// ─── Active Users ─────────────────────────────────────────────────────────────
interface ActiveUsersProps {
  count: number;
  users: Array<{ id: string; name: string; color: string }>;
}

export const ActiveUsers: React.FC<ActiveUsersProps> = ({ count, users }) => {
  const [showList, setShowList] = useState(false);
  const shown    = users.slice(0, 4);
  const overflow = count - shown.length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowList(v => !v)}
        className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-xl
                   bg-white/90 backdrop-blur-md border border-slate-200/80
                   shadow-md shadow-slate-200/40 hover:border-emerald-200 transition-all"
      >
        {/* Avatar stack */}
        <div className="flex -space-x-2">
          {shown.map((user) => (
            <div
              key={user.id}
              className="w-7 h-7 rounded-full border-2 border-white flex items-center
                         justify-center text-white text-[11px] font-bold shadow-sm"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {overflow > 0 && (
            <div
              className="w-7 h-7 rounded-full border-2 border-white bg-slate-300
                         flex items-center justify-center text-white text-[10px] font-bold"
            >
              +{overflow}
            </div>
          )}
        </div>
        <span className="text-xs font-semibold text-slate-600">
          {count} {count === 1 ? 'person' : 'people'}
        </span>
      </button>

      {/* Dropdown list */}
      {showList && (
        <div
          className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-2xl
                     border border-slate-100 py-2 min-w-[170px] z-50
                     animate-in slide-in-from-top-1 duration-150"
        >
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 pb-1.5">
            Online now
          </p>
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-2.5 px-3 py-1.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center
                           text-white text-[10px] font-bold flex-shrink-0"
                style={{ backgroundColor: user.color }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-slate-700 font-medium truncate">{user.name}</span>
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Connection Status ────────────────────────────────────────────────────────
interface ConnectionStatusProps {
  isConnected: boolean;
  isSyncing?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected, isSyncing }) => {
  if (isConnected && !isSyncing) return null; // hide when all good — clean UI

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold
                  border backdrop-blur-md shadow-sm transition-all
                  ${isSyncing
                    ? 'bg-sky-50/90 border-sky-200 text-sky-700'
                    : 'bg-red-50/90 border-red-200 text-red-700'}`}
    >
      {isSyncing
        ? <RefreshCw size={12} className="animate-spin" />
        : <WifiOff size={12} />
      }
      {isSyncing ? 'Syncing…' : 'Reconnecting…'}
    </div>
  );
};

// ─── Loading Spinner ──────────────────────────────────────────────────────────
export const LoadingSpinner: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <div
    className="animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500"
    style={{ width: size, height: size }}
  />
);

// ─── Context Menu ─────────────────────────────────────────────────────────────
interface ContextMenuProps {
  x: number;
  y: number;
  items: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
  }>;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => (
  <>
    <div className="fixed inset-0 z-40" onClick={onClose} />
    <div
      className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 min-w-[180px]
                 animate-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { if (!item.disabled) { item.onClick(); onClose(); } }}
          disabled={item.disabled}
          className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors
            ${item.danger
              ? 'text-red-600 hover:bg-red-50'
              : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'}
            disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {item.icon && <span className="opacity-70">{item.icon}</span>}
          <span className="font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  </>
);