"use client";

import { cls } from "@/lib/utils";
import { ReactNode } from "react";

export function Card({
  title, action, className, children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cls("glass p-3 md:p-4", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3 flex-col sm:flex-row gap-2">
          {title && <h3 className="card-title">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
