const BUBBLE_FILLS = [
  'rgba(226,118,164,.88)', 'rgba(248,213,228,.84)', 'rgba(244,204,142,.78)',
  'rgba(234,219,143,.78)', 'rgba(201,221,156,.78)', 'rgba(184,217,196,.78)',
  'rgba(169,207,218,.78)', 'rgba(174,189,224,.78)', 'rgba(189,167,221,.78)',
  'rgba(168,135,197,.78)', 'rgba(135,95,159,.78)'
];

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
  radius,
  fill: BUBBLE_FILLS[index],
  stroke: '#574777'
}));

export function mergeResult(leftTier, rightTier) {
  if (leftTier !== rightTier || leftTier >= DANBAI_TIERS.length - 1) return null;
  return { nextTier: leftTier + 1, score: 20 * 2 ** leftTier };
}

export function updateDangerTimer(
  bodies,
  previousSince,
  now,
  lineY = 108,
  holdMs = 1000
) {
  const above = bodies.some((body) =>
    !body.isStatic &&
    body.plugin?.tier !== undefined &&
    body.position.y - body.circleRadius < lineY
  );
  if (!above) return { since: null, gameOver: false };
  const since = previousSince ?? now;
  return { since, gameOver: now - since >= holdMs };
}
