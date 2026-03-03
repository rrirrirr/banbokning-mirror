const cheerio = require('cheerio');
const html = `<table><tr><td class="style_1" onmouseover="return overlib('Träning<br>Westerberg d.y.');" onmouseout="return nd();">Test</td></tr></table>`;
const $ = cheerio.load(html);
const el = $('td').first();
console.log('HTML:', el.parent().html());
console.log('Class:', el.attr('class'));
console.log('onmouseover:', el.attr('onmouseover'));

const getTrackInfo = (el) => {
  const textRaw = el.text().replace(/\xA0/g, '').trim();
  const hasOnMouseOver = el.attr('onmouseover');
  let infoText = textRaw;
  if (hasOnMouseOver) {
    const match = hasOnMouseOver.match(/overlib\('([^']+)'\)/);
    if (match) {
      infoText = match[1].replace(/<br>/gi, ' - ').replace(/<br\/>/gi, ' - ');
    }
  }
  return {
    available: textRaw === '' && !hasOnMouseOver,
    text: infoText,
    style: el.attr('class') || ''
  };
};

console.log(getTrackInfo(el));
