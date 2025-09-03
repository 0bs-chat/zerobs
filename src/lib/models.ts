export const models: {
	label: string;
	model_name: string;
	model: string;
	isThinking: boolean;
	toolSupport: boolean;
	provider: "openai" | "google";
	modalities: ("text" | "image" | "pdf")[];
	image: string;
	description: string;
	owner:
		| "openai"
		| "google"
		| "x-ai"
		| "anthropic"
		| "deepseek"
		| "moonshotai"
		| "openrouter"
		| "cypher"
		| "qwen"
		| "kimi";
	usageRateMultiplier: number;
	hidden?: boolean;
	type?: "chat" | "embeddings";
	temperature?: number;
	parser?: "base" | "functionCalling";
}[] = [
	{
		label: "GPT-5 Mini",
		model_name: "gpt-5-mini",
		model: "openai/gpt-5-mini",
		isThinking: true,
		toolSupport: false,
		provider: "openai",
		modalities: ["text", "image"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqeptdPa1iGzX5t6K9HPo7rZCflV3QEyx01m8u",
		description:
			"GPT-5 Mini is a compact version of GPT-5, designed to handle lighter-weight reasoning tasks. It provides the same instruction-following and safety-tuning benefits as GPT-5, but with reduced latency and cost. GPT-5 Mini is the successor to OpenAI's o4-mini model.",
		owner: "openai",
		usageRateMultiplier: 1.0,
		temperature: 0.3,
	},
	{
		label: "GPT-5 Chat",
		model_name: "gpt-5-chat",
		model: "openai/gpt-5-chat",
		isThinking: false,
		toolSupport: false,
		provider: "openai",
		modalities: ["text", "image"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqeptdPa1iGzX5t6K9HPo7rZCflV3QEyx01m8u",
		description:
			"GPT-5 Chat is designed for advanced, natural, multimodal, and context-aware conversations for enterprise applications.",
		owner: "openai",
		usageRateMultiplier: 1.0,
		temperature: 0.3,
	},
	{
		label: "Gemini 2.5 Flash",
		model_name: "gemini-2.5-flash",
		model: "google/gemini-2.5-flash",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image", "pdf"],
		image:
			"https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
		description:
			"Gemini 2.5 Flash is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
		owner: "google",
		usageRateMultiplier: 1.0,
		temperature: 1.0,
		parser: "functionCalling",
	},
	{
		label: "Gemini 2.5 Flash Thinking",
		model_name: "gemini-2.5-flash-thinking",
		model: "google/gemini-2.5-flash",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image", "pdf"],
		image:
			"https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
		description:
			"Gemini 2.5 Flash Thinking is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
		owner: "google",
		usageRateMultiplier: 1.0,
		temperature: 1.0,
		parser: "functionCalling",
	},
	{
		label: "Gemini 2.5 Pro",
		model_name: "gemini-2.5-pro",
		model: "google/gemini-2.5-pro-preview",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image", "pdf"],
		image:
			"https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
		description:
			"Gemini 2.5 Pro is an advanced model designed for high-performance tasks across various modalities.",
		owner: "google",
		usageRateMultiplier: 1.5,
		temperature: 1.0,
		parser: "functionCalling",
	},

	{
		label: "GPT-4.1",
		model_name: "gpt-4.1",
		model: "openai/gpt-4.1",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqeptdPa1iGzX5t6K9HPo7rZCflV3QEyx01m8u",
		description:
			"GPT-4.1 is a state-of-the-art language model capable of understanding and generating human-like text.",
		owner: "openai",
		usageRateMultiplier: 1.0,
	},
	{
		label: "o4 mini",
		model_name: "o4-mini",
		model: "openai/o4-mini",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqeptdPa1iGzX5t6K9HPo7rZCflV3QEyx01m8u",
		description:
			"o4 mini is a state-of-the-art language model capable of understanding and generating human-like text.",
		owner: "openai",
		usageRateMultiplier: 1.0,
	},
	{
		label: "o3",
		model_name: "o3",
		model: "openai/o3",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqeptdPa1iGzX5t6K9HPo7rZCflV3QEyx01m8u",
		description:
			"o3 is a state-of-the-art language model capable of understanding and generating human-like text.",
		owner: "openai",
		usageRateMultiplier: 1.5,
	},
	{
		label: "GPT OSS 120B",
		model_name: "gpt-oss-120b",
		model: "openai/gpt-oss-120b",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		modalities: ["text"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqeptdPa1iGzX5t6K9HPo7rZCflV3QEyx01m8u",
		description:
			"GPT OSS 120B is an open-weight, 117B-parameter Mixture-of-Experts (MoE) language model from OpenAI designed for high-reasoning, agentic, and general-purpose production use cases. It activates 5.1B parameters per forward pass and supports configurable reasoning depth, full chain-of-thought access, and native tool use.",
		owner: "openai",
		usageRateMultiplier: 1.0,
		temperature: 0.3,
	},
	{
		label: "Claude 4",
		model_name: "claude-4",
		model: "anthropic/claude-sonnet-4",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image", "pdf"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqERtPmCxK7iJruFcAblpzLxNM30vHj4R1XQGm",
		description:
			"Claude 4 is a versatile model that excels in various text and image processing tasks.",
		owner: "anthropic",
		usageRateMultiplier: 2.0,
		temperature: 0.5,
		parser: "functionCalling",
	},
	{
		label: "Worker",
		model_name: "worker",
		model: "google/gemini-2.0-flash-001",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image", "pdf"],
		image:
			"https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
		description:
			"The Worker model is designed for specialized tasks requiring high efficiency.",
		owner: "openai",
		usageRateMultiplier: 1.0,
		hidden: true,
		temperature: 1.0,
		parser: "functionCalling",
	},
	{
		label: "Deepseek R1",
		model_name: "deepseek-r1-0528",
		model: "deepseek/deepseek-r1-0528:free",
		isThinking: true,
		toolSupport: false,
		provider: "openai",
		modalities: ["text"],
		image:
			"https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWSc6tHQtOkQ3diauvF12HnrWNtOmhI0eYwBKzf",
		description:
			"Deepseek R1 is a model focused on deep learning tasks with a strong emphasis on text processing.",
		owner: "deepseek",
		usageRateMultiplier: 1.0,
	},
	{
		label: "Embeddings",
		model_name: "embeddings",
		model: "text-embedding-004",
		isThinking: false,
		toolSupport: false,
		provider: "google",
		modalities: ["text"],
		image:
			"https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
		description:
			"The Embeddings model is designed for generating high-quality text embeddings.",
		usageRateMultiplier: 1.0,
		hidden: true,
		owner: "google",
		type: "embeddings",
	},
	{
		label: "Grok 3 Mini",
		model_name: "grok-3-mini",
		model: "x-ai/grok-3-mini-beta",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		modalities: ["text"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqTWQGWJKcCZGuB4JXj70amYe8kDsr5IfyOV6o",
		description:
			"Grok 3 Mini is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
		owner: "x-ai",
		usageRateMultiplier: 1.5,
	},
	{
		label: "Grok 4",
		model_name: "grok-4",
		model: "x-ai/grok-4",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqTWQGWJKcCZGuB4JXj70amYe8kDsr5IfyOV6o",
		description:
			"Grok 4 is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
		owner: "x-ai",
		usageRateMultiplier: 2.0,
	},
	{
		label: "Kimi K2",
		model_name: "kimi-k2",
		model: "moonshotai/kimi-k2:free",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		modalities: ["text"],
		image:
			"https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://moonshot.ai&size=256",
		description:
			"Kimi K2 is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
		owner: "moonshotai",
		usageRateMultiplier: 1.0,
	},
	{
		label: "Qwen 3 235B",
		model_name: "qwen3-235b-a22b-2507",
		model: "qwen/qwen3-235b-a22b-2507:free",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		owner: "qwen",
		modalities: ["text"],
		image: "https://www.google.com/s2/favicons?domain=chat.qwen.ai&sz=256",
		description:
			"Qwen 3 235B is a large language model from Qwen, suitable for a wide range of text generation tasks.",
		usageRateMultiplier: 1.0,
		parser: "functionCalling",
	},
	{
		label: "Qwen 3 Coder",
		model_name: "qwen3-coder",
		model: "qwen/qwen3-coder:free",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		owner: "qwen",
		modalities: ["text"],
		image: "https://www.google.com/s2/favicons?domain=chat.qwen.ai&sz=256",
		description:
			"Qwen 3 Coder is a code-focused model from Qwen, designed for programming and code generation tasks.",
		usageRateMultiplier: 1.0,
		parser: "functionCalling",
	},
];
