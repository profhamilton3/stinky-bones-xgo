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
#
# ── STATE MACHINE ──────────────────────────────────────────
# IDLE        = 0   Sitting, waiting for a command
# SEARCHING   = 1   Actively hunting for stinky bones
# CELEBRATING = 2   Found a bone — doing victory dance
# AVOIDING    = 3   Obstacle detected — backing up and turning
#
# ── DATA BROADCAST (to stinky-bones-datacollector) ─────────
# Every LOG_INTERVAL_MS the dog broadcasts a 16-byte buffer:
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

# How often the dog broadcasts sensor data over radio.
LOG_INTERVAL_MS = 3000

# Number of forward-crawl steps before a full sniff-pause.
# Higher = more ground covered per sniff cycle.
SEARCH_STEPS = 4


# ────────────────────────────────────────────────────────────
# STATE VARIABLES  (do not change these initial values)
# ────────────────────────────────────────────────────────────
state = 0              # current state
searching = False      # True while the dog should be searching
clap_count = 0         # counts rapid loud sounds
clap_time = 0          # timestamp of the first clap in a window
search_step = 0        # position within the crawl-sniff cycle
bone_count = 0         # total bones found this session
last_log_time = 0      # timestamp of the last radio broadcast

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

def start_searching():
    """Transition to SEARCHING state: stand up and begin hunt."""
    global state, searching, search_step
    state = 1
    searching = True
    search_step = 0
    basic.show_icon(IconNames.HAPPY)
    xgo.execution_action(xgo.action_enum.STAND)
    basic.pause(500)


def stop_searching():
    """Transition to IDLE state: sit and wait."""
    global state, searching
    state = 0
    searching = False
    xgo.execution_action(xgo.action_enum.SIT_DOWN)
    basic.show_icon(IconNames.ASLEEP)


def celebrate_bone():
    """Play victory sequence when a Stinky Bone is detected."""
    global state, bone_count
    state = 2
    bone_count += 1

    # Victory sound (plays in background while dog moves)
    music.play(
        music.builtin_playable_sound_effect(soundExpression.happy),
        music.PlaybackMode.IN_BACKGROUND
    )
    basic.show_icon(IconNames.YES)
    basic.pause(300)

    # Sit first to signal "found something"
    xgo.execution_action(xgo.action_enum.SIT_DOWN)
    basic.pause(600)

    # Victory dance sequence
    xgo.execution_action(xgo.action_enum.TWIRL_ROLL)
    basic.pause(1400)
    xgo.execution_action(xgo.action_enum.SUR_PLACE)
    basic.pause(1400)
    xgo.execution_action(xgo.action_enum.TRIAXIAL_ROTATION)
    basic.pause(1400)
    xgo.execution_action(xgo.action_enum.STRETCH_ONESELF)
    basic.pause(800)
    xgo.execution_action(xgo.action_enum.STAND)
    basic.pause(400)

    # Display total bone count on LED matrix
    basic.show_number(bone_count)
    basic.pause(1200)
    basic.clear_screen()

    # Resume previous activity
    if searching:
        state = 1
        basic.show_icon(IconNames.HAPPY)
    else:
        state = 0
        basic.show_icon(IconNames.ASLEEP)


def avoid_wall():
    """Back up and turn when the sonar detects an obstacle."""
    global state
    prior_state = state
    state = 3
    basic.show_icon(IconNames.NO)

    # Back up
    xgo.move_xgo(xgo.direction_enum.BACKWARD, 40)
    basic.pause(900)

    # Turn right to find an open path
    xgo.move_xgo(xgo.direction_enum.RIGHT, 40)
    basic.pause(700)

    xgo.execution_action(xgo.action_enum.STAND)
    basic.clear_screen()

    # Restore prior state
    state = prior_state
    if searching:
        basic.show_icon(IconNames.HAPPY)


def do_search_step():
    """One step of the crawl-then-sniff search pattern.

    The dog crawls forward SEARCH_STEPS times, then on the
    next call it crouches (SQUAT) and lowers its head
    (LOOKING_FOR_FOOD) to bring the magnetometer closer to
    the ground where bones might be hiding.
    """
    global search_step
    if search_step < SEARCH_STEPS:
        # Crawl forward one step
        xgo.execution_action(xgo.action_enum.CRAWL_FORWARD)
        basic.pause(900)
        search_step += 1
    else:
        # Sniff cycle: lower body, sweep head, rise again
        search_step = 0
        xgo.execution_action(xgo.action_enum.SQUAT)
        basic.pause(700)
        xgo.execution_action(xgo.action_enum.LOOKING_FOR_FOOD)
        basic.pause(1000)
        xgo.execution_action(xgo.action_enum.STAND)
        basic.pause(400)


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


# Radio commands from the controller microbit
def on_radio_number(cmd: number):
    if cmd == 1:
        start_searching()
    elif cmd == 2:
        stop_searching()
    elif cmd == 3:
        xgo.execution_action(xgo.action_enum.STAND)
    elif cmd == 4:
        # Force a victory dance (useful for testing lesson demos)
        celebrate_bone()
    elif cmd == 5:
        xgo.move_xgo(xgo.direction_enum.FORWARD, 50)
        basic.pause(1000)
    elif cmd == 6:
        xgo.move_xgo(xgo.direction_enum.LEFT, 50)
        basic.pause(700)
    elif cmd == 7:
        xgo.move_xgo(xgo.direction_enum.RIGHT, 50)
        basic.pause(700)
    elif cmd == 8:
        xgo.move_xgo(xgo.direction_enum.BACKWARD, 50)
        basic.pause(1000)
radio.on_received_number(on_radio_number)


# ────────────────────────────────────────────────────────────
# MAIN FOREVER LOOP
# ────────────────────────────────────────────────────────────

def on_forever():
    global mag_x, mag_y, mag_z, mag_strength
    global sonar_cm, last_log_time

    # ── 1. Read all sensors ─────────────────────────────────
    mag_x = input.magnetic_force(Dimension.X)
    mag_y = input.magnetic_force(Dimension.Y)
    mag_z = input.magnetic_force(Dimension.Z)
    mag_strength = input.magnetic_force(Dimension.STRENGTH)
    sonar_cm = sonarbit.sonarbit_distance(Distance_Unit.Distance_Unit_cm, DigitalPin.P0)

    # ── 2. Wall detection (highest priority) ────────────────
    # sonar returns 0 when no echo is received (out of range)
    # so we only act on readings > 0
    if state == 1 and 0 < sonar_cm < WALL_CM:
        avoid_wall()

    # ── 3. Bone detection ───────────────────────────────────
    elif state == 1 and mag_strength > BONE_THRESHOLD:
        celebrate_bone()

    # ── 4. Normal search behaviour ──────────────────────────
    elif state == 1:
        do_search_step()

    # ── 5. Periodic sensor data broadcast ───────────────────
    now = input.running_time()
    if now - last_log_time > LOG_INTERVAL_MS:
        last_log_time = now
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

    basic.pause(100)

basic.forever(on_forever)
