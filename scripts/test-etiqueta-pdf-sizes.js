const fs = require('fs');
const path = require('path');
const os = require('os');
const { buildEtiquetaPdfBuffer, createEtiquetaPdfDocument } = require('../src/utils/etiqueta-jspdf');
const { parsePdfMediaBoxMm } = require('../src/main/etiqueta-pdf');
const { ETIQUETA_PAGE_SIZES } = require('../src/utils/etiqueta-page-sizes');
const { createQrDataUrl } = require('../src/utils/qr-code');

const SIZES = ['9x6', '10x7', '12x8', '8x5'];

const demoConfig = {
  telefonoWhatsapp: '+595 986 773 222',
  email: 'autorepuestosleandrosa@hotmail.com',
  direccionUbicacion: 'Katueté – Canindeyú – Paraguay',
  textoEtiqueta: 'ESCANEA ESTE CÓDIGO y accede al historial completo de mantenimiento de tu vehículo.'
};

const demoVehiculo = {
  marca: 'Toyota',
  modelo: 'Hilux',
  placa: 'ABC 123',
  motor: '2.8 Diesel'
};

function almostEqual(a, b, tolerance = 1.5) {
  return Math.abs(a - b) <= tolerance;
}

async function runTests() {
  const outDir = path.join(os.tmpdir(), 'etiqueta-pdf-test');
  fs.mkdirSync(outDir, { recursive: true });
  const qrDataUrl = await createQrDataUrl('TEST-ETIQUETA-QR');
  let allOk = true;

  console.log('\n=== Teste Etiqueta PDF (modelo aprobado) ===\n');

  for (const tamano of SIZES) {
    const expected = ETIQUETA_PAGE_SIZES[tamano];
    const doc = createEtiquetaPdfDocument(tamano);
    const pdfBuffer = buildEtiquetaPdfBuffer({
      config: { ...demoConfig, tamanoEtiqueta: tamano },
      vehiculo: demoVehiculo,
      qrDataUrl,
      tamano
    });

    const filePath = path.join(outDir, `etiqueta-${tamano}.pdf`);
    fs.writeFileSync(filePath, pdfBuffer);

    const media = parsePdfMediaBoxMm(pdfBuffer);
    const ok =
      almostEqual(media.widthMm, expected.widthMm) &&
      almostEqual(media.heightMm, expected.heightMm);

    allOk = allOk && ok;

    console.log(`${ok ? 'OK' : 'FAIL'}  ${tamano}`);
    console.log(`  Esperado: ${expected.widthMm} x ${expected.heightMm} mm`);
    console.log(`  Obtido:   ${media.widthMm.toFixed(2)} x ${media.heightMm.toFixed(2)} mm`);
    console.log(`  Tamanho:  ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
    console.log(`  Arquivo:  ${filePath}\n`);
  }

  process.exit(allOk ? 0 : 1);
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
