import { ArrowRight } from "lucide-react";

type LoginArrowLabelProps = {
  children: React.ReactNode;
};

export function LoginArrowLabel({ children }: LoginArrowLabelProps) {
  return (
    <>
      <span className="anim-login-text pointer-events-none relative z-10 whitespace-nowrap transition-transform duration-300 group-hover:-translate-x-3">
        {children}
      </span>
      <span className="anim-login-arrow-wrap pointer-events-none relative z-10 ml-1.5 flex h-4 w-4 shrink-0 items-center justify-center transition-transform duration-300 group-hover:translate-x-5">
        <span
          aria-hidden
          className="anim-login-line absolute right-[calc(100%+-0.5rem)] top-1/2 h-[1.5px] w-10 origin-right -translate-y-1/2 scale-x-0 rounded-full bg-accent-foreground transition-transform duration-300 group-hover:scale-x-100"
        />
        <ArrowRight className="anim-login-arrow h-4 w-4" strokeWidth={2} />
      </span>
    </>
  );
}
