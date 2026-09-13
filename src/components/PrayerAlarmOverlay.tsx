import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Volume2, Volume1, BellOff } from 'lucide-react';
import { getAlarmVolume, setAlarmVolume, getSnoozeMinutes } from '@/utils/alarmPrefs';

interface PrayerAlarmOverlayProps {
  prayerName: string;
  prayerTime: string;
  onDismiss: () => void;
  /** Ring again after the chosen snooze delay. */
  onSnooze?: (minutes: number) => void;
}

export const PrayerAlarmOverlay = ({ prayerName, prayerTime, onDismiss, onSnooze }: PrayerAlarmOverlayProps) => {
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const fallbackRef = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolume] = useState<number>(() => getAlarmVolume());
  const snoozeMinutes = getSnoozeMinutes();

  const stopAudio = useCallback(() => {
    try {
      sourceRef.current?.stop();
      ctxRef.current?.close();
      fallbackRef.current?.pause();
    } catch {}
    sourceRef.current = null;
    ctxRef.current = null;
    gainRef.current = null;
    fallbackRef.current = null;
  }, []);

  useEffect(() => {
    const playAlarm = async () => {
      try {
        const ctx = new AudioContext();
        const response = await fetch('/adhan.mp3');
        const buffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(buffer);

        const gainNode = ctx.createGain();
        gainNode.gain.value = getAlarmVolume();
        gainNode.connect(ctx.destination);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNode);
        source.start(0);
        source.onended = () => onDismiss();

        ctxRef.current = ctx;
        sourceRef.current = source;
        gainRef.current = gainNode;
      } catch (error) {
        console.error('Failed to play alarm audio:', error);
        const audio = new Audio('/adhan.mp3');
        audio.volume = getAlarmVolume();
        fallbackRef.current = audio;
        audio.play().catch(console.error);
      }
    };

    playAlarm();

    // Auto-dismiss after 5 minutes
    const timeout = setTimeout(() => {
      stopAudio();
      onDismiss();
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(timeout);
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeVolume = (v: number) => {
    setVolume(v);
    setAlarmVolume(v);
    if (gainRef.current) gainRef.current.gain.value = v;
    if (fallbackRef.current) fallbackRef.current.volume = v;
  };

  const handleDismiss = () => {
    stopAudio();
    onDismiss();
  };

  const handleSnooze = () => {
    stopAudio();
    onSnooze?.(snoozeMinutes);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 flex flex-col items-center justify-center text-primary-foreground px-6">
      {/* Animated pulse rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full border-2 border-white/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute w-48 h-48 rounded-full border-2 border-white/20 animate-ping" style={{ animationDuration: '1.5s' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-pulse">
          <Volume2 className="w-10 h-10" />
        </div>

        <div>
          <p className="text-lg opacity-70 mb-1">It's time for</p>
          <h1 className="text-5xl font-bold tracking-tight">{prayerName}</h1>
          <p className="text-2xl opacity-80 mt-2">{prayerTime}</p>
        </div>

        <p className="opacity-60 text-sm">🕌 Adhan is playing...</p>

        {/* Volume */}
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
          <Volume1 className="w-5 h-5 shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => changeVolume(parseFloat(e.target.value))}
            className="flex-1 accent-white"
            aria-label="Alarm volume"
          />
          <span className="text-xs font-semibold w-10 text-right">{Math.round(volume * 100)}%</span>
        </div>

        <div className="flex gap-3">
          {onSnooze && (
            <button
              onClick={handleSnooze}
              className="flex-1 px-4 py-4 bg-white/15 backdrop-blur-sm rounded-2xl text-base font-semibold border border-white/30 active:scale-95 transition-transform"
            >
              <div className="flex items-center justify-center gap-2">
                <BellOff className="w-5 h-5" />
                Snooze {snoozeMinutes} min
              </div>
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-4 bg-white/25 backdrop-blur-sm rounded-2xl text-base font-semibold border border-white/30 active:scale-95 transition-transform"
          >
            <div className="flex items-center justify-center gap-2">
              <X className="w-5 h-5" />
              Dismiss
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
