import {subscriptionEditor} from './subscription-editor.js';
import { uiKit } from './discovery.js';

export const partnerLobbyCopy = {
  opClients: ['Integration clients', 'Clients d’intégration'],
  partnerAuth: ['A current sandbox key is required.', 'Une clé de démo active est requise.'],
  lobby_client_create: ['Sandbox client created', 'Client de démo créé'],
  lobby_client_rotate: ['Client key rotated', 'Clé du client renouvelée'],
  lobby_client_revoke: ['Client access revoked', 'Accès client révoqué'],
};
export function createPartnerUi({ api, t, french, appPath, staffId }) {
  const { el, l, field, button, date, pages } = uiKit(french),
    root = () => document.getElementById('operator-clients-body');
  let generation = 0;
  function clear() {
    ++generation;
    root()?.replaceChildren();
  }
  async function load() {
    const token = ++generation,
      scope = staffId(),
      current = () => token === generation && scope === staffId(),
      dest = root(),
      view = el('div', '', 'operator-view');
    const status = el('p', l('Loading…', 'Chargement…'));
    status.setAttribute('role', 'status');
    dest.replaceChildren(status);
    try {
      const data = await api('admin/operator/clients', undefined, 'GET');
      view.append(
        el(
          'p',
          l(
            'Sandbox clients can read the published lobby for this brand.',
            'Les clients de démo peuvent lire le hall publié de cette marque.',
          ),
        ),
      );
      view.append(
        el('code', 'GET ' + appPath('/api/partner/v1/lobby?environment=sandbox'), 'op-reference'),
      );
      function controls(box, action, item) {
        const f = el('form', '', 'admin-editor op-form');
        box.append(f);
        const name =
          action === 'create'
            ? field(f, 'label', l('Client name', 'Nom du client'), { required: true, maxLength: 80 })
            : null;
        const submit = el(
          'button',
          action === 'create'
            ? l('Create client', 'Créer le client')
            : action === 'rotate'
              ? l('Rotate key', 'Renouveler la clé')
              : l('Revoke access', 'Révoquer l’accès'),
        );
        submit.type = 'submit';
        f.append(submit);
        const msg = el('p');
        msg.setAttribute('role', 'status');
        f.append(msg);
        let secret;
        f.onsubmit = async (e) => {
          e.preventDefault();
          if (submit.disabled) return;
          submit.disabled = true;
          if (action !== 'revoke' && !secret)
            secret =
              'hbs_' +
              Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
                n.toString(16).padStart(2, '0'),
              ).join('');
          try {
            await api('admin/operator/clients', {
              action,
              id: item?.id,
              version: item?.version,
              label: name?.value,
              secret,
              environment: 'sandbox',
            });
            if (!current()) return;
            if (secret) {
              ++generation;
              const receipt = el('div', '', 'operator-view');
              receipt.append(el('h4', l('Copy the new client key', 'Copier la nouvelle clé du client')));
              const value = field(receipt, 'key', l('Shown once', 'Affichée une seule fois'), {
                value: secret,
              });
              value.readOnly = true;
              value.autocomplete = 'off';
              secret = undefined;
              receipt.append(
                button(l('Back to clients', 'Retour aux clients'), () => void load(), true),
              );
              dest.replaceChildren(receipt);
              value.select();
            } else await load();
          } catch (error) {
            if (current()) msg.textContent = t(error.message);
            submit.disabled = false;
          }
        };
      }
      controls(view, 'create');
      const list = el('div', '', 'contact-list');
      view.append(list);
      pages(
        list,
        data.items,
        (item) => {
          const box = el('article', '', 'contact-card');
          box.append(
            el('h4', item.label),
            el('p','lobby-v1 · lobby.read · '+(item.check? (item.check.result==='ok'?l('Checked','Vérifié'):l('Access denied','Accès refusé'))+' · '+new Date(item.check.checked).toLocaleString():l('No call yet','Aucun appel reçu'))),
            el(
              'p',
              (item.active ? l('Active', 'Actif') : l('Revoked', 'Révoqué')) + ' · v' + item.version,
            ),
          );
          const d = el('details', '', 'admin-disclosure');
          d.append(el('summary', l('Manage client', 'Gérer le client')));
          box.append(d);
          if (item.active) {
            controls(d, 'rotate', item);
            controls(d, 'revoke', item);
          }
          const history = el('div');
          d.append(history);
          let loaded = false;
          d.ontoggle = async () => {
            if (!d.open || loaded) return;
            loaded = true;
            try {
              const result = await api(
                'admin/operator/client-history?id=' + encodeURIComponent(item.id),
                undefined,
                'GET',
              );
              for (const e of result.items)
                history.append(
                  el(
                    'p',
                    'v' + e.version + ' · ' + t('lobby_client_' + e.kind) + ' · ' + date(e.happened),
                  ),
                );
            } catch (error) {
              loaded = false;
              history.textContent = t(error.message);
            }
          };
          return box;
        },
        l('No clients registered.', 'Aucun client enregistré.'),
      );
      if (current()){subscriptionEditor(view,{api,t,ui:uiKit(french)});dest.replaceChildren(view);}
    } catch (e) {
      if (current()) status.textContent = t(e.message);
    }
  }
  return { load, clear };
}
