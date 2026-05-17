import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useI18n } from '@/lib/i18n';
import { useCreateUser } from '@/hooks/useProfiles';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Download, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

type RowStatus = 'valid' | 'missing_fields' | 'invalid_email' | 'duplicate_email' | 'duplicate_student_code' | 'duplicate_in_file';

interface ParsedRow {
  rowNum: number;
  full_name: string;
  email: string;
  password: string;
  phone: string;
  student_code: string;
  department: string;
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

const REQUIRED_COLUMNS = ['full_name', 'email', 'password', 'phone', 'student_code', 'department'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BulkStudentImport() {
  const { t } = useI18n();
  const createMutation = useCreateUser();
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
      ['full_name', 'email', 'password', 'phone', 'student_code', 'department'],
      ['Ahmed Ali', 'ahmed@example.com', 'Pass1234', '0501234567', 'STU001', 'CS'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'student_import_template.xlsx');
  };

  const exportCurrentData = async () => {
    try {
      const { data: roleRows, error: rErr } = await supabase
        .from('user_roles').select('user_id').eq('role', 'student');
      if (rErr) throw rErr;
      const ids = (roleRows ?? []).map(r => r.user_id);
      if (ids.length === 0) {
        toast.error(t('no_data'));
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone, student_code, department')
        .in('id', ids)
        .order('full_name');
      if (error) throw error;
      const rowsOut = (data ?? []).map(r => ({
        full_name: r.full_name ?? '',
        email: r.email ?? '',
        phone: r.phone ?? '',
        student_code: r.student_code ?? '',
        department: r.department ?? '',
      }));
      const ws = XLSX.utils.json_to_sheet(rowsOut, {
        header: ['full_name', 'email', 'phone', 'student_code', 'department'],
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');
      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `students_export_${stamp}.xlsx`);
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

      // Check required columns
      const headers = Object.keys(jsonData[0]).map(h => h.trim().toLowerCase());
      const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c));
      if (missing.length > 0) {
        toast.error(`${t('bulk_students.missing_columns')}: ${missing.join(', ')}`);
        return;
      }

      // Fetch existing emails and student_codes
      const { data: existingProfiles } = await supabase.from('profiles').select('email, student_code');
      const existingEmails = new Set((existingProfiles || []).map(p => p.email.toLowerCase()));
      const existingCodes = new Set((existingProfiles || []).map(p => p.student_code?.toLowerCase()).filter(Boolean));

      // Parse and validate
      const emailsInFile = new Map<string, number>();
      const codesInFile = new Map<string, number>();
      const parsed: ParsedRow[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const raw = jsonData[i];
        const row: ParsedRow = {
          rowNum: i + 2,
          full_name: String(raw.full_name || raw.Full_Name || raw.FULL_NAME || '').trim(),
          email: String(raw.email || raw.Email || raw.EMAIL || '').trim().toLowerCase(),
          password: String(raw.password || raw.Password || raw.PASSWORD || '').trim(),
          phone: String(raw.phone || raw.Phone || raw.PHONE || '').trim(),
          student_code: String(raw.student_code || raw.Student_Code || raw.STUDENT_CODE || '').trim(),
          department: String(raw.department || raw.Department || raw.DEPARTMENT || '').trim(),
          status: 'valid',
        };

        // Check missing required fields
        if (!row.full_name || !row.email || !row.password) {
          row.status = 'missing_fields';
          row.statusDetail = [!row.full_name && 'full_name', !row.email && 'email', !row.password && 'password'].filter(Boolean).join(', ');
          parsed.push(row);
          continue;
        }

        // Validate email format
        if (!EMAIL_REGEX.test(row.email)) {
          row.status = 'invalid_email';
          parsed.push(row);
          continue;
        }

        // Check duplicate email in file
        if (emailsInFile.has(row.email)) {
          row.status = 'duplicate_in_file';
          row.statusDetail = `email (row ${emailsInFile.get(row.email)})`;
          parsed.push(row);
          continue;
        }

        // Check duplicate student_code in file
        if (row.student_code && codesInFile.has(row.student_code.toLowerCase())) {
          row.status = 'duplicate_in_file';
          row.statusDetail = `student_code (row ${codesInFile.get(row.student_code.toLowerCase())})`;
          parsed.push(row);
          continue;
        }

        // Check existing email in DB
        if (existingEmails.has(row.email)) {
          row.status = 'duplicate_email';
          parsed.push(row);
          emailsInFile.set(row.email, row.rowNum);
          if (row.student_code) codesInFile.set(row.student_code.toLowerCase(), row.rowNum);
          continue;
        }

        // Check existing student_code in DB
        if (row.student_code && existingCodes.has(row.student_code.toLowerCase())) {
          row.status = 'duplicate_student_code';
          parsed.push(row);
          emailsInFile.set(row.email, row.rowNum);
          if (row.student_code) codesInFile.set(row.student_code.toLowerCase(), row.rowNum);
          continue;
        }

        emailsInFile.set(row.email, row.rowNum);
        if (row.student_code) codesInFile.set(row.student_code.toLowerCase(), row.rowNum);
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
          email: row.email,
          password: row.password,
          full_name: row.full_name,
          phone: row.phone || undefined,
          student_code: row.student_code || undefined,
          department: row.department || undefined,
          role: 'student',
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
      invalid_email: { variant: 'destructive', label: t('bulk_students.status_invalid_email') },
      duplicate_email: { variant: 'secondary', label: t('bulk_students.status_dup_email') },
      duplicate_student_code: { variant: 'secondary', label: t('bulk_students.status_dup_code') },
      duplicate_in_file: { variant: 'outline', label: t('bulk_students.status_dup_file') },
    };
    const cfg = map[row.status];
    return (
      <Badge variant={cfg.variant}>
        {cfg.label}
        {row.statusDetail && <span className="ms-1 text-xs opacity-75">({row.statusDetail})</span>}
      </Badge>
    );
  };

  // Upload phase
  if (phase === 'upload') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{t('bulk_students.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('bulk_students.subtitle')}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 me-2" />{t('bulk.download_template')}
              </Button>
              <Button variant="outline" onClick={exportCurrentData}>
                <Download className="h-4 w-4 me-2" />{t('bulk_students.export_current')}
              </Button>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 me-2" />{t('bulk_students.upload')}
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

  // Preview phase
  if (phase === 'preview') {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{t('bulk_students.preview_title')}</h3>
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
                  <TableHead>{t('crud.full_name')}</TableHead>
                  <TableHead>{t('email')}</TableHead>
                  <TableHead>{t('crud.phone')}</TableHead>
                  <TableHead>{t('crud.student_code')}</TableHead>
                  <TableHead>{t('crud.department')}</TableHead>
                  <TableHead>{t('crud.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx} className={row.status !== 'valid' ? 'bg-destructive/5' : ''}>
                    <TableCell>{row.rowNum}</TableCell>
                    <TableCell>{row.full_name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.phone}</TableCell>
                    <TableCell>{row.student_code}</TableCell>
                    <TableCell>{row.department}</TableCell>
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

  // Importing phase
  if (phase === 'importing') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h3 className="text-lg font-semibold">{t('bulk_students.importing')}</h3>
            <Progress value={importProgress} className="w-64" />
            <p className="text-sm text-muted-foreground">{importProgress}%</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Done phase
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
