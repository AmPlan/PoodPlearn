import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import * as crypto from "node:crypto";
import ts from "typescript";
import { fileURLToPath } from "node:url";
import * as jsxRuntime from "react/jsx-runtime";
import * as icons from "lucide-react";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
test("Practice cues follow the agreed replay/reveal order and never reveal before the last step", async () => {
	for (const [category, maximum, rates] of [
		["spontaneous", 2, [1]],
		["comprehension", 3, [1, 1]],
		["repetition", 3, [0.75, 0.5, 1]],
	]) {
		const h = hooks();
		const played = [];
		const counts = [];
		const { PracticeHints } = load(
			"src/features/training/components/PracticeHints.tsx",
			{
				react: h.react,
				"react/jsx-runtime": jsxRuntime,
				"lucide-react": icons,
				"./practiceStyles": {},
			},
		);
		const props = {
			category,
			source: "/approved.wav",
			answer: "เฉลยทดสอบ",
			disabled: false,
			play: async (source, ended, rate) => played.push(rate),
			onCount: (n) => counts.push(n),
		};
		const render = () => {
			h.reset();
			return PracticeHints(props);
		};
		for (let step = 0; step < maximum; step++) {
			const view = render();
			assert(!textOf(view).includes(props.answer));
			await flatten(view)
				.find((node) => node?.type === "button")
				.props.onClick();
		}
		const view = render();
		assert(textOf(view).includes(props.answer));
		assert(
			flatten(view).find((node) => node?.type === "button").props.disabled,
		);
		assert.deepEqual(played, rates);
		assert.equal(counts.length, maximum);
	}
});
function load(relative, imports = {}, globals = {}) {
	const result = { exports: {} };
	const source = fs.readFileSync(path.join(root, relative), "utf8");
	const compiled = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
			jsx: ts.JsxEmit.ReactJSX,
		},
	}).outputText;
	vm.runInNewContext(compiled, {
		exports: result.exports,
		require: (name) => {
			if (!(name in imports)) throw new Error(`Unexpected dependency ${name}`);
			return imports[name];
		},
		...globals,
	});
	return result.exports;
}
const catalog = load("src/features/training/data/namingCatalog.ts");
const expected = [
	"หมา,นก,วัว,ลา,ควาย,จระเข้,แรด,ปลาหมึก,เต่า,งู,ค้างคาว,ผึ้ง,ยุง,แมลงวัน,แมงมุม",
	"แมว,เป็ด,ช้าง,ม้า,แพะ,กระต่าย,ฮิปโป,ฉลาม,โลมา,กบ,ปู,หอย,นกยูง,มด,ผีเสื้อ",
	"ปลา,ไก่,หมู,ลิง,เสือ,หมี,สิงโต,ยีราฟ,ม้าลาย,กวาง,อูฐ,แกะ,หนู,กระรอก,จิ้งจก",
	"แปรงสีฟัน,ส้อม,กางเกง,มีด,รองเท้า,ปากกา,ถุงเท้า,กระทะ,กระเป๋า,ตู้เย็น,ร่ม,ไมโครเวฟ,ยาสีฟัน,กาต้มน้ำ,รถยนต์",
	"ถ้วย,ขันน้ำ,ถังขยะ,ฝักบัว,กระดาษทิชชู่,ชักโครก,เตียง,แว่นตา,ผ้าห่ม,กรรไกร,โคมไฟ,ไม้กวาด,ตู้เสื้อผ้า,กุญแจ,เสื้อ",
	"ผ้าเช็ดตัว,หวี,สบู่,กระจก,โต๊ะ,เก้าอี้,หมอน,พัดลม,โทรทัศน์,โทรศัพท์,นาฬิกา,ช้อน,แก้วน้ำ,จาน,ยา",
	"กล้วย,มะนาว,ข้าวมันไก่,มะละกอ,มะเขือเทศ,ข้าวผัด,ทุเรียน,ข้าวโพด,ไอศกรีม,ส้ม,สตรอว์เบอร์รี่,ไข่เจียว,แอปเปิ้ล,ไส้กรอก,ก๋วยเตี๋ยว",
	"มังคุด,ข้าว,เค้ก,แตงโม,หมูปิ้ง,ส้มตำ,มะม่วง,แครอท,ต้มจืด,เงาะ,ผัดไทย,ซาลาเปา,มะพร้าว,ลิ้นจี่,ลูกชิ้น",
	"องุ่น,ไข่ดาว,ไข่ต้ม,ลำไย,ขนมปัง,น้ำส้ม,สับปะรด,พิซซ่า,ไก่ทอด,ฝรั่ง,นม,กาแฟ,ชมพู่,ชา,ช็อกโกแลต",
];
test("all 135 words follow the requested nine sets exactly", () => {
	assert.equal(catalog.namingCatalog.length, 9);
	catalog.namingCatalog.forEach((set, index) => {
		assert.equal(set.questions.length, 15);
		assert.equal(set.questions.map((q) => q.answer).join(","), expected[index]);
	});
	assert.equal(
		new Set(catalog.namingCatalog.flatMap((s) => s.questions.map((q) => q.id)))
			.size,
		135,
	);
});
test("all declared images and WAV files exist and have valid signatures", () => {
	const paths = catalog.namingCatalog
		.flatMap((s) => s.questions.flatMap((q) => [q.imageSrc, q.answerAudioSrc]))
		.filter(Boolean);
	paths.push(catalog.NAMING_PROMPT_AUDIO);
	for (const url of paths) {
		const bytes = fs.readFileSync(path.join(root, "public", url));
		// Existing user files include JPEG-encoded images with .png names.
		if (url.endsWith(".png"))
			assert(
				bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" ||
					bytes.subarray(0, 3).toString("hex") === "ffd8ff",
				url,
			);
		else {
			assert.equal(bytes.toString("ascii", 0, 4), "RIFF", url);
			assert.equal(bytes.toString("ascii", 8, 12), "WAVE", url);
		}
		assert(bytes.length > 100, url);
	}
});
test("owner-supplied towel completes all nine image sets; swapped animal folders map correctly", () => {
	assert.equal(catalog.namingCatalog.filter(catalog.isSetReady).length, 9);
	assert.equal(
		catalog
			.missingImages(catalog.findCatalogSet("medium-3"))
			.map((q) => q.answer)
			.join(","),
		"",
	);
	assert.equal(
		catalog.findCatalogSet("medium-3").questions[0].imageSrc,
		"/training_images/equipments/set3/towel.png",
	);
	assert.equal(
		catalog.findCatalogSet("medium-3").questions[0].answerAudioSrc,
		undefined,
	);
	assert.equal(
		catalog.findCatalogSet("easy-1").questions[0].imageSrc,
		"/training_images/animals/set2/dog.png",
	);
	assert.equal(
		catalog.findCatalogSet("easy-2").questions[0].imageSrc,
		"/training_images/animals/set1/cat.png",
	);
});
test("summary distinguishes ungraded answers, skips and backend results", () => {
	const api = load("src/features/training/services/namingFrontendService.ts", {
		"../data/namingCatalog": catalog,
		"./pn002NamingService": {},
	});
	const stats = api.summarizeRound([
		{
			recorded: true,
			skipped: false,
			hintsUsed: 0,
			revealed: false,
			submitted: false,
		},
		{
			recorded: false,
			skipped: true,
			hintsUsed: 3,
			revealed: true,
			submitted: false,
		},
		{
			recorded: false,
			skipped: false,
			hintsUsed: 1,
			revealed: false,
			submitted: true,
			correct: false,
		},
	]);
	assert.equal(stats.completed, 3);
	assert.equal(stats.skipped, 1);
	assert.equal(stats.answered, 1);
	assert.equal(stats.evaluated, 1);
	assert.equal(stats.correct, 0);
	assert.equal(stats.submitted, 1);
});
test("backend sets require exact membership, keep catalog order, reject duplicates", async () => {
	const questions = catalog.namingCatalog[0].questions.map((q, i) => ({
		id: String(i + 100),
		answer: q.answer,
		order: 15 - i,
	}));
	let payload = { success: true, data: { questions } };
	const api = load("src/features/training/services/namingFrontendService.ts", {
		"../data/namingCatalog": catalog,
		"./pn002NamingService": { getNamingSetById: async () => payload },
	});
	const set = await api.loadAssignedNamingSet("999");
	assert.equal(set.backendSetId, "999");
	assert.equal(set.questionIds[0], "100");
	assert.equal(set.questions[0].answer, "หมา");
	payload = {
		success: true,
		data: { questions: questions.map((q, i) => (i === 1 ? questions[0] : q)) },
	};
	await assert.rejects(api.loadAssignedNamingSet("999"));
});

