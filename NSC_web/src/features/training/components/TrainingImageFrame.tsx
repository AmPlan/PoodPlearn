"use client";

import Image from "next/image";
import { useState } from "react";

type TrainingImageFrameProps = {
	alt: string;
	imageSrc?: string;
	size?: "large" | "choice" | "naming";
	onImageError?: () => void;
};

export function TrainingImageFrame({
	alt,
	imageSrc,
	size = "large",
	onImageError,
}: TrainingImageFrameProps) {
	const [failedSrc, setFailedSrc] = useState<string>();
	const isLarge = size !== "choice";

	const frameClassName =
		size === "naming"
			? "h-[clamp(270px,41dvh,440px)] w-full max-w-[820px] lg:h-[clamp(400px,64dvh,720px)]"
			: isLarge
				? "h-[clamp(220px,38vh,320px)] w-[clamp(220px,38vh,320px)] max-w-full rounded-[34px] p-2"
				: "aspect-square w-full min-w-0";

	const imageClassName =
		size === "naming"
			? "mix-blend-multiply"
			: isLarge
				? "rounded-[26px]"
				: "rounded-[20px] mix-blend-multiply";

	return (
		<div
			className={`flex shrink-0 items-center justify-center ${size === "large" ? "overflow-hidden bg-white/90 shadow-sm ring-1 ring-inset ring-[#CDEEEF]" : ""} ${frameClassName}`}
		>
			{!imageSrc || failedSrc === imageSrc ? (
				<div
					className={`flex h-full w-full items-center justify-center bg-[#F4FCFC] px-4 text-center text-sm font-semibold leading-snug text-[#13756F]/65 ${imageClassName}`}
				>
					รอเพิ่มรูปภาพ
				</div>
			) : (
				<Image
					src={imageSrc}
					alt={alt}
					width={size === "naming" ? 820 : isLarge ? 320 : 400}
					height={size === "naming" ? 720 : isLarge ? 320 : 400}
					sizes={
						size === "naming"
							? "(min-width: 1024px) 58vw, 95vw"
							: size === "choice"
								? "(min-width: 1024px) 320px, (min-width: 640px) 29vw, 44vw"
								: undefined
					}
					className={`h-full w-full object-contain ${imageClassName}`}
					onError={() => {
						setFailedSrc(imageSrc);
						onImageError?.();
					}}
				/>
			)}
		</div>
	);
}
