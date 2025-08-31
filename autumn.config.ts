import {
	feature,
	product,
	featureItem,
	priceItem,
} from "atmn";

// Base features that get tracked
export const messages = feature({
	id: "messages",
	name: "Messages",
	type: "continuous_use", // Base feature that gets tracked
});

export const mcps = feature({
	id: "mcps",
	name: "Cloud MCPs",
	type: "continuous_use", // Base feature that gets tracked
});

// Products
export const free = product({
	id: "free",
	name: "Free",
	is_default: true,
	items: [
		featureItem({
			feature_id: mcps.id,
			included_usage: 8,
			// No interval = No reset (hard cap)
		}),

		featureItem({
			feature_id: messages.id,
			included_usage: 8,
			interval: "day",
		}),
	],
});

export const pro = product({
	id: "pro",
	name: "Pro",
	items: [
		priceItem({
			price: 10,
			interval: "month",
		}),

		featureItem({
			feature_id: mcps.id,
			included_usage: 100,
			// No interval = No reset (hard cap)
		}),

		featureItem({
			feature_id: messages.id,
			included_usage: 1000,
			interval: "month",
		}),
	],
});
