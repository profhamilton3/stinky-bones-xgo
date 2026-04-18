# Lesson 2 — The MakeCode Editor
### Stinky Bones | THE Hamilton Essentials Foundation

---

## Learning Objectives

- Import a project from GitHub into MakeCode
- Switch between the Python, Blocks, and JavaScript views
- Flash a program onto a micro:bit
- Use the serial console to print and read values for debugging
- Install a MakeCode extension (XGO, sonarbit)

---

## The MakeCode Platform

Microsoft MakeCode for micro:bit lives at **makecode.microbit.org**.
It is a browser-based editor — no software to install. It works on any
device with a modern browser (Chrome, Edge, Firefox, Safari).

MakeCode supports three views of the same program:
- **Blocks** — drag-and-drop visual coding (great for beginners)
- **JavaScript** — typed code for web developers
- **Python** — the view we use in this course

All three views are perfectly equivalent. You can switch between them at any time
and the editor converts automatically.

---

## Tour of the Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  makecode.microbit.org                                          │
├──────────┬──────────────────────────────────────────────────────┤
│ SIMULATOR│  [Blocks] [JavaScript] [Python]  ← view tabs        │
│          │                                                      │
│  micro:  │  # Your Python code goes here                       │
│  bit     │  bone_count = 0                                      │
│  preview │                                                      │
│          │                                                      │
├──────────┴──────────────────────────────────────────────────────┤
│  [Download ▼]   [Send to micro:bit]   Serial Console ▼         │
└─────────────────────────────────────────────────────────────────┘
```

### Key Areas

| Area | What it does |
|---|---|
| Simulator | Shows a virtual micro:bit — test before flashing |
| View tabs | Switch between Blocks / JavaScript / Python |
| Code editor | Where you type your program |
| Download button | Compiles and saves a `.hex` file |
| Serial Console | Shows `print()` output from the running micro:bit |

---

## Importing the Stinky Bones Project

1. Open [makecode.microbit.org](https://makecode.microbit.org)
2. Click **Import** (top-right area of the home screen)
3. Select **Import URL...**
4. Paste the URL: `https://github.com/profhamilton3/stinky-bones-xgo`
5. Click **Go ahead!**
6. MakeCode downloads the project and installs the XGO and sonarbit extensions
7. Click the **Python** tab — you will see `main.py`

---

## Flashing Your Code

**Method 1 — Drag and Drop (most reliable):**
1. Click **Download**
2. A `.hex` file saves to your Downloads folder
3. Plug in the micro:bit via USB
4. A drive called **MICROBIT** appears on your computer
5. Drag the `.hex` file onto the MICROBIT drive
6. The orange LED on the micro:bit blinks while flashing, then restarts

**Method 2 — WebUSB (Chrome only):**
1. Click the **...** next to Download and select **Connect Device**
2. Select your micro:bit and click **Connect**
3. After that, clicking **Download** flashes directly — no dragging needed

---

## The Serial Console

The serial console lets you print values from the micro:bit to the screen —
like a window into the running program. This is essential for debugging.

In your Python code:
```python
print("mag_strength =", mag_strength)
```

In MakeCode, open the **Show Console** panel at the bottom of the editor.
Values print in real time as the program runs.

**Pro tip:** Use the serial console during calibration to see the magnetometer
reading when you hold a magnet near the dog. That reading tells you what to
set `BONE_THRESHOLD` to.

---

## Installing Extensions

The XGO and sonarbit extensions are listed in `pxt.json`. MakeCode installs them
automatically when you import from GitHub. To add a new extension manually:

1. Click the gear icon (⚙) → **Extensions**
2. Search for the extension name (e.g., "xgo" or "sonarbit")
3. Click the matching result to install it

Extensions add new API functions (like `xgo.execution_action()` and
`sonar.ping()`) to your project.

---

## Debugging Workflow

When your program doesn't do what you expect, follow this sequence:

```
1. READ the error message carefully (orange error banner in MakeCode)
2. CHECK your indentation — Python is strict about spaces
3. ADD print() statements to trace which code is running
4. FLASH and test — never debug code you haven't run yet
5. CHANGE one thing at a time — don't guess blindly
6. COMPARE to a working example
```

---

## Exercise

1. Open the Stinky Bones XGO project in MakeCode
2. Add this line inside `on_forever()`, after the sensor reads:
   ```python
   print("mag:", mag_strength, "sonar:", sonar_cm)
   ```
3. Flash the code and open the serial console
4. Hold a magnet near the dog's underside — watch the `mag` value climb
5. Wave your hand in front of the sonar — watch `sonar` drop
6. Remove the `print` line before the next lesson (printing slows down the loop)

---

## Discussion Questions

1. Why is the serial console more useful than the LED matrix for debugging?
2. What is the difference between a Syntax Error and a Logic Error?
3. If the simulator shows working code but the real micro:bit doesn't work,
   what might be different between simulation and reality?

---

## Extension

Find the **JavaScript** view of the project. Identify the same three functions
(`start_searching`, `stop_searching`, `celebrate_bone`) in TypeScript. How
does TypeScript syntax differ from Python? What is the same?
