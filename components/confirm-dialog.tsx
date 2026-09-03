'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Xác nhận', destructive = false, loading = false, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; confirmLabel?: string; destructive?: boolean; loading?: boolean; onConfirm: () => void | Promise<void> }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Hủy</Button><Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={loading}>{loading ? 'Đang xử lý...' : confirmLabel}</Button></DialogFooter></DialogContent></Dialog>;
}
