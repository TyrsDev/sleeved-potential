/**
 * Lists for generating random "Adjective Noun" display names for guests
 */

const ADJECTIVES = [
  "Swift",
  "Brave",
  "Clever",
  "Mighty",
  "Silent",
  "Fierce",
  "Noble",
  "Mystic",
  "Shadow",
  "Golden",
  "Silver",
  "Cosmic",
  "Thunder",
  "Crystal",
  "Ancient",
  "Radiant",
  "Phantom",
  "Blazing",
  "Frozen",
  "Stormy",
  "Crimson",
  "Azure",
  "Emerald",
  "Amber",
  "Lunar",
  "Solar",
  "Primal",
  "Chaos",
  "Serene",
  "Wild",
];

const NOUNS = [
  "Panda",
  "Wolf",
  "Eagle",
  "Tiger",
  "Dragon",
  "Phoenix",
  "Falcon",
  "Bear",
  "Lion",
  "Hawk",
  "Serpent",
  "Raven",
  "Fox",
  "Owl",
  "Shark",
  "Panther",
  "Cobra",
  "Dolphin",
  "Lynx",
  "Jaguar",
  "Badger",
  "Otter",
  "Viper",
  "Crane",
  "Turtle",
  "Mantis",
  "Spider",
  "Scorpion",
  "Beetle",
  "Moth",
];

/**
 * Generate a random "Adjective Noun" display name for guests
 * These names can overlap between users (not unique)
 */
export function generateGuestDisplayName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective} ${noun}`;
}
