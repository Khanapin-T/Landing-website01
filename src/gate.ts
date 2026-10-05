import './styles.css'
import { content } from './content'
import { isTouchPrimary, readDeviceEnv } from './boot/device'
import { hasWebGL2 } from './boot/webgl'

function showMessage(text: string): void {
  const root = document.getElementById('root')!
  const p = document.createElement('p')
  p.className = 'fixed inset-0 grid place-items-center px-8 text-center text-lg text-line'
  p.textContent = text
  root.replaceChildren(p)
}

// Runs before React, three.js or any model is requested.
if (isTouchPrimary(readDeviceEnv())) {
  showMessage(content.gate.message)
} else if (!hasWebGL2()) {
  showMessage(content.noWebGL.message)
} else {
  import('./main').catch(() => showMessage(content.loader.error))
}
