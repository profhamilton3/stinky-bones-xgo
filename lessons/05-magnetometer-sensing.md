# Lesson 5 — Magnetometer Sensing
### Stinky Bones | THE Hamilton Essentials Foundation

---

## Learning Objectives

- Explain what a magnetometer measures and why it can detect bones
- Read all three magnetometer axes and the total strength value
- Calibrate the micro:bit compass
- Determine a good BONE_THRESHOLD value by experiment
- Describe how crouching the dog improves detection reliability

---

## What is Magnetism?

Every magnet creates an invisible **magnetic field** around it — a force
that affects other magnets and some metals (iron, nickel, cobalt, and steel
are *ferromagnetic*).

The Earth itself is a giant magnet. Its magnetic field is everywhere and measures
roughly **40–60 µT** (microtesla) at the Earth's surface.

Our "Stinky Bones" are **neodymium magnets** — the strongest type of permanent
magnet. A small disc magnet (10mm diameter, 2mm thick) can produce **100–500 µT**
at a distance of 5 cm.

---

## The micro:bit Magnetometer

The micro:bit v2 contains a small chip (LSM303AGR or similar) that measures
the total magnetic field vector — the direction and strength of magnetism
at the chip's location.

It returns values on three axes:

| Axis | Direction | Python call |
|---|---|---|
| X | Left / Right | `input.magnetic_force(Dimension.X)` |
| Y | Forward / Back | `input.magnetic_force(Dimension.Y)` |
| Z | Up / Down | `input.magnetic_force(Dimension.Z)` |
| Strength | Total (all axes) | `input.magnetic_force(Dimension.STRENGTH)` |

Values are in **µT (microtesla)**. In a quiet room, resting strength is ~40–80 µT.

The **STRENGTH** value is the vector magnitude:

```
strength = sqrt(x² + y² + z²)
```

This is always positive and always ≥ any individual axis reading.

---

## Calibration

Before the magnetometer gives accurate readings, it needs to be calibrated.
The first time you run code that reads magnetic force, the micro:bit shows
a tilting animation on the LED matrix. You must tilt the board slowly in
all directions (like drawing a circle with the micro:bit) until all 25 LEDs
are lit. Then calibration is complete.

**Recalibrate when:**
- You move to a different room (different background field)
- You attach new metal objects to the dog
- Readings seem wrong (bone not detected, or false positives)

---

## Science Experiment: Finding Your BONE_THRESHOLD

This is a hands-on calibration activity.

**Step 1 — Measure the background field**

Flash this program and record the resting `mag_strength` value:

```python
def on_forever():
    ms = input.magnetic_force(Dimension.STRENGTH)
    print("strength:", ms)
    basic.pause(200)
basic.forever(on_forever)
```

Open the serial console. Record 10 readings. Calculate the average.
This is your **baseline** (probably 40–80 µT).

**Step 2 — Measure with a magnet**

Hold a neodymium magnet 5 cm below the micro:bit. Record the strength.
Slowly bring it closer (4 cm, 3 cm, 2 cm). Record each value.

| Distance | mag_strength |
|---|---|
| Baseline (no magnet) | ___ µT |
| 5 cm | ___ µT |
| 3 cm | ___ µT |
| 1 cm | ___ µT |

**Step 3 — Set the threshold**

A good threshold is roughly **50–70% of the value at your intended detection
distance**. If you want to detect a bone at 3 cm and measured 300 µT at 3 cm:

```python
BONE_THRESHOLD = 210   # 70% of 300
```

Set it too low → false positives (dog celebrates without a bone).
Set it too high → misses real bones.

---

## Why Crouching Helps

The magnetometer is inside the micro:bit, which is mounted on top of the
XGO dog body — roughly 10–15 cm above the ground.

A magnet's field strength drops off with distance following the **inverse cube law**:

```
strength ∝ 1 / distance³
```

This means doubling your distance reduces the field to 1/8 strength. Halving
your distance multiplies it by 8.

When the dog executes `SQUAT` + `LOOKING_FOR_FOOD`, it lowers its body and
sweeps its head downward — bringing the micro:bit from ~12 cm above ground
to ~5 cm. That alone multiplies the detectable field by ~15×.

**This is why the search algorithm crouches every few steps.**

---

## X, Y, Z vs Strength — Which to Use?

Use **STRENGTH** for bone detection — it is direction-independent. Whether
the bone is in front, behind, or to the side, the total field strength
increases as the dog gets closer.

Individual axes are useful for finding the **direction** of the bone:
- If X increases when the dog turns right → bone is to the right
- This is how compass navigation works

Advanced challenge: can you use the X and Y readings to steer the dog
*toward* the bone once it's detected within range?

---

## Connection to main.py

```python
# In the forever loop:
mag_strength = input.magnetic_force(Dimension.STRENGTH)

# In the bone detection check:
if state == 1 and mag_strength > BONE_THRESHOLD:
    celebrate_bone()
```

The dog only checks for bones when `state == 1` (SEARCHING) to avoid
false triggers while celebrating or avoiding walls.

---

## Exercises

### Exercise 1 — Live Compass
Write a program that shows a directional arrow pointing toward magnetic north
using the `compass.heading()` function. Does it change when you rotate the dog?

### Exercise 2 — Bone Distance Estimator
Using your calibration data, write a function that takes `mag_strength` and
returns an estimated distance to the nearest magnet. Display it on the LED
matrix as a number 1–5 (1 = very close, 5 = far away).

### Exercise 3 — Threshold Tuning
Set `BONE_THRESHOLD` intentionally too low (50). Observe false positives.
Then set it too high (500). Observe misses. Find the sweet spot for your
specific magnet and arena.

---

## Discussion Questions

1. Steel chairs and metal table legs also affect the magnetometer. How
   could you compensate for this in your code?
2. If you have two bones very close together, will the dog detect them as
   one or two? How could you tell the difference?
3. Why does the micro:bit need calibration but a compass app on a smartphone
   recalibrates automatically? (Hint: research soft-iron compensation)

---

## Extension

Research the **Hall effect** — the physics principle behind how magnetometers
work. Draw a diagram showing how current flow changes in a conductor
when a magnetic field is applied perpendicular to it. How does the micro:bit
chip convert that into a digital reading?
