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
RingBit P1  ──────────────────►  XGO kit RX
RingBit P2  ──────────────────►  XGO kit TX
RingBit GND ──────────────────►  XGO kit GND

HC-SR04 VCC  ─── 3.3V (micro:bit 3V pin)
HC-SR04 GND  ─── RingBit GND
HC-SR04 TRIG ─┬─ 470Ω ─── RingBit P0
HC-SR04 ECHO ─┘          (TRIG and ECHO share P0)
```

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
| Button B | Stop and sit |
| Double clap | Toggle search on / off |
| Radio cmd 1 | Start searching (from controller) |
| Radio cmd 2 | Stop (from controller) |
| Radio cmd 3 | Stand up |
| Radio cmd 4 | Force victory dance (testing) |
| Radio cmd 5–7 | Forward / left / right (from controller) |

---

## Calibration

Open `main.py` and adjust these constants at the top of the file:

```python
BONE_THRESHOLD = 200   # raise if false positives; lower if dog misses bones
WALL_CM = 15           # raise to turn sooner; lower to let dog get closer
SOUND_THRESH = 80      # lower = more sensitive clap detection
SEARCH_STEPS = 4       # more steps = larger area swept before each sniff
```

To find your BONE_THRESHOLD:
1. Flash the code and open the MakeCode serial console
2. Hold a magnet under the dog's chest
3. Note the `mag_strength` value printed — set BONE_THRESHOLD to 80% of that value

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
