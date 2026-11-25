import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import Cropper from 'react-easy-crop';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { longDate } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { Icon } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { Field, FormNotice } from '../auth/AuthShell.jsx';
import { compressImage, cropToBlob, newName, pathFromPublicUrl, uploadPublic } from './images.js';

const isUrl = (v) => !v || /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(v.trim());

/** Recorte circular de la foto de perfil (pellizco y arrastre en el celular). */
function AvatarCropper({ src, onCancel, onDone }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState(null);
  const [busy, setBusy] = useState(false);
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current?.showModal?.();
  }, []);
  return (
    <dialog ref={dialog} className="crop-dialog" onCancel={(e) => { e.preventDefault(); onCancel(); }} aria-label="Recortar foto de perfil">
      <div className="crop-area">
        <Cropper image={src} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />
      </div>
      <label className="crop-zoom">
        <span>Acercar</span>
        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
      </label>
      <div className="form-actions">
        <button type="button" className="btn btn-green" disabled={!area || busy} onClick={async () => { setBusy(true); await onDone(area); setBusy(false); }}>
          {busy ? 'Guardando…' : 'Usar esta foto'}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancelar</button>
      </div>
    </dialog>
  );
}

export default function ProfilePage() {
  useTitle('Mi perfil de embajador');
  const { amb } = useOutletContext();
  const { user, refreshProfile } = useAuth();
  const { notify } = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState({
    brand_name: amb.brand_name || '', short_description: amb.short_description || '',
    story_origin: amb.story_origin || '', story_present: amb.story_present || '', story_future: amb.story_future || '',
    instagram: amb.instagram || '', facebook: amb.facebook || '', website: amb.website || '', whatsapp: amb.whatsapp || '',
  });
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState('');
  const [busy, setBusy] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [bannerBusy, setBannerBusy] = useState(false);
  const avatarInput = useRef(null);
  const bannerInput = useRef(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['my-ambassador'] });
    qc.invalidateQueries({ queryKey: ['catalog'] });
  };
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const errProps = (k) => ({ 'aria-invalid': !!errors[k] || undefined, 'aria-describedby': errors[k] ? `pf-${k}-err` : undefined });

  const save = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.brand_name.trim().length < 2) er.brand_name = 'Escribe el nombre de tu marca.';
    if (f.short_description.length > 280) er.short_description = 'Máximo 280 caracteres.';
    ['instagram', 'facebook', 'website'].forEach((k) => { if (!isUrl(f[k])) er[k] = 'Pega el enlace completo, empezando por https://'; });
    if (f.whatsapp && !/^\+?[\d\s-]{7,15}$/.test(f.whatsapp)) er.whatsapp = 'Escribe un número válido, por ejemplo 300 123 4567.';
    setErrors(er);
    if (Object.keys(er).length) return setGeneral('Revisa los campos marcados.');
    setBusy(true);
    setGeneral('');
    const row = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null]));
    const { error } = await supabase.from('ambassadors').update(row).eq('id', amb.id);
    setBusy(false);
    if (error) return setGeneral(friendlyError(error));
    refresh();
    notify('Tu perfil quedó actualizado');
  };

  const pickAvatar = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify('Elige una foto (JPG, PNG o WebP).', 'error');
    setCropSrc(URL.createObjectURL(file));
  };

  const saveAvatar = async (area) => {
    try {
      const blob = await cropToBlob(cropSrc, area, 512);
      const url = await uploadPublic('avatars', `${user.id}/${newName(blob, '-avatar')}`, blob);
      const old = pathFromPublicUrl(amb.avatar_url, 'avatars');
      const { error } = await supabase.from('ambassadors').update({ avatar_url: url }).eq('id', amb.id);
      if (error) throw error;
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      if (old) supabase.storage.from('avatars').remove([old]);
      refresh();
      refreshProfile();
      notify('Foto de perfil actualizada');
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    } catch (err) {
      notify(err.message || friendlyError(err), 'error');
    }
  };

  const saveBanner = async (file) => {
    if (!file) return;
    setBannerBusy(true);
    try {
      const { blob } = await compressImage(file, { max: 1600, quality: 0.8 });
      const url = await uploadPublic('avatars', `${user.id}/${newName(blob, '-banner')}`, blob);
      const old = pathFromPublicUrl(amb.banner_url, 'avatars');
      const { error } = await supabase.from('ambassadors').update({ banner_url: url }).eq('id', amb.id);
      if (error) throw error;
      if (old) supabase.storage.from('avatars').remove([old]);
      refresh();
      notify('Portada actualizada');
    } catch (err) {
      notify(err.message || friendlyError(err), 'error');
    } finally {
      setBannerBusy(false);
    }
  };

  return (
    <div className="pn-stack">
      <header className="pn-head">
        <h1>Mi perfil</h1>
        <p className="muted">Así te presentamos en tu página de embajador. Cuenta tu historia: es lo que conecta a los clientes con tu producto.</p>
      </header>

      <section className="panel profile-visual">
        <div className="pv-banner" style={amb.banner_url ? { backgroundImage: `url(${amb.banner_url})` } : undefined}>
          <button type="button" className="btn btn-glass btn-sm" onClick={() => bannerInput.current?.click()} disabled={bannerBusy}>
            <Icon name="mountain" size={16} />{bannerBusy ? 'Subiendo…' : amb.banner_url ? 'Cambiar portada' : 'Subir portada'}
          </button>
          <input ref={bannerInput} type="file" accept="image/*" hidden onChange={(e) => { saveBanner(e.target.files[0]); e.target.value = ''; }} />
        </div>
        <div className="pv-row">
          <button type="button" className="pv-avatar" onClick={() => avatarInput.current?.click()} aria-label="Cambiar foto de perfil">
            {amb.avatar_url ? <img src={amb.avatar_url} alt="" width="112" height="112" /> : <span>{amb.initials}</span>}
            <em><Icon name="user" size={16} />Cambiar</em>
          </button>
          <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => { pickAvatar(e.target.files[0]); e.target.value = ''; }} />
          <dl className="pv-facts">
            <div><dt>Código</dt><dd className="sku">{amb.code}</dd></div>
            <div><dt>Municipio</dt><dd>{amb.municipality?.name} · {amb.municipality?.subregion?.name}</dd></div>
            <div><dt>Comisión</dt><dd>{amb.private?.commission_rate != null ? `${Number(amb.private.commission_rate)}%` : 'Por acordar'}</dd></div>
            <div><dt>Embajador desde</dt><dd>{longDate(amb.joined_at)}</dd></div>
            {amb.badges?.length > 0 && <div><dt>Insignias</dt><dd>{amb.badges.map((b) => <span key={b.label} className="tag">{b.label}</span>)}</dd></div>}
          </dl>
        </div>
        <p className="muted small">El municipio, las insignias y la comisión los gestiona Mercado Origen. Si algo no es correcto, escríbenos.</p>
      </section>

      <form className="panel form" onSubmit={save} noValidate>
        <h2 className="panel-title">Tu marca</h2>
        <FormNotice>{general}</FormNotice>
        <Field id="pf-brand_name" label="Nombre comercial" error={errors.brand_name}>
          <input id="pf-brand_name" value={f.brand_name} onChange={set('brand_name')} maxLength={80} {...errProps('brand_name')} />
        </Field>
        <Field id="pf-short_description" label="Frase corta" hint={`Aparece en tu tarjeta de embajador · ${f.short_description.length}/280`} error={errors.short_description}>
          <input id="pf-short_description" value={f.short_description} onChange={set('short_description')} maxLength={280} {...errProps('short_description')} />
        </Field>
        <Field id="pf-story_origin" label="Cómo empezó todo" optional>
          <textarea id="pf-story_origin" rows={5} value={f.story_origin} onChange={set('story_origin')} />
        </Field>
        <Field id="pf-story_present" label="Dónde estás hoy" optional>
          <textarea id="pf-story_present" rows={5} value={f.story_present} onChange={set('story_present')} />
        </Field>
        <Field id="pf-story_future" label="Lo que sueñas" optional>
          <textarea id="pf-story_future" rows={4} value={f.story_future} onChange={set('story_future')} />
        </Field>

        <h2 className="panel-title">Redes y contacto</h2>
        <div className="form-2">
          <Field id="pf-instagram" label="Instagram" optional error={errors.instagram}>
            <input id="pf-instagram" type="url" inputMode="url" placeholder="https://www.instagram.com/tu-marca" value={f.instagram} onChange={set('instagram')} {...errProps('instagram')} />
          </Field>
          <Field id="pf-facebook" label="Facebook" optional error={errors.facebook}>
            <input id="pf-facebook" type="url" inputMode="url" value={f.facebook} onChange={set('facebook')} {...errProps('facebook')} />
          </Field>
          <Field id="pf-website" label="Página web" optional error={errors.website}>
            <input id="pf-website" type="url" inputMode="url" value={f.website} onChange={set('website')} {...errProps('website')} />
          </Field>
          <Field id="pf-whatsapp" label="WhatsApp público" optional hint="Se mostrará en tu página para que los clientes te escriban. Déjalo vacío si prefieres no publicarlo." error={errors.whatsapp}>
            <input id="pf-whatsapp" type="tel" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')} {...errProps('whatsapp')} />
          </Field>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-green" disabled={busy}>{busy ? 'Guardando…' : 'Guardar perfil'}</button>
        </div>
      </form>

      {cropSrc && <AvatarCropper src={cropSrc} onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }} onDone={saveAvatar} />}
    </div>
  );
}
