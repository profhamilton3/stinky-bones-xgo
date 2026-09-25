//  ============================================================
//  Stinky Bones — XGO Dog Receiver
//  ============================================================
//  Hardware: micro:bit v2 + Elecfreaks XGO Gen 1
//            + RingBit expansion board (as connector platform)
//            + HC-SR04 ultrasonic sensor on P0
// 
//  The RingBit board is physically mounted on the XGO dog body
//  using LEGO bricks and screws. It provides connector posts
//  for P0, P1, P2, and GND — these route through to the
//  micro:bit edge connector.
// 
//  ── PIN ASSIGNMENTS ────────────────────────────────────────
//  P1 = XGO serial RX  (RingBit connector post → XGO kit)
//  P2 = XGO serial TX  (RingBit connector post → XGO kit)
//  P0 = HC-SR04 sonar  (RingBit connector post, single-wire)
//       Wire HC-SR04 TRIG and ECHO both to P0
//       (use a 470Ω resistor between TRIG and P0)
// 
//  ── RADIO COMMAND PROTOCOL (Group 3) ───────────────────────
//  Sent by the stinky-bones-controller (joystick:bit) microbit:
//    1 = start searching      (joystick:bit P12 button)
//    2 = stop and sit         (joystick:bit P13 button)
//    3 = stand                (joystick:bit P14 button)
//    4 = force victory dance  (joystick:bit P15 button)
//    5 = move forward         (joystick push up)
//    6 = turn left            (joystick push left)
//    7 = turn right           (joystick push right)
//    8 = move backward        (joystick push down)
//  Commands 3 and 5-8 only work while the dog is idle. A move
//  keeps going while packets keep arriving and stops by itself
//  MANUAL_MOVE_MS / MANUAL_TURN_MS after the last one.
// 
//  ── STATE MACHINE ──────────────────────────────────────────
//  IDLE        = 0   Sitting, waiting for a command
//  SEARCHING   = 1   Actively hunting for stinky bones
//  CELEBRATING = 2   Found a bone — doing victory dance
//  AVOIDING    = 3   Obstacle detected — backing up and turning
// 
//  ── DATA BROADCAST (to stinky-bones-datacollector) ─────────
//  Every LOG_INTERVAL_MS (500 ms) the dog broadcasts a 16-byte
//  buffer, and immediately on every bone detection:
//    bytes  0-1  : mag_x   (INT16_LE, µT)
//    bytes  2-3  : mag_y   (INT16_LE, µT)
//    bytes  4-5  : mag_z   (INT16_LE, µT)
//    bytes  6-7  : accel_x (INT16_LE, mg)
//    bytes  8-9  : accel_y (INT16_LE, mg)
//    bytes 10-11 : accel_z (INT16_LE, mg)
//    bytes 12-13 : sonar_cm (INT16_LE, cm)
//    bytes 14-15 : state   (INT16_LE, 0-3)
//  ============================================================
//  ────────────────────────────────────────────────────────────
//  TUNABLE CONSTANTS
//  Adjust these during calibration sessions with students
//  ────────────────────────────────────────────────────────────
let RADIO_GROUP = 3
//  must match controller and datacollector
//  Magnetometer threshold — raise this if the dog celebrates
//  without finding a bone; lower it if it misses real bones.
//  Typical resting field: 40-60 µT. A magnet at 5cm: 200+ µT.
let BONE_THRESHOLD = 200
//  magnetic strength (µT) to detect a bone
//  Sonar wall threshold — dog stops and turns when closer than
//  this distance. Increase for slower reflexes, decrease to
//  let the dog get closer to walls before turning.
let WALL_CM = 15
//  distance (cm) to trigger wall avoidance
//  Double-clap detection window. Both claps must land within
//  this many milliseconds to count as a double-clap.
let CLAP_WINDOW_MS = 1500
//  Microphone sensitivity. Lower = more sensitive (triggers on
//  quieter sounds). 80 works well for a hand-clap at 1 metre.
let SOUND_THRESH = 80
//  How often the background interval broadcasts sensor data.
//  Also fires immediately on every bone detection.
let LOG_INTERVAL_MS = 500
//  Number of short forward steps before a full sniff-pause.
//  Higher = more ground covered per sniff cycle.
let SEARCH_STEPS = 10
//  Each search step walks for STEP_MS and then stops, so the
//  sonar and magnetometer are checked again after every step.
let SEARCH_SPEED = 40
//  walking speed, 0-100
let STEP_MS = 400
//  Wall avoidance: back up, then rotate on the spot.
//  Raise AVOID_TURN_MS if the dog does not turn far enough.
let AVOID_SPEED = 40
//  0-100
let AVOID_BACK_MS = 900
let AVOID_TURN_MS = 1200
//  Radio joystick moves (commands 5-8). A move stops by itself
//  this long after the last packet for it arrives.
let MANUAL_SPEED = 50
//  0-100
let MANUAL_MOVE_MS = 1000
//  forward / backward
let MANUAL_TURN_MS = 700
//  turn left / right
//  ────────────────────────────────────────────────────────────
//  STATE VARIABLES  (do not change these initial values)
//  ────────────────────────────────────────────────────────────
let state = 0
//  current state
let searching = false
//  True while the dog should be searching
let clap_count = 0
//  counts rapid loud sounds
let clap_time = 0
//  timestamp of the first clap in a window
let search_step = 0
//  position within the crawl-sniff cycle
let bone_count = 0
//  total bones found this session
//  Every Start and Stop adds 1 to run_id. A routine remembers
//  the run_id it started with and gives up (without moving the
//  dog again) as soon as run_id changes.
let run_id = 0
let stand_pending = false
//  forever loop should stand up next
let dance_pending = false
//  forever loop should do a victory dance
let sit_run = -1
//  run_id that the pending sit belongs to
let manual_cmd = 0
//  radio move command in progress (5-8)
let manual_until = 0
//  running_time when that move stops (0 = none)
//  Cached sensor readings (refreshed in the forever loop)
let mag_x = 0
let mag_y = 0
let mag_z = 0
let mag_strength = 0
let sonar_cm = 0
//  ────────────────────────────────────────────────────────────
//  HARDWARE INITIALISATION
//  ────────────────────────────────────────────────────────────
radio.setGroup(RADIO_GROUP)
xgo.init_xgo_serial(SerialPin.P2, SerialPin.P1)
input.setSoundThreshold(SoundThreshold.Loud, SOUND_THRESH)
//  Startup animation: show a heart, sit down, then sleep icon
basic.showIcon(IconNames.Heart)
basic.pause(800)
xgo.execution_action(xgo.action_enum.Sit_down)
basic.pause(600)
basic.clearScreen()
basic.showIcon(IconNames.Asleep)
//  ────────────────────────────────────────────────────────────
//  HELPER FUNCTIONS
//  ────────────────────────────────────────────────────────────
function log_data() {
    /** Broadcast a 16-byte sensor snapshot over radio.

    Called by the background interval every LOG_INTERVAL_MS,
    and immediately when a bone is detected so spikes are
    never missed between interval ticks.

 */

    let buf = control.createBuffer(16)
    buf.setNumber(NumberFormat.Int16LE, 0, mag_x)
    buf.setNumber(NumberFormat.Int16LE, 2, mag_y)
    buf.setNumber(NumberFormat.Int16LE, 4, mag_z)
    buf.setNumber(NumberFormat.Int16LE, 6, input.acceleration(Dimension.X))
    buf.setNumber(NumberFormat.Int16LE, 8, input.acceleration(Dimension.Y))
    buf.setNumber(NumberFormat.Int16LE, 10, input.acceleration(Dimension.Z))
    buf.setNumber(NumberFormat.Int16LE, 12, sonar_cm)
    buf.setNumber(NumberFormat.Int16LE, 14, state)
    radio.sendBuffer(buf)
}

