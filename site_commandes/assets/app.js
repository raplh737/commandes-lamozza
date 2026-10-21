/* Bon de commande en ligne – La Mozzarella
   Chaque page client définit window.CLIENT (liste de produits issue de son cadencier).
   À l'envoi : création d'un PDF (codes article en 1re colonne) puis envoi au script Google
   qui le transfère à commandemozza@gmail.com. */
(function () {
  'use strict';
  var C = window.CLIENT, CFG = window.MOZZA_CONFIG || {};
  var app = document.getElementById('app');
  var LS = 'mozza-derniere-commande-' + C.token;
  var NX = 4; // lignes « hors cadencier »
  var lastPdf = null;

  function h(tag, props, kids) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    (kids || []).forEach(function (x) { if (x) e.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
    return e;
  }
  function num(v) { var n = parseFloat(String(v || '').replace(',', '.')); return isFinite(n) && n > 0 ? n : 0; }
  function fmt(n) { return n > 0 ? String(n).replace('.', ',') : ''; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function frDate(iso) { var p = (iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; }
  function san(s) { // caractères compatibles avec la police du PDF
    return String(s == null ? '' : s).replace(/[–—]/g, '-').replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"').replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/…/g, '...')
      .replace(/[^\x00-\xFF]/g, '');
  }
  function store(get, val) {
    try { if (get) return JSON.parse(localStorage.getItem(LS) || 'null'); localStorage.setItem(LS, JSON.stringify(val)); }
    catch (e) { return null; }
  }

  // ---------- formulaire ----------
  document.getElementById('client').textContent = C.client;
  var t = new Date(); t.setDate(t.getDate() + 1);
  var minDate = t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());

  var info = h('div', { class: 'card' }, [
    h('h2', { text: 'Livraison' }),
    h('label', { for: 'date', text: 'Date de livraison souhaitée *' }),
    h('input', { id: 'date', type: 'date', min: minDate, required: 'required' }),
    C.livraison ? h('p', { class: 'hint', text: 'Vos jours habituels : ' + C.livraison }) : null,
    h('label', { for: 'par', text: 'Commande passée par' }),
    h('input', { id: 'par', type: 'text', placeholder: 'Votre prénom' }),
    h('label', { for: 'email', text: 'Votre e-mail (pour recevoir une copie du bon de commande)' }),
    h('input', { id: 'email', type: 'email', placeholder: 'facultatif' })
  ]);
  var search = h('input', { id: 'search', type: 'search', placeholder: 'Chercher un produit ou un code…' });
  var again = h('button', { id: 'again', class: 'btn2', type: 'button', text: 'Reprendre ma dernière commande' });
  var tools = h('div', { class: 'card' }, [h('div', { class: 'tools' }, [search, again]),
    h('p', { class: 'hint', text: 'Indiquez les quantités dans les cases jaunes. Les produits sans quantité ne sont pas commandés.' })]);
  app.appendChild(info); app.appendChild(tools);

  var list = h('div', { id: 'list' });
  C.sections.forEach(function (s, si) {
    var sec = h('div', { class: 'secwrap' }, [h('div', { class: 'sec', text: s.name })]);
    s.items.forEach(function (it, ii) {
      var qs = h('div', { class: 'qs' });
      C.qtycols.forEach(function (col, k) {
        qs.appendChild(h('div', {}, [h('small', { text: col }),
          h('input', { class: 'q', id: 'q-' + si + '-' + ii + '-' + k, type: 'number', min: '0', step: 'any', inputmode: 'decimal',
            'aria-label': it.designation + ' – ' + col })]));
      });
      sec.appendChild(h('div', { class: 'item', 'data-k': (it.code + ' ' + it.designation).toLowerCase() }, [
        h('div', {}, [h('div', { class: 'name', text: it.designation }), h('div', { class: 'meta', text: 'Code ' + it.code + ' · ' + it.unit })]), qs]));
    });
    list.appendChild(sec);
  });
  app.appendChild(list);

  var units = ['Pièce(s)', 'Carton(s)', 'Kg', 'Sachet(s)', 'Barquette(s)', 'Autre'];
  var extra = h('div', { class: 'card' }, [h('h2', { text: 'Produits hors cadencier' }),
    h('p', { class: 'hint', text: 'Un produit qui n’est pas dans la liste ? Écrivez-le ici, le service commandes le retrouvera.' })]);
  for (var i = 0; i < NX; i++) {
    var sel = h('select', { id: 'x-u-' + i });
    units.forEach(function (u) { sel.appendChild(h('option', { text: u })); });
    extra.appendChild(h('div', { class: 'xrow' }, [h('input', { id: 'x-d-' + i, type: 'text', placeholder: 'Produit' }),
      h('input', { id: 'x-q-' + i, class: 'q', type: 'number', min: '0', step: 'any', inputmode: 'decimal', placeholder: 'Qté' }), sel]));
  }
  app.appendChild(extra);
  app.appendChild(h('div', { class: 'card' }, [h('h2', { text: 'Remarques' }),
    h('textarea', { id: 'rem', rows: '3', placeholder: 'Ex. : appeler 30 min avant, livrer après 11h…' })]));

  var count = h('span', { id: 'count', text: '0 produit' });
  var review = h('button', { id: 'review', class: 'btn', type: 'button', text: 'Vérifier la commande' });
  document.body.appendChild(h('div', { class: 'bar' }, [count, review]));
  var ov = h('div', { class: 'ov', id: 'ov' }, [h('div', { class: 'dlg', id: 'dlg' })]);
  document.body.appendChild(ov);

  function qInputs() { return Array.prototype.slice.call(document.querySelectorAll('#list input.q')); }
  function refresh() {
    var n = 0;
    document.querySelectorAll('#list .item').forEach(function (it) {
      var on = Array.prototype.some.call(it.querySelectorAll('input.q'), function (x) { return num(x.value) > 0; });
      it.classList.toggle('on', on); if (on) n++;
    });
    for (var j = 0; j < NX; j++) if (document.getElementById('x-d-' + j).value.trim() && num(document.getElementById('x-q-' + j).value)) n++;
    count.textContent = n + (n > 1 ? ' produits' : ' produit');
  }
  document.addEventListener('input', function (e) { if (e.target.classList.contains('q') || /^x-/.test(e.target.id)) refresh(); });
  search.addEventListener('input', function () {
    var q = search.value.trim().toLowerCase();
    document.querySelectorAll('#list .secwrap').forEach(function (sw) {
      var vis = 0;
      sw.querySelectorAll('.item').forEach(function (it) { var ok = !q || it.getAttribute('data-k').indexOf(q) >= 0; it.classList.toggle('hide', !ok); if (ok) vis++; });
      sw.classList.toggle('hide', !vis);
    });
  });
  var last = store(true);
  again.disabled = !last;
  again.addEventListener('click', function () {
    var l = store(true); if (!l) return;
    qInputs().forEach(function (x) { x.value = l.q[x.id] || ''; });
    refresh(); window.scrollTo({ top: list.offsetTop - 10, behavior: 'smooth' });
  });

  function collect() {
    var lines = [];
    C.sections.forEach(function (s, si) {
      s.items.forEach(function (it, ii) {
        var q = C.qtycols.map(function (c, k) { return num(document.getElementById('q-' + si + '-' + ii + '-' + k).value); });
        if (q.some(function (x) { return x > 0; })) lines.push({ section: s.name, code: it.code, designation: it.designation, unit: it.unit, q: q });
      });
    });
    var extraL = [];
    for (var j = 0; j < NX; j++) {
      var d = document.getElementById('x-d-' + j).value.trim(), qq = num(document.getElementById('x-q-' + j).value);
      if (d && qq) extraL.push({ designation: d, q: qq, unit: document.getElementById('x-u-' + j).value });
    }
    var now = new Date();
    var stamp = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
    return {
      lines: lines, extra: extraL, date: document.getElementById('date').value, par: document.getElementById('par').value.trim(),
      email: document.getElementById('email').value.trim(), rem: document.getElementById('rem').value.trim(),
      numero: C.short + '-' + stamp + '-' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds()),
      sentAt: pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + now.getFullYear() + ' à ' + pad(now.getHours()) + ':' + pad(now.getMinutes()),
      stamp: stamp
    };
  }

  // ---------- PDF ----------
  function buildPdf(o) {
    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    var W = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('LA MOZZARELLA', 14, 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text(san("Parc d'Activités du Baconnet - 103, Allée des Erables - 69700 MONTAGNY - Tél : 04 72 24 23 23"), 14, 21);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('BON DE COMMANDE', W - 14, 16, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(san('N° ' + o.numero), W - 14, 21, { align: 'right' });
    doc.setDrawColor(0); doc.setLineWidth(0.3); doc.rect(14, 26, W - 28, 24);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(san(C.client), 17, 33);
    doc.setFontSize(11); doc.text(san('Livraison souhaitée : ' + frDate(o.date)), W - 17, 33, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(san('Commande passée par : ' + (o.par || '-') + (o.email ? '  (' + o.email + ')' : '')), 17, 40);
    doc.text(san('Envoyée le ' + o.sentAt + ' depuis le site de commande'), 17, 46);
    if (C.commercial) doc.text(san('Commercial : ' + C.commercial), W - 17, 46, { align: 'right' });
    var head = [['Code', 'Désignation', 'Unité'].concat(C.qtycols)];
    var body = [], cur = null, ncol = 3 + C.qtycols.length;
    o.lines.forEach(function (l) {
      if (l.section !== cur) { cur = l.section; body.push([{ content: san(cur), colSpan: ncol, styles: { fillColor: [232, 232, 228], fontStyle: 'bold', fontSize: 8 } }]); }
      body.push([l.code, san(l.designation), san(l.unit)].concat(l.q.map(fmt)));
    });
    var colStyles = { 0: { fontStyle: 'bold', cellWidth: 20, fontSize: 10 }, 2: { cellWidth: 24 } };
    C.qtycols.forEach(function (c, k) { colStyles[3 + k] = { halign: 'center', cellWidth: 19, fontStyle: 'bold', fontSize: 11 }; });
    doc.autoTable({ head: [head[0].map(san)], body: body, startY: 55, theme: 'grid', margin: { left: 14, right: 14, bottom: 16 },
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6, lineColor: [160, 160, 160], lineWidth: 0.1, textColor: [0, 0, 0], valign: 'middle' },
      headStyles: { fillColor: [29, 29, 27], textColor: 255, fontStyle: 'bold' }, columnStyles: colStyles });
    var y = doc.lastAutoTable.finalY + 6;
    if (o.extra.length) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(san('Produits hors cadencier (code à trouver par le service commandes)'), 14, y);
      doc.autoTable({ head: [['Produit écrit par le client', 'Unité', 'Quantité']], startY: y + 2, theme: 'grid', margin: { left: 14, right: 14, bottom: 16 },
        body: o.extra.map(function (x) { return [san(x.designation), san(x.unit), fmt(x.q)]; }),
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.6, lineColor: [160, 160, 160], lineWidth: 0.1, textColor: [0, 0, 0] },
        headStyles: { fillColor: [120, 120, 116], textColor: 255 }, columnStyles: { 1: { cellWidth: 30 }, 2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' } } });
      y = doc.lastAutoTable.finalY + 6;
    }
    if (o.rem) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('Remarques', 14, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(doc.splitTextToSize(san(o.rem), W - 28), 14, y + 5);
    }
    var n = doc.getNumberOfPages();
    for (var p = 1; p <= n; p++) {
      doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100);
      doc.text(san('Commande ' + o.numero + ' - ' + o.lines.length + ' ligne(s) au cadencier - page ' + p + '/' + n), W / 2, 290, { align: 'center' });
      doc.setTextColor(0);
    }
    return { doc: doc, base64: doc.output('datauristring').split(',')[1], filename: 'Commande_' + C.short + '_' + o.stamp + '_' + o.numero.slice(-6) + '.pdf' };
  }

  // ---------- vérification et envoi ----------
  var dlg = document.getElementById('dlg');
  function close() { ov.classList.remove('show'); }
  review.addEventListener('click', function () {
    var o = collect(); dlg.innerHTML = '';
    var err = [];
    if (!o.date) err.push('Choisissez la date de livraison souhaitée (en haut de la page).');
    if (!o.lines.length && !o.extra.length) err.push('Aucune quantité saisie.');
    if (err.length) {
      dlg.appendChild(h('h2', { text: 'Il manque une information' }));
      err.forEach(function (e) { dlg.appendChild(h('div', { class: 'msg err', text: e })); });
      dlg.appendChild(h('div', { class: 'row' }, [h('button', { class: 'btn2', type: 'button', text: 'Retour', onclick: close })]));
      ov.classList.add('show'); return;
    }
    var tb = h('table', {}, [h('tr', {}, [h('th', { text: 'Produit' }), h('th', { text: 'Qté' })])]);
    o.lines.forEach(function (l) {
      var q = C.qtycols.map(function (c, k) { return l.q[k] ? fmt(l.q[k]) + ' ' + c.toLowerCase() : ''; }).filter(Boolean).join(' + ');
      tb.appendChild(h('tr', {}, [h('td', {}, [l.designation, h('div', { class: 'meta', text: 'Code ' + l.code })]), h('td', { class: 'n', text: q })]));
    });
    o.extra.forEach(function (x) { tb.appendChild(h('tr', {}, [h('td', { text: x.designation + ' (hors cadencier)' }), h('td', { class: 'n', text: fmt(x.q) + ' ' + x.unit })])); });
    var send = h('button', { id: 'send', class: 'btn', type: 'button', text: 'Envoyer la commande' });
    dlg.appendChild(h('h2', { text: 'Livraison le ' + frDate(o.date) }));
    dlg.appendChild(tb);
    if (o.rem) dlg.appendChild(h('p', { class: 'hint', text: 'Remarques : ' + o.rem }));
    dlg.appendChild(h('div', { class: 'row' }, [h('button', { class: 'btn2', type: 'button', text: 'Modifier', onclick: close }), send]));
    ov.classList.add('show');
    send.addEventListener('click', function () { doSend(o, send); });
  });

  function doSend(o, btn) {
    btn.disabled = true; btn.textContent = 'Envoi…';
    var pdf = buildPdf(o); lastPdf = pdf;
    var payload = {
      token: C.token, client: C.client, numero: o.numero, livraison: frDate(o.date), passe_par: o.par, email: o.email, remarques: o.rem,
      lignes: o.lines.map(function (l) { var q = {}; C.qtycols.forEach(function (c, k) { if (l.q[k]) q[c] = l.q[k]; }); return { code: l.code, designation: l.designation, unite: l.unit, quantites: q }; }),
      hors_cadencier: o.extra, filename: pdf.filename, pdf: pdf.base64
    };
    if (!CFG.ENDPOINT) { done(o, false, 'L’envoi automatique n’est pas encore activé.'); return; }
    fetch(CFG.ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok) done(o, true); else done(o, false, (j && j.error) || 'Réponse inattendue du serveur.'); })
      .catch(function () { done(o, false, 'Pas de connexion avec le serveur.'); });
  }
  function done(o, ok, why) {
    dlg.innerHTML = '';
    var dl = h('button', { class: 'btn2', type: 'button', text: 'Télécharger mon bon de commande (PDF)', onclick: function () { lastPdf.doc.save(lastPdf.filename); } });
    if (ok) {
      var q = {}; qInputs().forEach(function (x) { if (num(x.value)) q[x.id] = x.value; });
      store(false, { q: q, numero: o.numero });
      dlg.appendChild(h('h2', { text: 'Commande envoyée ✔' }));
      dlg.appendChild(h('div', { class: 'msg', text: 'N° ' + o.numero + ' – le service commandes La Mozzarella l’a reçue. Livraison souhaitée le ' + frDate(o.date) + '.' }));
      dlg.appendChild(h('div', { class: 'row' }, [dl]));
    } else {
      var mail = 'mailto:commandemozza@gmail.com?subject=' + encodeURIComponent('Commande ' + C.client + ' - livraison ' + frDate(o.date));
      dlg.appendChild(h('h2', { text: 'La commande n’est pas partie' }));
      dlg.appendChild(h('div', { class: 'msg err', text: (why || '') + ' Téléchargez le PDF puis envoyez-le à commandemozza@gmail.com.' }));
      dlg.appendChild(h('div', { class: 'row' }, [dl, h('a', { class: 'btn', href: mail, style: 'text-align:center;text-decoration:none;padding:11px 14px;border-radius:8px' }, ['Écrire au service commandes'])]));
    }
    dlg.appendChild(h('div', { class: 'row' }, [h('button', { class: 'btn2', type: 'button', text: 'Fermer', onclick: close })]));
  }
  refresh();
})();
