-- Translate the FAQ to English in place (run once, after seed-faq-0009.sql).
-- Matches rows by their current French question: ids, publication flags and
-- order are untouched, so the 6 unconfirmed answers stay unpublished drafts
-- ("To confirm: …"). Re-running is a no-op once the rows are English.
UPDATE faq_items AS f
SET category = v.category, question = v.question, answer = v.answer, updated_at = now()
FROM (VALUES
  ('Qu''est-ce qu''un skin pour téléphone ?', 'Products & Compatibility', 'What is a phone skin?',
   'A skin is a precision-cut vinyl film shaped to your phone. It personalises its look and protects the back from scratches and fingerprints.'),
  ('Quels modèles de téléphone sont compatibles ?', 'Products & Compatibility', 'Which phone models are compatible with Wrapy skins?',
   'On each product page, pick your model from the list (iPhone and Samsung at the moment). If your model isn''t listed, you can type it in yourself, except for skins made for specific models, where only the listed models are available.'),
  ('Le skin couvre-t-il tout le dos du téléphone ?', 'Products & Compatibility', 'Does the skin cover the entire back of the phone?',
   'To confirm: describe the exact coverage (full back, around the camera module, sides).'),
  ('Puis-je poser le skin moi-même ?', 'Products & Compatibility', 'Can I apply the skin myself?',
   'Yes. Wrapy skins are designed for easy, bubble-free application.'),
  ('Puis-je retirer le skin plus tard ?', 'Products & Compatibility', 'Can I remove the skin later?',
   'To confirm: state whether every skin comes off without leaving residue.'),
  ('Comment passer une commande ?', 'Orders & Delivery', 'How do I place an order?',
   'Choose your skin, select your phone model and add it to your cart. At checkout, enter your name, phone number, address and city. You can order with or without an account; a confirmation page appears at the end.'),
  ('Puis-je payer à la livraison ?', 'Orders & Delivery', 'Can I pay cash on delivery?',
   'Yes. You pay in cash when your order is delivered.'),
  ('Combien coûte la livraison ?', 'Orders & Delivery', 'How much does delivery cost?',
   'Delivery costs 8 DT. It is free when your items total more than 100 DT.'),
  ('Quel est le délai de livraison ?', 'Orders & Delivery', 'How long does delivery take?',
   'To confirm: state the usual delivery time and the areas served.'),
  ('Puis-je modifier ou annuler ma commande ?', 'Orders & Delivery', 'Can I change or cancel my order?',
   'To confirm: state until when and how an order can be changed or cancelled.'),
  ('Quels moyens de paiement acceptez-vous ?', 'Payment & Returns', 'Which payment methods are accepted?',
   'Cash on delivery is currently the only payment method.'),
  ('Puis-je retourner ou échanger un produit ?', 'Payment & Returns', 'Can I return or exchange a product?',
   'To confirm: describe the return and exchange policy (conditions, time limit, costs).'),
  ('Que faire si ma commande arrive endommagée ?', 'Payment & Returns', 'What should I do if my order arrives damaged?',
   'To confirm: describe the steps to follow and who to contact.'),
  ('Comment fonctionne le programme de fidélité ?', 'Wrapy Rewards', 'How does the loyalty program work?',
   'With a Wrapy account, every order earns 1 point per dinar of its total. Points are added once the order is delivered and removed if it is cancelled. You can see your balance in your account.'),
  ('Combien de points faut-il pour un skin offert ?', 'Wrapy Rewards', 'How many points do I need for a free skin?',
   '300 points get you a free skin.'),
  ('Comment utiliser mes points ?', 'Wrapy Rewards', 'How do I redeem my points?',
   'Sign in, add your skins to the cart, then at checkout choose the item you want for free. 300 points are deducted and that item becomes free.')
) AS v(old_question, category, question, answer)
WHERE f.question = v.old_question;
