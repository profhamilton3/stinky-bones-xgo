# Lesson 10 — Radio Controller with joystick:bit
### Stinky Bones | THE Hamilton Essentials Foundation

---

## Learning Objectives

- Describe the joystick:bit hardware and its connection to micro:bit
- Initialise the joystickbit extension and read analog X/Y axis values
- Register event handlers for the four joystick:bit action buttons
- Explain what a deadzone is and why it matters for analog input
- Implement rate-limited joystick steering over radio
- Use the vibration motor for haptic feedback
- Set radio groups to prevent interference between teams

---

## The Elecfreaks joystick:bit

The joystick:bit is an expansion board that plugs directly into the
micro:bit edge connector. It adds:

```
┌──────────────────────────────────────────┐
│                                          │
│   [P12]  ┌───────────┐  [P13]           │
│          │  JOYSTICK │                  │
│   [P14]  │   X / Y   │  [P15]           │
│          └───────────┘                  │
│                                          │
│              [VIBRATION MOTOR]           │
└──────────────────────────────────────────┘
       ↓ plugs into micro:bit edge connector
```

| Component | What it does |
|---|---|
| Analog thumbstick | Measures X and Y position (0–1023 each axis) |
| P12 button | Digital push button (event-driven) |
| P13 button | Digital push button (event-driven) |
| P14 button | Digital push button (event-driven) |
| P15 button | Digital push button (event-driven) |
| Vibration motor | Haptic feedback — short buzz on command |

The joystick:bit is the same controller used in your existing projects
`profhamilton3/mecanumcontroller` and `profhamilton3/joystickbit-rockervalues`.

---

## Extension Setup

Add the joystickbit extension to your `pxt.json`:

```json
"dependencies": {
    "core": "*",
    "radio": "*",
    "joystickbit": "github:tinkertanker/pxt-joystickbit#v1.0.3"
}
```

In MakeCode: click ⚙ → **Extensions** → search **joystickbit** → install.

---

## Initialisation

Always call `init_joystick_bit()` before using any other joystickbit API.
Then immediately read the center position — each physical unit rests
slightly off 512:

```python
joystickbit.init_joystick_bit()

# Capture the resting center position of this specific stick
joy_x_center = joystickbit.get_rocker_value(joystickbit.rockerType.X)
joy_y_center = joystickbit.get_rocker_value(joystickbit.rockerType.Y)
```

This pattern comes directly from `profhamilton3/mecanumcontroller`
(`pX0 = joystickbit.get_rocker_value(...)`).

---

## Reading the Joystick

```python
jx = joystickbit.get_rocker_value(joystickbit.rockerType.X)  # 0–1023
jy = joystickbit.get_rocker_value(joystickbit.rockerType.Y)  # 0–1023
```

The stick returns a value from 0 to 1023 on each axis. The center at rest
is approximately 512. Pushing the stick moves the reading toward 0 or 1023:

```
        Y = 1023 (push UP)
              │
X = 0 ────── 512 ────── X = 1023
(LEFT)        │           (RIGHT)
        Y = 0 (push DOWN)
```

From `profhamilton3/joystickbit-rockervalues`:

```python
# That project's thresholds for detecting a "push":
if jx <= 200:    # clearly pushed left
    pass
if jx >= 800:    # clearly pushed right
    pass
if jy <= 200:    # clearly pushed down
    pass
if jy >= 800:    # clearly pushed up
    pass
```

---

## The Deadzone

The region between 200 and 800 is the **deadzone** — the center zone where
we treat the stick as resting even if it drifts slightly. Without a deadzone,
tiny vibrations or manufacturing variation would cause constant accidental
commands.

```
 0    200                       800    1023
 |──────|───────── CENTER ────────|──────|
 LEFT  ←  deadzone (no command)  →  RIGHT
```

In our code:

