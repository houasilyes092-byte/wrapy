-- Starter FAQ (run once after migration 0009). Inserts nothing if faq_items already has rows.
-- Published answers describe behaviour implemented on the site (checked in code 2026-10-23).
-- Answers starting with "To confirm" are DRAFTS: the policy is not defined anywhere in the
-- site or code, so they stay unpublished until the owner writes and publishes them.
-- (English since 2026-10-23; production was translated in place by faq-english-0010.sql.)
INSERT INTO faq_items (category, question, answer, sort_order, is_published)
SELECT v.category, v.question, v.answer, v.sort_order, v.is_published
FROM (VALUES
  ('Products & Compatibility', 'What is a phone skin?',
   'A skin is a precision-cut vinyl film shaped to your phone. It personalises its look and protects the back from scratches and fingerprints.', 1, true),
  ('Products & Compatibility', 'Which phone models are compatible with Wrapy skins?',
   'On each product page, pick your model from the list (iPhone and Samsung at the moment). If your model isn''t listed, you can type it in yourself, except for skins made for specific models, where only the listed models are available.', 2, true),
  ('Products & Compatibility', 'Does the skin cover the entire back of the phone?',
   'To confirm: describe the exact coverage (full back, around the camera module, sides).', 3, false),
  ('Products & Compatibility', 'Can I apply the skin myself?',
   'Yes. Wrapy skins are designed for easy, bubble-free application.', 4, true),
  ('Products & Compatibility', 'Can I remove the skin later?',
   'To confirm: state whether every skin comes off without leaving residue.', 5, false),
  ('Orders & Delivery', 'How do I place an order?',
   'Choose your skin, select your phone model and add it to your cart. At checkout, enter your name, phone number, address and city. You can order with or without an account; a confirmation page appears at the end.', 1, true),
  ('Orders & Delivery', 'Can I pay cash on delivery?',
   'Yes. You pay in cash when your order is delivered.', 2, true),
  ('Orders & Delivery', 'How much does delivery cost?',
   'Delivery costs 8 DT. It is free when your items total more than 100 DT.', 3, true),
  ('Orders & Delivery', 'How long does delivery take?',
   'To confirm: state the usual delivery time and the areas served.', 4, false),
  ('Orders & Delivery', 'Can I change or cancel my order?',
   'To confirm: state until when and how an order can be changed or cancelled.', 5, false),
  ('Payment & Returns', 'Which payment methods are accepted?',
   'Cash on delivery is currently the only payment method.', 1, true),
  ('Payment & Returns', 'Can I return or exchange a product?',
   'To confirm: describe the return and exchange policy (conditions, time limit, costs).', 2, false),
  ('Payment & Returns', 'What should I do if my order arrives damaged?',
   'To confirm: describe the steps to follow and who to contact.', 3, false),
  ('Wrapy Rewards', 'How does the loyalty program work?',
   'With a Wrapy account, every order earns 1 point per dinar of its total. Points are added once the order is delivered and removed if it is cancelled. You can see your balance in your account.', 1, true),
  ('Wrapy Rewards', 'How many points do I need for a free skin?',
   '300 points get you a free skin.', 2, true),
  ('Wrapy Rewards', 'How do I redeem my points?',
   'Sign in, add your skins to the cart, then at checkout choose the item you want for free. 300 points are deducted and that item becomes free.', 3, true)
) AS v(category, question, answer, sort_order, is_published)
WHERE NOT EXISTS (SELECT 1 FROM faq_items);