// Hook harness: tests event/state transitions without claiming browser coverage.
function hooks() {
	const slots = [];
	let cursor = 0;
	const cleanups = [];
	return {
		reset() {
			cursor = 0;
		},
		unmount() {
			cleanups.forEach((cleanup) => cleanup());
		},
		react: {
			useState(initial) {
				const i = cursor++;
				if (!(i in slots))
					slots[i] = typeof initial === "function" ? initial() : initial;
				return [
					slots[i],
					(value) => {
						slots[i] = typeof value === "function" ? value(slots[i]) : value;
					},
				];
			},
			useId() {
				return `test-id-${cursor++}`;
			},
			useRef(initial) {
				const i = cursor++;
				if (!(i in slots)) slots[i] = { current: initial };
				return slots[i];
			},
			useEffect(callback) {
				const cleanup = callback();
				if (cleanup) cleanups.push(cleanup);
			},
			useCallback(callback) {
				return callback;
			},
		},
	};
}
function flatten(node) {
	if (node == null || typeof node === "boolean") return [];
	if (Array.isArray(node)) return node.flatMap(flatten);
	return [
		node,
		...(typeof node === "object" ? flatten(node.props?.children) : []),
	];
}
function textOf(node) {
	return flatten(node)
		.filter((item) => typeof item === "string" || typeof item === "number")
		.join("");
}
test("late microphone permission after unmount stops the stream; audio pauses on exit", async () => {
	const h = hooks();
	let resolvePermission;
	let stopped = 0;
	let paused = 0;
	const permission = new Promise((resolve) => {
		resolvePermission = resolve;
	});
	const errors = [];
	const api = load(
		"src/features/training/hooks/useNamingMedia.ts",
		{ react: h.react },
		{
			navigator: { mediaDevices: { getUserMedia: () => permission } },
			MediaRecorder: class {},
			Audio: class {
				play() {
					return Promise.resolve();
				}
				pause() {
					paused++;
				}
				removeAttribute() {}
				load() {}
			},
			Blob,
			DOMException,
			setTimeout,
			clearTimeout,
		},
	);
	const media = api.useNamingMedia((message) => errors.push(message));
	await media.play("/existing.wav");
	const pending = media.toggleRecording();
	h.unmount();
	resolvePermission({
		getTracks: () => [
			{
				stop() {
					stopped++;
				},
			},
		],
	});
	await pending;
	assert.equal(stopped, 1);
	assert(paused >= 1);
	assert.equal(errors.length, 0);
});
test("microphone permission denial is recoverable and recording uses actual MIME type", async () => {
	const h = hooks();
	const errors = [];
	let denied = true;
	let selectedMime;
	let stopped = 0;
	class Recorder {
		static isTypeSupported(type) {
			return type === "audio/webm;codecs=opus";
		}
		constructor(stream, options) {
			this.mimeType = options.mimeType;
			this.state = "inactive";
			selectedMime = options.mimeType;
		}
		start() {
			this.state = "recording";
		}
		stop() {
			this.state = "inactive";
			this.ondataavailable?.({ data: new Blob(["voice"]) });
			this.onstop?.();
		}
	}
	const api = load(
		"src/features/training/hooks/useNamingMedia.ts",
		{ react: h.react },
		{
			navigator: {
				mediaDevices: {
					getUserMedia: async () => {
						if (denied) throw new DOMException("denied", "NotAllowedError");
						return {
							getTracks: () => [
								{
									stop() {
										stopped++;
									},
								},
							],
						};
					},
				},
			},
			MediaRecorder: Recorder,
			Blob,
			DOMException,
			setTimeout,
			clearTimeout,
		},
	);
	function render() {
		h.reset();
		return api.useNamingMedia((message) => errors.push(message));
	}
	let media = render();
	await media.toggleRecording();
	media = render();
	assert.equal(media.micState, "idle");
	assert.equal(errors.length, 1);
	denied = false;
	await media.toggleRecording();
	media = render();
	assert.equal(media.micState, "recording");
	await media.toggleRecording();
	media = render();
	assert.equal(media.micState, "recorded");
	assert.equal(media.blob.type, selectedMime);
	assert(media.blob.size > 0);
	assert(stopped >= 1);
	media.reset();
	media = render();
	assert.equal(media.blob, undefined);
	assert.equal(media.micState, "idle");
	h.unmount();
});

test("patient flow blocks training before assessment and trusts backend status", async () => {
	for (const state of [
		"needs_standard_assessment",
		"has_daily_training_plan",
		"finished_daily_training_plan",
		"offline",
	]) {
		const h = hooks();
		const redirects = [];
		const router = { replace: (url) => redirects.push(url) };
		const auth = { role: "patient", user: { id: 1 } };
		const ui = load("src/features/patient/components/PatientTrainingGate.tsx", {
			"react/jsx-runtime": jsxRuntime,
			react: h.react,
			"next/navigation": { useRouter: () => router },
			"@/features/auth/services/authSession": { getAuthSession: () => auth },
			"../services/patientHomeService": {
				getPatientHomeData: async () => {
					if (state === "offline") throw new Error("offline");
					return { success: true, data: { nextAction: { type: state } } };
				},
			},
		});
		const initial = ui.PatientTrainingGate({ children: "TRAINING" });
		assert.notEqual(initial, "TRAINING");
		await new Promise(setImmediate);
		h.reset();
		const view = ui.PatientTrainingGate({ children: "TRAINING" });
		if (state === "needs_standard_assessment") {
			assert(redirects.includes("/patient/assessment/session"));
			assert.notEqual(view, "TRAINING");
		} else if (state === "offline") {
			assert.notEqual(view, "TRAINING");
			assert.equal(redirects.length, 0);
			assert(flatten(view).some((n) => n.props?.role === "alert"));
		} else assert.equal(view, "TRAINING");
	}
});

test("patient labels hide difficulty; catalog view contains categories and readiness only", () => {
	const presentation = load(
		"src/features/patient/services/patientTrainingPresentation.ts",
	);
	for (const value of [
		"Naming ง่าย",
		"เรียกชื่อภาพ ระดับปานกลาง",
		"Repetition hard",
		"แบบฝึกระดับยาก",
		"Comprehension medium",
	]) {
		assert(
			!/ง่าย|ปานกลาง|ยาก|easy|medium|hard/i.test(
				presentation.patientTrainingTitle(value),
			),
		);
	}
	const library = load("src/features/training/components/NamingLibrary.tsx", {
		"react/jsx-runtime": jsxRuntime,
		"lucide-react": icons,
		"next/link": { default: "a" },
		"../data/namingCatalog": catalog,
	});
	const tree = library.NamingLibrary();
	assert(!/ง่าย|ปานกลาง|ยาก/.test(textOf(tree)));
	assert(textOf(tree).includes("สัตว์"));
	assert(textOf(tree).includes("ของใช้"));
	assert.equal(
		flatten(tree).filter(
			(node) => node.type === "button" && node.props.disabled,
		).length,
		0,
	);
});

test("Naming API adapter submits a real recording without a typed-answer field", async () => {
	let submitted;
	const voice = new Blob(["test-voice"], { type: "audio/webm" });
	const api = load("src/features/training/services/namingFrontendService.ts", {
		"../data/namingCatalog": catalog,
		"./pn002NamingService": {
			submitNamingAnswer: async (payload) => {
				submitted = payload;
				return { success: true, data: {} };
			},
		},
	});
	const result = await api.sendNamingResponse({
		sessionId: "1",
		setId: "5",
		questionId: "100",
		hintsUsed: 1,
		responseTimeMs: 1000,
		voiceFile: voice,
	});
	assert.equal(submitted.voiceFile, voice);
	assert(!("answerText" in submitted));
	assert.equal(result.correct, undefined);
});

test("frontend preview is available only in development", () => {
	for (const mode of ["development", "production", "test"]) {
		const ui = load(
			"src/app/dev/preview/layout.tsx",
			{
				"react/jsx-runtime": jsxRuntime,
				"next/link": { default: "a" },
				"next/navigation": {
					notFound() {
						throw new Error("404");
					},
				},
			},
			{ process: { env: { NODE_ENV: mode } } },
		);
		if (mode === "development")
			assert(textOf(ui.default({ children: "PREVIEW" })).includes("PREVIEW"));
		else assert.throws(() => ui.default({ children: "PREVIEW" }), /404/);
	}
});

test("standard assessment matches all 30 supplied items and category boundaries", () => {
	const blueprint = load(
		"src/features/assessment/data/standardAssessmentBlueprint.ts",
		{
			"@/features/training/data/namingCatalog": catalog,
			"@/features/training/data/patientAudioManifest": {
				patientAudioManifest: { assessmentQuestions: {} },
			},
		},
	);
	const expected = [
		"คุณชื่ออะไร",
		"คุณนามสกุลอะไร",
		"บ้านของคุณอยู่ที่จังหวัดอะไร",
		"หนึ่งสัปดาห์มีกี่วัน",
		"เกลือมีรส…",
		"คุณทำอะไรเมื่อหิวข้าว",
		"กล้วย",
		"เก้าอี้",
		"แมว",
		"พัดลม",
		"คุณเป็น ผู้ชาย ใช่หรือไม่",
		"บ้านของคุณอยู่ที่ ลำปาง ใช่หรือไม่",
		"ช้างตัวเล็กกว่ามด ใช่หรือไม่",
		"เดือนพฤษภาคมมาก่อนเดือนมีนาคม ใช่หรือไม่",
		"คุณกินส้มโดยไม่ปลอกเปลือก ใช่หรือไม่",
		"อากาศร้อนมากในช่วงเดือนธันวาคม ใช่หรือไม่",
		"เตียง",
		"แตงโม",
		"โทรศัพท์",
		"รถติดบนถนน",
		"เมื่อคืนฝนตกหนักมาก",
		"แม่ไปซื้อกับข้าวที่ตลาด",
		"การฝึกพูดทุกวันช่วยให้พูดเก่งขึ้น",
		"แมว",
		"จระเข้",
		"กางเกง",
		"หวี",
		"โทรศัพท์",
		"แอปเปิ้ล",
		"ไข่ต้ม",
	];
	assert.equal(
		JSON.stringify(blueprint.standardAssessmentText),
		JSON.stringify(expected),
	);
	const questions = blueprint.standardAssessmentQuestions;
	assert.equal(questions.length, 30);
	assert.equal(blueprint.standardAssessmentPreview.totalQuestions, 30);
	assert.equal(new Set(questions.map((q) => q.id)).size, 30);
	const counts = ["spontaneous", "comprehension", "repetition", "naming"].map(
		(category) => questions.filter((q) => q.category === category).length,
	);
	assert.equal(counts.join(","), "6,10,7,7");
	questions.forEach((q, i) => assert.equal(q.order, i + 1));
	assert.equal(questions[23].expectedAnswer, "แมว");
	assert.equal(questions[29].expectedAnswer, "ไข่ต้ม");
	for (const q of questions.slice(23)) {
		assert.equal(q.promptText, "ภาพนี้คืออะไร");
		assert(q.imageSrc);
	}
	assert.equal(blueprint.assessmentMediaPending.imageChoiceOrders.length, 0);
	assert.equal(blueprint.assessmentMediaPending.audioOrders.length, 23);
	for (const q of questions.slice(6, 10)) {
		assert.equal(q.choices.length, 3);
		assert.equal(new Set(q.choices.map((choice) => choice.imageSrc)).size, 3);
		assert.equal(
			q.choices.filter(
				(choice) =>
					choice.imageSrc ===
					catalog.namingCatalog
						.flatMap((s) => s.questions)
						.find((item) => item.answer === q.expectedAnswer).imageSrc,
			).length,
			1,
		);
		q.choices.forEach((choice) =>
			assert(fs.existsSync(path.join(root, "public", choice.imageSrc))),
		);
	}
	for (const q of questions.slice(10, 16)) {
		assert.equal(q.expectedAnswer, undefined);
		assert(q.choices.every((choice) => choice.isCorrect === undefined));
	}
	for (const q of questions) {
		if (q.imageSrc)
			assert(fs.existsSync(path.join(root, "public", q.imageSrc)));
		if (q.questionAudioSrc)
			assert(fs.existsSync(path.join(root, "public", q.questionAudioSrc)));
		assert(
			!q.hints?.length,
			"Do not inherit Naming training hints into the assessment",
		);
	}
});

