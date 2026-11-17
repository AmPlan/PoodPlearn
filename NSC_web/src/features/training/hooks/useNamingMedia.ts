"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useNamingMedia(onError: (message: string) => void) {
	const audio = useRef<HTMLAudioElement | null>(null);
	const recorder = useRef<MediaRecorder | null>(null);
	const stream = useRef<MediaStream | null>(null);
	const generation = useRef(0);
	const busy = useRef(false);
	const limitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [micState, setMicState] = useState<
		"idle" | "requesting" | "recording" | "recorded"
	>("idle");
	const [blob, setBlob] = useState<Blob>();

	const stopAudio = useCallback(() => {
		if (audio.current) {
			audio.current.pause();
			audio.current.removeAttribute("src");
			audio.current.load();
			audio.current = null;
		}
	}, []);
	const releaseHardware = useCallback(() => {
		generation.current++;
		if (limitTimer.current) clearTimeout(limitTimer.current);
		if (recorder.current) {
			recorder.current.onstop = null;
			recorder.current.ondataavailable = null;
			if (recorder.current.state !== "inactive") recorder.current.stop();
		}
		stream.current?.getTracks().forEach((track) => track.stop());
		stream.current = null;
		recorder.current = null;
		busy.current = false;
	}, []);
	const reset = useCallback(() => {
		stopAudio();
		releaseHardware();
		setBlob(undefined);
		setMicState("idle");
	}, [stopAudio, releaseHardware]);

	const play = useCallback(
		async (src?: string, onEnded?: () => void) => {
			if (!src || busy.current) return;
			stopAudio();
			const next = new Audio(src);
			audio.current = next;
			let ended = false;
			const finish = () => {
				if (!ended && audio.current === next) {
					ended = true;
					onEnded?.();
				}
			};
			next.onended = finish;
			next.onerror = () => {
				if (audio.current === next) onError("เล่นเสียงไม่ได้ คุณยังฝึกต่อได้");
				finish();
			};
			try {
				await next.play();
			} catch {
				if (audio.current === next)
					onError("เล่นไฟล์เสียงไม่ได้ กรุณาลองอีกครั้ง คุณยังฝึกต่อได้โดยไม่เปิดเสียง");
				finish();
			}
		},
		[stopAudio, onError],
	);

	async function toggleRecording(): Promise<boolean> {
		if (micState === "recording" && recorder.current) {
			if (limitTimer.current) clearTimeout(limitTimer.current);
			recorder.current.stop();
			return true;
		}
		if (busy.current) return false;
		if (
			!navigator.mediaDevices?.getUserMedia ||
			typeof MediaRecorder === "undefined"
		) {
			onError("เปิดไมโครโฟนไม่ได้ กรุณาให้ผู้ดูแลช่วยตรวจเบราว์เซอร์");
			return false;
		}
		stopAudio();
		busy.current = true;
		setMicState("requesting");
		setBlob(undefined);
		const token = generation.current;
		let acquired: MediaStream | undefined;
		try {
			acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
			if (token !== generation.current) {
				acquired.getTracks().forEach((track) => track.stop());
				return false;
			}
			stream.current = acquired;
			const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
				(type) => MediaRecorder.isTypeSupported(type),
			);
			const next = new MediaRecorder(
				acquired,
				mime ? { mimeType: mime } : undefined,
			);
			recorder.current = next;
			const chunks: BlobPart[] = [];
			next.ondataavailable = (event) => {
				if (event.data.size) chunks.push(event.data);
			};
			next.onstop = () => {
				acquired?.getTracks().forEach((track) => track.stop());
				if (token !== generation.current) return;
				busy.current = false;
				const recording = new Blob(chunks, { type: next.mimeType });
				if (!recording.size) {
					setMicState("idle");
					onError("ไม่ได้รับเสียง กรุณาลองบันทึกอีกครั้ง");
					return;
				}
				setBlob(recording);
				setMicState("recorded");
			};
			next.onerror = () => {
				releaseHardware();
				setMicState("idle");
				onError("บันทึกเสียงไม่สำเร็จ กรุณาลองอีกครั้ง");
			};
			next.start();
			setMicState("recording");
			limitTimer.current = setTimeout(() => {
				if (next.state === "recording") next.stop();
			}, 60000);
			return true;
		} catch (error) {
			acquired?.getTracks().forEach((track) => track.stop());
			if (token !== generation.current) return false;
			busy.current = false;
			setMicState("idle");
			onError(
				error instanceof DOMException && error.name === "NotAllowedError"
					? "กรุณาอนุญาตไมโครโฟน แล้วลองอีกครั้ง"
					: "เปิดไมโครโฟนไม่ได้ กรุณาให้ผู้ดูแลช่วยตรวจอุปกรณ์",
			);
			return false;
		}
	}

	useEffect(
		() => () => {
			stopAudio();
			releaseHardware();
		},
		[stopAudio, releaseHardware],
	);
	return { micState, blob, play, stopAudio, reset, toggleRecording };
}
