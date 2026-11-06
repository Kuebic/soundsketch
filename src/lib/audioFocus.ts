/**
 * Only one player makes sound at a time. A player claims focus when it
 * starts playing, which pauses whichever player held it before.
 */
type Pause = () => void;

let holder: Pause | null = null;

export function claimAudioFocus(pause: Pause) {
  if (holder && holder !== pause) holder();
  holder = pause;
}

export function releaseAudioFocus(pause: Pause) {
  if (holder === pause) holder = null;
}