test("only owner-confirmed prerecorded audio is activated", () => {
	const audio = load(
		"src/features/training/data/patientAudioManifest.ts",
		{},
		{ URL },
	);
	assert.equal(
		audio.approvedPatientAudio("/training_sounds/Naming_Question.wav"),
		"/training_sounds/Naming_Question.wav",
	);
	assert.equal(audio.approvedPatientAudio("/audio/Session_End.wav"), undefined);
	assert.equal(
		audio.approvedPatientAudio("/training_sounds/equipments/set2/bed.wav"),
		undefined,
	);
	assert.equal(Object.keys(audio.patientAudioManifest.namingAnswers).length, 0);
	assert.equal(
		Object.keys(audio.patientAudioManifest.assessmentQuestions).length,
		0,
	);
});

function practiceHarness(total, options) {
	const h = hooks();
	let now = 1000;
	let nextId = 0;
	const timers = new Map();
	const flowData = load("src/features/training/services/practiceFlow.ts");
	const api = load(
		"src/features/training/hooks/usePracticeFlow.ts",
		{
			react: h.react,
			"../services/practiceFlow": flowData,
			"../data/patientAudioManifest": {
				patientAudioManifest: {
					feedback: {},
					milestones: {},
					remainingQuestions: {},
				},
			},
		},
		{
			setTimeout: (callback) => {
				const id = ++nextId;
				timers.set(id, callback);
				return id;
			},
			clearTimeout: (id) => timers.delete(id),
			Date: class extends Date {
				static now() {
					return now;
				}
			},
		},
	);
	const render = () => {
		h.reset();
		return api.usePracticeFlow(total, options);
	};
	return {
		render,
		tick() {
			now += 1000;
		},
		fire() {
			const [id, callback] = timers.entries().next().value ?? [];
			assert(callback, "a transition timer must exist");
			timers.delete(id);
			callback();
		},
		unmount() {
			h.unmount();
		},
		timerCount() {
			return timers.size;
		},
	};
}

test("skipped dots stay incomplete, revisit works, and no summary before all answers", () => {
	const h = practiceHarness(3);
	let flow = h.render();
	h.tick();
	flow.skip();
	flow = h.render();
	assert.equal(flow.index, 1);
	assert.equal(flow.entries[0].status, "skipped");
	assert.equal(flow.answered, 0);
	assert.equal(flow.complete({ id: 2 }, false), true);
	assert.equal(flow.complete({ id: 2 }, false), false);
	flow = h.render();
	assert.equal(flow.cue.kind, "wrong");
	assert.equal(flow.entries[1].status, "answered");
	h.fire();
	flow = h.render();
	assert.equal(flow.index, 2);
	h.tick();
	flow.skip();
	flow = h.render();
	assert.equal(flow.cue.kind, "remaining");
	assert.deepEqual(Array.from(flow.cue.remainingQuestions), [1, 3]);
	h.fire();
	flow = h.render();
	assert.equal(flow.index, 0);
	assert.equal(flow.finished, false);
	h.tick();
	flow.goTo(1);
	flow = h.render();
	assert.equal(flow.entries[1].status, "answered");
	assert.equal(flow.complete({}, true), false);
	h.tick();
	flow.goTo(0);
	flow = h.render();
	flow.complete({ id: 1 });
	h.fire();
	flow = h.render();
	assert.equal(flow.index, 2);
	flow.complete({ id: 3 }, true);
	h.fire();
	flow = h.render();
	assert.equal(flow.finished, true);
	assert.equal(flow.answered, 3);
	assert.equal(flow.remaining, 0);
});

test("30-question round reminds only 8 and 15, automatically returns, and finishes only when both answered", () => {
	const h = practiceHarness(30);
	const drain = () => {
		while (h.render().cue) h.fire();
	};
	for (let i = 0; i < 30; i++) {
		const flow = h.render();
		assert.equal(flow.index, i);
		h.tick();
		if (i === 7 || i === 14) flow.skip();
		else {
			flow.complete({ id: i });
			if (i !== 29) drain();
		}
	}
	h.fire();
	let flow = h.render();
	assert.equal(flow.cue.kind, "remaining");
	assert.deepEqual(Array.from(flow.cue.remainingQuestions), [8, 15]);
	assert.equal(flow.finished, false);
	flow.skip(); // Duplicate clicks cannot navigate behind the reminder.
	assert.equal(h.render().index, 29);
	h.fire(); // No click required to return to question 8.
	assert.equal(h.render().index, 7);
	h.tick();
	h.render().skip();
	assert.equal(h.render().index, 14);
	h.render().complete({ id: 14 });
	h.fire();
	flow = h.render();
	assert.deepEqual(Array.from(flow.cue.remainingQuestions), [8]);
	flow.continueNow();
	flow.continueNow(); // Manual continuation is safe to repeat.
	assert.equal(h.render().index, 7);
	h.render().complete({ id: 7 });
	drain();
	assert.equal(h.render().finished, true);
	assert.equal(h.render().answered, 30);
	assert.equal(h.timerCount(), 0);
});

test("Naming advances without per-answer overlays, recovers skipped 3/8, encourages at 5/10/15 and counts actual grades once", () => {
	const h = practiceHarness(15, { perQuestionFeedback: false });
	const milestones = [];
	const answer = () => {
		const flow = h.render();
		const correct = flow.index % 3 === 0 ? undefined : flow.index % 2 === 0;
		const response = {
			questionId: String(flow.index),
			recorded: true,
			submitted: correct !== undefined,
			skipped: false,
			hintsUsed: 0,
			revealed: false,
			correct,
		};
		assert.equal(flow.complete(response, correct), true);
		assert.equal(flow.complete(response, correct), false);
		assert.equal(h.render().cue, null);
		h.fire(); // next task, no per-question animation or Next click
		if (h.render().cue?.kind === "milestone") {
			milestones.push(h.render().answered);
			h.fire();
		}
	};
	for (let i = 0; i < 15; i++) {
		assert.equal(h.render().index, i);
		if (i === 2 || i === 7) {
			h.tick();
			h.render().skip();
		} else answer();
	}
	assert.equal(h.render().finished, false);
	assert.equal(h.render().cue.kind, "remaining");
	assert.deepEqual(Array.from(h.render().cue.remainingQuestions), [3, 8]);
	h.fire();
	assert.equal(h.render().index, 2);
	answer();
	assert.equal(h.render().index, 7);
	answer();
	assert.equal(h.render().finished, true);
	assert.deepEqual(milestones, [5, 10, 15]);
	assert.equal(h.render().remaining, 0);
	const service = load(
		"src/features/training/services/namingFrontendService.ts",
		{ "../data/namingCatalog": catalog, "./pn002NamingService": {} },
	);
	const stats = service.summarizeRound(
		h.render().entries.map((e) => e.response),
	);
	assert.equal(stats.answered, 15);
	assert.equal(stats.evaluated, 10);
	assert.equal(stats.correct, 5);
	assert.equal(h.timerCount(), 0);
});

test("every five unique answers gets encouragement, without counting skips or duplicating records", () => {
	const h = practiceHarness(15);
	let flow = h.render();
	const milestones = [];
	for (let i = 1; i <= 15; i++) {
		assert.equal(flow.complete({ id: i }), true);
		assert.equal(flow.complete({ id: i }), false);
		flow = h.render();
		assert.equal(flow.cue.kind, "received");
		h.fire();
		flow = h.render();
		if (i % 5 === 0) {
			assert.equal(flow.cue.kind, "milestone");
			assert(flow.cue.text.includes(String(i)));
			milestones.push(i);
			h.fire();
			flow = h.render();
		}
	}
	assert.equal(milestones.join(","), "5,10,15");
	assert.equal(flow.finished, true);
	assert.equal(flow.entries.length, 15);
	assert(flow.entries.every((e) => e.status === "answered"));
});

test("manual Continue respects milestone phase; unmount clears pending auto advance", () => {
	const h = practiceHarness(5);
	let flow = h.render();
	for (let i = 1; i <= 5; i++) {
		flow.complete({ id: i });
		flow = h.render();
		flow.continueNow();
		flow = h.render();
	}
	assert.equal(flow.cue.kind, "milestone");
	assert.equal(flow.finished, false);
	assert.equal(h.timerCount(), 1);
	h.unmount();
	assert.equal(h.timerCount(), 0);
});

test("encouragement avoids immediate repeats and early almost-finished messages", () => {
	const data = load("src/features/training/services/practiceFlow.ts");
	const first = data.chooseEncouragement(5, 30, undefined, () => 0);
	const next = data.chooseEncouragement(10, 30, first.id, () => 0);
	assert.notEqual(first.id, next.id);
	assert(!first.text.includes("อีกนิด"));
	assert(first.text.includes("5"));
	const last = data.chooseEncouragement(25, 30, undefined, () => 0.999);
	assert.equal(last.id, "almost");
});

test("wrong feedback is supportive, contains no answer or red style", () => {
	const api = load("src/features/training/components/PracticeFeedback.tsx", {
		"react/jsx-runtime": jsxRuntime,
	});
	const tree = api.PracticeFeedback({
		cue: { kind: "wrong", text: "ไม่เป็นไร ไปต่อกันนะคะ" },
		onContinue() {},
	});
	assert(textOf(tree).includes("ไม่เป็นไร"));
	assert(!/ยังไม่ถูก|ผิด|คะแนน/.test(textOf(tree)));
	assert(
		!flatten(tree).some((n) =>
			/red-|rose-|#F97066|#B42318/.test(n.props?.className ?? ""),
		),
	);
});

