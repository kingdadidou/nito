export type StripeConnectSnapshot={chargesEnabled:boolean;payoutsEnabled:boolean;detailsSubmitted:boolean;currentlyDue:string[];eventuallyDue:string[];disabledReason:string|null;currentDeadline:number|null};
export type StripeConnectState="non_commence"|"informations_manquantes"|"verification_en_cours"|"action_requise"|"active";
export function stripeConnectState(value:StripeConnectSnapshot|null):StripeConnectState{if(!value)return "non_commence";if(value.chargesEnabled&&value.payoutsEnabled)return "active";if(value.disabledReason||value.currentlyDue.length)return "action_requise";if(value.detailsSubmitted)return "verification_en_cours";return "informations_manquantes"}
export function stripeRequirementsDigest(value:StripeConnectSnapshot){return [...value.currentlyDue].sort().join("|")}
