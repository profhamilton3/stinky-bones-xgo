# Lesson 4 — Algorithm Design
### Stinky Bones | THE Hamilton Essentials Foundation

---

## Learning Objectives

- Define an algorithm and explain why design comes before code
- Write pseudocode for a search behaviour
- Draw a flowchart for the Stinky Bones state machine
- Identify the four states and the transitions between them
- Explain why wall detection is checked before bone detection in the main loop

---

## What is an Algorithm?

An algorithm is a **step-by-step set of instructions** for solving a problem.
A recipe is an algorithm. A GPS route is an algorithm.
A well-designed algorithm:

- Has a clear starting point
- Has a clear ending condition (or a defined loop)
- Handles every possible situation (even unexpected ones)
- Is as simple as possible

---

## The Problem

> The dog is placed in an arena with walls and hidden magnetic bones.
> It must find all the bones without getting stuck against a wall.

Break the problem into smaller questions:

1. How does the dog **move** to cover the arena?
2. How does the dog **detect** a bone?
3. What does the dog **do** when it finds a bone?
4. How does the dog **avoid** walls?
5. How does the dog **know** what it should be doing at any moment?

---

## Pseudocode

Pseudocode is plain English that looks like code. It is used to sketch
an algorithm before writing real syntax.

```
FOREVER:
    read magnetometer
    read sonar

    IF we are searching AND sonar < WALL_CM:
        avoid_wall()

    ELSE IF we are searching AND mag_strength > BONE_THRESHOLD:
        celebrate_bone()

    ELSE IF we are searching:
        do_search_step()

    EVERY 3 seconds:
        broadcast sensor data over radio
```

Notice: wall detection comes before bone detection. Why?

> If the dog is about to hit a wall AND is also near a bone, the wall is
> the more urgent problem. We handle the most dangerous situation first.
> This is called **priority ordering**.

---

## The Search Pattern — Pseudocode

```
search_step = 0

FUNCTION do_search_step():
    IF search_step < SEARCH_STEPS:
        crawl forward one step
        search_step = search_step + 1
    ELSE:
        search_step = 0
        squat (lower body to ground)
        look for food (sweep head)
        stand back up
```

The dog crawls forward N steps, then stops and crouches to sweep its
magnetometer close to the ground. Bones are hidden ON the ground, so the
dog must get low to sense them reliably.

---

## The State Machine

A **state machine** is a model where the program is always in exactly
one **state**, and **events** cause transitions between states.

### The Four States

| State | Value | Meaning |
|---|---|---|
| IDLE | 0 | Sitting still, waiting for a command |
| SEARCHING | 1 | Actively hunting for bones |
| CELEBRATING | 2 | Found a bone — playing victory routine |
| AVOIDING | 3 | Obstacle detected — backing up and turning |

### The Transitions

```
                    ┌─────────────────────────────┐
                    │                             │
           Button A │                             │ Button B /
           or cmd 1 │                             │ double-clap / cmd 2
                    ▼                             │
              ┌──────────┐  bone found   ┌────────────────┐
    start ──► │  IDLE    │ ─────────────►│  CELEBRATING   │
              └──────────┘               └────────────────┘
                    ▲                             │
                    │                    dance complete → return
                    │                             │
                    │         ┌──────────┐        │
                    └─────────┤AVOIDING  │◄───────┘
                   wall done  └──────────┘  wall detected
                              (searching restored)
```

More simply:

```
IDLE ──(start)──► SEARCHING ──(bone)──► CELEBRATING ──► SEARCHING
                      │
                      └──(wall)──► AVOIDING ──► SEARCHING
```

### Why Not One Big Loop?

Without states, the code would look like this:

```python
# BAD: spaghetti code with no clear structure
while True:
    if mag_strength > 200:
        dance()
    if sonar < 15:
        back_up()
    crawl_forward()   # what if we're dancing? what if we're backing up?
```

States prevent actions from conflicting. When state == 2 (CELEBRATING),
the main loop does not send crawl commands to the XGO.

---

## Flowchart

Draw this flowchart on paper or a whiteboard:

```
         START
           │
           ▼
      [Read sensors]
           │
           ▼
    state == SEARCHING?
    ┌── YES ──────────────────────────────────────────┐
    │                                                  │
    ▼                                                  │
sonar > 0                                              │
AND sonar < WALL_CM?                                   │
    │ YES                                              │
    ▼                                                  │
avoid_wall() ────────────────────────────┐            │
                                         │            │
                                         ▼            │
                              mag_strength > BONE_THRESHOLD?
                                         │ YES
                                         ▼
                                  celebrate_bone()
                                         │
                                         ▼
                                   do_search_step()
                                         │
                                         ▼
                              [Broadcast data if timer up]
                                         │
                                         ▼
                                   [Pause 100ms]
                                         │
                                        (loop)
```

---

## Exercise

On paper, draw the full state machine for the dog including:
- All four states as boxes
- All transitions as arrows with labels
- The input (button/clap/radio/sensor) that causes each transition

Then add two new states of your own: **LOW_BATTERY** and **LOST** (the dog
hasn't detected a bone in 60 seconds). Draw the transitions to and from them.

---

## Discussion Questions

1. What would happen if we checked bone detection BEFORE wall detection?
2. Why is CELEBRATING a separate state instead of just a function call?
3. What would you add to make the dog remember WHERE it found bones?
4. Can a state machine have more than one active state at a time?
   (Research: parallel state machines / statecharts)

---

## Extension

Research **finite state automata** (FSA) in computer science.
How is the Stinky Bones state machine the same as an FSA?
How is it different? Is it deterministic? Can it get stuck in an infinite loop?
