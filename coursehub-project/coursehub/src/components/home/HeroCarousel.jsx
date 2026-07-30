import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";


const slides = [
        {
            id: 1,
            image: "/home/hero-coursehub-1.webp",
            alt: "...",
            href: "/courses",
            objectPosition: "object-center",
        },
        {
            id: 2,
            image: "/home/hero-coursehub-2.webp",
            alt: "...",
            href: "/register",
            objectPosition: "object-center",
        },
        {
            id: 3,
            image: "/home/hero-coursehub-4.webp",
            alt: "...",
            href: "/courses",
            objectPosition: "object-[center_42%]",
        },
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] =
    useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentSlide((previousSlide) =>
        previousSlide === slides.length - 1
          ? 0
          : previousSlide + 1
      );
    }, 6000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  function showPreviousSlide() {
    setCurrentSlide((previousSlide) =>
      previousSlide === 0
        ? slides.length - 1
        : previousSlide - 1
    );
  }

  function showNextSlide() {
    setCurrentSlide((previousSlide) =>
      previousSlide === slides.length - 1
        ? 0
        : previousSlide + 1
    );
  }

  return (
    <section
      aria-label="Destaques do CourseHub"
      className="relative overflow-hidden bg-slate-950"
    >
      <div className="relative aspect-[1648/580] w-full">
        {slides.map((slide, index) => {
          const isActive =
            index === currentSlide;

          return (
            <Link
              key={slide.id}
              to={slide.href}
              aria-hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
              className={`absolute inset-0 transition-opacity duration-700 ${
                isActive
                  ? "z-10 opacity-100"
                  : "pointer-events-none z-0 opacity-0"
              }`}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                className={`h-full w-full object-cover ${slide.objectPosition}`}
              />
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={showPreviousSlide}
        aria-label="Mostrar banner anterior"
        className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/30 p-2.5 text-white backdrop-blur-sm transition hover:bg-black/50 sm:flex"
      >
        <ChevronLeft size={24} />
      </button>

      <button
        type="button"
        onClick={showNextSlide}
        aria-label="Mostrar próximo banner"
        className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/30 p-2.5 text-white backdrop-blur-sm transition hover:bg-black/50 sm:flex"
      >
        <ChevronRight size={24} />
      </button>

      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
        {slides.map((slide, index) => {
          const isActive =
            index === currentSlide;

          return (
            <button
              key={slide.id}
              type="button"
              onClick={() =>
                setCurrentSlide(index)
              }
              aria-label={`Mostrar banner ${index + 1}`}
              aria-current={
                isActive ? "true" : undefined
              }
              className={`rounded-full transition-all ${
                isActive
                  ? "h-2.5 w-8 bg-white"
                  : "h-2.5 w-2.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          );
        })}
      </div>
    </section>
  );
}