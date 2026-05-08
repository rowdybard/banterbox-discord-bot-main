# Routes.ts Fix Plan

## Problem
The routes.ts file is severely broken from incomplete marketplace removal edits. There are:
- Orphaned code fragments (sample data arrays, incomplete try-catch blocks)
- Missing closing braces and parentheses
- Broken function definitions
- ~100+ TypeScript errors

## Root Cause
Attempted to remove marketplace code in small chunks, but didn't complete the removal of large multi-line blocks, leaving orphaned fragments.

## Solution
Need to identify the exact line ranges of all broken code and remove it systematically.

### Key Issues to Fix:
1. **Line ~2509**: Broken error response - missing closing brace
2. **Lines 2514-2608**: Orphaned marketplace sample data and try-catch
3. **Lines 2610-2800+**: Orphaned marketplace download endpoints
4. **Line ~2968-2994**: Firebase marketplace import in voice-builder/save
5. **Line ~3155**: Import of deleted marketplace-endpoints module
6. **Multiple locations**: All `elevenLabsService` references (~30 errors)
7. **Multiple locations**: All `firebaseMarketplaceService` references

### Approach:
1. Find the last working endpoint before the broken section
2. Find the next working endpoint after the broken section  
3. Remove everything in between
4. Repeat for all broken sections
5. Remove the marketplace-endpoints import at the end
6. Address ElevenLabs references separately

## Current Status
File is completely unbuildable with 100+ errors. Need systematic cleanup.
