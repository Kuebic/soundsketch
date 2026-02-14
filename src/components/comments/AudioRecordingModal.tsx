import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { formatDuration } from '@/lib/utils';
import { Mic, Square, RotateCcw, Check, AlertCircle } from 'lucide-react';

interface AudioRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordingComplete: (file: File) => void;
  maxDuration?: number;
}

export function AudioRecordingModal({
  isOpen,
  onClose,
  onRecordingComplete,
  maxDuration = 300,
}: AudioRecordingModalProps) {
  const handleMaxDurationReached = useCallback(() => {
    toast.info('Maximum recording length reached (5 minutes)');
  }, []);

  const {
    state,
    error,
    duration,
    audioUrl,
    startRecording,
    stopRecording,
    reset,
    getFile,
  } = useAudioRecording({
    maxDuration,
    onMaxDurationReached: handleMaxDurationReached,
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const handleUseRecording = () => {
    const file = getFile();
    if (file) {
      onRecordingComplete(file);
      onClose();
    }
  };

  const handleClose = () => {
    if (state === 'recording') {
      stopRecording();
    }
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Record Audio" size="sm">
      <div className="flex flex-col items-center gap-6">
        {/* Error state */}
        {state === 'error' && error && (
          <div className="w-full bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={reset}
                className="text-sm text-studio-text-secondary hover:text-studio-text-primary mt-2 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Idle / Requesting state */}
        {(state === 'idle' || state === 'requesting') && (
          <>
            <p className="text-sm text-studio-text-secondary text-center">
              Click the button below to start recording your voice feedback.
            </p>
            <button
              onClick={startRecording}
              disabled={state === 'requesting'}
              className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 transition-all flex items-center justify-center shadow-lg hover:shadow-red-500/25 active:scale-95"
            >
              {state === 'requesting' ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
            <p className="text-xs text-studio-text-secondary">
              Max {Math.floor(maxDuration / 60)} minutes
            </p>
          </>
        )}

        {/* Recording state */}
        {state === 'recording' && (
          <>
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-red-500 flex items-center justify-center">
                <Mic className="w-8 h-8 text-white" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-3xl font-mono font-bold text-red-400">
                {formatDuration(duration)}
              </p>
              <p className="text-sm text-studio-text-secondary mt-1">Recording...</p>
            </div>

            <button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-studio-dark hover:bg-studio-gray border-2 border-studio-gray transition-all flex items-center justify-center active:scale-95"
            >
              <Square className="w-6 h-6 text-white fill-white" />
            </button>
          </>
        )}

        {/* Preview state */}
        {state === 'stopped' && audioUrl && (
          <>
            <div className="w-full">
              <p className="text-sm text-studio-text-secondary mb-2 text-center">
                Preview your recording
              </p>
              <audio
                src={audioUrl}
                controls
                className="w-full h-12 rounded-lg"
                style={{ colorScheme: 'dark' }}
              />
              <p className="text-xs text-studio-text-secondary mt-2 text-center mono">
                Duration: {formatDuration(duration)}
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <Button
                variant="secondary"
                onClick={reset}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Re-record
              </Button>
              <Button
                variant="primary"
                onClick={handleUseRecording}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Use Recording
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
