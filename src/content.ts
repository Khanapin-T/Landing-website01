import type { ActId } from './config/acts'

/** Every user-visible string on the site. No em-dashes. */
export const content = {
  title: 'From CAD to Gold',
  gate: {
    message: 'This experience is built for desktop. Please open it on a computer.',
  },
  noWebGL: {
    message: 'This experience needs WebGL 2. Please open it in a current desktop browser.',
  },
  loader: {
    line: "We'll start in a minute",
    heightLabel: '24.8 mm',
    error: 'Something went wrong.',
    retry: 'Retry',
  },
  intro: {
    titleLines: ['From CAD', 'to Gold'],
    subtitle: 'One signet ring in yellow gold, from file to finished piece',
  },
  idea: {
    heading: 'It starts as a drawing',
    caption: 'Every curve, band and honeycomb cell is modeled in CAD before anything physical exists.',
    specs: [
      { label: 'Ring size', value: '20.5 (EU 64)' },
      { label: 'Height', value: '24.8 mm' },
      { label: 'Width', value: '23.5 mm' },
      { label: 'Depth', value: '10.3 mm' },
      { label: 'Shank', value: 'Honeycomb' },
      { label: 'Mesh deviation', value: '< 0.07 mm' },
    ],
    dims: { height: '24.8 mm', width: '23.5 mm' },
  },
  print: {
    heading: 'Then it is printed',
    caption: 'Castable resin, cured by light layer by layer on a resin 3D printer. A print usually takes about 4 hours.',
    chip: { sending: 'Sending to printer', printing: 'Printing', done: 'Printed' },
  },
  mold: {
    heading: 'Then it becomes a mold',
    caption:
      'The rings are mounted on a tree, sealed in a taped flask and covered with investment. The flask then goes into a vacuum chamber, and a short vacuum pulls the air out of the investment before the furnace. The investment then thickens for 10 to 15 minutes before the tape comes off.',
    steps: ['Tree', 'Flask', 'Tape', 'Investment', 'Vacuum', 'Rest', 'Tape off'],
  },
  fire: {
    heading: 'The resin burns out',
    caption:
      'The flask goes into a furnace. The wax runs out and evaporates, the resin burns out, and both leave a hollow in the investment in the exact shape of the tree and our rings. The flask is then turned over for casting.',
    steps: ['Furnace', 'Burnout', 'Flip'],
  },
  gold: {
    heading: 'Then the gold goes in',
    caption:
      'The flask goes under vacuum and molten yellow gold is poured into the funnel. It runs down the trunk and fills the rings from the bottom up, then rests for 5 to 15 minutes before the flask is quenched in water.',
    steps: ['Vacuum', 'Pour', 'Rest'],
  },
  /** Label of the vacuum gauge (Acts 3 and 5). */
  gauge: 'Vacuum',
  /** Label of the rest timer chip (Acts 3 and 5). */
  rest: 'Rest',
  actNames: {
    intro: 'Intro',
    idea: 'Idea',
    print: 'Print',
    mold: 'Mold',
    fire: 'Fire',
    gold: 'Gold',
    birth: 'Birth',
  } satisfies Record<ActId, string>,
} as const