loops.everyInterval(LOG_INTERVAL_MS, log_data)
function stop_motion() {
    /** Set every XGO walking speed back to zero.

    move_xgo and rotate only set a speed; the dog keeps
    walking until that speed is set to 0 again. Forward/back,
    sideways and turning are three separate speeds, so each
    one has to be stopped on its own.

 */

    manual_until = 0
    xgo.move_xgo(xgo.direction_enum.Forward, 0)
    //  forward / back
    xgo.move_xgo(xgo.direction_enum.Left, 0)
    //  sideways
    xgo.rotate(xgo.rotate_enum.Left, 0)
}

//  turning
function is_current(token: number): boolean {
    /** True if no Start or Stop has happened since token. */
    return token == run_id
}

function bone_here(): boolean {
    /** Read the magnetometer; True if a bone is underneath. */

    mag_strength = input.magneticForce(Dimension.Strength)
    return mag_strength > BONE_THRESHOLD
}

function start_searching() {
    /** Transition to SEARCHING state: stand up and begin hunt.

    Returns straight away. The forever loop does the standing
    up, so a Stop can still cancel it.

 */

    run_id += 1
    state = 1
    searching = true
    search_step = 0
    stand_pending = true
    dance_pending = false
    stop_motion()
    basic.showIcon(IconNames.Happy)
}

