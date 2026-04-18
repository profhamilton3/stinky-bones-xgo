# Lesson 6 — Sound & Clap Detection
### Stinky Bones | THE Hamilton Essentials Foundation

---

## Learning Objectives

- Explain the difference between polling and event-driven programming
- Set a microphone threshold and attach a sound event handler
- Implement a double-clap toggle using a timer window
- Explain why `input.running_time()` is used instead of `basic.pause()`

---

## Polling vs Event-Driven Programming

### Polling

In polling, the program constantly asks "did something happen yet?"

```python
# Polling: wastes CPU cycles checking over and over
def on_forever():
    if input.sound_level() > 80:
        do_something()
basic.forever(on_forever)
```

This works, but the program is doing work even when nothing is happening.

### Event-Driven

In event-driven programming, the program registers a *handler* — a function
that runs automatically when something happens. The rest of the time, the
program can do other work.

```python
# Event-driven: handler fires exactly when needed
def on_loud():
    do_something()
input.on_sound(DetectedSound.LOUD, on_loud)
```

MakeCode handles the event system internally. When the microphone detects
a loud sound, MakeCode pauses the current execution and calls `on_loud`.
When `on_loud` returns, execution resumes where it left off.

**Event-driven programming is used for all inputs in this project:**
buttons, sound, radio, and logo touch.

---

## The Microphone API

```python
# Set threshold: sounds louder than this number trigger LOUD events
# Range: 0 (most sensitive) to 255 (least sensitive)
input.set_sound_threshold(SoundThreshold.LOUD, 80)

# Read current sound level (0–255) — use in polling if needed
level = input.sound_level()

# Register the event handler
def on_loud():
    pass
input.on_sound(DetectedSound.LOUD, on_loud)
```

A threshold of 80 responds to a hand-clap at about 1 metre.
Lower = more sensitive (picks up quieter sounds).
Higher = less sensitive (only responds to very loud sounds).

The LED on the micro:bit (near the USB port) lights red when sound is detected —
useful for visually confirming the microphone is working.

---

## The Double-Clap Toggle

A single clap starts or stops the dog. A double-clap (two claps within 1.5s)
toggles between searching and idle.

**Why double-clap?**
A single threshold event fires constantly in a noisy classroom. A double-clap
requires *deliberate* input — students learn that two rapid claps mean something
specific.

### The Algorithm

```
WHEN loud sound detected:
    NOW = current time

    IF clap_count is 0:           # no prior clap
        clap_count = 1
        clap_time = NOW

    ELSE IF (NOW - clap_time) < CLAP_WINDOW_MS:   # within window
        clap_count = 0
        TOGGLE: if searching → stop, else → start

    ELSE:                         # window expired, treat as new first clap
        clap_count = 1
        clap_time = NOW
```

### The Code

```python
def on_loud_sound():
    global clap_count, clap_time
    now = input.running_time()
    if clap_count == 0:
        clap_count = 1
        clap_time = now
    elif (now - clap_time) < CLAP_WINDOW_MS:
        clap_count = 0
        if searching:
            stop_searching()
        else:
            start_searching()
    else:
        clap_count = 1
        clap_time = now
input.on_sound(DetectedSound.LOUD, on_loud_sound)
```

---

## Why `input.running_time()` Instead of `basic.pause()`

`basic.pause(1500)` would freeze the entire program for 1.5 seconds waiting
for a second clap. During that freeze:
- The magnetometer stops reading
- The sonar stops reading
- The robot dog keeps moving with no obstacle detection
- Radio messages are missed

`input.running_time()` returns the current clock time **without stopping anything**.
The program keeps running; we just record a timestamp and check it on the next event.

This pattern — **recording a timestamp and comparing later** — is used throughout
the project for timing without blocking:

```python
last_log_time = 0
LOG_INTERVAL_MS = 3000

def on_forever():
    global last_log_time
    now = input.running_time()
    if now - last_log_time > LOG_INTERVAL_MS:
        last_log_time = now
        broadcast_data()   # only runs every 3 seconds
```

---

## Testing the Microphone

Flash this test program before adding clap detection to the main code:

```python
input.set_sound_threshold(SoundThreshold.LOUD, 80)
clap_count = 0

def on_loud():
    global clap_count
    clap_count += 1
    basic.show_number(clap_count)
input.on_sound(DetectedSound.LOUD, on_loud)

def on_forever():
    basic.pause(100)
basic.forever(on_forever)
```

Clap once — should show 1. Clap again — should show 2. If it increments
multiple times per clap, raise `SOUND_THRESH` (try 100 or 120).

---

## Exercises

### Exercise 1 — Threshold Explorer
Write a program that prints `sound_level()` to the serial console continuously.
Whisper, speak normally, clap, and shout. Record the values. Choose a threshold
that reliably detects claps but ignores speech.

### Exercise 2 — Triple Clap
Extend the double-clap algorithm to detect a **triple clap** that triggers a
special action (e.g., a different XGO animation). What changes in the algorithm?

### Exercise 3 — Sound-Activated LED Pattern
Write a program that shows a different LED icon for different sound levels:
- Quiet (< 40): show a dot in the center
- Medium (40–120): show a small diamond
- Loud (> 120): show a full star

---

## Discussion Questions

1. What happens if someone in the room claps but is not the student controlling
   the dog? How could you make the clap command more "secure"?
2. The on_loud handler fires in the middle of the forever loop. What state
   variables must be declared `global` inside it, and why?
3. Why is `elif` used instead of two separate `if` statements in the clap logic?

---

## Extension

Research **debouncing** in electronics. When you press a physical button, it
can bounce (make contact multiple times in microseconds). MakeCode handles
this internally for buttons — but the microphone has no hardware debounce.
How does the `CLAP_WINDOW_MS` window solve a similar problem? Write a one-page
explanation.
