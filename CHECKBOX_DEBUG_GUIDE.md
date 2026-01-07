# Mission Checkbox Debug Guide

## What Was Added

### 1. **Comprehensive Console Logging**

The checkbox now logs detailed information at every step:

**Button Click (missions/page.tsx:263)**
```
🔘 Checkbox button clicked! <mission-id>
```

**Handler Entry (missions/page.tsx:79-84)**
```
🎯 Toggle Complete Clicked: {
  missionId: "...",
  title: "...",
  currentStatus: "active" or "completed",
  willBecome: "completed" or "active"
}
```

**Database Call Start (missions-service.ts:129)**
```
📝 completeMission called: { missionId: "...", timestamp: "..." }
```
OR
```
📝 uncompleteMission called: { missionId: "..." }
```

**Database Success (missions-service.ts:151 or 176)**
```
✅ completeMission success: { id: "...", completed_at: "..." }
```
OR
```
✅ uncompleteMission success: { id: "...", completed_at: null }
```

**Handler Success (missions/page.tsx:91-95)**
```
✅ Mission updated: {
  id: "...",
  completed_at: "..." or null,
  success: true
}
```

**Error Logging (missions/page.tsx:100-105 or missions-service.ts:147/172)**
```
❌ Failed to update mission status: {
  error: "error message",
  details: {...},
  missionId: "..."
}
```

---

## How to Debug

### Step 1: Open Browser Console

1. Open your app in browser
2. Press `F12` or right-click → Inspect
3. Go to "Console" tab
4. Clear the console (trash icon)

### Step 2: Test the Checkbox

1. Navigate to Master Missions page
2. Find any mission
3. Click the checkbox (empty square or green checkmark)
4. **Watch the console output**

### Step 3: Interpret the Results

#### ✅ **SCENARIO 1: Everything Works**
```
🔘 Checkbox button clicked! abc123
🎯 Toggle Complete Clicked: { missionId: "abc123", ... }
📝 completeMission called: { missionId: "abc123", ... }
✅ completeMission success: { id: "abc123", completed_at: "2026-..." }
✅ Mission updated: { id: "abc123", completed_at: "2026-...", success: true }
```
**Toast shows:** "Mission completed!" or "Mission reopened"
**Visual:** Checkbox fills green with checkmark (or clears)

**Diagnosis:** ✅ Working perfectly!

---

#### ❌ **SCENARIO 2: Click Not Registering**
```
(No console output at all)
```

**Diagnosis:** Click event not firing

**Possible Causes:**
1. Button is covered by another element (z-index issue)
2. CSS `pointer-events: none` somewhere
3. Row click handler intercepting
4. Browser extension blocking clicks

**Fix Attempts:**
```bash
# In browser console, test directly:
document.querySelector('button[aria-label*="Mark as"]').click()
```

If this works, it's a z-index/overlay issue.

---

#### ❌ **SCENARIO 3: Click Registered, Handler Not Called**
```
🔘 Checkbox button clicked! abc123
(Stops here - no "🎯 Toggle Complete Clicked")
```

**Diagnosis:** Event propagation issue or handler not defined

**Possible Causes:**
1. `handleToggleComplete` function not in scope
2. React re-render removed the handler
3. Error in handler before first log

**Fix:** Check if missions state is empty or component re-rendered

---

#### ❌ **SCENARIO 4: Handler Called, Database Error**
```
🔘 Checkbox button clicked! abc123
🎯 Toggle Complete Clicked: { ... }
📝 completeMission called: { ... }
❌ completeMission DB error: {
  code: "42P01",
  message: "relation \"missions\" does not exist"
}
```

**Diagnosis:** Database schema issue

**Possible Causes:**
1. Migrations not applied
2. Wrong database connected
3. Table name mismatch

**Fix:**
```bash
# Check Supabase dashboard → Table Editor
# Verify "missions" table exists with "completed_at" column
```

---

#### ❌ **SCENARIO 5: Database Success, State Not Updating**
```
🔘 Checkbox button clicked! abc123
🎯 Toggle Complete Clicked: { ... }
📝 completeMission called: { ... }
✅ completeMission success: { id: "abc123", completed_at: "2026-..." }
✅ Mission updated: { id: "abc123", completed_at: "2026-...", success: true }
(But checkbox doesn't change visually)
```

**Diagnosis:** React state update issue

**Possible Causes:**
1. Mission ID mismatch in state array
2. State mutation instead of immutable update
3. React not re-rendering

**Fix:** Check if `setMissions` is using `.map()` correctly

---

#### ❌ **SCENARIO 6: RLS Policy Blocking**
```
🔘 Checkbox button clicked! abc123
🎯 Toggle Complete Clicked: { ... }
📝 completeMission called: { ... }
❌ completeMission DB error: {
  code: "42501",
  message: "new row violates row-level security policy"
}
```

**Diagnosis:** RLS policy preventing update

**Possible Causes:**
1. User not authenticated
2. RLS policy checking wrong user_id
3. Auth token expired

**Fix:**
```sql
-- In Supabase SQL Editor, check policy:
SELECT * FROM pg_policies WHERE tablename = 'missions';

-- Test query as user:
UPDATE missions SET completed_at = NOW() WHERE id = '<mission-id>';
```

---

