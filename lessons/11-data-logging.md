# Lesson 11 — Data Logging & Analysis
### Stinky Bones | THE Hamilton Essentials Foundation

---

## Learning Objectives

- Explain what the micro:bit v2 datalogger stores and how to access it
- Describe the columns in the Stinky Bones log and what each means
- Download a CSV file from the MY_DATA USB drive
- Perform basic analysis in a spreadsheet to tune BONE_THRESHOLD
- Describe how logged data creates a feedback loop for algorithm improvement

---

## Why Log Data?

Gut feeling is not engineering. When we tune `BONE_THRESHOLD`, we should
not guess — we should measure.

Data logging lets us:
- See exactly what the magnetometer reading was when a bone was nearby
- Count how many false alarms happened per session
- Find the ideal threshold for a specific magnet type
- Verify the wall-avoidance is triggering at the right distance
- Track whether the dog's performance improves over multiple sessions

**This is the scientific method applied to robotics.**

---

## The micro:bit v2 Datalogger

The micro:bit v2 has a small flash memory (512 KB) that persists even
when power is removed. The `datalogger` extension writes to this memory
as a CSV (comma-separated values) file.

Key API calls:

```python
# Set column names (call once at startup)
datalogger.set_column_titles("mag_x", "mag_y", "mag_z", "state")

# Log one row of data
datalogger.log(
    datalogger.create_cv("mag_x", 250),
    datalogger.create_cv("mag_y", 100),
    datalogger.create_cv("mag_z", 80),
    datalogger.create_cv("state", 1)
)

# Delete all logged data (button B on collector)
datalogger.delete_log()
```

---

## Accessing Your Data

1. After a run, plug the **data collector microbit** into a computer via USB
2. The micro:bit appears as two drives:
   - **MICROBIT** — for flashing new programs
   - **MY_DATA** — for reading logged data
3. Open the **MY_DATA** drive and click `MY_DATA.HTM`
4. This opens the MakeCode data viewer in your browser
5. Click **Download CSV** to save `MY_DATA.csv`

---

## What the CSV Looks Like

```
mag_x,mag_y,mag_z,accel_x,accel_y,accel_z,sonar_cm,dog_state
52,38,44,12,-8,1005,95,1
55,40,47,20,-5,1003,87,1
280,310,190,25,-10,998,84,1   ← bone nearby! large mag values
290,320,195,22,-8,1001,82,2   ← dog is celebrating
55,42,45,15,-7,1004,12,3      ← sonar triggered wall avoidance
```

---

## Finding Your Ideal BONE_THRESHOLD

### Step 1 — Run a session with a low threshold

Set `BONE_THRESHOLD = 100` (too low — expect false positives).
Run the dog for 3 minutes. Download the CSV.

### Step 2 — Filter for celebration events

In the spreadsheet, filter rows where `dog_state == 2` (CELEBRATING).
Look at `mag_x`, `mag_y`, `mag_z` values in those rows.
Also look at the row just before each celebration — that row is when
detection triggered.

```
=SQRT(A2^2 + B2^2 + C2^2)    ← formula for mag_strength from components
```

Add this as a new column in the CSV. What is mag_strength just before
each celebration event?

### Step 3 — Separate real vs false detections

Label each celebration as "REAL" (you placed a magnet there) or "FALSE"
(no magnet). What is the mag_strength distribution for each?

| Event type | Min mag_strength | Max | Average |
|---|---|---|---|
| Real bone | | | |
| False alarm | | | |

### Step 4 — Set the threshold between the distributions

If real bones cluster above 250 µT and false alarms cluster below 120 µT,
set `BONE_THRESHOLD = 185` (the midpoint). This minimises both false positives
and missed detections.

---

## The Feedback Loop

```
Run session
    │
    ▼
Download CSV
    │
    ▼
Analyse threshold distributions
    │
    ▼
Adjust BONE_THRESHOLD and WALL_CM in main.py
    │
    ▼
Flash updated code
    │
    └──────────► Run session (loop)
```

Each iteration of this loop makes the dog smarter. This is how
engineers and data scientists improve real systems — not by guessing,
but by measuring, analysing, and adjusting.

---

## Using Python / Pandas for Analysis

Advanced students can analyse the CSV using Python on their laptop:

```python
import pandas as pd
import matplotlib.pyplot as plt

# Load the CSV
df = pd.read_csv("MY_DATA.csv")

# Calculate total magnetic strength
df["mag_strength"] = (df["mag_x"]**2 + df["mag_y"]**2 + df["mag_z"]**2)**0.5

# Plot strength over time (sample number)
df["mag_strength"].plot(title="Magnetic Strength Over Session")
plt.axhline(y=200, color="red", linestyle="--", label="BONE_THRESHOLD")
plt.legend()
plt.show()

# Count states
print(df["dog_state"].value_counts())
```

---

## Exercises

### Exercise 1 — Threshold Chart
Using a spreadsheet, create a bar chart of `mag_strength` for each sample.
Visually identify the peaks (bone detections). Mark your current
`BONE_THRESHOLD` line. Is it in the right place?

### Exercise 2 — Sonar Validation
Filter rows where `sonar_cm > 0 AND sonar_cm < 20`. Do these correlate
with rows where `dog_state == 3` (AVOIDING)? If not, why might there
be a delay?

### Exercise 3 — Session Report
Write a one-page session report as if you are an engineer presenting
to the team. Include:
- Total session time (estimate from sample count × 3 seconds)
- Number of bones found
- Number of false alarms
- Number of wall avoidance events
- Recommended threshold adjustments with justification

---

## Discussion Questions

1. The datalogger stores data even when power is removed. What could
   go wrong if you forget to clear the log between sessions?
2. The collector only receives a packet every 3 seconds. What events
   might happen between packets that you can't see in the log?
3. What additional column would you add to the log to help map bone
   locations? What sensor would you use to estimate position?

---

## Extension — Bone Location Feedback

Advanced challenge: combine accelerometer data (direction the dog is facing)
and a step counter (how far it has traveled) to estimate where each bone
was found. Plot these positions on a simple 2D grid.

This is a simplified version of **dead reckoning** — the navigation method
used by ships before GPS. Research how cumulative errors affect dead reckoning
over long distances, and why GPS replaced it for most applications.

---

*You have completed all 12 lessons of the Stinky Bones curriculum.*
*Congratulations — you built a real autonomous robot in Python.*

*THE Hamilton Essentials Foundation, Inc.*
