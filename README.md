# Stinky Bones — XGO Dog

> **THE Hamilton Essentials Foundation** | STEAM Coding Curriculum

A micro:bit v2 Python project that turns the Elecfreaks XGO Gen 1 robot dog into
a magnetic "bone hunter." The dog crawls around an arena, crouches to sniff the
ground with its magnetometer, celebrates when it finds a magnet ("Stinky Bone"),
and avoids walls detected by an ultrasonic sonar sensor.

This repository is part of a three-project set:

| Repository | Purpose |
|---|---|
| **stinky-bones-xgo** (this repo) | XGO dog receiver + brain |
| `stinky-bones-controller` | Handheld radio controller |
| `stinky-bones-datacollector` | Sensor data logger |

---

## Hardware Required

| Qty | Part |
|---|---|
| 1 | micro:bit v2 |
| 1 | Elecfreaks XGO Gen 1 robot dog kit |
| 1 | Elecfreaks RingBit expansion board (mounted on dog body) |
| 1 | HC-SR04 ultrasonic sensor |
| 1 | 470 Ω resistor (for single-wire sonar wiring) |
| — | LEGO bricks + M3 screws (to mount RingBit on XGO body) |
| 2–4 | Small disc neodymium magnets ("Stinky Bones") |

---

## Wiring

The RingBit board is mounted on the XGO dog body and provides
three labelled connector posts: **P0**, **P1**, **P2**, and **GND**.

```
RingBit P2  ──────────────────►  XGO kit RX   (micro:bit sends commands)
RingBit P1  ◄──────────────────  XGO kit TX   (micro:bit hears replies)
RingBit GND ──────────────────   XGO kit GND

HC-SR04 VCC  ─── 3.3V (micro:bit 3V pin)
HC-SR04 GND  ─── RingBit GND
HC-SR04 TRIG ─┬─ 470Ω ─── RingBit P0
HC-SR04 ECHO ─┘          (TRIG and ECHO share P0)
```

> **Note:** TX always goes to RX. The code calls
> `xgo.init_xgo_serial(SerialPin.P2, SerialPin.P1)`, which makes P2 the
> micro:bit's transmit pin and P1 its receive pin. If P2 is wired to the XGO's
> TX instead, the dog ignores every command without showing an error.
>
> **Note:** The 470 Ω resistor between TRIG and P0 protects the micro:bit when
> TRIG drives high while ECHO is also connected. Alternatively, use the
> Elecfreaks Sonar:bit board which handles this internally.

---

## Loading in MakeCode

1. Go to [makecode.microbit.org](https://makecode.microbit.org)
2. Click **Import** → **Import URL**
3. Paste: `https://github.com/profhamilton3/stinky-bones-xgo`
4. The editor will automatically install the XGO and sonarbit extensions
5. Click the **Python** tab to view and edit the code
6. Click **Download** and drag the `.hex` file onto the MICROBIT drive

---

## Controls

| Input | Action |
|---|---|
| Button A | Start searching for bones |
| Button B | Stop and sit (cancels whatever the dog is doing) |
| Double clap | Toggle search on / off |
| Radio cmd 1 | Start searching (from controller) |
| Radio cmd 2 | Stop (from controller) |
| Radio cmd 3 | Stand up (idle only) |
| Radio cmd 4 | Force victory dance (testing) |
| Radio cmd 5–8 | Forward / turn left / turn right / backward (idle only; keeps moving while the joystick is held, stops about 1 s after release) |

---

## Calibration

Open `main.py` and adjust these constants at the top of the file:

```python
BONE_THRESHOLD = 200   # raise if false positives; lower if dog misses bones
WALL_CM = 15           # raise to turn sooner; lower to let dog get closer
SOUND_THRESH = 80      # lower = more sensitive clap detection
SEARCH_STEPS = 10      # more steps = larger area swept before each sniff
STEP_MS = 400          # length of each short search step (sensors checked between steps)
AVOID_TURN_MS = 1200   # raise if the dog does not turn far enough away from a wall
```

To find your BONE_THRESHOLD:

The serial console can't be used for this. `xgo.init_xgo_serial` moves the
micro:bit's serial port to P1/P2 so it can talk to the dog, so nothing reaches
the USB serial console. Measure the field with a short separate program instead:

1. In a new MakeCode project, add this to the Python tab and flash it:
   ```python
   def on_forever():
       basic.show_number(input.magnetic_force(Dimension.STRENGTH))
   basic.forever(on_forever)
   ```
   If the micro:bit asks you to "tilt to fill the screen", do that first —
   it is the compass calibration.
2. With the micro:bit mounted on the dog, note the number shown with no magnet
   nearby (the resting field).
3. Hold a magnet under the dog's chest at the height it will pass over a bone,
   and note the number shown.
4. Set BONE_THRESHOLD to about 80% of the magnet reading. It must stay well
   above the resting field, or the dog will celebrate without finding a bone.
5. Flash the Stinky Bones project again.

---

## Lesson Plan

This project is taught as a 12-session coding course. See:

- [`LESSON_PLAN.md`](LESSON_PLAN.md) — course overview and session index
- [`lessons/`](lessons/) — individual lesson files with objectives, exercises, and code

---

## Project Architecture

```
stinky-bones-xgo/
├── pxt.json          MakeCode project config + extension dependencies
├── main.py           Main Python program (all dog logic lives here)
├── README.md         This file
├── LESSON_PLAN.md    Course overview
└── lessons/          12 lesson markdown files
```

---

## Extensions Used

| Extension | Source | Purpose |
|---|---|---|
| XGO | `github:elecfreaks/pxt-xgo#v1.3.9` | XGO Gen 1 serial control |
| sonarbit | `github:elecfreaks/pxt-sonarbit#V1.0.9` | HC-SR04 distance sensor |
| datalogger | built-in (`*`) | Sensor data logging to flash |
| radio | built-in (`*`) | Radio communication |
| microphone | built-in (`*`) | Clap / sound detection |

---

*THE Hamilton Essentials Foundation, Inc. — Creative mental health through the arts, leadership, and STEAM for transitional youth.*
