import React from 'react';

interface SectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[11px] font-black uppercase text-slate-400 tracking-widest">{title}</h2>
        <div className="h-[1px] flex-1 bg-slate-200/60 ml-4" />
      </div>
      {children}
    </section>
  );
}
