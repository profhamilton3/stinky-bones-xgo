# Lesson 7 — Buttons & State Machines
### Stinky Bones | THE Hamilton Essentials Foundation

---

## Learning Objectives

- Register button event handlers in MakeCode Python
- Explain what a state variable is and how to read and change it
- Trace through state transitions caused by button presses
- Describe how `global` declarations work in event handlers
- Build and test the IDLE ↔ SEARCHING transition

---

## Button Event Handlers

In Lesson 6 we learned about event-driven programming for sound.
Buttons work the same way:

```python
def on_button_a():
    # This runs exactly when button A is pressed
    pass
input.on_button_pressed(Button.A, on_button_a)

def on_button_b():
    # This runs exactly when button B is pressed
    pass
input.on_button_pressed(Button.B, on_button_b)

def on_both():
    # This runs when A and B are pressed simultaneously
    pass
input.on_button_pressed(Button.AB, on_both)
```

`input.on_button_pressed` takes two arguments:
1. **Which button** (`Button.A`, `Button.B`, `Button.AB`)
2. **The handler function** (the function to call — no parentheses here,
   we pass the function *itself*, not the *result* of calling it)

---

## State Variables

A **state variable** is a variable that tracks which phase of behaviour
the program is currently in. In Stinky Bones, the state is a simple integer:

```python
state = 0    # IDLE
```

Because `state` is defined at the top of the program (the *global scope*),
any function that wants to read or modify it must declare it:

```python
def start_searching():
    global state, searching   # I want to change the outer state, not create a local copy
    state = 1
    searching = True
```

If you forget `global state`, Python creates a *local variable* named `state`
inside the function that disappears when the function ends. The outer `state`
stays unchanged — a common and confusing bug.

---

## The Start/Stop Buttons

Button A → call `start_searching()` → state changes to 1 (SEARCHING)
Button B → call `stop_searching()` → state changes to 0 (IDLE)

```python
def start_searching():
    global run_id, state, searching, search_step
    global stand_pending, dance_pending
    run_id += 1
    state = 1
    searching = True
    search_step = 0
    stand_pending = True
    dance_pending = False
    stop_motion()
    basic.show_icon(IconNames.HAPPY)

def sit_after_stop():
    global sit_run
    if sit_run == run_id:
        sit_run = -1
        xgo.execution_action(xgo.action_enum.SIT_DOWN)

def stop_searching():
    global run_id, state, searching, stand_pending, dance_pending
    global sit_run
    run_id += 1
    my_run = run_id
    state = 0
    searching = False
    stand_pending = False
    dance_pending = False
    sit_run = run_id
    stop_motion()
    control.in_background(sit_after_stop)
    if is_current(my_run):
        basic.show_icon(IconNames.ASLEEP)

def on_button_a():
    start_searching()
input.on_button_pressed(Button.A, on_button_a)

def on_button_b():
    stop_searching()
input.on_button_pressed(Button.B, on_button_b)
```

(In `main.py`, `on_button_b` also flashes the number of bones found.)

### Start and Stop return straight away

Neither function waits for the dog to finish moving:

- `start_searching()` does not stand the dog up itself. It sets
  `stand_pending = True`, and the forever loop does the standing on its
  next pass.
- `stop_searching()` calls `stop_motion()` (which sets every walking speed
  to 0 — see Lesson 8) and then asks `control.in_background()` to run
  `sit_after_stop` *alongside* the rest of the program. The sit happens
  only if nobody pressed Start in the meantime (`sit_run == run_id`).

Why bother? A button handler that pauses blocks other events. If Stop
had to wait for a sit to finish, a second press — or a radio Stop — would
be stuck waiting too. Quick handlers keep the dog responsive.

### `run_id` — cancelling what the dog is doing

Both functions start with `run_id += 1`. Think of `run_id` as a ticket
number. Every routine that moves the dog (searching, dancing, avoiding a
wall) is given the ticket number that was current when it began — its
`token`. After each pause, it checks:

```python
def is_current(token: number):
    return token == run_id
```

