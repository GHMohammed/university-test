import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAcademicTerms } from '@/hooks/useAcademicTerms';
import { useTermContext } from '@/lib/termContext';
import { useI18n } from '@/lib/i18n';
import { CalendarRange } from 'lucide-react';

export function TermSwitcher() {
  const { t } = useI18n();
  const { data: terms = [] } = useAcademicTerms();
  const { selectedTermId, setSelectedTermId } = useTermContext();

  if (terms.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <CalendarRange className="h-4 w-4 text-muted-foreground hidden sm:block" />
      <Select
        value={selectedTermId ?? ''}
        onValueChange={(v) => setSelectedTermId(v)}
      >
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue placeholder={t('term.select')} />
        </SelectTrigger>
        <SelectContent>
          {terms.map((term) => (
            <SelectItem key={term.id} value={term.id}>
              <span className="flex items-center gap-2">
                {term.name}
                {term.is_active && <span className="text-[10px] text-primary">●</span>}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
