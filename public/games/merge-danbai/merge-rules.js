export const DANBAI_TIERS = [
  ['blank.png', 18],
  ['eye-roll.png', 22],
  ['shy.png', 27],
  ['surprise.png', 33],
  ['dizzy.png', 40],
  ['expect.png', 48],
  ['smirk.png', 57],
  ['cool.png', 67],
  ['rage.png', 78],
  ['laugh-cry.png', 90],
  ['praise-sun.png', 104]
].map(([image, radius], index) => ({
  index,
  image: `../../danbai/${image}`,
  radius
}));

export function mergeResult(leftTier, rightTier) {
  if (leftTier !== rightTier || leftTier >= DANBAI_TIERS.length - 1) return null;
  return { nextTier: leftTier + 1, score: 20 * 2 ** leftTier };
}
