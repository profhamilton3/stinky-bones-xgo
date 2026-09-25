# Lesson 8 — XGO Robot Actions
### Stinky Bones | THE Hamilton Essentials Foundation

---

## Learning Objectives

- Explain how the micro:bit communicates with the XGO dog over serial
- List and describe all available XGO Gen 1 actions
- Call `xgo.execution_action()`, `xgo.move_xgo()` and `xgo.rotate()` correctly
- Explain why every move must be stopped by setting its speed back to 0
- Design a custom victory dance sequence
- Explain why `basic.pause()` is needed between XGO commands

---

## How the XGO Dog Works

The XGO Gen 1 is controlled by a small computer inside the dog body.
The micro:bit communicates with it through a **serial (UART) connection** —
a simple two-wire protocol where one wire sends data (TX) and one receives (RX).

```
micro:bit P2 (TX) ─────────────────► XGO controller RX
micro:bit P1 (RX) ◄───────────────── XGO controller TX
```

The XGO library translates Python function calls into serial byte sequences
that the XGO controller understands. The micro:bit is essentially a "remote
brain" sitting on top of the dog body.

### Initialisation

Before any XGO commands can work, you must initialise the serial connection:

```python
xgo.init_xgo_serial(SerialPin.P2, SerialPin.P1)
```

This tells the XGO library: "TX is on P2, RX is on P1."
Call this once, near the start of your program.

---

## Available Actions

These are all the preset actions in `xgo.action_enum` for the Gen 1 XGO:

| Action enum | What the dog does |
|---|---|
| `STAND` | Stands at default height |
| `SIT_DOWN` | Lowers body and sits |
| `SQUAT` | Crouches low to the ground |
| `DEFAULT_POSTURE` | Returns to neutral standing pose |
| `CRAWL_FORWARD` | Crawls forward with body low |
| `LOOKING_FOR_FOOD` | Lowers head and sweeps forward |
| `TWIRL_ROLL` | Spins body in a roll twirl |
| `SUR_PLACE` | Trots in place (marching) |
| `TRIAXIAL_ROTATION` | Rotates body on all three axes |
| `STRETCH_ONESELF` | Stretches like a waking dog |
| `REQUEST_FEEDING` | Sits up and begs (paws up) |

```python
xgo.execution_action(xgo.action_enum.STAND)
xgo.execution_action(xgo.action_enum.CRAWL_FORWARD)
xgo.execution_action(xgo.action_enum.TWIRL_ROLL)
```

---

## Movement Commands

For continuous movement (walking, turning) use `xgo.move_xgo()` and
`xgo.rotate()`:

```python
# Parameters: direction, speed (0-100)
xgo.move_xgo(xgo.direction_enum.FORWARD, 50)    # walk forward at 50%
xgo.move_xgo(xgo.direction_enum.BACKWARD, 40)   # walk backward at 40%
xgo.move_xgo(xgo.direction_enum.LEFT, 50)       # step SIDEWAYS to the left
xgo.move_xgo(xgo.direction_enum.RIGHT, 50)      # step SIDEWAYS to the right

xgo.rotate(xgo.rotate_enum.LEFT, 50)            # turn on the spot, to the left
xgo.rotate(xgo.rotate_enum.RIGHT, 50)           # turn on the spot, to the right
```

### LEFT and RIGHT: strafe vs turn

Watch out — `move_xgo(LEFT)` does **not** turn the dog! It makes the dog
**strafe**: it shuffles sideways like a crab while still facing the same
way. To make the dog change the direction it is *facing*, use
`xgo.rotate()`.

Inside the pxt-xgo library (v1.3.9) these are two different settings on
the XGO controller:

| Command | XGO register | What changes |
|---|---|---|
| `move_xgo(FORWARD / BACKWARD, speed)` | 0x30 | forward / back speed |
| `move_xgo(LEFT / RIGHT, speed)` | 0x31 | sideways (strafe) speed |
| `rotate(LEFT / RIGHT, speed)` | 0x32 | turning speed |

A **register** is a numbered memory slot on the XGO's own computer. Each
command just writes a new number into one slot.

### Moves never stop on their own

Here is the most important rule of XGO movement: `move_xgo()` and
`rotate()` only **set a speed**. The dog keeps walking at that speed until
you set it back to **0** — even if your program has moved on to something
else. Think of it like pressing a car's accelerator: letting go of the
steering wheel doesn't put the brakes on.

So every move follows the same three-step pattern — **go, wait, stop**:

```python
xgo.move_xgo(xgo.direction_enum.FORWARD, 50)
basic.pause(2000)                               # walk forward for 2 seconds
xgo.move_xgo(xgo.direction_enum.FORWARD, 0)     # stop walking forward

xgo.rotate(xgo.rotate_enum.RIGHT, 40)
basic.pause(1200)                               # turn right for 1.2 seconds
xgo.rotate(xgo.rotate_enum.RIGHT, 0)            # stop turning
```

Because the three speeds live in three separate registers, stopping one
does **not** stop the others. `main.py` has a helper that zeroes all three
at once, used whenever the dog must stop no matter what it was doing:

