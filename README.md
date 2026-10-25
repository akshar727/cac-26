# Codely

Codely is a desktop coding environment for young learners. Students build
interactive projects by snapping visual blocks together instead of typing code,
and the app includes extra supports for different learning styles and needs.

## Features
Codely contains a wide-number of features to make programming more accessible to learners, including:

* A block-based programming environment that allows students to create projects without ever writing a single line of code
* 10 detailed built-in lessons that give students a walk-through on how to use Codely and how to program their own projects
* An intuitive project selector that allows students to create and manage multiple projects
* Simplified interface that removes unnecessary distractions and makes it easier for students to focus on their projects
* Diverse toolbox that allows students to use 60+ blocks to create their projects
* Block tooltips for every block to help students understand what each block does
* Smart hinting system that gives students help on lessons they may be struggling with

## Who it's for

Codely is designed for young learners who are just starting to code, including
students who are neurodivergent or have learning disabilities. Accessibility
settings include:

- A pastel color mode
- Large text
- the Atkinson Hyperlegible font
- Reduced motion mode

Block text is automatically switched between light and dark so it stays
readable on both color modes.

## Built with

Tauri 2 (Rust), React 19, TypeScript, Blockly, Tailwind CSS 4 and shadcn/ui.
Projects and lessons are stored locally in SQLite.

## Running Codely

Requirements: Node.js, Rust and Tauri. Rust targets also need to be installed. See the Tauri documentation for more information.

```bash
npm install
npm run tauri dev
```

To build the desktop app:

```bash
npm run tauri -- build
```

## Assets

The sprite and backdrop artwork used in Codely lessons comes from the Scratch
Foundation and is used under CC BY-SA 2.0. The files are in
`src-tauri/lesson_assets/shared`.
