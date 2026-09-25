# ============================================================
# Stinky Bones — XGO Dog Receiver
# ============================================================
# Hardware: micro:bit v2 + Elecfreaks XGO Gen 1
#           + RingBit expansion board (as connector platform)
#           + HC-SR04 ultrasonic sensor on P0
#
# The RingBit board is physically mounted on the XGO dog body
# using LEGO bricks and screws. It provides connector posts
# for P0, P1, P2, and GND — these route through to the
# micro:bit edge connector.
#
# ── PIN ASSIGNMENTS ────────────────────────────────────────
# P1 = XGO serial RX  (RingBit connector post → XGO kit)
# P2 = XGO serial TX  (RingBit connector post → XGO kit)
# P0 = HC-SR04 sonar  (RingBit connector post, single-wire)
#      Wire HC-SR04 TRIG and ECHO both to P0
#      (use a 470Ω resistor between TRIG and P0)
#
# ── RADIO COMMAND PROTOCOL (Group 3) ───────────────────────
# Sent by the stinky-bones-controller (joystick:bit) microbit:
#   1 = start searching      (joystick:bit P12 button)
#   2 = stop and sit         (joystick:bit P13 button)
#   3 = stand                (joystick:bit P14 button)
#   4 = force victory dance  (joystick:bit P15 button)
#   5 = move forward         (joystick push up)
#   6 = turn left            (joystick push left)
#   7 = turn right           (joystick push right)
#   8 = move backward        (joystick push down)
# Commands 3 and 5-8 only work while the dog is idle. A move
# keeps going while packets keep arriving and stops by itself
# MANUAL_MOVE_MS / MANUAL_TURN_MS after the last one.
#
# ── STATE MACHINE ──────────────────────────────────────────
# IDLE        = 0   Sitting, waiting for a command
# SEARCHING   = 1   Actively hunting for stinky bones
# CELEBRATING = 2   Found a bone — doing victory dance
# AVOIDING    = 3   Obstacle detected — backing up and turning
#
# ── DATA BROADCAST (to stinky-bones-datacollector) ─────────
# Every LOG_INTERVAL_MS (500 ms) the dog broadcasts a 16-byte
# buffer, and immediately on every bone detection:
#   bytes  0-1  : mag_x   (INT16_LE, µT)
#   bytes  2-3  : mag_y   (INT16_LE, µT)
#   bytes  4-5  : mag_z   (INT16_LE, µT)
#   bytes  6-7  : accel_x (INT16_LE, mg)
#   bytes  8-9  : accel_y (INT16_LE, mg)
#   bytes 10-11 : accel_z (INT16_LE, mg)
#   bytes 12-13 : sonar_cm (INT16_LE, cm)
#   bytes 14-15 : state   (INT16_LE, 0-3)
# ============================================================


# ────────────────────────────────────────────────────────────
# TUNABLE CONSTANTS
# Adjust these during calibration sessions with students
# ────────────────────────────────────────────────────────────
RADIO_GROUP = 3        # must match controller and datacollector

# Magnetometer threshold — raise this if the dog celebrates
# without finding a bone; lower it if it misses real bones.
# Typical resting field: 40-60 µT. A magnet at 5cm: 200+ µT.
BONE_THRESHOLD = 200   # magnetic strength (µT) to detect a bone

# Sonar wall threshold — dog stops and turns when closer than
# this distance. Increase for slower reflexes, decrease to
# let the dog get closer to walls before turning.
WALL_CM = 15           # distance (cm) to trigger wall avoidance

# Double-clap detection window. Both claps must land within
# this many milliseconds to count as a double-clap.
CLAP_WINDOW_MS = 1500

# Microphone sensitivity. Lower = more sensitive (triggers on
# quieter sounds). 80 works well for a hand-clap at 1 metre.
SOUND_THRESH = 80

# How often the background interval broadcasts sensor data.
# Also fires immediately on every bone detection.
LOG_INTERVAL_MS = 500

# Number of short forward steps before a full sniff-pause.
# Higher = more ground covered per sniff cycle.
SEARCH_STEPS = 10

# Each search step walks for STEP_MS and then stops, so the
# sonar and magnetometer are checked again after every step.
SEARCH_SPEED = 40      # walking speed, 0-100
STEP_MS = 400

# Wall avoidance: back up, then rotate on the spot.
# Raise AVOID_TURN_MS if the dog does not turn far enough.
AVOID_SPEED = 40       # 0-100
AVOID_BACK_MS = 900
AVOID_TURN_MS = 1200

