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
    global state, searching, search_step
    state = 1
    searching = True
    search_step = 0
    basic.show_icon(IconNames.HAPPY)
    xgo.execution_action(xgo.action_enum.STAND)
    basic.pause(500)

def stop_searching():
    global state, searching
    state = 0
    searching = False
    xgo.execution_action(xgo.action_enum.SIT_DOWN)
    basic.show_icon(IconNames.ASLEEP)

def on_button_a():
    start_searching()
input.on_button_pressed(Button.A, on_button_a)

def on_button_b():
    stop_searching()
input.on_button_pressed(Button.B, on_button_b)
```

---

## Tracing State Transitions

Let's trace through what happens step by step:

```
Initial:  state=0, searching=False, dog sits, LED=😴

User presses A:
  on_button_a() fires
  → start_searching() called
    global state=1, searching=True, search_step=0
    show happy face
    XGO stands up
  state=1, searching=True, dog standing, LED=😊

Forever loop runs:
  state == 1 → do_search_step() called
  dog crawls forward, search_step=1

User presses B:
  on_button_b() fires
  → stop_searching() called
    global state=0, searching=False
    XGO sits down
    show sleeping face
  state=0, searching=False, dog sitting, LED=😴

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
def celebrate_bone():
    global state
    state = 2
    # ... dance ...
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
