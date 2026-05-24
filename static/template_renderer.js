// Nerum Website Builder — client-side template renderer.
// Loads a static template from /static/templates/{key}.html, swaps placeholders,
// and returns ready-to-render HTML. Keep ALL placeholder names in one place.
window.renderTemplate = async function (templateKey, data) {
  // templateKey format: "jewellery_pro" or "dental_free" etc.
  const res = await fetch('/static/templates/' + templateKey + '.html');
  if (!res.ok) throw new Error('Template not found: ' + templateKey);
  let html = await res.text();

  // Replace all placeholders.
  html = html.replace(/{{BUSINESS_NAME}}/g, data.business_name || 'Your Business');
  html = html.replace(/{{TAGLINE}}/g, data.tagline || '');
  html = html.replace(/{{PHONE}}/g, data.phone || '');
  html = html.replace(/{{EMAIL}}/g, data.email || '');
  html = html.replace(/{{ADDRESS}}/g, data.address || 'Chennai, Tamil Nadu');
  html = html.replace(/{{BRAND_COLOR}}/g, data.brand_color || '#C50022');
  html = html.replace(/{{YEAR}}/g, new Date().getFullYear());

  // Build services HTML.
  let servicesHtml = '';
  if (data.services && data.services.length > 0) {
    servicesHtml = data.services.map(function (s) {
      return '<div class="service-item"><span>' + s + '</span></div>';
    }).join('');
  }
  html = html.replace(/{{SERVICES_HTML}}/g, servicesHtml);

  return html;
};
