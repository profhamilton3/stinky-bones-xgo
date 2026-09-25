# Lesson 9 — Sensing Walls
### Stinky Bones | THE Hamilton Essentials Foundation

---

## Learning Objectives

- Explain how ultrasonic sonar measures distance
- Wire the HC-SR04 to the RingBit P0 connector post
- Call `sonarbit.sonarbit_distance()` and interpret its return value
- Implement wall-avoidance behaviour with backup and rotate
- Describe a strategy for mapping arena boundaries without sonar

---

## How Ultrasonic Sonar Works

The **HC-SR04** is an ultrasonic distance sensor. It works like a bat's
echolocation:

1. **Trigger:** The sensor emits a burst of ultrasonic sound (40 kHz — too
   high to hear) for 10 microseconds
2. **Travel:** The sound pulse travels outward at ~343 m/s (the speed of sound)
3. **Echo:** When the pulse hits an object, it bounces back
4. **Measure:** The sensor measures the time from send to receive
5. **Calculate:** `distance = (time × speed_of_sound) / 2`
   (divided by 2 because the sound travels to the object AND back)

The HC-SR04 can detect objects from **2 cm to 4 metres** away.

```
HC-SR04
 ┌────────────────────┐
 │  ( TRIG ) ( ECHO ) │
 └────────────────────┘
       │          │
  Sends pulse  Listens for echo
       │          │
       └──────────┘
           │
         P0 (on RingBit)
```

---

## Wiring the HC-SR04

The HC-SR04 has 4 pins: VCC, GND, TRIG, ECHO.

Standard HC-SR04 uses 5V, but the HC-SR04P variant works at 3.3V
(safe for micro:bit). Check your sensor before wiring.

**Single-wire wiring (for P0):**

```
HC-SR04 VCC  ──── micro:bit 3V   (3.3V rail)
HC-SR04 GND  ──── RingBit GND
HC-SR04 TRIG ──┬─ 470Ω ──── RingBit P0
HC-SR04 ECHO ──┘
```

The 470 Ω resistor protects the micro:bit pin when TRIG drives high while
ECHO is also connected to the same pin. The sonarbit extension handles the
timing automatically.

> **Alternative:** Use the Elecfreaks Sonar:bit breakout board, which has
> a built-in connector for the micro:bit and handles the resistor internally.

---

## The sonarbit API

```python
# Returns distance in centimetres (0 if no echo / out of range)
distance = sonarbit.sonarbit_distance(Distance_Unit.Distance_Unit_cm, DigitalPin.P0)

# Or in millimetres / inches
distance = sonarbit.sonarbit_distance(Distance_Unit.Distance_Unit_mm, DigitalPin.P0)
distance = sonarbit.sonarbit_distance(Distance_Unit.Distance_Unit_inch, DigitalPin.P0)
```

**Important:** `sonarbit_distance()` returns `0` when no echo is received within
the timeout period. Always check `sonar_cm > 0` before acting on the reading:

```python
if state == 1 and 0 < sonar_cm < WALL_CM:
    avoid_wall(token)
```

Without the `> 0` check, an out-of-range reading (0) would trigger
wall avoidance every time nothing is detected — the opposite of what we want.

---

## Wall Avoidance Behaviour

When the sonar detects an obstacle within `WALL_CM` centimetres, the dog:
1. Switches to the AVOIDING state and shows an ✗ on the LEDs
2. Backs up for `AVOID_BACK_MS` (900ms), then stops backing up
3. Rotates right on the spot for `AVOID_TURN_MS` (1200ms), then stops turning
4. Goes back to SEARCHING

```python
def avoid_wall(token: number):
    """Back up and rotate when the sonar detects an obstacle."""
    global state
    if not is_current(token):
        return
    state = 3                  # AVOIDING
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
```

### Reading the code line by line

**`token` and `is_current(token)`** — Every press of Start or Stop adds 1
to a counter called `run_id`. The forever loop hands `avoid_wall` the
value of `run_id` at the moment it started; that value is the `token`.
`is_current(token)` simply checks `token == run_id`. If they no longer
match, someone pressed Start or Stop while the dog was busy, so the
routine quits with `return` — and, importantly, sends **no more** move
commands. Imagine a relay race where each runner carries a numbered
baton: if the coach hands out a new number, anyone holding the old one
stops running.

**Why check after every `basic.pause()`?** A pause is where the program
sits and waits, and waiting is exactly when a button press can sneak in.
Checking right after each pause means Stop takes effect within one step,
instead of the dog finishing the whole backup-and-turn first.

**`move_xgo(FORWARD, 0)` after backing up** — `move_xgo` only *sets a speed*;
the dog would keep reversing forever if we never set it back to zero.
Forward and backward share one speed, so setting FORWARD to 0 also stops
the backward walk.

