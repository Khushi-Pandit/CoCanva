'use client';

import React, { useState } from 'react';
import {
  Mic, MicOff, PhoneCall, PhoneOff,
  Volume2, VolumeX, ChevronUp, ChevronDown,
  Loader2, AlertCircle,
} from 'lucide-react';
import { VoiceParticipant } from '../core/userVoice';

// ── Props ─────────────────────────────────────────────────────────────────────

interface VoicePanelProps {
  inVoice:          boolean;
  muted:            boolean;
  participants:     VoiceParticipant[];
  mySocketId:       string;
  permissionDenied: boolean;
  joining:          boolean;         // true while getUserMedia is in flight
  onJoin:           () => void;
  onLeave:          () => void;
  onToggleMute:     () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const VoicePanel: React.FC<VoicePanelProps> = ({
  inVoice,
  muted,
  participants,
  mySocketId,
  permissionDenied,
  joining,
  onJoin,
  onLeave,
  onToggleMute,
}) => {
  const [expanded, setExpanded] = useState(true);

  const othersInVoice = participants.filter(p => p.socketId !== mySocketId);
  const meInVoice     = participants.find(p => p.socketId === mySocketId);

  // ── Not in voice — show join button ─────────────────────────────────────

  if (!inVoice) {
    return (
      <div className="flex flex-col items-end gap-1">
        {/* Permission denied warning */}
        {permissionDenied && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                          bg-red-50 border border-red-200 text-red-600 text-[11px] font-medium
                          shadow-sm max-w-[220px]">
            <AlertCircle size={12} strokeWidth={2.5} className="flex-shrink-0" />
            <span>Mic permission denied. Allow in browser settings.</span>
          </div>
        )}

        {/* Badge showing how many people are already in voice */}
        {participants.length > 0 && !permissionDenied && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                          bg-white/80 backdrop-blur-sm border border-slate-200/80
                          text-slate-500 text-[11px] font-medium shadow-sm">
            <Volume2 size={11} strokeWidth={2} className="text-emerald-500" />
            {participants.length} in voice
          </div>
        )}

        <button
          onClick={onJoin}
          disabled={joining}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold
                      transition-all duration-200 shadow-md
                      ${joining
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white/90 backdrop-blur-md border border-slate-200/80 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-emerald-100 active:scale-95'
                      }`}
          title="Join voice channel"
        >
          {joining
            ? <Loader2 size={15} strokeWidth={2} className="animate-spin text-slate-400" />
            : <PhoneCall size={15} strokeWidth={2} className="text-emerald-500" />
          }
          {joining ? 'Connecting…' : 'Join Voice'}
        </button>
      </div>
    );
  }

  // ── In voice — show participant list + controls ──────────────────────────

  return (
    <div className="flex flex-col items-end gap-0">

      {/* ── Compact pill header (always visible) ── */}
      <div className="flex items-center gap-1 px-1.5 py-1.5 rounded-xl
                      bg-white/90 backdrop-blur-md border border-emerald-200/80
                      shadow-md shadow-emerald-100/40">

        {/* Live indicator */}
        <div className="relative flex items-center justify-center w-6 h-6">
          <span className="absolute w-4 h-4 rounded-full bg-emerald-400/30 animate-ping" />
          <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
        </div>

        {/* Participant avatars (up to 3) */}
        <div className="flex items-center -space-x-1.5 px-0.5">
          {participants.slice(0, 3).map(p => (
            <ParticipantAvatar key={p.socketId} participant={p} size="sm" />
          ))}
          {participants.length > 3 && (
            <div className="w-5 h-5 rounded-full bg-slate-200 border-2 border-white
                            flex items-center justify-center text-[9px] font-bold text-slate-500">
              +{participants.length - 3}
            </div>
          )}
        </div>

        {/* Mute toggle */}
        <button
          onClick={onToggleMute}
          className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150
            ${muted
              ? 'bg-red-50 text-red-500 hover:bg-red-100'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          title={muted ? 'Unmute mic' : 'Mute mic'}
        >
          {muted ? <MicOff size={14} strokeWidth={2.2} /> : <Mic size={14} strokeWidth={2} />}
        </button>

        {/* Expand/collapse */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center justify-center w-7 h-7 rounded-lg
                     text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronDown size={13} strokeWidth={2.5} /> : <ChevronUp size={13} strokeWidth={2.5} />}
        </button>

        {/* Leave */}
        <button
          onClick={onLeave}
          className="flex items-center justify-center w-7 h-7 rounded-lg
                     text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
          title="Leave voice"
        >
          <PhoneOff size={14} strokeWidth={2} />
        </button>
      </div>

      {/* ── Expanded participant list ── */}
      {expanded && (
        <div className="mt-1.5 w-[220px] bg-white/95 backdrop-blur-md rounded-xl
                        border border-slate-200/80 shadow-xl shadow-slate-200/50
                        overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Volume2 size={12} strokeWidth={2} className="text-emerald-500" />
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Voice Channel
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              {participants.length} live
            </span>
          </div>

          {/* Participants */}
          <div className="py-1.5 max-h-[200px] overflow-y-auto">

            {/* Our own entry first */}
            {meInVoice && (
              <div className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors">
                <ParticipantAvatar participant={meInVoice} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">
                    {meInVoice.userName}
                    <span className="ml-1 text-[10px] font-normal text-slate-400">(you)</span>
                  </p>
                </div>
                <MicIcon muted={muted} />
              </div>
            )}

            {/* Divider if there are others */}
            {othersInVoice.length > 0 && meInVoice && (
              <div className="h-px bg-slate-100 mx-3 my-1" />
            )}

            {/* Other participants */}
            {othersInVoice.map(p => (
              <div key={p.socketId} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors">
                <ParticipantAvatar participant={p} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{p.userName}</p>
                </div>
                <MicIcon muted={p.muted} />
              </div>
            ))}

            {/* Empty state */}
            {participants.length === 1 && (
              <p className="text-[11px] text-slate-400 text-center py-3 px-3">
                Youre the only one here.<br />Share the canvas link to invite others!
              </p>
            )}
          </div>

          {/* Footer controls */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={onToggleMute}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg
                          text-xs font-semibold transition-all duration-150
                          ${muted
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
            >
              {muted
                ? <><MicOff size={12} strokeWidth={2.5} /> Unmute</>
                : <><Mic     size={12} strokeWidth={2}   /> Mute</>
              }
            </button>
            <button
              onClick={onLeave}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg
                         text-xs font-semibold bg-white border border-slate-200
                         text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"
            >
              <PhoneOff size={12} strokeWidth={2} />
              Leave
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

interface AvatarProps {
  participant: VoiceParticipant;
  size: 'sm' | 'md';
}

const ParticipantAvatar: React.FC<AvatarProps> = ({ participant, size }) => {
  const dim    = size === 'sm' ? 'w-5 h-5 text-[8px]' : 'w-7 h-7 text-[11px]';
  const border = size === 'sm' ? 'border-[1.5px]' : 'border-2';
  const initials = participant.userName.slice(0, 2).toUpperCase();

  return (
    <div
      className={`${dim} ${border} border-white rounded-full flex items-center justify-center
                  font-bold text-white flex-shrink-0 select-none`}
      style={{ backgroundColor: participant.userColor }}
      title={participant.userName}
    >
      {initials}
    </div>
  );
};

const MicIcon: React.FC<{ muted: boolean }> = ({ muted }) => (
  muted
    ? <MicOff size={12} strokeWidth={2.5} className="text-red-400 flex-shrink-0" />
    : (
      <div className="flex items-end gap-[2px] h-3 flex-shrink-0">
        {[2, 3, 4, 3].map((h, i) => (
          <span
            key={i}
            className="w-[2px] rounded-full bg-emerald-400 animate-pulse"
            style={{
              height:          `${h * 3}px`,
              animationDelay:  `${i * 120}ms`,
              animationDuration: '800ms',
            }}
          />
        ))}
      </div>
    )
);