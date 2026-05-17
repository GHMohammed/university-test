## Remove GPS — full permanent cleanup

Attendance becomes QR-only. Audited all GPS references; below is the exact change set.

### 1) Edge function — `supabase/functions/submit-attendance/index.ts`
- Drop `latitude`/`longitude` from request interface and JSON body parsing.
- Remove `calculateDistance()` and the entire GPS validation block (gps_enabled check, classroom radius check, error responses).
- Stop selecting classroom lat/lng/radius — narrow the session select to fields actually used.
- Insert attendance with: `attendance_status: 'present'`, `attendance_source: 'qr'`, no `gps_status`/`latitude`/`longitude`.
- Remove `gps_enabled` from response payload.
- Validation kept: auth, valid QR token, session active, QR not expired, enrollment, duplicate prevention.

### 2) Student frontend — `src/pages/student/StudentScan.tsx`
- Remove `navigator.geolocation` calls and `submitToken(token, lat, lng)` overload.
- `handleScan` calls `submitMutation.mutate({ qr_token })` directly.

### 3) Instructor frontend
- `src/pages/instructor/InstructorSessionDetail.tsx`: remove `gpsEnabled`, the GPS status row, the GPS toggle switch, `MapPin` import, `useToggleGps` usage. Keep the rest of the session details intact.
- `src/pages/instructor/InstructorSessionLive.tsx`: remove the entire GPS card block (status badge + toggle).

### 4) Hooks / types
- `src/hooks/useSessions.ts`: remove `gps_enabled` from `SessionWithRelations`, drop classroom `latitude/longitude/allowed_radius_meters` from select + type, remove `useToggleGps` hook entirely.
- `src/hooks/useAttendance.ts`: remove `gps_status`, `latitude`, `longitude` from `AttendanceWithDetails`; `useSubmitAttendance` body becomes `{ qr_token }`; drop `gps_status` from optimistic update.
- `src/types/index.ts`: remove `GPSStatus`, drop `gps_status`/`latitude`/`longitude` from `AttendanceRecord`.

### 5) Database migration (destructive)
New migration `supabase/migrations/<ts>_remove_gps.sql`:
```sql
ALTER TABLE public.lecture_sessions   DROP COLUMN IF EXISTS gps_enabled;
ALTER TABLE public.attendance_records DROP COLUMN IF EXISTS gps_status;
ALTER TABLE public.attendance_records DROP COLUMN IF EXISTS latitude;
ALTER TABLE public.attendance_records DROP COLUMN IF EXISTS longitude;
DROP TYPE IF EXISTS public.gps_status;
```
Audit result: no indexes, triggers, RLS policies, FKs, or DB functions reference these columns or the `gps_status` enum — safe to drop.

**Classroom columns kept** (`classrooms.latitude/longitude/allowed_radius_meters`): not in the destructive scope you listed and only consumed by the existing Admin Classrooms map UI, which is unrelated to attendance. They become unused by the attendance flow but the admin map page remains functional. Tell me if you also want them removed and I'll extend the migration + strip `AdminClassrooms.tsx`/`useClassrooms.ts`.

### 6) i18n cleanup — `src/lib/i18n.tsx`
Remove keys (both AR and EN): `gps.status`, `gps.enabled`, `gps.disabled`, `gps.toggle_label`, `gps.toggle_desc`. Keep `crud.latitude`/`crud.longitude`/`crud.radius` only if classroom columns are kept (used by `AdminClassrooms.tsx`).

### 7) Validation
- Build passes (no TS errors after types/hooks updated together with consumers).
- Historical attendance records remain readable: dropped columns are not selected anywhere after this cleanup; UI doesn't render them.
- Auto-regenerated `src/integrations/supabase/types.ts` will reflect the dropped columns post-migration.

### Files to modify
- `supabase/functions/submit-attendance/index.ts`
- `src/pages/student/StudentScan.tsx`
- `src/pages/instructor/InstructorSessionDetail.tsx`
- `src/pages/instructor/InstructorSessionLive.tsx`
- `src/hooks/useSessions.ts`
- `src/hooks/useAttendance.ts`
- `src/types/index.ts`
- `src/lib/i18n.tsx`
- `supabase/migrations/<new>_remove_gps.sql` (new)

### DB columns removed
- `lecture_sessions.gps_enabled`
- `attendance_records.gps_status`
- `attendance_records.latitude`
- `attendance_records.longitude`
- enum type `public.gps_status`

After your approval I'll switch to build mode and apply everything in one pass.
