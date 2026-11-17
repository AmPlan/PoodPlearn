import { NamingLibrary } from "@/features/training/components/NamingLibrary";
export default function Page() {
	return (
		<NamingLibrary
			backHref="/dev/preview/returning"
			setHrefPrefix="/dev/preview/naming"
		/>
	);
}
