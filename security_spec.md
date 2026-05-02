# Security Specification - h666

## 1. Data Invariants
- Each user profile corresponds to a unique Firebase Auth UID.
- Wallet balances must never be negative.
- Transactions are immutable once marked as `completed`.
- Admin privileges are strictly locked to the predefined admin list.
- Invite codes must be 6 characters long and alphanumeric.

## 2. The Dirty Dozen (Attacker Payloads)

1. **Identity Spoofing**: User A attempts to update User B's balance.
2. **Ghost Verification**: User attempts to set `role: "admin"` on their own profile during account creation.
3. **Double Spend**: Attempting to create multiple withdrawal transactions exceeding the current balance (Requires backend atomicity or strict rules).
4. **Unauthorized Game Edit**: Non-admin user trying to disable a game.
5. **Path Poisoning**: Injecting a 2KB string as a `bannerId`.
6. **Immutable Override**: Attempting to change `createdAt` on an existing transaction.
7. **Role Escalation**: Regular user trying to update their own `role` field.
8. **Shadow Transaction**: Creating a `win` transaction without a corresponding game event (Rules should restrict `win` types to system/admin if possible, but for a client-side demo we restrict by ownership).
9. **Referral Loop**: Setting `referredBy` to one's own UID.
10. **Banner Hijack**: Non-admin user updating a promo link to a malicious URL.
11. **Negative Deposit**: User trying to "deposit" a negative amount to effectively withdraw without permission.
12. **Unauthorized Read**: Anonymous user attempting to list all transactions on the platform.

## 3. Test Runner Strategy
We will use `isValidUser`, `isValidTransaction`, and `isValidBanner` helpers to block these payloads.
The `firestore.rules` file will be the primary defense.
