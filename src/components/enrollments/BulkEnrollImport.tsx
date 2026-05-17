import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { useCreateEnrollments } from '@/hooks/useEnrollments';
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type RowStatus = 'valid' | 'not_found' | 'already_enrolled' | 'duplicate';

interface ParsedRow {
  rowNum: number;
  student_code: string;
  full_name: string;
  matchedStudent: { id: string; full_name: string; student_code: string } | null;
  status: RowStatus;
}

interface BulkEnrollImportProps {
  courseId: string;
  allStudents: { id: string; full_name: string; email: string; student_code: string | null }[];
  enrolledStudentIds: Set<string>;
  termId?: string | null;
}

export function BulkEnrollImport({ courseId, allStudents, enrolledStudentIds, termId }: BulkEnrollImportProps) {
  const { t } = useI18n();
  const createMutation = useCreateEnrollments();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; skipped: number } | null>(null);

  const reset = () => {
    setRows([]);
    setImportDone(false);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const parseCSVText = (text: string): string[][] => {
    return text.trim().split('\n').map(line =>
      line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''))
    );
  };

  const validate = useCallback((rawRows: string[][]) => {
    // Find header row
    const header = rawRows[0]?.map(h => h.toLowerCase().replace(/\s+/g, '_'));
    const codeIdx = header?.indexOf('student_code') ?? -1;
    const nameIdx = header?.indexOf('full_name') ?? -1;

    if (codeIdx === -1) {
      toast.error(t('bulk.missing_column'));
      return;
    }

    const dataRows = rawRows.slice(1).filter(r => r[codeIdx]?.trim());
    const seenCodes = new Set<string>();
    const parsed: ParsedRow[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const code = dataRows[i][codeIdx].trim();
      const name = nameIdx >= 0 ? dataRows[i][nameIdx]?.trim() || '' : '';

      // Check duplicate in file
      if (seenCodes.has(code)) {
        parsed.push({ rowNum: i + 2, student_code: code, full_name: name, matchedStudent: null, status: 'duplicate' });
        continue;
      }
      seenCodes.add(code);

      // Match student
      const matched = allStudents.find(s => s.student_code === code);
      if (!matched) {
        parsed.push({ rowNum: i + 2, student_code: code, full_name: name, matchedStudent: null, status: 'not_found' });
        continue;
      }

      if (enrolledStudentIds.has(matched.id)) {
        parsed.push({ rowNum: i + 2, student_code: code, full_name: name, matchedStudent: { id: matched.id, full_name: matched.full_name, student_code: matched.student_code || '' }, status: 'already_enrolled' });
        continue;
      }

      parsed.push({ rowNum: i + 2, student_code: code, full_name: name, matchedStudent: { id: matched.id, full_name: matched.full_name, student_code: matched.student_code || '' }, status: 'valid' });
    }

    setRows(parsed);
    setImportDone(false);
    setImportResult(null);
  }, [allStudents, enrolledStudentIds, t]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv' || ext === 'txt') {
      const text = await file.text();
      const rawRows = parseCSVText(text);
      validate(rawRows);
    } else if (ext === 'xlsx' || ext === 'xls') {
      toast.error(t('bulk.csv_only'));
      reset();
    } else {
      toast.error(t('bulk.csv_only'));
      reset();
    }
  };

  const handleImport = async () => {
    const validIds = rows.filter(r => r.status === 'valid').map(r => r.matchedStudent!.id);
    if (validIds.length === 0) return;

    setImporting(true);
    try {
      await createMutation.mutateAsync({ course_id: courseId, student_ids: validIds, term_id: termId ?? null });
      setImportDone(true);
      setImportResult({ success: validIds.length, skipped: rows.length - validIds.length });
      toast.success(t('bulk.import_success'));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'student_code,full_name\n2023001,Ahmad Ali\n2023002,Sara Khaled\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enrollment_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = rows.filter(r => r.status === 'valid').length;
  const notFoundCount = rows.filter(r => r.status === 'not_found').length;
  const alreadyCount = rows.filter(r => r.status === 'already_enrolled').length;
  const dupCount = rows.filter(r => r.status === 'duplicate').length;

  const statusBadge = (status: RowStatus) => {
    switch (status) {
      case 'valid': return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle2 className="h-3 w-3 me-1" />{t('bulk.valid')}</Badge>;
      case 'not_found': return <Badge variant="destructive"><XCircle className="h-3 w-3 me-1" />{t('bulk.not_found')}</Badge>;
      case 'already_enrolled': return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><AlertTriangle className="h-3 w-3 me-1" />{t('bulk.already_enrolled')}</Badge>;
      case 'duplicate': return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20"><Copy className="h-3 w-3 me-1" />{t('bulk.duplicate')}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-5 w-5" />
          {t('bulk.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload area */}
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 me-2" />{t('bulk.download_template')}
          </Button>
          <div className="relative">
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer" />
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 me-2" />{t('bulk.upload_file')}
            </Button>
          </div>
          {rows.length > 0 && !importDone && (
            <Button variant="ghost" size="sm" onClick={reset}>{t('cancel')}</Button>
          )}
        </div>

        {/* Preview table */}
        {rows.length > 0 && !importDone && (
          <>
            {/* Summary */}
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="text-green-600 font-medium">{t('bulk.valid')}: {validCount}</span>
              <span className="text-destructive font-medium">{t('bulk.not_found')}: {notFoundCount}</span>
              <span className="text-yellow-600 font-medium">{t('bulk.already_enrolled')}: {alreadyCount}</span>
              <span className="text-orange-600 font-medium">{t('bulk.duplicate')}: {dupCount}</span>
            </div>

            <div className="border rounded-lg overflow-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-start">#</th>
                    <th className="px-3 py-2 text-start">{t('crud.student_code')}</th>
                    <th className="px-3 py-2 text-start">{t('crud.full_name')}</th>
                    <th className="px-3 py-2 text-start">{t('bulk.matched')}</th>
                    <th className="px-3 py-2 text-start">{t('crud.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowNum} className="border-t">
                      <td className="px-3 py-2">{r.rowNum}</td>
                      <td className="px-3 py-2 font-mono">{r.student_code}</td>
                      <td className="px-3 py-2">{r.full_name || '-'}</td>
                      <td className="px-3 py-2">{r.matchedStudent?.full_name || '-'}</td>
                      <td className="px-3 py-2">{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={reset}>{t('cancel')}</Button>
              <Button onClick={handleImport} disabled={validCount === 0 || importing}>
                {importing && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {t('bulk.confirm_import')} ({validCount})
              </Button>
            </div>
          </>
        )}

        {/* Import result */}
        {importDone && importResult && (
          <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
            <p className="font-medium text-green-600">{t('bulk.import_complete')}</p>
            <p className="text-sm">{t('bulk.enrolled_count')}: {importResult.success}</p>
            <p className="text-sm">{t('bulk.skipped_count')}: {importResult.skipped}</p>
            <Button variant="outline" size="sm" onClick={reset}>{t('bulk.import_another')}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
