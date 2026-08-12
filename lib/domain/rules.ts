import type {Role} from "@/lib/types";

export const signupIntents=["participer","organiser","les_deux"] as const;
export type SignupIntent=(typeof signupIntents)[number];
export function normalizeSignupIntent(value:string):SignupIntent{return signupIntents.includes(value as SignupIntent)?value as SignupIntent:"participer"}
export function isValidPassword(password:string){return password.length>=8}
export function postSignupDestination(intent:SignupIntent,hasSession:boolean){return hasSession?(intent==="participer"?"/profil":"/organisateur/onboarding"):"/inscription?confirmation=envoyee"}
export function canAccessRole(role:Role,allowed:Role[]){return allowed.includes(role)}

export function reservedPlaces(bookings:{number_of_people:number;booking_status:string}[]){return bookings.filter(b=>["en_attente","confirmee"].includes(b.booking_status)).reduce((sum,b)=>sum+b.number_of_people,0)}
export function canReserve(input:{status:string;registrationsClosed:boolean;date:string;organizerId:string;userId:string;maximumParticipants:number;alreadyReserved:number;quantity:number}){return input.status==="publiee"&&!input.registrationsClosed&&input.date>=new Date().toISOString().slice(0,10)&&input.organizerId!==input.userId&&Number.isInteger(input.quantity)&&input.quantity>=1&&input.quantity<=20&&input.alreadyReserved+input.quantity<=input.maximumParticipants}
export function canChangeCapacity(maximum:number,confirmedPlaces:number){return Number.isInteger(maximum)&&maximum>=Math.max(1,confirmedPlaces)&&maximum<=100}
export function canOrganizerCancel(status:string){return ["en_attente","publiee"].includes(status)}

export function refundStatus(status:string){return status==="succeeded"?"rembourse":status==="failed"||status==="canceled"?"echoue":"en_attente"}
export function paymentFailureState(){return {payment_status:"echoue" as const,booking_status:"annulee" as const}}
export function isSupportedStripeEvent(type:string){return ["checkout.session.completed","checkout.session.async_payment_succeeded","checkout.session.async_payment_failed","checkout.session.expired","payment_intent.payment_failed","charge.refunded","refund.updated","refund.created","charge.dispute.created","charge.dispute.updated","charge.dispute.closed","account.updated","identity.verification_session.processing","identity.verification_session.requires_input","identity.verification_session.verified","identity.verification_session.canceled","payout.created","payout.updated","payout.paid","payout.failed"].includes(type)}

export const allowedAttachmentTypes=new Set(["application/pdf","image/jpeg","image/png","image/webp"]);
export function validAttachment(file:{type:string;size:number}){return allowedAttachmentTypes.has(file.type)&&file.size>0&&file.size<=10_485_760}
export function validMessage(receiverId:string,content:string){return Boolean(receiverId)&&content.trim().length>0&&content.trim().length<=4000}
export function notificationHref(type:string,data:unknown){const values=typeof data==="object"&&data?data as Record<string,unknown>:{};const tripId=typeof values.trip_id==="string"?values.trip_id:null;const senderId=typeof values.sender_id==="string"?values.sender_id:null;if(type==="nouveau_message"&&senderId)return `/messages?with=${senderId}${tripId?`&trip=${tripId}`:""}`;if(["booking_confirmed","booking_cancelled"].includes(type))return "/reservations";if(["organizer_new_booking","participant_cancelled"].includes(type)&&tripId)return `/organisateur/sorties/${tripId}`;if(tripId)return `/sorties/${tripId}`;return "/notifications"}

export function validReviewInput(input:{tripId:string;recipientId:string;rating:number;comment:string}){const uuid=/^[0-9a-f-]{36}$/i;return uuid.test(input.tripId)&&uuid.test(input.recipientId)&&Number.isInteger(input.rating)&&input.rating>=1&&input.rating<=5&&input.comment.trim().length>=10&&input.comment.trim().length<=4000}
export function canReviewBooking(bookingStatus:string,tripDateTime:string,now=new Date()){return ["confirmee","terminee"].includes(bookingStatus)&&new Date(tripDateTime)<now}
export function validModeration(input:{actorId:string;targetId:string;decision:string;reason:string}){return /^[0-9a-f-]{36}$/i.test(input.targetId)&&input.actorId!==input.targetId&&["actif","suspendu"].includes(input.decision)&&(input.decision!=="suspendu"||input.reason.trim().length>=5)}
