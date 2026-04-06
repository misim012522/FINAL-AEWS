# Academic Early Warning System Frontend

React + Vite frontend for the Academic Early Warning System.

## Development

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- Student `View Details` now shows:
  - AI risk summary
  - top contributing signals
  - hardest midterm topics
  - AMU referral controls
- The UI reads the backend's dynamic model profile:
  - `early_warning`
  - `midterm_endterm`
