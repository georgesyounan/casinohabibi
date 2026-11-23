export function casinoPageTitle(brand, french) {
  if (/\bcasino\b/i.test(brand)) return brand;
  return french ? 'Casino ' + brand : brand + ' Casino';
}

export function guideAddress(content, recordSlug, locale) {
  return content['address'+guideSuffix(locale)] || recordSlug;
}

export const spanishGuide = 'es-MX';
export const guideSuffix = locale => locale===spanishGuide?'Es':locale==='fr-CA'?'Fr':'En';
export function guideField(content,field,locale,primary='en-CA') {
  return content[field+guideSuffix(locale)] || (locale===spanishGuide && content[field+guideSuffix(primary)]) || '';
}

export function guidePath(base, address, locale) {
  return base + '/help/' + address + '?lang=' + locale.slice(0, 2);
}

export function searchSnippet(content, locale, primary) {
  const lang = guideSuffix(locale);
  const body = guideField(content,'body',locale,primary).trim().replace(/\s+/g, ' ');
  const characters = Array.from(body);
  const excerpt = characters.length > 160 ? characters.slice(0, 159).join('').trimEnd() + '…' : body;
  return {
    title: content['seoTitle' + lang] || guideField(content,'title',locale,primary),
    description: content['seoDescription' + lang] || (locale===spanishGuide && !content.bodyEs && guideField(content,'seoDescription',locale,primary)) || excerpt
  };
}
