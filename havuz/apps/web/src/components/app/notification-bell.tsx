'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import { useMarkNotificationsRead, useNotifications } from '@havuz/sdk';
import { fmtRelative } from '@/lib/format';
import { cn } from '@/lib/cn';

/** Bildirim zili: okunmamış sayısı, açılır liste, tümünü okundu işaretle. */
export function NotificationBell({ align = 'right' }: { align?: 'right' | 'left' }) {
  const { data } = useNotifications();
  const mark = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = data?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-xl text-fg-muted transition hover:bg-muted hover:text-fg"
        aria-label={`Bildirimler (${unread} okunmamış)`}
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10.5px] font-semibold text-white ring-2 ring-surface">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cn(
              'absolute z-50 mt-2 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-border bg-surface shadow-lift',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">Bildirimler</span>
              {unread > 0 && (
                <button onClick={() => mark.mutate(undefined)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <CheckCheck className="h-3.5 w-3.5" /> Tümünü okundu say
                </button>
              )}
            </div>
            <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
              {!data?.notifications.length && <li className="px-4 py-8 text-center text-sm text-fg-muted">Henüz bildirim yok</li>}
              {data?.notifications.map((n) => {
                const content = (
                  <div className="flex gap-3 px-4 py-3 transition hover:bg-muted/50">
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} />
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-sm', !n.read && 'font-semibold')}>{n.title}</div>
                      <div className="mt-0.5 text-xs text-fg-muted">{n.body}</div>
                      <div className="mt-1 text-[11px] text-fg-subtle">{fmtRelative(n.createdAt)}</div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => {
                          if (!n.read) mark.mutate(n.id);
                          setOpen(false);
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