function sit_after_stop() {
    /** Background part of Stop: sit, unless Start came first. */

    if (sit_run == run_id) {
        sit_run = -1
        xgo.execution_action(xgo.action_enum.Sit_down)
    }

}

function stop_searching() {
    /** Transition to IDLE state: stop moving, then sit.

    Stop wins over everything else. It cancels whatever the
    dog is doing, and the sit runs in the background so this
    returns straight away.

 */

    run_id += 1
    let my_run = run_id
    state = 0
    searching = false
    stand_pending = false
    dance_pending = false
    sit_run = run_id
    stop_motion()
    control.inBackground(sit_after_stop)
    if (is_current(my_run)) {
        basic.showIcon(IconNames.Asleep)
    }

}

function celebrate_bone(token: number) {
    /** Play victory sequence when a Stinky Bone is detected.

    Gives up quietly, without moving the dog again, if Start
    or Stop is pressed part-way through.

 */

    if (!is_current(token)) {
        return
    }

    state = 2
    bone_count += 1
    stop_motion()
    log_data()
    //  Victory sound (plays in background while dog moves)
    music.play(music.builtinPlayableSoundEffect(soundExpression.hello), music.PlaybackMode.InBackground)
    basic.showIcon(IconNames.Yes)
    basic.pause(300)
    if (!is_current(token)) {
        return
    }

    //  Sit first to signal "found something"
    xgo.execution_action(xgo.action_enum.Sit_down)
    basic.pause(600)
    if (!is_current(token)) {
        return
    }

    //  Victory dance sequence
    xgo.execution_action(xgo.action_enum.Stretch_oneself)
    basic.pause(800)
    if (!is_current(token)) {
        return
    }

    xgo.execution_action(xgo.action_enum.Stand)
    basic.pause(400)
    if (!is_current(token)) {
        return
    }

    //  Resume previous activity
    if (searching) {
        state = 1
        basic.showIcon(IconNames.Happy)
    } else {
        state = 0
        basic.showIcon(IconNames.Asleep)
    }

}

function avoid_wall(token: number) {
    /** Back up and rotate when the sonar detects an obstacle. */

    if (!is_current(token)) {
        return
    }

    state = 3
    basic.showIcon(IconNames.No)
    if (!is_current(token)) {
        return
    }

    //  Back up
    xgo.move_xgo(xgo.direction_enum.Backward, AVOID_SPEED)
    basic.pause(AVOID_BACK_MS)
    if (!is_current(token)) {
        return
    }

    xgo.move_xgo(xgo.direction_enum.Forward, 0)
    //  Rotate right on the spot to find an open path
    xgo.rotate(xgo.rotate_enum.Right, AVOID_SPEED)
    basic.pause(AVOID_TURN_MS)
    if (!is_current(token)) {
        return
    }

    xgo.rotate(xgo.rotate_enum.Right, 0)
    //  Back to searching
    state = 1
    basic.showIcon(IconNames.Happy)
}

function do_search_step(token: number) {
    /** One step of the walk-then-sniff search pattern.

    The dog takes SEARCH_STEPS short steps (each one stopped
    after STEP_MS), then on the next call it crouches (SQUAT)
    and lowers its head (LOOKING_FOR_FOOD) to bring the
    magnetometer closer to the ground where bones might be
    hiding, checking for a bone while it is down there.

 */

    if (search_step < SEARCH_STEPS) {
        //  Walk forward one short step, then stop
        search_step += 1
        xgo.move_xgo(xgo.direction_enum.Forward, SEARCH_SPEED)
        basic.pause(STEP_MS)
        if (is_current(token)) {
            xgo.move_xgo(xgo.direction_enum.Forward, 0)
        }

    } else {
        //  Sniff cycle: lower body, sweep head, rise again
        search_step = 0
        xgo.execution_action(xgo.action_enum.Squat)
        basic.pause(700)
        if (!is_current(token)) {
            return
        }

        if (bone_here()) {
            celebrate_bone(token)
            return
        }

        xgo.execution_action(xgo.action_enum.Looking_for_food)
        basic.pause(1000)
        if (!is_current(token)) {
            return
        }

        if (bone_here()) {
            celebrate_bone(token)
            return
        }

        xgo.execution_action(xgo.action_enum.Stand)
        basic.pause(400)
    }

}

