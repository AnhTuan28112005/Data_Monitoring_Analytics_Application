"use client";

import { cls } from "@/lib/utils";
import { ReactNode } from "react";

export function Card({
  title, subtitle, action, className, children, centerTitle
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
  centerTitle?: boolean;
}) {
  return (
    <section className={cls("glass p-3 md:p-4 flex flex-col", className)}>
      {(title || action) && (
        <div className={cls("flex flex-col mb-4 gap-1", centerTitle ? "items-center" : "items-start")}>
          <div className={cls("flex items-center w-full gap-2", centerTitle ? "justify-center" : "justify-between", "flex-col sm:flex-row")}>
            {title && <h3 className={cls("card-title", centerTitle && "text-center w-full")}>{title}</h3>}
            {!centerTitle && action}
          </div>
          {subtitle && (
            <p className={cls("text-[11px] uppercase tracking-wider text-text-muted font-medium", centerTitle && "text-center")}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
