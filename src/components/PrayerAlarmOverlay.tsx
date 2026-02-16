import React, { useState, useEffect, useCallback } from 'react';
import { X, Volume2 } from 'lucide-react';

interface PrayerAlarmOverlayProps {
  prayerName: string;
  prayerTime: string;
  onDismiss: () => void;
}

export const PrayerAlarmOverlay = ({ prayerName, prayerTime, onDismiss }: PrayerAlarmOverlayProps) => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);

  const stopAudio = useCallback(() => {
    try {
      audioSource?.stop();
      audioContext?.close();
    } catch {}
    setAudioSource(null);
    setAudioContext(null);
  }, [audioSource, audioContext]);

  useEffect(() => {
    // Play Adhan at max volume using Web Audio API
    const playAlarm = async () => {
      try {
        const ctx = new AudioContext();
        const response = await fetch('/adhan.mp3');
        const buffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(buffer);

        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.0; // Max volume
        gainNode.connect(ctx.destination);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(gainNode);
        source.start(0);

        source.onended = () => {
          onDismiss();
        };

        setAudioContext(ctx);
        setAudioSource(source);
      } catch (error) {
        console.error('Failed to play alarm audio:', error);
        // Fallback to HTML Audio
        const audio = new Audio('/adhan.mp3');
        audio.volume = 1.0;
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
  }, []);

  const handleDismiss = () => {
    stopAudio();
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 flex flex-col items-center justify-center text-white">
      {/* Animated pulse rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-64 h-64 rounded-full border-2 border-white/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute w-48 h-48 rounded-full border-2 border-white/20 animate-ping" style={{ animationDuration: '1.5s' }} />
      </div>

      <div className="relative z-10 text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-pulse">
          <Volume2 className="w-10 h-10 text-white" />
        </div>

        <div>
          <p className="text-lg text-white/70 mb-1">It's time for</p>
          <h1 className="text-5xl font-bold tracking-tight">{prayerName}</h1>
          <p className="text-2xl text-white/80 mt-2">{prayerTime}</p>
        </div>

        <p className="text-white/60 text-sm">🕌 Adhan is playing...</p>

        <button
          onClick={handleDismiss}
          className="mt-8 px-8 py-4 bg-white/20 backdrop-blur-sm rounded-2xl text-lg font-semibold border border-white/30 active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-2">
            <X className="w-5 h-5" />
            Dismiss
          </div>
        </button>
      </div>
    </div>
  );
};