**`xgo.rotate(RIGHT, ...)`, not `move_xgo(RIGHT, ...)`** — `move_xgo(RIGHT)`
would make the dog *strafe* (shuffle sideways, still facing the wall).
`rotate` actually turns the dog so it faces a new direction. Again we
finish with speed 0, because turning is its own separate speed.

**`state = 1` at the end** — `avoid_wall` only ever runs while the dog is
searching (the forever loop checks `state == 1` first). If the user
pressed Stop part-way through, the routine already quit at one of the
`is_current` checks, so reaching the last lines means the dog should
carry on searching. That's why we no longer need to save and restore a
`prior_state`.

**Tuning** — `AVOID_SPEED`, `AVOID_BACK_MS` and `AVOID_TURN_MS` live at the
top of `main.py`. If the dog doesn't turn far enough to clear the wall,
raise `AVOID_TURN_MS`.

**Always turn RIGHT.** If the dog always turns the same direction when
it hits a wall, it will eventually follow the perimeter of the arena
in a predictable spiral — a classic robotic wall-following strategy.

---

## Arena Coverage Without Sonar

Before the sonar is attached, the dog can still avoid getting stuck against
walls by sensing its own movement:

### Accelerometer Wall Sensing

When the dog walks into a wall, the XGO's legs stall. The dog's body starts
to tilt or vibrate as it tries to push through. The accelerometer detects
this as an unusual acceleration spike:

```python
def is_stuck():
    # Large sudden acceleration change suggests the dog hit something
    ax = abs(input.acceleration(Dimension.X))
    ay = abs(input.acceleration(Dimension.Y))
    return ax > 800 or ay > 800   # tune this threshold

def on_forever():
    token = run_id
    if state == 1 and is_stuck():
        avoid_wall(token)
```

This is less reliable than sonar but requires no additional hardware.
Use it as a backup or in the early lessons before attaching the sensor.

### Timed Turns

The simplest strategy: turn a random amount after every N steps.

```python
import random
# After each sniff cycle, turn a random amount
angle = random.randint(20, 90)
xgo.rotate(xgo.rotate_enum.RIGHT, 50)
basic.pause(angle * 10)   # rough estimate: 10ms per degree
xgo.rotate(xgo.rotate_enum.RIGHT, 0)   # stop turning!
```

This gives erratic coverage but prevents the dog from getting stuck
walking in a straight line forever.

---

## WALL_CM Tuning

The default `WALL_CM = 15`. Adjust based on your arena:

| WALL_CM | Effect |
|---|---|
| 5 | Dog gets very close before turning — may bump |
| 15 | Default — 15 cm clearance (recommended) |
| 30 | Turns early — leaves large gaps near walls |

If the dog turns too frequently in the middle of the arena (false wall
detections from other students or objects), raise WALL_CM or add
an averaging filter:

```python
# Take 3 readings and use the average to reduce false positives
readings = [sonarbit.sonarbit_distance(Distance_Unit.Distance_Unit_cm, DigitalPin.P0) for _ in range(3)]
valid = [r for r in readings if r > 0]
sonar_cm = sum(valid) // len(valid) if valid else 0
```

---

## Exercises

### Exercise 1 — Sonar Scope
Flash this test program and map how the sensor responds to objects:

```python
def on_forever():
    d = sonarbit.sonarbit_distance(Distance_Unit.Distance_Unit_cm, DigitalPin.P0)
    print("distance:", d, "cm")
    basic.pause(200)
basic.forever(on_forever)
```

Hold objects at 5, 10, 20, 50 cm. Record the readings. What is the maximum
reliable range of your sensor?

### Exercise 2 — Left or Right?
Modify `avoid_wall(token)` to randomly choose between
`xgo.rotate_enum.LEFT` and `xgo.rotate_enum.RIGHT`. Does the dog cover the arena more evenly? Why or why not?

### Exercise 3 — Obstacle Map
Using the radio data from the datacollector, write a spreadsheet formula
that highlights rows where `sonar_cm < 15`. How many wall-avoidance events
happened in a 3-minute run? Where in the arena did most of them occur?

---

## Discussion Questions

1. The sonar points forward. What if a bone is hidden under a chair leg
   directly to the side? How could you add side-sensing?
2. The speed of sound changes with temperature (faster when warmer).
   Does this matter at room temperature for a 15 cm threshold? Calculate.
3. Why does `sonarbit_distance()` return 0 instead of a very large number when
   no echo is received?

---

## Extension

Research **LiDAR** (Light Detection And Ranging). Self-driving cars use
LiDAR instead of ultrasonic sonar. What are the advantages of LiDAR over
ultrasonic? What are the disadvantages? Could you use LiDAR with a micro:bit?
(Research: RPLIDAR A1 and its micro:bit compatibility)
