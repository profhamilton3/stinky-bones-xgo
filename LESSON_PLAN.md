# Stinky Bones — Coding Curriculum
### THE Hamilton Essentials Foundation | STEAM Coding Course

> **"Stinky Bones"** is a project-based coding course for youth and young adults.
> Students program a real robot dog — the Elecfreaks XGO — to hunt for magnetic
> "bones" hidden around the room. Along the way they learn Python, algorithm
> design, sensor science, and data analysis using the Microsoft MakeCode platform.

---

## Course Overview

| Duration | 12 sessions (~60–90 min each) |
|---|---|
| Language | Python (MakeCode micro:bit Python) |
| Platform | [makecode.microbit.org](https://makecode.microbit.org) |
| Hardware | micro:bit v2, XGO Gen 1 robot dog, RingBit board, HC-SR04 sonar |
| Prerequisites | None — designed for absolute beginners |
| Audience | Youth and young adults (ages 12–22) |

---

## Learning Objectives

By the end of this course students will be able to:

- Write Python programs using variables, functions, conditionals, and loops
- Load, run, and debug code in the MakeCode online editor
- Read physical sensor data (magnetometer, accelerometer, microphone, sonar)
- Design algorithms using pseudocode and flowcharts
- Build and test a state machine (IDLE → SEARCHING → CELEBRATING → AVOIDING)
- Send and receive data over radio between two micro:bits
- Log sensor data and analyse it to improve their program
- Explain how the XGO robot dog's body and serial protocol work

---

## Session Index

| # | Lesson | Key Concepts |
|---|---|---|
| 0 | [Project Overview](lessons/00-project-overview.md) | What we're building, hardware tour, goals |
| 1 | [Python Basics](lessons/01-python-basics.md) | Variables, functions, `if`, `for`, `while` |
| 2 | [The MakeCode Editor](lessons/02-makecode-editor.md) | Python tab, flashing, serial console, debugging |
| 3 | [micro:bit v2 Hardware](lessons/03-microbit-v2-hardware.md) | Sensors, pins, LEDs, buttons, radio |
| 4 | [Algorithm Design](lessons/04-algorithm-design.md) | Pseudocode, flowcharts, the search algorithm |
| 5 | [Magnetometer Sensing](lessons/05-magnetometer-sensing.md) | Magnetic fields, calibration, threshold tuning |
| 6 | [Sound & Clap Detection](lessons/06-sound-clap-detection.md) | Microphone, events, double-clap toggle |
| 7 | [Buttons & State Machines](lessons/07-buttons-state-machine.md) | Event handlers, states, transitions |
| 8 | [XGO Robot Actions](lessons/08-xgo-actions.md) | XGO serial protocol, action API, custom routines |
| 9 | [Sensing Walls](lessons/09-sonar-walls.md) | Sonar physics, distance measurement, obstacle avoidance |
| 10 | [Radio Controller](lessons/10-radio-controller.md) | Radio groups, send/receive, tilt steering |
| 11 | [Data Logging & Analysis](lessons/11-data-logging.md) | Datalogger, CSV, feedback loop, threshold tuning |

---

## Materials Per Student / Pair

- 1× micro:bit v2 (mounted on XGO dog)
- 1× micro:bit v2 (handheld controller)
- 1× micro:bit v2 (optional — data collector)
- 1× Elecfreaks XGO Gen 1 kit
- 1× RingBit expansion board
- 1× HC-SR04 ultrasonic sensor
- 2–4× small neodymium disc magnets ("Stinky Bones")
- USB cables, laptop/Chromebook with browser access
- Tape, LEGO bricks, M3 screws for assembly

---

## Facilitation Notes

**Session pacing:** Each lesson is written as a self-contained unit. You can
expand any session to two meetings if students need more time. Sessions 4–5 are
the conceptual core; do not skip them.

**Pair programming:** Students work best in pairs — one drives (types), one
navigates (guides). Rotate roles each session.

**Testing cadence:** Every session ends with a flash-and-test. Students should
see physical robot behaviour, not just working code on screen.

**Calibration is a lesson:** The BONE_THRESHOLD and WALL_CM constants will need
tuning per environment. Turn this into a science experiment — have students
hypothesise, measure, adjust, and record results.

**Extension challenges** are included at the end of each lesson for advanced
students who finish early.

---

*THE Hamilton Essentials Foundation, Inc. — Creative mental health through the arts, leadership, and STEAM for transitional youth.*
