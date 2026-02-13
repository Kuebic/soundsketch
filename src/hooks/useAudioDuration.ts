/**
 * Hook to extract audio duration from file using HTML5 Audio API
 */
export function useAudioDuration() {
  const getDuration = async (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);

      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(objectUrl);
        resolve(audio.duration);
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load audio metadata'));
      });

      audio.src = objectUrl;
    });
  };

  return { getDuration };
}
