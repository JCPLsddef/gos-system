# Public Assets Directory

## PWA Icons (Required for manifest.json)

The manifest.json references these icon files:
- `icon-192.png` (192x192px)
- `icon-512.png` (512x512px)

### How to generate icons:

1. **Option 1: Create a simple placeholder**
   - Go to https://www.favicon-generator.org/
   - Upload any logo or image
   - Download the generated icons
   - Rename them to `icon-192.png` and `icon-512.png`

2. **Option 2: Use an online PWA icon generator**
   - Go to https://realfavicongenerator.net/
   - Upload your logo
   - Generate all required sizes

3. **Option 3: Temporary fix (if you don't have icons yet)**
   - Create simple colored squares using an image editor
   - Or remove the `manifest` line from `app/layout.tsx` temporarily

### Current Status:
⚠️ Icons are not yet present. Add them before deploying to production.

For now, you can:
- Ignore the 404 for icons (non-critical)
- Or add placeholder images
- Or comment out the manifest line in layout.tsx
