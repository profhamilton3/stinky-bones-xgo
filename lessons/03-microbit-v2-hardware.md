# Lesson 3 — micro:bit v2 Hardware
### Stinky Bones | THE Hamilton Essentials Foundation

---

## Learning Objectives

- Identify each sensor on the micro:bit v2 and its API function
- Explain the difference between digital and analogue signals
- Read data from the accelerometer and magnetometer using Python
- Describe how the edge connector pins route to the RingBit board

---

## The micro:bit v2 — A Computer in Your Pocket

The BBC micro:bit v2 packs an impressive amount of hardware into a board
smaller than a credit card.

```
         ┌────────────────────────────────┐
         │ [A]  5×5 LED MATRIX  [B]       │  ← Buttons A and B
         │                                │
         │       [ LOGO TOUCH ]           │  ← Capacitive touch button
         │                                │
         │  USB ──────────────── BATTERY  │
         └────────┬───────────────┬───────┘
                  │  EDGE  PINS   │
         P0  P1  P2  3V  GND  P3...P20
```

**New in v2 (vs original micro:bit):**
- Built-in microphone (MEMS microphone with LED indicator)
- Built-in speaker
- Capacitive logo button (touch, not press)
- More RAM and faster processor (Nordic nRF52833)
- Power indicator LED

---

## Sensors and Their Python APIs

### Accelerometer
Measures how fast the micro:bit is accelerating on three axes.
When sitting still, it measures Earth's gravity (~1000 mg downward).

```python
ax = input.acceleration(Dimension.X)   # left/right tilt (-1000 to +1000 mg)
ay = input.acceleration(Dimension.Y)   # forward/back tilt
az = input.acceleration(Dimension.Z)   # up/down (gravity ~1000 when flat)
```

**In this project:** the controller uses ax and ay to detect tilt for steering.
The XGO dog uses az to detect falls or flips.

---

### Magnetometer (Compass)
Measures the strength of the surrounding magnetic field on three axes.
Earth's magnetic field is ~50 µT. A small neodymium magnet at 5 cm is ~200+ µT.

```python
mx = input.magnetic_force(Dimension.X)        # µT on X axis
my = input.magnetic_force(Dimension.Y)        # µT on Y axis
mz = input.magnetic_force(Dimension.Z)        # µT on Z axis
ms = input.magnetic_force(Dimension.STRENGTH) # total magnitude (all axes)
```

**In this project:** `mag_strength` is compared to `BONE_THRESHOLD` to detect bones.

> **Calibration note:** The first time you run code that uses the magnetometer,
> the micro:bit asks you to tilt it in a circle to calibrate. Do this carefully —
> it corrects for the micro:bit's own magnetic bias.

---

### Microphone
Detects sound level as a number from 0–255.

```python
level = input.sound_level()    # 0 (silent) to 255 (very loud)

# Event: fires when sound exceeds the threshold
def on_loud():
    pass
input.on_sound(DetectedSound.LOUD, on_loud)

# Set the threshold
input.set_sound_threshold(SoundThreshold.LOUD, 80)
```

**In this project:** two loud sounds within 1.5 seconds = double-clap → toggle search.

---

### Buttons
Physical push buttons. Each fires an event when pressed.

```python
def on_a():
    pass
input.on_button_pressed(Button.A, on_a)

def on_b():
    pass
input.on_button_pressed(Button.B, on_b)

def on_ab():
    pass
input.on_button_pressed(Button.AB, on_ab)  # both together
```

---

### Logo (Touch Button)
A capacitive touch pad shaped like the micro:bit logo above the LED matrix.

```python
def on_logo():
    pass
input.on_logo_event(TouchButtonEvent.PRESSED, on_logo)
```

---

### Radio
The micro:bit can communicate wirelessly with other micro:bits within ~10 metres.
All devices must use the same **group** number (0–255) to hear each other.

```python
radio.set_group(3)
radio.send_number(42)         # send a number

def on_recv(n: number):
    pass
radio.on_received_number(on_recv)

radio.send_buffer(buf)        # send raw bytes (up to 19 bytes)

def on_buf(buf: Buffer):
    pass
radio.on_received_buffer(on_buf)
```

---

### LED Matrix
25 individual LEDs arranged in a 5×5 grid.

```python
basic.show_number(7)             # scroll a number
basic.show_string("HI")          # scroll text
basic.show_icon(IconNames.HAPPY) # show a preset icon
led.plot(2, 2)                   # light up pixel at column 2, row 2
led.unplot(2, 2)                 # turn it off
basic.clear_screen()             # turn all off
```

---

### Running Time
The micro:bit has a millisecond timer that starts at power-on.
Used to measure elapsed time without blocking the program.

```python
now = input.running_time()   # milliseconds since startup
```

**In this project:** used for double-clap detection and radio log throttling.

---

## Edge Connector and Pins

The gold teeth at the bottom of the micro:bit are the edge connector.
The RingBit board plugs into these teeth and breaks out three general-purpose pins:

| Pin | Role in this project |
|---|---|
| P0 | HC-SR04 sonar sensor (trigger + echo, single-wire) |
| P1 | XGO serial RX (receives replies from the dog) |
| P2 | XGO serial TX (sends commands to the dog) |
| GND | Ground reference for all sensors |

P1 and P2 in serial mode are controlled by `xgo.init_xgo_serial(SerialPin.P2, SerialPin.P1)`.
After that call, P1 and P2 belong to the XGO library and should not be used for anything else.

---

## Digital vs Analogue

| Type | Values | Example |
|---|---|---|
| Digital | Only HIGH (1) or LOW (0) | Button pressed / not pressed |
| Analogue | Range of values (0–1023) | Light level, sound level |

The magnetometer and accelerometer return analogue values.
Buttons return digital values.
The sonar sensor uses digital timing (pulse width) to encode distance.

---

## Exercise

Write a program that:
1. Shows the live magnetometer `STRENGTH` value on the LED matrix
2. Changes the display to a star icon when strength > 150
3. Returns to the number when strength drops below 150

Hint: use `basic.forever()` and `mag_strength = input.magnetic_force(Dimension.STRENGTH)`.

---

## Discussion Questions

1. Why does the magnetometer need calibration but the accelerometer does not?
2. The micro:bit radio range is ~10 metres. What would happen to the project
   if the arena were 15 metres wide?
3. Can P0 be used for both the sonar AND another device at the same time? Why?

---

## Extension

Look up the Nordic nRF52833 datasheet. What is the clock speed? How much RAM?
How does that compare to the original micro:bit (nRF51822)? Why does more RAM
matter for a program that logs sensor data?
