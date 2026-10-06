/** Six matched stories. A score keeps this set id; which story a try got is random. */
export const STORY_ID = "stories-v2";

/**
 * Matched for fairness: four sentences of 30–34 characters, 123–126 characters in all, one comma,
 * simple everyday words.
 */
export const stories = [
  ["A child fell down into the dark.", "A friend gave pie, not a fight.", "Jokes drifted across the snow.", "Kindness opened the last door."],
  ["A small fox found a lost lantern.", "Its light woke a shy, old tree.", "The tree hummed a path of stars.", "The fox walked that path home."],
  ["A girl slipped through a mirror.", "A giant asked her to share tea.", "They laughed under a pink moon.", "Then, a warm door led her back."],
  ["A boy tumbled into a paper sky.", "Two kind birds folded him a boat.", "He drifted past cotton clouds.", "At last, the wind set him home."],
  ["A robot woke on a quiet beach.", "A crab showed it how to wave hi.", "Gulls sang it a slow, soft tune.", "A little boat came to fetch it."],
  ["A frog hopped into a deep well.", "A snail lent it a tiny old map.", "Glowworms lit the long, slow way.", "The sun met them up at the top."],
] as const;

/** A random story index, never the same as the last try's. */
export function pickStory(random: () => number, last: number | null): number {
  if (last === null || stories.length < 2) {
    return Math.min(stories.length - 1, Math.floor(random() * stories.length));
  }
  const offset = 1 + Math.min(stories.length - 2, Math.floor(random() * (stories.length - 1)));
  return (last + offset) % stories.length;
}
