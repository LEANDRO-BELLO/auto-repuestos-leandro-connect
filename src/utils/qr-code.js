const crypto = require('crypto');
const QRCode = require('qrcode');

function generateQrCodeValue() {
  return `ARL-VEH-${crypto.randomUUID()}`;
}

async function createQrDataUrl(value) {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'H',
    margin: 3,
    width: 600
  });
}

module.exports = {
  generateQrCodeValue,
  createQrDataUrl
};
