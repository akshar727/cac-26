# Codely

Codely is a desktop coding environment for young learners. It uses visual
programming blocks to help students create interactive projects without first
having to learn the syntax of a text-based programming language, with extra
features to support different learning styles and needs.

## What It Does

- Provides guided lessons covering movement, positioning, rotation, loops, and
  other programming concepts.
- Provides a project workspace where students can create and save their own
  block-based programs.
- Lets students work with sprites, costumes, backdrops, variables,
  broadcasts, keyboard input, mouse input, speech bubbles, and clones.
- Runs projects in an integrated stage so students can immediately see what
  their code does.
- Provides interactive lessons that reveal only the blocks needed for each step so students can focus on one concept at a time.

## Accessibility and Neurodivergent Learner Support

Codely includes features intended to reduce cognitive load and support a range
of learning and sensory preferences:

- **Sensory-Safe / Pastel theme:** Students can switch from the standard block
  palette to muted, lower-saturation colors from the home screen. The choice is
  saved and restored the next time Codely opens.
- **Visual block categories:** Blocks are grouped by consistent
  category colors and include recognizable pictograms where appropriate, such
  as movement, speech, looping, keyboard, and pointer symbols.
- **Guided, incremental lessons:** Lessons reveal only the blocks relevant to
  the current step and provide short instructions instead of requiring a
  student to hold the entire task in working memory.
- **Immediate visual feedback:** Students can run code on the stage and see
  sprite behavior directly.
- **Visible progress:** A progress bar and percentage show how far a student
  has advanced through a lesson.
- **Contextual block help:** Selecting a block opens a nearby explanation with
  a simple description and examples when available.
- **Predictable controls:** Common actions such as run, stop, back, costume,
  and backdrop actions use familiar icons and labels.

These features are intended as supportive design choices, not as a substitute
for individualized accessibility accommodations or user testing with the
students who will use the app.

## Libraries Used

- **Tauri** packages the application as a lightweight desktop app and provides
  access to native capabilities such as application storage and the filesystem.
- **React and TypeScript** provide the application structure, state management,
  and typed UI logic.
- **Blockly** provides the visual programming workspace, block definitions,
  toolbox categories, serialization, themes, and interaction model.
- **shadcn/ui** supplies the reusable interface primitives, including buttons,
  cards, dialogs, tabs, inputs, menus, and scroll areas. Tailwind CSS is used
  for layout and styling.
- **canvas-confetti** provides the lesson-completion celebration.

The runtime interprets saved Blockly programs and renders sprites on an HTML
canvas, allowing the editor and the project output to live in the same app.

## Assets

The sprite and backdrop artwork used by the app was sourced from the Scratch
website. Scratch and its contributors retain the applicable rights to those
assets; refer to the original Scratch asset pages and licenses for attribution
and redistribution requirements.

## Development

Install dependencies and start the web development server:

```bash
npm install
npm run dev
```

Create a production web build with:

```bash
npm run build
```

Tauri commands are available through the `tauri` npm script, for example:

```bash
npm run tauri -- dev
```
