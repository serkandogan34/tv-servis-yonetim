import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generatePDF(htmlFile, outputFile, title) {
  console.log(`${title} PDF'i oluşturuluyor...`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // HTML dosyasını oku
  const htmlPath = path.resolve(__dirname, htmlFile);
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  // HTML içeriğini sayfa olarak ayarla
  await page.setContent(htmlContent, {
    waitUntil: 'networkidle0'
  });
  
  // PDF ayarları
  const pdfOptions = {
    path: outputFile,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px'
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
        ${title}
      </div>
    `,
    footerTemplate: `
      <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
        Sayfa <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `
  };
  
  // PDF oluştur
  await page.pdf(pdfOptions);
  
  await browser.close();
  console.log(`${title} başarıyla oluşturuldu: ${outputFile}`);
}

async function main() {
  try {
    // Docs klasörünü oluştur
    if (!fs.existsSync('./docs')) {
      fs.mkdirSync('./docs');
    }
    
    // Kullanıcı kullanım kılavuzu PDF'i
    await generatePDF(
      './docs/kullanici-kilavuzu.html',
      './docs/TV-Servis-Kullanici-Kilavuzu.pdf',
      'TV Servis Yönetim Sistemi - Kullanıcı Kullanım Kılavuzu'
    );
    
    // Teknik kullanım kılavuzu PDF'i
    await generatePDF(
      './docs/teknik-kilavuz.html',
      './docs/TV-Servis-Teknik-Kilavuz.pdf',
      'TV Servis Yönetim Sistemi - Teknik Kullanım Kılavuzu'
    );
    
    console.log('\n✅ Tüm PDF dosyaları başarıyla oluşturuldu!');
    console.log('📁 Dosya konumu: ./docs/');
    console.log('📄 Kullanıcı Kılavuzu: TV-Servis-Kullanici-Kilavuzu.pdf');
    console.log('🔧 Teknik Kılavuz: TV-Servis-Teknik-Kilavuz.pdf');
    
  } catch (error) {
    console.error('PDF oluşturma hatası:', error);
    process.exit(1);
  }
}

main();