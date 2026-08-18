/**
 * Deep form analysis with purpose detection.
 */
async function analyzeFormsDeep(page) {
  return page.evaluate(() => {
    const forms = [];

    document.querySelectorAll('form').forEach((form, i) => {
      if (i >= 15) return;

      const fields = [];
      form.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach((field, j) => {
        if (j >= 30) return;

        let label = null;
        if (field.id) {
          label = document.querySelector(`label[for="${field.id}"]`)?.textContent?.trim();
        }
        if (!label && field.labels?.length) {
          label = field.labels[0]?.textContent?.trim();
        }
        if (!label) {
          const wrapper = field.closest('label');
          if (wrapper) {
            label = wrapper.textContent?.replace(field.value || '', '')?.trim();
          }
        }

        fields.push({
          tagName: field.tagName.toLowerCase(),
          type: field.type || 'text',
          name: field.name || null,
          id: field.id || null,
          placeholder: field.placeholder || null,
          required: field.required || field.getAttribute('aria-required') === 'true',
          pattern: field.pattern || null,
          minLength: field.minLength > 0 ? field.minLength : null,
          maxLength: field.maxLength > 0 && field.maxLength < 10000 ? field.maxLength : null,
          min: field.min || null,
          max: field.max || null,
          label: label?.slice(0, 80),
          ariaLabel: field.getAttribute('aria-label'),
          autocomplete: field.autocomplete || null,
          options:
            field.tagName === 'SELECT'
              ? Array.from(field.options).slice(0, 10).map((o) => o.text)
              : null
        });
      });

      const submitBtn = form.querySelector(
        'button[type="submit"], input[type="submit"], button:not([type])'
      );
      const formPurpose = detectFormPurpose(fields, form);

      forms.push({
        id: form.id || `form-${i}`,
        name: form.name || null,
        action: form.action || window.location.href,
        method: (form.method || 'GET').toUpperCase(),
        enctype: form.enctype || null,
        className: form.className?.toString?.()?.slice(0, 100),
        fieldCount: fields.length,
        fields,
        submitButton: submitBtn
          ? {
              text: (submitBtn.textContent?.trim() || submitBtn.value || 'Submit').slice(0, 50),
              type: submitBtn.type,
              disabled: submitBtn.disabled,
              className: submitBtn.className?.toString?.()?.slice(0, 80)
            }
          : null,
        hasFileUpload: fields.some((f) => f.type === 'file'),
        hasPassword: fields.some((f) => f.type === 'password'),
        hasEmail: fields.some((f) => f.type === 'email'),
        purpose: formPurpose.purpose,
        purposeConfidence: formPurpose.confidence
      });
    });

    function detectFormPurpose(fields, form) {
      const fieldData = fields
        .map((f) => `${f.name || ''} ${f.placeholder || ''} ${f.label || ''} ${f.type || ''}`)
        .join(' ')
        .toLowerCase();

      const formClasses = (form.className?.toString() || '').toLowerCase();
      const formId = (form.id || '').toLowerCase();
      const combined = `${fieldData} ${formClasses} ${formId}`;

      if (
        combined.includes('login') ||
        combined.includes('signin') ||
        (fields.some((f) => f.type === 'password') &&
          fields.some((f) => f.type === 'email' || f.name?.includes('user')))
      ) {
        return { purpose: 'login', confidence: 0.9 };
      }

      if (
        combined.includes('register') ||
        combined.includes('signup') ||
        combined.includes('create account') ||
        (fields.some((f) => f.type === 'password') && fields.some((f) => f.name?.includes('confirm')))
      ) {
        return { purpose: 'registration', confidence: 0.9 };
      }

      if (
        combined.includes('search') ||
        combined.includes('query') ||
        (fields.length === 1 && fields[0].type === 'search')
      ) {
        return { purpose: 'search', confidence: 0.95 };
      }

      if (
        combined.includes('contact') ||
        combined.includes('message') ||
        combined.includes('enquiry') ||
        combined.includes('inquiry')
      ) {
        return { purpose: 'contact', confidence: 0.85 };
      }

      if (
        combined.includes('newsletter') ||
        combined.includes('subscribe') ||
        (fields.length <= 2 &&
          fields.some((f) => f.type === 'email') &&
          !fields.some((f) => f.type === 'password'))
      ) {
        return { purpose: 'newsletter', confidence: 0.8 };
      }

      if (
        combined.includes('checkout') ||
        combined.includes('payment') ||
        combined.includes('billing')
      ) {
        return { purpose: 'checkout', confidence: 0.9 };
      }

      if (
        combined.includes('shipping') ||
        combined.includes('delivery') ||
        combined.includes('address')
      ) {
        return { purpose: 'shipping', confidence: 0.85 };
      }

      if (
        combined.includes('review') ||
        combined.includes('rating') ||
        combined.includes('feedback')
      ) {
        return { purpose: 'feedback', confidence: 0.8 };
      }

      return { purpose: 'generic', confidence: 0.5 };
    }

    return forms;
  });
}

module.exports = { analyzeFormsDeep };