test("question dots expose numbered statuses and navigation without a progress bar", () => {
	const h = hooks();
	let selected;
	const api = load("src/features/training/components/QuestionDots.tsx", {
		"react/jsx-runtime": jsxRuntime,
		react: h.react,
		"lucide-react": icons,
	});
	const props = {
		statuses: ["answered", "skipped", "pending"],
		current: 1,
		onSelect(i) {
			selected = i;
		},
	};
	const render = () => {
		h.reset();
		return api.QuestionDots(props);
	};
	let tree = render();
	let trigger = flatten(tree).find(
		(n) => n.props?.["aria-haspopup"] === "dialog",
	);
	assert.equal(trigger.props["aria-expanded"], false);
	assert.equal(
		flatten(tree).find((n) => n.type === "dialog").props.open,
		undefined,
	);
	trigger.props.onClick();
	tree = render();
	trigger = flatten(tree).find((n) => n.props?.["aria-haspopup"] === "dialog");
	assert.equal(trigger.props["aria-expanded"], true);
	const buttons = flatten(tree).filter(
		(n) => n.type === "button" && n.props["aria-label"]?.startsWith("ข้อ "),
	);
	assert.equal(buttons.length, 3);
	assert(buttons[0].props["aria-label"].includes("ทำแล้ว"));
	assert(buttons[1].props["aria-label"].includes("ข้ามไว้"));
	buttons[1].props.onClick();
	assert.equal(selected, 1);
	assert.equal(
		flatten(render()).find((n) => n.props?.["aria-haspopup"] === "dialog")
			.props["aria-expanded"],
		false,
	);
	assert.equal(buttons[1].props["aria-current"], "step");
	assert(!flatten(tree).some((n) => n.type === "progress"));
});

test("Repetition shows its actual sentence; recording submits a blob once without typing", () => {
	function setup(blob) {
		const h = hooks();
		const sent = [];
		const api = load(
			"src/features/assessment/components/AssessmentSessionClient.tsx",
			{
				"react/jsx-runtime": jsxRuntime,
				react: h.react,
				"next/link": { default: "a" },
				"next/navigation": {},
				"lucide-react": icons,
				"@/features/training/hooks/useNamingMedia": {
					useNamingMedia: () => ({
						blob,
						micState: blob ? "recorded" : "idle",
						play() {},
						stopAudio() {},
						toggleRecording() {},
					}),
				},
				"@/features/training/hooks/usePracticeFlow": {},
				"@/features/training/components/QuestionDots": {},
				"@/features/training/components/practiceStyles": {},
				"@/features/training/components/PracticeHints": {
					PracticeHints: () => null,
				},
				"@/features/training/components/PracticeFeedback": {},
				"@/features/training/components/TrainingImageFrame": {
					TrainingImageFrame: "image",
				},
				"@/features/training/components/NamingLibrary": {},
				"@/features/training/data/patientAudioManifest": {
					approvedPatientAudio: () => undefined,
				},
				"../services/standardAssessmentService": {},
			},
		);
		const props = {
			question: {
				id: "q20",
				order: 20,
				interactionType: "repeat_after",
				promptText: "รถติดบนถนน",
			},
			locked: false,
			answered: false,
			busy: false,
			onSubmit: async (answer) => sent.push(answer),
		};
		return {
			render() {
				h.reset();
				return api.AssessmentQuestion(props);
			},
			sent,
			props,
		};
	}
	const missing = setup();
	const tree = missing.render();
	assert(textOf(tree).includes("รถติดบนถนน"));
	assert(textOf(tree).includes("ยังไม่มีเสียงโจทย์"));
	assert(
		flatten(tree)
			.filter((n) => n.type === "button")
			.some((n) => n.props.disabled && n.props["aria-label"] === "รอเสียงโจทย์"),
	);
	assert(
		!flatten(tree).some((n) => n.type === "input" || n.type === "textarea"),
	);
	const voice = new Blob(["voice"], { type: "audio/webm" });
	const recording = setup(voice);
	recording.props.question.interactionType = "name_image";
	recording.render();
	recording.render();
	assert.equal(recording.sent.length, 1);
	assert.equal(recording.sent[0].voiceFile, voice);
	assert(!("mockAnswer" in recording.sent[0]));
	for (const interactionType of ["image_choice", "yes_no_choice"]) {
		const choiceRound = setup();
		choiceRound.props.question = {
			id: "choice-question",
			order: 8,
			interactionType,
			promptText:
				interactionType === "image_choice"
					? "ชี้ภาพเก้าอี้"
					: "บ้านของคุณอยู่ที่ ลำปาง ใช่หรือไม่",
			choices:
				interactionType === "image_choice"
					? [
							{ id: "chair", imageSrc: "/chair.png" },
							{ id: "table", imageSrc: "/table.png" },
							{ id: "bed", imageSrc: "/bed.png" },
						]
					: [
							{ id: "yes", label: "ใช่" },
							{ id: "no", label: "ไม่ใช่" },
						],
		};
		const nodes = flatten(choiceRound.render());
		assert(
			!nodes.some(
				(n) => n.type === "button" && n.props["aria-label"] === "แตะเพื่อพูด",
			),
		);
		const options = nodes.filter(
			(n) =>
				n.type === "button" &&
				(interactionType === "image_choice"
					? n.props["aria-label"]?.startsWith("เลือกภาพ")
					: ["ใช่", "ไม่ใช่"].includes(n.props.children?.at(-1))),
		);
		assert.equal(options.length, interactionType === "image_choice" ? 3 : 2);
		if (interactionType === "image_choice") {
			assert.deepEqual(
				nodes
					.filter((n) => n.type === "image")
					.map((n) => n.props.imageSrc)
					.sort(),
				["/bed.png", "/chair.png", "/table.png"],
			);
		}
		options[0].props.onClick();
		assert.equal(choiceRound.sent.length, 1);
		assert.equal(choiceRound.sent[0].answerType, interactionType);
		assert(choiceRound.sent[0].selectedOptionId);
		assert.equal(choiceRound.sent[0].voiceFile, undefined);
	}
	const spontaneous = setup(voice);
	spontaneous.props.question = {
		id: "name",
		order: 1,
		interactionType: "voice_question",
		promptText: "คุณชื่ออะไร",
	};
	const spokenTree = spontaneous.render();
	assert.equal(spontaneous.sent[0].voiceFile, voice);
	assert(
		!flatten(spokenTree).some(
			(n) => n.type === "input" || n.type === "textarea",
		),
	);
});

test("Naming renders every supplied image without its answer, reveals only after hints, and submits real audio once", () => {
	function setup(question, blob) {
		const h = hooks();
		const sent = [];
		const api = load(
			"src/features/training/components/NamingTrainingSessionClient.tsx",
			{
				"react/jsx-runtime": jsxRuntime,
				react: h.react,
				"next/link": { default: "a" },
				"lucide-react": icons,
				"./PracticeHints": { PracticeHints: () => null },
				"./practiceStyles": load(
					"src/features/training/components/practiceStyles.ts",
				),
				"@/features/auth/services/authSession": {},
				"../data/namingCatalog": catalog,
				"../hooks/useNamingMedia": {
					useNamingMedia: () => ({
						blob,
						micState: blob ? "recorded" : "idle",
						stopAudio() {},
						play() {},
						toggleRecording() {},
					}),
				},
				"../hooks/usePracticeFlow": {},
				"./QuestionDots": {},
				"./PracticeFeedback": {},
				"../data/patientAudioManifest": {
					patientAudioManifest: {
						namingHints: {},
						namingAnswers: {},
						namingInitialSyllables: {},
					},
				},
				"../services/namingFrontendService": {},
				"../services/pn002NamingService": {},
				"./NamingLibrary": {},
				"./TrainingImageFrame": { TrainingImageFrame: "image" },
			},
		);
		return {
			sent,
			render() {
				h.reset();
				return api.NamingQuestion({
					question,
					order: 1,
					locked: false,
					answered: false,
					busy: false,
					onSubmit: async (...args) => sent.push(args),
				});
			},
		};
	}
	for (const set of catalog.namingCatalog) {
		for (const question of set.questions) {
			const tree = setup(question).render();
			assert.equal(
				flatten(tree).find((n) => n.type === "image").props.imageSrc,
				question.imageSrc,
			);
			assert(
				!textOf(tree).includes(question.answer),
				`Premature answer: ${question.id}`,
			);
			assert(
				!flatten(tree).some((n) => n.type === "input" || n.type === "textarea"),
			);
		}
	}
	const question = catalog.namingCatalog[0].questions[0];
	const hints = setup(question);
	const pressHint = () =>
		flatten(hints.render())
			.find(
				(n) =>
					n.type === "button" &&
					["คำใบ้", "เฉลย"].some((label) => textOf(n).includes(label)),
			)
			.props.onClick();
	pressHint();
	assert(textOf(hints.render()).includes(question.featureHint));
	pressHint();
	assert(textOf(hints.render()).includes(question.initialHint));
	pressHint();
	assert(textOf(hints.render()).includes(question.answer));
	assert(!textOf(setup(question).render()).includes(question.answer));
	const blob = new Blob(["patient voice"], { type: "audio/webm" });
	const voice = setup(question, blob);
	voice.render();
	voice.render();
	assert.equal(voice.sent.length, 1);
	assert.equal(voice.sent[0][0], blob);
	assert.equal(voice.sent[0][1], 0);
	assert.equal(voice.sent[0][2], false);
});

