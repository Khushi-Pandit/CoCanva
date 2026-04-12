'use client';
import { useState } from 'react';
import { Mic, MicOff, PhoneCall, PhoneOff, Volume2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoicePeer {
  socketId: string;
  userId: string;
  userName: string;
  userColor: string;
  isMuted: boolean;
}

interface VoiceRoomProps {
  inVoice: boolean;
  muted: boolean;
  participants: VoicePeer[];
  permissionDenied: boolean;
  joining: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
}

export function VoiceRoom({ inVoice, muted, participants, permissionDenied, joining, onJoin, onLeave, onToggleMute }: VoiceRoomProps) {
  const [expanded, setExpanded] = useState(false);

  if (permissionDenied) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 shadow-sm">
        <MicOff size={12} /> Microphone permission denied
      </div>
    );
  }

  if (!inVoice) {
    return (
      <button
        onClick={onJoin}
        disabled={joining}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl text-xs font-medium text-slate-600 hover:text-emerald-700 shadow-sm transition-all"
      >
        {joining
          ? <span className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
          : <PhoneCall size={13} className="text-emerald-500" />}
        {joining ? 'Joining…' : 'Join voice'}
      </button>
    );
  }

  return (
    <div className="glass rounded-2xl shadow-md overflow-hidden animate-slide-in-right" style={{ border: '1px solid rgba(226,232,240,0.8)' }}>
      {/* Voice header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-soft" />
          <span className="text-[11px] font-semibold text-slate-700">Voice</span>
          {participants.length > 0 && (
            <span className="text-[10px] text-slate-400">{participants.length + 1}</span>
          )}
        </div>

        <button onClick={onToggleMute}
          className={cn('tool-btn w-7 h-7 rounded-lg', muted ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-600')}>
          {muted ? <MicOff size={12} /> : <Mic size={12} />}
        </button>

        {participants.length > 0 && (
          <button onClick={() => setExpanded((v) => !v)}
            className="tool-btn w-7 h-7 rounded-lg">
            <Users size={12} />
          </button>
        )}

        <button onClick={onLeave}
          className="tool-btn w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600">
          <PhoneOff size={12} />
        </button>
      </div>

      {/* Participants list */}
      {expanded && participants.length > 0 && (
        <div className="border-t border-slate-100 px-3 py-2 space-y-1.5 max-h-40 overflow-y-auto animate-slide-up">
          {participants.map((p) => (
            <div key={p.socketId} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0"
                style={{ background: p.userColor }}>
                {p.userName[0]?.toUpperCase()}
              </div>
              <span className="text-[11px] text-slate-700 flex-1 truncate">{p.userName}</span>
              {p.isMuted
                ? <MicOff size={10} className="text-slate-400" />
                : <Volume2 size={10} className="text-emerald-500" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
