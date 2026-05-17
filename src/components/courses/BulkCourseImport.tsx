import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useI18n } from '@/lib/i18n';
import { useCreateCourse } from '@/hooks/useCourses';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Download, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

type RowStatus =
  | 'valid'
  | 'missing_fields'
  | 'duplicate_course_code'
  | 'duplicate_in_file'
  | 'instructor_not_found'
  | 'ambiguous_instructor';

interface ParsedRow {
  rowNum: number;
  name: string;
  course_code: string;
  department: string;
  instructor_input: string;
  matched_instructor_id: string | null;
  matched_instructor_name: string;
  description: string;
  status: RowStatus;
  statusDetail?: string;
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}

const REQUIRED_COLUMNS = ['name', 'course_code', 'department', 'instructor'];

export function BulkCourseImport() {
  const { t } = useI18n();
  const createMutation = useCreateCourse();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [phase, setPhase] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  const reset = () => {
    setRows([]);
    setPhase('upload');
    setResult(null);
    setImportProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['name', 'course_code', 'department', 'instructor', 'description'],
      ['Intro to AI', 'CS101', 'CS', 'sara@example.com', 'Foundations of artificial intelligence'],
      ['Data Structures', 'CS201', 'CS', 'Dr. Sara Khan', ''],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Courses');
    XLSX.writeFile(wb, 'course_import_template.xlsx');
  };

  const exportCurrentData = async () => {
    try {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('name, code, department, description, instructor_id')
        .order('code');
      if (error) throw error;
      if (!courses || courses.length === 0) {
        toast.error(t('no_data'));
        return;
      }
      const instructorIds = Array.from(
        new Set(courses.map(c => c.instructor_id).filter(Boolean) as string[])
      );
      let instructorMap = new Map<string, string>();
      if (instructorIds.length > 0) {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', instructorIds);
        if (pErr) throw pErr;
        (profs ?? []).forEach(p => {
          instructorMap.set(p.id, p.email || p.full_name || '');
        });
      }
      const rowsOut = courses.map(c => ({
        name: c.name ?? '',
        course_code: c.code ?? '',
        department: c.department ?? '',
        instructor: c.instructor_id ? (instructorMap.get(c.instructor_id) ?? '') : '',
        description: c.description ?? '',
      }));
      const ws = XLSX.utils.json_to_sheet(rowsOut, {
        header: ['name', 'course_code', 'department', 'instructor', 'description'],
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Courses');
      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `courses_export_${stamp}.xlsx`);
      toast.success(t('bulk_students.export_success'));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      toast.error(t('bulk_students.file_format_error'));
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

      if (jsonData.length === 0) {
        toast.error(t('no_data'));
        return;
      }

      const headers = Object.keys(jsonData[0]).map(h => h.trim().toLowerCase());
      const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c));
      if (missing.length > 0) {
        toast.error(`${t('bulk_students.missing_columns')}: ${missing.join(', ')}`);
        return;
      }

      const { data: existingCourses } = await supabase.from('courses').select('code');
      const existingCodes = new Set((existingCourses || []).map(c => c.code.toLowerCase()));

      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'instructor');
      const instructorIds = (roles || []).map(r => r.user_id);
      let instructors: { id: string; full_name: string; email: string }[] = [];
      if (instructorIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', instructorIds);
        instructors = profs || [];
      }
      const byEmail = new Map<string, { id: string; full_name: string }>();
      const byName = new Map<string, { id: string; full_name: string }[]>();
      for (const ins of instructors) {
        byEmail.set(ins.email.toLowerCase(), { id: ins.id, full_name: ins.full_name });
        const key = ins.full_name.trim().toLowerCase();
        const arr = byName.get(key) || [];
        arr.push({ id: ins.id, full_name: ins.full_name });
        byName.set(key, arr);
      }

      const codesInFile = new Map<string, number>();
      const parsed: ParsedRow[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const raw = jsonData[i];
        const row: ParsedRow = {
          rowNum: i + 2,
          name: String(raw.name || raw.Name || raw.NAME || '').trim(),
          course_code: String(raw.course_code || raw.Course_Code || raw.COURSE_CODE || raw.code || '').trim(),
          department: String(raw.department || raw.Department || raw.DEPARTMENT || '').trim(),
          instructor_input: String(raw.instructor || raw.Instructor || raw.INSTRUCTOR || '').trim(),
          matched_instructor_id: null,
          matched_instructor_name: '',
          description: String(raw.description || raw.Description || raw.DESCRIPTION || '').trim(),
          status: 'valid',
        };

        if (!row.name || !row.course_code || !row.department || !row.instructor_input) {
          row.status = 'missing_fields';
          row.statusDetail = [
            !row.name && 'name',
            !row.course_code && 'course_code',
            !row.department && 'department',
            !row.instructor_input && 'instructor',
          ].filter(Boolean).join(', ');
          parsed.push(row);
          continue;
        }

        const codeLower = row.course_code.toLowerCase();
        if (codesInFile.has(codeLower)) {
          row.status = 'duplicate_in_file';
          row.statusDetail = `course_code (row ${codesInFile.get(codeLower)})`;
          parsed.push(row);
          continue;
        }
        codesInFile.set(codeLower, row.rowNum);

        if (existingCodes.has(codeLower)) {
          row.status = 'duplicate_course_code';
          parsed.push(row);
          continue;
        }

        const insLower = row.instructor_input.toLowerCase();
        const isEmail = insLower.includes('@');
        if (isEmail) {
          const m = byEmail.get(insLower);
          if (m) {
            row.matched_instructor_id = m.id;
            row.matched_instructor_name = m.full_name;
          } else {
            row.status = 'instructor_not_found';
            parsed.push(row);
            continue;
          }
        } else {
          const matches = byName.get(insLower) || [];
          if (matches.length === 0) {
            row.status = 'instructor_not_found';
            parsed.push(row);
            continue;
          } else if (matches.length > 1) {
            row.status = 'ambiguous_instructor';
            row.statusDetail = `${matches.length} matches`;
            parsed.push(row);
            continue;
          }
          row.matched_instructor_id = matches[0].id;
          row.matched_instructor_name = matches[0].full_name;
        }

        parsed.push(row);
      }

      setRows(parsed);
      setPhase('preview');
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse file');
    }
  };

  const validRows = rows.filter(r => r.status === 'valid');
  const invalidRows = rows.filter(r => r.status !== 'valid');

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setPhase('importing');
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await createMutation.mutateAsync({
          name: row.name,
          code: row.course_code,
          department: row.department || null,
          description: row.description || null,
          instructor_id: row.matched_instructor_id,
        });
        imported++;
      } catch (err: any) {
        failed++;
        errors.push(`Row ${row.rowNum}: ${err.message}`);
      }
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setResult({
      total: rows.length,
      imported,
      skipped: invalidRows.length,
      failed,
      errors,
    });
    setPhase('done');
  };

  const statusBadge = (row: ParsedRow) => {
    const map: Record<RowStatus, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; label: string }> = {
      valid: { variant: 'default', label: t('bulk_students.status_valid') },
      missing_fields: { variant: 'destructive', label: t('bulk_students.status_missing') },
      duplicate_course_code: { variant: 'secondary', label: t('bulk_courses.status_dup_code') },
      duplicate_in_file: { variant: 'outline', label: t('bulk_students.status_dup_file') },
      instructor_not_found: { variant: 'destructive', label: t('bulk_courses.status_ins_not_found') },
      ambiguous_instructor: { variant: 'destructive', label: t('bulk_courses.status_ambiguous') },
    };
    const cfg = map[row.status];
    return (
      <Badge variant={cfg.variant}>
        {cfg.label}
        {row.statusDetail && <span className="ms-1 text-xs opacity-75">({row.statusDetail})</span>}
      </Badge>
    );
  };

  if (phase === 'upload') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{t('bulk_courses.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('bulk_courses.subtitle')}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 me-2" />{t('bulk.download_template')}
              </Button>
              <Button variant="outline" onClick={exportCurrentData}>
                <Download className="h-4 w-4 me-2" />{t('bulk_students.export_current')}
              </Button>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 me-2" />{t('bulk_courses.upload')}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'preview') {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{t('bulk_courses.preview_title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('bulk_students.total_rows')}: {rows.length} · {t('bulk_students.status_valid')}: {validRows.length} · {t('bulk_students.invalid')}: {invalidRows.length}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}><X className="h-4 w-4 me-2" />{t('cancel')}</Button>
              <Button onClick={handleImport} disabled={validRows.length === 0}>
                <CheckCircle className="h-4 w-4 me-2" />{t('bulk.confirm_import')} ({validRows.length})
              </Button>
            </div>
          </div>
          <div className="max-h-[400px] overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t('crud.name')}</TableHead>
                  <TableHead>{t('crud.course_code')}</TableHead>
                  <TableHead>{t('crud.department')}</TableHead>
                  <TableHead>{t('bulk_courses.instructor_file')}</TableHead>
                  <TableHead>{t('bulk_courses.instructor_matched')}</TableHead>
                  <TableHead>{t('crud.description')}</TableHead>
                  <TableHead>{t('crud.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx} className={row.status !== 'valid' ? 'bg-destructive/5' : ''}>
                    <TableCell>{row.rowNum}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.course_code}</TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell>{row.instructor_input}</TableCell>
                    <TableCell className="text-muted-foreground">{row.matched_instructor_name || '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{row.description}</TableCell>
                    <TableCell>{statusBadge(row)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phase === 'importing') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h3 className="text-lg font-semibold">{t('bulk_courses.importing')}</h3>
            <Progress value={importProgress} className="w-64" />
            <p className="text-sm text-muted-foreground">{importProgress}%</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4 py-8">
          {result && result.failed === 0 ? (
            <CheckCircle className="h-10 w-10 text-primary" />
          ) : (
            <AlertCircle className="h-10 w-10 text-accent-foreground" />
          )}
          <h3 className="text-lg font-semibold">{t('bulk.import_complete')}</h3>
          {result && (
            <div className="text-sm text-center space-y-1">
              <p>✅ {t('bulk_students.imported_count')}: {result.imported}</p>
              <p>⏭️ {t('bulk.skipped_count')}: {result.skipped}</p>
              {result.failed > 0 && <p>❌ {t('bulk_students.failed_count')}: {result.failed}</p>}
              {result.errors.length > 0 && (
                <div className="mt-3 max-h-32 overflow-auto text-start bg-destructive/10 rounded p-2">
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-destructive">{e}</p>)}
                </div>
              )}
            </div>
          )}
          <Button onClick={reset}>{t('bulk.import_another')}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
