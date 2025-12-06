const QRCode = require('qrcode');

const url = 'https://399c7fc2fdc8.ngrok-free.app '; // replace with your ngrok HTTPS URL

QRCode.toFile('ngrok-qr.png', url, { errorCorrectionLevel: 'H' })
  .then(() => console.log('QR code saved to ngrok-qr.png'))
  .catch(err => console.error(err));