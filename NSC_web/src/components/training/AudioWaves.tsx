export function AudioWaves() {
	const waveHeights = [9, 20, 34, 50, 68, 50, 34, 20, 9];

	return (
		<>
			<div className="absolute left-[8%] top-1/2 hidden -translate-y-1/2 items-center gap-2 text-[#86D9D2]/75 lg:flex">
				{waveHeights.map((height, index) => (
					<span
						key={`l-wave-${index}`}
						className="w-2.5 rounded-full bg-current"
						style={{ height }}
					/>
				))}
			</div>

			<div className="absolute right-[8%] top-1/2 hidden -translate-y-1/2 items-center gap-2 text-[#86D9D2]/75 lg:flex">
				{waveHeights.map((height, index) => (
					<span
						key={`r-wave-${index}`}
						className="w-2.5 rounded-full bg-current"
						style={{ height }}
					/>
				))}
			</div>
		</>
	);
}