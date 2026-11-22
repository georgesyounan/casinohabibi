export const accountBreakCopy = {
  accountBreak: ['Account break', 'Pause de compte'],
  breakActive: ['Break in progress', 'Pause en cours'],
  breakStartTime: ['Started', 'Début'],
  breakEndTime: ['Ends', 'Fin'],
  breakUnknownStart: ['Start time unavailable', 'Heure de début inconnue'],
  breakHelp: ['Demo play pauses. You can still browse previews and recover your account.', 'Le jeu de démonstration est suspendu. Vous pouvez consulter les fiches et récupérer votre compte.'],
  breakDuration: ['Duration from now', 'Durée à partir de maintenant'],
  break15: ['15 minutes', '15 minutes'],
  startBreak: ['Start break', 'Commencer la pause'],
  extendBreak: ['Extend break', 'Prolonger la pause'],
  breakConfirm: ['Pause your account for {duration} from now? The end time cannot be moved earlier.', 'Mettre votre compte en pause pour une durée de {duration} à partir de maintenant? L’heure de fin ne pourra pas être devancée.'],
  breakBrowse: ['Browse the catalogue', 'Consulter le catalogue'],
  breakSaved: ['Break saved on all your devices.', 'Pause enregistrée sur tous vos appareils.'],
  breakDuringSave: ['During account break', 'Pendant la pause de compte'],
  breakRequestConflict: ['This request already used a different duration.', 'Cette demande a déjà été enregistrée avec une autre durée.']
};

export function showBreakPeriod(container, period, t, locale) {
  container.replaceChildren();
  if (!period) return;
  const title = document.createElement('strong');
  title.textContent = t('breakActive');
  const dates = document.createElement('dl');
  dates.className = 'account-break-dates';
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  });
  for (const [label, value] of [['breakStartTime', period.startedAt], ['breakEndTime', period.endsAt]]) {
    const item = document.createElement('div');
    const term = document.createElement('dt');
    term.textContent = t(label);
    const description = document.createElement('dd');
    if (value === null) description.textContent = t('breakUnknownStart');
    else {
      const time = document.createElement('time');
      time.dateTime = new Date(value).toISOString();
      time.textContent = formatter.format(value);
      description.append(time);
    }
    item.append(term, description);
    dates.append(item);
  }
  container.append(title, dates);
}

export function createBreakControls({ element, t, locale, period, submit, browseHref }) {
  const section = element('section', '', 'account-break');
  section.id = 'account-break';
  const heading = element('h3', t('accountBreak'));
  heading.id = 'account-break-title';
  section.setAttribute('aria-labelledby', heading.id);
  const status = element('div');
  status.setAttribute('aria-live', 'polite');
  const form = element('form', '', 'account-break-form');
  const label = element('label', t('breakDuration'));
  const select = element('select');
  select.name = 'breakMinutes';
  for (const [minutes, key] of [[15, 'break15'], [1440, 'coolingOffOne'], [10080, 'coolingOffSeven'], [43200, 'coolingOffThirty']]) {
    const option = element('option', t(key));
    option.value = String(minutes);
    select.append(option);
  }
  label.append(select);
  const button = element('button');
  button.type = 'submit';
  const message = element('p', '', 'break-feedback');
  message.setAttribute('role', 'status');
  const browse = element('a', t('breakBrowse'));
  browse.href = browseHref;
  browse.addEventListener('click', () => section.closest('dialog')?.close());
  function update(current) {
    period = current;
    showBreakPeriod(status, current, t, locale);
    for (const option of select.options) {
      option.disabled = Boolean(current && Date.now() + Number(option.value) * 60_000 < current.endsAt);
    }
    if (select.selectedOptions[0]?.disabled) {
      const first = [...select.options].find(option => !option.disabled);
      if (first) select.value = first.value;
    }
    button.disabled = select.disabled || !select.selectedOptions.length || select.selectedOptions[0].disabled;
    button.textContent = t(current ? 'extendBreak' : 'startBreak');
    browse.hidden = !current;
  }
  form.append(label, button);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const option = select.selectedOptions[0];
    if (!option || option.disabled || !window.confirm(t('breakConfirm').replace('{duration}', option.textContent))) return;
    select.disabled = button.disabled = true;
    message.textContent = '';
    try {
      period = await submit(Number(option.value));
      message.textContent = t('breakSaved');
    } catch (error) {
      message.textContent = t(error.message);
    } finally {
      select.disabled = false;
      update(period);
    }
  });
  section.append(heading, status, element('p', t('breakHelp')), form, message, browse);
  update(period);
  return { section, update };
}