const repetition = load("src/features/training/data/repetitionCatalog.ts", {
	"./patientAudioManifest": {
		patientAudioManifest: { repetitionQuestions: {} },
	},
});
test("Repetition matches all 90 supplied items in exact set order; audio is explicitly pending", () => {
	const expected = [
		"หมา|ปลา|หมู|เสื้อ|หวี|เก้าอี้|ปากกา|กล้วยหอม|กินข้าว|ไข่ต้ม",
		"แมว|ไก่|วัว|โต๊ะ|ส้ม|รถยนต์|ช้อนส้อม|กางเกง|ดอกไม้|อาบน้ำ",
		"เตียง|เป็ด|ช้าง|ข้าว|สิบ|เครื่องบิน|แปรงฟัน|แก้วน้ำ|พัดลม|รองเท้า",
		"แปรงสีฟัน|มะละกอ|วิทยุ|กากบาท|หนึ่งร้อยห้าสิบ|ฉันสบายดี|วันนี้วันเสาร์|โทรศัพท์ดังแล้ว|สี่เหลี่ยมจตุรัส|เด็กๆไปเดินเล่น",
		"สับปะรด|จระเข้|โทรทัศน์|ไม้ขีดไฟ|สองร้อยเจ็ดสิบ|อากาศร้อนมาก|ท้องฟ้ามืดแล้ว|แม่กลับมาถึงบ้าน|สี่สิบห้าเปอร์เซ็นต์|น้ำในแก้วหมดแล้ว",
		"ไอศกรีม|รองเท้าแตะ|โทรศัพท์|หัวแม่มือ|ร้อยแปดสิบสาม|ผมกินข้าวแล้ว|สุนัขเห่าดัง|คุณหมอนัดตอนเช้า|น้องสาวทำการบ้าน|รถติดบนถนน",
		"ดอกไม้ในสวนสวยงาม|วันนี้ท้องฟ้าแจ่มใส|สุนัขที่บ้านตัวใหญ่มาก|ตอนเช้าอากาศเย็นสบาย|แม่ครัวทำต้มยำกุ้งน้ำข้น|โรงพยาบาลอยู่ไม่ไกลมาก|ฉันเดินเล่นที่สวนสาธารณะ|ต้นไม้ใหญ่ให้ร่มเงาเย็นสบาย|การออกกำลังกายดีต่อสุขภาพ|พระธาตุลำปางหลวงอยู่ที่จังหวัดลำปาง",
		"พรุ่งนี้ฉันจะไปเที่ยว|ฉันชอบดื่มน้ำมะนาว|ฉันตื่นนอนตอนหกโมงเช้า|นกกาเกาะอยู่บนกิ่งไม้|ฉันชอบกินผลไม้รสเปรี้ยว|แม่ไปซื้อกับข้าวที่ตลาด|แสงแดดตอนเช้าส่องเข้ามาในห้อง|สุนัขที่บ้านของฉันตัวใหญ่มาก|พรุ่งนี้เช้าฉันจะไปโรงพยาบาล|การฝึกพูดทุกวันช่วยให้พูดชัดขึ้น",
		"คุณหมอบอกให้พักผ่อน|เมื่อคืนฝนตกหนักมาก|ฉันลืมกุญแจไว้บนโต๊ะ|แม่บ้านทำความสะอาดบ้าน|วันนี้ฉันเดินได้เยอะขึ้นมาก|พรุ่งนี้ครอบครัวจะมาเยี่ยมฉัน|ล้างมือให้สะอาดก่อนกินอาหาร|ฉันชอบนั่งฟังเพลงเก่าเก่าตอนเช้า|เด็กนักเรียนดีใจเมื่อได้รับคำชม|การฝึกพูดทุกวันช่วยให้พูดเก่งขึ้น",
	];
	assert.equal(repetition.repetitionCatalog.length, 9);
	const ids = new Set();
	repetition.repetitionCatalog.forEach((set, i) => {
		assert.equal(set.questions.length, 10);
		assert.equal(set.questions.map((q) => q.text).join("|"), expected[i]);
		assert.equal(repetition.pendingRepetitionAudio(set).length, 10);
		set.questions.forEach((q) => ids.add(q.id));
	});
	assert.equal(ids.size, 90);
});
test("Repetition backend adapter rejects wrong categories/duplicates and sends only a real voice Blob", async () => {
	const requests = [];
	const api = load(
		"src/features/training/services/repetitionFrontendService.ts",
		{ "../data/repetitionCatalog": repetition },
		{
			FormData,
			Blob,
			fetch: async (url, options) => {
				requests.push({ url, ...options });
				return { ok: true, json: async () => ({ isCorrect: true }) };
			},
		},
	);
	const set = repetition.repetitionCatalog[0];
	const items = set.questions.map((q, i) => ({
		questionId: i + 100,
		question: {
			questionType: "REPETITION",
			repetitionQuestions: [{ text: q.text }],
		},
	}));
	const mapped = api.matchRepetitionSet(
		{ setQuestions: [...items].reverse() },
		"4",
	);
	assert.equal(
		mapped.questionIds.join(","),
		items.map((q) => q.questionId).join(","),
	);
	assert.throws(() =>
		api.matchRepetitionSet(
			{ setQuestions: [...items.slice(1), items[1]] },
			"4",
		),
	);
	assert.throws(() =>
		api.matchRepetitionSet(
			{
				setQuestions: items.map((q) => ({
					...q,
					question: { ...q.question, questionType: "NAMING" },
				})),
			},
			"4",
		),
	);
	const blob = new Blob(["voice"], { type: "audio/webm" });
	const result = await api.sendRepetitionResponse("1", "100", blob, 1500, 2);
	assert.equal(requests[0].body.get("hintsUsed"), "2");
	assert.equal(result.correct, true);
	assert.equal(requests[0].url, "/api/v1/sessions/1/items");
	assert.equal(await requests[0].body.get("voiceFile").text(), "voice");
	assert.equal(requests[0].body.get("responseTime"), "1.5");
	assert(!requests[0].body.has("answerText"));
	await assert.rejects(api.sendRepetitionResponse("1", "100", new Blob(), 0));
});
test("Repetition UI has no difficulty labels or typed answers and blocks recording until approved audio exists", () => {
	function setup(source, blob) {
		const h = hooks();
		const sent = [];
		const ui = load(
			"src/features/training/components/RepetitionTrainingClient.tsx",
			{
				"react/jsx-runtime": jsxRuntime,
				react: h.react,
				"next/link": { default: "a" },
				"lucide-react": icons,
				"@/features/auth/services/authSession": {},
				"../data/repetitionCatalog": {
					...repetition,
					repetitionAudio: () => source,
				},
				"../data/patientAudioManifest": {
					approvedPatientAudio: (value) => value,
				},
				"../hooks/useNamingMedia": {
					useNamingMedia: () => ({
						blob,
						micState: blob ? "recorded" : "idle",
						stopAudio() {},
						play() {},
						toggleRecording() {},
					}),
				},
				"../hooks/usePracticeFlow": {},
				"../services/repetitionFrontendService": {},
				"./NamingLibrary": {},
				"./PracticeFeedback": {},
				"./QuestionDots": {},
				"./PracticeHints": { PracticeHints: () => null },
				"./practiceStyles": load(
					"src/features/training/components/practiceStyles.ts",
				),
			},
		);
		return {
			sent,
			library: ui.RepetitionLibrary,
			render() {
				h.reset();
				return ui.RepetitionQuestionView({
					question: { id: "repetition-easy-3-1", text: "เตียง" },
					busy: false,
					locked: false,
					answered: false,
					onSubmit: async (...args) => sent.push(args),
				});
			},
		};
	}
	const waiting = setup();
	const tree = waiting.render();
	assert(textOf(tree).includes("เตียง"));
	assert(textOf(tree).includes("ยังไม่มีเสียงโจทย์"));
	assert(
		flatten(tree).some(
			(n) =>
				n.type === "button" &&
				n.props.disabled &&
				n.props["aria-label"] === "รอเสียงโจทย์",
		),
	);
	assert(
		!flatten(tree).some((n) => n.type === "input" || n.type === "textarea"),
	);
	assert(!/ง่าย|ปานกลาง|ยาก/.test(textOf(waiting.library({ preview: true }))));
	const blob = new Blob(["patient voice"]);
	const ready = setup("/approved.wav", blob);
	ready.render();
	ready.render();
	assert.equal(ready.sent.length, 1);
	assert.equal(ready.sent[0][0], blob);
});
test("Repetition 10-item flow encourages at five and ten and returns to an unfinished item before finishing", () => {
	const h = practiceHarness(10, { perQuestionFeedback: false });
	const milestones = [];
	const answer = () => {
		h.render().complete({});
		h.fire();
		if (h.render().cue?.kind === "milestone") {
			milestones.push(h.render().answered);
			h.fire();
		}
	};
	for (let i = 0; i < 10; i++) {
		if (i === 2) {
			h.tick();
			h.render().skip();
		} else answer();
	}
	assert.equal(h.render().finished, false);
	assert.equal(h.render().cue.kind, "remaining");
	h.fire();
	assert.equal(h.render().index, 2);
	answer();
	assert.equal(h.render().finished, true);
	assert.deepEqual(milestones, [5, 10]);
});

