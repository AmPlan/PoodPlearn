"use client";

import Image from "next/image";
import { useState } from "react";

type TrainingImageFrameProps = {
  alt: string;
  imageSrc?: string;
  size?: "large" | "choice";
};

export function TrainingImageFrame({
  alt,
  imageSrc,
  size = "large",
}: TrainingImageFrameProps) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const isLarge = size === "large";

  const frameClassName = isLarge
    ? "h-[clamp(220px,38vh,320px)] w-[clamp(220px,38vh,320px)] rounded-[34px] p-2"
    : "h-[clamp(112px,20vh,164px)] w-[clamp(112px,20vh,164px)] rounded-[24px] p-2";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-white/90 shadow-sm ring-1 ring-[#CDEEEF] ${frameClassName}`}
    >
      {!imageSrc || failedSrc === imageSrc ? (
        <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-[#F4FCFC] px-4 text-center text-sm font-semibold leading-snug text-[#13756F]/65">
          รอเพิ่มรูปภาพ
        </div>
      ) : (
        <Image
          src={imageSrc}
          alt={alt}
          width={isLarge ? 320 : 180}
          height={isLarge ? 320 : 180}
          className="h-full w-full object-contain"
          onError={() => setFailedSrc(imageSrc)}
        />
      )}
    </div>
  );
}
