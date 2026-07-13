// The premium pin denomination and the bonus it carries. When a member is
// enrolled using a PIN_REWARD_PIN_VALUE (2000-pt) pin, PIN_REWARD_POINTS points
// are auto-credited to that NEW member's payout wallet (Wallet.balanceAvailable)
// at registration time. Standard (1000-pt) pins credit nothing. See the member
// creation route (src/app/api/members/route.ts).
export const PIN_REWARD_PIN_VALUE = 2000;
export const PIN_REWARD_POINTS = 2000;
