# GOS COMMAND - IMPLEMENTATION MAP

## PROJECT BASELINE

### Existing Routes
- `/dashboard` - Main dashboard
- `/dashboard/missions` - Master Missions (HAS duration_minutes)
- `/dashboard/calendar` - Empty placeholder
- `/dashboard/warmap` - Battlefronts map
- `/dashboard/warroom` - Empty placeholder
- `/dashboard/systems` - Empty placeholder
- `/dashboard/strategy` - Grand Strategy
- `/dashboard/scoreboard` - Stats
- `/dashboard/battlefront/[id]` - Individual battlefront
- `/dashboard/notifications` - Notifications

### Existing Database Tables
```
✓ battlefronts (user_id, name, status, binary_exit_target)
✓ missions (user_id, battlefront_id, title, attack_date, due_date, duration_minutes, status)
✓ checkpoints (user_id, battlefront_id, title, order_index, done)
✓ calendar_events (user_id, mission_id, battlefront_id, title, start_time, end_time, locked)
✓ conversations (user_id, title, last_message_at, metadata)
✓ messages (conversation_id, user_id, role, content, metadata)
```

### Command Bot Status
- ✓ Working at `/api/command`
- ✓ Handles: create mission, list missions, create battlefront, schedule events
- ✓ Authenticated with request headers
- ✓ Netlify-compatible

---

## IMPLEMENTATION PLAN

### PHASE 1: Database Migrations (20 min)
**New Tables Needed:**
1. `war_room_rules` - Code of Honor items
2. `war_room_nonnegotiables` - Daily commitments
3. `war_room_disqualifiers` - Day-fail behaviors
4. `war_room_reviews` - Weekly review entries
5. `system_thinking_docs` - System Thinking documents
6. `system_thinking_inputs` - Input items
7. `system_thinking_steps` - Process steps
8. `system_thinking_output` - Output/results

**Status:** In progress

---

### PHASE 2: Editable Mission Duration (30 min)
**Files to Modify:**
- `app/dashboard/missions/page.tsx` - Add inline editor
- `components/duration-editor.tsx` - NEW component
- `lib/duration-parser.ts` - NEW parser utility

**Features:**
- Click duration badge to edit
- Parse: `60`, `1h`, `1h30m`, `90m`
- Instant save on Enter/blur
- Cancel on Esc
- Toast feedback
- Optimistic update

**Status:** Pending

---

### PHASE 3: Visual Calendar (2 hours)
**Files to Create:**
- `components/calendar/week-view.tsx` - Main week grid
- `components/calendar/calendar-event.tsx` - Draggable event block
- `components/calendar/event-editor.tsx` - Edit modal
- `components/calendar/time-grid.tsx` - Time axis + grid
- `lib/calendar-utils.ts` - Date/time helpers

**Features:**
- Week view (Mon-Sun)
- Hour grid (6am-10pm configurable)
- Drag events to move
- Resize events (top/bottom)
- Click + drag empty space to create
- Click event to edit
- Link to missions/battlefronts
- Timezone: EST (America/Toronto)

**Status:** Pending

---

### PHASE 4: War Room (1 hour)
**Files to Create:**
- `app/dashboard/warroom/page.tsx` - Replace placeholder
- `components/war-room/code-of-honor.tsx` - Editable rules
- `components/war-room/non-negotiables.tsx` - Daily checkboxes
- `components/war-room/disqualifiers.tsx` - Fail behaviors
- `components/war-room/weekly-review.tsx` - Review text

**Features:**
- 4 sections (cards)
- Add/remove items
- Daily checkboxes
- Weekly review with timestamp
- All persisted to Supabase

**Status:** Pending

---

### PHASE 5: System Thinking (1 hour)
**Files to Create:**
- `app/dashboard/systems/page.tsx` - Replace placeholder
- `components/system-thinking/input-section.tsx` - Input editor
- `components/system-thinking/process-section.tsx` - Steps editor
- `components/system-thinking/output-section.tsx` - Output editor
- `components/system-thinking/step-item.tsx` - Draggable step

**Features:**
- 3 fixed sections: INPUT → PROCESS → OUTPUT
- Input: free text + bullet items
- Process: ordered steps with drag/drop
- Output: structured fields (result, actions, outcome, risks)
- Auto-save

**Status:** Pending

---

### PHASE 6: Enhanced Command Bot (30 min)
**Files to Modify:**
- `lib/command-parser.ts` - Add new patterns
- `app/api/command/route.ts` - Add handlers

**New Commands:**
- "build mission X tomorrow 2pm for 1 hour" → creates mission + calendar event
- "update mission <id> duration 2h"
- "move event <id> to friday 3pm"
- "link event <id> to mission <id>"

**Status:** Pending

---

### PHASE 7: Polish (30 min)
**Tasks:**
- Skeleton loaders everywhere
- Empty states with helpful text
- Consistent hover/focus states
- Toast success/error messages
- Keyboard shortcuts (Esc, Enter)
- Responsive checks

**Status:** Pending

---

## FILES OVERVIEW

### New Components (15 files)
```
components/
  duration-editor.tsx
  calendar/
    week-view.tsx
    calendar-event.tsx
    event-editor.tsx
    time-grid.tsx
  war-room/
    code-of-honor.tsx
    non-negotiables.tsx
    disqualifiers.tsx
    weekly-review.tsx
  system-thinking/
    input-section.tsx
    process-section.tsx
    output-section.tsx
    step-item.tsx
```

### New Utilities (2 files)
```
lib/
  duration-parser.ts
  calendar-utils.ts
```

### Modified Files (5 files)
```
app/dashboard/missions/page.tsx
app/dashboard/calendar/page.tsx
app/dashboard/warroom/page.tsx
app/dashboard/systems/page.tsx
lib/command-parser.ts
app/api/command/route.ts
```

### New Migrations (2 files)
```
supabase/migrations/
  XXXXXX_war_room_tables.sql
  XXXXXX_system_thinking_tables.sql
```

---

## ESTIMATED TIMELINE

Total: ~6 hours of focused development

1. Database: 20 min ✓
2. Duration Editor: 30 min
3. Calendar: 2 hours
4. War Room: 1 hour
5. System Thinking: 1 hour
6. Command Bot: 30 min
7. Polish: 40 min

---

## SUCCESS CRITERIA

✓ Mission duration editable inline with natural language parsing
✓ Calendar shows week view with drag/drop/resize
✓ Calendar creates events by dragging on empty grid
✓ War Room has 4 functional sections with persistence
✓ System Thinking has Input/Process/Output structure
✓ Command bot can create missions with calendar blocks
✓ All features have loading states and error handling
✓ Build succeeds with zero TypeScript errors
✓ Netlify-compatible (no next/headers)
