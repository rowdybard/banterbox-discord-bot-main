# Cleanup Status: Removing Firebase, ElevenLabs, and Marketplace

## ✅ Completed

### Files Deleted
- ✅ `server/replitAuth.ts`
- ✅ `server/firebase.ts`
- ✅ `server/firebaseStorage.ts`
- ✅ `server/firebaseDb.ts`
- ✅ `server/firebaseMarketplace.ts`
- ✅ `server/firebaseContextService.ts`
- ✅ `server/elevenlabs.ts`
- ✅ `server/marketplace.ts`
- ✅ `server/marketplace-endpoints.ts`
- ✅ `client/src/pages/marketplace.tsx`
- ✅ `client/src/pages/voice-marketplace.tsx`
- ✅ `client/src/components/marketplace/` (entire directory)
- ✅ `MARKETPLACE.md`

### Schema Updated
- ✅ Removed marketplace tables from `shared/schema.ts`:
  - `marketplaceVoices`
  - `marketplacePersonalities`
  - `userDownloads`
  - `userRatings`
  - `contentReports` (kept table, removed marketplace-specific exports)
- ✅ Removed marketplace type exports
- ✅ Fixed broken schema structure

### Files Fixed
- ✅ `server/discordAuth.ts` - Uses `localAuth` instead of `replitAuth`
- ✅ `server/contextService.ts` - Stubbed out (needs database implementation later)
- ✅ `server/routes.ts` - Removed all `firebaseStorage` references

## ⚠️ Still In Progress

### `server/routes.ts` - Large File Needs Cleanup

**Marketplace Routes to Remove** (8 endpoints, ~700 lines):
1. Line 2374-2452: `GET /api/marketplace/personalities`
2. Line 2550-2558: `POST /api/marketplace/personalities` (legacy redirect)
3. Line 2560-2619: `POST /api/marketplace/personalities/:id/download`
4. Line 2623-2803: `POST /api/marketplace/personalities/:id/download-sample`
5. Line 2807-2899: `GET /api/marketplace/voices`
6. Line 2903-2994: `GET /api/marketplace/voices/sample`
7. Line 2997-3058: `POST /api/marketplace/voices/:id/download`
8. Line 3062-3150+: `POST /api/marketplace/voices/:id/download-sample`

**Also need to update:**
- Line 2455-2547: `POST /api/personality-builder/save` - Remove marketplace submission code

**ElevenLabs References** (~30 errors):
- Lines 386-437: Twitch banter voice generation
- Lines 517-552: generateTTS function
- Lines 642-702: Discord banter voice generation
- Lines 2028-2070: ElevenLabs voices endpoint
- Line 3217: Voice preview
- Other scattered references

## 🎯 Next Steps

1. **Remove all marketplace routes from routes.ts** (~700 lines to delete)
2. **Remove ElevenLabs voice generation** - Replace with OpenAI TTS only
3. **Update package.json** - Remove unused dependencies
4. **Update .env.example** - Remove Firebase/ElevenLabs variables
5. **Test compilation** - Run `npm run check`

## Current Error Count
- ~30 TypeScript errors (all from removed services)
- All will be fixed once refactoring completes

## Strategy
Since routes.ts is very large (~3900 lines), the safest approach is:
1. Remove marketplace endpoints in batches
2. Remove ElevenLabs code systematically
3. Test compilation after each major change
4. Keep only OpenAI TTS for voice generation
