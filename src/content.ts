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
    error: 'Something went wrong while loading.',
    retry: 'Retry',
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
