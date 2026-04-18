# Lesson 1 — Python Basics
### Stinky Bones | THE Hamilton Essentials Foundation

---

## Learning Objectives

- Declare variables and assign values to them
- Write `if`/`elif`/`else` conditionals
- Write `while` and `for` loops
- Define and call functions
- Read a simple Python program top-to-bottom and predict what it does

---

## Why Python?

Python is one of the most widely used programming languages in the world.
Data scientists, web developers, AI researchers, and roboticists all use it.
MakeCode supports Python on the micro:bit, so the code you write here
runs on real hardware — no simulation.

Python uses **indentation** (spaces at the start of a line) to define blocks
of code. This makes programs easy to read at a glance.

---

## Core Concepts

### 1. Variables

A variable is a named container that holds a value. The value can change.

```python
bone_count = 0        # starts at zero
bone_count = bone_count + 1  # now it is 1

name = "Stinky"       # a string (text)
searching = True      # a boolean (True or False)
distance = 12.5       # a float (decimal number)
```

In MakeCode Python, all variables used inside a function that were defined
*outside* that function must be declared with `global`:

```python
score = 0

def add_point():
    global score      # tells Python "use the outer score, not a new one"
    score += 1
```

---

### 2. Conditionals — if / elif / else

```python
mag_strength = 250

if mag_strength > 200:
    print("Bone detected!")
elif mag_strength > 100:
    print("Getting warmer...")
else:
    print("Nothing here yet.")
```

Python checks each condition in order and runs only the first matching block.

---

### 3. Loops

**while** — keeps running as long as a condition is True:

```python
steps = 0
while steps < 4:
    print("Taking a step")
    steps += 1
# prints "Taking a step" four times
```

**for** — runs once for each item in a sequence:

```python
for i in range(5):    # i = 0, 1, 2, 3, 4
    print(i)
```

---

### 4. Functions

A function is a reusable, named block of code.

```python
def celebrate():
    print("Found a bone!")
    print("Do a happy dance!")

celebrate()   # call it once
celebrate()   # call it again
```

Functions can accept **parameters** (inputs):

```python
def greet(name):
    print("Hello, " + name + "!")

greet("Stinky")    # prints: Hello, Stinky!
greet("Bones")     # prints: Hello, Bones!
```

Functions can **return** a value:

```python
def add(a, b):
    return a + b

result = add(3, 4)   # result = 7
```

---

## Connection to the Project

Open `stinky-bones-xgo/main.py` and find these examples:

| Concept | Where in main.py |
|---|---|
| Constants (variables that don't change) | `BONE_THRESHOLD = 200` |
| State variable | `state = 0` |
| Function definition | `def start_searching():` |
| `global` declaration | `global state, searching` |
| Conditional (bone check) | `if state == 1 and mag_strength > BONE_THRESHOLD:` |
| Function call | `celebrate_bone()` |

---

## Exercises

### Exercise 1 — Variable practice

In the MakeCode Python editor, type this program and flash it:

```python
count = 0

def on_button_a():
    global count
    count += 1
    basic.show_number(count)
input.on_button_pressed(Button.A, on_button_a)

def on_button_b():
    global count
    count = 0
    basic.show_icon(IconNames.NO)
input.on_button_pressed(Button.B, on_button_b)
```

Press A to increment, B to reset. Can you modify it to count down from 10?

---

### Exercise 2 — Conditionals

Flash this program. What does it display for different values of `x`?

```python
x = 7

if x > 10:
    basic.show_string("BIG")
elif x > 5:
    basic.show_string("MED")
else:
    basic.show_string("SML")
```

Change `x` to 3, then 15. Predict the output before running.

---

### Exercise 3 — Functions

Write a function called `blink_count(n)` that plots and unplots the centre
LED `n` times. Call it with `blink_count(3)` when button A is pressed.

---

## Discussion Questions

1. What happens if you forget `global score` inside `add_point()`?
2. What is the difference between `=` and `==` in Python?
3. Can a function call another function? Give an example from `main.py`.

---

## Extension

Research **type annotations** in Python. Find an example in `main.py` that
uses one (`cmd: number`). What does it mean? Why might it help when teaching
a class?