```python
JOY_LO = 200    # threshold for left/down
JOY_HI = 800    # threshold for right/up

if jy >= JOY_HI:
    radio.send_number(5)    # forward
elif jy <= JOY_LO:
    radio.send_number(8)    # backward
elif jx <= JOY_LO:
    radio.send_number(6)    # turn left
elif jx >= JOY_HI:
    radio.send_number(7)    # turn right
# else: stick is in center zone — do nothing
```

---

## Action Buttons (P12–P15)

The four buttons use **event handlers** — the same pattern as micro:bit
buttons but with the joystickbit API:

```python
# joystickbit.on_button_event(PIN, EVENT_TYPE, HANDLER_FUNCTION)

def on_p12():
    radio.send_number(1)          # start searching
    basic.show_icon(IconNames.HAPPY)
joystickbit.on_button_event(
    joystickbit.JoystickBitPin.P12,
    joystickbit.ButtonType.DOWN,
    on_p12
)

def on_p13():
    radio.send_number(2)          # stop and sit
    basic.show_icon(IconNames.ASLEEP)
joystickbit.on_button_event(
    joystickbit.JoystickBitPin.P13,
    joystickbit.ButtonType.DOWN,
    on_p13
)

def on_p14():
    radio.send_number(3)          # stand up
    basic.show_icon(IconNames.YES)
joystickbit.on_button_event(
    joystickbit.JoystickBitPin.P14,
    joystickbit.ButtonType.DOWN,
    on_p14
)

def on_p15():
    radio.send_number(4)          # victory dance (testing)
    basic.show_icon(IconNames.DIAMOND)
joystickbit.on_button_event(
    joystickbit.JoystickBitPin.P15,
    joystickbit.ButtonType.DOWN,
    on_p15
)
```

`ButtonType.DOWN` fires when the button is pressed.
`ButtonType.UP` fires when it is released.

---

## Haptic Feedback with the Vibration Motor

```python
joystickbit.Vibration_Motor(60)    # buzz for 60 milliseconds
```

Haptic feedback tells the user their input was registered — essential
when looking at the dog, not the controller.

In Stinky Bones:
- Single 60ms buzz → action button pressed (command sent)
- Double 40ms buzz → telemetry packet received from the dog

```python
# Double buzz pattern
joystickbit.Vibration_Motor(40)
basic.pause(80)
joystickbit.Vibration_Motor(40)
```

---

## Rate Limiting

While the joystick is held pushed, the forever loop would send hundreds
of commands per second. The dog would stutter because each new command
interrupts the previous motion.

Solution: only send one command per `SEND_INTERVAL_MS` (400ms):

```python
SEND_INTERVAL_MS = 400
last_send_time = 0

def on_forever():
    global last_send_time
    now = input.running_time()
    if now - last_send_time < SEND_INTERVAL_MS:
        basic.pause(50)
        return      # skip this loop iteration

    jx = joystickbit.get_rocker_value(joystickbit.rockerType.X)
    jy = joystickbit.get_rocker_value(joystickbit.rockerType.Y)

    if jy >= JOY_HI:
        radio.send_number(5)
        last_send_time = now   # reset the timer after sending
    # ... etc
```

---

## Complete Radio Protocol (Group 3)

| Command | Source | Dog action |
|---|---|---|
| 1 | P12 button / Button A | Start searching |
| 2 | P13 button / Button B | Stop and sit |
| 3 | P14 button / Button A+B | Stand up |
| 4 | P15 button / Logo touch | Victory dance |
| 5 | Joystick UP | Move forward |
| 6 | Joystick LEFT | Turn left |
| 7 | Joystick RIGHT | Turn right |
| 8 | Joystick DOWN | Move backward |

The dog's radio handler (from Lesson 7 and `main.py`):

