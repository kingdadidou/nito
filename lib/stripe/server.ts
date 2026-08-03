import "server-only";
import Stripe from "stripe";
let instance: Stripe | undefined;
export function getStripe() {
  const key=process.env.STRIPE_SECRET_KEY;
  if(!key) throw new Error("STRIPE_SECRET_KEY manquante");
  return instance ??= new Stripe(key, { appInfo:{name:"NITO",version:"0.4.0"} });
}
export const eurosToCents=(value:number)=>Math.round(value*100);
