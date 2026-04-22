// In-memory exoskeleton control state and 50 Hz loop

export type Joint =
  | 'shoulder_pitch'
  | 'shoulder_roll'
  | 'elbow_flexion'
  | 'wrist_pitch'
  | 'wrist_yaw'

export const JOINTS: Joint[] = [
  'shoulder_pitch',
  'shoulder_roll',
  'elbow_flexion',
  'wrist_pitch',
  'wrist_yaw',
]

export const LIMITS_DEG: Record<Joint, { min: number; max: number }> = {
  shoulder_pitch: { min: -30, max: 120 },
  shoulder_roll: { min: -45, max: 45 },
  elbow_flexion: { min: 0, max: 140 },
  wrist_pitch: { min: -60, max: 60 },
  wrist_yaw: { min: -45, max: 45 },
}

export const HOME_DEG: Record<Joint, number> = {
  shoulder_pitch: 0,
  shoulder_roll: 0,
  elbow_flexion: 0,
  wrist_pitch: 0,
  wrist_yaw: 0,
}

export const SPEEDS_DEG_PER_S: Record<Joint, number> = {
  shoulder_pitch: 40,
  shoulder_roll: 30,
  elbow_flexion: 50,
  wrist_pitch: 60,
  wrist_yaw: 60,
}

type State = {
  angles: Record<Joint, number>
  velocities: Record<Joint, number>
  enabled: boolean
  e_stop: boolean
}

const state: State = {
  angles: Object.fromEntries(JOINTS.map(j => [j, 0])) as Record<Joint, number>,
  velocities: Object.fromEntries(JOINTS.map(j => [j, 0])) as Record<Joint, number>,
  enabled: true,
  e_stop: false,
}

let loopStarted = false

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function step(dt: number) {
  // Safety: zero when disabled or e-stop
  if (!state.enabled || state.e_stop) {
    for (const j of JOINTS) state.velocities[j] = 0
  }

  for (const j of JOINTS) {
    let a = state.angles[j]
    const v = state.velocities[j]

    a += v * dt
    const lim = LIMITS_DEG[j]
    if (a < lim.min) {
      a = lim.min
      state.velocities[j] = 0
    } else if (a > lim.max) {
      a = lim.max
      state.velocities[j] = 0
    }
    state.angles[j] = a
  }
}

export function startLoop() {
  if (loopStarted) return
  loopStarted = true
  const hz = 50
  const dt = 1 / hz
  setInterval(() => step(dt), 1000 / hz)
}

export function getConfig() {
  return { joints: JOINTS, limits: LIMITS_DEG, speeds: SPEEDS_DEG_PER_S }
}

export function getState() {
  return JSON.parse(JSON.stringify(state)) as State
}

export function command(joint: Joint, direction: -1 | 0 | 1, speed: number) {
  if (!(JOINTS as string[]).includes(joint)) return
  const s = clamp(speed, 0, 1)
  const max = SPEEDS_DEG_PER_S[joint]
  if (!state.enabled || state.e_stop) {
    state.velocities[joint] = 0
    return
  }
  state.velocities[joint] = direction * s * max
}

export function stop(joint?: Joint | 'all') {
  if (!joint || joint === 'all') {
    for (const j of JOINTS) state.velocities[j] = 0
    return
  }
  if ((JOINTS as string[]).includes(joint)) state.velocities[joint as Joint] = 0
}

export function enableSystem(enable: boolean) {
  state.enabled = !!enable
  if (!state.enabled) for (const j of JOINTS) state.velocities[j] = 0
}

export function estop(clear?: boolean) {
  if (clear) state.e_stop = false
  else {
    state.e_stop = true
    for (const j of JOINTS) state.velocities[j] = 0
  }
}

export function homeAll() {
  const slow = 0.2
  for (const j of JOINTS) {
    const target = HOME_DEG[j]
    const max = SPEEDS_DEG_PER_S[j]
    const a = state.angles[j]
    if (Math.abs(target - a) < 0.5) state.velocities[j] = 0
    else state.velocities[j] = (target > a ? +1 : -1) * slow * max
  }
}

const MACROS: Record<string, [Joint, 1 | -1]> = {
  arm_up: ['shoulder_pitch', +1],
  arm_down: ['shoulder_pitch', -1],
  left: ['shoulder_roll', +1],
  right: ['shoulder_roll', -1],
  elbow_flex: ['elbow_flexion', +1],
  elbow_extend: ['elbow_flexion', -1],
  wrist_up: ['wrist_pitch', +1],
  wrist_down: ['wrist_pitch', -1],
  hand_left: ['wrist_yaw', -1],
  hand_right: ['wrist_yaw', +1],
}

export function macro(name: string, speed: number) {
  const m = MACROS[name]
  if (!m) return
  const [joint, dir] = m
  command(joint, dir, speed)
}
