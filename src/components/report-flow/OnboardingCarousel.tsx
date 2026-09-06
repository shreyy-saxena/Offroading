"use client";

import { useState } from "react";
import { CtaButton } from "@/components/ui/CtaButton";
import { Logo } from "@/components/ui/Logo";

type Slide = { title: string; body: string };

const SLIDES: Slide[] = [
  {
    title: "Click & report potholes near you",
    body: "Snap a photo of a pothole and help get it fixed.",
  },
  {
    title: "How it works",
    body: "Click a photo → confirm location → log it or email the authority. You can even share it on social media.",
  },
  {
    title: "No login needed",
    body: "Get started in seconds — no account required.",
  },
];

type OnboardingCarouselProps = {
  onComplete: () => void;
};

// First-visit-only intro (gated by ../onboarding-store) shown before the
// camera hero screen — addresses the privacy doubt of an app opening
// straight into camera+location by explaining what it does first. No skip:
// all 3 slides are required, per product decision.
export function OnboardingCarousel({ onComplete }: OnboardingCarouselProps) {
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  return (
    <div className="flex min-h-svh flex-col justify-between bg-canvas p-6 text-ink">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Logo size={96} />
        <h1 className="text-heading text-ink">{slide.title}</h1>
        <p className="max-w-xs text-body text-muted">{slide.body}</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2" aria-hidden="true">
          {SLIDES.map((s, i) => (
            <span
              key={s.title}
              className={`h-2 w-2 rounded-full ${i === index ? "bg-ink" : "bg-ink/20"}`}
            />
          ))}
        </div>
        <CtaButton onClick={() => (isLast ? onComplete() : setIndex(index + 1))} className="max-w-xs">
          {isLast ? "Let's Go" : "Next"}
        </CtaButton>
      </div>
    </div>
  );
}
