# Gradient Playground — Conic CSS Editor

A powerful, interactive gradient editor built with Next.js that allows you to create, edit, and export complex CSS gradients including conic, linear, and radial gradients. Perfect for designers and developers who want to create stunning gradient effects.

## Features

### 🎨 **Multi-Layer Gradient Support**
- Create multiple gradient layers that stack on top of each other
- Support for conic, linear, and radial gradients
- Toggle layers on/off and adjust opacity

### 🎯 **Precise Control**
- Fine-tune gradient direction (from angle in degrees)
- Adjust gradient center position (at X%, Y%)
- Add, remove, and reorder color stops
- Real-time preview with customizable dimensions

### 📋 **Import & Export**
- **Paste CSS from Figma**: Import gradients directly from design tools
- **Export to CSS**: Copy clean CSS code for your projects
- **Export to Tailwind**: Generate Tailwind CSS classes
- **Download CSS files**: Save gradients as .css files

### 🔧 **Advanced Editing**
- Color picker and hex code input for each stop
- Drag sliders or input exact degree values for stop positions
- Sort color stops automatically
- Live preview updates as you edit

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the gradient editor.

## How to Use

1. **Start with the default example** or click "Reset example" to see a complex conic gradient
2. **Add layers** using the "+ Add layer" button to create multi-layered effects
3. **Select a layer** to edit its properties (type, angle, position, opacity)
4. **Edit color stops** by clicking on colors, adjusting positions, or adding/removing stops
5. **Import from Figma** by pasting CSS gradient code into the import section
6. **Export your work** using the copy buttons for CSS or Tailwind classes

## Perfect For

- 🎨 **Designers** creating complex gradient backgrounds
- 👩‍💻 **Developers** who need precise CSS gradient code
- 🔄 **Design-to-code workflows** with Figma integration
- 📱 **Responsive design** with customizable preview dimensions

## Tech Stack

This project is built with:
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Hooks** - Modern React patterns for state management

## Project Structure

```
src/app/
├── GradientPlayground.tsx  # Main gradient editor component
├── page.tsx               # Home page that renders the playground
├── layout.tsx             # App layout
└── globals.css           # Global styles
```

## Contributing

Feel free to open issues and pull requests to improve the gradient editor!

## Learn More

To learn more about Next.js and the technologies used:

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
