import { AlertCircle, BookOpen, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LoadingState({ label = 'Đang tải...' }: { label?: string }) {
  return <div className="grid min-h-[320px] place-items-center"><div className="flex items-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" />{label}</div></div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="mx-auto grid min-h-[320px] max-w-lg place-items-center text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive"><AlertCircle aria-hidden="true" /></span><h2 className="mt-4 text-lg font-semibold">Không thể hiển thị nội dung</h2><p className="mt-2 text-sm text-muted-foreground">{message}</p>{onRetry && <Button variant="outline" className="mt-5" onClick={onRetry}>Thử lại</Button>}</div></div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><BookOpen aria-hidden="true" /></span><h2 className="mt-4 text-lg font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>{action && <div className="mt-6">{action}</div>}</div>;
}
