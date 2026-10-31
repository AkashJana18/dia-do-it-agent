import * as React from "react";

export function PageHead({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="mx-auto w-full max-w-[720px] px-5 pb-4 pt-8 md:px-8 md:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em] text-ink md:text-[38px]">
          {title}
        </h1>
        {meta ? <div className="pb-1 text-[14px] font-semibold text-dim">{meta}</div> : null}
      </div>
      {children}
    </header>
  );
}