# Radio joystick moves (commands 5-8). A move stops by itself
# this long after the last packet for it arrives.
MANUAL_SPEED = 50      # 0-100
MANUAL_MOVE_MS = 1000  # forward / backward
MANUAL_TURN_MS = 700   # turn left / right


# ────────────────────────────────────────────────────────────
# STATE VARIABLES  (do not change these initial values)
# ────────────────────────────────────────────────────────────
state = 0              # current state
searching = False      # True while the dog should be searching
clap_count = 0         # counts rapid loud sounds
clap_time = 0          # timestamp of the first clap in a window
search_step = 0        # position within the crawl-sniff cycle
bone_count = 0         # total bones found this session

# Every Start and Stop adds 1 to run_id. A routine remembers
# the run_id it started with and gives up (without moving the
# dog again) as soon as run_id changes.
run_id = 0
stand_pending = False  # forever loop should stand up next
dance_pending = False  # forever loop should do a victory dance
sit_run = -1           # run_id that the pending sit belongs to
manual_cmd = 0         # radio move command in progress (5-8)
manual_until = 0       # running_time when that move stops (0 = none)

# Cached sensor readings (refreshed in the forever loop)
mag_x = 0
mag_y = 0
mag_z = 0
mag_strength = 0
sonar_cm = 0


# ────────────────────────────────────────────────────────────
# HARDWARE INITIALISATION
# ────────────────────────────────────────────────────────────
radio.set_group(RADIO_GROUP)
xgo.init_xgo_serial(SerialPin.P2, SerialPin.P1)
input.set_sound_threshold(SoundThreshold.LOUD, SOUND_THRESH)

# Startup animation: show a heart, sit down, then sleep icon
basic.show_icon(IconNames.HEART)
basic.pause(800)
xgo.execution_action(xgo.action_enum.SIT_DOWN)
basic.pause(600)
basic.clear_screen()
basic.show_icon(IconNames.ASLEEP)


# ────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ────────────────────────────────────────────────────────────

def log_data():
    """Broadcast a 16-byte sensor snapshot over radio.

    Called by the background interval every LOG_INTERVAL_MS,
    and immediately when a bone is detected so spikes are
    never missed between interval ticks.
    """
    global mag_x, mag_y, mag_z, mag_strength, sonar_cm
    buf = bytearray(16)
    buf.set_number(NumberFormat.INT16_LE, 0, mag_x)
    buf.set_number(NumberFormat.INT16_LE, 2, mag_y)
    buf.set_number(NumberFormat.INT16_LE, 4, mag_z)
    buf.set_number(NumberFormat.INT16_LE, 6,
                       input.acceleration(Dimension.X))
    buf.set_number(NumberFormat.INT16_LE, 8,
                       input.acceleration(Dimension.Y))
    buf.set_number(NumberFormat.INT16_LE, 10,
                       input.acceleration(Dimension.Z))
    buf.set_number(NumberFormat.INT16_LE, 12, sonar_cm)
    buf.set_number(NumberFormat.INT16_LE, 14, state)
    radio.send_buffer(buf)


loops.every_interval(LOG_INTERVAL_MS, log_data)


def stop_motion():
    """Set every XGO walking speed back to zero.

    move_xgo and rotate only set a speed; the dog keeps
    walking until that speed is set to 0 again. Forward/back,
    sideways and turning are three separate speeds, so each
    one has to be stopped on its own.
    """
    global manual_until
    manual_until = 0
    xgo.move_xgo(xgo.direction_enum.FORWARD, 0)   # forward / back
    xgo.move_xgo(xgo.direction_enum.LEFT, 0)      # sideways
    xgo.rotate(xgo.rotate_enum.LEFT, 0)           # turning


def is_current(token: number):
    """True if no Start or Stop has happened since token."""
    return token == run_id


def bone_here():
    """Read the magnetometer; True if a bone is underneath."""
    global mag_strength
    mag_strength = input.magnetic_force(Dimension.STRENGTH)
    return mag_strength > BONE_THRESHOLD


def start_searching():
    """Transition to SEARCHING state: stand up and begin hunt.

    Returns straight away. The forever loop does the standing
    up, so a Stop can still cancel it.
    """
    global run_id, state, searching, search_step
    global stand_pending, dance_pending
    run_id += 1
    state = 1
    searching = True
    search_step = 0
    stand_pending = True
    dance_pending = False
    stop_motion()
    basic.show_icon(IconNames.HAPPY)


