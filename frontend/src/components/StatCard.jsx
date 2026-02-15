import { cn } from '../lib/utils';

export function StatCard({ title, value, change, changeType, icon: Icon, subtitle }) {
  const changeColor = {
    profit: 'text-profit',
    loss: 'text-loss',
    neutral: 'text-muted-foreground',
  }[changeType || 'neutral'];

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold font-mono-numbers tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
          {change && (
            <p className={cn('mt-1 text-xs font-medium', changeColor)}>
              {change}
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
