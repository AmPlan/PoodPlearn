import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { fileURLToPath } from "node:url";
import * as jsxRuntime from "react/jsx-runtime";
import * as icons from "lucide-react";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

function practiceHarness(total) {
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
		return api.usePracticeFlow(total);
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
