-- Starter FAQ (run once after migration 0009). Inserts nothing if faq_items already has rows.
-- Published answers describe behaviour implemented on the site (checked in code 2026-10-23).
-- Answers starting with "À confirmer" are DRAFTS: the policy is not defined anywhere in the
-- site or code, so they stay unpublished until the owner writes and publishes them.
INSERT INTO faq_items (category, question, answer, sort_order, is_published)
SELECT v.category, v.question, v.answer, v.sort_order, v.is_published
FROM (VALUES
  ('Produits & compatibilité', 'Qu''est-ce qu''un skin pour téléphone ?',
   'Un skin est un film vinyle découpé avec précision à la forme de votre téléphone. Il personnalise son apparence et protège sa coque des rayures et des traces de doigts.', 1, true),
  ('Produits & compatibilité', 'Quels modèles de téléphone sont compatibles ?',
   'Sur chaque fiche produit, choisissez votre modèle dans la liste (iPhone et Samsung actuellement). Si votre modèle n''y figure pas, vous pouvez le saisir vous-même, sauf pour les skins réservés à certains modèles : seuls les modèles listés sont alors proposés.', 2, true),
  ('Produits & compatibilité', 'Le skin couvre-t-il tout le dos du téléphone ?',
   'À confirmer : précisez la couverture exacte (dos complet, contour du module photo, côtés).', 3, false),
  ('Produits & compatibilité', 'Puis-je poser le skin moi-même ?',
   'Oui. Les skins sont conçus pour une pose facile et sans bulles.', 4, true),
  ('Produits & compatibilité', 'Puis-je retirer le skin plus tard ?',
   'À confirmer : précisez si le retrait se fait sans résidu pour tous les skins.', 5, false),
  ('Commandes & livraison', 'Comment passer une commande ?',
   'Choisissez votre skin, sélectionnez votre modèle de téléphone puis ajoutez-le au panier. Au moment de la commande, indiquez votre nom, votre téléphone, votre adresse et votre ville. Vous pouvez commander avec ou sans compte ; une page de confirmation s''affiche à la fin.', 1, true),
  ('Commandes & livraison', 'Puis-je payer à la livraison ?',
   'Oui. Le paiement se fait en espèces à la livraison.', 2, true),
  ('Commandes & livraison', 'Combien coûte la livraison ?',
   'La livraison coûte 8 DT. Elle est offerte quand le montant de vos articles dépasse 100 DT.', 3, true),
  ('Commandes & livraison', 'Quel est le délai de livraison ?',
   'À confirmer : indiquez le délai de livraison habituel et les zones desservies.', 4, false),
  ('Commandes & livraison', 'Puis-je modifier ou annuler ma commande ?',
   'À confirmer : indiquez jusqu''à quand et comment une commande peut être modifiée ou annulée.', 5, false),
  ('Paiement & retours', 'Quels moyens de paiement acceptez-vous ?',
   'Le paiement à la livraison, en espèces, est actuellement le seul moyen de paiement.', 1, true),
  ('Paiement & retours', 'Puis-je retourner ou échanger un produit ?',
   'À confirmer : précisez la politique de retour et d''échange (conditions, délai, frais).', 2, false),
  ('Paiement & retours', 'Que faire si ma commande arrive endommagée ?',
   'À confirmer : indiquez la marche à suivre et le contact à utiliser.', 3, false),
  ('Wrapy Rewards', 'Comment fonctionne le programme de fidélité ?',
   'Avec un compte Wrapy, chaque commande vous rapporte 1 point par dinar du montant total. Les points sont crédités une fois la commande livrée et retirés si elle est annulée. Votre solde est visible dans votre compte.', 1, true),
  ('Wrapy Rewards', 'Combien de points faut-il pour un skin offert ?',
   '300 points vous offrent un skin.', 2, true),
  ('Wrapy Rewards', 'Comment utiliser mes points ?',
   'Connectez-vous, ajoutez vos skins au panier puis, au moment de la commande, choisissez l''article à vous faire offrir. 300 points sont déduits et cet article devient gratuit.', 3, true)
) AS v(category, question, answer, sort_order, is_published)
WHERE NOT EXISTS (SELECT 1 FROM faq_items);
