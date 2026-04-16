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
  ChevronRight
} from "lucide-react";

const slides = [
  "/Icon.jpg",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1920&q=80",
];
// Icon mapping for API
const iconMap: Record<string, JSX.Element> = {
  map: <MapPin />,
  business: <Building2 />,
  zap: <Zap />,
  globe: <Globe />,
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hero slider - auto slide
  const startSlider = () => {
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
  };

  const stopSlider = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Manual slide controls
  const nextSlide = () => {
    stopSlider();
    setCurrent((prev) => (prev + 1) % slides.length);
    startSlider();
  };

  const prevSlide = () => {
    stopSlider();
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
    startSlider();
  };

  useEffect(() => {
    startSlider();
    return () => stopSlider();
  }, []);

  // Scroll nav
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // API call for FEATURES
  useEffect(() => {
    fetch("http://83.248.14.115:4000/deals")
      .then((res) => res.json())
      .then((data) => {
        setDeals(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("API error:", err);
        setLoading(false);
      });
  }, []);

  return (
    <>
      {/* STYLE */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000b2a; color: #fff; font-family: 'DM Sans', sans-serif; }
        
        /* Button hover effects */
        .btn-hover {
          transition: all 0.25s ease;
        }
        .btn-hover:hover {
          transform: scale(1.04);
          box-shadow: 0 8px 25px rgba(255, 59, 48, 0.35);
        }
        
        .btn-outline-hover {
          transition: all 0.25s ease;
        }
        .btn-outline-hover:hover {
          background: rgba(255,255,255,0.1);
          transform: scale(1.04);
          border-color: rgba(255,255,255,0.5);
        }
        
        .btn-primary-hover {
          transition: all 0.25s ease;
        }
        .btn-primary-hover:hover {
          background: #e6352b;
          transform: scale(1.04);
          box-shadow: 0 8px 25px rgba(255, 59, 48, 0.4);
        }

        /* Card hover effects */
        .card-hover {
          transition: all 0.3s ease;
        }
        .card-hover:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 59, 48, 0.4);
          box-shadow: 0 12px 30px rgba(0,0,0,0.3);
        }

        /* Icon hover effects */
        .icon-hover {
          transition: all 0.25s ease;
        }
        .icon-hover:hover {
          transform: scale(1.1);
          color: #ff3b30;
        }

        /* Slider arrow hover */
        .slider-arrow {
          transition: all 0.25s ease;
        }
        .slider-arrow:hover {
          transform: scale(1.15);
          background: rgba(255,255,255,0.15);
        }

        /* Dot hover */
        .dot {
          transition: all 0.25s ease;
        }
        .dot:hover {
          transform: scale(1.3);
        }
        .dot.active {
          transform: scale(1.2);
        }
      `}</style>

      {/* NAV */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          padding: 16,
          zIndex: 100,
          background: scrolled ? "rgba(0,11,42,0.9)" : "transparent",
          backdropFilter: scrolled ? "blur(10px)" : "none",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div 
            style={{ fontSize: 22, fontWeight: 800, cursor: "pointer" }} 
            onClick={() => navigate("/")}
            className="btn-hover"
          >
            Too<span style={{ color: "#ff3b30" }}>Doo</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => navigate("/login")}
              className="btn-outline-hover"
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)",
                padding: "10px 20px",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Logga in
            </button>
            <button
              onClick={() => navigate("/login")}
              className="btn-hover"
              style={{
                background: "#fff",
                color: "#000b2a",
                border: "none",
                padding: "10px 20px",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Logga in som företag
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ height: "100vh", position: "relative" }}>
        {slides.map((src, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: i === current ? 1 : 0,
              transition: "1s",
            }}
          />
        ))}
        
        {/* Left Arrow */}
        <button
          onClick={prevSlide}
          className="slider-arrow"
          style={{
            position: "absolute",
            left: 20,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 20,
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "50%",
            width: 50,
            height: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={28} color="#fff" />
        </button>

        {/* Right Arrow */}
        <button
          onClick={nextSlide}
          className="slider-arrow"
          style={{
            position: "absolute",
            right: 20,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 20,
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "50%",
            width: 50,
            height: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ChevronRight size={28} color="#fff" />
        </button>

        {/* Dots */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            display: "flex",
            gap: 12,
          }}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                stopSlider();
                setCurrent(i);
                startSlider();
              }}
              className={`dot ${i === current ? "active" : ""}`}
              style={{
                width: i === current ? 14 : 10,
                height: i === current ? 14 : 10,
                borderRadius: "50%",
                border: "none",
                background: i === current ? "#ff3b30" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 10,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 24,
          }}
        >
          <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 16 }}>
            Hitta de bästa dealerna nära dig
          </h1>
          <p style={{ fontSize: 18, opacity: 0.8, marginBottom: 32, maxWidth: 600 }}>
            TooDoo samlar alla erbjudanden från företag i din stad – spara tid och pengar.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="btn-primary-hover"
            style={{
              background: "#ff3b30",
              color: "#fff",
              border: "none",
              padding: "16px 32px",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Kom igång
          </button>
        </div>
      </section>

      {/* FEATURES - API Driven */}
      <section style={{ padding: 80 }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {loading ? (
            <p>Laddar deals...</p>
          ) : deals.length > 0 ? (
            deals.map((deal, i) => (
              <div
                key={i}
                className="card-hover"
                style={{
                  background: "#0a1535",
                  padding: 28,
                  borderRadius: 18,
                  cursor: "pointer",
                  border: "1px solid transparent",
                }}
              >
                <div className="icon-hover" style={{ display: "inline-block" }}>
                  {iconMap[deal.icon] || <Zap size={32} color="#ff3b30" />}
                </div>
                <h3 style={{ marginTop: 12 }}>{deal.title}</h3>
                <p style={{ opacity: 0.6, marginTop: 8 }}>
                  {deal.description}
                </p>
              </div>
            ))
          ) : (
            <>
              {/* Fallback cards if API returns empty */}
              <div
                className="card-hover"
                style={{
                  background: "#0a1535",
                  padding: 28,
                  borderRadius: 18,
                  cursor: "pointer",
                  border: "1px solid transparent",
                }}
              >
                <div className="icon-hover" style={{ display: "inline-block" }}>
                  <Globe size={32} color="#ff3b30" />
                </div>
                <h3>Hitta upplevelser nära dig</h3>
                <p style={{ opacity: 0.6 }}>
                  Utforska lokala aktiviteter och event.
                </p>
              </div>
              <div
                className="card-hover"
                style={{
                  background: "rgba(255,59,48,0.08)",
                  padding: 28,
                  borderRadius: 18,
                  cursor: "pointer",
                  border: "1px solid rgba(255,59,48,0.3)",
                }}
              >
                <div className="icon-hover" style={{ display: "inline-block" }}>
                  <Building2 size={32} color="#ff3b30" />
                </div>
                <h3>Är du ett företag?</h3>
                <p style={{ opacity: 0.6 }}>
                  Nå tusentals användare med dina erbjudanden.
                </p>
              </div>
              <div
                className="card-hover"
                style={{
                  background: "#0a1535",
                  padding: 28,
                  borderRadius: 18,
                  cursor: "pointer",
                  border: "1px solid transparent",
                }}
              >
                <div className="icon-hover" style={{ display: "inline-block" }}>
                  <Zap size={32} color="#ff3b30" />
                </div>
                <h3>Exklusiva deals</h3>
                <p style={{ opacity: 0.6 }}>
                  Tidsbegränsade erbjudanden varje dag.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* CONTACT */}
      <section style={{ padding: 80 }}>
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <h2>Kontakt</h2>

          <div
            style={{
              display: "grid",
              gap: 16,
              marginTop: 30,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <div 
              className="card-hover"
              style={{ 
                background: "#0a1535", 
                padding: 20, 
                borderRadius: 16,
                cursor: "pointer",
                border: "1px solid transparent",
              }}
            >
              <div className="icon-hover" style={{ display: "inline-block" }}>
                <Mail size={24} style={{ marginBottom: 8 }} />
              </div>
              <p>info@toodoo.se</p>
            </div>

            <div 
              className="card-hover"
              style={{ 
                background: "#0a1535", 
                padding: 20, 
                borderRadius: 16,
                cursor: "pointer",
                border: "1px solid transparent",
              }}
            >
              <div className="icon-hover" style={{ display: "inline-block" }}>
                <MapPin size={24} style={{ marginBottom: 8 }} />
              </div>
              <p>Helsingborg</p>
            </div>

            <div 
              className="card-hover"
              style={{ 
                background: "#0a1535", 
                padding: 20, 
                borderRadius: 16,
                cursor: "pointer",
                border: "1px solid transparent",
              }}
            >
              <div className="icon-hover" style={{ display: "inline-block" }}>
                <Smartphone size={24} style={{ marginBottom: 8 }} />
              </div>
              <p>@toodoo.se</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
