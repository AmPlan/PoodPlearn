import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { fileURLToPath } from "node:url";
import * as jsxRuntime from "react/jsx-runtime";
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
test("missing towel blocks medium set 3; swapped animal folders map correctly", () => {
	assert.equal(catalog.namingCatalog.filter(catalog.isSetReady).length, 8);
	assert.equal(
		catalog
			.missingImages(catalog.findCatalogSet("medium-3"))
			.map((q) => q.answer)
			.join(","),
		"ผ้าเช็ดตัว",
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
			typed: false,
			skipped: false,
			hintsUsed: 0,
			revealed: false,
			submitted: false,
		},
		{
			recorded: false,
			typed: false,
			skipped: true,
			hintsUsed: 3,
			revealed: true,
			submitted: false,
		},
		{
			recorded: false,
			typed: true,
			skipped: false,
			hintsUsed: 1,
			revealed: false,
			submitted: true,
			correct: false,
		},
	]);
	assert.equal(stats.completed, 3);
	assert.equal(stats.skipped, 1);
	assert.equal(stats.answered, 2);
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
test("first/last question, hints, reveal, rapid next/skip, reset, summary and repeat controls", () => {
	const h = hooks();
	let now = 1000;
	let resets = 0;
	let repeated = false;
	const media = {
		micState: "idle",
		reset() {
			resets++;
		},
		stopAudio() {},
		play() {},
		toggleRecording() {},
	};
	const api = load("src/features/training/services/namingFrontendService.ts", {
		"../data/namingCatalog": catalog,
		"./pn002NamingService": {},
	});
	const ui = load(
		"src/features/training/components/NamingTrainingSessionClient.tsx",
		{
			"react/jsx-runtime": jsxRuntime,
			react: h.react,
			"next/link": { default: "a" },
			"@/features/auth/services/authSession": {},
			"../data/namingCatalog": catalog,
			"../hooks/useNamingMedia": { useNamingMedia: () => media },
			"../services/namingFrontendService": api,
			"../services/pn002NamingService": {},
			"./NamingLibrary": {},
			"./TrainingImageFrame": { TrainingImageFrame: "image" },
		},
		{
			Date: class extends Date {
				static now() {
					return now;
				}
			},
		},
	);
	function render() {
		h.reset();
		return ui.NamingRound({
			set: catalog.namingCatalog[0],
			onRepeat: () => {
				repeated = true;
			},
		});
	}
	let tree = render();
	function button(label) {
		const result = flatten(tree).find(
			(n) => n.type === "button" && textOf(n) === label,
		);
		assert(result, label);
		return result;
	}
	function click(label) {
		now += 1000;
		const b = button(label);
		assert(!b.props.disabled, label);
		b.props.onClick();
		tree = render();
	}
	assert(textOf(tree).includes("ข้อ 1 จาก 15"));
	assert(!flatten(tree).some((n) => typeof n === "string" && n === "หมา"));
	assert(button("ข้อถัดไป").props.disabled);
	click("คำใบ้ 0/2");
	click("คำใบ้ 1/2");
	click("เฉลย");
	assert(textOf(tree).includes("หมา"));
	assert(!button("ข้อถัดไป").props.disabled);
	now += 1000;
	const next = button("ข้อถัดไป").props.onClick;
	next();
	next();
	tree = render();
	assert(textOf(tree).includes("ข้อ 2 จาก 15"));
	assert(button("ข้อถัดไป").props.disabled);
	assert(button("เฉลย").props.disabled);
	assert(button("คำใบ้ 0/2"));
	for (let i = 2; i <= 14; i++) click("ข้ามข้อนี้");
	assert(textOf(tree).includes("ข้อ 15 จาก 15"));
	click("ข้ามข้อนี้");
	assert(textOf(tree).includes("ผลจากการฝึกรอบนี้ 15 จาก 15 ข้อ"));
	assert(textOf(tree).includes("ยังไม่มีผลประเมินความถูกต้อง"));
	assert.equal(resets, 15);
	click("ฝึกซ้ำ");
	assert(repeated);
	assert(
		flatten(tree).some(
			(n) => n.props?.href === "/patient/training/naming/animals",
		),
	);
});

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
