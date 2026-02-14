// localStorage keys for persistent anonymous identity
const ANONYMOUS_ID_KEY = 'soundsketch_anonymous_id';
const ANONYMOUS_NAME_KEY = 'soundsketch_anonymous_name';

// Funny adjectives for name generation
const ADJECTIVES = [
  'sneaky', 'sleepy', 'grumpy', 'bouncy', 'fuzzy', 'chunky', 'fluffy',
  'jazzy', 'jumpy', 'dizzy', 'lazy', 'peppy', 'quirky', 'snazzy',
  'wobbly', 'zesty', 'mellow', 'sassy', 'wacky', 'cranky',
  'caffeinated', 'suspicious', 'dramatic', 'chaotic', 'confused',
  'invisible', 'legendary', 'mysterious', 'notorious', 'oblivious',
  'melodic', 'groovy', 'funky', 'cosmic', 'electric',
];

// Animals for name generation
const ANIMALS = [
  'owl', 'fox', 'bear', 'wolf', 'cat', 'dog', 'rabbit', 'duck',
  'goose', 'moose', 'otter', 'badger', 'panda', 'koala', 'sloth',
  'penguin', 'raccoon', 'squirrel', 'hedgehog', 'platypus',
  'capybara', 'llama', 'alpaca', 'wombat', 'armadillo',
  'narwhal', 'octopus', 'mantis', 'toucan', 'pelican',
];

/**
 * Generate a random anonymous name like "sneaky-owl"
 */
export function generateAnonymousName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adjective}-${animal}`;
}

/**
 * Generate a UUID for anonymous user tracking
 */
export function generateAnonymousId(): string {
  return crypto.randomUUID();
}

export interface AnonymousIdentity {
  id: string;
  name: string;
}

/**
 * Get the existing anonymousId if present, without creating one.
 * Used for claiming comments on signup/login.
 */
export function getExistingAnonymousId(): string | null {
  return localStorage.getItem(ANONYMOUS_ID_KEY);
}

/**
 * Get or create anonymous identity from localStorage.
 * Identity persists across browser sessions.
 */
export function getAnonymousIdentity(): AnonymousIdentity {
  let id = localStorage.getItem(ANONYMOUS_ID_KEY);
  let name = localStorage.getItem(ANONYMOUS_NAME_KEY);

  if (!id) {
    id = generateAnonymousId();
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }

  if (!name) {
    name = generateAnonymousName();
    localStorage.setItem(ANONYMOUS_NAME_KEY, name);
  }

  return { id, name };
}

/**
 * Clear anonymous identity (for testing or user request)
 */
export function clearAnonymousIdentity(): void {
  localStorage.removeItem(ANONYMOUS_ID_KEY);
  localStorage.removeItem(ANONYMOUS_NAME_KEY);
}
