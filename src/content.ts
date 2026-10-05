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
    caption: 'Castable resin, cured layer by layer. The ring grows upside down on a single sprue.',
    chip: { sending: 'Sending to printer', printing: 'Printing', done: 'Printed' },
  },
  scale: {
    label: 'Chapters',
    goTo: (name: string) => `Go to ${name}`,
  },
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