```python
def on_radio_number(cmd: number):
    if cmd == 1:   start_searching()
    elif cmd == 2: stop_searching()
    elif cmd == 3: xgo.execution_action(xgo.action_enum.STAND)
    elif cmd == 4: celebrate_bone()
    elif cmd == 5: xgo.move_xgo(xgo.direction_enum.FORWARD, 50); basic.pause(1000)
    elif cmd == 6: xgo.move_xgo(xgo.direction_enum.LEFT, 50); basic.pause(700)
    elif cmd == 7: xgo.move_xgo(xgo.direction_enum.RIGHT, 50); basic.pause(700)
    elif cmd == 8: xgo.move_xgo(xgo.direction_enum.BACKWARD, 50); basic.pause(1000)
radio.on_received_number(on_radio_number)
```

---

## Running Multiple Teams

If two or more teams run robots in the same room, each team needs a different
group number — otherwise controllers will steer the wrong dogs:

| Team | RADIO_GROUP |
|---|---|
| Team 1 | 3 |
| Team 2 | 4 |
| Team 3 | 5 |

Change `RADIO_GROUP` in all three microbits (controller, dog, collector)
to the same team number.

---

## Exercises

### Exercise 1 — Joystick Scope
Flash this test program to read and print joystick values:

```python
joystickbit.init_joystick_bit()

def on_forever():
    jx = joystickbit.get_rocker_value(joystickbit.rockerType.X)
    jy = joystickbit.get_rocker_value(joystickbit.rockerType.Y)
    print("X:", jx, "Y:", jy)
    basic.pause(100)
basic.forever(on_forever)
```

Open the serial console. Move the stick to all four extremes. Record
the minimum and maximum values you observe. Do they match JOY_LO / JOY_HI?
Adjust the constants if your stick behaves differently.

### Exercise 2 — Diagonal Movement
The current code checks Y before X. That means you can never send a
diagonal command. Design a new control scheme that combines X and Y
to send one of 8 directions (N, NE, E, SE, S, SW, W, NW). What XGO
command would NE and NW map to?

### Exercise 3 — Button Assignment Design
The current button assignment (P12=search, P13=stop, P14=stand, P15=dance)
is one choice. Design an alternative assignment that you think would feel
more natural to use. Justify each choice. Implement your design and test it.

### Exercise 4 — Vibration Patterns
Create a unique vibration pattern for each button:
- P12: one long buzz (200ms)
- P13: two short buzzes
- P14: three very short buzzes
- P15: one buzz + pause + one buzz

What is the maximum useful duration before it becomes annoying to users?

---

## Discussion Questions

1. The joystick values range from 0–1023 but we only use values < 200 and
   > 800. What is the resolution (precision) we are ignoring? Does it matter
   for this project?
2. Why do we call `init_joystick_bit()` before reading the center position,
   rather than using 512 as a fixed center?
3. The controller uses `basic.pause(200)` after each button press to show
   an icon. During that 200ms, could the joystick still send commands? Why
   or why not? (Hint: review how `basic.forever` and event handlers interact)
4. If the vibration motor uses the same pins as something else on the
   joystick:bit, when would calling `Vibration_Motor()` cause a conflict?

---

## Your Existing joystick:bit Projects

You have used the joystick:bit in earlier projects. Compare the patterns:

| Project | How joystick was used |
|---|---|
| `joystickbit-rockervalues` | X/Y axes to move a game sprite on LED matrix |
| `mecanumcontroller` | X/Y + 4 buttons to radio-control a mecanum car; deadzone with center tracking |
| `bt3controller` | 4 buttons + Bluetooth UART to control a Bluetooth device |
| `stinky-bones-controller` (this project) | X/Y + 4 buttons + haptics to radio-control XGO dog |

The `mecanumcontroller` deadzone pattern — capturing pX0/pY0 at startup and
comparing to both center and current position — is more robust than fixed
thresholds and is worth studying before building more advanced controllers.

---

## Extension

Research **analog stick drift** — the hardware problem where joysticks
report non-zero values even when at rest. This is the issue that caused
widespread Nintendo Switch Joy-Con lawsuits. How does the center-capture
pattern in `mecanumcontroller` partially compensate for drift? What would
a more complete software compensation look like? (Hint: look up
"joystick calibration dead-zone algorithm".)