const comprehension = load(
	"src/features/training/data/comprehensionCatalog.ts",
	{
		"./namingCatalog": catalog,
		"./patientAudioManifest": {
			patientAudioManifest: { comprehensionQuestions: {} },
		},
	},
);
test("Comprehension matches 90 supplied items, with personal examples kept out of patient prompts", () => {
	const expected = [
		"หมา|ปลา|หมู|เสื้อ|ปากกา|เก้าอี้|หวี|กล้วย|องุ่น|ไข่ต้ม",
		"แมว|ไก่|วัว|โต๊ะ|กางเกง|รถยนต์|แปรงสีฟัน|ส้ม|สับปะรด|ไอศกรีม",
		"จระเข้|เป็ด|ช้าง|แก้วน้ำ|พัดลม|รองเท้า|เตียง|แอปเปิ้ล|มะละกอ|น้ำส้ม",
		"คุณชื่อ (สมหญิง) ใช่หรือไม่|คุณเป็น ผู้ชาย ใช่หรือไม่|คุณเป็น หมอ ใช่หรือไม่|บ้านของคุณอยู่ที่ กรุงเทพ ใช่หรือไม่|บ้านของคุณอยู่ที่ ลำปาง ใช่หรือไม่|ตอนนี้คุณกำลังลืมตา ใช่หรือไม่|คุณกินข้าว เมื่อหิว ใช่หรือไม่|สุนัขมี 4 ขา ใช่หรือไม่|ไฟมีความร้อน ใช่หรือไม่|แมวมีปีก ใช่หรือไม่",
		"คุณชื่อ (สมชาย) ใช่หรือไม่|คุณเป็น ผู้หญิง ใช่หรือไม่|คุณเป็น ตำรวจ ใช่หรือไม่|บ้านของคุณอยู่ที่ กรุงเทพ ใช่หรือไม่|บ้านของคุณอยู่ที่ ลำปาง ใช่หรือไม่|ตอนนี้คุณกำลังหลับตา ใช่หรือไม่|คุณนอนหลับ เมื่อง่วงนอน ใช่หรือไม่|กล้วยสุกมีสีเหลือง ใช่หรือไม่|มะนาวมีรสหวาน ใช่หรือไม่|สุนัขหมายถึงหมา ใช่หรือไม่",
		"คุณชื่อ (สมหมาย) ใช่หรือไม่|คุณเป็น ผู้ชาย ใช่หรือไม่|คุณเป็น ครู ใช่หรือไม่|บ้านของคุณอยู่ที่ กรุงเทพ ใช่หรือไม่|บ้านของคุณอยู่ที่ ลำปาง ใช่หรือไม่|ตอนนี้คุณกำลังหลับตา ใช่หรือไม่|คุณนอนหลับ เมื่อหิว ใช่หรือไม่|แมวร้อง เมี้ยวเมี้ยว ใช่หรือไม่|น้ำแข็งมีความเย็น ใช่หรือไม่|พริกมีรสเปรี้ยว ใช่หรือไม่",
		"ช้างตัวเล็กกว่ามด ใช่หรือไม่|หู ใช้สำหรับฟังเสียง ใช่หรือไม่|มือ ใช้สำหรับหยิบจับสิ่งของ ใช่หรือไม่|แปรงสีฟันใช้สำหรับสระผม ใช่หรือไม่|ร่มใช้สำหรับกันฝน ใช่หรือไม่|โทรศัพท์ใช้สำหรับดูเวลาและคุยสาย ใช่หรือไม่|แว่นตาใช้สำหรับใส่ที่ปาก ใช่หรือไม่|วันเสาร์มาก่อนวันศุกร์ ใช่หรือไม่|เราต้องถุงเท้าก่อนใส่รองเท้า ใช่หรือไม่|เดือนกุมภาพันธ์มาก่อนเดือนกันยายน ใช่หรือไม่",
		"ปลาอาศัยอยู่ในน้ำ ใช่หรือไม่|ตา ใช้สำหรับพูด ใช่หรือไม่|เท้า ใช้สำหรับเดิน ใช่หรือไม่|ช้อนใช้สำหรับตักข้าว ใช่หรือไม่|ผ้าเช็ดตัวใช้สำหรับดื่มน้ำ ใช่หรือไม่|ตู้เย็นใช้สำหรับอุ่นอาหารให้ร้อน ใช่หรือไม่|เราใช้มีดตักข้าว ใช่หรือไม่|พระอาทิตย์ขึ้นทางทิศตะวันตก ใช่หรือไม่|เมื่อฝนตกเราต้องกางร่ม ใช่หรือไม่|เดือนพฤษภาคมมาก่อนเดือนมีนาคม ใช่หรือไม่",
		"นกบินได้ ใช่หรือไม่|จมูก ใช้สำหรับดมกลิ่นและหายใจ ใช่หรือไม่|ปาก ใช้สำหรับมองเห็น ใช่หรือไม่|หมอน ใช้สำหรับจัดแต่งทรงผม ใช่หรือไม่|สบู่ใช้สำหรับทำความสะอาดร่างกาย ใช่หรือไม่|กรรไกรใช้สำหรับตัดกระดาษ ใช่หรือไม่|เราใช้หวีตัดผม ใช่หรือไม่|น้ำเน่าเสียเกิดจากการทิ้งขยะลงแม่น้ำ ใช่หรือไม่|คุณกินส้มโดยไม่ปลอกเปลือก ใช่หรือไม่|อากาศร้อนมากในช่วงเดือนธันวาคม ใช่หรือไม่",
	];
	assert.equal(comprehension.comprehensionCatalog.length, 9);
	const all = comprehension.comprehensionCatalog.flatMap(
		(set) => set.questions,
	);
	assert.equal(new Set(all.map((q) => q.id)).size, 90);
	comprehension.comprehensionCatalog.forEach((set, i) => {
		assert.equal(set.questions.length, 10);
		assert.equal(
			set.questions
				.map((q) => q.target ?? q.sourcePromptText ?? q.promptText)
				.join("|"),
			expected[i],
		);
		assert.equal(comprehension.pendingComprehensionAudio(set).length, 10);
	});
	const personal = all.filter((q) => q.personalField);
	assert.equal(personal.length, 15);
	assert(
		personal.every((q) => !q.personalizationReady && /…/.test(q.promptText)),
	);
	assert(
		personal.every(
			(q) => !/สมหญิง|สมชาย|สมหมาย|กรุงเทพ|ลำปาง/.test(q.promptText),
		),
	);
});
test("All 30 Comprehension picture targets and distractors reuse existing Naming assets without answer labels", () => {
	const known = new Set(
		catalog.namingCatalog.flatMap((set) =>
			set.questions.map((q) => q.imageSrc),
		),
	);
	for (const q of comprehension.comprehensionCatalog
		.slice(0, 3)
		.flatMap((set) => set.questions)) {
		assert.equal(q.choices.length, 3);
		assert.equal(new Set(q.choices.map((c) => c.imageSrc)).size, 3);
		assert(
			q.choices.every(
				(c) =>
					known.has(c.imageSrc) &&
					fs.existsSync(path.join(root, "public", c.imageSrc)),
			),
		);
		assert(q.choices.every((c) => !c.label.includes(q.target)));
		const target = catalog.namingCatalog
			.flatMap((set) => set.questions)
			.find((item) => item.answer === q.target);
		assert.equal(
			q.choices.find((c) => c.id === q.correctChoiceId).imageSrc,
			target.imageSrc,
		);
		assert.equal(
			comprehension.evaluateComprehensionChoice(q, q.correctChoiceId),
			true,
		);
		assert.equal(
			comprehension.evaluateComprehensionChoice(
				q,
				q.choices.find((c) => c.id !== q.correctChoiceId).id,
			),
			false,
		);
	}
	const set = comprehension.comprehensionCatalog[3];
	assert.throws(() =>
		comprehension.evaluateComprehensionChoice(set.questions[0], "yes"),
	);
	assert.equal(
		comprehension.evaluateComprehensionChoice(set.questions[5], "yes"),
		undefined,
	);
	assert.equal(
		comprehension.evaluateComprehensionChoice(set.questions[9], "no"),
		true,
	);
	assert.equal(
		comprehension.evaluateComprehensionChoice(
			comprehension.comprehensionCatalog[8].questions[9],
			"yes",
		),
		undefined,
	);
});
test("Comprehension backend mapping gates unresolved personal prompts and sends actual choices, not voice or fabricated grades", async () => {
	const requests = [];
	const api = load(
		"src/features/training/services/comprehensionFrontendService.ts",
		{
			"../data/comprehensionCatalog": comprehension,
			"../data/namingCatalog": catalog,
			"../data/patientAudioManifest": {
				approvedPatientAudio: (value) => value,
			},
		},
		{
			FormData,
			fetch: async (url, options) => {
				requests.push({ url, ...options });
				return { ok: true, json: async () => ({ isCorrect: false }) };
			},
		},
	);
	const set = comprehension.comprehensionCatalog[3];
	const items = set.questions.map((q, i) => ({
		questionId: 100 + i,
		orderIndex: i + 1,
		question: {
			questionType: "COMPREHENSION",
			ComprehensionQuestion: [{ questionText: q.sourcePromptText }],
		},
	}));
	const pending = api.matchComprehensionSet(
		{ setQuestions: [...items].reverse() },
		"4",
	);
	assert.equal(comprehension.pendingComprehensionData(pending).length, 5);
	assert(!pending.questions[0].promptText.includes("สมหญิง"));
	await assert.rejects(
		api.sendComprehensionResponse("1", "100", pending.questions[0], {
			selectedOptionId: "yes",
		}),
	);
	assert.equal(requests.length, 0);
	items[0].question.ComprehensionQuestion[0] = {
		questionText: set.questions[0].sourcePromptText,
		resolvedQuestionText: "คุณชื่อ ทดสอบ ใช่หรือไม่",
		personalizationComplete: true,
	};
	const ready = api.matchComprehensionSet({ setQuestions: items }, "4");
	assert.equal(ready.questions[0].promptText, "คุณชื่อ ทดสอบ ใช่หรือไม่");
	assert.equal(ready.questions[0].personalizationReady, true);
	assert.equal(ready.questions[0].questionAudioSrc, undefined);
	assert.equal(
		(
			await api.sendComprehensionResponse("1", "100", ready.questions[0], {
				selectedOptionId: "no",
				responseTimeMs: 1000,
			})
		).correct,
		false,
	);
	assert.equal(requests[0].body.get("answerBoolean"), "false");
	assert(!requests[0].body.has("voiceFile"));
	assert(!requests[0].body.has("isCorrect"));
	assert.throws(() =>
		api.matchComprehensionSet(
			{ setQuestions: [...items.slice(1), items[1]] },
			"4",
		),
	);
	const q = comprehension.comprehensionCatalog[0].questions[0];
	await api.sendComprehensionResponse("1", "101", q, {
		selectedOptionId: q.correctChoiceId,
	});
	assert.equal(requests[1].body.get("answerImageUrl"), q.choices[0].imageSrc);
	assert(!requests[1].body.has("answerBoolean"));
});
test("Comprehension patient UI never displays unfilled personal templates and delegates valid choices to the assessment UI", () => {
	const ui = load(
		"src/features/training/components/ComprehensionTrainingClient.tsx",
		{
			"react/jsx-runtime": jsxRuntime,
			react: hooks().react,
			"next/link": { default: "a" },
			"lucide-react": icons,
			"@/features/auth/services/authSession": {},
			"../data/comprehensionCatalog": comprehension,
			"@/features/assessment/components/AssessmentSessionClient": {
				AssessmentQuestion: "choices",
			},
			"../data/patientAudioManifest": {},
			"../hooks/useNamingMedia": {},
			"../hooks/usePracticeFlow": {},
			"../services/comprehensionFrontendService": {},
			"./NamingLibrary": {},
			"./PracticeFeedback": {},
			"./QuestionDots": {},
			"./PracticeHints": { PracticeHints: () => null },
			"./practiceStyles": load(
				"src/features/training/components/practiceStyles.ts",
			),
		},
	);
	const personal = comprehension.comprehensionCatalog[3].questions[0];
	const tree = ui.ComprehensionQuestionView({ question: personal });
	assert(textOf(tree).includes("รอคำถามของคุณ"));
	assert(!/สมหญิง|คุณชื่อ|…/.test(textOf(tree)));
	assert(!flatten(tree).some((n) => n.type === "choices"));
	const image = comprehension.comprehensionCatalog[0].questions[0];
	assert.equal(
		ui.ComprehensionQuestionView({ question: image }).type,
		"choices",
	);
	assert(
		!/ง่าย|ปานกลาง|ยาก/.test(textOf(ui.ComprehensionLibrary({ preview: true }))),
	);
});
test("Comprehension incorrect answers get supportive wording and automatically advance", () => {
	const h = practiceHarness(10, {
		feedbackMessages: { wrong: "ไม่เป็นไรนะคะ ไปต่อกันค่ะ" },
	});
	h.render().complete({ selected: "no" }, false);
	assert.equal(h.render().cue.text, "ไม่เป็นไรนะคะ ไปต่อกันค่ะ");
	assert(!/ผิด|ไม่ได้/.test(h.render().cue.text));
	h.fire();
	assert.equal(h.render().index, 1);
});

