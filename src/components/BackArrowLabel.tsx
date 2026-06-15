import { ArrowLeft } from "lucide-react";

type BackArrowLabelProps = {
  children: React.ReactNode;
};

export function BackArrowLabel({ children }: BackArrowLabelProps) {
  return (
    <>
      <span className="anim-back-arrow-wrap pointer-events-none relative z-10 flex h-4 w-4 shrink-0 items-center justify-center">
        <span
          aria-hidden
          className="anim-back-line absolute left-[calc(100%+-0.5rem)] top-1/2 h-[1.5px] w-10 origin-left -translate-y-1/2 scale-x-0 rounded-full bg-foreground transition-transform duration-300 group-hover:scale-x-100"
        />
        <ArrowLeft className="anim-back-arrow h-4 w-4" strokeWidth={2} />
      </span>
      <span className="anim-back-text pointer-events-none relative z-10 ml-1.5 whitespace-nowrap transition-all duration-300 group-hover:translate-x-3 group-hover:opacity-0">
        {children}
      </span>
    </>
  );
}
