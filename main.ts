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
// 
//  ── STATE MACHINE ──────────────────────────────────────────
//  IDLE        = 0   Sitting, waiting for a command
//  SEARCHING   = 1   Actively hunting for stinky bones
//  CELEBRATING = 2   Found a bone — doing victory dance
//  AVOIDING    = 3   Obstacle detected — backing up and turning
// 
//  ── DATA BROADCAST (to stinky-bones-datacollector) ─────────
//  Every LOG_INTERVAL_MS the dog broadcasts a 16-byte buffer:
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
//  How often the dog broadcasts sensor data over radio.
let LOG_INTERVAL_MS = 3000
//  Number of forward-crawl steps before a full sniff-pause.
//  Higher = more ground covered per sniff cycle.
let SEARCH_STEPS = 4
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
let last_log_time = 0
//  timestamp of the last radio broadcast
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
function start_searching() {
    /** Transition to SEARCHING state: stand up and begin hunt. */
    
    state = 1
    searching = true
    search_step = 0
    basic.showIcon(IconNames.Happy)
    xgo.execution_action(xgo.action_enum.Stand)
    basic.pause(500)
}

function stop_searching() {
    /** Transition to IDLE state: sit and wait. */
    
    state = 0
    searching = false
    xgo.execution_action(xgo.action_enum.Sit_down)
    basic.showIcon(IconNames.Asleep)
}

function celebrate_bone() {
    /** Play victory sequence when a Stinky Bone is detected. */
    
    state = 2
    bone_count += 1
    //  Victory sound (plays in background while dog moves)
    music.play(music.builtinPlayableSoundEffect(soundExpression.happy), music.PlaybackMode.InBackground)
    basic.showIcon(IconNames.Yes)
    basic.pause(300)
    //  Sit first to signal "found something"
    xgo.execution_action(xgo.action_enum.Sit_down)
    basic.pause(600)
    //  Victory dance sequence
    xgo.execution_action(xgo.action_enum.Twirl_Roll)
    basic.pause(1400)
    xgo.execution_action(xgo.action_enum.Sur_place)
    basic.pause(1400)
    xgo.execution_action(xgo.action_enum.Triaxial_rotation)
    basic.pause(1400)
    xgo.execution_action(xgo.action_enum.Stretch_oneself)
    basic.pause(800)
    xgo.execution_action(xgo.action_enum.Stand)
    basic.pause(400)
    //  Display total bone count on LED matrix
    basic.showNumber(bone_count)
    basic.pause(1200)
    basic.clearScreen()
    //  Resume previous activity
    if (searching) {
        state = 1
        basic.showIcon(IconNames.Happy)
    } else {
        state = 0
        basic.showIcon(IconNames.Asleep)
    }
    
}

function avoid_wall() {
    /** Back up and turn when the sonar detects an obstacle. */
    
    let prior_state = state
    state = 3
    basic.showIcon(IconNames.No)
    //  Back up
    xgo.move_xgo(xgo.direction_enum.Backward, 40)
    basic.pause(900)
    //  Turn right to find an open path
    xgo.move_xgo(xgo.direction_enum.Right, 40)
    basic.pause(700)
    xgo.execution_action(xgo.action_enum.Stand)
    basic.clearScreen()
    //  Restore prior state
    state = prior_state
    if (searching) {
        basic.showIcon(IconNames.Happy)
    }
    
}

function do_search_step() {
    /** One step of the crawl-then-sniff search pattern.

    The dog crawls forward SEARCH_STEPS times, then on the
    next call it crouches (SQUAT) and lowers its head
    (LOOKING_FOR_FOOD) to bring the magnetometer closer to
    the ground where bones might be hiding.
    
 */
    
    if (search_step < SEARCH_STEPS) {
        //  Crawl forward one step
        xgo.execution_action(xgo.action_enum.Crawl_forward)
        basic.pause(900)
        search_step += 1
    } else {
        //  Sniff cycle: lower body, sweep head, rise again
        search_step = 0
        xgo.execution_action(xgo.action_enum.Squat)
        basic.pause(700)
        xgo.execution_action(xgo.action_enum.Looking_for_food)
        basic.pause(1000)
        xgo.execution_action(xgo.action_enum.Stand)
        basic.pause(400)
    }
    
}

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
//  Radio commands from the controller microbit
radio.onReceivedNumber(function on_radio_number(cmd: number) {
    if (cmd == 1) {
        start_searching()
    } else if (cmd == 2) {
        stop_searching()
    } else if (cmd == 3) {
        xgo.execution_action(xgo.action_enum.Stand)
    } else if (cmd == 4) {
        //  Force a victory dance (useful for testing lesson demos)
        celebrate_bone()
    } else if (cmd == 5) {
        xgo.move_xgo(xgo.direction_enum.Forward, 50)
        basic.pause(1000)
    } else if (cmd == 6) {
        xgo.move_xgo(xgo.direction_enum.Left, 50)
        basic.pause(700)
    } else if (cmd == 7) {
        xgo.move_xgo(xgo.direction_enum.Right, 50)
        basic.pause(700)
    } else if (cmd == 8) {
        xgo.move_xgo(xgo.direction_enum.Backward, 50)
        basic.pause(1000)
    }
    
})
//  ────────────────────────────────────────────────────────────
//  MAIN FOREVER LOOP
//  ────────────────────────────────────────────────────────────
basic.forever(function on_forever() {
    let buf: Buffer;
    
    
    //  ── 1. Read all sensors ─────────────────────────────────
    mag_x = input.magneticForce(Dimension.X)
    mag_y = input.magneticForce(Dimension.Y)
    mag_z = input.magneticForce(Dimension.Z)
    mag_strength = input.magneticForce(Dimension.Strength)
    sonar_cm = sonarbit.sonarbit_distance(Distance_Unit.Distance_Unit_cm, DigitalPin.P0)
    //  ── 2. Wall detection (highest priority) ────────────────
    //  sonar returns 0 when no echo is received (out of range)
    //  so we only act on readings > 0
    if (state == 1 && (0 < sonar_cm && sonar_cm < WALL_CM)) {
        avoid_wall()
    } else if (state == 1 && mag_strength > BONE_THRESHOLD) {
        //  ── 3. Bone detection ───────────────────────────────────
        celebrate_bone()
    } else if (state == 1) {
        //  ── 4. Normal search behaviour ──────────────────────────
        do_search_step()
    }
    
    //  ── 5. Periodic sensor data broadcast ───────────────────
    let now = input.runningTime()
    if (now - last_log_time > LOG_INTERVAL_MS) {
        last_log_time = now
        buf = control.createBuffer(16)
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
    
    basic.pause(100)
})
