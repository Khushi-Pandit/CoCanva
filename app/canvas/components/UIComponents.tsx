/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

// Remote Cursor Component
interface RemoteCursorProps {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}

export const RemoteCursor: React.FC<RemoteCursorProps> = ({
  userId,
  userName,
  x,
  y,
  color,
}) => {
  return (
    <div
      className="absolute pointer-events-none z-50 transition-all duration-75"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Cursor */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 3L19 12L12 13L9 20L5 3Z"
          fill={color}
          stroke="white"
          strokeWidth="2"
        />
      </svg>
      
      {/* User Name Label */}
      <div
        className="absolute top-6 left-4 px-2 py-1 rounded-md text-xs font-medium text-white shadow-lg whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {userName}
      </div>
    </div>
  );
};

// Notification Toast Component
interface NotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({
  type,
  message,
  onClose,
}) => {
  const icons = {
    success: <CheckCircle2 size={20} className="text-green-600" />,
    error: <AlertCircle size={20} className="text-red-600" />,
    info: <Info size={20} className="text-blue-600" />,
  };

  const backgrounds = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${backgrounds[type]} animate-slide-in`}
    >
      {icons[type]}
      <span className="text-sm font-medium text-gray-800">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// Active Users Component
interface ActiveUsersProps {
  count: number;
  users: Array<{ id: string; name: string; color: string }>;
}

export const ActiveUsers: React.FC<ActiveUsersProps> = ({ count, users }) => {
  const displayUsers = users.slice(0, 3);
  const remaining = count - displayUsers.length;

  return (
    <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2 border border-gray-200">
      <div className="flex -space-x-2">
        {displayUsers.map((user) => (
          <div
            key={user.id}
            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {remaining > 0 && (
          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-white text-xs font-bold">
            +{remaining}
          </div>
        )}
      </div>
      <span className="text-sm font-medium text-gray-700">
        {count} {count === 1 ? 'user' : 'users'} active
      </span>
    </div>
  );
};

// Loading Spinner
export const LoadingSpinner: React.FC<{ size?: number }> = ({ size = 24 }) => {
  return (
    <div className="flex items-center justify-center">
      <div
        className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
      />
    </div>
  );
};

// Connection Status Indicator
interface ConnectionStatusProps {
  isConnected: boolean;
  isSyncing?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isSyncing = false,
}) => {
  return (
    <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-3 py-2 border border-gray-200">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        } ${isSyncing ? 'animate-pulse' : ''}`}
      />
      <span className="text-xs font-medium text-gray-700">
        {isSyncing ? 'Syncing...' : isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
};

// Mini Map Component (for navigation in large canvases)
interface MiniMapProps {
  elements: any[];
  viewport: { x: number; y: number; zoom: number };
  width: number;
  height: number;
  onNavigate: (x: number, y: number) => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  elements,
  viewport,
  width,
  height,
  onNavigate,
}) => {
  // Calculate canvas bounds
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  elements.forEach((element) => {
    if ('points' in element) {
      element.points.forEach((p: any) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    }
  });

  const scale = Math.min(width / (maxX - minX), height / (maxY - minY)) * 0.8;

  return (
    <div
      className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden cursor-pointer"
      style={{ width, height }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / width) * (maxX - minX) + minX;
        const y = ((e.clientY - rect.top) / height) * (maxY - minY) + minY;
        onNavigate(x, y);
      }}
    >
      <svg width={width} height={height}>
        {/* Draw simplified elements */}
        {elements.map((element, idx) => {
          if ('points' in element && element.points.length > 0) {
            const points = element.points
              .map(
                (p: any) =>
                  `${(p.x - minX) * scale},${(p.y - minY) * scale}`
              )
              .join(' ');
            return (
              <polyline
                key={idx}
                points={points}
                stroke={element.color}
                strokeWidth="1"
                fill="none"
              />
            );
          }
          return null;
        })}

        {/* Viewport indicator */}
        <rect
          x={((-viewport.x / viewport.zoom - minX) * scale)}
          y={((-viewport.y / viewport.zoom - minY) * scale)}
          width={width / viewport.zoom * scale}
          height={height / viewport.zoom * scale}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};

// Context Menu Component
interface ContextMenuProps {
  x: number;
  y: number;
  items: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
  }>;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  items,
  onClose,
}) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div
        className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[200px] animate-scale-in"
        style={{
          left: `${x}px`,
          top: `${y}px`,
        }}
      >
        {items.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {item.icon && <span className="text-gray-600">{item.icon}</span>}
            <span className="text-sm font-medium text-gray-900">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};