```python
def stop_motion():
    global manual_until
    manual_until = 0
    xgo.move_xgo(xgo.direction_enum.FORWARD, 0)   # forward / back
    xgo.move_xgo(xgo.direction_enum.LEFT, 0)      # sideways
    xgo.rotate(xgo.rotate_enum.LEFT, 0)           # turning
```

(`manual_until` belongs to the radio joystick moves — see Lesson 10.)

---

## Why `basic.pause()` is Required

The XGO controller is a separate computer. When you send a command, it starts
executing that command. If you immediately send another command, the first one
is interrupted — the dog starts moving, then immediately gets a new command
before the motion is complete. This causes jerky, unpredictable behaviour.

`basic.pause(ms)` tells the micro:bit to wait the specified time before
continuing. This gives the XGO time to complete each motion.

Typical timing:
- Action animations (TWIRL_ROLL, etc.): pause 1000–1500 ms
- Short walking steps (`move_xgo` then stop): pause 300–1000 ms
- Stand/sit transitions: pause 400–600 ms

---

## The Walk-and-Sniff Search Pattern

The search pattern in `main.py` mixes short walking steps with actions:

```python
def do_search_step(token: number):
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
        xgo.execution_action(xgo.action_enum.SQUAT)       # crouch low
        basic.pause(700)
        if not is_current(token):
            return
        if bone_here():
            celebrate_bone(token)
            return
        xgo.execution_action(xgo.action_enum.LOOKING_FOR_FOOD)  # sweep head
        basic.pause(1000)
        if not is_current(token):
            return
        if bone_here():
            celebrate_bone(token)
            return
        xgo.execution_action(xgo.action_enum.STAND)        # rise back up
        basic.pause(400)
```

Each step walks for only `STEP_MS` (400 ms) and then **stops**. After every
short step the forever loop runs again, so the sonar and magnetometer are
checked roughly every half a second — the dog can't march blindly into a
wall.

**What is `token`?** Every time Start or Stop is pressed, `main.py` adds 1
to a counter called `run_id`. When a routine begins, it is handed the
current `run_id` as its `token`. After each `basic.pause()` it asks
`is_current(token)` — "has anyone pressed Start or Stop since I began?"
If they have, the routine gives up straight away *without* moving the dog
again. This is called **cancellation**, and it is how the Stop button can
interrupt a routine that is half-way through a pause. (Notice the step
only sends the "stop walking" command if the token is still current — if
Stop was pressed, `stop_motion()` has already stopped everything.)

**SQUAT** brings the dog's underside (and magnetometer) as close to the
ground as possible. **LOOKING_FOR_FOOD** sweeps the head — maximising the
area the magnetometer covers during the sniff.

---

## Designing Your Own Victory Dance

The victory dance in `celebrate_bone(token)` can be customised. Here is the
current sequence (the `is_current(token)` checks between moves are left
out to keep it short):

```python
xgo.execution_action(xgo.action_enum.SIT_DOWN)         # 600ms
xgo.execution_action(xgo.action_enum.STRETCH_ONESELF)  # 800ms
xgo.execution_action(xgo.action_enum.STAND)            # 400ms
```

Other actions you could add: `TWIRL_ROLL`, `SUR_PLACE` and
`TRIAXIAL_ROTATION` (about 1400ms each). Remember to put
`if not is_current(token): return` after each pause, so Stop can still
interrupt your dance.

### Design Exercise

On paper, design your own 6-step victory dance:
- List the 6 actions in order
- Estimate a pause duration for each
- Give your dance a name
- Explain what emotion or story your dance expresses

Then code it up and flash it to the dog. Use radio command 4 from the
controller to trigger the dance for testing without needing to find a bone.

---

## Exercises

### Exercise 1 — Action Explorer
Write a program that cycles through all available actions when button A is
pressed. Display the action number on the LED matrix. This gives you a
reference for what each action looks like on the physical dog.

### Exercise 2 — Greeting Routine
Write a `greet()` function that the dog performs when the program first starts.
It should last about 5 seconds and use at least 3 different actions.

### Exercise 3 — Timing Comparison
Vary `STEP_MS` (the length of one search step) between 400ms, 800ms, and 1200ms.
Observe how far the dog travels in each case. Make a table:

| STEP_MS | Approximate distance traveled |
|---|---|
| 400 | |
| 800 | |
| 1200 | |

Longer steps cover ground faster — but what happens to how often the sonar
gets checked?

### Exercise 4 — Strafe or Turn?
Send `xgo.move_xgo(xgo.direction_enum.LEFT, 40)` for 1 second (then stop
it with speed 0). Then send `xgo.rotate(xgo.rotate_enum.LEFT, 40)` for
1 second (then stop it). Describe the difference. Which one would help the
dog get away from a wall it is facing?

---

## Discussion Questions

1. What would happen if you called `xgo.init_xgo_serial()` twice?
2. Why can't the dog dance and check for bones at the same time?
   (Hint: think about the state machine and blocking vs non-blocking code)
3. How would you program the dog to do DIFFERENT dances for the 1st, 2nd,
   and 3rd bone it finds?

---

## Extension

Research the **UART serial protocol**. What do baud rate, start bits, stop
bits, and parity mean? What baud rate does the XGO library use? (Look at the
pxt-xgo GitHub repository source code to find out.) Why does baud rate matter
for reliability?
