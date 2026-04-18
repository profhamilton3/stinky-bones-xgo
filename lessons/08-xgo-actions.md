# Lesson 8 — XGO Robot Actions
### Stinky Bones | THE Hamilton Essentials Foundation

---

## Learning Objectives

- Explain how the micro:bit communicates with the XGO dog over serial
- List and describe all available XGO Gen 1 actions
- Call `xgo.execution_action()` and `xgo.move_xgo()` correctly
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

For continuous movement (walking, turning) use `xgo.move_xgo()`:

```python
# Parameters: direction, speed (0-100)
xgo.move_xgo(xgo.direction_enum.FORWARD, 50)    # walk forward at 50%
xgo.move_xgo(xgo.direction_enum.BACKWARD, 40)   # walk backward at 40%
xgo.move_xgo(xgo.direction_enum.TURN_LEFT, 50)  # turn left at 50%
xgo.move_xgo(xgo.direction_enum.TURN_RIGHT, 50) # turn right at 50%
```

After sending a move command, use `basic.pause(ms)` to let the dog travel
for that many milliseconds before sending the next command:

```python
xgo.move_xgo(xgo.direction_enum.FORWARD, 50)
basic.pause(2000)    # walk forward for 2 seconds
xgo.execution_action(xgo.action_enum.STAND)
```

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
- Short movements (CRAWL_FORWARD): pause 800–1000 ms
- Stand/sit transitions: pause 400–600 ms

---

## The Crawl-and-Sniff Search Pattern

The search pattern in `main.py` uses actions deliberately:

```python
def do_search_step():
    global search_step
    if search_step < SEARCH_STEPS:
        # Crawl one step forward with body low to ground
        xgo.execution_action(xgo.action_enum.CRAWL_FORWARD)
        basic.pause(900)
        search_step += 1
    else:
        # Sniff cycle: lower body, sweep head, rise
        search_step = 0
        xgo.execution_action(xgo.action_enum.SQUAT)       # crouch low
        basic.pause(700)
        xgo.execution_action(xgo.action_enum.LOOKING_FOR_FOOD)  # sweep head
        basic.pause(1000)
        xgo.execution_action(xgo.action_enum.STAND)        # rise back up
        basic.pause(400)
```

**SQUAT** brings the dog's underside (and magnetometer) as close to the
ground as possible. **LOOKING_FOR_FOOD** sweeps the head — maximising the
area the magnetometer covers during the sniff.

---

## Designing Your Own Victory Dance

The victory dance in `celebrate_bone()` can be customised. Here is the
current sequence:

```python
xgo.execution_action(xgo.action_enum.SIT_DOWN)       # 600ms
xgo.execution_action(xgo.action_enum.TWIRL_ROLL)     # 1400ms
xgo.execution_action(xgo.action_enum.SUR_PLACE)      # 1400ms
xgo.execution_action(xgo.action_enum.TRIAXIAL_ROTATION) # 1400ms
xgo.execution_action(xgo.action_enum.STRETCH_ONESELF)  # 800ms
xgo.execution_action(xgo.action_enum.STAND)           # 400ms
```

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
Vary the `basic.pause()` after `CRAWL_FORWARD` between 400ms, 800ms, and 1200ms.
Observe how far the dog travels in each case. Make a table:

| Pause (ms) | Approximate distance traveled |
|---|---|
| 400 | |
| 800 | |
| 1200 | |

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