const spontaneousData = load(
	"src/features/training/data/spontaneousCatalog.ts",
	{
		"./patientAudioManifest": {
			patientAudioManifest: { spontaneousQuestions: {} },
		},
	},
);
test("Spontaneous preserves all 90 supplied questions and separates answers from prompts", () => {
	const personal = (gender) =>
		`คุณชื่ออะไร|คุณนามสกุลอะไร|บ้านของคุณอยู่ที่จังหวัดอะไร|${gender}|คุณมีอาชีพอะไร|คุณเกิดวันที่เท่าไหร่|คุณเกิดเดือนอะไร|คุณเกิดปีพ.ศ.อะไร|หนึ่งสัปดาห์มีกี่วัน (เจ็ดวัน)|หนึ่งปีมีกี่เดือน (สิบสองเดือน)`;
	const expected = [
		personal("คุณเป็นผู้หญิงหรือผู้ชาย"),
		personal("คุณเป็นผู้ชายหรือผู้หญิง"),
		personal("คุณเป็นเพศอะไร"),
		"เกลือมีรส…(เค็ม)|ใบไม้มีสี…(เขียว)|แอปเปิ้ลเป็นผลไม้ที่มีสี…(แดง)|พระอาทิตย์ขึ้นตอน…(เช้า)|ดินสอใช้สำหรับ…(เขียน)|นกบินอยู่บน…(ฟ้า)|รถวิ่งอยู่บน…(ถนน)|อยากดูละครต้องเปิด…(ทีวี)|อยากรู้เวลาต้องดู…(นาฬิกา)|เสื้อผ้ายับเราต้องใช้…(เตารีด)",
		"น้ำตาลมีรส…(หวาน)|กล้วยเป็นผลไม้ที่มีสี…(เหลือง)|นมวัวมีสี…(ขาว)|พระจันทร์ออกมาตอน…(กลางคืน)|น้ำแข็งทำมาจาก…(น้ำ)|ว่าวลอยอยู่บน…(ฟ้า)|เรือแล่นอยู่ใน…(น้ำ)|มืดแล้วต้องเปิด…(ไฟ)|อยากรู้วันที่ต้องดู…(ปฏิทิน)|ผมยุ่งเราต้องใช้…(หวี)",
		"มะนาวมีรส…(เปรี้ยว)|ส้มเป็นผลไม้ที่มีสี…(ส้ม)|ปลาว่ายอยู่ใน…(น้ำ)|ลูกบอลมีรูปร่าง…(กลม)|ฝนตกทำให้พื้น…(เปียก)|หนังสือใช้สำหรับ…(อ่าน)|เครื่องบินอยู่บน…(ท้องฟ้า)|เรานั่งอยู่บน…(เก้าอี้)|เวลาแต่งตัวต้องส่อง…(กระจก)|ตามองเห็นไม่ชัดต้องใส่…(แว่นตา)",
		"ไก่งามเพราะขน คนงามเพราะ…(แต่ง)|คนรักเท่าผืนหนัง คนชังเท่าผืน…(เสื่อ)|คุณทำอะไรเมื่อหิวข้าว (กินข้าว)|ดวงอาทิตย์ขึ้นทางทิศไหน (ทิศตะวันออก)|เรามีนิ้วมือทั้งหมดกี่นิ้ว (สิบนิ้ว)|คุณใช้อะไรแปรงฟัน (แปรงสีฟัน)|หนึ่งวันมีกี่ชั่วโมง (ยี่สิบสี่ชั่วโมง)|เมื่อไม่สบาย ต้องไปที่ไหน (โรงพยาบาล)|ถ้าอยากขึ้นรถไฟต้องไปที่ไหน (สถานีรถไฟ)|จังหวัดลำปางอยู่ภาคอะไรของประเทศไทย (ภาคเหนือ)",
		"ดูช้างให้ดูหาง ดูนางให้ดู…(แม่)|น้ำร้อนปลาเป็น น้ำเย็นปลา…(ตาย)|คุณทำอะไรเมื่อง่วง (นอนหลับ)|ดวงอาทิตย์ตกทางทิศไหน (ทิศตะวันตก)|ดวงอาทิตย์ตกตอนไหน (ตอนเย็น)|ไข่หนึ่งโหลมีกี่ฟอง (สิบสองฟอง)|หนึ่งชั่วโมงมีกี่นาที (หกสิบนาที)|เด็กนักเรียนเรียนหนังสือที่ไหน (โรงเรียน)|ถ้าอยากขึ้นเครื่องบินต้องไปที่ไหน (สนามบิน)|จังหวัดเชียงใหม่อยู่ภาคอะไรของประเทศไทย (ภาคเหนือ)",
		"ตกน้ำไม่ไหล ตกไฟไม่…(ไหม้)|น้ำพึ่งเรือ เสือพึ่ง…(ป่า)|คุณทำอะไรเมื่อหิวน้ำ (กินน้ำ)|ฝนตกมากในฤดูอะไร (ฤดูฝน)|ดวงอาทิตย์ขึ้นตอนไหน (ตอนเช้า)|รถยนต์มีกี่ล้อ (สี่ล้อ)|หนึ่งวันมีกี่ชั่วโมง (ยี่สิบสี่ชั่วโมง)|ตำรวจทำงานที่ไหน (สถานีตำรวจ)|ถ้าอยากไหว้พระทำบุญต้องไปที่ไหน (วัด)|จังหวัดเชียงรายอยู่ภาคอะไรของประเทศไทย (ภาคเหนือ)",
	];
	assert.equal(spontaneousData.spontaneousCatalog.length, 9);
	const all = spontaneousData.spontaneousCatalog.flatMap(
		(set) => set.questions,
	);
	assert.equal(new Set(all.map((q) => q.id)).size, 90);
	assert.equal(all.filter((q) => q.patientField).length, 24);
	assert(
		all
			.filter((q) => q.patientField)
			.every((q) => q.referenceAnswers.length === 0),
	);
	spontaneousData.spontaneousCatalog.forEach((set, index) => {
		assert.equal(set.questions.length, 10);
		assert.equal(
			set.questions.map((q) => q.sourceText).join("|"),
			expected[index],
		);
		assert.equal(spontaneousData.pendingSpontaneousAudio(set).length, 10);
		for (const q of set.questions) {
			assert(!/[()]/.test(q.text));
			assert.equal(
				q.text,
				q.sourceText.replace(/\s*\([^()]*\)\s*$/, "").trim(),
			);
			assert.equal(
				q.referenceAnswers[0],
				q.sourceText.match(/\(([^()]*)\)\s*$/)?.[1],
			);
		}
	});
});
test("Spontaneous API matches clean questions and submits only actual voice, never supplied answer keys", async () => {
	const requests = [];
	const api = load(
		"src/features/training/services/spontaneousFrontendService.ts",
		{ "../data/spontaneousCatalog": spontaneousData },
		{
			FormData,
			fetch: async (url, options) => {
				requests.push({ url, ...options });
				return { ok: true, json: async () => ({}) };
			},
		},
	);
	const set = spontaneousData.spontaneousCatalog[3];
	const items = set.questions.map((q, i) => ({
		questionId: i + 100,
		question: {
			questionType: "SPONTANEOUS",
			spontaneousQuestions: [{ questionText: i % 2 ? q.sourceText : q.text }],
		},
	}));
	const mapped = api.matchSpontaneousSet(
		{ setQuestions: [...items].reverse() },
		"5",
	);
	assert.equal(
		mapped.questionIds.join(","),
		items.map((q) => q.questionId).join(","),
	);
	assert.throws(() =>
		api.matchSpontaneousSet(
			{ setQuestions: [...items.slice(1), items[1]] },
			"5",
		),
	);
	assert.throws(() =>
		api.matchSpontaneousSet(
			{
				setQuestions: items.map((q) => ({
					...q,
					question: { ...q.question, questionType: "REPETITION" },
				})),
			},
			"5",
		),
	);
	const blob = new Blob(["spoken answer"], { type: "audio/webm" });
	const result = await api.sendSpontaneousResponse("1", "100", blob, 1250, 1);
	assert.equal(requests[0].body.get("hintsUsed"), "1");
	assert.equal(result.correct, undefined);
	const form = requests[0].body;
	assert.equal(await form.get("voiceFile").text(), "spoken answer");
	assert.equal(form.get("responseTime"), "1.25");
	assert(!form.has("answerText"));
	assert(!form.has("referenceAnswers"));
	assert(!form.has("isCorrect"));
	await assert.rejects(api.sendSpontaneousResponse("1", "100", new Blob(), 0));
});
test("Spontaneous UI renders prompts without bracketed answers and accepts voice once without typing", () => {
	function setup(blob) {
		const h = hooks();
		const sent = [];
		const ui = load(
			"src/features/training/components/SpontaneousTrainingClient.tsx",
			{
				"react/jsx-runtime": jsxRuntime,
				react: h.react,
				"next/link": { default: "a" },
				"lucide-react": icons,
				"@/features/auth/services/authSession": {},
				"../data/spontaneousCatalog": spontaneousData,
				"../data/patientAudioManifest": {
					approvedPatientAudio: () => undefined,
				},
				"../hooks/useNamingMedia": {
					useNamingMedia: () => ({
						blob,
						micState: blob ? "recorded" : "idle",
						stopAudio() {},
						play() {},
						toggleRecording() {},
					}),
				},
				"../hooks/usePracticeFlow": {},
				"../services/spontaneousFrontendService": {},
				"./NamingLibrary": {},
				"./PracticeFeedback": {},
				"./QuestionDots": {},
				"./PracticeHints": { PracticeHints: () => null },
				"./practiceStyles": load(
					"src/features/training/components/practiceStyles.ts",
				),
			},
		);
		return {
			sent,
			library: ui.SpontaneousLibrary,
			render(question) {
				h.reset();
				return ui.SpontaneousQuestionView({
					question,
					locked: false,
					answered: false,
					busy: false,
					onSubmit: async (...args) => sent.push(args),
				});
			},
		};
	}
	const blank = setup();
	for (const question of spontaneousData.spontaneousCatalog.flatMap(
		(set) => set.questions,
	)) {
		const tree = blank.render(question);
		assert(textOf(tree).includes(question.text));
		assert(!/[()]/.test(textOf(tree)));
		if (
			question.referenceAnswers[0] &&
			!question.text.includes(question.referenceAnswers[0])
		)
			assert(!textOf(tree).includes(question.referenceAnswers[0]));
		assert(
			!flatten(tree).some((n) => n.type === "input" || n.type === "textarea"),
		);
	}
	assert(!/ง่าย|ปานกลาง|ยาก/.test(textOf(blank.library({ preview: true }))));
	const blob = new Blob(["voice"]);
	const recorded = setup(blob);
	const question = spontaneousData.spontaneousCatalog[3].questions[0];
	recorded.render(question);
	recorded.render(question);
	assert.equal(recorded.sent.length, 1);
	assert.equal(recorded.sent[0][0], blob);
});