def sit_after_stop():
    """Background part of Stop: sit, unless Start came first."""
    global sit_run
    if sit_run == run_id:
        sit_run = -1
        xgo.execution_action(xgo.action_enum.SIT_DOWN)


def stop_searching():
    """Transition to IDLE state: stop moving, then sit.

    Stop wins over everything else. It cancels whatever the
    dog is doing, and the sit runs in the background so this
    returns straight away.
    """
    global run_id, state, searching, stand_pending, dance_pending
    global sit_run
    run_id += 1
    my_run = run_id
    state = 0
    searching = False
    stand_pending = False
    dance_pending = False
    sit_run = run_id
    stop_motion()
    control.in_background(sit_after_stop)
    if is_current(my_run):
        basic.show_icon(IconNames.ASLEEP)


def celebrate_bone(token: number):
    """Play victory sequence when a Stinky Bone is detected.

    Gives up quietly, without moving the dog again, if Start
    or Stop is pressed part-way through.
    """
    global state, bone_count
    if not is_current(token):
        return
    state = 2
    bone_count += 1
    stop_motion()
    log_data()
    # Victory sound (plays in background while dog moves)
    music.play(
        music.builtin_playable_sound_effect(soundExpression.hello),
        music.PlaybackMode.IN_BACKGROUND
    )
    basic.show_icon(IconNames.YES)
    basic.pause(300)
    if not is_current(token):
        return

    # Sit first to signal "found something"
    xgo.execution_action(xgo.action_enum.SIT_DOWN)
    basic.pause(600)
    if not is_current(token):
        return

    # Victory dance sequence
    xgo.execution_action(xgo.action_enum.STRETCH_ONESELF)
    basic.pause(800)
    if not is_current(token):
        return
    xgo.execution_action(xgo.action_enum.STAND)
    basic.pause(400)
    if not is_current(token):
        return

    # Resume previous activity
    if searching:
        state = 1
        basic.show_icon(IconNames.HAPPY)
    else:
        state = 0
        basic.show_icon(IconNames.ASLEEP)


def avoid_wall(token: number):
    """Back up and rotate when the sonar detects an obstacle."""
    global state
    if not is_current(token):
        return
    state = 3
    basic.show_icon(IconNames.NO)
    if not is_current(token):
        return

    # Back up
    xgo.move_xgo(xgo.direction_enum.BACKWARD, AVOID_SPEED)
    basic.pause(AVOID_BACK_MS)
    if not is_current(token):
        return
    xgo.move_xgo(xgo.direction_enum.FORWARD, 0)

    # Rotate right on the spot to find an open path
    xgo.rotate(xgo.rotate_enum.RIGHT, AVOID_SPEED)
    basic.pause(AVOID_TURN_MS)
    if not is_current(token):
        return
    xgo.rotate(xgo.rotate_enum.RIGHT, 0)

    # Back to searching
    state = 1
    basic.show_icon(IconNames.HAPPY)


def do_search_step(token: number):
    """One step of the walk-then-sniff search pattern.

    The dog takes SEARCH_STEPS short steps (each one stopped
    after STEP_MS), then on the next call it crouches (SQUAT)
    and lowers its head (LOOKING_FOR_FOOD) to bring the
    magnetometer closer to the ground where bones might be
    hiding, checking for a bone while it is down there.
    """
    global search_step
    if search_step < SEARCH_STEPS:
        # Walk forward one short step, then stop
        search_step += 1
        xgo.move_xgo(xgo.direction_enum.FORWARD, SEARCH_SPEED)
        basic.pause(STEP_MS)
        if is_current(token):
            xgo.move_xgo(xgo.direction_enum.FORWARD, 0)
    else:
        # Sniff cycle: lower body, sweep head, rise again
        search_step = 0
        xgo.execution_action(xgo.action_enum.SQUAT)
        basic.pause(700)
        if not is_current(token):
            return
        if bone_here():
            celebrate_bone(token)
            return
        xgo.execution_action(xgo.action_enum.LOOKING_FOR_FOOD)
        basic.pause(1000)
        if not is_current(token):
            return
        if bone_here():
            celebrate_bone(token)
            return
        xgo.execution_action(xgo.action_enum.STAND)
        basic.pause(400)


