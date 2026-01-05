# Next.js Application - Development Guide

## Important: Do NOT Use VS Code Live Server

This is a **Next.js application**, which requires a proper Node.js server environment. VS Code Live Server is only for static HTML files and will NOT work with this project.

## How to Run This Application

### Development Mode

```bash
npm run dev
```

Then open your browser to: **http://localhost:3000**

### Production Build

```bash
npm run build
npm run start
```

## VS Code Debugging

This project includes VS Code launch configurations. Use the Debug panel (F5) to:
- **Next.js: debug server-side** - Debug the Next.js server
- **Next.js: debug client-side** - Debug in Chrome browser

## Project Structure

- `/app` - Next.js 13 App Router pages and layouts
- `/components` - React components
- `/lib` - Utility functions and helpers
- `/supabase` - Database migrations
- `/public` - Static assets

## Available Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types

## Key Features

- Next.js 13 with App Router
- Supabase authentication and database
- Tailwind CSS for styling
- shadcn/ui component library
- TypeScript for type safety

## Environment Variables

Make sure your `.env` file contains:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Need Help?

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
