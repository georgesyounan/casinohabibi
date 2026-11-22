export function guideAddress(content, recordSlug, locale) {
  return content[locale === 'fr-CA' ? 'addressFr' : 'addressEn'] || recordSlug;
}

export function guidePath(base, address, locale) {
  return base + '/help/' + address + '?lang=' + locale.slice(0, 2);
}

export function searchSnippet(content, locale) {
  const lang = locale === 'fr-CA' ? 'Fr' : 'En';
  const body = (content['body' + lang] || '').trim().replace(/\s+/g, ' ');
  const characters = Array.from(body);
  const excerpt = characters.length > 160 ? characters.slice(0, 159).join('').trimEnd() + '…' : body;
  return {
    title: content['seoTitle' + lang] || content['title' + lang] || '',
    description: content['seoDescription' + lang] || excerpt
  };
}
