# Site de commande La Mozzarella : mode d'emploi du pilote

**Le principe.** Chaque client a son propre lien et ne voit que les produits de son cadencier. Il indique ses quantités et la date de livraison, puis il clique sur Envoyer. La boîte commandemozza@gmail.com reçoit alors un mail avec le bon de commande en PDF. Les codes article sont dans la 1re colonne du PDF et sont aussi listés dans le texte du mail.

**Contenu du dossier**
- `site_commandes/` : le site à mettre sur GitHub (une page par client).
- `Code.gs` : le script Google qui envoie la commande à commandemozza@gmail.com.
- `liens_clients.csv` : le lien personnel de chaque client.
- `Commande_ANTIQUAIRES_exemple.pdf` : un exemple de ce que reçoit l'ADV.

## Étape 1 : mettre le site sur GitHub (environ 10 min)
1. Sur github.com, ouvrez **New repository**.
   - Nom : `commandes-lamozza`
   - Visibilité : **Public**
   - Puis cliquez sur **Create repository**.
2. Cliquez sur **uploading an existing file**.
3. Glissez **tout le contenu** du dossier `site_commandes` : les dossiers et le fichier `index.html`.
4. Cliquez sur **Commit changes**.
5. Allez dans **Settings → Pages**.
   - Choisissez **Deploy from a branch**, branche `main`, dossier `/ (root)`.
   - Cliquez sur **Save**.
6. Au bout de 1 à 2 minutes, le site est en ligne à l'adresse `https://COMPTE.github.io/commandes-lamozza/`.

## Étape 2 : activer l'envoi automatique (environ 10 min)
Cette étape doit être faite avec le compte **commandemozza@gmail.com**.
1. Ouvrez script.google.com, puis **Nouveau projet**.
2. Remplacez le contenu par celui de `Code.gs`, puis **Enregistrer**.
3. Cliquez sur **Déployer → Nouveau déploiement**.
   - Type : **Application Web**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
4. Cliquez sur **Déployer**, puis autorisez l'accès.
   - Si Google affiche « application non validée », cliquez sur *Paramètres avancés*, puis sur *Accéder au projet*.
5. Copiez l'**URL de l'application Web**. Elle se termine par `/exec`.
6. Sur GitHub, ouvrez `assets/config.js`.
   - Cliquez sur le crayon et collez l'URL entre les guillemets de `ENDPOINT: ''`.
   - Cliquez sur **Commit changes**.

## Étape 3 : tester
1. Ouvrez le lien d'un client indiqué dans `liens_clients.csv`, en remplaçant COMPTE par le nom du compte GitHub.
2. Choisissez une date, saisissez 2 ou 3 quantités et mettez **votre** adresse dans « Votre e-mail ».
3. Cliquez sur **Vérifier la commande**, puis sur **Envoyer**.
4. Dans commandemozza@gmail.com, vous devez recevoir un mail intitulé « Commande CLIENT – livraison JJ/MM/AAAA – n° … » avec le PDF. Vous recevez aussi la copie de confirmation.

Si l'envoi ne marche pas, le client peut quand même télécharger son PDF et l'envoyer lui-même. Le site le lui propose automatiquement.

## À savoir avant d'ouvrir le site à plus de clients
- **Dépôt public.** Le dépôt GitHub gratuit est public. Il ne contient donc aucun prix. Les liens sont difficiles à deviner, mais ils restent visibles dans le dépôt. Pour aller plus loin, il faudra passer le dépôt en privé (offre GitHub payante) ou garder les listes de produits dans un tableau Google.
- **Limite d'envoi.** Avec un compte Gmail gratuit, le script peut envoyer environ 100 mails par jour. Chaque commande compte 1 mail, plus 1 copie si le client donne son adresse.
- **Copie au commercial.** Ajoutez l'adresse du commercial dans `copie: []` pour le client concerné, dans `Code.gs`.
- **Historique.** Créez un tableau Google et collez son identifiant dans `SHEET_ID`. Chaque commande y sera ajoutée sur une ligne.
- **« Reprendre ma dernière commande ».** Ce bouton remet les quantités de la commande précédente, à condition que le client utilise le même téléphone ou le même ordinateur.
