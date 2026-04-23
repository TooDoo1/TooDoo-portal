import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  MapPin,
  Smartphone,
  Zap,
  Building2,
  Globe,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

const slides = [
  "/Icon.jpg",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=70",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=70",
];

const iconMap: Record<string, JSX.Element> = {
  map: <MapPin />,
  business: <Building2 />,
  zap: <Zap />,
  globe: <Globe />,
};

const steps = [
  { number: "01", title: "Skapa konto", desc: "Registrera dig gratis på några sekunder — som användare eller företag." },
  { number: "02", title: "Utforska deals", desc: "Bläddra bland hundratals lokala erbjudanden, event och upplevelser." },
  { number: "03", title: "Claima erbjudanden", desc: "Tryck på ett erbjudande och claima det direkt i appen innan det tar slut." },
  { number: "04", title: "Njut", desc: "Visa upp ditt erbjudande på plats och njut av upplevelsen till rabatterat pris!" },
];

const navItems = [
  {
    label: "Om oss",
    items: ["Om oss", "Vår idé"],
  },
  {
    label: "Företag",
    items: ["För företag", "Registrera företag"],
  },
  {
    label: "Exklusiva deals",
    items: ["Alla deals", "Populära deals"],
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [openNav, setOpenNav] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSlider = () => {
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
  };

  const stopSlider = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const nextSlide = () => { stopSlider(); setCurrent((prev) => (prev + 1) % slides.length); startSlider(); };
  const prevSlide = () => { stopSlider(); setCurrent((prev) => (prev - 1 + slides.length) % slides.length); startSlider(); };

  const nextStep = () => setStep((prev) => (prev + 1) % steps.length);
  const prevStep = () => setStep((prev) => (prev - 1 + steps.length) % steps.length);

  useEffect(() => { startSlider(); return () => stopSlider(); }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      fetch("http://83.248.14.115:4000/deals")
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          setDeals(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("API error:", err);
          if (!cancelled) setLoading(false);
        });
    };

    // Defer non-critical fetch to reduce main-thread work on first paint
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(run);
      return () => {
        cancelled = true;
        try {
          w.cancelIdleCallback?.(id);
        } catch {
          /* ignore */
        }
      };
    }

    const t = window.setTimeout(run, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  // Prefetch the next slide image after initial paint
  useEffect(() => {
    const next = slides[(current + 1) % slides.length];
    if (!next || next.startsWith("/")) return;
    const img = new Image();
    img.decoding = "async";
    img.loading = "lazy";
    img.src = next;
  }, [current]);

  const handleNavEnter = (label: string) => {
    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    setOpenNav(label);
  };

  const handleNavLeave = () => {
    navTimeoutRef.current = setTimeout(() => setOpenNav(null), 120);
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000b2a; color: #fff; font-family: 'DM Sans', sans-serif; }

        .btn-hover { transition: all 0.25s ease; }
        .btn-hover:hover { transform: scale(1.04); box-shadow: 0 8px 25px rgba(255,59,48,0.35); }

        .btn-outline-hover { transition: all 0.25s ease; }
        .btn-outline-hover:hover { background: rgba(255,255,255,0.1) !important; transform: scale(1.04); border-color: rgba(255,255,255,0.5) !important; }

        .btn-primary-hover { transition: all 0.25s ease; }
        .btn-primary-hover:hover { background: #e6352b !important; transform: scale(1.04); box-shadow: 0 8px 25px rgba(255,59,48,0.4); }

        .btn-store { transition: all 0.25s ease; display: flex; align-items: center; gap: 10px; background: #0a1535; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 12px 22px; cursor: pointer; color: #fff; }
        .btn-store:hover { background: #112040; transform: translateY(-2px); border-color: rgba(255,255,255,0.3); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }

        .card-hover { transition: all 0.3s ease; }
        .card-hover:hover { transform: translateY(-4px); border-color: rgba(255,59,48,0.4) !important; box-shadow: 0 12px 30px rgba(0,0,0,0.3); }

        .icon-hover { transition: all 0.25s ease; }
        .icon-hover:hover { transform: scale(1.1); color: #ff3b30; }

        .slider-arrow { transition: all 0.25s ease; }
        .slider-arrow:hover { transform: scale(1.15); background: rgba(255,255,255,0.15) !important; }

        .dot { transition: all 0.25s ease; }
        .dot:hover { transform: scale(1.3); }
        .dot.active { transform: scale(1.2); }

        /* Dropdown */
        .nav-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          min-width: 180px;
          background: #0a1535;
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 6px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.5);
          opacity: 0;
          transform: translateX(-50%) translateY(-6px);
          pointer-events: none;
          transition: opacity 0.2s ease, transform 0.2s ease;
          z-index: 200;
        }
        .nav-dropdown.open {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
          pointer-events: all;
        }
        .nav-dropdown-item {
          display: block;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 14px;
          color: rgba(255,255,255,0.75);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .nav-dropdown-item:hover {
          background: rgba(255,255,255,0.07);
          color: #fff;
        }

        /* Steps slider */
        .step-slide {
          transition: opacity 0.35s ease, transform 0.35s ease;
          opacity: 0;
          transform: translateX(30px);
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .step-slide.active {
          opacity: 1;
          transform: translateX(0);
          position: relative;
        }
      `}</style>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, padding: "14px 24px", zIndex: 100,
        background: scrolled ? "rgba(0,11,42,0.9)" : "transparent",
        backdropFilter: scrolled ? "blur(10px)" : "none",
        borderBottom: scrolled ? "0.5px solid rgba(255,255,255,0.08)" : "none",
        transition: "background 0.3s",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {/* Logo */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 800, cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            <img
              src="/Icon.jpg"
              alt="TooDoo"
              style={{ height: 36, width: 36, borderRadius: 8, objectFit: "cover" }}
            />
            <span>
              Too<span style={{ color: "#ff3b30" }}>Doo</span>
            </span>
          </div>

          {/* Dropdown nav items */}
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {navItems.map((nav) => (
              <div
                key={nav.label}
                style={{ position: "relative" }}
                onMouseEnter={() => handleNavEnter(nav.label)}
                onMouseLeave={handleNavLeave}
              >
                <button style={{
                  background: "transparent", border: "none", color: "rgba(255,255,255,0.8)",
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "8px 14px", borderRadius: 8, fontSize: 14, fontWeight: 500,
                  cursor: "pointer", transition: "color 0.15s, background 0.15s",
                }}
                  onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.color = "#fff"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  {nav.label}
                  <ChevronDown size={14} style={{ opacity: 0.6, transition: "transform 0.2s", transform: openNav === nav.label ? "rotate(180deg)" : "rotate(0deg)" }} />
                </button>
                <div className={`nav-dropdown ${openNav === nav.label ? "open" : ""}`}>
                  {nav.items.map((item) => (
                    <div key={item} className="nav-dropdown-item">{item}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Auth buttons */}
          <div style={{ display: "flex", gap: 12 }}>
           <button
  onClick={() => navigate("/registration")} className="btn-hover" style={{
    background: "transparent",color: "#fff", border: "1px solid rgba(255,255,255,0.3)",
     padding: "10px 20px", borderRadius: 8, fontWeight: 600, cursor: "pointer",
  }}>Registrera ditt företag
  </button>
            <button onClick={() => navigate("/login")} className="btn-hover" style={{
              background: "#ffa200", color: "#000b2a", border: "none",
              padding: "10px 20px", borderRadius: 8, fontWeight: 600, cursor: "pointer",
            }}>Logga in som företag</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ height: "100vh", position: "relative" }}>
        <div
          key={current}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${slides[current]})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 1,
            transition: "opacity 0.6s ease",
          }}
        />
        {/* Overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,11,42,0.45) 0%, rgba(0,11,42,0.65) 60%, rgba(0,11,42,0.92) 100%)", zIndex: 1 }} />

        {/* Left Arrow */}
        <button onClick={prevSlide} className="slider-arrow" style={{
          position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", zIndex: 20,
          background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
          width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <ChevronLeft size={28} color="#007AFF" />
        </button>

        {/* Right Arrow */}
        <button onClick={nextSlide} className="slider-arrow" style={{
          position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", zIndex: 20,
          background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
          width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          <ChevronRight size={28} color="#007AFF" />
        </button>

        {/* Dots */}
        <div style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", gap: 12 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => { stopSlider(); setCurrent(i); startSlider(); }}
              className={`dot ${i === current ? "active" : ""}`}
              style={{
                width: i === current ? 14 : 10, height: i === current ? 14 : 10,
                borderRadius: "50%", border: "none", cursor: "pointer",
                background: i === current ? "#ff3b30" : "rgba(255,255,255,0.5)",
              }} />
          ))}
        </div>

        {/* Hero content */}
        <div style={{
          position: "relative", zIndex: 10, height: "100%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: 24,
        }}>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 800, marginBottom: 16, lineHeight: 1.1 }}>
            Hitta de bästa dealerna nära dig
          </h1>
          <p style={{ fontSize: 18, opacity: 0.8, marginBottom: 36, maxWidth: 600, lineHeight: 1.65 }}>
            TooDoo samlar alla erbjudanden från företag i din stad – spara tid och pengar.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={() => navigate("/login")} className="btn-primary-hover" style={{
              background: "#ff3b30", color: "#fff", border: "none",
              padding: "16px 32px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer",
            }}>
              Kom igång
            </button>
            <button className="btn-outline-hover" style={{
              background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.3)",
              padding: "16px 32px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer",
            }}>
              Ladda ner appen
            </button>
          </div>
        </div>
      </section>

      {/* APP DESCRIPTION + STORE BUTTONS */}
      <section style={{ padding: "80px 24px", textAlign: "center", background: "#050e28" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ff3b30", marginBottom: 14 }}>Appen</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 16, lineHeight: 1.15 }}>
            Allt du behöver — i fickan
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", lineHeight: 1.75, marginBottom: 40 }}>
            TooDoo-appen ger dig tillgång till exklusiva erbjudanden från lokala företag, direkt i din smartphone. Claima deals, utforska event och spara pengar — var du än är.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            {/* Google Play */}
            <button className="btn-store">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3.18 1.04L13.86 12 3.18 22.96A2 2 0 012 21.13V2.87a2 2 0 011.18-1.83z" fill="#EA4335"/>
                <path d="M20.5 10.64l-3.04-1.76-3.6 3.12 3.6 3.12 3.07-1.78a1.5 1.5 0 000-2.7z" fill="#FBBC04"/>
                <path d="M3.18 1.04L13.86 12l-3.6 3.12L2 6.77V2.87a2 2 0 011.18-1.83z" fill="#4285F4"/>
                <path d="M3.18 22.96L13.86 12l-3.6-3.12-8.26 8.35v3.9a2 2 0 001.18 1.83z" fill="#34A853"/>
              </svg>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 10, opacity: 0.6, lineHeight: 1 }}>Hämta på</div>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>Google Play</div>
              </div>
            </button>

            {/* App Store */}
            <button className="btn-store">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.15 1.26-2.13 3.76.03 2.99 2.63 3.99 2.66 4l-.08.26zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 10, opacity: 0.6, lineHeight: 1 }}>Ladda ner på</div>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>App Store</div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* SÅ HÄR FUNGERAR DET */}
      <section style={{ padding: "80px 24px", background: "#000b2a" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ff3b30", marginBottom: 14 }}>Guide</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800, marginBottom: 48, lineHeight: 1.15 }}>
            Så här fungerar det
          </h2>

          {/* Step card */}
          <div style={{ position: "relative", background: "#0a1535", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "48px 40px", minHeight: 220 }}>
            {/* Progress dots */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 36 }}>
              {steps.map((_, i) => (
                <button key={i} onClick={() => setStep(i)} style={{
                  width: i === step ? 24 : 8, height: 8, borderRadius: 999,
                  border: "none", cursor: "pointer", padding: 0,
                  background: i === step ? "#ff3b30" : "rgba(255,255,255,0.2)",
                  transition: "all 0.3s ease",
                }} />
              ))}
            </div>

            {/* Step content */}
            <div style={{ minHeight: 120 }}>
              <div style={{
                fontSize: "clamp(48px, 8vw, 72px)", fontWeight: 800,
                color: "rgba(255,59,48,0.15)", lineHeight: 1, marginBottom: 8,
              }}>
                {steps[step].number}
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>{steps[step].title}</h3>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, maxWidth: 440, margin: "0 auto" }}>
                {steps[step].desc}
              </p>
            </div>

            {/* Arrows */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 36 }}>
              <button onClick={prevStep} className="slider-arrow" style={{
                background: "rgba(255,255,255,0.07)", border: "0.5px solid rgba(255,255,255,0.12)",
                borderRadius: "50%", width: 44, height: 44,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}>
                <ChevronLeft size={20} color="rgba(255,255,255,0.7)" />
              </button>
              <button onClick={nextStep} className="slider-arrow" style={{
                background: "#ff3b30", border: "none",
                borderRadius: "50%", width: 44, height: 44,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}>
                <ChevronRight size={20} color="#fff" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES - API Driven */}
      <section style={{ padding: "80px 24px", background: "#050e28" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ff3b30", marginBottom: 14, textAlign: "center" }}>Erbjudanden</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, marginBottom: 40, textAlign: "center" }}>Utvalda deals</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {loading ? (
              <p style={{ opacity: 0.5 }}>Laddar deals...</p>
            ) : deals.length > 0 ? (
              deals.map((deal, i) => (
                <div key={i} className="card-hover" style={{
                  background: "#0a1535", padding: 28, borderRadius: 18,
                  cursor: "pointer", border: "1px solid transparent",
                }}>
                  <div className="icon-hover" style={{ display: "inline-block" }}>
                    {iconMap[deal.icon] || <Zap size={32} color="#ff3b30" />}
                  </div>
                  <h3 style={{ marginTop: 12 }}>{deal.title}</h3>
                  <p style={{ opacity: 0.6, marginTop: 8 }}>{deal.description}</p>
                </div>
              ))
            ) : (
              <>
                <div className="card-hover" style={{ background: "#0a1535", padding: 28, borderRadius: 18, cursor: "pointer", border: "1px solid transparent" }}>
                  <div className="icon-hover" style={{ display: "inline-block" }}><Globe size={32} color="#ff3b30" /></div>
                  <h3 style={{ marginTop: 12 }}>Hitta upplevelser nära dig</h3>
                  <p style={{ opacity: 0.6, marginTop: 8 }}>Utforska lokala aktiviteter och event.</p>
                </div>
                <div className="card-hover" style={{ background: "rgba(255,59,48,0.08)", padding: 28, borderRadius: 18, cursor: "pointer", border: "1px solid rgba(255,59,48,0.3)" }}>
                  <div className="icon-hover" style={{ display: "inline-block" }}><Building2 size={32} color="#ff3b30" /></div>
                  <h3 style={{ marginTop: 12 }}>Är du ett företag?</h3>
                  <p style={{ opacity: 0.6, marginTop: 8 }}>Nå tusentals användare med dina erbjudanden.</p>
                </div>
                <div className="card-hover" style={{ background: "#0a1535", padding: 28, borderRadius: 18, cursor: "pointer", border: "1px solid transparent" }}>
                  <div className="icon-hover" style={{ display: "inline-block" }}><Zap size={32} color="#ff3b30" /></div>
                  <h3 style={{ marginTop: 12 }}>Exklusiva deals</h3>
                  <p style={{ opacity: 0.6, marginTop: 8 }}>Tidsbegränsade erbjudanden varje dag.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section style={{ padding: "80px 24px", background: "#000b2a" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ff3b30", marginBottom: 14 }}>Kontakt</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, marginBottom: 40 }}>Hör av dig</h2>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {[
              { icon: <Mail size={24} />, label: "info@toodoo.se" },
              { icon: <MapPin size={24} />, label: "Helsingborg" },
              { icon: <Smartphone size={24} />, label: "@toodoo.se" },
            ].map((item, i) => (
              <div key={i} className="card-hover" style={{
                background: "#0a1535", padding: 20, borderRadius: 16,
                cursor: "pointer", border: "1px solid transparent",
              }}>
                <div className="icon-hover" style={{ display: "inline-block", marginBottom: 8 }}>{item.icon}</div>
                <p>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)", padding: "28px 24px", background: "#000b2a" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>
            Too<span style={{ color: "#ff3b30" }}>Doo</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Om oss", "Kontakt", "Företagsportal"].map((label) => (
              <span key={label} style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", cursor: "pointer", transition: "color 0.15s" }}
                onMouseOver={e => (e.currentTarget.style.color = "#fff")}
                onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
              >{label}</span>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", width: "100%", textAlign: "center", marginTop: 8 }}>
            © 2025 TooDoo. Alla rättigheter förbehållna.
          </p>
        </div>
      </footer>
    </>
  );
}