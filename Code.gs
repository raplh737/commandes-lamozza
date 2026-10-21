/**
 * Réception des commandes du site La Mozzarella -> mail avec le PDF à commandemozza@gmail.com
 * À coller dans un projet Apps Script créé AVEC LE COMPTE commandemozza@gmail.com,
 * puis Déployer > Nouveau déploiement > Application Web (Exécuter en tant que : moi ; Accès : tout le monde).
 */
var DESTINATAIRE = 'commandemozza@gmail.com';
var SHEET_ID = ''; // facultatif : ID d'un tableau Google pour garder l'historique des commandes
// Un lien = un client. Mettre dans "copie" l'adresse du commercial si besoin (ex. 'jmfelix.lamozza@gmail.com').
var CLIENTS = {
  '613f5e9f': { nom: 'MARIA - LE DESJEUNEUR SAS', copie: [] },
  '6c35f7b5': { nom: 'MAKARNA', copie: [] },
  'de5eb70f': { nom: 'ARS PIZZA', copie: [] },
  'c8e27565': { nom: 'CAFÉ DES ANTIQUAIRES - SARL 2ACP', copie: [] }
};

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var c = CLIENTS[d.token];
    if (!c) return reponse({ ok: false, error: 'Lien client inconnu' });
    var pdf = Utilities.newBlob(Utilities.base64Decode(d.pdf), 'application/pdf', d.filename);
    var sujet = 'Commande ' + c.nom + ' – livraison ' + d.livraison + ' – n° ' + d.numero;
    var lignes = (d.lignes || []).map(function (l) {
      var q = Object.keys(l.quantites).map(function (k) { return l.quantites[k] + ' ' + k; }).join(' + ');
      return l.code + '  ' + l.designation + '  : ' + q;
    });
    (d.hors_cadencier || []).forEach(function (x) { lignes.push('HORS CADENCIER  ' + x.designation + '  : ' + x.q + ' ' + x.unit); });
    var corps = 'Commande reçue via le site de commande.\n\nClient : ' + c.nom + '\nLivraison souhaitée : ' + d.livraison +
      '\nPassée par : ' + (d.passe_par || '-') + (d.email ? ' (' + d.email + ')' : '') + '\nN° : ' + d.numero +
      '\n\n' + lignes.join('\n') + (d.remarques ? '\n\nRemarques : ' + d.remarques : '') + '\n\nLe bon de commande PDF est en pièce jointe.';
    var msg = { to: DESTINATAIRE, subject: sujet, body: corps, attachments: [pdf], name: 'Site de commande La Mozzarella' };
    if (c.copie && c.copie.length) msg.cc = c.copie.join(',');
    if (d.email) msg.replyTo = d.email;
    MailApp.sendEmail(msg);
    if (d.email) MailApp.sendEmail({ to: d.email, subject: 'Confirmation – ' + sujet, name: 'La Mozzarella – Service commandes',
      body: 'Bonjour,\n\nNous avons bien reçu votre commande n° ' + d.numero + ' pour une livraison le ' + d.livraison +
            '.\nVous trouverez votre bon de commande en pièce jointe.\n\nService commandes La Mozzarella\n04 72 24 23 23',
      attachments: [pdf] });
    if (SHEET_ID) SpreadsheetApp.openById(SHEET_ID).getSheets()[0].appendRow([new Date(), c.nom, d.numero, d.livraison, d.passe_par || '', lignes.length, lignes.join(' | '), d.remarques || '']);
    return reponse({ ok: true, numero: d.numero });
  } catch (err) {
    return reponse({ ok: false, error: String(err) });
  }
}
function doGet() { return reponse({ ok: true, service: 'commandes La Mozzarella' }); }
function reponse(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