#### ❌ **SCENARIO 7: Column Name Mismatch**
```
🔘 Checkbox button clicked! abc123
🎯 Toggle Complete Clicked: { ... }
📝 completeMission called: { ... }
❌ completeMission DB error: {
  code: "42703",
  message: "column \"completed_at\" does not exist"
}
```

**Diagnosis:** Database column named differently

**Possible Causes:**
1. Column is `completedAt` (camelCase) not `completed_at` (snake_case)
2. Column doesn't exist
3. Wrong table structure

**Fix:**
```sql
-- In Supabase SQL Editor:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'missions';
```

Look for completion-related columns. If it's named differently, update `missions-service.ts:135` to match.

---

## Quick Diagnostic Checklist

Run through these in order:

### 1. ✅ Button Renders
- [ ] Can you see the checkbox?
- [ ] Does it have a border?
- [ ] Does hover change the color?

### 2. ✅ Click Events Fire
- [ ] Console shows "🔘 Checkbox button clicked!"?
- [ ] If not, try clicking empty space near checkbox

### 3. ✅ Handler Executes
- [ ] Console shows "🎯 Toggle Complete Clicked"?
- [ ] If not, check browser console for JavaScript errors

### 4. ✅ Database Call Made
- [ ] Console shows "📝 completeMission called"?
- [ ] If not, check if functions are imported correctly

### 5. ✅ Database Succeeds
- [ ] Console shows "✅ completeMission success"?
- [ ] If not, check error message for SQL/RLS issues

### 6. ✅ State Updates
- [ ] Console shows "✅ Mission updated"?
- [ ] If not, check React state logic

### 7. ✅ UI Re-renders
- [ ] Checkbox changes color?
- [ ] Toast notification appears?
- [ ] If not, force refresh (Cmd+Shift+R / Ctrl+Shift+R)

---

## Database Schema Verification

Run this in Supabase SQL Editor:

```sql
-- Check missions table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'missions'
ORDER BY ordinal_position;

-- Expected columns:
-- id               | uuid      | NO  | gen_random_uuid()
-- user_id          | uuid      | NO  |
-- title            | text      | NO  |
-- battlefront_id   | uuid      | YES | NULL
-- start_at         | timestamp | YES | NULL
-- due_date         | date      | YES | NULL
-- duration_minutes | integer   | NO  | 60
-- completed_at     | timestamp | YES | NULL  ← THIS ONE!
-- created_at       | timestamp | NO  | now()
-- updated_at       | timestamp | NO  | now()
```

If `completed_at` doesn't exist:

```sql
-- Add the column
ALTER TABLE missions
ADD COLUMN completed_at timestamptz DEFAULT NULL;
```

---

## Manual Database Test

Test the update directly in Supabase SQL Editor:

```sql
-- Get a mission ID
SELECT id, title, completed_at FROM missions LIMIT 1;

-- Try to complete it (replace <mission-id>)
UPDATE missions
SET completed_at = NOW(), updated_at = NOW()
WHERE id = '<mission-id>'
RETURNING *;

-- Check if it worked
SELECT id, title, completed_at FROM missions WHERE id = '<mission-id>';

-- Uncomplete it
UPDATE missions
SET completed_at = NULL, updated_at = NOW()
WHERE id = '<mission-id>'
RETURNING *;
```

If these work but the app doesn't, it's a frontend issue.
If these fail, it's a database/RLS issue.

---

## Common Fixes

### Fix 1: Z-Index / Overlay Issue
```tsx
// In missions/page.tsx, add to button:
style={{ position: 'relative', zIndex: 10 }}
```

### Fix 2: Force Pointer Events
```tsx
// In missions/page.tsx, add to button className:
className="... !pointer-events-auto"
```

### Fix 3: Remove Row Handlers
Check if `<tr>` has onClick that's interfering:
```tsx
<tr
  key={mission.id}
  // onClick={...} ← Remove this if present
>
```

### Fix 4: Direct Supabase Call (Bypass Service)
Test if services layer is the issue:

```tsx
// In missions/page.tsx, temporarily replace handleToggleComplete:
const handleToggleComplete = async (mission: Mission) => {
  console.log('🔘 Direct DB test');

  const { data, error } = await supabase
    .from('missions')
    .update({
      completed_at: mission.completed_at ? null : new Date().toISOString()
    })
    .eq('id', mission.id)
    .select()
    .single();

  if (error) {
    console.error('❌ Direct DB error:', error);
  } else {
    console.log('✅ Direct DB success:', data);
    setMissions(missions.map((m) => (m.id === mission.id ? data : m)));
  }
};
```

If this works, issue is in missions-service.ts.

---

## Report Back

When you test, provide these details:

1. **What appears in console?** (copy/paste full logs)
2. **Any errors?** (red text in console)
3. **Does the checkbox change color?**
4. **Does a toast appear?**
5. **After refresh, is mission still completed?**

This will pinpoint the exact issue!

---

## Current Code Improvements

✅ Added `type="button"` to prevent form submission
✅ Added `e.preventDefault()` and `e.stopPropagation()`
✅ Added `cursor-pointer` class
✅ Added `aria-label` for accessibility
✅ Added comprehensive console logging throughout stack
✅ Added error logging with full context

---

**Next Step:** Open the app, click a checkbox, and check console output!
