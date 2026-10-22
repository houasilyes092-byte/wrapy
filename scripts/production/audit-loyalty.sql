-- Wrapy: READ-ONLY audit of loyalty balances granted by the old logic.
-- Run AFTER apply-0008.sql (it uses orders.loyalty_points_awarded IS NULL to find legacy orders).
-- The old code awarded floor(total) x points_per_dinar (default 10) at order
-- creation, including orders later cancelled. Nothing here changes data.
-- Review the output before deciding whether any balance should be corrected.

-- 1. Effective rate setting (if absent, the old code used 10, the new code uses 1).
SELECT key, value FROM settings WHERE key = 'points_per_dinar';

-- 2. Per customer: current balance vs. what 1 pt/DT on delivered orders would give.
SELECT
  u.email,
  u.loyalty_points                                                     AS current_balance,
  COALESCE(SUM(FLOOR(o.total / 1000)) FILTER (WHERE o.status = 'delivered'), 0) AS expected_at_1pt_per_dt,
  COUNT(o.id) FILTER (WHERE o.status = 'cancelled')                   AS cancelled_orders,
  COUNT(o.id)                                                          AS legacy_orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.loyalty_points_awarded IS NULL
WHERE u.role = 'customer'
GROUP BY u.id
HAVING u.loyalty_points > 0 OR COUNT(o.id) > 0
ORDER BY u.loyalty_points DESC;
