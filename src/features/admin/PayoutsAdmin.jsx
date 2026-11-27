import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase.js';
import { friendlyError } from '../../lib/errors.js';
import { longDate, money } from '../../lib/format.js';
import { useTitle } from '../../lib/useTitle.js';
import { getPaymentMode } from '../../lib/paymentMode.js';
import { Icon } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Field } from '../auth/AuthShell.jsx';
import { Modal, Tabs, downloadCsv } from './kit.jsx';

export default function PayoutsAdmin() {
  useTitle('Liquidaciones');
  const { notify } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState('pendiente');
  const [paying, setPaying] = useState(null);
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ['admin', 'payouts'],
    queryFn: async () => {
      const env = await getPaymentMode(qc);
      const { data, error } = await supabase.from('ambassador_payouts')
        .select('*, ambassador:ambassadors (id, code, brand_name, private:ambassador_private (commission_rate, legal_name, id_number, bank_info, email))')
        .eq('environment', env)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const list = (q.data || []).filter((p) => p.status === tab);
  const totalPending = (q.data || []).filter((p) => p.status === 'pendiente').reduce((s, p) => s + p.net, 0);

  const exportCsv = () => downloadCsv(`liquidaciones-${tab}-${new Date().toISOString().slice(0, 10)}.csv`, list, [
    [(p) => p.ambassador.code, 'Código'], [(p) => p.ambassador.brand_name, 'Embajador'], [(p) => p.ambassador.private?.legal_name, 'Titular'],
    [(p) => p.ambassador.private?.id_number, 'Documento'], [(p) => p.ambassador.private?.bank_info?.banco, 'Banco'],
    [(p) => p.ambassador.private?.bank_info?.tipo_cuenta, 'Tipo de cuenta'], [(p) => p.ambassador.private?.bank_info?.numero, 'Número de cuenta'],
    ['period_start', 'Desde'], ['period_end', 'Hasta'], ['gross', 'Ventas'], ['commission', 'Comisión'], ['net', 'A pagar'],
    [(p) => (p.status === 'pagado' ? 'Pagado' : 'Pendiente'), 'Estado'], [(p) => (p.paid_at ? p.paid_at.slice(0, 10) : ''), 'Fecha de pago'],
  ]);

  const markPaid = async () => {
    setBusy(true);
    try {
      let path = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error('El comprobante pesa más de 5 MB.');
        const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
        path = `${paying.ambassador.id}/${paying.id}-${Date.now()}.${ext}`;
        const { error: ue } = await supabase.storage.from('payout-receipts').upload(path, file, { contentType: file.type || 'application/pdf' });
        if (ue) throw new Error('No pudimos subir el comprobante (PDF o imagen, máx. 5 MB).');
      }
      const { error } = await supabase.rpc('admin_mark_payout_paid', { p_payout_id: paying.id, p_receipt_url: path, p_notes: notes || null });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['admin'] });
      setPaying(null);
      notify(`Pago a ${paying.ambassador.brand_name} registrado`);
    } catch (e) {
      notify(e.message?.startsWith('No pudimos') || e.message?.startsWith('El comprobante') ? e.message : friendlyError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const openReceipt = async (path) => {
    const { data, error } = await supabase.storage.from('payout-receipts').createSignedUrl(path, 60);
    if (error) return notify(friendlyError(error), 'error');
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  return (
    <div className="pn-stack">
      <header className="pn-head pn-head-row">
        <div><h1>Liquidaciones</h1><p className="muted">Lo que Mercado Origen le debe a cada embajador por sus ventas aprobadas, ya descontada la comisión.</p></div>
        <button type="button" className="btn btn-outline" onClick={exportCsv} disabled={!list.length}><Icon name="box" size={18} />Exportar CSV</button>
      </header>
      <div className="kpi-grid"><div className="kpi kpi-ocre"><span className="kpi-label"><Icon name="card" size={18} />Total por pagar</span><b className="kpi-value">{money(totalPending)}</b></div></div>
      <Tabs tabs={[['pendiente', 'Por pagar'], ['pagado', 'Pagadas']]} value={tab} onChange={setTab} />

      {q.isLoading ? <div className="skeleton" style={{ height: 200 }} /> : !list.length ? <p className="dt-empty">No hay liquidaciones aquí.</p> : (
        <div className="table-wrap panel">
          <table className="tbl">
            <thead><tr><th>Embajador</th><th>Periodo</th><th className="num">Ventas</th><th className="num">Comisión</th><th className="num">A pagar</th><th>Cuenta</th><th /></tr></thead>
            <tbody>
              {list.map((p) => {
                const bank = p.ambassador.private?.bank_info || {};
                return (
                  <tr key={p.id}>
                    <td data-label="Embajador"><Link className="link" to={`/admin/embajadores/${p.ambassador.id}`}>{p.ambassador.brand_name}</Link><br /><span className="muted small">{p.ambassador.private?.commission_rate != null ? `Comisión ${Number(p.ambassador.private.commission_rate)}%` : 'Comisión por acordar'}</span></td>
                    <td data-label="Periodo">{longDate(p.period_start)} – {longDate(p.period_end)}</td>
                    <td data-label="Ventas" className="num">{money(p.gross)}</td>
                    <td data-label="Comisión" className="num">{p.items_without_commission ? <span className="pill pill-err">{p.items_without_commission} sin comisión</span> : `−${money(p.commission)}`}</td>
                    <td data-label="A pagar" className="num"><b>{money(p.net)}</b></td>
                    <td data-label="Cuenta">{bank.banco ? `${bank.banco} · ${bank.tipo_cuenta || ''} ${bank.numero || ''}` : <span className="muted">Sin datos bancarios</span>}</td>
                    <td data-label="">
                      {p.status === 'pendiente' ? (
                        <button type="button" className="btn btn-green btn-sm" disabled={p.items_without_commission > 0} title={p.items_without_commission ? 'Primero acuerda la comisión en la ficha del embajador' : undefined}
                          onClick={() => { setPaying(p); setFile(null); setNotes(''); }}>Registrar pago</button>
                      ) : (
                        <>{longDate(p.paid_at)}{p.receipt_url && <> · <button type="button" className="link-btn" onClick={() => openReceipt(p.receipt_url)}>Comprobante</button></>}</>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!paying} onClose={() => setPaying(null)} title="Registrar pago">
        {paying && (
          <form className="form" onSubmit={(e) => { e.preventDefault(); markPaid(); }}>
            <p>Transferiste <b>{money(paying.net)}</b> a <b>{paying.ambassador.brand_name}</b>.</p>
            <Field id="py-file" label="Comprobante" optional hint="PDF o imagen, máx. 5 MB. Queda privado: solo lo ven el embajador y los administradores.">
              <input id="py-file" type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files[0] || null)} />
            </Field>
            <Field id="py-notes" label="Nota" optional><input id="py-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Transferencia Bancolombia #123" /></Field>
            <div className="form-actions">
              <button type="submit" className="btn btn-green" disabled={busy}>{busy ? 'Guardando…' : 'Marcar como pagado'}</button>
              <button type="button" className="btn btn-outline" onClick={() => setPaying(null)}>Cancelar</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
