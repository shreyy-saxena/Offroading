import Image from "next/image";

type LogoProps = {
  size?: number;
  className?: string;
};

// The source PNG's flat background was chroma-keyed to transparent so it
// blends into whichever page background (canvas or surface) it sits on —
// see public/logo.png. Not used on the camera hero screen (PhotoStep),
// which is the one full-bleed dark screen in the app.
export function Logo({ size = 32, className = "" }: LogoProps) {
  return <Image src="/logo.png" alt="Offroading" width={size} height={size} className={className} priority />;
}
