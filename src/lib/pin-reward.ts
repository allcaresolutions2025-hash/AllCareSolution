// The premium pin denomination. A 2000-pt pin follows the same points system as
// a standard 1000-pt pin (no wallet credit at enrollment) — its ONLY difference
// is that the member enrolled with it gets the "40 Combo Reward" instead of the
// Welcome Kit (see lib/rewards + the affiliate rewards route/page). Eligibility
// is detected from the pin used to enroll the member (Pin.pointsValue).
export const PIN_REWARD_PIN_VALUE = 2000;
