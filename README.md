# Member GSheet Boilerplate

A modern, industry-standard boilerplate for a Google Sheets-powered membership/admin panel.

## Features
- Google Sheets as backend (CRUD)
- Modular code structure
- Responsive, mobile-first UI with side panel navigation
- Robust form validation
- API routing abstraction (easy to swap backend)
- Extensible user fields
- Role-based access (admin/user)
- Toast notifications
- Error handling and loading states
- Linting and formatting (ESLint, Prettier)
- Easy deployment (static hosting)

## Setup
1. Clone this repo
2. Copy `config.example.js` to `config.js` and fill in your Google API keys and sheet IDs
3. Run `npm install` (for linting/formatting tools)
4. Open `index.html` in your browser (or deploy to static hosting)

## Development
- All source code is in the root folder
- Edit/add user: `/user-form.html` (add or edit mode)
- API logic: `user.js`, `api/`
- UI logic: `app.js`, `user-form.js`

## Linting/Formatting
- Run `npm run lint` to check code style
- Run `npm run format` to auto-format code

## Deployment
- Deploy the static files to any static host (GitHub Pages, Netlify, Vercel, etc)

## Security
- Do not expose sensitive keys in public repos
- Sanitize all user input

## License
MIT
