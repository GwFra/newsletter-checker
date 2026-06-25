# Backend Overview

This repository contains a simple backend service written in TypeScript using Express.

## Key points

- Uses TypeScript for type-safe server-side development.
- Uses Express as the web framework.
- Provides a simple `GET /` endpoint that returns a hello world response.
- Includes a TypeScript build and development setup. Where the development setup auto builds when a change is detected within the files

## Startup

1. Install dependencies: `npm install`
2. Start in development mode: `npm run dev`
3. Build for production: `npm run build`
4. Run the built server: `npm start`

## Example endpoint

- `GET /` → returns a JSON response like:
  - `{ "message": "Hello, world!" }`

## Notes

The backend is organized as a TypeScript Express app with a project config in `tsconfig.json` and package scripts in `package.json`.
