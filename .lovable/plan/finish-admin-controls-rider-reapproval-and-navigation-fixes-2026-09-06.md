# Finish admin controls, rider reapproval, and navigation fixes

## What will change

- Finish the existing admin work by exposing Refunds, Vouchers, and Notifications in the control center and in role permissions.
- Add rider management so an admin can remove an approved rider and require a fresh application. Riders can submit changed details for reapproval; their current access remains unavailable until approval.
- Let admins edit their submitted admin details through a new pending request that requires super-admin approval before replacing the approved details.
- Add a floating **Deliver** button at the bottom-left of the rider map. It stays disabled until live GPS confirms the rider is at the buyer’s pin, then marks the order delivered and sends the existing buyer notification.
- Improve advert controls: press-and-hold pauses auto-sliding, release resumes it, and previous/next arrows allow manual browsing.
- Reduce excessive vertical gaps on the homepage without changing its overall visual style.

## Route reliability repair

- Audit the destination chosen for every order and always route to the exact saved buyer pin.
- Request multiple driving alternatives and reject candidates with disconnected endpoints, implausible detours, or movement away from the destination.
- Prefer the fastest candidate among routes that remain close to the shortest valid road distance, instead of allowing a faster but excessive detour.
- Remove the synthetic straight-line fallback from the displayed road route. If no trustworthy road route exists, show the exact buyer pin and a clear unavailable-route state rather than a misleading blue path.
- Keep the displayed line anchored to the rider and buyer only when those short connector segments are locally reasonable; never draw long off-road connectors.
- Refresh routing after meaningful rider movement and when the selected buyer pin changes.

## Technical details

- Add backend functions/policies needed for secure rider removal and reapproval; admins may manage riders, while only super admins approve changed admin details.
- Reuse the existing delivery status, notification, location, and approval records rather than introducing duplicate systems.
- Validate the affected pages, navigation controls, approval flows, and mobile layout after implementation.