def manual_move(cmd: number):
    """Radio joystick move (commands 5-8), only while idle.

    Sets the speed and returns straight away, so a Stop from
    the controller is never stuck behind queued moves.
    check_manual_move() stops the dog once packets stop.
    """
    global manual_cmd, manual_until
    if searching or state != 0:
        return  # a search or dance is in charge of the legs
    token = run_id
    if manual_until == 0 or cmd != manual_cmd:
        stop_motion()  # new direction: clear the old speeds
    manual_cmd = cmd
    duration = MANUAL_MOVE_MS
    if cmd == 5:
        xgo.move_xgo(xgo.direction_enum.FORWARD, MANUAL_SPEED)
    elif cmd == 6:
        xgo.rotate(xgo.rotate_enum.LEFT, MANUAL_SPEED)
        duration = MANUAL_TURN_MS
    elif cmd == 7:
        xgo.rotate(xgo.rotate_enum.RIGHT, MANUAL_SPEED)
        duration = MANUAL_TURN_MS
    else:
        xgo.move_xgo(xgo.direction_enum.BACKWARD, MANUAL_SPEED)
    if is_current(token) and state == 0 and not searching:
        manual_until = input.running_time() + duration
    else:
        # Start, Stop or a dance happened while sending: undo it
        stop_motion()


def check_manual_move():
    """Stop a radio move once its time is up."""
    if manual_until > 0 and input.running_time() >= manual_until:
        stop_motion()


loops.every_interval(50, check_manual_move)


# ────────────────────────────────────────────────────────────
# EVENT HANDLERS
# ────────────────────────────────────────────────────────────

# Button A — start searching
def on_button_a():
    start_searching()
input.on_button_pressed(Button.A, on_button_a)


# Button B — stop and sit
def on_button_b():
    stop_searching()
    # Display total bone count on LED matrix
    basic.show_number(bone_count)
    basic.pause(1200)
    if searching:
        basic.show_icon(IconNames.HAPPY)
    else:
        basic.clear_screen()
input.on_button_pressed(Button.B, on_button_b)


# Double-clap — toggle search on / off
# Two loud sounds within CLAP_WINDOW_MS count as a double-clap
def on_loud_sound():
    global clap_count, clap_time
    now = input.running_time()
    if clap_count == 0:
        # First clap: open the detection window
        clap_count = 1
        clap_time = now
    elif (now - clap_time) < CLAP_WINDOW_MS:
        # Second clap inside window: toggle
        clap_count = 0
        if searching:
            stop_searching()
        else:
            start_searching()
    else:
        # Window expired: treat this as a fresh first clap
        clap_count = 1
        clap_time = now
input.on_sound(DetectedSound.LOUD, on_loud_sound)


# Radio commands from the controller microbit.
# Nothing here waits for the dog to finish moving, so every
# command (especially Stop) is handled as soon as it arrives.
def on_radio_number(cmd: number):
    global stand_pending, dance_pending
    if cmd == 1:
        start_searching()
    elif cmd == 2:
        stop_searching()
    elif cmd == 3:
        if not searching:
            stand_pending = True
    elif cmd == 4:
        # Force a victory dance (useful for testing lesson demos)
        dance_pending = True
    elif cmd >= 5 and cmd <= 8:
        manual_move(cmd)
radio.on_received_number(on_radio_number)


# ────────────────────────────────────────────────────────────
# MAIN FOREVER LOOP
# All autonomous moves happen here, one routine at a time.
# ────────────────────────────────────────────────────────────

def on_forever():
    global mag_x, mag_y, mag_z, mag_strength, sonar_cm
    global stand_pending, dance_pending

    # ── 1. Read all sensors ─────────────────────────────────
    mag_x = input.magnetic_force(Dimension.X)
    mag_y = input.magnetic_force(Dimension.Y)
    mag_z = input.magnetic_force(Dimension.Z)
    mag_strength = input.magnetic_force(Dimension.STRENGTH)
    sonar_cm = sonarbit.sonarbit_distance(Distance_Unit.Distance_Unit_cm, DigitalPin.P0)
    token = run_id

    # ── 2. Requests from the radio controller ───────────────
    if dance_pending:
        dance_pending = False
        celebrate_bone(token)
    elif stand_pending:
        stand_pending = False
        xgo.execution_action(xgo.action_enum.STAND)

    # ── 3. Wall detection (first check while searching) ────
    # sonar returns 0 when no echo is received (out of range)
    # so we only act on readings > 0
    elif state == 1 and 0 < sonar_cm < WALL_CM:
        avoid_wall(token)

    # ── 4. Bone detection ───────────────────────────────────
    elif state == 1 and mag_strength > BONE_THRESHOLD:
        celebrate_bone(token)

    # ── 5. Normal search behaviour ──────────────────────────
    elif state == 1:
        do_search_step(token)

    basic.pause(20)

basic.forever(on_forever)