If Start or Stop has been pressed since, the numbers no longer match and
the routine gives up without moving the dog again. That is how Stop
"wins" over everything else, even a dance that is half-way through.

---

## Tracing State Transitions

Let's trace through what happens step by step:

```
Initial:  state=0, searching=False, dog sits, LED=😴

User presses A:
  on_button_a() fires
  → start_searching() called
    run_id=1, state=1, searching=True, search_step=0
    stand_pending=True
    show happy face
  state=1, searching=True, LED=😊

Forever loop runs:
  stand_pending → XGO stands up, stand_pending=False
Forever loop runs again (token=1):
  state == 1 → do_search_step(1) called
  dog walks one short step and stops, search_step=1

User presses B:
  on_button_b() fires
  → stop_searching() called
    run_id=2, state=0, searching=False
    stop_motion() → all speeds 0
    XGO sits down (in the background)
    show sleeping face
  state=0, searching=False, dog sitting, LED=😴

  Any routine still holding token=1 sees 1 != 2 and gives up.

Forever loop runs:
  state != 1 → search skipped
  (dog sits quietly)
```

---

## Why `searching` AND `state`?

You might notice the code uses two variables: `state` (an integer 0–3) and
`searching` (a boolean True/False).

`state` tracks the *current activity* — it can be 0, 1, 2, or 3.
`searching` tracks *user intent* — did the user ask the dog to keep searching?

This matters when the dog is CELEBRATING (state=2) or AVOIDING (state=3).
After those routines complete, should the dog go back to searching? Only if
`searching` is still True.

```python
def celebrate_bone(token: number):
    global state, bone_count
    if not is_current(token):
        return
    state = 2
    bone_count += 1
    # ... dance, with an is_current(token) check after each pause ...
    if searching:     # user's intent is preserved even while dancing
        state = 1
        basic.show_icon(IconNames.HAPPY)
    else:
        state = 0
        basic.show_icon(IconNames.ASLEEP)
```

---

## Building the State Machine Step by Step

### Step 1 — Just the buttons (no XGO needed)

Flash this minimal version to verify state transitions work before adding
the robot dog:

```python
state = 0
searching = False

def start_searching():
    global state, searching
    state = 1
    searching = True
    basic.show_number(state)

def stop_searching():
    global state, searching
    state = 0
    searching = False
    basic.show_number(state)

def on_button_a():
    start_searching()
input.on_button_pressed(Button.A, on_button_a)

def on_button_b():
    stop_searching()
input.on_button_pressed(Button.B, on_button_b)

def on_forever():
    basic.pause(100)
basic.forever(on_forever)
```

Press A → LED shows 1. Press B → LED shows 0.

### Step 2 — Add all four states

Add CELEBRATING (2) and AVOIDING (3) to the transitions.
The full state machine is in `main.py`.

---

## Exercises

### Exercise 1 — Count transitions
Modify `start_searching()` to count how many times it has been called and
display the count on the LED matrix for 500ms each time. How does this
help with debugging?

### Exercise 2 — Locked state
Add a check: if the dog is in state 3 (AVOIDING), button A should not start
searching until the avoidance routine is complete. How do you implement this?

### Exercise 3 — Button hold
MakeCode supports `Button.A` being *held* (long press). Register a handler
for `ButtonEvent.LongClick` on button A that makes the dog do `STAND`
regardless of state. How is a long press different from a regular press?

---

## Discussion Questions

1. Why does `start_searching()` reset `search_step = 0`? What would happen
   if it didn't?
2. If button A and a radio command 1 both call `start_searching()`, what
   happens if they fire at exactly the same time?
3. In the `on_button_a()` handler, we call `start_searching()` rather than
   putting all the code directly in `on_button_a`. Why is this better?

---

## Extension

Research **observer pattern** and **publish/subscribe (pub-sub)** in software
design. How does MakeCode's event system implement this pattern?
Write a short explanation comparing `input.on_button_pressed` to a traditional
`while True:` polling loop in terms of CPU usage and responsiveness.
