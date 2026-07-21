import emailjs from '@emailjs/browser';

const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

// Initialize once using the public key from environment variables
if (publicKey) {
  emailjs.init(publicKey);
}

/**
 * Sends email notifications using EmailJS Browser SDK
 * @param {Object} templateParams - Parameters to bind to the template
 * @param {string} [customTemplateId] - Override default template ID
 * @returns {Promise<any>}
 */
export const sendEmailJS = async (templateParams, customTemplateId = null) => {
  const activeTemplateId = customTemplateId || templateId;

  if (!publicKey || !serviceId || !activeTemplateId) {
    throw new Error('EmailJS integration variables (Public Key, Service ID, Template ID) are not configured.');
  }

  try {
    const response = await emailjs.send(serviceId, activeTemplateId, templateParams);
    return response;
  } catch (err) {
    throw new Error(err.text || err.message || 'Failed to dispatch EmailJS notification');
  }
};