function manual_move(cmd: number) {
    /** Radio joystick move (commands 5-8), only while idle.

    Sets the speed and returns straight away, so a Stop from
    the controller is never stuck behind queued moves.
    check_manual_move() stops the dog once packets stop.

 */

    if (searching || state != 0) {
        return
    }

    //  a search or dance is in charge of the legs
    let token = run_id
    if (manual_until == 0 || cmd != manual_cmd) {
        stop_motion()
    }

    //  new direction: clear the old speeds
    manual_cmd = cmd
    let duration = MANUAL_MOVE_MS
    if (cmd == 5) {
        xgo.move_xgo(xgo.direction_enum.Forward, MANUAL_SPEED)
    } else if (cmd == 6) {
        xgo.rotate(xgo.rotate_enum.Left, MANUAL_SPEED)
        duration = MANUAL_TURN_MS
    } else if (cmd == 7) {
        xgo.rotate(xgo.rotate_enum.Right, MANUAL_SPEED)
        duration = MANUAL_TURN_MS
    } else {
        xgo.move_xgo(xgo.direction_enum.Backward, MANUAL_SPEED)
    }

    if (is_current(token) && state == 0 && !searching) {
        manual_until = input.runningTime() + duration
    } else {
        //  Start, Stop or a dance happened while sending: undo it
        stop_motion()
    }

}

function check_manual_move() {
    /** Stop a radio move once its time is up. */
    if (manual_until > 0 && input.runningTime() >= manual_until) {
        stop_motion()
    }

}

loops.everyInterval(50, check_manual_move)
//  ────────────────────────────────────────────────────────────
//  EVENT HANDLERS
//  ────────────────────────────────────────────────────────────
//  Button A — start searching
input.onButtonPressed(Button.A, function on_button_a() {
    start_searching()
})
//  Button B — stop and sit
input.onButtonPressed(Button.B, function on_button_b() {
    stop_searching()
    //  Display total bone count on LED matrix
    basic.showNumber(bone_count)
    basic.pause(1200)
    if (searching) {
        basic.showIcon(IconNames.Happy)
    } else {
        basic.clearScreen()
    }

})
//  Double-clap — toggle search on / off
//  Two loud sounds within CLAP_WINDOW_MS count as a double-clap
input.onSound(DetectedSound.Loud, function on_loud_sound() {

    let now = input.runningTime()
    if (clap_count == 0) {
        //  First clap: open the detection window
        clap_count = 1
        clap_time = now
    } else if (now - clap_time < CLAP_WINDOW_MS) {
        //  Second clap inside window: toggle
        clap_count = 0
        if (searching) {
            stop_searching()
        } else {
            start_searching()
        }

    } else {
        //  Window expired: treat this as a fresh first clap
        clap_count = 1
        clap_time = now
    }

})
//  Radio commands from the controller microbit.
//  Nothing here waits for the dog to finish moving, so every
//  command (especially Stop) is handled as soon as it arrives.
radio.onReceivedNumber(function on_radio_number(cmd: number) {

    if (cmd == 1) {
        start_searching()
    } else if (cmd == 2) {
        stop_searching()
    } else if (cmd == 3) {
        if (!searching) {
            stand_pending = true
        }

    } else if (cmd == 4) {
        //  Force a victory dance (useful for testing lesson demos)
        dance_pending = true
    } else if (cmd >= 5 && cmd <= 8) {
        manual_move(cmd)
    }

})
//  ────────────────────────────────────────────────────────────
//  MAIN FOREVER LOOP
//  All autonomous moves happen here, one routine at a time.
//  ────────────────────────────────────────────────────────────
basic.forever(function on_forever() {

    //  ── 1. Read all sensors ─────────────────────────────────
    mag_x = input.magneticForce(Dimension.X)
    mag_y = input.magneticForce(Dimension.Y)
    mag_z = input.magneticForce(Dimension.Z)
    mag_strength = input.magneticForce(Dimension.Strength)
    sonar_cm = sonarbit.sonarbit_distance(Distance_Unit.Distance_Unit_cm, DigitalPin.P0)
    let token = run_id
    //  ── 2. Requests from the radio controller ───────────────
    if (dance_pending) {
        dance_pending = false
        celebrate_bone(token)
    } else if (stand_pending) {
        stand_pending = false
        xgo.execution_action(xgo.action_enum.Stand)
    } else if (state == 1 && (0 < sonar_cm && sonar_cm < WALL_CM)) {
        //  ── 3. Wall detection (first check while searching) ────
        //  sonar returns 0 when no echo is received (out of range)
        //  so we only act on readings > 0
        avoid_wall(token)
    } else if (state == 1 && mag_strength > BONE_THRESHOLD) {
        //  ── 4. Bone detection ───────────────────────────────────
        celebrate_bone(token)
    } else if (state == 1) {
        //  ── 5. Normal search behaviour ──────────────────────────
        do_search_step(token)
    }

    basic.pause(20)
})
