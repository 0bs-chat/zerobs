import { components } from "./_generated/api";
import { Autumn } from "@useautumn/convex";

export const autumn = new Autumn(components.autumn, {
	secretKey: process.env.AUTUMN_SECRET_KEY ?? "",
	identify: async (ctx: any) => {
		let user = await ctx.auth.getUserIdentity();

		if (!user) return null

		let userId = user.subject.split('|')[0];

		return {
			customerId: userId as string,
			customerData: {
				name: user.name as string,
				email: user.email as string,
			},
		};
	},
});

/**
 * These exports are required for our react hooks and components
 */

export const {
  track,
  cancel,
  query,
  attach,
  check,
  checkout,
  usage,
  setupPayment,
  createCustomer,
  listProducts,
  billingPortal,
  createReferralCode,
  redeemReferralCode,
  createEntity,
  getEntity,
} = autumn.api();

/**
 * Custom track function for internal actions that don't have auth context
 */
export const trackInternal = async (ctx: any, customerId: string, featureId: string, value: number) => {
  // Use the Autumn client directly to track usage with customerId
  const response = await fetch("https://api.useautumn.com/v1/track", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.AUTUMN_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer_id: customerId,
      feature_id: featureId,
      value: value,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to track usage: ${response.statusText}`);
  }
  
  return response.json();
};