test("Clinical CSV exports require a therapist before database access and retain literal CSV cells", async () => {
	class ResponseMock {
		constructor(body, options = {}) {
			this.body = body;
			this.status = options.status ?? 200;
			this.headers = options.headers ?? {};
		}
		static json(body, options) {
			return new ResponseMock(body, options);
		}
	}
	let session = null;
	const guard = load("src/lib/api-auth.ts", {
		"next/headers": {
			cookies: async () => ({ get: () => ({ value: "fixture-cookie" }) }),
		},
		"next/server": { NextResponse: ResponseMock },
		"./auth": { AUTH_COOKIE_NAME: "nsc_session", verifySession: () => session },
	});
	const csv = load("src/lib/csv.ts");
	assert.equal(csv.csvEscape('a,"b"\nc'), '"a,""b""\nc"');
	assert.equal(csv.csvEscape(" =1+1"), "' =1+1");
	assert.equal(csv.csvEscape("@SUM(1)"), "'@SUM(1)");
	assert.equal(csv.csvEscape(-1), "-1");
	assert.equal(csv.csvEscape(false), "false");
	assert.equal(csv.csvEscape(null), "");
	const createdAt = new Date("2026-11-17T00:00:00Z");
	const question = {
		questionId: 100,
		questionType: "REPETITION",
		repetitionQuestions: [{ text: 'คำ, "ทดสอบ"' }],
		difficultyLevel: { difficultyName: "ง่าย" },
	};
	const item = {
		question,
		createdAt,
		asrText: "ทดสอบ",
		isCorrect: false,
		correctness: 0,
		responseTime: 0,
		score: 0,
		hintsUsed: 0,
	};
	const patient = { patientFirstName: "=1+1", patientLastName: "ทดสอบ" };
	for (const kind of ["assessments", "sessions"]) {
		let reads = 0;
		const record =
			kind === "assessments"
				? {
						assessmentResultId: 1,
						patientId: 7,
						setId: 9,
						patient,
						startedAt: createdAt,
						endedAt: createdAt,
						assessmentItemResults: [{ ...item, assessmentItemResultId: 55 }],
					}
				: {
						sessionId: 1,
						patientId: 7,
						patient,
						sessionCategoryResult: {
							setId: 9,
							sessionCategoryId: 2,
							totalScore: 0,
							averageResponseTime: 0,
							averageHintUsed: 0,
							startedAt: createdAt,
							endedAt: createdAt,
							sessionItemResults: [{ ...item, sessionItemId: 55 }],
						},
					};
		const model = {
			findUnique: async () => {
				reads++;
				return record;
			},
		};
		const route = load(`src/app/api/v1/${kind}/[id]/export/route.ts`, {
			"next/server": { NextResponse: ResponseMock },
			"@/lib/prisma": {
				prisma: { assessmentResult: model, sessionResult: model },
			},
			"@/lib/api-auth": guard,
			"@/lib/csv": csv,
		});
		session = null;
		assert.equal(
			(await route.GET({}, { params: Promise.resolve({ id: "1" }) })).status,
			401,
		);
		session = { role: "PATIENT", patientId: 7 };
		assert.equal(
			(await route.GET({}, { params: Promise.resolve({ id: "1" }) })).status,
			403,
		);
		assert.equal(reads, 0);
		session = { role: "THERAPIST" };
		assert.equal(
			(await route.GET({}, { params: Promise.resolve({ id: "invalid" }) }))
				.status,
			400,
		);
		assert.equal(reads, 0);
		const response = await route.GET(
			{},
			{ params: Promise.resolve({ id: "1" }) },
		);
		assert.equal(response.status, 200);
		assert.equal(reads, 1);
		assert(response.body.startsWith("\uFEFF"));
		assert(response.body.includes("'=1+1 ทดสอบ"));
		assert(response.body.includes('"คำ, ""ทดสอบ"""'));
		assert.equal(response.headers["Content-Type"], "text/csv; charset=utf-8");
	}
});
test("Therapist clinical requests reject invalid patient IDs and distinguish failed loads from empty history", async () => {
	let calls = 0;
	let mode = "failure";
	const api = load(
		"src/features/therapist/services/therapistClinicalService.ts",
		{
			"@/features/training/services/pn002NamingService": {
				getSavedNamingResponsesForPatient: () => [],
			},
			"@/lib/baseUrl": { getBaseUrl: () => "http://fixture.local" },
		},
		{
			window: {},
			URLSearchParams,
			fetch: async (url) => {
				calls++;
				assert(url.includes("patientId=7"));
				return {
					ok: mode !== "failure",
					json: async () =>
						mode === "malformed" ? { data: {} } : { data: [] },
				};
			},
		},
	);
	for (const fn of [
		api.getPatientClinicalOverview,
		api.getPatientSessionResults,
	]) {
		assert.equal((await fn("invalid")).success, false);
		assert.equal((await fn("0")).success, false);
	}
	assert.equal(calls, 0);
	for (const fn of [
		api.getPatientClinicalOverview,
		api.getPatientSessionResults,
	]) {
		mode = "failure";
		assert.equal((await fn("7")).success, false);
		mode = "malformed";
		assert.equal((await fn("7")).success, false);
		mode = "empty";
		assert.equal((await fn("7")).success, true);
	}
});
test("Therapist review keeps unknown grades ungraded and cannot overwrite backend grades with local notes", async () => {
	const h = hooks();
	const fixtures = [
		{ id: "session-1", date: "2026-11-17", aiCorrect: undefined },
		{ id: "session-2", date: "2026-11-17", aiCorrect: false },
	];
	const ui = load(
		"src/features/therapist/components/SessionReviewList.tsx",
		{
			"react/jsx-runtime": jsxRuntime,
			react: { ...h.react, default: h.react },
			"../services/therapistClinicalService": {
				getPatientSessionResults: async () => ({
					success: true,
					data: fixtures,
				}),
			},
		},
		{
			window: {
				localStorage: {
					getItem: () =>
						JSON.stringify({
							"session-1": {
								aiCorrect: true,
								asrTranscript: "fake",
								therapistNote: "note",
							},
						}),
					setItem() {
						throw new Error("quota");
					},
				},
			},
		},
	);
	const render = () => {
		h.reset();
		return ui.SessionReviewList({ patientId: "7", initialItems: fixtures });
	};
	render();
	await new Promise((resolve) => setImmediate(resolve));
	let tree = render();
	assert(textOf(tree).includes("รอผลตรวจจากระบบ"));
	assert(textOf(tree).includes("ไม่ถูกต้อง"));
	assert(!textOf(tree).includes("fake"));
	assert(textOf(tree).includes("ยังไม่ส่งเข้า Backend"));
	const note = flatten(tree).find((n) => n.type === "textarea");
	assert.equal(note.props.value, "note");
	note.props.onChange({ target: { value: "edited note" } });
	tree = render();
	assert(flatten(tree).some((n) => n.props?.role === "alert"));
	assert(textOf(tree).includes("กรุณาสำรองข้อความไว้ก่อน"));
});

test("Production authentication cannot use the development signing-secret fallback", () => {
	assert.throws(
		() =>
			load(
				"src/lib/auth.ts",
				{ "node:crypto": crypto },
				{ Buffer, process: { env: { NODE_ENV: "production" } } },
			),
		/AUTH_SECRET/,
	);
	const auth = load(
		"src/lib/auth.ts",
		{ "node:crypto": crypto },
		{
			Buffer,
			process: {
				env: {
					NODE_ENV: "production",
					AUTH_SECRET: "fixture-secret-for-regression-only",
				},
			},
		},
	);
	const value = auth.signSession({
		userId: 1,
		account: "fixture",
		role: "PATIENT",
		patientId: 7,
	});
	assert.equal(auth.verifySession(value).patientId, 7);
	assert.equal(auth.verifySession(value + "tampered"), null);
});

test("feedback audio continues once on end and cannot advance after cancellation", async () => {
	const h = hooks();
	const audios = [];
	let continued = 0;
	const api = load(
		"src/features/training/hooks/useNamingMedia.ts",
		{ react: h.react },
		{
			Audio: class {
				constructor() {
					audios.push(this);
				}
				play() {
					return Promise.resolve();
				}
				pause() {}
				removeAttribute() {}
				load() {}
			},
			setTimeout,
			clearTimeout,
		},
	);
	const media = api.useNamingMedia(() => {});
	await media.play("/approved.wav", () => continued++);
	audios[0].onended();
	audios[0].onended();
	assert.equal(continued, 1);
	await media.play("/another.wav", () => continued++);
	media.stopAudio();
	audios[1].onended();
	assert.equal(continued, 1);
	h.unmount();
});
