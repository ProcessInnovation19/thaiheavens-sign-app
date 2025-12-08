# Documentation Site

## Quick Start

### Development Mode

```bash
npm run dev
```

The documentation will be available at: **http://localhost:5173**

### Build

```bash
npm run build
```

Output: `.vitepress/dist/`

### Preview

```bash
npm run preview
```

Preview the built documentation.

## Troubleshooting

If you don't see anything:

1. **Check if the server is running:**
   - Look for "Local: http://localhost:5173" in the terminal
   - Make sure port 5173 is not already in use

2. **Check the browser:**
   - Open http://localhost:5173
   - Try a hard refresh (Ctrl+F5)

3. **Check for errors:**
   - Look at the terminal output for error messages
   - Check the browser console (F12)

4. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## File Structure

- `index.md` - Home page
- `DEVELOPER.md` - Developer documentation
- `USER_GUIDE.md` - User guide
- `AI_README_FOR_REPLICATION.md` - AI replication guide
- `*.md` - Diagram documentation files
- `.vitepress/config.mts` - VitePress configuration


