# Lesson 0 — Project Overview
### Stinky Bones | THE Hamilton Essentials Foundation

---

## Learning Objectives

By the end of this session students will be able to:

- Describe what the Stinky Bones project does in plain language
- Identify every piece of hardware and explain its role
- Navigate the three GitHub repositories in the project set
- State the three big questions the project answers with code

---

## The Story

> *Somewhere in the arena, hidden under cups or behind obstacles, there are
> magnetic "Stinky Bones." Your robot dog can smell them — not with a nose, but
> with a magnetometer. Your job: write the code that makes the dog hunt, find,
> and celebrate.*

This is a real robotics project. The XGO Gen 1 is a commercial robot dog made by
Elecfreaks. It responds to serial commands sent from a micro:bit over two wires.
We will program that micro:bit — in Python — to turn the dog into an autonomous
bone hunter.

---

## The Three Microbits

```
┌─────────────────────┐    radio     ┌──────────────────────┐
│  CONTROLLER         │ ──────────►  │  XGO DOG             │
│  stinky-bones-      │              │  stinky-bones-xgo    │
│  controller         │ ◄──────────  │                      │
│                     │  telemetry   │  micro:bit on body   │
│  (held in hand)     │              │  + RingBit + sonar   │
└─────────────────────┘              └──────────────────────┘
                                              │ radio (broadcast)
                                              ▼
                              ┌──────────────────────────┐
                              │  DATA COLLECTOR          │
                              │  stinky-bones-           │
                              │  datacollector           │
                              │  (sits on table, logs)   │
                              └──────────────────────────┘
```

---

## Hardware Tour

### micro:bit v2
A small computer the size of a credit card. It has:
- A 5×5 LED matrix (display)
- Two push buttons (A and B)
- A capacitive logo button (touch-sensitive)
- An accelerometer (measures tilt and shake)
- A magnetometer (measures magnetic fields — our "nose")
- A microphone (hears claps and sound)
- A built-in speaker
- A radio (talks to other microbits)
- 25 edge-connector pins (P0, P1, P2, 3V, GND + more)

### XGO Gen 1 Robot Dog
A quadruped (four-legged) robot dog. It receives movement and action commands
over a serial (UART) connection. The micro:bit talks to it through two pins:
- **P2 → TX** (micro:bit sends commands)
- **P1 → RX** (micro:bit listens for replies)

### RingBit Expansion Board
A breakout board that plugs into the micro:bit edge connector. In this project
it is mounted on the XGO dog body using LEGO bricks and screws. It provides
labelled connector posts for P0, P1, P2, and GND, making it easy to attach the
sonar sensor.

### HC-SR04 Ultrasonic Sensor
A sensor that measures distance by bouncing ultrasonic sound pulses off objects.
It can detect walls, chair legs, and obstacles from 2 cm to 4 m. It is connected
to P0 on the RingBit board.

### Neodymium Magnets ("Stinky Bones")
Small, powerful disc magnets hidden around the arena. The micro:bit magnetometer
can detect them when the dog crouches within about 5–10 cm. These are the "bones"
the dog hunts for.

---

## The Three Big Questions

Every program in this project answers one of these questions:

1. **What does the dog do?** — `stinky-bones-xgo/main.py`
   The dog searches, detects bones, celebrates, and avoids walls.

2. **How do I control the dog?** — `stinky-bones-controller/main.py`
   The handheld controller sends tilt-based steering and button commands.

3. **What happened during the run?** — `stinky-bones-datacollector/main.py`
   The collector logs all sensor data so we can improve the algorithm.

---

## Discussion Questions

1. What other sensors could you use to find a hidden object?
2. What should the dog do when its battery is low?
3. How would you change the program if there were 10 bones and the dog
   needed to find all of them in the shortest time?
4. What does "autonomous" mean? Is this dog fully autonomous? Why or why not?

---

## Homework / Exploration

Before the next session:
- Open [makecode.microbit.org](https://makecode.microbit.org) and explore the Blocks editor
- Find the `input.magnetic_force()` block in the Input category
- Try the MakeCode "Flashing Heart" starter project — just to feel the flow
  of editing, flashing, and running code

---

## Extension

Research: What are the differences between a magnetometer and a metal detector?
Which one is the XGO dog using? Could you build a metal detector with a micro:bit?
Write a one-paragraph answer to bring to the next session.
