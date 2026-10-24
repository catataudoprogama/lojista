/* Driver Supabase: Postgres (tabelas products/settings), Storage (bucket de fotos) e Auth (login do lojista). */
Data.drivers.supabase = function (Data) {
  'use strict';

  var cfg = Data.config;
  var bucket = cfg.BUCKET || 'produtos';
  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  function ok(r) {
    if (r.error) throw r.error;
    return r.data;
  }

  function pathFromUrl(u) {
    var marker = '/object/public/' + bucket + '/';
    var i = String(u || '').indexOf(marker);
    return i > -1 ? decodeURIComponent(u.slice(i + marker.length).split('?')[0]) : '';
  }

  function checkAdmin(email) {
    return sb.rpc('is_admin').then(ok).then(function (isAdmin) {
      return { email: email, admin: isAdmin === true };
    });
  }

  var COLS = ['name', 'description', 'price', 'compare_at_price', 'category', 'colors', 'images', 'sizes', 'featured', 'active'];

  var api = {
    listProducts: function (opts) {
      var q = sb.from('products').select('*').order('created_at', { ascending: false });
      if (!(opts && opts.includeInactive)) q = q.eq('active', true);
      return q.then(ok).then(function (rows) { return rows.map(Data.normProduct); });
    },

    getProduct: function (id) {
      return sb.from('products').select('*').eq('id', id).maybeSingle().then(ok).then(function (r) {
        return r ? Data.normProduct(r) : null;
      });
    },

    saveProduct: function (p) {
      var n = Data.normProduct(p), row = {};
      COLS.forEach(function (c) { row[c] = n[c]; });
      var q = n.id
        ? sb.from('products').update(row).eq('id', n.id)
        : sb.from('products').insert(row);
      return q.select().single().then(ok).then(Data.normProduct);
    },

    deleteProduct: function (id) {
      var gone = [];
      return api.getProduct(id).then(function (p) {
        gone = p ? p.images : [];
        return sb.from('products').delete().eq('id', id).then(ok);
      }).then(function () {
        if (!gone.length) return;
        /* só apaga do Storage as fotos que nenhuma outra peça (ex.: uma cópia) ainda usa */
        return sb.from('products').select('images').then(ok).then(function (rows) {
          var used = {};
          rows.forEach(function (r) { (r.images || []).forEach(function (u) { used[u] = 1; }); });
          var paths = gone.filter(function (u) { return !used[u]; }).map(pathFromUrl).filter(Boolean);
          if (paths.length) return sb.storage.from(bucket).remove(paths);
        }).catch(function () { /* limpeza de fotos é opcional */ });
      });
    },

    uploadImage: function (blob) {
      var ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
      var path = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      return sb.storage.from(bucket).upload(path, blob, { contentType: blob.type, cacheControl: '31536000' })
        .then(ok)
        .then(function () { return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl; });
    },

    getSettings: function () {
      return sb.from('settings').select('*').eq('id', 1).maybeSingle().then(ok).then(Data.normSettings);
    },

    saveSettings: function (s) {
      var n = Data.normSettings(s);
      n.id = 1;
      return sb.from('settings').upsert(n).select().single().then(ok).then(Data.normSettings);
    },

    /* Pergunta ao banco (função is_admin do schema.sql) se quem está logado é administrador da loja. */
    session: function () {
      return sb.auth.getSession().then(ok).then(function (d) {
        return d.session && d.session.user ? checkAdmin(d.session.user.email) : null;
      });
    },

    signIn: function (email, password) {
      return sb.auth.signInWithPassword({ email: email, password: password }).then(ok).then(function (d) {
        return checkAdmin(d.user.email);
      });
    },

    signOut: function () { return sb.auth.signOut().then(function () {}); }
  };

  return { imageOptions: { max: 1400, quality: 0.82 }, api: api };
};
